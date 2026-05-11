from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.todo import TodoCreate, TodoUpdate
from app.services.todos import TodoService

router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("")
def list_todos(
    is_completed: bool | None = Query(default=None),
    ctx: RequestContext = Depends(require_roles("owner", "admin", "member")),
):
    supabase = get_supabase_client()
    todos = TodoService.list_todos(supabase, ctx, is_completed=is_completed)
    return response(todos)


@router.post("")
def create_todo(
    payload: TodoCreate,
    ctx: RequestContext = Depends(require_roles("owner", "admin", "member")),
):
    supabase = get_supabase_client()
    todo = TodoService.create_todo(supabase, payload, ctx)
    return response(todo)


@router.patch("/{todo_id}")
def update_todo(
    todo_id: str,
    payload: TodoUpdate,
    ctx: RequestContext = Depends(require_roles("owner", "admin", "member")),
):
    supabase = get_supabase_client()
    todo = TodoService.update_todo(supabase, todo_id, payload, ctx)
    return response(todo)


@router.delete("/{todo_id}")
def delete_todo(
    todo_id: str,
    ctx: RequestContext = Depends(require_roles("owner", "admin", "member")),
):
    supabase = get_supabase_client()
    todo = TodoService.delete_todo(supabase, todo_id, ctx)
    return response(todo)
