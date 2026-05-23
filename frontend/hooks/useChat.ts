"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/browser";
import { chatApi } from "@/lib/chat-api";
import { ChatConversation, ChatMessage, ChatUser } from "@/lib/chat-types";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export interface UseChatOptions {
  orgSlug: string;
  currentUserId: string | undefined;
  tenantId: string | undefined;
}

export interface UseChatResult {
  conversations: ChatConversation[];
  activeConversation: ChatConversation | undefined;
  messages: ChatMessage[];
  users: Map<string, ChatUser>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  sendingMessage: boolean;
  error: string | null;

  loadConversations: () => Promise<void>;
  selectConversation: (conversation: ChatConversation) => Promise<void>;
  selectConversationById: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  startDirectConversation: (otherUserId: string) => Promise<string>;
  createGroupConversation: (
    title: string,
    memberUserIds: string[]
  ) => Promise<ChatConversation>;
  searchUsers: (query: string) => Promise<ChatUser[]>;
  addGroupMember: (userId: string) => Promise<void>;
  removeGroupMember: (userId: string) => Promise<void>;
  getConversationName: (conv: ChatConversation) => string;
  getConversationAvatar: (conv: ChatConversation) => string | undefined;
}

export function useChat({ orgSlug, currentUserId, tenantId }: UseChatOptions): UseChatResult {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<Map<string, ChatUser>>(new Map());
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const loadConversations = useCallback(async () => {
    if (!orgSlug) return;
    setLoadingConversations(true);
    setError(null);
    try {
      const convs = await chatApi.listConversations(orgSlug);
      setConversations(convs);

      const newUsers = new Map<string, ChatUser>();
      convs.forEach((conv) => {
        if (conv._other_user?.user) {
          newUsers.set(conv._other_user.user.id, conv._other_user.user);
        }
        conv.participants?.forEach((p) => {
          if (p.user) {
            newUsers.set(p.user.id, p.user);
          }
        });
        if (conv._last_message?.users) {
          newUsers.set(conv._last_message.users.id, conv._last_message.users);
        }
      });
      setUsers(newUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }, [orgSlug]);

  const selectConversation = useCallback(
    async (conversation: ChatConversation) => {
      setActiveConversation(conversation);
      setMessages([]);
      setLoadingMessages(true);
      setError(null);
      try {
        const msgs = await chatApi.getMessages(orgSlug, conversation.id, { limit: 100 });
        setMessages(msgs);

        setUsers((prev) => {
          const newUsers = new Map(prev);
          msgs.forEach((msg) => {
            if (msg.users) {
              newUsers.set(msg.users.id, msg.users);
            }
          });
          return newUsers;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    },
    [orgSlug]
  );

  const selectConversationById = useCallback(
    async (conversationId: string) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        await selectConversation(conv);
      }
    },
    [conversations, selectConversation]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeConversation || !content.trim() || sendingMessage) return;
      setSendingMessage(true);
      setError(null);
      try {
        const msg = await chatApi.sendMessage(orgSlug, {
          conversation_id: activeConversation.id,
          content: content.trim(),
        });
        setMessages((prev) => [...prev, msg]);
        if (msg.users) {
          setUsers((prev) => {
            const next = new Map(prev);
            next.set(msg.users!.id, msg.users!);
            return next;
          });
        }
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? {
                  ...c,
                  _last_message: msg,
                  updated_at: msg.created_at,
                }
              : c
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setSendingMessage(false);
      }
    },
    [activeConversation, orgSlug, sendingMessage]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      setError(null);
      try {
        await chatApi.deleteMessage(orgSlug, messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete message");
      }
    },
    [orgSlug]
  );

  const startDirectConversation = useCallback(
    async (otherUserId: string): Promise<string> => {
      setError(null);
      try {
        const result = await chatApi.getOrCreateDirectConversation(orgSlug, otherUserId);
        await loadConversations();
        return result.conversation_id;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start conversation");
        throw err;
      }
    },
    [orgSlug, loadConversations]
  );

  const createGroupConversation = useCallback(
    async (title: string, memberUserIds: string[]): Promise<ChatConversation> => {
      setError(null);
      try {
        const conv = await chatApi.createGroupConversation(orgSlug, {
          title,
          member_user_ids: memberUserIds,
        });
        await loadConversations();
        return conv;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create group");
        throw err;
      }
    },
    [orgSlug, loadConversations]
  );

  const searchUsers = useCallback(
    async (query: string): Promise<ChatUser[]> => {
      try {
        const usersList = await chatApi.searchUsers(orgSlug, { search: query || undefined });
        setUsers((prev) => {
          const next = new Map(prev);
          usersList.forEach((u) => next.set(u.id, u));
          return next;
        });
        return usersList;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search users");
        return [];
      }
    },
    [orgSlug]
  );

  const addGroupMember = useCallback(
    async (userId: string) => {
      if (!activeConversation) return;
      setError(null);
      try {
        await chatApi.addGroupMember(orgSlug, activeConversation.id, userId);
        await loadConversations();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add member");
        throw err;
      }
    },
    [activeConversation, orgSlug, loadConversations]
  );

  const removeGroupMember = useCallback(
    async (userId: string) => {
      if (!activeConversation) return;
      setError(null);
      try {
        await chatApi.removeGroupMember(orgSlug, activeConversation.id, userId);
        await loadConversations();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove member");
        throw err;
      }
    },
    [activeConversation, orgSlug, loadConversations]
  );

  const getConversationName = useCallback(
    (conv: ChatConversation): string => {
      if (conv.type === "workspace") {
        return conv.title || "Workspace";
      }
      if (conv.type === "direct") {
        return conv._other_user?.user?.full_name || conv._other_user?.user?.email || "Direct Message";
      }
      return conv.title || "Group Chat";
    },
    []
  );

  const getConversationAvatar = useCallback(
    (conv: ChatConversation): string | undefined => {
      if (conv.type === "direct") {
        return conv._other_user?.user?.avatar_url || undefined;
      }
      return conv.avatar_url || undefined;
    },
    []
  );

  useEffect(() => {
    if (!activeConversation || !tenantId) {
      if (channelRef.current) {
        supabaseRef.current?.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const supabase = createClient();
    supabaseRef.current = supabase;

    const channel = supabase
      .channel(`chat:${tenantId}:${activeConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          const oldMsg = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== oldMsg.id));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [activeConversation?.id, tenantId]);

  return {
    conversations,
    activeConversation,
    messages,
    users,
    loadingConversations,
    loadingMessages,
    sendingMessage,
    error,
    loadConversations,
    selectConversation,
    selectConversationById,
    sendMessage,
    deleteMessage,
    startDirectConversation,
    createGroupConversation,
    searchUsers,
    addGroupMember,
    removeGroupMember,
    getConversationName,
    getConversationAvatar,
  };
}
