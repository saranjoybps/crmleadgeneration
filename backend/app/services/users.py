import logging
from typing import Any

from fastapi import HTTPException
from postgrest.exceptions import APIError
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.common import UserCreate, UserUpdate

logger = logging.getLogger("joycrm.services.users")


class UserService:
    @staticmethod
    def _extract_auth_user_id(created_auth: Any) -> str | None:
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

    @staticmethod
    def list_users(supabase: Client, ctx: RequestContext, limit: int = 20, offset: int = 0):
        data = (
            supabase.table("user_tenant_roles")
            .select("id,user_id,is_active,roles(key,label),users!user_tenant_roles_user_id_fkey(id,email,full_name,avatar_url)")
            .eq("tenant_id", ctx.tenant_id)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return data.data or []

    @classmethod
    def create_user(cls, supabase: Client, payload: UserCreate, ctx: RequestContext, dbg: str = "no-debug-id"):
        logger.info("[USER_CREATE][SERVICE][%s] start tenant=%s role=%s target_email=%s", dbg, ctx.tenant_id, ctx.role_key, payload.email)

        email = payload.email.strip().lower()
        try:
            existing = supabase.table("users").select("id").eq("email", email).maybe_single().execute()
        except APIError as exc:
            logger.exception("[USER_CREATE][SERVICE][%s] users lookup failed", dbg)
            raise HTTPException(status_code=500, detail=f"Users lookup failed: {exc.message}") from exc
        
        if existing and existing.data:
            raise HTTPException(status_code=409, detail="User already exists in users table")

        try:
            role_rows = (
                supabase.table("roles")
                .select("id, tenant_id, key")
                .eq("key", payload.role_key)
                .execute()
                .data
                or []
            )
        except APIError as exc:
            logger.exception("[USER_CREATE][SERVICE][%s] roles lookup failed", dbg)
            raise HTTPException(status_code=500, detail=f"Role lookup failed: {exc.message}") from exc

        if not role_rows:
            raise HTTPException(status_code=400, detail="Invalid role_key")

        role_data = next((row for row in role_rows if str(row.get("tenant_id") or "") == ctx.tenant_id), None)
        if role_data is None:
            role_data = next((row for row in role_rows if row.get("tenant_id") is None), None) or role_rows[0]

        try:
            logger.info("[USER_CREATE][SERVICE][%s] creating auth user via admin API", dbg)
            user_metadata = {"full_name": payload.full_name} if payload.full_name else {}
            if payload.avatar_url:
                user_metadata["avatar_url"] = payload.avatar_url
                
            created_auth = supabase.auth.admin.create_user(
                {
                    "email": email,
                    "password": payload.password,
                    "email_confirm": True,
                    "user_metadata": user_metadata,
                }
            )
        except Exception as exc:
            logger.exception("[USER_CREATE][SERVICE][%s] auth.admin.create_user failed", dbg)
            raise HTTPException(status_code=400, detail=f"Unable to create auth user: {exc}") from exc

        auth_user_id = cls._extract_auth_user_id(created_auth)
        if not auth_user_id:
            raise HTTPException(status_code=500, detail="Auth user creation succeeded but no user id was returned")

        try:
            user = supabase.table("users").insert(
                {"auth_user_id": auth_user_id, "email": email, "full_name": payload.full_name, "avatar_url": payload.avatar_url}
            ).execute()
        except APIError as exc:
            logger.exception("[USER_CREATE][SERVICE][%s] users insert failed", dbg)
            raise HTTPException(status_code=500, detail=f"Users insert failed: {exc.message}") from exc
        
        user_row = (user.data or [None])[0]
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
            logger.exception("[USER_CREATE][SERVICE][%s] user_tenant_roles upsert failed", dbg)
            raise HTTPException(status_code=500, detail=f"Tenant role link failed: {exc.message}") from exc
        
        return user_row

    @classmethod
    def update_user(cls, supabase: Client, user_id: str, payload: UserUpdate, ctx: RequestContext):
        # 1. Verify user exists and belongs to the same tenant (RLS should handle this, but we'll do an extra check)
        check = supabase.table("user_tenant_roles").select("id, user_id, users!user_tenant_roles_user_id_fkey(auth_user_id)").eq("user_id", user_id).eq("tenant_id", ctx.tenant_id).maybe_single().execute()
        
        if not check or not check.data:
             raise HTTPException(status_code=404, detail="User not found in this organization")

        # Handle potential array return for joined users
        user_data = check.data.get("users")
        if isinstance(user_data, list) and len(user_data) > 0:
            user_data = user_data[0]
        
        if not user_data or not user_data.get("auth_user_id"):
             raise HTTPException(status_code=500, detail="Unable to resolve authentication ID for this user")

        auth_user_id = user_data["auth_user_id"]
        
        # 2. Update users table
        update_data = {}
        if payload.full_name is not None:
            update_data["full_name"] = payload.full_name
        if payload.avatar_url is not None:
            update_data["avatar_url"] = payload.avatar_url

        if not update_data:
            return {"id": user_id}

        try:
            res = supabase.table("users").update(update_data).eq("id", user_id).execute()
        except APIError as exc:
            raise HTTPException(status_code=500, detail=f"Failed to update user: {exc.message}") from exc

        # 3. Update auth metadata via admin API
        meta_update = {}
        if payload.full_name is not None:
            meta_update["full_name"] = payload.full_name
        if payload.avatar_url is not None:
            meta_update["avatar_url"] = payload.avatar_url

        if meta_update:
            try:
                supabase.auth.admin.update_user_by_id(
                    auth_user_id,
                    {"user_metadata": meta_update}
                )
            except Exception as exc:
                logger.warning("Auth metadata update failed for %s: %s", auth_user_id, exc)

        return (res.data or [None])[0]
