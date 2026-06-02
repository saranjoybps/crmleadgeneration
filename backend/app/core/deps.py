from dataclasses import dataclass
from typing import Any
import json
import logging

from fastapi import Depends, Header, HTTPException
from supabase import Client

from app.core.auth import get_authenticated_access_token, get_authenticated_user_id
from app.core.cache import _get_client, cache_key
from app.core.supabase_client import get_supabase_client

logger = logging.getLogger("joyerp.auth_flow")


@dataclass
class RequestContext:
    auth_user_id: str
    app_user_id: str
    tenant_id: str
    tenant_slug: str
    tenant_name: str
    role_key: str
    access_token: str
    department_id: str | None = None
    department_name: str | None = None


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
        department_id=str(row["department_id"]) if row.get("department_id") else None,
        department_name=str(row["department_name"]) if row.get("department_name") else None,
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

        # Check Redis cache for permission
        cache_client = _get_client()
        ck = cache_key("joy", "perm", ctx.tenant_id, ctx.app_user_id, module_key, action)
        if cache_client is not None:
            cached = cache_client.get(ck)
            if cached == "true":
                return ctx
            if cached == "false":
                raise HTTPException(status_code=403, detail="Forbidden")

        supabase: Client = get_supabase_client(access_token=ctx.access_token)
        has_perm = supabase.rpc(
            "has_module_permission",
            {"p_tenant_id": ctx.tenant_id, "p_module_key": module_key, "p_action": action}
        ).execute()
        result = bool(has_perm.data)
        if cache_client is not None:
            cache_client.set(ck, "true" if result else "false", ttl=300)
        if not result:
            raise HTTPException(status_code=403, detail="Forbidden")
        return ctx

    return _guard


def require_any_module_permission(module_keys: list[str], action: str):
    def _guard(ctx: RequestContext = Depends(get_request_context)) -> RequestContext:
        # Owner always has access
        if ctx.role_key == "owner":
            return ctx

        cache_client = _get_client()
        supabase: Client = get_supabase_client(access_token=ctx.access_token)

        for module_key in module_keys:
            # Check Redis cache per module
            ck = cache_key("joy", "perm", ctx.tenant_id, ctx.app_user_id, module_key, action)
            if cache_client is not None:
                cached = cache_client.get(ck)
                if cached == "true":
                    return ctx
                if cached == "false":
                    continue

            has_perm = supabase.rpc(
                "has_module_permission",
                {"p_tenant_id": ctx.tenant_id, "p_module_key": module_key, "p_action": action}
            ).execute()
            result = bool(has_perm.data)
            if cache_client is not None:
                cache_client.set(ck, "true" if result else "false", ttl=300)

            if result:
                return ctx

        raise HTTPException(status_code=403, detail="Forbidden")

    return _guard


def require_users_or_departments_view():
    def _guard(ctx: RequestContext = Depends(get_request_context)) -> RequestContext:
        # Owner always has access
        if ctx.role_key == "owner":
            return ctx
        
        supabase: Client = get_supabase_client(access_token=ctx.access_token)
        
        # Check if user has users view permission
        has_users_perm = supabase.rpc(
            "has_module_permission",
            {"p_tenant_id": ctx.tenant_id, "p_module_key": "users", "p_action": "view"}
        ).execute()
        
        # Check if user has departments view permission
        has_depts_perm = supabase.rpc(
            "has_module_permission",
            {"p_tenant_id": ctx.tenant_id, "p_module_key": "departments", "p_action": "view"}
        ).execute()
        
        if not has_users_perm.data and not has_depts_perm.data:
            raise HTTPException(status_code=403, detail="Forbidden")
        return ctx

    return _guard
