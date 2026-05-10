from typing import Any
import logging

from fastapi import APIRouter, Depends, HTTPException, Header
from postgrest.exceptions import APIError

from app.api.utils import response
from app.core.deps import RequestContext, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import UserCreate

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger("joycrm.user_create")


def _extract_auth_user_id(created_auth: Any) -> str | None:
    # supabase-py response shape can vary by version. Support object and dict forms.
    user_obj = getattr(created_auth, "user", None)
    if user_obj is not None:
        user_id = getattr(user_obj, "id", None)
        if user_id:
            return str(user_id)
        if isinstance(user_obj, dict) and user_obj.get("id"):
            return str(user_obj["id"])

    if isinstance(created_auth, dict):
        if isinstance(created_auth.get("user"), dict) and created_auth["user"].get("id"):
            return str(created_auth["user"]["id"])
        if created_auth.get("id"):
            return str(created_auth["id"])

    data_obj = getattr(created_auth, "data", None)
    if data_obj is not None:
        if isinstance(data_obj, dict):
            if isinstance(data_obj.get("user"), dict) and data_obj["user"].get("id"):
                return str(data_obj["user"]["id"])
            if data_obj.get("id"):
                return str(data_obj["id"])
        user_in_data = getattr(data_obj, "user", None)
        if user_in_data is not None:
            user_id = getattr(user_in_data, "id", None)
            if user_id:
                return str(user_id)

    return None


@router.get("")
def list_users(limit: int = 20, offset: int = 0, ctx: RequestContext = Depends(require_roles("owner", "admin", "member"))):
    supabase = get_supabase_client()
    data = (
        supabase.table("user_tenant_roles")
        .select("id,user_id,is_active,roles(key,label),users(id,email,full_name)")
        .eq("tenant_id", ctx.tenant_id)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return response(data.data or [], {"limit": limit, "offset": offset})


@router.post("")
def create_user(
    payload: UserCreate,
    ctx: RequestContext = Depends(require_roles("owner", "admin")),
    debug_id: str | None = Header(default=None, alias="X-Debug-Id"),
):
    dbg = debug_id or "no-debug-id"
    logger.info("[USER_CREATE][BE][%s][5] create_user start tenant=%s role=%s target_email=%s", dbg, ctx.tenant_id, ctx.role_key, payload.email)
    supabase = get_supabase_client()

    email = payload.email.strip().lower()
    try:
        existing = supabase.table("users").select("id").eq("email", email).maybe_single().execute()
    except APIError as exc:
        logger.exception("[USER_CREATE][BE][%s][6E] users lookup failed", dbg)
        raise HTTPException(status_code=500, detail=f"Users lookup failed: {exc.message}") from exc
    existing_data = getattr(existing, "data", None) if existing is not None else None
    logger.info("[USER_CREATE][BE][%s][6] existing_user=%s", dbg, bool(existing_data))
    if existing_data:
        raise HTTPException(status_code=409, detail="User already exists in users table")

    try:
        role = supabase.table("roles").select("id,key").eq("key", payload.role_key).maybe_single().execute()
    except APIError as exc:
        logger.exception("[USER_CREATE][BE][%s][7E] roles lookup failed", dbg)
        raise HTTPException(status_code=500, detail=f"Role lookup failed: {exc.message}") from exc
    role_data = getattr(role, "data", None) if role is not None else None
    logger.info("[USER_CREATE][BE][%s][7] role_lookup_found=%s role_key=%s", dbg, bool(role_data), payload.role_key)
    if not role_data:
        raise HTTPException(status_code=400, detail="Invalid role_key")

    try:
        logger.info("[USER_CREATE][BE][%s][8] creating auth user via admin API", dbg)
        created_auth = supabase.auth.admin.create_user(
            {
                "email": email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {"full_name": payload.full_name} if payload.full_name else {},
            }
        )
    except Exception as exc:
        logger.exception("[USER_CREATE][BE][%s][8E] auth.admin.create_user failed", dbg)
        raise HTTPException(status_code=400, detail=f"Unable to create auth user: {exc}") from exc

    auth_user_id = _extract_auth_user_id(created_auth)
    logger.info("[USER_CREATE][BE][%s][9] extracted_auth_user_id=%s", dbg, bool(auth_user_id))
    if not auth_user_id:
        raise HTTPException(status_code=500, detail="Auth user creation succeeded but no user id was returned")

    try:
        user = supabase.table("users").insert(
            {"auth_user_id": auth_user_id, "email": email, "full_name": payload.full_name}
        ).execute()
    except APIError as exc:
        logger.exception("[USER_CREATE][BE][%s][10E] users insert failed", dbg)
        raise HTTPException(status_code=500, detail=f"Users insert failed: {exc.message}") from exc
    user_data = getattr(user, "data", None) if user is not None else None
    user_row = (user_data or [None])[0]
    logger.info("[USER_CREATE][BE][%s][10] users_insert_success=%s", dbg, bool(user_row))
    if not user_row:
        raise HTTPException(status_code=500, detail="Failed to create app user record")

    try:
        supabase.table("user_tenant_roles").upsert(
            {
                "tenant_id": ctx.tenant_id,
                "user_id": user_row["id"],
                "role_id": role_data["id"],
                "is_active": True,
                "created_by": ctx.app_user_id,
            },
            on_conflict="tenant_id,user_id",
        ).execute()
    except APIError as exc:
        logger.exception("[USER_CREATE][BE][%s][11E] user_tenant_roles upsert failed", dbg)
        raise HTTPException(status_code=500, detail=f"Tenant role link failed: {exc.message}") from exc
    logger.info("[USER_CREATE][BE][%s][11] user_tenant_roles upsert completed", dbg)

    return response(user_row)
