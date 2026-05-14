from fastapi import APIRouter, Depends, HTTPException

from app.api.utils import response
from app.core.deps import RequestContext, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.rbac import RoleCreate, RoleUpdate, ModuleCreate, PermissionUpdate
from app.services.rbac import RBACService

router = APIRouter(prefix="/rbac", tags=["rbac"])


@router.get("/roles")
def list_roles(ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    roles = RBACService.list_roles(supabase, ctx)
    return response(roles)


@router.post("/roles")
def create_role(
    payload: RoleCreate,
    ctx: RequestContext = Depends(require_roles("owner", "admin")),
):
    supabase = get_supabase_client()
    role = RBACService.create_role(supabase, payload, ctx)
    return response(role)


@router.patch("/roles/{role_id}")
def update_role(
    role_id: str,
    payload: RoleUpdate,
    ctx: RequestContext = Depends(require_roles("owner", "admin")),
):
    supabase = get_supabase_client()
    role = RBACService.update_role(supabase, role_id, payload, ctx)
    return response(role)


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: str,
    ctx: RequestContext = Depends(require_roles("owner", "admin")),
):
    supabase = get_supabase_client()
    result = RBACService.delete_role(supabase, role_id, ctx)
    return response(result)


@router.get("/modules")
def list_modules(ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    modules = RBACService.list_modules(supabase)
    return response(modules)


@router.post("/modules")
def create_module(
    payload: ModuleCreate,
    ctx: RequestContext = Depends(require_roles("owner", "admin")),
):
    supabase = get_supabase_client()
    module = RBACService.create_module(supabase, payload)
    return response(module)


@router.delete("/modules/{module_id}")
def delete_module(
    module_id: str,
    ctx: RequestContext = Depends(require_roles("owner", "admin")),
):
    supabase = get_supabase_client()
    result = RBACService.delete_module(supabase, module_id)
    return response(result)


@router.get("/permissions")
def get_permissions(ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    permissions = RBACService.get_role_permissions(supabase, ctx)
    return response(permissions)


@router.put("/permissions")
def update_permissions(
    payload: PermissionUpdate,
    ctx: RequestContext = Depends(require_roles("owner", "admin")),
):
    supabase = get_supabase_client()
    result = RBACService.update_permissions(supabase, payload, ctx)
    return response(result)