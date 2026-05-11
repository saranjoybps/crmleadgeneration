from fastapi import APIRouter, Depends

from app.api.utils import response
from app.core.deps import RequestContext, get_request_context, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import InviteCreate, RoleAssignment
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup")
def signup(ctx: RequestContext = Depends(get_request_context)):
    return response({"tenant": {"id": ctx.tenant_id, "slug": ctx.tenant_slug, "name": ctx.tenant_name}, "role": ctx.role_key})


@router.post("/login")
def login_bridge(ctx: RequestContext = Depends(get_request_context)):
    return response({"user_id": ctx.app_user_id, "tenant_slug": ctx.tenant_slug, "role": ctx.role_key})


@router.post("/invite")
def invite_user(payload: InviteCreate, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    data = AuthService.invite_user(supabase, payload, ctx)
    return response(data)


@router.post("/assign-role")
def assign_role(payload: RoleAssignment, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    data = AuthService.assign_role(supabase, payload, ctx)
    return response(data)
