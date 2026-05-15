import logging
from typing import Optional

from supabase import Client

from app.core.deps import RequestContext

logger = logging.getLogger("joycrm.services.dept_rbac")


class DepartmentRBACService:
    """Service for managing department roles and permissions."""

    @staticmethod
    def create_department_role(supabase: Client, ctx: RequestContext, key: str, label: str) -> dict:
        """Create a new department role in a tenant."""
        try:
            response = supabase.table("department_roles").insert({
                "tenant_id": ctx.tenant_id,
                "key": key,
                "label": label
            }).execute()
            
            if response.data:
                return response.data[0]
            raise Exception("Failed to create department role")
        except Exception as e:
            logger.error(f"Error creating department role: {e}")
            raise

    @staticmethod
    def list_department_roles(supabase: Client, ctx: RequestContext) -> list[dict]:
        """List all department roles in a tenant."""
        try:
            response = supabase.table("department_roles")\
                .select("*")\
                .eq("tenant_id", ctx.tenant_id)\
                .order("created_at", desc=False)\
                .execute()
            
            return response.data or []
        except Exception as e:
            logger.error(f"Error listing department roles: {e}")
            raise

    @staticmethod
    def get_department_role(supabase: Client, ctx: RequestContext, role_id: str) -> Optional[dict]:
        """Get a specific department role."""
        try:
            response = supabase.table("department_roles")\
                .select("*")\
                .eq("id", role_id)\
                .eq("tenant_id", ctx.tenant_id)\
                .single()\
                .execute()
            
            return response.data
        except Exception as e:
            logger.error(f"Error getting department role: {e}")
            raise

    @staticmethod
    def update_department_role(supabase: Client, ctx: RequestContext, role_id: str, 
                              label: Optional[str] = None) -> Optional[dict]:
        """Update a department role."""
        try:
            update_data = {}
            if label is not None:
                update_data["label"] = label
            
            if not update_data:
                return DepartmentRBACService.get_department_role(supabase, ctx, role_id)
            
            response = supabase.table("department_roles")\
                .update(update_data)\
                .eq("id", role_id)\
                .eq("tenant_id", ctx.tenant_id)\
                .execute()
            
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating department role: {e}")
            raise

    @staticmethod
    def delete_department_role(supabase: Client, ctx: RequestContext, role_id: str) -> bool:
        """Delete a department role (only if no users are assigned)."""
        try:
            response = supabase.table("department_roles")\
                .delete()\
                .eq("id", role_id)\
                .eq("tenant_id", ctx.tenant_id)\
                .execute()
            
            return len(response.data or []) > 0
        except Exception as e:
            logger.error(f"Error deleting department role: {e}")
            raise

    @staticmethod
    def get_department_role_permissions(supabase: Client, ctx: RequestContext, 
                                       role_id: str) -> list[dict]:
        """Get all permissions for a department role."""
        try:
            response = supabase.table("department_permissions")\
                .select("""
                    id,
                    department_role_id,
                    module_id,
                    can_view,
                    can_create,
                    can_edit,
                    can_delete,
                    modules(id, key, label)
                """)\
                .eq("tenant_id", ctx.tenant_id)\
                .eq("department_role_id", role_id)\
                .execute()
            
            permissions = []
            if response.data:
                for perm in response.data:
                    module = perm.get("modules") or {}
                    permissions.append({
                        "id": perm["id"],
                        "department_role_id": perm["department_role_id"],
                        "module_id": perm["module_id"],
                        "module_key": module.get("key"),
                        "module_label": module.get("label"),
                        "can_view": perm["can_view"],
                        "can_create": perm["can_create"],
                        "can_edit": perm["can_edit"],
                        "can_delete": perm["can_delete"]
                    })
            
            return permissions
        except Exception as e:
            logger.error(f"Error getting department role permissions: {e}")
            raise

    @staticmethod
    def update_department_permission(supabase: Client, ctx: RequestContext, 
                                    role_id: str, module_id: str,
                                    can_view: bool = False, can_create: bool = False,
                                    can_edit: bool = False, can_delete: bool = False) -> dict:
        """Update permission for a department role-module pair."""
        try:
            # Check if permission exists
            check_response = supabase.table("department_permissions")\
                .select("id")\
                .eq("tenant_id", ctx.tenant_id)\
                .eq("department_role_id", role_id)\
                .eq("module_id", module_id)\
                .execute()
            
            update_data = {
                "can_view": can_view,
                "can_create": can_create,
                "can_edit": can_edit,
                "can_delete": can_delete
            }
            
            if check_response.data:
                # Update existing
                response = supabase.table("department_permissions")\
                    .update(update_data)\
                    .eq("tenant_id", ctx.tenant_id)\
                    .eq("department_role_id", role_id)\
                    .eq("module_id", module_id)\
                    .execute()
            else:
                # Insert new
                update_data["tenant_id"] = ctx.tenant_id
                update_data["department_role_id"] = role_id
                update_data["module_id"] = module_id
                response = supabase.table("department_permissions")\
                    .insert(update_data)\
                    .execute()
            
            return response.data[0] if response.data else {}
        except Exception as e:
            logger.error(f"Error updating department permission: {e}")
            raise

    @staticmethod
    def get_all_department_role_permissions_matrix(supabase: Client, ctx: RequestContext, 
                                                   role_id: str) -> dict:
        """Get all permissions for a role across all modules."""
        try:
            # Get all modules
            modules_response = supabase.table("modules")\
                .select("*")\
                .order("created_at", desc=False)\
                .execute()
            
            modules = {m["id"]: m for m in (modules_response.data or [])}
            
            # Get department permissions for this role
            perms_response = supabase.table("department_permissions")\
                .select("*")\
                .eq("tenant_id", ctx.tenant_id)\
                .eq("department_role_id", role_id)\
                .execute()
            
            permissions_map = {p["module_id"]: p for p in (perms_response.data or [])}
            
            # Build matrix
            matrix = []
            for module_id, module in modules.items():
                perm = permissions_map.get(module_id) or {
                    "module_id": module_id,
                    "can_view": False,
                    "can_create": False,
                    "can_edit": False,
                    "can_delete": False
                }
                matrix.append({
                    "module_id": module_id,
                    "module_key": module["key"],
                    "module_label": module["label"],
                    "can_view": perm.get("can_view", False),
                    "can_create": perm.get("can_create", False),
                    "can_edit": perm.get("can_edit", False),
                    "can_delete": perm.get("can_delete", False)
                })
            
            return {"role_id": role_id, "permissions": matrix}
        except Exception as e:
            logger.error(f"Error getting permission matrix: {e}")
            raise

    @staticmethod
    def is_department_manager(supabase: Client, ctx: RequestContext, user_id: str, 
                             dept_id: str) -> bool:
        """Check if user is a manager of a department."""
        try:
            response = supabase.table("user_department_roles")\
                .select("""
                    user_id,
                    department_role_id,
                    department_roles(key)
                """)\
                .eq("user_id", user_id)\
                .eq("department_id", dept_id)\
                .single()\
                .execute()
            
            if response.data:
                dept_role = response.data.get("department_roles") or {}
                return dept_role.get("key") == "manager"
            
            return False
        except Exception as e:
            logger.debug(f"Error checking if department manager: {e}")
            return False
