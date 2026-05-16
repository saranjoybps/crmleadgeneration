from fastapi import APIRouter, Depends
from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_summary(ctx: RequestContext = Depends(require_module_permission("dashboard", "view"))):
    supabase = get_supabase_client(access_token=ctx.access_token)
    summary = DashboardService.get_summary(supabase, ctx)
    return response(summary)
