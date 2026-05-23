from pydantic import BaseModel
from typing import Optional


class ChatMessageCreate(BaseModel):
    conversation_id: str
    content: str
    reply_to_id: Optional[str] = None


class DirectConversationCreate(BaseModel):
    other_user_id: str


class GroupConversationCreate(BaseModel):
    title: str
    member_user_ids: list[str]
    avatar_url: Optional[str] = None


class GroupMemberAdd(BaseModel):
    user_id: str


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    avatar_url: Optional[str] = None
