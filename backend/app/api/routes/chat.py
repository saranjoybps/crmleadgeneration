from fastapi import APIRouter, Depends, Body, Query
from typing import Optional

from app.api.utils import response
from app.core.deps import RequestContext, get_request_context, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.services.chat import ChatService
from app.schemas.chat import (
    ChatMessageCreate,
    DirectConversationCreate,
    GroupConversationCreate,
    GroupMemberAdd,
    ConversationUpdate,
)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/conversations")
def list_conversations(ctx: RequestContext = Depends(require_module_permission("chat", "view"))):
    supabase = get_supabase_client(access_token=ctx.access_token)
    conversations = ChatService.get_conversations(supabase, ctx)
    return response(conversations)


@router.get("/conversations/workspace")
def get_or_create_workspace(ctx: RequestContext = Depends(require_module_permission("chat", "view"))):
    supabase = get_supabase_client(access_token=ctx.access_token)
    result = ChatService.get_or_create_workspace_conversation(supabase, ctx)
    return response(result)


@router.post("/conversations/direct")
def get_or_create_dm(
    payload: DirectConversationCreate,
    ctx: RequestContext = Depends(require_module_permission("chat", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    result = ChatService.get_or_create_direct_conversation(
        supabase, payload.other_user_id, ctx
    )
    return response(result)


@router.post("/conversations/group")
def create_group(
    payload: GroupConversationCreate,
    ctx: RequestContext = Depends(require_module_permission("chat", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    result = ChatService.create_group_conversation(supabase, payload, ctx)
    return response(result)


@router.patch("/conversations/{conversation_id}")
def update_group(
    conversation_id: str,
    payload: ConversationUpdate,
    ctx: RequestContext = Depends(require_module_permission("chat", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    result = ChatService.update_group(supabase, conversation_id, payload, ctx)
    return response(result)


@router.get("/conversations/{conversation_id}/messages")
def get_messages(
    conversation_id: str,
    limit: int = Query(50, ge=1, le=200),
    before: Optional[str] = Query(None),
    ctx: RequestContext = Depends(require_module_permission("chat", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    messages = ChatService.get_messages(supabase, conversation_id, ctx, limit, before)
    return response(messages)


@router.post("/messages")
def send_message(
    payload: ChatMessageCreate,
    ctx: RequestContext = Depends(require_module_permission("chat", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    message = ChatService.send_message(
        supabase,
        payload.conversation_id,
        payload.content,
        payload.reply_to_id,
        ctx,
    )
    return response(message)


@router.delete("/messages/{message_id}")
def delete_message(
    message_id: str,
    ctx: RequestContext = Depends(require_module_permission("chat", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    result = ChatService.delete_message(supabase, message_id, ctx)
    return response(result)


@router.get("/users/search")
def search_users(
    search: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    ctx: RequestContext = Depends(require_module_permission("chat", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    users = ChatService.search_users(supabase, ctx, search, limit)
    return response(users)


@router.post("/conversations/{conversation_id}/members")
def add_group_member(
    conversation_id: str,
    payload: GroupMemberAdd,
    ctx: RequestContext = Depends(require_module_permission("chat", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    result = ChatService.add_group_member(supabase, conversation_id, payload.user_id, ctx)
    return response(result)


@router.delete("/conversations/{conversation_id}/members/{user_id}")
def remove_group_member(
    conversation_id: str,
    user_id: str,
    ctx: RequestContext = Depends(require_module_permission("chat", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    result = ChatService.remove_group_member(supabase, conversation_id, user_id, ctx)
    return response(result)
