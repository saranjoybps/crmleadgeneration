from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import TaskAssigneesUpdate, TaskCreate, TaskUpdate
from app.services.tasks import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("")
def list_tasks(
    project_id: str | None = Query(default=None),
    ticket_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    assigned_to_me: bool = Query(default=False),
    ctx: RequestContext = Depends(require_roles("owner", "admin", "member", "client")),
):
    supabase = get_supabase_client()
    tasks = TaskService.list_tasks(
        supabase,
        ctx,
        project_id=project_id,
        ticket_id=ticket_id,
        status=status,
        assigned_to_me=assigned_to_me,
    )
    return response(tasks)


@router.get("/{task_id}")
def get_task(task_id: str, ctx: RequestContext = Depends(require_roles("owner", "admin", "member", "client"))):
    supabase = get_supabase_client()
    task = TaskService.get_task(supabase, task_id, ctx)
    return response(task)


@router.post("/ticket/{ticket_id}")
def create_task(ticket_id: str, payload: TaskCreate, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    task = TaskService.create_task(supabase, ticket_id, payload, ctx)
    return response(task)


@router.patch("/{task_id}")
def update_task(task_id: str, payload: TaskUpdate, ctx: RequestContext = Depends(require_roles("owner", "admin", "member"))):
    supabase = get_supabase_client()
    task = TaskService.update_task(supabase, task_id, payload, ctx)
    return response(task)


@router.post("/{task_id}/assignees")
def update_task_assignees(task_id: str, payload: TaskAssigneesUpdate, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    assignees = TaskService.update_task_assignees(supabase, task_id, payload, ctx)
    return response(assignees)


@router.delete("/{task_id}")
def delete_task(task_id: str, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    task = TaskService.delete_task(supabase, task_id, ctx)
    return response(task)
