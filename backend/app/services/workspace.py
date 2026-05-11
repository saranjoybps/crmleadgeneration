from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.common import WorkspaceUpdate


class WorkspaceService:
    @staticmethod
    def get_workspace_me(ctx: RequestContext):
        return {"tenant_id": ctx.tenant_id, "slug": ctx.tenant_slug, "name": ctx.tenant_name, "role": ctx.role_key}

    @staticmethod
    def update_workspace(supabase: Client, payload: WorkspaceUpdate, ctx: RequestContext):
        updated = supabase.table("tenants").update(payload.model_dump(exclude_none=True)).eq("id", ctx.tenant_id).execute()
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Workspace not found")
        return row
