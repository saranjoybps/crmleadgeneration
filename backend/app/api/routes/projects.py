from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.common import ProjectCreate, ProjectMemberCreate, ProjectUpdate
from app.services.projects import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects(
    department_id: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("projects", "view")),
):
    supabase = get_supabase_client()
    projects = ProjectService.list_projects(supabase, ctx, department_id=department_id)
    return response(projects)


@router.get("/{project_id}")
def get_project(project_id: str, ctx: RequestContext = Depends(require_module_permission("projects", "view"))):
    supabase = get_supabase_client()
    project = ProjectService.get_project(supabase, project_id, ctx)
    return response(project)


@router.post("")
def create_project(payload: ProjectCreate, ctx: RequestContext = Depends(require_module_permission("projects", "create"))):
    supabase = get_supabase_client()
    project = ProjectService.create_project(supabase, payload, ctx)
    return response(project)


@router.patch("/{project_id}")
def update_project(project_id: str, payload: ProjectUpdate, ctx: RequestContext = Depends(require_module_permission("projects", "edit"))):
    supabase = get_supabase_client()
    project = ProjectService.update_project(supabase, project_id, payload, ctx)
    return response(project)


@router.delete("/{project_id}")
def delete_project(project_id: str, ctx: RequestContext = Depends(require_module_permission("projects", "delete"))):
    supabase = get_supabase_client()
    project = ProjectService.delete_project(supabase, project_id, ctx)
    return response(project)


@router.post("/{project_id}/members")
def add_project_member(project_id: str, payload: ProjectMemberCreate, ctx: RequestContext = Depends(require_module_permission("projects", "edit"))):
    supabase = get_supabase_client()
    member = ProjectService.add_project_member(supabase, project_id, payload, ctx)
    return response(member)


@router.get("/{project_id}/members")
def list_project_members(project_id: str, ctx: RequestContext = Depends(require_module_permission("projects", "view"))):
    supabase = get_supabase_client()
    members = ProjectService.list_project_members(supabase, project_id, ctx)
    return response(members)


@router.delete("/{project_id}/members/{user_id}")
def remove_project_member(project_id: str, user_id: str, ctx: RequestContext = Depends(require_module_permission("projects", "edit"))):
    supabase = get_supabase_client()
    member = ProjectService.remove_project_member(supabase, project_id, user_id, ctx)
    return response(member)
