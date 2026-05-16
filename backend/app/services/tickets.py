from fastapi import HTTPException
from supabase import Client
from postgrest.exceptions import APIError

from app.core.deps import RequestContext
from app.schemas.common import TicketCreate, TicketUpdate
from app.services.access_scope import AccessScopeService


class TicketService:
    @classmethod
    def list_tickets(
        cls,
        supabase: Client,
        ctx: RequestContext,
        project_id: str | None = None,
        status: str | None = None,
        milestone_id: str | None = None,
        department_id: str | None = None,
    ):
        query = (
            supabase.table("tickets")
            .select("id,tenant_id,project_id,milestone_id,title,description,type,status,priority,start_date,due_date,created_by,created_at,updated_at,projects(department_id)")
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at", desc=True)
        )
        if project_id:
            query = query.eq("project_id", project_id)
        if status:
            query = query.eq("status", status)
        if milestone_id:
            query = query.eq("milestone_id", milestone_id)
        
        rows = query.execute().data or []
        
        project_department_map = AccessScopeService.get_project_department_map(supabase, ctx.tenant_id)
        for row in rows:
            fallback = {row.get("projects", {}).get("department_id")} if row.get("projects", {}).get("department_id") else set()
            row["_project_department_ids"] = project_department_map.get(row["project_id"], fallback)
        allowed_project_ids = AccessScopeService.get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None:
            rows = [row for row in rows if row["project_id"] in allowed_project_ids]
        if department_id:
            rows = [row for row in rows if department_id in row.get("_project_department_ids", set())]
        for row in rows:
            row.pop("_project_department_ids", None)

        return rows

    @classmethod
    def get_ticket(cls, supabase: Client, ticket_id: str, ctx: RequestContext):
        data = (
            supabase.table("tickets")
            .select("*, tasks(*, task_assignees(user_id, users(full_name))), projects(department_id)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", ticket_id)
            .maybe_single()
            .execute()
        )
        if not data.data:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        allowed_project_ids = AccessScopeService.get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None and data.data["project_id"] not in allowed_project_ids:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        return data.data

    @classmethod
    def create_ticket(cls, supabase: Client, payload: TicketCreate, ctx: RequestContext):
        allowed_project_ids = AccessScopeService.get_accessible_project_ids(supabase, ctx)
        if allowed_project_ids is not None and payload.project_id not in allowed_project_ids:
            raise HTTPException(status_code=403, detail="Forbidden for this project")
        
        try:
            insert_data = {
                "tenant_id": ctx.tenant_id,
                "project_id": payload.project_id,
                "milestone_id": getattr(payload, "milestone_id", None),
                "title": payload.title,
                "description": payload.description,
                "type": payload.type,
                "priority": getattr(payload, "priority", "medium"),
                "start_date": getattr(payload, "start_date", None),
                "due_date": getattr(payload, "due_date", None),
                "status": payload.status or "open",
                "created_by": ctx.app_user_id,
            }
            created = (
                supabase.table("tickets")
                .insert(insert_data)
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
        allowed_project_ids = AccessScopeService.get_accessible_project_ids(supabase, ctx)
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
            
            due_date_val = getattr(payload, "due_date", "missing_attr")
            if due_date_val != "missing_attr":
                update_data["due_date"] = due_date_val

            start_date_val = getattr(payload, "start_date", "missing_attr")
            if start_date_val != "missing_attr":
                update_data["start_date"] = start_date_val

            milestone_id_val = getattr(payload, "milestone_id", "missing_attr")
            if milestone_id_val != "missing_attr":
                update_data["milestone_id"] = milestone_id_val

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
