from fastapi import HTTPException
from supabase import Client
from postgrest.exceptions import APIError

from app.core.deps import RequestContext
from app.schemas.chat import (
    GroupConversationCreate,
    ConversationUpdate,
)


class ChatService:
    @classmethod
    def get_conversations(
        cls,
        supabase: Client,
        ctx: RequestContext,
    ):
        conversations = (
            supabase.table("chat_conversations")
            .select(
                "id,tenant_id,type,title,avatar_url,created_by,created_at,updated_at"
            )
            .eq("tenant_id", ctx.tenant_id)
            .order("updated_at", desc=True)
            .execute()
            .data
            or []
        )

        visible_conversations = []
        participant_map = cls._get_participant_map(supabase, ctx.tenant_id)

        for conv in conversations:
            if conv["type"] == "workspace":
                visible_conversations.append(conv)
            elif conv["id"] in participant_map:
                conv["participants"] = participant_map[conv["id"]]
                visible_conversations.append(conv)

        for conv in visible_conversations:
            if conv["type"] == "direct" and "participants" in conv:
                other_participants = [
                    p for p in conv["participants"] if p["user_id"] != ctx.app_user_id
                ]
                if other_participants:
                    conv["_other_user"] = other_participants[0]

            last_msg = cls._get_last_message(supabase, conv["id"])
            conv["_last_message"] = last_msg

            unread_count = cls._get_unread_count(
                supabase, conv["id"], ctx.app_user_id, participant_map.get(conv["id"], [])
            )
            conv["_unread_count"] = unread_count

        visible_conversations.sort(
            key=lambda x: (
                x["_last_message"]["created_at"] if x.get("_last_message") else x["created_at"]
            ),
            reverse=True,
        )

        return visible_conversations

    @classmethod
    def _get_participant_map(cls, supabase: Client, tenant_id: str):
        participants = (
            supabase.table("chat_participants")
            .select("conversation_id,user_id,last_read_at,joined_at,user:users!chat_participants_user_id_fkey(id,full_name,avatar_url,email)")
            .eq("tenant_id", tenant_id)
            .execute()
            .data
            or []
        )

        participant_map = {}
        for p in participants:
            conv_id = p["conversation_id"]
            if conv_id not in participant_map:
                participant_map[conv_id] = []
            participant_map[conv_id].append(
                {
                    "user_id": p["user_id"],
                    "last_read_at": p.get("last_read_at"),
                    "joined_at": p.get("joined_at"),
                    "user": p.get("user"),
                }
            )

        return participant_map

    @classmethod
    def _get_last_message(cls, supabase: Client, conversation_id: str):
        messages = (
            supabase.table("chat_messages")
            .select("id,content,created_at,sender_id,users:chat_messages_sender_id_fkey(id,full_name,avatar_url,email)")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
            or []
        )
        return messages[0] if messages else None

    @classmethod
    def _get_unread_count(
        cls, supabase: Client, conversation_id: str, user_id: str, participants: list
    ):
        my_participation = next((p for p in participants if p["user_id"] == user_id), None)
        last_read_at = my_participation.get("last_read_at") if my_participation else None

        if not last_read_at:
            return 0

        result = (
            supabase.table("chat_messages")
            .select("id", count="exact")
            .eq("conversation_id", conversation_id)
            .gt("created_at", last_read_at)
            .neq("sender_id", user_id)
            .execute()
        )
        return result.count or 0

    @classmethod
    def get_or_create_workspace_conversation(cls, supabase: Client, ctx: RequestContext):
        result = (
            supabase.rpc(
                "ensure_workspace_conversation",
                {"p_tenant_id": ctx.tenant_id},
            )
            .execute()
            .data
        )
        return {"conversation_id": result}

    @classmethod
    def get_or_create_direct_conversation(
        cls, supabase: Client, other_user_id: str, ctx: RequestContext
    ):
        if other_user_id == ctx.app_user_id:
            raise HTTPException(status_code=400, detail="Cannot create DM with yourself")

        members = (
            supabase.table("user_tenant_roles")
            .select("user_id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", other_user_id)
            .eq("is_active", True)
            .execute()
            .data
            or []
        )
        if not members:
            raise HTTPException(status_code=404, detail="User not found in this organization")

        result = (
            supabase.rpc(
                "ensure_direct_conversation",
                {
                    "p_tenant_id": ctx.tenant_id,
                    "p_user1_id": ctx.app_user_id,
                    "p_user2_id": other_user_id,
                },
            )
            .execute()
            .data
        )
        return {"conversation_id": result}

    @classmethod
    def create_group_conversation(
        cls, supabase: Client, payload: GroupConversationCreate, ctx: RequestContext
    ):
        member_user_ids = payload.member_user_ids or []
        member_user_ids = [uid for uid in member_user_ids if uid != ctx.app_user_id]

        if len(member_user_ids) < 1:
            raise HTTPException(status_code=400, detail="Group must have at least one other member")

        try:
            conv_data = {
                "tenant_id": ctx.tenant_id,
                "type": "group",
                "title": payload.title.strip(),
                "avatar_url": payload.avatar_url,
                "created_by": ctx.app_user_id,
            }
            conv_created = (
                supabase.table("chat_conversations").insert(conv_data).execute()
            )
            conv = (conv_created.data or [None])[0]
            if not conv:
                raise HTTPException(status_code=500, detail="Failed to create conversation")

            conv_id = conv["id"]
            all_participants = [ctx.app_user_id] + member_user_ids

            participant_inserts = [
                {
                    "conversation_id": conv_id,
                    "user_id": uid,
                    "tenant_id": ctx.tenant_id,
                    "created_by": ctx.app_user_id,
                }
                for uid in all_participants
            ]
            supabase.table("chat_participants").insert(participant_inserts).execute()

            return conv
        except APIError as exc:
            raise HTTPException(status_code=400, detail=f"Database error: {exc.message}")

    @classmethod
    def get_messages(
        cls,
        supabase: Client,
        conversation_id: str,
        ctx: RequestContext,
        limit: int = 50,
        before: str | None = None,
    ):
        conv = (
            supabase.table("chat_conversations")
            .select("id,type,tenant_id")
            .eq("id", conversation_id)
            .maybe_single()
            .execute()
            .data
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv["tenant_id"] != ctx.tenant_id:
            raise HTTPException(status_code=404, detail="Conversation not found")

        query = (
            supabase.table("chat_messages")
            .select(
                "id,conversation_id,sender_id,content,reply_to_id,created_at,updated_at,"
                "users:chat_messages_sender_id_fkey(id,full_name,avatar_url,email)"
            )
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        if before:
            query = query.lt("created_at", before)

        messages = query.execute().data or []
        messages.reverse()

        return messages

    @classmethod
    def send_message(
        cls,
        supabase: Client,
        conversation_id: str,
        content: str,
        reply_to_id: str | None,
        ctx: RequestContext,
    ):
        if not content or not content.strip():
            raise HTTPException(status_code=400, detail="Message content cannot be empty")

        conv = (
            supabase.table("chat_conversations")
            .select("id,type,tenant_id")
            .eq("id", conversation_id)
            .maybe_single()
            .execute()
            .data
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv["tenant_id"] != ctx.tenant_id:
            raise HTTPException(status_code=404, detail="Conversation not found")

        try:
            msg_data = {
                "tenant_id": ctx.tenant_id,
                "conversation_id": conversation_id,
                "sender_id": ctx.app_user_id,
                "content": content.strip(),
                "reply_to_id": reply_to_id,
            }
            created = (
                supabase.table("chat_messages")
                .insert(msg_data)
                .execute()
            )

            (
                supabase.table("chat_conversations")
                .update({"updated_at": "now()"})
                .eq("id", conversation_id)
                .execute()
            )

            msg_row = (created.data or [None])[0]
            if not msg_row:
                raise HTTPException(status_code=500, detail="Failed to send message")

            msg_id = msg_row.get("id")
            msg_with_user = (
                supabase.table("chat_messages")
                .select(
                    "id,conversation_id,sender_id,content,reply_to_id,created_at,updated_at,"
                    "users:chat_messages_sender_id_fkey(id,full_name,avatar_url,email)"
                )
                .eq("id", msg_id)
                .maybe_single()
                .execute()
                .data
            )
            if not msg_with_user:
                raise HTTPException(status_code=500, detail="Failed to fetch message")
            return msg_with_user
        except APIError as exc:
            raise HTTPException(status_code=400, detail=f"Database error: {exc.message}")

    @classmethod
    def delete_message(cls, supabase: Client, message_id: str, ctx: RequestContext):
        msg = (
            supabase.table("chat_messages")
            .select("id,tenant_id,sender_id")
            .eq("id", message_id)
            .maybe_single()
            .execute()
            .data
        )
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")
        if msg["tenant_id"] != ctx.tenant_id:
            raise HTTPException(status_code=404, detail="Message not found")

        is_owner = msg["sender_id"] == ctx.app_user_id
        if not is_owner:
            raise HTTPException(status_code=403, detail="Cannot delete message sent by another user")

        supabase.table("chat_messages").delete().eq("id", message_id).execute()
        return {"deleted": True, "message_id": message_id}

    @classmethod
    def search_users(
        cls,
        supabase: Client,
        ctx: RequestContext,
        search: str | None = None,
        limit: int = 20,
    ):
        query = (
            supabase.table("users")
            .select("id,full_name,email,avatar_url")
            .order("full_name", desc=False)
            .limit(limit)
        )

        active_members = (
            supabase.table("user_tenant_roles")
            .select("user_id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("is_active", True)
            .execute()
            .data
            or []
        )
        active_ids = [m["user_id"] for m in active_members]

        if search and search.strip():
            search = search.strip().lower()
            all_users = (
                supabase.table("users")
                .select("id,full_name,email,avatar_url")
                .in_("id", active_ids)
                .order("full_name", desc=False)
                .limit(limit * 2)
                .execute()
                .data
                or []
            )
            users = [
                u
                for u in all_users
                if (u.get("full_name") and search in u["full_name"].lower())
                or (u.get("email") and search in u["email"].lower())
            ]
            return users[:limit]
        else:
            users = (
                supabase.table("users")
                .select("id,full_name,email,avatar_url")
                .in_("id", active_ids)
                .neq("id", ctx.app_user_id)
                .order("full_name", desc=False)
                .limit(limit)
                .execute()
                .data
                or []
            )
            return users

    @classmethod
    def add_group_member(
        cls, supabase: Client, conversation_id: str, user_id: str, ctx: RequestContext
    ):
        conv = (
            supabase.table("chat_conversations")
            .select("id,tenant_id,type,created_by")
            .eq("id", conversation_id)
            .maybe_single()
            .execute()
            .data
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv["tenant_id"] != ctx.tenant_id:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv["type"] != "group":
            raise HTTPException(status_code=400, detail="Can only add members to groups")

        is_owner = conv["created_by"] == ctx.app_user_id
        if not is_owner:
            raise HTTPException(status_code=403, detail="Only group owner can add members")

        active_members = (
            supabase.table("user_tenant_roles")
            .select("user_id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
            .data
            or []
        )
        if not active_members:
            raise HTTPException(status_code=404, detail="User not found in this organization")

        existing = (
            supabase.table("chat_participants")
            .select("id")
            .eq("conversation_id", conversation_id)
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        if existing:
            return {"added": False, "reason": "Already a member"}

        try:
            supabase.table("chat_participants").insert(
                {
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "tenant_id": ctx.tenant_id,
                    "created_by": ctx.app_user_id,
                }
            ).execute()
            return {"added": True, "user_id": user_id}
        except APIError as exc:
            raise HTTPException(status_code=400, detail=f"Database error: {exc.message}")

    @classmethod
    def remove_group_member(
        cls, supabase: Client, conversation_id: str, user_id: str, ctx: RequestContext
    ):
        conv = (
            supabase.table("chat_conversations")
            .select("id,tenant_id,type,created_by")
            .eq("id", conversation_id)
            .maybe_single()
            .execute()
            .data
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv["tenant_id"] != ctx.tenant_id:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv["type"] != "group":
            raise HTTPException(status_code=400, detail="Can only remove members from groups")

        is_owner = conv["created_by"] == ctx.app_user_id
        is_self = user_id == ctx.app_user_id

        if not is_owner and not is_self:
            raise HTTPException(
                status_code=403, detail="Only group owner can remove other members"
            )

        participants = (
            supabase.table("chat_participants")
            .select("id")
            .eq("conversation_id", conversation_id)
            .execute()
            .data
            or []
        )
        if len(participants) <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove last member")

        supabase.table("chat_participants").delete().eq("conversation_id", conversation_id).eq(
            "user_id", user_id
        ).execute()

        return {"removed": True, "user_id": user_id}

    @classmethod
    def update_group(
        cls,
        supabase: Client,
        conversation_id: str,
        payload: ConversationUpdate,
        ctx: RequestContext,
    ):
        conv = (
            supabase.table("chat_conversations")
            .select("id,tenant_id,type,created_by")
            .eq("id", conversation_id)
            .maybe_single()
            .execute()
            .data
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv["tenant_id"] != ctx.tenant_id:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv["type"] != "group":
            raise HTTPException(status_code=400, detail="Can only update groups")

        is_owner = conv["created_by"] == ctx.app_user_id
        if not is_owner:
            raise HTTPException(status_code=403, detail="Only group owner can update group")

        update_data = {}
        if payload.title is not None:
            update_data["title"] = payload.title.strip() if payload.title else None
        if payload.avatar_url is not None:
            update_data["avatar_url"] = payload.avatar_url

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        updated = (
            supabase.table("chat_conversations")
            .update(update_data)
            .eq("id", conversation_id)
            .select("id,type,title,avatar_url,created_by,updated_at")
            .execute()
            .data
            or [None]
        )[0]

        return updated
