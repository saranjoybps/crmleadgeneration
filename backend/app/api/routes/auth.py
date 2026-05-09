from fastapi import APIRouter, Depends, HTTPException

from app.api.utils import response
from app.core.deps import RequestContext, get_request_context, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import InviteCreate, RoleAssignment

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
    role_resp = supabase.table("roles").select("id").eq("key", payload.role_key).maybe_single().execute()
    role = role_resp.data
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")

    rpc = supabase.rpc(
        "create_tenant_invite",
        {
            "p_tenant_id": ctx.tenant_id,
            "p_email": payload.email,
            "p_role_id": role["id"],
        },
    ).execute()
    return response(rpc.data)


@router.post("/assign-role")
def assign_role(payload: RoleAssignment, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    role_resp = supabase.table("roles").select("id").eq("key", payload.role_key).maybe_single().execute()
    role = role_resp.data
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")

    updated = (
        supabase.table("user_tenant_roles")
        .update({"role_id": role["id"], "is_active": True})
        .eq("tenant_id", ctx.tenant_id)
        .eq("user_id", payload.user_id)
        .execute()
    )
    return response((updated.data or [None])[0])
