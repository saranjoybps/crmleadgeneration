from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.leave import (
    LeaveRequestApprove,
    LeaveRequestCancel,
    LeaveRequestCreate,
    LeaveRequestReject,
    LeaveTypeCreate,
    LeaveTypeUpdate,
)
from app.services.leave import LeaveService

router = APIRouter(prefix="", tags=["leave"])


# ---- Leave Types ----

@router.get("/leave-types")
def list_leave_types(
    active_only: bool = Query(default=False),
    ctx: RequestContext = Depends(require_module_permission("leave", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    types = LeaveService.list_leave_types(supabase, ctx, active_only=active_only)
    return response(types)


@router.post("/leave-types")
def create_leave_type(
    payload: LeaveTypeCreate,
    ctx: RequestContext = Depends(require_module_permission("leave", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    lt = LeaveService.create_leave_type(supabase, payload, ctx)
    return response(lt)


@router.patch("/leave-types/{leave_type_id}")
def update_leave_type(
    leave_type_id: str,
    payload: LeaveTypeUpdate,
    ctx: RequestContext = Depends(require_module_permission("leave", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    lt = LeaveService.update_leave_type(supabase, leave_type_id, payload, ctx)
    return response(lt)


@router.delete("/leave-types/{leave_type_id}")
def delete_leave_type(
    leave_type_id: str,
    ctx: RequestContext = Depends(require_module_permission("leave", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    lt = LeaveService.delete_leave_type(supabase, leave_type_id, ctx)
    return response(lt)


# ---- Leave Balances ----

@router.get("/leave-balances")
def get_my_balances(
    year: int | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("leave", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    balances = LeaveService.get_my_balances(supabase, ctx, year=year)
    return response(balances)


@router.get("/leave-balances/all")
def get_all_balances(
    year: int | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("leave", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    balances = LeaveService.get_all_balances(supabase, ctx, year=year)
    return response(balances)


# ---- Leave Requests ----

@router.post("/leave-requests")
def create_leave_request(
    payload: LeaveRequestCreate,
    ctx: RequestContext = Depends(require_module_permission("leave", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    request = LeaveService.create_request(supabase, payload, ctx)
    return response(request)


@router.get("/leave-requests")
def list_my_requests(
    status: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("leave", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    requests = LeaveService.list_my_requests(supabase, ctx, status=status, from_date=from_date, to_date=to_date)
    return response(requests)


@router.get("/leave-requests/all")
def list_all_requests(
    status: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("leave", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    requests = LeaveService.list_all_requests(supabase, ctx, status=status, from_date=from_date, to_date=to_date, user_id=user_id)
    return response(requests)


@router.get("/leave-requests/{request_id}")
def get_leave_request(
    request_id: str,
    ctx: RequestContext = Depends(require_module_permission("leave", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    request = LeaveService.get_request(supabase, request_id, ctx)
    return response(request)


@router.patch("/leave-requests/{request_id}/cancel")
def cancel_leave_request(
    request_id: str,
    payload: LeaveRequestCancel,
    ctx: RequestContext = Depends(require_module_permission("leave", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    request = LeaveService.cancel_request(supabase, request_id, payload, ctx)
    return response(request)


@router.post("/leave-requests/{request_id}/approve")
def approve_leave_request(
    request_id: str,
    payload: LeaveRequestApprove,
    ctx: RequestContext = Depends(require_module_permission("leave", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    request = LeaveService.approve_request(supabase, request_id, payload, ctx)
    return response(request)


@router.post("/leave-requests/{request_id}/reject")
def reject_leave_request(
    request_id: str,
    payload: LeaveRequestReject,
    ctx: RequestContext = Depends(require_module_permission("leave", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    request = LeaveService.reject_request(supabase, request_id, payload, ctx)
    return response(request)
