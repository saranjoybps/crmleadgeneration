from fastapi import APIRouter, Depends, Body
from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.services.comments import CommentService

router = APIRouter(prefix="/comments", tags=["comments"])

@router.get("/ticket/{ticket_id}")
def list_comments(ticket_id: str, ctx: RequestContext = Depends(require_module_permission("tickets", "view"))):
    supabase = get_supabase_client()
    comments = CommentService.list_comments(supabase, ticket_id, ctx)
    return response(comments)

@router.post("/ticket/{ticket_id}")
def create_comment(ticket_id: str, content: str = Body(embed=True), ctx: RequestContext = Depends(require_module_permission("tickets", "create"))):
    supabase = get_supabase_client()
    comment = CommentService.create_comment(supabase, ticket_id, content, ctx)
    return response(comment)

@router.delete("/{comment_id}")
def delete_comment(comment_id: str, ctx: RequestContext = Depends(require_module_permission("tickets", "delete"))):
    supabase = get_supabase_client()
    comment = CommentService.delete_comment(supabase, comment_id, ctx)
    return response(comment)
