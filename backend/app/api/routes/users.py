from fastapi import APIRouter, Depends, Header

from app.api.utils import response
from app.core.deps import RequestContext, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import UserCreate, UserUpdate
from app.services.users import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def list_users(limit: int = 20, offset: int = 0, ctx: RequestContext = Depends(require_roles("owner", "admin", "member"))):
    supabase = get_supabase_client()
    users = UserService.list_users(supabase, ctx, limit=limit, offset=offset)
    return response(users, {"limit": limit, "offset": offset})


@router.post("")
def create_user(
    payload: UserCreate,
    ctx: RequestContext = Depends(require_roles("owner", "admin")),
    debug_id: str | None = Header(default=None, alias="X-Debug-Id"),
):
    dbg = debug_id or "no-debug-id"
    supabase = get_supabase_client()
    user = UserService.create_user(supabase, payload, ctx, dbg=dbg)
    return response(user)
