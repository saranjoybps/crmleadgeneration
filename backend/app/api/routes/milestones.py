from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.common import MilestoneCreate, MilestoneUpdate
from app.services.milestones import MilestoneService

router = APIRouter(prefix="/milestones", tags=["milestones"])


@router.get("")
def list_all_milestones(
    project_id: str | None = Query(default=None),
    department_id: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("roadmap", "view"))
):
    supabase = get_supabase_client()
    milestones = MilestoneService.list_milestones(supabase, ctx, project_id=project_id, department_id=department_id)
    return response(milestones)


@router.get("/{milestone_id}")
def get_milestone(milestone_id: str, ctx: RequestContext = Depends(require_module_permission("roadmap", "view"))):
    supabase = get_supabase_client()
    milestone = MilestoneService.get_milestone(supabase, milestone_id, ctx)
    return response(milestone)


@router.post("")
def create_milestone(payload: MilestoneCreate, ctx: RequestContext = Depends(require_module_permission("roadmap", "create"))):
    supabase = get_supabase_client()
    milestone = MilestoneService.create_milestone(supabase, payload, ctx)
    return response(milestone)


@router.patch("/{milestone_id}")
def update_milestone(milestone_id: str, payload: MilestoneUpdate, ctx: RequestContext = Depends(require_module_permission("roadmap", "edit"))):
    supabase = get_supabase_client()
    milestone = MilestoneService.update_milestone(supabase, milestone_id, payload, ctx)
    return response(milestone)


@router.delete("/{milestone_id}")
def delete_milestone(milestone_id: str, ctx: RequestContext = Depends(require_module_permission("roadmap", "delete"))):
    supabase = get_supabase_client()
    res = MilestoneService.delete_milestone(supabase, milestone_id, ctx)
    return response(res)
