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
        try:
            dept_response = supabase.table("departments")\
                .select("*")\
                .eq("id", dept_id)\
                .eq("tenant_id", ctx.tenant_id)\
                .single()\
                .execute()

            if not dept_response.data:
                return None

            dept = dept_response.data
            members_response = supabase.table("user_departments")\
                .select("user_id, created_at, users(id, email, full_name, avatar_url)")\
                .eq("department_id", dept_id)\
                .execute()

            members = []
            for member in (members_response.data or []):
                user_data = member.get("users") or {}
                members.append({
                    "user_id": member["user_id"],
                    "full_name": user_data.get("full_name"),
                    "email": user_data.get("email"),
                    "avatar_url": user_data.get("avatar_url"),
                    "joined_at": member.get("created_at"),
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
    def add_user_to_department(supabase: Client, ctx: RequestContext, user_id: str, dept_id: str) -> dict:
        try:
            response = supabase.table("user_departments")\
                .upsert({"user_id": user_id, "department_id": dept_id})\
                .execute()
            return response.data[0] if response.data else {}
        except Exception as e:
            logger.error(f"Error adding user to department: {e}")
            raise

    @staticmethod
    def remove_user_from_department(supabase: Client, ctx: RequestContext, user_id: str, dept_id: str) -> bool:
        try:
            response = supabase.table("user_departments")\
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
        try:
            response = supabase.table("user_departments")\
                .select("user_id, created_at, users(id, email, full_name, avatar_url, is_active)")\
                .eq("department_id", dept_id)\
                .range(offset, offset + limit - 1)\
                .order("created_at", desc=False)\
                .execute()

            members = []
            for member in (response.data or []):
                user_data = member.get("users") or {}
                members.append({
                    "user_id": member["user_id"],
                    "full_name": user_data.get("full_name"),
                    "email": user_data.get("email"),
                    "avatar_url": user_data.get("avatar_url"),
                    "is_active": user_data.get("is_active"),
                    "joined_at": member.get("created_at"),
                })
            return members
        except Exception as e:
            logger.error(f"Error listing department members: {e}")
            raise

    @staticmethod
    def get_user_department(supabase: Client, ctx: RequestContext, user_id: str) -> Optional[dict]:
        try:
            response = supabase.table("user_departments")\
                .select("user_id, department_id, departments(id, name, slug, tenant_id)")\
                .eq("user_id", user_id)\
                .execute()

            for entry in (response.data or []):
                dept = entry.get("departments") or {}
                if dept.get("tenant_id") == ctx.tenant_id:
                    return {
                        "department_id": entry["department_id"],
                        "department_name": dept.get("name"),
                        "department_slug": dept.get("slug"),
                    }
            return None
        except Exception as e:
            logger.error(f"Error getting user department: {e}")
            raise
