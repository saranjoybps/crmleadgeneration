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
import { getPermissions } from "@/lib/api-data";
import { createClient } from "@/lib/supabase/server";
import { apiRequest } from "@/lib/api-server";
import DashboardLoading from "./loading";

type DashboardLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
};

async function getLayoutData(orgSlug: string) {
  const supabase = await createClient();
  const orgPromise = getOrganizationContextOrRedirect(orgSlug);
  const permissionsPromise = getPermissions(orgSlug);

  const [org, permissionsResponse] = await Promise.all([orgPromise, permissionsPromise]);

  const supabase2 = await createClient();
  const userPromise = supabase2.auth.getUser();
  const avatarPromise = supabase2.from("users").select("avatar_url").eq("auth_user_id", (await userPromise).data.user?.id ?? "").maybeSingle();
  const departmentPromise = apiRequest<{ department_id: string | null; department_name: string | null }>("/api/v1/auth/department", { orgSlug });

  const [{ data: { user } }, { data: dbUser }, departmentResponse] = await Promise.all([userPromise, avatarPromise, departmentPromise]);

  if (!user) {
    redirect("/login");
  }

  const profileInitial = (user.email?.trim().charAt(0) || "U").toUpperCase();
  const permissionModules = permissionsResponse.data?.modules ?? [];
  const avatarUrl = dbUser?.avatar_url;
  const departmentName = departmentResponse.error ? undefined : departmentResponse.data?.department_name || undefined;

  return { user, org, permissionsResponse, permissionModules, avatarUrl, departmentName, profileInitial };
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { orgSlug } = await params;
  const { user, org, permissionsResponse, permissionModules, avatarUrl, departmentName, profileInitial } = await getLayoutData(orgSlug);

  const allowedModuleKeys = new Set(
    permissionModules.filter((module) => module.permissions.can_view).map((module) => module.key),
  );

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
