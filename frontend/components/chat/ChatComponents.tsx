"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Users,
  Hash,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  MoreHorizontal,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { ChatConversation, ChatMessage, ChatUser } from "@/lib/chat-types";
import { UseChatResult } from "@/hooks/useChat";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

interface ChatSidebarProps {
  chat: UseChatResult;
  orgSlug: string;
  currentUserId?: string;
  onNewDm: () => void;
  onNewGroup: () => void;
}

export function ChatSidebar({ chat, currentUserId, onNewDm, onNewGroup }: ChatSidebarProps) {
  const {
    conversations,
    activeConversation,
    loadingConversations,
    selectConversation,
    getConversationName,
    getConversationAvatar,
  } = chat;

  const workspaceConversations = conversations.filter((c) => c.type === "workspace");
  const directConversations = conversations.filter((c) => c.type === "direct");
  const groupConversations = conversations.filter((c) => c.type === "group");

  const ConversationItem = ({ conv }: { conv: ChatConversation }) => {
    const isActive = activeConversation?.id === conv.id;
    const name = getConversationName(conv);
    const avatar = getConversationAvatar(conv);
    const unread = conv._unread_count || 0;
    const lastMsg = conv._last_message;

    return (
      <button
        onClick={() => selectConversation(conv)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group",
          isActive
            ? "bg-violet-100 text-violet-900"
            : "hover:bg-slate-100 text-slate-700"
        )}
      >
        <div className="relative flex-shrink-0">
          {conv.type === "direct" ? (
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-5 h-5 text-slate-500" />
              )}
            </div>
          ) : conv.type === "group" ? (
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-600" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Hash className="w-5 h-5 text-emerald-600" />
            </div>
          )}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold truncate">{name}</p>
            {lastMsg && (
              <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                {format(new Date(lastMsg.created_at), "HH:mm")}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {lastMsg
              ? lastMsg.content.length > 50
                ? lastMsg.content.slice(0, 50) + "..."
                : lastMsg.content
              : conv.type === "direct"
                ? "Start a conversation"
                : "No messages yet"}
          </p>
        </div>
      </button>
    );
  };

  if (loadingConversations) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Chats</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="p-4 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Chats</h2>
          <div className="flex gap-1">
            <button
              onClick={onNewDm}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              title="New Direct Message"
            >
              <MessageSquare className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={onNewGroup}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              title="New Group"
            >
              <UserPlus className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {workspaceConversations.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Workspace
            </p>
            {workspaceConversations.map((conv) => (
              <ConversationItem key={conv.id} conv={conv} />
            ))}
          </div>
        )}

        {directConversations.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Direct Messages
            </p>
            {directConversations.map((conv) => (
              <ConversationItem key={conv.id} conv={conv} />
            ))}
          </div>
        )}

        {groupConversations.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Groups
            </p>
            {groupConversations.map((conv) => (
              <ConversationItem key={conv.id} conv={conv} />
            ))}
          </div>
        )}

        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No conversations yet</p>
            <p className="text-xs text-slate-400 mt-1">Start a DM or create a group</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: ChatMessage[];
  users: Map<string, ChatUser>;
  currentUserId?: string;
  loading: boolean;
  onDeleteMessage?: (messageId: string) => void;
}

export function MessageList({
  messages,
  users,
  currentUserId,
  loading,
  onDeleteMessage,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <MessageSquare className="w-16 h-16 text-slate-200 mb-4" />
        <p className="text-sm font-medium text-slate-600">No messages yet</p>
        <p className="text-xs text-slate-400 mt-1">Be the first to say hello!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {messages.map((msg) => {
        const sender = users.get(msg.sender_id);
        const isOwn = currentUserId === msg.sender_id;

        return (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 group",
              isOwn ? "flex-row-reverse" : ""
            )}
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {sender?.avatar_url ? (
                <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-slate-500">
                  {sender?.full_name?.[0]?.toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div className={cn("max-w-md", isOwn ? "items-end" : "items-start")}>
              <div className={cn("flex items-center gap-2 mb-1", isOwn ? "flex-row-reverse" : "")}>
                <span className="text-xs font-semibold text-slate-600">
                  {sender?.full_name || "Unknown"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {format(new Date(msg.created_at), "HH:mm")}
                </span>
                {isOwn && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setShowDeleteConfirm(showDeleteConfirm === msg.id ? null : msg.id)
                      }
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    {showDeleteConfirm === msg.id && (
                      <div className="absolute right-0 top-6 bg-white shadow-lg rounded-lg border border-slate-200 p-2 z-10">
                        <button
                          onClick={() => {
                            onDeleteMessage?.(msg.id);
                            setShowDeleteConfirm(null);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm max-w-sm break-words",
                  isOwn
                    ? "bg-violet-600 text-white rounded-tr-sm"
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || disabled) return;
    onSend(content.trim());
    setContent("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 bg-white">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition-all"
        />
        <button
          type="submit"
          disabled={disabled || !content.trim()}
          className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

interface CreateDmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<ChatUser[]>;
  existingDmUserIds: Set<string>;
}

export function CreateDmModal({
  isOpen,
  onClose,
  onSelectUser,
  searchUsers,
  existingDmUserIds,
}: CreateDmModalProps) {
  const [search, setSearch] = useState("");
  const [rawResults, setRawResults] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const searchUsersRef = useRef(searchUsers);
  searchUsersRef.current = searchUsers;

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setRawResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const users = await searchUsersRef.current(search);
      setRawResults(users);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, isOpen]);

  const results = rawResults.filter((u) => !existingDmUserIds.has(u.id));

  const handleSelect = async (userId: string) => {
    setCreating(true);
    try {
      await onSelectUser(userId);
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Direct Message" size="md">
      <div className="space-y-4">
        <Input
          label="Search users"
          placeholder="Start typing to search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-80 overflow-y-auto space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              {search ? "No users found" : "Start typing to search users"}
            </div>
          )}
          {!loading &&
            results.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelect(user.id)}
                disabled={creating}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-slate-500">
                      {user.full_name?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {user.full_name || "Unknown User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                )}
              </button>
            ))}
        </div>
      </div>
    </Modal>
  );
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, memberUserIds: string[]) => Promise<void>;
  searchUsers: (query: string) => Promise<ChatUser[]>;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onCreate,
  searchUsers,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ChatUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const searchUsersRef = useRef(searchUsers);
  searchUsersRef.current = searchUsers;

  useEffect(() => {
    if (!isOpen) {
      setGroupName("");
      setSearch("");
      setResults([]);
      setSelected(new Set());
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const users = await searchUsersRef.current(search);
      setResults(users);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, isOpen]);

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.size < 1) return;
    setCreating(true);
    try {
      await onCreate(groupName.trim(), Array.from(selected));
      onClose();
    } finally {
      setCreating(false);
    }
  };

  const selectedUsers = results.filter((u) => selected.has(u.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Group" size="md">
      <div className="space-y-4">
        <Input
          label="Group Name"
          placeholder="e.g. Engineering Team"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        {selected.size > 0 && (
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Selected ({selected.size})
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-medium"
                >
                  {u.full_name || u.email}
                  <button onClick={() => toggleUser(u.id)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <Input
          label="Add members"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-60 overflow-y-auto space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          )}
          {!loading && results.length === 0 && search && (
            <div className="text-center py-6 text-slate-500 text-sm">No users found</div>
          )}
          {!loading &&
            results.map((user) => {
              const isSelected = selected.has(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-slate-500">
                        {user.full_name?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {user.full_name || "Unknown User"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-violet-600 border-violet-600"
                        : "border-slate-300"
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>
              );
            })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!groupName.trim() || selected.size < 1 || creating}
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Create Group"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface EmptyStateProps {
  chat: UseChatResult;
}

export function ChatEmptyState({}: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <MessageSquare className="w-10 h-10 text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">No conversation selected</h3>
      <p className="text-sm text-slate-500 max-w-sm">
        Select a conversation from the sidebar, or start a new direct message or group chat
      </p>
    </div>
  );
}
