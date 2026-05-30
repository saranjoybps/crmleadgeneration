import { Suspense } from "react";
import { MessageSquare } from "lucide-react";
import dynamic from "next/dynamic";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

const ChatPageClient = dynamic(() => import("@/components/chat/ChatPageClient").then((m) => m.ChatPageClient), {
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
    </div>
  ),
});

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function ChatPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const org = await getOrganizationContextOrRedirect(orgSlug);

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });

  const chatPerm = permissionsResponse.data?.modules.find((m) => m.key === "chat")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };

  if (!chatPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view chat.</p>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted">Please log in to use chat.</p>
      </div>
    );
  }

  const { data: appUserId } = await supabase.rpc("ensure_app_user");
  const tenantId = org.organization_id;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-violet-600 uppercase tracking-widest mb-1">
            <MessageSquare className="h-4 w-4" />
            Chat
          </div>
          <h1 className="text-3xl font-black tracking-tight text-main">Messages</h1>
          <p className="mt-1 text-muted text-lg">
            Chat with your team members in real-time.
          </p>
        </div>
      </header>

      <div className="h-[calc(100vh-20rem)] min-h-[500px]">
        <ChatPageClient currentUserId={appUserId} tenantId={tenantId} />
      </div>
    </div>
  );
}
