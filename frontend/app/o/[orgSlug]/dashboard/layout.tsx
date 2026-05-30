import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Bell, MessageSquare } from "lucide-react";
import Link from "next/link";

import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ProfileMenu } from "@/components/ProfileMenu";
import SearchBar from "@/components/SearchBar";
import FullscreenToggle from "@/components/FullscreenToggle";
import HelpButton from "@/components/HelpButton";
import { PermissionsProvider } from "@/lib/permissions";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { apiRequest } from "@/lib/api-server";
import DashboardLoading from "./loading";

type DashboardLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
};

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const org = await getOrganizationContextOrRedirect(orgSlug);
  const profileInitial = (user.email?.trim().charAt(0) || "U").toUpperCase();

  const permissionsResponse = await apiRequest<{
    role: { key: string; label: string };
    modules: Array<{
      key: string;
      label: string;
      permissions: {
        can_view: boolean;
        can_create: boolean;
        can_edit: boolean;
        can_delete: boolean;
      };
    }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });

  const permissionModules = permissionsResponse.data?.modules ?? [];
  const allowedModuleKeys = new Set(
    permissionModules.filter((module) => module.permissions.can_view).map((module) => module.key),
  );


  // Fetch avatar from users table as requested
  const { data: dbUser } = await supabase
    .from("users")
    .select("avatar_url")
    .eq("auth_user_id", user.id)
    .single();

  const avatarUrl = dbUser?.avatar_url;

  // Fetch user's department information
  const departmentResponse = await apiRequest<{
    department_id: string | null;
    department_name: string | null;
  }>("/api/v1/auth/department", { orgSlug, cache: "no-store" });

  const departmentName = departmentResponse.error ? undefined : departmentResponse.data?.department_name || undefined;

  return (
    <PermissionsProvider permissions={permissionsResponse.data || { role: { key: org.role, label: "" }, modules: [] }}>
      <main className="h-screen overflow-hidden">
        <div className="flex h-full flex-col overflow-hidden surface-panel md:flex-row">
          <DashboardSidebar
            email={user.email ?? "unknown@joyerp.app"}
            basePath={`/o/${org.organization_slug}`}
            organizationName={org.organization_name}
            role={org.role}
            avatarUrl={avatarUrl}
            allowedModuleKeys={allowedModuleKeys}
          />
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--dashboard-bg)]">
            <header className="surface-panel border-b border-soft px-5 py-4 md:px-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <SearchBar orgSlug={org.organization_slug} />
                </div>
                 <div className="flex items-center gap-2">
                    <Link
                     href={`/o/${org.organization_slug}/dashboard/chat`}
                     className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                     aria-label="Chat"
                     title="Chat"
                   >
                     <MessageSquare className="h-5 w-5" />
                   </Link>
                    <HelpButton orgSlug={org.organization_slug} />
                    <FullscreenToggle />
                    <button
                     type="button"
                     className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                     aria-label="Notifications"
                     title="Notifications"
                   >
                     <Bell className="h-5 w-5" />
                   </button>
                  <ProfileMenu
                    email={user.email ?? "unknown@joyerp.app"}
                    role={org.role}
                    initial={profileInitial}
                    avatarUrl={avatarUrl}
                    departmentName={departmentName}
                  />
                </div>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <Suspense fallback={<DashboardLoading />}>
                {children}
              </Suspense>
            </div>
          </section>
        </div>
      </main>
    </PermissionsProvider>
  );
}
