from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import TaskAssigneesUpdate, TaskCreate, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _accessible_project_ids(ctx: RequestContext) -> set[str] | None:
    if ctx.role_key in {"owner", "admin"}:
        return None
    supabase = get_supabase_client()
    rows = (
        supabase.table("project_members")
        .select("project_id")
        .eq("tenant_id", ctx.tenant_id)
        .eq("user_id", ctx.app_user_id)
        .eq("is_active", True)
        .execute()
    )
    return {x["project_id"] for x in (rows.data or [])}


@router.get("")
def list_tasks(
    project_id: str | None = Query(default=None),
    ticket_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    assigned_to_me: bool = Query(default=False),
    ctx: RequestContext = Depends(require_roles("owner", "admin", "member", "client")),
):
    supabase = get_supabase_client()
    query = (
        supabase.table("tasks")
        .select("id,tenant_id,project_id,ticket_id,title,description,status,created_by,created_at,updated_at")
        .eq("tenant_id", ctx.tenant_id)
        .order("created_at", desc=True)
    )
    if project_id:
        query = query.eq("project_id", project_id)
    if ticket_id:
        query = query.eq("ticket_id", ticket_id)
    if status:
        query = query.eq("status", status)

    rows = (query.execute().data or [])
    allowed_project_ids = _accessible_project_ids(ctx)
    if allowed_project_ids is not None:
        rows = [row for row in rows if row["project_id"] in allowed_project_ids]
    if assigned_to_me:
        task_ids = [row["id"] for row in rows]
        if not task_ids:
            return response([])
        assignments = (
            supabase.table("task_assignees")
            .select("task_id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", ctx.app_user_id)
            .in_("task_id", task_ids)
            .execute()
        )
        assigned_ids = {x["task_id"] for x in (assignments.data or [])}
        rows = [row for row in rows if row["id"] in assigned_ids]
    return response(rows)


@router.get("/{task_id}")
def get_task(task_id: str, ctx: RequestContext = Depends(require_roles("owner", "admin", "member", "client"))):
    supabase = get_supabase_client()
    data = (
        supabase.table("tasks")
        .select("id,tenant_id,project_id,ticket_id,title,description,status,created_by,created_at,updated_at")
        .eq("tenant_id", ctx.tenant_id)
        .eq("id", task_id)
        .maybe_single()
        .execute()
    )
    if not data.data:
        raise HTTPException(status_code=404, detail="Task not found")
    allowed_project_ids = _accessible_project_ids(ctx)
    if allowed_project_ids is not None and data.data["project_id"] not in allowed_project_ids:
        raise HTTPException(status_code=404, detail="Task not found")
    return response(data.data)


@router.post("/ticket/{ticket_id}")
def create_task(ticket_id: str, payload: TaskCreate, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    ticket = (
        supabase.table("tickets")
        .select("id,project_id")
        .eq("id", ticket_id)
        .eq("tenant_id", ctx.tenant_id)
        .maybe_single()
        .execute()
    )
    if not ticket.data:
        raise HTTPException(status_code=404, detail="Ticket not found")

    created = (
        supabase.table("tasks")
        .insert(
            {
                "tenant_id": ctx.tenant_id,
                "project_id": ticket.data["project_id"],
                "ticket_id": ticket_id,
                "title": payload.title,
                "description": payload.description,
                "status": payload.status or "open",
                "created_by": ctx.app_user_id,
            }
        )
        .execute()
    )
    row = (created.data or [None])[0]
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create task")

    for user_id in set(payload.assignee_user_ids or []):
        supabase.table("task_assignees").upsert(
            {
                "tenant_id": ctx.tenant_id,
                "task_id": row["id"],
                "user_id": user_id,
            },
            on_conflict="task_id,user_id",
        ).execute()
    return response(row)


@router.patch("/{task_id}")
def update_task(task_id: str, payload: TaskUpdate, ctx: RequestContext = Depends(require_roles("owner", "admin", "member"))):
    supabase = get_supabase_client()
    if ctx.role_key == "member":
        assigned = (
            supabase.table("task_assignees")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("task_id", task_id)
            .eq("user_id", ctx.app_user_id)
            .maybe_single()
            .execute()
        )
        if not assigned.data:
            raise HTTPException(status_code=403, detail="Forbidden")
    updated = (
        supabase.table("tasks")
        .update(payload.model_dump(exclude_none=True))
        .eq("tenant_id", ctx.tenant_id)
        .eq("id", task_id)
        .execute()
    )
    row = (updated.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    return response(row)


@router.post("/{task_id}/assignees")
def update_task_assignees(task_id: str, payload: TaskAssigneesUpdate, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    for user_id in set(payload.add_user_ids or []):
        supabase.table("task_assignees").upsert(
            {"tenant_id": ctx.tenant_id, "task_id": task_id, "user_id": user_id},
            on_conflict="task_id,user_id",
        ).execute()
    remove_ids = list(set(payload.remove_user_ids or []))
    if remove_ids:
        supabase.table("task_assignees").delete().eq("tenant_id", ctx.tenant_id).eq("task_id", task_id).in_("user_id", remove_ids).execute()

    assignees = (
        supabase.table("task_assignees")
        .select("id,task_id,user_id,assigned_at")
        .eq("tenant_id", ctx.tenant_id)
        .eq("task_id", task_id)
        .execute()
    )
    return response(assignees.data or [])


@router.delete("/{task_id}")
def delete_task(task_id: str, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    deleted = (
        supabase.table("tasks")
        .delete()
        .eq("tenant_id", ctx.tenant_id)
        .eq("id", task_id)
        .execute()
    )
    row = (deleted.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    return response(row)
