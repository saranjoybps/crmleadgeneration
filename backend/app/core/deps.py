from dataclasses import dataclass
from typing import Any
import logging

from fastapi import Depends, Header, HTTPException
from supabase import Client

from app.core.auth import get_authenticated_access_token, get_authenticated_user_id
from app.core.supabase_client import get_supabase_client

logger = logging.getLogger("joycrm.auth_flow")


@dataclass
class RequestContext:
    auth_user_id: str
    app_user_id: str
    tenant_id: str
    tenant_slug: str
    tenant_name: str
    role_key: str
    access_token: str


def _extract_org_slug(x_org_slug: str | None = Header(default=None, alias="X-Org-Slug")) -> str | None:
    return x_org_slug.strip() if x_org_slug else None


def get_request_context(
    auth_user_id: str = Depends(get_authenticated_user_id),
    access_token: str = Depends(get_authenticated_access_token),
    org_slug: str | None = Depends(_extract_org_slug),
    debug_id: str | None = Header(default=None, alias="X-Debug-Id"),
) -> RequestContext:
    dbg = debug_id or "no-debug-id"
    logger.info("[USER_CREATE][BE][%s][1] get_request_context start org_slug=%s auth_user_id=%s token_len=%s", dbg, org_slug, auth_user_id, len(access_token))
    supabase: Client = get_supabase_client(access_token=access_token)
    logger.info("[USER_CREATE][BE][%s][2] supabase client created with user token context", dbg)
    app_user_resp = supabase.rpc("ensure_app_user").execute()
    logger.info("[USER_CREATE][BE][%s][3] ensure_app_user executed data_present=%s", dbg, app_user_resp.data is not None)
    if app_user_resp.data is None:
        raise HTTPException(status_code=500, detail="Failed to initialize app user")

    tenant_resp = supabase.rpc("ensure_user_tenant", {"p_tenant_slug": org_slug}).execute()
    rows: list[dict[str, Any]] = tenant_resp.data or []
    logger.info("[USER_CREATE][BE][%s][4] ensure_user_tenant rows=%s", dbg, len(rows))
    if not rows:
        raise HTTPException(status_code=403, detail="No tenant membership found")

    row = rows[0]
    return RequestContext(
        auth_user_id=auth_user_id,
        app_user_id=str(app_user_resp.data),
        tenant_id=str(row["tenant_id"]),
        tenant_slug=str(row["tenant_slug"]),
        tenant_name=str(row["tenant_name"]),
        role_key=str(row["role_key"]),
        access_token=access_token,
    )


def require_roles(*allowed_roles: str):
    def _guard(ctx: RequestContext = Depends(get_request_context)) -> RequestContext:
        if ctx.role_key not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return ctx

    return _guard


def require_module_permission(module_key: str, action: str):
    def _guard(ctx: RequestContext = Depends(get_request_context)) -> RequestContext:
        # Owner always has access
        if ctx.role_key == "owner":
            return ctx
        
        supabase: Client = get_supabase_client(access_token=ctx.access_token)
        has_perm = supabase.rpc(
            "has_module_permission",
            {"p_tenant_id": ctx.tenant_id, "p_module_key": module_key, "p_action": action}
        ).execute()
        if not has_perm.data:
            raise HTTPException(status_code=403, detail="Forbidden")
        return ctx

    return _guard
