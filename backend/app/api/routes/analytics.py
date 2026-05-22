from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
def get_overview(
    months: int = Query(default=12, ge=1, le=24),
    ctx: RequestContext = Depends(require_module_permission("analytics", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = AnalyticsService.overview(supabase, ctx, months)
    return response(data)
