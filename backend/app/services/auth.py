from fastapi import HTTPException
from postgrest.exceptions import APIError
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.common import InviteCreate, RoleAssignment


class AuthService:
    @staticmethod
    def _resolve_role_id(supabase: Client, ctx: RequestContext, role_key: str) -> str:
        rows = (
            supabase.table("roles")
            .select("id, tenant_id, key")
            .eq("key", role_key)
            .execute()
            .data
            or []
        )

        if not rows:
            raise HTTPException(status_code=400, detail="Invalid role")

        # Prefer the role defined for this tenant, then fall back to a shared system role.
        tenant_role = next((row for row in rows if str(row.get("tenant_id") or "") == ctx.tenant_id), None)
        if tenant_role:
            return str(tenant_role["id"])

        system_role = next((row for row in rows if row.get("tenant_id") is None), None)
        if system_role:
            return str(system_role["id"])

        return str(rows[0]["id"])

    @staticmethod
    def invite_user(supabase: Client, payload: InviteCreate, ctx: RequestContext):
        role_id = AuthService._resolve_role_id(supabase, ctx, payload.role_key)

        rpc = supabase.rpc(
            "create_tenant_invite",
            {
                "p_tenant_id": ctx.tenant_id,
                "p_email": payload.email,
                "p_role_id": role_id,
            },
        ).execute()
        return rpc.data

    @staticmethod
    def assign_role(supabase: Client, payload: RoleAssignment, ctx: RequestContext):
        role_id = AuthService._resolve_role_id(supabase, ctx, payload.role_key)

        try:
            updated = (
                supabase.table("user_tenant_roles")
                .update({"role_id": role_id, "is_active": True})
                .eq("tenant_id", ctx.tenant_id)
                .eq("user_id", payload.user_id)
                .execute()
            )
        except APIError as exc:
            raise HTTPException(status_code=500, detail=f"Failed to update member role: {exc.message}") from exc

        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Member not found in this organization")
        return row
