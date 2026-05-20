from fastapi import APIRouter, Depends, Header, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.vault import VaultCredentialCreate, VaultCredentialUpdate, VaultShareUpdate
from app.services.vault import VaultService

router = APIRouter(prefix="/vault", tags=["vault"])


@router.get("")
def list_credentials(
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
    status: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("vault", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = VaultService.list_credentials(supabase, ctx, q=q, category=category, status=status, tag=tag)
    return response(data)


@router.get("/{credential_id}")
def get_credential(
    credential_id: str,
    reveal_password: bool = Header(default=False, alias="X-Reveal-Password"),
    ctx: RequestContext = Depends(require_module_permission("vault", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = VaultService.get_credential(supabase, credential_id, ctx, reveal_password=reveal_password)
    return response(data)


@router.post("")
def create_credential(
    payload: VaultCredentialCreate,
    ctx: RequestContext = Depends(require_module_permission("vault", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = VaultService.create_credential(supabase, payload, ctx)
    return response(data)


@router.patch("/{credential_id}")
def update_credential(
    credential_id: str,
    payload: VaultCredentialUpdate,
    ctx: RequestContext = Depends(require_module_permission("vault", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = VaultService.update_credential(supabase, credential_id, payload, ctx)
    return response(data)


@router.delete("/{credential_id}")
def delete_credential(
    credential_id: str,
    ctx: RequestContext = Depends(require_module_permission("vault", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = VaultService.delete_credential(supabase, credential_id, ctx)
    return response(data)


@router.get("/{credential_id}/shares")
def list_shares(
    credential_id: str,
    ctx: RequestContext = Depends(require_module_permission("vault", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = VaultService.list_shares(supabase, credential_id, ctx)
    return response(data)


@router.post("/{credential_id}/shares")
def update_share(
    credential_id: str,
    payload: VaultShareUpdate,
    ctx: RequestContext = Depends(require_module_permission("vault", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = VaultService.upsert_share(supabase, credential_id, payload, ctx)
    return response(data)
