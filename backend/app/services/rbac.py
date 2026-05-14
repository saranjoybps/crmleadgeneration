from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.rbac import RoleCreate, RoleUpdate, ModuleCreate, PermissionUpdate


class RBACService:
    @staticmethod
    def list_roles(supabase: Client, ctx: RequestContext):
        res = (
            supabase.table("roles")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at")
            .execute()
        )
        return res.data or []

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
        # Get all roles for tenant
        roles_res = (
            supabase.table("roles")
            .select("id, key, label")
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at")
            .execute()
        )
        roles = roles_res.data or []

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
                    "can_view": perm["can_view"] if perm else False,
                    "can_create": perm["can_create"] if perm else False,
                    "can_edit": perm["can_edit"] if perm else False,
                    "can_delete": perm["can_delete"] if perm else False,
                }
            role_permissions.append(role_perms)

        return {
            "roles": roles,
            "modules": modules,
            "permissions": role_permissions
        }

    @staticmethod
    def get_current_user_permissions(supabase: Client, ctx: RequestContext):
        role_res = (
            supabase.table("roles")
            .select("id,key,label")
            .eq("tenant_id", ctx.tenant_id)
            .eq("key", ctx.role_key)
            .maybe_single()
            .execute()
        )

        role = role_res.data
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

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

        permissions_res = (
            supabase.table("role_permissions")
            .select("module_id, can_view, can_create, can_edit, can_delete")
            .eq("tenant_id", ctx.tenant_id)
            .eq("role_id", role["id"])
            .execute()
        )
        permissions = permissions_res.data or []

        return {
            "role": role,
            "modules": [
                {
                    "key": module["key"],
                    "label": module["label"],
                    "permissions": {
                        "can_view": next((p["can_view"] for p in permissions if p["module_id"] == module["id"]), False),
                        "can_create": next((p["can_create"] for p in permissions if p["module_id"] == module["id"]), False),
                        "can_edit": next((p["can_edit"] for p in permissions if p["module_id"] == module["id"]), False),
                        "can_delete": next((p["can_delete"] for p in permissions if p["module_id"] == module["id"]), False),
                    },
                }
                for module in modules
            ],
        }

    @staticmethod
    def update_permissions(supabase: Client, payload: PermissionUpdate, ctx: RequestContext):
        # Verify role belongs to tenant
        role_check = (
            supabase.table("roles")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", payload.role_id)
            .execute()
        )
        if not role_check.data:
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

        # Upsert permission
        permission_data = {
            "tenant_id": ctx.tenant_id,
            "role_id": payload.role_id,
            "module_id": module_id,
        }

        # Get existing permission or defaults
        existing = (
            supabase.table("role_permissions")
            .select("can_view, can_create, can_edit, can_delete")
            .eq("tenant_id", ctx.tenant_id)
            .eq("role_id", payload.role_id)
            .eq("module_id", module_id)
            .execute()
        )

        current = existing.data[0] if existing.data else {
            "can_view": False,
            "can_create": False,
            "can_edit": False,
            "can_delete": False
        }

        # Update with provided values
        if payload.can_view is not None:
            current["can_view"] = payload.can_view
        if payload.can_create is not None:
            current["can_create"] = payload.can_create
        if payload.can_edit is not None:
            current["can_edit"] = payload.can_edit
        if payload.can_delete is not None:
            current["can_delete"] = payload.can_delete

        permission_data.update(current)

        upserted = (
            supabase.table("role_permissions")
            .upsert(permission_data, on_conflict="tenant_id,role_id,module_id")
            .execute()
        )

        return upserted.data[0] if upserted.data else None