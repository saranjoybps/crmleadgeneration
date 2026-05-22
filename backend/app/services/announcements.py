from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate


class AnnouncementService:

    @staticmethod
    def _get_visible_announcements(supabase: Client, ctx: RequestContext):
        announcements = (
            supabase.table("announcements")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at", desc=True)
            .execute()
        )
        rows = announcements.data or []

        user_dept_ids = []
        if ctx.department_id:
            user_dept_ids = [ctx.department_id]

        visible = []
        for ann in rows:
            if ann["target_type"] == "all":
                visible.append(ann)
                continue

            targets = (
                supabase.table("announcement_targets")
                .select("target_type, target_id")
                .eq("announcement_id", ann["id"])
                .execute()
            )
            target_rows = targets.data or []

            if ann["target_type"] == "department":
                dept_ids = [t["target_id"] for t in target_rows]
                if any(did in user_dept_ids for did in dept_ids):
                    visible.append(ann)
            elif ann["target_type"] == "user":
                user_ids = [t["target_id"] for t in target_rows]
                if ctx.app_user_id in user_ids:
                    visible.append(ann)

        return visible

    @staticmethod
    def _attach_read_info(supabase: Client, announcements: list, ctx: RequestContext):
        for ann in announcements:
            read_count_resp = (
                supabase.table("announcement_reads")
                .select("id", count="exact")
                .eq("announcement_id", ann["id"])
                .execute()
            )
            ann["read_count"] = read_count_resp.count or 0

            my_read = (
                supabase.table("announcement_reads")
                .select("id")
                .eq("announcement_id", ann["id"])
                .eq("user_id", ctx.app_user_id)
                .execute()
            )
            ann["is_read"] = len(my_read.data or []) > 0

        return announcements

    @staticmethod
    def _attach_targets(supabase: Client, announcements: list):
        for ann in announcements:
            targets_resp = (
                supabase.table("announcement_targets")
                .select("id, target_type, target_id")
                .eq("announcement_id", ann["id"])
                .execute()
            )
            ann["targets"] = targets_resp.data or []

        return announcements

    @staticmethod
    def list_announcements(supabase: Client, ctx: RequestContext):
        visible = AnnouncementService._get_visible_announcements(supabase, ctx)
        visible = AnnouncementService._attach_read_info(supabase, visible, ctx)
        visible = AnnouncementService._attach_targets(supabase, visible)
        return visible

    @staticmethod
    def get_announcement(supabase: Client, announcement_id: str, ctx: RequestContext):
        resp = (
            supabase.table("announcements")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", announcement_id)
            .single()
            .execute()
        )
        row = resp.data
        if not row:
            raise HTTPException(status_code=404, detail="Announcement not found")

        visible = AnnouncementService._get_visible_announcements(supabase, ctx)
        if not any(a["id"] == announcement_id for a in visible):
            raise HTTPException(status_code=404, detail="Announcement not found")

        visible_with_read = AnnouncementService._attach_read_info(supabase, [row], ctx)
        visible_with_targets = AnnouncementService._attach_targets(supabase, visible_with_read)
        return visible_with_targets[0]

    @staticmethod
    def create_announcement(supabase: Client, payload: AnnouncementCreate, ctx: RequestContext):
        created = (
            supabase.table("announcements")
            .insert({
                "tenant_id": ctx.tenant_id,
                "title": payload.title,
                "content": payload.content,
                "priority": payload.priority,
                "target_type": payload.target_type,
                "created_by": ctx.app_user_id,
            })
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create announcement")

        if payload.target_ids and payload.target_type in ("department", "user"):
            target_rows = [
                {
                    "announcement_id": row["id"],
                    "tenant_id": ctx.tenant_id,
                    "target_type": payload.target_type,
                    "target_id": tid,
                }
                for tid in payload.target_ids
            ]
            if target_rows:
                supabase.table("announcement_targets").insert(target_rows).execute()

        return AnnouncementService.get_announcement(supabase, row["id"], ctx)

    @staticmethod
    def update_announcement(supabase: Client, announcement_id: str, payload: AnnouncementUpdate, ctx: RequestContext):
        existing = (
            supabase.table("announcements")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", announcement_id)
            .single()
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Announcement not found")

        update_data = payload.model_dump(exclude_unset=True)
        target_ids = update_data.pop("target_ids", None)
        target_type = update_data.get("target_type")

        if update_data:
            updated = (
                supabase.table("announcements")
                .update(update_data)
                .eq("tenant_id", ctx.tenant_id)
                .eq("id", announcement_id)
                .execute()
            )
            if not (updated.data or [None])[0]:
                raise HTTPException(status_code=404, detail="Announcement not found")

        if target_ids is not None and target_type in ("department", "user"):
            supabase.table("announcement_targets").delete().eq("announcement_id", announcement_id).execute()
            new_targets = [
                {
                    "announcement_id": announcement_id,
                    "tenant_id": ctx.tenant_id,
                    "target_type": target_type,
                    "target_id": tid,
                }
                for tid in target_ids
            ]
            if new_targets:
                supabase.table("announcement_targets").insert(new_targets).execute()

        return AnnouncementService.get_announcement(supabase, announcement_id, ctx)

    @staticmethod
    def delete_announcement(supabase: Client, announcement_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("announcements")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", announcement_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Announcement not found")
        return row

    @staticmethod
    def mark_as_read(supabase: Client, announcement_id: str, ctx: RequestContext):
        ann = (
            supabase.table("announcements")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", announcement_id)
            .single()
            .execute()
        )
        if not ann.data:
            raise HTTPException(status_code=404, detail="Announcement not found")

        existing = (
            supabase.table("announcement_reads")
            .select("id")
            .eq("announcement_id", announcement_id)
            .eq("user_id", ctx.app_user_id)
            .execute()
        )
        if not existing.data:
            supabase.table("announcement_reads").insert({
                "announcement_id": announcement_id,
                "user_id": ctx.app_user_id,
                "tenant_id": ctx.tenant_id,
            }).execute()

        return {"status": "ok"}
