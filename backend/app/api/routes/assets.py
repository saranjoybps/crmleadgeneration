from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.assets import AssetCreate, AssetUpdate, AssetAssignmentCreate, AssetAssignmentUpdate
from app.services.assets import AssetService

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/assignments")
def list_assignments(
    user_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    asset_id: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("assets", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    assignments = AssetService.list_assignments(supabase, ctx, user_id=user_id, status=status, asset_id=asset_id)
    return response(assignments)


@router.post("/assignments")
def create_assignment(
    payload: AssetAssignmentCreate,
    ctx: RequestContext = Depends(require_module_permission("assets", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    assignment = AssetService.create_assignment(supabase, payload, ctx)
    return response(assignment)


@router.put("/assignments/{assignment_id}")
def update_assignment(
    assignment_id: str,
    payload: AssetAssignmentUpdate,
    ctx: RequestContext = Depends(require_module_permission("assets", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    assignment = AssetService.update_assignment(supabase, assignment_id, payload, ctx)
    return response(assignment)


@router.get("")
def list_assets(
    asset_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("assets", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    assets = AssetService.list_assets(supabase, ctx, asset_type=asset_type, status=status, search=search)
    return response(assets)


@router.get("/{asset_id}")
def get_asset(asset_id: str, ctx: RequestContext = Depends(require_module_permission("assets", "view"))):
    supabase = get_supabase_client(access_token=ctx.access_token)
    asset = AssetService.get_asset(supabase, asset_id, ctx)
    return response(asset)


@router.post("")
def create_asset(
    payload: AssetCreate,
    ctx: RequestContext = Depends(require_module_permission("assets", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    asset = AssetService.create_asset(supabase, payload, ctx)
    return response(asset)


@router.put("/{asset_id}")
def update_asset(
    asset_id: str,
    payload: AssetUpdate,
    ctx: RequestContext = Depends(require_module_permission("assets", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    asset = AssetService.update_asset(supabase, asset_id, payload, ctx)
    return response(asset)


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: str,
    ctx: RequestContext = Depends(require_module_permission("assets", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    result = AssetService.delete_asset(supabase, asset_id, ctx)
    return response(result)
