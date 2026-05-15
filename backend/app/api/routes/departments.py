from fastapi import APIRouter, Depends, HTTPException

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.departments import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentRoleCreate,
    UserDepartmentRoleUpdate,
)
from app.services.departments import DepartmentService
from app.services.dept_rbac import DepartmentRBACService

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("")
def list_departments(limit: int = 100, offset: int = 0, ctx: RequestContext = Depends(require_module_permission("departments", "view"))):
    """List all departments in the tenant."""
    supabase = get_supabase_client()
    departments = DepartmentService.list_departments(supabase, ctx, limit=limit, offset=offset)
    return response(departments, {"limit": limit, "offset": offset})


@router.post("")
def create_department(payload: DepartmentCreate, ctx: RequestContext = Depends(require_module_permission("departments", "create"))):
    """Create a new department."""
    supabase = get_supabase_client()
    try:
        dept = DepartmentService.create_department(supabase, ctx, payload.name, payload.description, payload.slug)
        return response(dept)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{dept_id}")
def get_department(dept_id: str, ctx: RequestContext = Depends(require_module_permission("departments", "view"))):
    """Get a specific department."""
    supabase = get_supabase_client()
    dept = DepartmentService.get_department(supabase, ctx, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return response(dept)


@router.get("/{dept_id}/details")
def get_department_with_members(dept_id: str, ctx: RequestContext = Depends(require_module_permission("departments", "view"))):
    """Get department with members."""
    supabase = get_supabase_client()
    dept = DepartmentService.get_department_with_members(supabase, ctx, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return response(dept)


@router.put("/{dept_id}")
def update_department(dept_id: str, payload: DepartmentUpdate, ctx: RequestContext = Depends(require_module_permission("departments", "edit"))):
    """Update department details."""
    supabase = get_supabase_client()
    try:
        dept = DepartmentService.update_department(supabase, ctx, dept_id, payload.name, payload.description, payload.slug)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        return response(dept)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{dept_id}")
def delete_department(dept_id: str, ctx: RequestContext = Depends(require_module_permission("departments", "delete"))):
    """Delete a department."""
    supabase = get_supabase_client()
    try:
        success = DepartmentService.delete_department(supabase, ctx, dept_id)
        if not success:
            raise HTTPException(status_code=404, detail="Department not found")
        return response({"deleted": True})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{dept_id}/members")
def list_department_members(dept_id: str, limit: int = 100, offset: int = 0, ctx: RequestContext = Depends(require_module_permission("departments", "view"))):
    """List members of a department."""
    supabase = get_supabase_client()
    members = DepartmentService.list_department_members(supabase, ctx, dept_id, limit=limit, offset=offset)
    return response(members, {"limit": limit, "offset": offset})


@router.post("/{dept_id}/members")
def add_user_to_department(dept_id: str, user_id: str, department_role_key: str = "member", 
                          ctx: RequestContext = Depends(require_module_permission("departments", "edit"))):
    """Add a user to a department."""
    supabase = get_supabase_client()
    try:
        result = DepartmentService.add_user_to_department(supabase, ctx, user_id, dept_id, department_role_key)
        return response(result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{dept_id}/members/{user_id}")
def remove_user_from_department(dept_id: str, user_id: str, ctx: RequestContext = Depends(require_module_permission("departments", "edit"))):
    """Remove a user from a department."""
    supabase = get_supabase_client()
    try:
        success = DepartmentService.remove_user_from_department(supabase, ctx, user_id, dept_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found in department")
        return response({"removed": True})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{dept_id}/members/{user_id}/role")
def update_user_department_role(dept_id: str, user_id: str, payload: UserDepartmentRoleUpdate,
                               ctx: RequestContext = Depends(require_module_permission("departments", "edit"))):
    """Update a user's role within a department."""
    supabase = get_supabase_client()
    try:
        result = DepartmentService.update_user_department_role(supabase, ctx, user_id, dept_id, payload.department_role_key)
        return response(result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Department Roles Routes
@router.get("/roles/list")
def list_department_roles(ctx: RequestContext = Depends(require_module_permission("departments", "view"))):
    """List all department roles in the tenant."""
    supabase = get_supabase_client()
    roles = DepartmentRBACService.list_department_roles(supabase, ctx)
    return response(roles)


@router.post("/roles/create")
def create_department_role(payload: DepartmentRoleCreate, ctx: RequestContext = Depends(require_module_permission("departments", "edit"))):
    """Create a new department role."""
    supabase = get_supabase_client()
    try:
        role = DepartmentRBACService.create_department_role(supabase, ctx, payload.key, payload.label)
        return response(role)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/roles/{role_id}")
def get_department_role(role_id: str, ctx: RequestContext = Depends(require_module_permission("departments", "view"))):
    """Get a specific department role."""
    supabase = get_supabase_client()
    role = DepartmentRBACService.get_department_role(supabase, ctx, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Department role not found")
    return response(role)


@router.get("/roles/{role_id}/permissions")
def get_role_permissions(role_id: str, ctx: RequestContext = Depends(require_module_permission("departments", "view"))):
    """Get all permissions for a department role."""
    supabase = get_supabase_client()
    permissions = DepartmentRBACService.get_all_department_role_permissions_matrix(supabase, ctx, role_id)
    return response(permissions)


@router.put("/roles/{role_id}/permissions")
def update_role_permissions(role_id: str, module_id: str, can_view: bool = False, 
                           can_create: bool = False, can_edit: bool = False, 
                           can_delete: bool = False,
                           ctx: RequestContext = Depends(require_module_permission("departments", "edit"))):
    """Update permissions for a department role-module pair."""
    supabase = get_supabase_client()
    try:
        result = DepartmentRBACService.update_department_permission(supabase, ctx, role_id, module_id, can_view, can_create, can_edit, can_delete)
        return response(result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
