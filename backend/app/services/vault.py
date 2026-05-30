import base64
import hashlib
from fastapi import HTTPException
from cryptography.fernet import Fernet, InvalidToken
from supabase import Client

from app.core.config import get_settings
from app.core.deps import RequestContext


def _build_fernet() -> Fernet:
    key = get_settings().vault_encryption_key.strip()
    if not key:
        raise HTTPException(status_code=500, detail="VAULT_ENCRYPTION_KEY is not configured")
    try:
        return Fernet(key.encode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Invalid VAULT_ENCRYPTION_KEY format") from exc


class VaultService:
    @staticmethod
    def _encrypt_password(password: str) -> str:
        return _build_fernet().encrypt(password.encode("utf-8")).decode("utf-8")

    @staticmethod
    def _decrypt_password(ciphertext: str) -> str:
        try:
            return _build_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
        except InvalidToken as exc:
            raise HTTPException(status_code=500, detail="Failed to decrypt credential password") from exc

    @staticmethod
    def _password_fingerprint(password: str) -> str:
        digest = hashlib.sha256(password.encode("utf-8")).digest()
        return base64.b64encode(digest).decode("utf-8")

    @staticmethod
    def _can_view_credential(supabase: Client, credential_id: str, ctx: RequestContext) -> bool:
        own = (
            supabase.table("vault_credentials")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", credential_id)
            .eq("created_by", ctx.app_user_id)
            .maybe_single()
            .execute()
        )
        if own.data:
            return True
        share = (
            supabase.table("vault_credential_shares")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("credential_id", credential_id)
            .eq("user_id", ctx.app_user_id)
            .eq("access", "grant")
            .maybe_single()
            .execute()
        )
        return bool(share.data)

    @staticmethod
    def list_credentials(
        supabase: Client,
        ctx: RequestContext,
        q: str | None = None,
        category: str | None = None,
        status: str | None = None,
        tag: str | None = None,
    ):
        query = (
            supabase.table("vault_credentials")
            .select("*, creator:users!vault_credentials_created_by_fkey(id,email,full_name)")
            .eq("tenant_id", ctx.tenant_id)
        )

        # Non-owner users only see own + shared credentials.
        # Filter at DB level to avoid leaking total credential count.
        if ctx.role_key != "owner":
            shared_ids = [
                s["credential_id"]
                for s in (
                    supabase.table("vault_credential_shares")
                    .select("credential_id")
                    .eq("tenant_id", ctx.tenant_id)
                    .eq("user_id", ctx.app_user_id)
                    .eq("access", "grant")
                    .execute()
                    .data
                    or []
                )
            ]
            if shared_ids:
                query = query.or_(f"created_by.eq.{ctx.app_user_id},id.in.{','.join(shared_ids)}")
            else:
                query = query.eq("created_by", ctx.app_user_id)

        if q:
            escaped_q = q.replace("%", "\\%").replace("_", "\\_")
            query = query.or_(f"label.ilike.%{escaped_q}%,username.ilike.%{escaped_q}%,email_id.ilike.%{escaped_q}%,login_url.ilike.%{escaped_q}%")
        if category:
            query = query.eq("category", category)
        if status:
            query = query.eq("status", status)
        if tag:
            query = query.contains("tags", [tag])
        query = query.order("updated_at", desc=True)
        rows = query.execute().data or []

        for row in rows:
            row["password_masked"] = "********"
            row.pop("password_encrypted", None)
            row.pop("password_fingerprint", None)
        return rows

    @staticmethod
    def get_credential(supabase: Client, credential_id: str, ctx: RequestContext, reveal_password: bool = False):
        row = (
            supabase.table("vault_credentials")
            .select("*, creator:users!vault_credentials_created_by_fkey(id,email,full_name)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", credential_id)
            .maybe_single()
            .execute()
        ).data
        if not row:
            raise HTTPException(status_code=404, detail="Credential not found")
        if ctx.role_key != "owner" and not VaultService._can_view_credential(supabase, credential_id, ctx):
            raise HTTPException(status_code=403, detail="Forbidden")

        row["password_masked"] = "********"
        row["password"] = VaultService._decrypt_password(row["password_encrypted"]) if reveal_password else None
        row.pop("password_encrypted", None)
        row.pop("password_fingerprint", None)
        return row

    @staticmethod
    def create_credential(supabase: Client, payload, ctx: RequestContext):
        encrypted = VaultService._encrypt_password(payload.password)
        created = (
            supabase.table("vault_credentials")
            .insert(
                {
                    "tenant_id": ctx.tenant_id,
                    "label": payload.label,
                    "username": payload.username,
                    "email_id": payload.email_id,
                    "password_encrypted": encrypted,
                    "password_fingerprint": VaultService._password_fingerprint(payload.password),
                    "notes": payload.notes,
                    "login_url": payload.login_url,
                    "category": payload.category,
                    "tags": payload.tags,
                    "status": payload.status,
                    "created_by": ctx.app_user_id,
                }
            )
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create credential")
        row["password_masked"] = "********"
        row.pop("password_encrypted", None)
        row.pop("password_fingerprint", None)
        return row

    @staticmethod
    def update_credential(supabase: Client, credential_id: str, payload, ctx: RequestContext):
        existing = (
            supabase.table("vault_credentials")
            .select("id,created_by")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", credential_id)
            .maybe_single()
            .execute()
        ).data
        if not existing:
            raise HTTPException(status_code=404, detail="Credential not found")
        if ctx.role_key != "owner" and str(existing.get("created_by")) != str(ctx.app_user_id):
            raise HTTPException(status_code=403, detail="Only creator or owner can update credential")

        update_data = payload.model_dump(exclude_unset=True)
        if "password" in update_data:
            raw_password = update_data.pop("password")
            update_data["password_encrypted"] = VaultService._encrypt_password(raw_password)
            update_data["password_fingerprint"] = VaultService._password_fingerprint(raw_password)

        updated = (
            supabase.table("vault_credentials")
            .update(update_data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", credential_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Credential not found")
        row["password_masked"] = "********"
        row.pop("password_encrypted", None)
        row.pop("password_fingerprint", None)
        return row

    @staticmethod
    def delete_credential(supabase: Client, credential_id: str, ctx: RequestContext):
        existing = (
            supabase.table("vault_credentials")
            .select("id,created_by")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", credential_id)
            .maybe_single()
            .execute()
        ).data
        if not existing:
            raise HTTPException(status_code=404, detail="Credential not found")
        if ctx.role_key != "owner" and str(existing.get("created_by")) != str(ctx.app_user_id):
            raise HTTPException(status_code=403, detail="Only creator or owner can delete credential")
        deleted = (
            supabase.table("vault_credentials")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", credential_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Credential not found")
        return row

    @staticmethod
    def list_shares(supabase: Client, credential_id: str, ctx: RequestContext):
        credential = (
            supabase.table("vault_credentials")
            .select("id,created_by")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", credential_id)
            .maybe_single()
            .execute()
        ).data
        if not credential:
            raise HTTPException(status_code=404, detail="Credential not found")
        if ctx.role_key != "owner" and str(credential.get("created_by")) != str(ctx.app_user_id):
            raise HTTPException(status_code=403, detail="Only creator or owner can view sharing")

        rows = (
            supabase.table("vault_credential_shares")
            .select("user_id,access,user:users!vault_credential_shares_user_id_fkey(id,email,full_name)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("credential_id", credential_id)
            .execute()
        ).data or []
        return rows

    @staticmethod
    def upsert_share(supabase: Client, credential_id: str, payload, ctx: RequestContext):
        credential = (
            supabase.table("vault_credentials")
            .select("id,created_by")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", credential_id)
            .maybe_single()
            .execute()
        ).data
        if not credential:
            raise HTTPException(status_code=404, detail="Credential not found")
        if ctx.role_key != "owner" and str(credential.get("created_by")) != str(ctx.app_user_id):
            raise HTTPException(status_code=403, detail="Only creator or owner can share credential")

        share = (
            supabase.table("vault_credential_shares")
            .upsert(
                {
                    "tenant_id": ctx.tenant_id,
                    "credential_id": credential_id,
                    "user_id": payload.user_id,
                    "access": payload.access,
                    "updated_by": ctx.app_user_id,
                },
                on_conflict="credential_id,user_id",
            )
            .execute()
        )
        row = (share.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to update share")
        return row
