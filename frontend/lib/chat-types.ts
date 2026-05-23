export type ConversationType = "workspace" | "direct" | "group";

export interface ChatUser {
  id: string;
  full_name?: string | null;
  email?: string;
  avatar_url?: string | null;
}

export interface ChatConversation {
  id: string;
  tenant_id: string;
  type: ConversationType;
  title?: string | null;
  avatar_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  participants?: ChatParticipant[];
  _other_user?: ChatParticipant;
  _last_message?: ChatMessage | null;
  _unread_count?: number;
}

export interface ChatParticipant {
  user_id: string;
  last_read_at?: string | null;
  joined_at?: string;
  user?: ChatUser;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  reply_to_id?: string | null;
  created_at: string;
  updated_at: string;
  users?: ChatUser;
}

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
  trace_id: string;
}
