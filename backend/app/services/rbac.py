from fastapi import HTTPException
from supabase import Client
import logging

from app.core.deps import RequestContext
from app.schemas.rbac import RoleCreate, RoleUpdate, ModuleCreate, PermissionUpdate

logger = logging.getLogger("joycrm.rbac")


class RBACService:
    RESERVED_ROLE_KEYS = {"owner", "admin", "member", "client"}

    @staticmethod
    def _no_permissions() -> dict:
        return {"can_view": False, "can_create": False, "can_edit": False, "can_delete": False}

    @staticmethod
    def _list_tenant_and_system_roles(supabase: Client, tenant_id: str):
        res = (
            supabase.table("roles")
            .select("*")
            .or_(f"tenant_id.eq.{tenant_id},tenant_id.is.null")
            .order("created_at")
            .execute()
        )
        return res.data or []

    @staticmethod
    def list_roles(supabase: Client, ctx: RequestContext):
        return RBACService._list_tenant_and_system_roles(supabase, ctx.tenant_id)

    @staticmethod
    def create_role(supabase: Client, payload: RoleCreate, ctx: RequestContext):
        # Check if role key already exists in tenant
        existing = (
            supabase.table("roles")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("key", payload.key)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=400, detail="Role key already exists")

        created = (
            supabase.table("roles")
            .insert(
                {
                    "tenant_id": ctx.tenant_id,
                    "key": payload.key,
                    "label": payload.label,
                }
            )
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create role")
        return row

    @staticmethod
    def update_role(supabase: Client, role_id: str, payload: RoleUpdate, ctx: RequestContext):
        # Verify role belongs to tenant
        role_check = (
            supabase.table("roles")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", role_id)
            .execute()
        )
        if not role_check.data:
            raise HTTPException(status_code=404, detail="Role not found")

        updated = (
            supabase.table("roles")
            .update({"label": payload.label})
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", role_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to update role")
        return row

    @staticmethod
    def delete_role(supabase: Client, role_id: str, ctx: RequestContext):
        # Prevent deleting system roles
        system_roles = ["owner", "admin", "member", "client"]
        role_info = (
            supabase.table("roles")
            .select("key")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", role_id)
            .execute()
        )
        if not role_info.data:
            raise HTTPException(status_code=404, detail="Role not found")

        if role_info.data[0]["key"] in system_roles:
            raise HTTPException(status_code=400, detail="Cannot delete system roles")

        # Check if role is assigned to users
        assigned = (
            supabase.table("user_tenant_roles")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("role_id", role_id)
            .execute()
        )
        if assigned.data:
            raise HTTPException(status_code=400, detail="Cannot delete role assigned to users")

        deleted = (
            supabase.table("roles")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", role_id)
            .execute()
        )
        return {"success": True}

    @staticmethod
    def list_modules(supabase: Client):
        res = (
            supabase.table("modules")
            .select("*")
            .order("label")
            .execute()
        )
        return res.data or []

    @staticmethod
    def create_module(supabase: Client, payload: ModuleCreate):
        existing = (
            supabase.table("modules")
            .select("id")
            .eq("key", payload.key)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=400, detail="Module key already exists")

        created = (
            supabase.table("modules")
            .insert({"key": payload.key, "label": payload.label})
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create module")
        return row

    @staticmethod
    def delete_module(supabase: Client, module_id: str):
        deleted = (
            supabase.table("modules")
            .delete()
            .eq("id", module_id)
            .execute()
        )
        return {"success": True}

    @staticmethod
    def get_role_permissions(supabase: Client, ctx: RequestContext):
        roles = RBACService._list_tenant_and_system_roles(supabase, ctx.tenant_id)

        # Get all modules
        modules_res = (
            supabase.table("modules")
            .select("id, key, label")
            .order("label")
            .execute()
        )
        modules = modules_res.data or []

        # Get all permissions for tenant
        permissions_res = (
            supabase.table("role_permissions")
            .select("role_id, module_id, can_view, can_create, can_edit, can_delete")
            .eq("tenant_id", ctx.tenant_id)
            .execute()
        )
        permissions = permissions_res.data or []

        # Build matrix
        role_permissions = []
        for role in roles:
            role_perms = {
                "role": role,
                "permissions": {}
            }
            for module in modules:
                perm = next(
                    (p for p in permissions if p["role_id"] == role["id"] and p["module_id"] == module["id"]),
                    None
                )
                role_perms["permissions"][module["key"]] = {
                    "can_view": True if role["key"] == "owner" else (perm["can_view"] if perm else False),
                    "can_create": True if role["key"] == "owner" else (perm["can_create"] if perm else False),
                    "can_edit": True if role["key"] == "owner" else (perm["can_edit"] if perm else False),
                    "can_delete": True if role["key"] == "owner" else (perm["can_delete"] if perm else False),
                }
            role_permissions.append(role_perms)

        return {
            "roles": roles,
            "modules": modules,
            "permissions": role_permissions
        }

    @staticmethod
    def get_current_user_permissions(supabase: Client, ctx: RequestContext):
        role_assignment_res = (
            supabase.table("user_tenant_roles")
            .select("role_id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        role_assignment = (role_assignment_res.data or [None])[0]
        if not role_assignment:
            raise HTTPException(status_code=404, detail="Role assignment not found")

        role_res = (
            supabase.table("roles")
            .select("id,key,label")
            .eq("id", role_assignment["role_id"])
            .limit(1)
            .execute()
        )
        role = (role_res.data or [None])[0]
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        logger.info(
            "[RBAC][PERMS] tenant_id=%s app_user_id=%s ctx_role=%s assigned_role_id=%s assigned_role_key=%s",
            ctx.tenant_id,
            ctx.app_user_id,
            ctx.role_key,
            role_assignment["role_id"],
            role.get("key"),
        )

        modules_res = (
            supabase.table("modules")
            .select("id, key, label")
            .order("label")
            .execute()
        )
        modules = modules_res.data or []

        # Owner bypass: grant all permissions to owner role
        if ctx.role_key == "owner":
            return {
                "role": role,
                "modules": [
                    {
                        "key": module["key"],
                        "label": module["label"],
                        "permissions": {
                            "can_view": True,
                            "can_create": True,
                            "can_edit": True,
                            "can_delete": True,
                        },
                    }
                    for module in modules
                ],
            }

        # IMPORTANT: do not read role_permissions directly here for non-owner users.
        # RLS on role_permissions allows direct select for owner/admin only, which makes
        # non-admin users appear to have zero permissions even when configured.
        # Use the has_module_permission RPC (same source of truth used by guards).
        permissions_by_module_key: dict[str, dict] = {}
        for module in modules:
            module_key = module["key"]
            can_view = bool(supabase.rpc(
                "has_module_permission",
                {"p_tenant_id": ctx.tenant_id, "p_module_key": module_key, "p_action": "view"},
            ).execute().data)
            can_create = bool(supabase.rpc(
                "has_module_permission",
                {"p_tenant_id": ctx.tenant_id, "p_module_key": module_key, "p_action": "create"},
            ).execute().data)
            can_edit = bool(supabase.rpc(
                "has_module_permission",
                {"p_tenant_id": ctx.tenant_id, "p_module_key": module_key, "p_action": "edit"},
            ).execute().data)
            can_delete = bool(supabase.rpc(
                "has_module_permission",
                {"p_tenant_id": ctx.tenant_id, "p_module_key": module_key, "p_action": "delete"},
            ).execute().data)
            permissions_by_module_key[module_key] = {
                "can_view": can_view,
                "can_create": can_create,
                "can_edit": can_edit,
                "can_delete": can_delete,
            }

        logger.info(
            "[RBAC][PERMS] tenant_id=%s role_id=%s role_key=%s modules=%s dashboard_permission=%s source=rpc",
            ctx.tenant_id,
            role["id"],
            role["key"],
            len(modules),
            permissions_by_module_key.get("dashboard"),
        )

        return {
            "role": role,
            "modules": [{
                "key": module["key"],
                "label": module["label"],
                "permissions": permissions_by_module_key.get(module["key"], RBACService._no_permissions()),
            } for module in modules],
        }

    @staticmethod
    def update_permissions(supabase: Client, payload: PermissionUpdate, ctx: RequestContext):
        # Verify role belongs to tenant or is a global/system role
        role_check = (
            supabase.table("roles")
            .select("id,tenant_id,key")
            .eq("id", payload.role_id)
            .execute()
        )
        if not role_check.data:
            raise HTTPException(status_code=404, detail="Role not found")
        role_row = role_check.data[0]
        role_tenant_id = role_row.get("tenant_id")
        if role_tenant_id is not None and str(role_tenant_id) != str(ctx.tenant_id):
            raise HTTPException(status_code=404, detail="Role not found")

        # Get module
        module_check = (
            supabase.table("modules")
            .select("id")
            .eq("key", payload.module_key)
            .execute()
        )
        if not module_check.data:
            raise HTTPException(status_code=404, detail="Module not found")

        module_id = module_check.data[0]["id"]

        role_ids_to_update = [payload.role_id]
        role_key = str(role_row.get("key") or "")
        if role_key in RBACService.RESERVED_ROLE_KEYS:
            sibling_roles_res = (
                supabase.table("roles")
                .select("id")
                .eq("key", role_key)
                .or_(f"tenant_id.eq.{ctx.tenant_id},tenant_id.is.null")
                .execute()
            )
            sibling_role_ids = [r["id"] for r in (sibling_roles_res.data or []) if r.get("id")]
            if sibling_role_ids:
                role_ids_to_update = sibling_role_ids

        # Get existing permission or defaults
        existing = (
            supabase.table("role_permissions")
            .select("role_id, can_view, can_create, can_edit, can_delete")
            .eq("tenant_id", ctx.tenant_id)
            .in_("role_id", role_ids_to_update)
            .eq("module_id", module_id)
            .execute()
        )
        existing_by_role_id = {row["role_id"]: row for row in (existing.data or [])}

        # Update with provided values
        upsert_rows = []
        for role_id in role_ids_to_update:
            current = existing_by_role_id.get(role_id, {
                "can_view": False,
                "can_create": False,
                "can_edit": False,
                "can_delete": False,
            })
            if payload.can_view is not None:
                current["can_view"] = payload.can_view
            if payload.can_create is not None:
                current["can_create"] = payload.can_create
            if payload.can_edit is not None:
                current["can_edit"] = payload.can_edit
            if payload.can_delete is not None:
                current["can_delete"] = payload.can_delete

            upsert_rows.append({
                "tenant_id": ctx.tenant_id,
                "role_id": role_id,
                "module_id": module_id,
                "can_view": current["can_view"],
                "can_create": current["can_create"],
                "can_edit": current["can_edit"],
                "can_delete": current["can_delete"],
            })

        logger.info(
            "[RBAC][UPDATE_PERMS] tenant_id=%s role_key=%s source_role_id=%s target_role_ids=%s module_key=%s payload=%s",
            ctx.tenant_id,
            role_key,
            payload.role_id,
            role_ids_to_update,
            payload.module_key,
            {
                "can_view": payload.can_view,
                "can_create": payload.can_create,
                "can_edit": payload.can_edit,
                "can_delete": payload.can_delete,
            },
        )

        upserted = (
            supabase.table("role_permissions")
            .upsert(upsert_rows, on_conflict="tenant_id,role_id,module_id")
            .execute()
        )

        return (upserted.data or [None])[0]
