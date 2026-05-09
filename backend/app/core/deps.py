from dataclasses import dataclass
from typing import Any

from fastapi import Depends, Header, HTTPException
from supabase import Client

from app.core.auth import get_authenticated_user_id
from app.core.supabase_client import get_supabase_client


@dataclass
class RequestContext:
    auth_user_id: str
    app_user_id: str
    tenant_id: str
    tenant_slug: str
    tenant_name: str
    role_key: str


def _extract_org_slug(x_org_slug: str | None = Header(default=None, alias="X-Org-Slug")) -> str | None:
    return x_org_slug.strip() if x_org_slug else None


def get_request_context(
    auth_user_id: str = Depends(get_authenticated_user_id),
    org_slug: str | None = Depends(_extract_org_slug),
    supabase: Client = Depends(get_supabase_client),
) -> RequestContext:
    app_user_resp = supabase.rpc("ensure_app_user").execute()
    if app_user_resp.data is None:
        raise HTTPException(status_code=500, detail="Failed to initialize app user")

    tenant_resp = supabase.rpc("ensure_user_tenant", {"p_tenant_slug": org_slug}).execute()
    rows: list[dict[str, Any]] = tenant_resp.data or []
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
    )


def require_roles(*allowed_roles: str):
    def _guard(ctx: RequestContext = Depends(get_request_context)) -> RequestContext:
        if ctx.role_key not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return ctx

    return _guard
