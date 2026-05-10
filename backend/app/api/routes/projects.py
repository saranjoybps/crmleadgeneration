from fastapi import APIRouter, Depends, HTTPException

from app.api.utils import response
from app.core.deps import RequestContext, require_roles
from app.core.supabase_client import get_supabase_client
from app.schemas.common import ProjectCreate, ProjectMemberCreate, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


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
def list_projects(ctx: RequestContext = Depends(require_roles("owner", "admin", "member", "client"))):
    supabase = get_supabase_client()
    query = (
        supabase.table("projects")
        .select("id,tenant_id,name,description,status,created_by,created_at,updated_at")
        .eq("tenant_id", ctx.tenant_id)
        .order("created_at", desc=True)
    )
    rows = query.execute().data or []
    allowed_ids = _accessible_project_ids(ctx)
    if allowed_ids is not None:
        rows = [row for row in rows if row["id"] in allowed_ids]
    return response(rows)


@router.get("/{project_id}")
def get_project(project_id: str, ctx: RequestContext = Depends(require_roles("owner", "admin", "member", "client"))):
    supabase = get_supabase_client()
    data = (
        supabase.table("projects")
        .select("id,tenant_id,name,description,status,created_by,created_at,updated_at")
        .eq("tenant_id", ctx.tenant_id)
        .eq("id", project_id)
        .maybe_single()
        .execute()
    )
    if not data.data:
        raise HTTPException(status_code=404, detail="Project not found")
    allowed_ids = _accessible_project_ids(ctx)
    if allowed_ids is not None and project_id not in allowed_ids:
        raise HTTPException(status_code=404, detail="Project not found")
    return response(data.data)


@router.post("")
def create_project(payload: ProjectCreate, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    body = {
        "tenant_id": ctx.tenant_id,
        "name": payload.name,
        "description": payload.description,
        "status": payload.status or "active",
        "created_by": ctx.app_user_id,
    }
    created = supabase.table("projects").insert(body).execute()
    project = (created.data or [None])[0]
    if not project:
        raise HTTPException(status_code=500, detail="Failed to create project")

    member_ids = set(payload.member_user_ids or [])
    for user_id in member_ids:
        supabase.table("project_members").upsert(
            {
                "tenant_id": ctx.tenant_id,
                "project_id": project["id"],
                "user_id": user_id,
                "is_active": True,
                "created_by": ctx.app_user_id,
            },
            on_conflict="project_id,user_id",
        ).execute()
    return response(project)


@router.patch("/{project_id}")
def update_project(project_id: str, payload: ProjectUpdate, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    updated = (
        supabase.table("projects")
        .update(payload.model_dump(exclude_none=True))
        .eq("id", project_id)
        .eq("tenant_id", ctx.tenant_id)
        .execute()
    )
    row = (updated.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return response(row)


@router.delete("/{project_id}")
def delete_project(project_id: str, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    deleted = (
        supabase.table("projects")
        .delete()
        .eq("tenant_id", ctx.tenant_id)
        .eq("id", project_id)
        .execute()
    )
    row = (deleted.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return response(row)


@router.post("/{project_id}/members")
def add_project_member(project_id: str, payload: ProjectMemberCreate, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    row = (
        supabase.table("project_members")
        .upsert(
            {
                "tenant_id": ctx.tenant_id,
                "project_id": project_id,
                "user_id": payload.user_id,
                "is_active": True,
                "created_by": ctx.app_user_id,
            },
            on_conflict="project_id,user_id",
        )
        .execute()
    )
    return response((row.data or [None])[0])


@router.get("/{project_id}/members")
def list_project_members(project_id: str, ctx: RequestContext = Depends(require_roles("owner", "admin", "member", "client"))):
    allowed_ids = _accessible_project_ids(ctx)
    if allowed_ids is not None and project_id not in allowed_ids:
        raise HTTPException(status_code=404, detail="Project not found")
    supabase = get_supabase_client()
    rows = (
        supabase.table("project_members")
        .select("id,project_id,user_id,is_active,created_at,updated_at,users(email,full_name)")
        .eq("tenant_id", ctx.tenant_id)
        .eq("project_id", project_id)
        .eq("is_active", True)
        .execute()
    )
    return response(rows.data or [])


@router.delete("/{project_id}/members/{user_id}")
def remove_project_member(project_id: str, user_id: str, ctx: RequestContext = Depends(require_roles("owner", "admin"))):
    supabase = get_supabase_client()
    deleted = (
        supabase.table("project_members")
        .delete()
        .eq("tenant_id", ctx.tenant_id)
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .execute()
    )
    return response((deleted.data or [None])[0])
