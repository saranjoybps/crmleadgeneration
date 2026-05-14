from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.common import InviteCreate, RoleAssignment


class AuthService:
    @staticmethod
    def invite_user(supabase: Client, payload: InviteCreate, ctx: RequestContext):
        role_resp = supabase.table("roles").select("id").eq("key", payload.role_key).eq("tenant_id", ctx.tenant_id).maybe_single().execute()
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
        return rpc.data

    @staticmethod
    def assign_role(supabase: Client, payload: RoleAssignment, ctx: RequestContext):
        role_resp = supabase.table("roles").select("id").eq("key", payload.role_key).eq("tenant_id", ctx.tenant_id).maybe_single().execute()
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
        return (updated.data or [None])[0]
