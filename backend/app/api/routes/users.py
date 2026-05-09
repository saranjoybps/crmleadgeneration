from fastapi import APIRouter, Depends, HTTPException

from app.api.utils import response
from app.core.deps import RequestContext, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import UserCreate

router = APIRouter(prefix="/users", tags=["users"])


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
def create_user(payload: UserCreate, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()

    existing = supabase.table("users").select("id").eq("email", payload.email).maybe_single().execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="User already exists")

    user = supabase.table("users").insert(payload.model_dump(exclude_none=True) | {"auth_user_id": ctx.auth_user_id}).execute()
    user_row = (user.data or [None])[0]
    if user_row:
        role = supabase.table("roles").select("id").eq("key", "member").maybe_single().execute()
        if role.data:
            supabase.table("user_tenant_roles").insert({
                "tenant_id": ctx.tenant_id,
                "user_id": user_row["id"],
                "role_id": role.data["id"],
            }).execute()

    return response(user_row)
