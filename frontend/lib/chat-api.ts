"use client";

import { ChatConversation, ChatMessage, ChatUser } from "@/lib/chat-types";
import { apiRequest } from "@/lib/api-client";

export interface ChatApiService {
  listConversations: (orgSlug: string) => Promise<ChatConversation[]>;
  getWorkspaceConversation: (orgSlug: string) => Promise<{ conversation_id: string }>;
  getOrCreateDirectConversation: (
    orgSlug: string,
    otherUserId: string
  ) => Promise<{ conversation_id: string }>;
  createGroupConversation: (
    orgSlug: string,
    data: { title: string; member_user_ids: string[]; avatar_url?: string | null }
  ) => Promise<ChatConversation>;
  updateGroupConversation: (
    orgSlug: string,
    conversationId: string,
    data: { title?: string | null; avatar_url?: string | null }
  ) => Promise<ChatConversation>;
  getMessages: (
    orgSlug: string,
    conversationId: string,
    options?: { limit?: number; before?: string }
  ) => Promise<ChatMessage[]>;
  sendMessage: (
    orgSlug: string,
    data: { conversation_id: string; content: string; reply_to_id?: string | null }
  ) => Promise<ChatMessage>;
  deleteMessage: (orgSlug: string, messageId: string) => Promise<{ deleted: boolean; message_id: string }>;
  searchUsers: (
    orgSlug: string,
    options?: { search?: string; limit?: number }
  ) => Promise<ChatUser[]>;
  addGroupMember: (
    orgSlug: string,
    conversationId: string,
    userId: string
  ) => Promise<{ added: boolean; user_id: string }>;
  removeGroupMember: (
    orgSlug: string,
    conversationId: string,
    userId: string
  ) => Promise<{ removed: boolean; user_id: string }>;
}

export const chatApi: ChatApiService = {
  async listConversations(orgSlug: string) {
    const result = await apiRequest<ChatConversation[]>(
      "/api/v1/chat/conversations",
      { orgSlug }
    );
    if (result.error) throw new Error(result.error);
    return result.data || [];
  },

  async getWorkspaceConversation(orgSlug: string) {
    const result = await apiRequest<{ conversation_id: string }>(
      "/api/v1/chat/conversations/workspace",
      { orgSlug }
    );
    if (result.error) throw new Error(result.error);
    return result.data!;
  },

  async getOrCreateDirectConversation(orgSlug: string, otherUserId: string) {
    const result = await apiRequest<{ conversation_id: string }>(
      "/api/v1/chat/conversations/direct",
      {
        method: "POST",
        body: { other_user_id: otherUserId },
        orgSlug,
      }
    );
    if (result.error) throw new Error(result.error);
    return result.data!;
  },

  async createGroupConversation(
    orgSlug: string,
    data: { title: string; member_user_ids: string[]; avatar_url?: string | null }
  ) {
    const result = await apiRequest<ChatConversation>("/api/v1/chat/conversations/group", {
      method: "POST",
      body: data,
      orgSlug,
    });
    if (result.error) throw new Error(result.error);
    return result.data!;
  },

  async updateGroupConversation(
    orgSlug: string,
    conversationId: string,
    data: { title?: string | null; avatar_url?: string | null }
  ) {
    const result = await apiRequest<ChatConversation>(
      `/api/v1/chat/conversations/${conversationId}`,
      {
        method: "PATCH",
        body: data,
        orgSlug,
      }
    );
    if (result.error) throw new Error(result.error);
    return result.data!;
  },

  async getMessages(
    orgSlug: string,
    conversationId: string,
    options?: { limit?: number; before?: string }
  ) {
    let path = `/api/v1/chat/conversations/${conversationId}/messages`;
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.before) params.set("before", options.before);
    const paramsStr = params.toString();
    if (paramsStr) path += `?${paramsStr}`;

    const result = await apiRequest<ChatMessage[]>(path, { orgSlug });
    if (result.error) throw new Error(result.error);
    return result.data || [];
  },

  async sendMessage(
    orgSlug: string,
    data: { conversation_id: string; content: string; reply_to_id?: string | null }
  ) {
    const result = await apiRequest<ChatMessage>("/api/v1/chat/messages", {
      method: "POST",
      body: data,
      orgSlug,
    });
    if (result.error) throw new Error(result.error);
    return result.data!;
  },

  async deleteMessage(orgSlug: string, messageId: string) {
    const result = await apiRequest<{ deleted: boolean; message_id: string }>(
      `/api/v1/chat/messages/${messageId}`,
      { method: "DELETE", orgSlug }
    );
    if (result.error) throw new Error(result.error);
    return result.data!;
  },

  async searchUsers(
    orgSlug: string,
    options?: { search?: string; limit?: number }
  ) {
    let path = "/api/v1/chat/users/search";
    const params = new URLSearchParams();
    if (options?.search) params.set("search", options.search);
    if (options?.limit) params.set("limit", String(options.limit));
    const paramsStr = params.toString();
    if (paramsStr) path += `?${paramsStr}`;

    const result = await apiRequest<ChatUser[]>(path, { orgSlug });
    if (result.error) throw new Error(result.error);
    return result.data || [];
  },

  async addGroupMember(orgSlug: string, conversationId: string, userId: string) {
    const result = await apiRequest<{ added: boolean; user_id: string }>(
      `/api/v1/chat/conversations/${conversationId}/members`,
      {
        method: "POST",
        body: { user_id: userId },
        orgSlug,
      }
    );
    if (result.error) throw new Error(result.error);
    return result.data!;
  },

  async removeGroupMember(orgSlug: string, conversationId: string, userId: string) {
    const result = await apiRequest<{ removed: boolean; user_id: string }>(
      `/api/v1/chat/conversations/${conversationId}/members/${userId}`,
      { method: "DELETE", orgSlug }
    );
    if (result.error) throw new Error(result.error);
    return result.data!;
  },
};
