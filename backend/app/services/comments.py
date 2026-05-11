from fastapi import HTTPException
from supabase import Client
from app.core.deps import RequestContext

class CommentService:
    @staticmethod
    def list_comments(supabase: Client, ticket_id: str, ctx: RequestContext):
        data = (
            supabase.table("ticket_comments")
            .select("id,ticket_id,user_id,content,created_at,users(email,full_name)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("ticket_id", ticket_id)
            .order("created_at", desc=False)
            .execute()
        )
        return data.data or []

    @staticmethod
    def create_comment(supabase: Client, ticket_id: str, content: str, ctx: RequestContext):
        # Verify ticket exists and accessible
        ticket = (
            supabase.table("tickets")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", ticket_id)
            .maybe_single()
            .execute()
        )
        if not ticket.data:
            raise HTTPException(status_code=404, detail="Ticket not found")

        created = (
            supabase.table("ticket_comments")
            .insert({
                "tenant_id": ctx.tenant_id,
                "ticket_id": ticket_id,
                "user_id": ctx.app_user_id,
                "content": content
            })
            .execute()
        )
        return (created.data or [None])[0]

    @staticmethod
    def delete_comment(supabase: Client, comment_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("ticket_comments")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", comment_id)
            .execute()
        )
        return (deleted.data or [None])[0]
