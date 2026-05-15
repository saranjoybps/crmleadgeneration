import logging
import uuid
from typing import Optional

from supabase import Client

from app.core.deps import RequestContext

logger = logging.getLogger("joycrm.services.departments")


class DepartmentService:
    """Service for managing departments within a tenant."""

    @staticmethod
    def create_department(supabase: Client, ctx: RequestContext, name: str, 
                         description: Optional[str], slug: str) -> dict:
        """Create a new department in a tenant."""
        try:
            dept_id = str(uuid.uuid4())
            response = supabase.table("departments").insert({
                "id": dept_id,
                "tenant_id": ctx.tenant_id,
                "name": name,
                "description": description,
                "slug": slug
            }).execute()
            
            if response.data:
                return response.data[0]
            raise Exception("Failed to create department")
        except Exception as e:
            logger.error(f"Error creating department: {e}")
            raise

    @staticmethod
    def list_departments(supabase: Client, ctx: RequestContext, limit: int = 100, offset: int = 0) -> list[dict]:
        """List all departments in a tenant."""
        try:
            response = supabase.table("departments")\
                .select("*")\
                .eq("tenant_id", ctx.tenant_id)\
                .range(offset, offset + limit - 1)\
                .order("created_at", desc=False)\
                .execute()
            
            return response.data or []
        except Exception as e:
            logger.error(f"Error listing departments: {e}")
            raise

    @staticmethod
    def get_department(supabase: Client, ctx: RequestContext, dept_id: str) -> Optional[dict]:
        """Get a specific department."""
        try:
            response = supabase.table("departments")\
                .select("*")\
                .eq("id", dept_id)\
                .eq("tenant_id", ctx.tenant_id)\
                .single()\
                .execute()
            
            return response.data
        except Exception as e:
            logger.error(f"Error getting department: {e}")
            raise

    @staticmethod
    def get_department_with_members(supabase: Client, ctx: RequestContext, dept_id: str) -> Optional[dict]:
        """Get department with member details."""
        try:
            # Get department
            dept_response = supabase.table("departments")\
                .select("*")\
                .eq("id", dept_id)\
                .eq("tenant_id", ctx.tenant_id)\
                .single()\
                .execute()
            
            if not dept_response.data:
                return None
            
            dept = dept_response.data
            
            # Get members
            members_response = supabase.table("user_department_roles")\
                .select("""
                    user_id,
                    department_role_id,
                    department_roles(key),
                    users(id, email, full_name, avatar_url)
                """)\
                .eq("department_id", dept_id)\
                .execute()
            
            members = []
            if members_response.data:
                for member in members_response.data:
                    user_data = member.get("users") or {}
                    dept_role = member.get("department_roles") or {}
                    members.append({
                        "user_id": member["user_id"],
                        "full_name": user_data.get("full_name"),
                        "email": user_data.get("email"),
                        "avatar_url": user_data.get("avatar_url"),
                        "department_role_key": dept_role.get("key")
                    })
            
            dept["members"] = members
            dept["member_count"] = len(members)
            return dept
        except Exception as e:
            logger.error(f"Error getting department with members: {e}")
            raise

    @staticmethod
    def update_department(supabase: Client, ctx: RequestContext, dept_id: str, 
                         name: Optional[str] = None, 
                         description: Optional[str] = None, 
                         slug: Optional[str] = None) -> Optional[dict]:
        """Update department details."""
        try:
            update_data = {}
            if name is not None:
                update_data["name"] = name
            if description is not None:
                update_data["description"] = description
            if slug is not None:
                update_data["slug"] = slug
            
            if not update_data:
                return DepartmentService.get_department(supabase, ctx, dept_id)
            
            response = supabase.table("departments")\
                .update(update_data)\
                .eq("id", dept_id)\
                .eq("tenant_id", ctx.tenant_id)\
                .execute()
            
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating department: {e}")
            raise

    @staticmethod
    def delete_department(supabase: Client, ctx: RequestContext, dept_id: str) -> bool:
        """Delete a department."""
        try:
            response = supabase.table("departments")\
                .delete()\
                .eq("id", dept_id)\
                .eq("tenant_id", ctx.tenant_id)\
                .execute()
            
            return len(response.data or []) > 0
        except Exception as e:
            logger.error(f"Error deleting department: {e}")
            raise

    @staticmethod
    def add_user_to_department(supabase: Client, ctx: RequestContext, user_id: str, 
                              dept_id: str, department_role_key: str = "member") -> dict:
        """Add a user to a department with a specific role."""
        try:
            # Get department role id
            role_response = supabase.table("department_roles")\
                .select("id")\
                .eq("tenant_id", ctx.tenant_id)\
                .eq("key", department_role_key)\
                .single()\
                .execute()
            
            if not role_response.data:
                raise Exception(f"Department role '{department_role_key}' not found")
            
            role_id = role_response.data["id"]
            
            # Upsert user to department
            response = supabase.table("user_department_roles")\
                .upsert({
                    "user_id": user_id,
                    "department_id": dept_id,
                    "department_role_id": role_id
                })\
                .execute()
            
            return response.data[0] if response.data else {}
        except Exception as e:
            logger.error(f"Error adding user to department: {e}")
            raise

    @staticmethod
    def remove_user_from_department(supabase: Client, ctx: RequestContext, user_id: str, dept_id: str) -> bool:
        """Remove a user from a department."""
        try:
            response = supabase.table("user_department_roles")\
                .delete()\
                .eq("user_id", user_id)\
                .eq("department_id", dept_id)\
                .execute()
            
            return len(response.data or []) > 0
        except Exception as e:
            logger.error(f"Error removing user from department: {e}")
            raise

    @staticmethod
    def list_department_members(supabase: Client, ctx: RequestContext, dept_id: str, 
                               limit: int = 100, offset: int = 0) -> list[dict]:
        """List all members of a department."""
        try:
            response = supabase.table("user_department_roles")\
                .select("""
                    user_id,
                    department_role_id,
                    created_at,
                    department_roles(id, key, label),
                    users(id, email, full_name, avatar_url, is_active)
                """)\
                .eq("department_id", dept_id)\
                .range(offset, offset + limit - 1)\
                .order("created_at", desc=False)\
                .execute()
            
            members = []
            if response.data:
                for member in response.data:
                    user_data = member.get("users") or {}
                    dept_role = member.get("department_roles") or {}
                    members.append({
                        "user_id": member["user_id"],
                        "full_name": user_data.get("full_name"),
                        "email": user_data.get("email"),
                        "avatar_url": user_data.get("avatar_url"),
                        "is_active": user_data.get("is_active"),
                        "department_role_id": dept_role.get("id"),
                        "department_role_key": dept_role.get("key"),
                        "department_role_label": dept_role.get("label"),
                        "created_at": member["created_at"]
                    })
            
            return members
        except Exception as e:
            logger.error(f"Error listing department members: {e}")
            raise

    @staticmethod
    def update_user_department_role(supabase: Client, ctx: RequestContext, user_id: str, 
                                   dept_id: str, department_role_key: str) -> dict:
        """Update a user's role within a department."""
        try:
            # Get department role id
            role_response = supabase.table("department_roles")\
                .select("id")\
                .eq("tenant_id", ctx.tenant_id)\
                .eq("key", department_role_key)\
                .single()\
                .execute()
            
            if not role_response.data:
                raise Exception(f"Department role '{department_role_key}' not found")
            
            role_id = role_response.data["id"]
            
            # Update user's department role
            response = supabase.table("user_department_roles")\
                .update({
                    "department_role_id": role_id
                })\
                .eq("user_id", user_id)\
                .eq("department_id", dept_id)\
                .execute()
            
            return response.data[0] if response.data else {}
        except Exception as e:
            logger.error(f"Error updating user department role: {e}")
            raise

    @staticmethod
    def get_user_department(supabase: Client, ctx: RequestContext, user_id: str) -> Optional[dict]:
        """Get the user's current department in a tenant."""
        try:
            response = supabase.table("user_department_roles")\
                .select("""
                    user_id,
                    department_id,
                    department_role_id,
                    departments(id, name, slug, tenant_id),
                    department_roles(key, label)
                """)\
                .eq("user_id", user_id)\
                .execute()
            
            # Filter by tenant
            if response.data:
                for entry in response.data:
                    dept = entry.get("departments") or {}
                    if dept.get("tenant_id") == ctx.tenant_id:
                        return {
                            "department_id": entry["department_id"],
                            "department_name": dept.get("name"),
                            "department_slug": dept.get("slug"),
                            "department_role_key": entry.get("department_roles", {}).get("key"),
                            "department_role_label": entry.get("department_roles", {}).get("label")
                        }
            
            return None
        except Exception as e:
            logger.error(f"Error getting user department: {e}")
            raise

