from fastapi import APIRouter, Body, Depends, HTTPException

from app.api.utils import response
from app.core.deps import RequestContext, require_any_module_permission, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.departments import DepartmentCreate, DepartmentUpdate
from app.services.departments import DepartmentService

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("")
def list_departments(
    limit: int = 100,
    offset: int = 0,
    ctx: RequestContext = Depends(
        require_any_module_permission(["settings", "projects", "tickets", "tasks", "roadmap", "users"], "view")
    ),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    departments = DepartmentService.list_departments(supabase, ctx, limit=limit, offset=offset)
    return response(departments, {"limit": limit, "offset": offset})


@router.post("")
def create_department(payload: DepartmentCreate, ctx: RequestContext = Depends(require_module_permission("settings", "edit"))):
    supabase = get_supabase_client(access_token=ctx.access_token)
    try:
        dept = DepartmentService.create_department(supabase, ctx, payload.name, payload.description, payload.slug)
        return response(dept)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{dept_id}")
def get_department(
    dept_id: str,
    ctx: RequestContext = Depends(
        require_any_module_permission(["settings", "projects", "tickets", "tasks", "roadmap", "users"], "view")
    ),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    dept = DepartmentService.get_department(supabase, ctx, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return response(dept)


@router.get("/{dept_id}/details")
def get_department_with_members(
    dept_id: str,
    ctx: RequestContext = Depends(
        require_any_module_permission(["settings", "projects", "tickets", "tasks", "roadmap", "users"], "view")
    ),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    dept = DepartmentService.get_department_with_members(supabase, ctx, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return response(dept)


@router.put("/{dept_id}")
def update_department(dept_id: str, payload: DepartmentUpdate, ctx: RequestContext = Depends(require_module_permission("settings", "edit"))):
    supabase = get_supabase_client(access_token=ctx.access_token)
    try:
        dept = DepartmentService.update_department(supabase, ctx, dept_id, payload.name, payload.description, payload.slug)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        return response(dept)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{dept_id}")
def delete_department(dept_id: str, ctx: RequestContext = Depends(require_module_permission("settings", "edit"))):
    supabase = get_supabase_client(access_token=ctx.access_token)
    try:
        success = DepartmentService.delete_department(supabase, ctx, dept_id)
        if not success:
            raise HTTPException(status_code=404, detail="Department not found")
        return response({"deleted": True})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{dept_id}/members")
def list_department_members(
    dept_id: str,
    limit: int = 100,
    offset: int = 0,
    ctx: RequestContext = Depends(
        require_any_module_permission(["settings", "projects", "tickets", "tasks", "roadmap", "users"], "view")
    ),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    members = DepartmentService.list_department_members(supabase, ctx, dept_id, limit=limit, offset=offset)
    return response(members, {"limit": limit, "offset": offset})


@router.post("/{dept_id}/members")
def add_user_to_department(
    dept_id: str,
    user_id: str = Body(embed=True),
    ctx: RequestContext = Depends(require_module_permission("settings", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    try:
        result = DepartmentService.add_user_to_department(supabase, ctx, user_id, dept_id)
        return response(result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{dept_id}/members/{user_id}")
def remove_user_from_department(dept_id: str, user_id: str, ctx: RequestContext = Depends(require_module_permission("settings", "edit"))):
    supabase = get_supabase_client(access_token=ctx.access_token)
    try:
        success = DepartmentService.remove_user_from_department(supabase, ctx, user_id, dept_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found in department")
        return response({"removed": True})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
