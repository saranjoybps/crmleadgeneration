from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import TicketCreate, TicketUpdate

router = APIRouter(prefix="/tickets", tags=["tickets"])


def _accessible_project_ids(ctx: RequestContext) -> set[str] | None:
    if ctx.role_key in {"owner", "admin"}:
        return None
    supabase = get_supabase_client()
    rows = (
        supabase.table("project_members")
        .select("project_id")
        .eq("tenant_id", ctx.tenant_id)
        .eq("user_id", ctx.app_user_id)
        .eq("is_active", True)
        .execute()
    )
    return {x["project_id"] for x in (rows.data or [])}


@router.get("")
def list_tickets(
    project_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_roles("owner", "admin", "member", "client")),
):
    supabase = get_supabase_client()
    query = (
        supabase.table("tickets")
        .select("id,tenant_id,project_id,title,description,type,status,created_by,created_at,updated_at")
        .eq("tenant_id", ctx.tenant_id)
        .order("created_at", desc=True)
    )
    allowed_project_ids = _accessible_project_ids(ctx)
    if project_id:
        query = query.eq("project_id", project_id)
    if status:
        query = query.eq("status", status)
    rows = query.execute().data or []
    if allowed_project_ids is not None:
        rows = [row for row in rows if row["project_id"] in allowed_project_ids]
    return response(rows)


@router.get("/{ticket_id}")
def get_ticket(ticket_id: str, ctx: RequestContext = Depends(require_roles("owner", "admin", "member", "client"))):
    supabase = get_supabase_client()
    data = (
        supabase.table("tickets")
        .select("id,tenant_id,project_id,title,description,type,status,created_by,created_at,updated_at")
        .eq("tenant_id", ctx.tenant_id)
        .eq("id", ticket_id)
        .maybe_single()
        .execute()
    )
    if not data.data:
        raise HTTPException(status_code=404, detail="Ticket not found")
    allowed_project_ids = _accessible_project_ids(ctx)
    if allowed_project_ids is not None and data.data["project_id"] not in allowed_project_ids:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return response(data.data)


@router.post("")
def create_ticket(payload: TicketCreate, ctx: RequestContext = Depends(require_roles("owner", "admin", "member", "client"))):
    supabase = get_supabase_client()
    allowed_project_ids = _accessible_project_ids(ctx)
    if allowed_project_ids is not None and payload.project_id not in allowed_project_ids:
        raise HTTPException(status_code=403, detail="Forbidden for this project")
    created = (
        supabase.table("tickets")
        .insert(
            {
                "tenant_id": ctx.tenant_id,
                "project_id": payload.project_id,
                "title": payload.title,
                "description": payload.description,
                "type": payload.type,
                "status": payload.status or "open",
                "created_by": ctx.app_user_id,
            }
        )
        .execute()
    )
    row = (created.data or [None])[0]
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create ticket")
    return response(row)


@router.patch("/{ticket_id}")
def update_ticket(ticket_id: str, payload: TicketUpdate, ctx: RequestContext = Depends(require_roles("owner", "admin", "member"))):
    supabase = get_supabase_client()
    allowed_project_ids = _accessible_project_ids(ctx)
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
    updated = (
        supabase.table("tickets")
        .update(payload.model_dump(exclude_none=True))
        .eq("tenant_id", ctx.tenant_id)
        .eq("id", ticket_id)
        .execute()
    )
    row = (updated.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return response(row)


@router.delete("/{ticket_id}")
def delete_ticket(ticket_id: str, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
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
    return response(row)
