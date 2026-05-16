from fastapi import APIRouter, Depends
import logging

from app.api.utils import response
from app.core.deps import RequestContext, get_request_context, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import InviteCreate, RoleAssignment
from app.services.auth import AuthService
from app.services.rbac import RBACService

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("joycrm.auth")


@router.post("/signup")
def signup(ctx: RequestContext = Depends(get_request_context)):
    return response({"tenant": {"id": ctx.tenant_id, "slug": ctx.tenant_slug, "name": ctx.tenant_name}, "role": ctx.role_key})


@router.post("/login")
def login_bridge(ctx: RequestContext = Depends(get_request_context)):
    return response({"user_id": ctx.app_user_id, "tenant_slug": ctx.tenant_slug, "role": ctx.role_key})


@router.get("/permissions")
def get_user_permissions(ctx: RequestContext = Depends(get_request_context)):
    supabase = get_supabase_client(access_token=ctx.access_token)
    permissions = RBACService.get_current_user_permissions(supabase, ctx)
    dashboard_perm = next(
        (m.get("permissions") for m in permissions.get("modules", []) if m.get("key") == "dashboard"),
        None,
    )
    logger.info(
        "[AUTH][PERMS] tenant_slug=%s tenant_id=%s app_user_id=%s role=%s dashboard_perm=%s modules_returned=%s",
        ctx.tenant_slug,
        ctx.tenant_id,
        ctx.app_user_id,
        permissions.get("role", {}).get("key"),
        dashboard_perm,
        len(permissions.get("modules", [])),
    )
    return response(permissions)


@router.get("/department")
def get_user_department(ctx: RequestContext = Depends(get_request_context)):
    return response({
        "department_id": ctx.department_id,
        "department_name": ctx.department_name
    })


@router.post("/invite")
def invite_user(payload: InviteCreate, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = AuthService.invite_user(supabase, payload, ctx)
    return response(data)


@router.post("/assign-role")
def assign_role(payload: RoleAssignment, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = AuthService.assign_role(supabase, payload, ctx)
    return response(data)
