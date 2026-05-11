from fastapi import APIRouter, Depends

from app.api.utils import response
from app.core.deps import RequestContext, get_request_context, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import WorkspaceUpdate
from app.services.workspace import WorkspaceService

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.get("/me")
def workspace_me(ctx: RequestContext = Depends(get_request_context)):
    data = WorkspaceService.get_workspace_me(ctx)
    return response(data)


@router.patch("")
def update_workspace(payload: WorkspaceUpdate, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    data = WorkspaceService.update_workspace(supabase, payload, ctx)
    return response(data)
