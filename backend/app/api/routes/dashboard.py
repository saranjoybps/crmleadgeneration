from fastapi import APIRouter, Depends
from app.api.utils import response
from app.core.deps import RequestContext, get_request_context
from app.core.supabase_client import get_supabase_client
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_summary(ctx: RequestContext = Depends(get_request_context)):
    supabase = get_supabase_client()
    summary = DashboardService.get_summary(supabase, ctx)
    return response(summary)
