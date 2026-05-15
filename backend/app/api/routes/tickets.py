from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.common import TicketCreate, TicketUpdate
from app.services.tickets import TicketService

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("")
def list_tickets(
    project_id: str | None = Query(default=None),
    department_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("tickets", "view")),
):
    supabase = get_supabase_client()
    tickets = TicketService.list_tickets(supabase, ctx, project_id=project_id, status=status, department_id=department_id)
    return response(tickets)


@router.get("/{ticket_id}")
def get_ticket(ticket_id: str, ctx: RequestContext = Depends(require_module_permission("tickets", "view"))):
    supabase = get_supabase_client()
    ticket = TicketService.get_ticket(supabase, ticket_id, ctx)
    return response(ticket)


@router.post("")
def create_ticket(payload: TicketCreate, ctx: RequestContext = Depends(require_module_permission("tickets", "create"))):
    supabase = get_supabase_client()
    ticket = TicketService.create_ticket(supabase, payload, ctx)
    return response(ticket)


@router.patch("/{ticket_id}")
def update_ticket(ticket_id: str, payload: TicketUpdate, ctx: RequestContext = Depends(require_module_permission("tickets", "edit"))):
    supabase = get_supabase_client()
    ticket = TicketService.update_ticket(supabase, ticket_id, payload, ctx)
    return response(ticket)


@router.delete("/{ticket_id}")
def delete_ticket(ticket_id: str, ctx: RequestContext = Depends(require_module_permission("tickets", "delete"))):
    supabase = get_supabase_client()
    ticket = TicketService.delete_ticket(supabase, ticket_id, ctx)
    return response(ticket)
