"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import {
  ChatSidebar,
  MessageList,
  MessageInput,
  CreateDmModal,
  CreateGroupModal,
  ChatEmptyState,
} from "@/components/chat/ChatComponents";
import { Loader2 } from "lucide-react";

interface ChatPageClientProps {
  currentUserId?: string;
  tenantId?: string;
}

export function ChatPageClient({ currentUserId, tenantId }: ChatPageClientProps) {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [showDmModal, setShowDmModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [pendingConvId, setPendingConvId] = useState<string | undefined>();

  const chat = useChat({
    orgSlug,
    currentUserId,
    tenantId,
  });

  const {
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
    sendMessage,
    deleteMessage,
    startDirectConversation,
    createGroupConversation,
    searchUsers,
    getConversationName,
  } = chat;

  useEffect(() => {
    if (orgSlug) {
      loadConversations();
    }
  }, [orgSlug, loadConversations]);

  useEffect(() => {
    if (pendingConvId) {
      const conv = conversations.find((c) => c.id === pendingConvId);
      if (conv) {
        selectConversation(conv);
        setPendingConvId(undefined);
      }
    }
  }, [pendingConvId, conversations, selectConversation]);

  const existingDmUserIds = useMemo(
    () =>
      new Set(
        conversations
          .filter((c) => c.type === "direct" && c._other_user?.user?.id)
          .map((c) => c._other_user!.user!.id)
      ),
    [conversations]
  );

  const handleSelectDmUser = async (userId: string) => {
    const convId = await startDirectConversation(userId);
    setPendingConvId(convId);
  };

  const handleCreateGroup = async (title: string, memberUserIds: string[]) => {
    const conv = await createGroupConversation(title, memberUserIds);
    await selectConversation(conv);
  };

  return (
    <div className="flex h-full bg-white rounded-2xl border border-soft overflow-hidden shadow-sm">
      <div className="w-80 border-r border-slate-200 flex-shrink-0">
        <ChatSidebar
          chat={chat}
          orgSlug={orgSlug}
          currentUserId={currentUserId}
          onNewDm={() => setShowDmModal(true)}
          onNewGroup={() => setShowGroupModal(true)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {activeConversation ? (
          <>
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                  {activeConversation.type === "workspace" ? (
                    <span className="text-xs font-bold text-emerald-600">#</span>
                  ) : activeConversation.type === "group" ? (
                    <span className="text-xs font-bold text-sky-600">
                      {activeConversation.title?.[0]?.toUpperCase() || "G"}
                    </span>
                  ) : activeConversation._other_user?.user?.avatar_url ? (
                    <img
                      src={activeConversation._other_user.user.avatar_url}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-500">
                      {activeConversation._other_user?.user?.full_name?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    {getConversationName(activeConversation)}
                  </h2>
                  <p className="text-[10px] text-slate-500 capitalize">
                    {activeConversation.type === "workspace"
                      ? "Workspace Channel"
                      : activeConversation.type === "direct"
                        ? "Direct Message"
                        : `Group - ${activeConversation.participants?.length || 0} members`}
                  </p>
                </div>
              </div>
            </div>

            <MessageList
              messages={messages}
              users={users}
              currentUserId={currentUserId}
              loading={loadingMessages}
              onDeleteMessage={deleteMessage}
            />

            <MessageInput onSend={sendMessage} disabled={sendingMessage} />
          </>
        ) : (
          <ChatEmptyState chat={chat} />
        )}
      </div>

      <CreateDmModal
        isOpen={showDmModal}
        onClose={() => setShowDmModal(false)}
        onSelectUser={handleSelectDmUser}
        searchUsers={searchUsers}
        existingDmUserIds={existingDmUserIds}
      />

      <CreateGroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onCreate={handleCreateGroup}
        searchUsers={searchUsers}
      />

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
