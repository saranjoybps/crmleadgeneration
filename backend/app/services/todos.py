from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.todo import TodoCreate, TodoUpdate


class TodoService:
    @staticmethod
    def list_todos(
        supabase: Client,
        ctx: RequestContext,
        is_completed: bool | None = None,
    ):
        query = (
            supabase.table("todos")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .order("created_at", desc=True)
        )
        
        if is_completed is not None:
            query = query.eq("is_completed", is_completed)

        res = query.execute()
        return res.data or []

    @staticmethod
    def create_todo(supabase: Client, payload: TodoCreate, ctx: RequestContext):
        created = (
            supabase.table("todos")
            .insert(
                {
                    "tenant_id": ctx.tenant_id,
                    "user_id": ctx.app_user_id,
                    "title": payload.title,
                    "description": payload.description,
                    "is_completed": payload.is_completed,
                    "due_date": payload.due_date.isoformat() if payload.due_date else None,
                }
            )
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create todo")
        return row

    @staticmethod
    def update_todo(supabase: Client, todo_id: str, payload: TodoUpdate, ctx: RequestContext):
        # RLS will handle basic security, but we can add extra checks if needed.
        # For now, we rely on RLS.
        update_data = payload.model_dump(exclude_none=True)
        if "due_date" in update_data and update_data["due_date"]:
            update_data["due_date"] = update_data["due_date"].isoformat()

        updated = (
            supabase.table("todos")
            .update(update_data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", todo_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Todo not found")
        return row

    @staticmethod
    def delete_todo(supabase: Client, todo_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("todos")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", todo_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Todo not found")
        return row
