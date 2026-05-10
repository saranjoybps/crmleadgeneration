from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import TicketCreate, TicketUpdate

router = APIRouter(prefix="/tickets", tags=["tickets"])


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
    if project_id:
        query = query.eq("project_id", project_id)
    if status:
        query = query.eq("status", status)
    data = query.execute()
    return response(data.data or [])


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
    return response(data.data)


@router.post("")
def create_ticket(payload: TicketCreate, ctx: RequestContext = Depends(require_roles("owner", "admin", "member", "client"))):
    supabase = get_supabase_client()
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
