from fastapi import HTTPException
from supabase import Client
from postgrest.exceptions import APIError

from app.core.deps import RequestContext
from app.schemas.common import TicketCreate, TicketUpdate


class TicketService:
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
    def list_tickets(cls, supabase: Client, ctx: RequestContext, project_id: str | None = None, status: str | None = None):
        query = (
            supabase.table("tickets")
            .select("id,tenant_id,project_id,title,description,type,status,priority,due_date,created_by,created_at,updated_at")
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at", desc=True)
        )
        allowed_project_ids = cls._get_accessible_project_ids(supabase, ctx)
        if project_id:
            query = query.eq("project_id", project_id)
        if status:
            query = query.eq("status", status)
        
        rows = query.execute().data or []
        if allowed_project_ids is not None:
            rows = [row for row in rows if row["project_id"] in allowed_project_ids]
        return rows

    @classmethod
    def get_ticket(cls, supabase: Client, ticket_id: str, ctx: RequestContext):
        data = (
            supabase.table("tickets")
            .select("*, tasks(*, task_assignees(user_id, users(full_name)))")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", ticket_id)
            .maybe_single()
            .execute()
        )
        if not data.data:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        allowed_project_ids = cls._get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None and data.data["project_id"] not in allowed_project_ids:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        return data.data

    @classmethod
    def create_ticket(cls, supabase: Client, payload: TicketCreate, ctx: RequestContext):
        allowed_project_ids = cls._get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None and payload.project_id not in allowed_project_ids:
            raise HTTPException(status_code=403, detail="Forbidden for this project")
        
        try:
            created = (
                supabase.table("tickets")
                .insert(
                    {
                        "tenant_id": ctx.tenant_id,
                        "project_id": payload.project_id,
                        "title": payload.title,
                        "description": payload.description,
                        "type": payload.type,
                        "priority": getattr(payload, "priority", "medium"),
                        "due_date": getattr(payload, "due_date", None),
                        "status": payload.status or "open",
                        "created_by": ctx.app_user_id,
                    }
                )
                .execute()
            )
        except APIError as exc:
            raise HTTPException(status_code=400, detail=f"Database error: {exc.message}")

        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create ticket")
        return row

    @classmethod
    def update_ticket(cls, supabase: Client, ticket_id: str, payload: TicketUpdate, ctx: RequestContext):
        allowed_project_ids = cls._get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None:
            ticket = (
                supabase.table("tickets")
                .select("id,project_id")
                .eq("tenant_id", ctx.tenant_id)
                .eq("id", ticket_id)
                .maybe_single()
                .execute()
            )
            if not ticket.data:
                raise HTTPException(status_code=404, detail="Ticket not found")
            if ticket.data["project_id"] not in allowed_project_ids:
                raise HTTPException(status_code=404, detail="Ticket not found")
        
        try:
            update_data = payload.model_dump(exclude_none=True)
            
            if hasattr(payload, "priority") and payload.priority:
                update_data["priority"] = payload.priority
            if hasattr(payload, "due_date"):
                update_data["due_date"] = payload.due_date

            updated = (
                supabase.table("tickets")
                .update(update_data)
                .eq("tenant_id", ctx.tenant_id)
                .eq("id", ticket_id)
                .execute()
            )
        except APIError as exc:
            raise HTTPException(status_code=400, detail=f"Database error: {exc.message}")

        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return row

    @staticmethod
    def delete_ticket(supabase: Client, ticket_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("tickets")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", ticket_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return row
