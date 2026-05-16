from supabase import Client

from app.core.deps import RequestContext


class AccessScopeService:
    @staticmethod
    def get_accessible_project_ids(supabase: Client, ctx: RequestContext) -> set[str] | None:
        if ctx.role_key == "owner":
            return None
        rows = (
            supabase.table("project_members")
            .select("project_id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .eq("is_active", True)
            .execute()
        )
        return {x["project_id"] for x in (rows.data or [])}

    @staticmethod
    def get_project_department_map(supabase: Client, tenant_id: str) -> dict[str, set[str]]:
        rows = (
            supabase.table("project_departments")
            .select("project_id,department_id")
            .eq("tenant_id", tenant_id)
            .execute()
        )
        mapping: dict[str, set[str]] = {}
        for row in (rows.data or []):
            mapping.setdefault(row["project_id"], set()).add(row["department_id"])
        return mapping

    @classmethod
    def get_accessible_department_ids(cls, supabase: Client, ctx: RequestContext) -> set[str] | None:
        if ctx.role_key == "owner":
            return None
        project_ids = cls.get_accessible_project_ids(supabase, ctx) or set()
        if not project_ids:
            return set()
        project_department_map = cls.get_project_department_map(supabase, ctx.tenant_id)
        department_ids: set[str] = set()
        for project_id in project_ids:
            department_ids.update(project_department_map.get(project_id, set()))
        return department_ids
