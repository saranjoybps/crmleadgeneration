from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.common import TaskAssigneesUpdate, TaskCreate, TaskUpdate


class TaskService:
    @staticmethod
    def _get_accessible_project_ids(supabase: Client, ctx: RequestContext) -> set[str] | None:
        if ctx.role_key in {"owner", "admin"}:
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

    @classmethod
    def list_tasks(
        cls,
        supabase: Client,
        ctx: RequestContext,
        project_id: str | None = None,
        ticket_id: str | None = None,
        status: str | None = None,
        assigned_to_me: bool = False,
        user_id: str | None = None,
    ):
        # We fetch tasks with their assignees. 
        # Since a task can have multiple assignees, we'll get a list of objects.
        query = (
            supabase.table("tasks")
            .select("*, task_assignees(user_id, users!task_assignees_user_id_fkey(email, full_name))")
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at", desc=True)
        )
        if project_id:
            query = query.eq("project_id", project_id)
        if ticket_id:
            query = query.eq("ticket_id", ticket_id)
        if status:
            query = query.eq("status", status)

        res = query.execute()
        rows = res.data or []
        
        allowed_project_ids = cls._get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None:
            rows = [row for row in rows if row["project_id"] in allowed_project_ids]
        
        # Filter by user_id if provided (tasks where this user is assigned)
        if user_id:
            rows = [
                row for row in rows 
                if any(a["user_id"] == user_id for a in (row.get("task_assignees") or []))
            ]

        if assigned_to_me:
            rows = [
                row for row in rows 
                if any(a["user_id"] == ctx.app_user_id for a in (row.get("task_assignees") or []))
            ]
        
        return rows

    @classmethod
    def get_task(cls, supabase: Client, task_id: str, ctx: RequestContext):
        data = (
            supabase.table("tasks")
            .select("*, task_assignees(user_id, users!task_assignees_user_id_fkey(email, full_name))")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", task_id)
            .maybe_single()
            .execute()
        )
        if not data.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        allowed_project_ids = cls._get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None and data.data["project_id"] not in allowed_project_ids:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return data.data

    @staticmethod
    def create_task(supabase: Client, ticket_id: str, payload: TaskCreate, ctx: RequestContext):
        ticket = (
            supabase.table("tickets")
            .select("id,project_id")
            .eq("id", ticket_id)
            .eq("tenant_id", ctx.tenant_id)
            .maybe_single()
            .execute()
        )
        if not ticket.data:
            raise HTTPException(status_code=404, detail="Ticket not found")

        created = (
            supabase.table("tasks")
            .insert(
                {
                    "tenant_id": ctx.tenant_id,
                    "project_id": ticket.data["project_id"],
                    "ticket_id": ticket_id,
                    "title": payload.title,
                    "description": payload.description,
                    "status": payload.status or "open",
                    "created_by": ctx.app_user_id,
                }
            )
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create task")

        assignee_ids = set(payload.assignee_user_ids or [])
        if assignee_ids:
            assignments = [
                {
                    "tenant_id": ctx.tenant_id,
                    "task_id": row["id"],
                    "user_id": user_id,
                }
                for user_id in assignee_ids
            ]
            supabase.table("task_assignees").upsert(
                assignments,
                on_conflict="task_id,user_id",
            ).execute()
        
        return row

    @staticmethod
    def update_task(supabase: Client, task_id: str, payload: TaskUpdate, ctx: RequestContext):
        if ctx.role_key == "member":
            assigned = (
                supabase.table("task_assignees")
                .select("id")
                .eq("tenant_id", ctx.tenant_id)
                .eq("task_id", task_id)
                .eq("user_id", ctx.app_user_id)
                .maybe_single()
                .execute()
            )
            if not assigned.data:
                raise HTTPException(status_code=403, detail="Forbidden")
        
        updated = (
            supabase.table("tasks")
            .update(payload.model_dump(exclude_none=True))
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", task_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
        return row

    @staticmethod
    def update_task_assignees(supabase: Client, task_id: str, payload: TaskAssigneesUpdate, ctx: RequestContext):
        for user_id in set(payload.add_user_ids or []):
            supabase.table("task_assignees").upsert(
                {"tenant_id": ctx.tenant_id, "task_id": task_id, "user_id": user_id},
                on_conflict="task_id,user_id",
            ).execute()
        
        remove_ids = list(set(payload.remove_user_ids or []))
        if remove_ids:
            supabase.table("task_assignees").delete().eq("tenant_id", ctx.tenant_id).eq("task_id", task_id).in_("user_id", remove_ids).execute()

        assignees = (
            supabase.table("task_assignees")
            .select("id,task_id,user_id,assigned_at")
            .eq("tenant_id", ctx.tenant_id)
            .eq("task_id", task_id)
            .execute()
        )
        return assignees.data or []

    @staticmethod
    def delete_task(supabase: Client, task_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("tasks")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", task_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
        return row
