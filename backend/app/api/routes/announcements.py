from fastapi import APIRouter, Depends

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate, AnnouncementRead
from app.services.announcements import AnnouncementService

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("")
def list_announcements(
    ctx: RequestContext = Depends(require_module_permission("announcement", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    announcements = AnnouncementService.list_announcements(supabase, ctx)
    return response(announcements)


@router.get("/{announcement_id}")
def get_announcement(
    announcement_id: str,
    ctx: RequestContext = Depends(require_module_permission("announcement", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    announcement = AnnouncementService.get_announcement(supabase, announcement_id, ctx)
    return response(announcement)


@router.post("")
def create_announcement(
    payload: AnnouncementCreate,
    ctx: RequestContext = Depends(require_module_permission("announcement", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    announcement = AnnouncementService.create_announcement(supabase, payload, ctx)
    return response(announcement)


@router.patch("/{announcement_id}")
def update_announcement(
    announcement_id: str,
    payload: AnnouncementUpdate,
    ctx: RequestContext = Depends(require_module_permission("announcement", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    announcement = AnnouncementService.update_announcement(supabase, announcement_id, payload, ctx)
    return response(announcement)


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    ctx: RequestContext = Depends(require_module_permission("announcement", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    announcement = AnnouncementService.delete_announcement(supabase, announcement_id, ctx)
    return response(announcement)


@router.post("/{announcement_id}/read")
def mark_announcement_read(
    announcement_id: str,
    ctx: RequestContext = Depends(require_module_permission("announcement", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    result = AnnouncementService.mark_as_read(supabase, announcement_id, ctx)
    return response(result)
