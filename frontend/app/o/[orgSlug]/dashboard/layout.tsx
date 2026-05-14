import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ProfileMenu } from "@/components/ProfileMenu";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

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
  // Fetch avatar from users table as requested
  const { data: dbUser } = await supabase
    .from("users")
    .select("avatar_url")
    .eq("auth_user_id", user.id)
    .single();

  const avatarUrl = dbUser?.avatar_url;

  return (
    <main className="h-screen overflow-hidden">
      <div className="flex h-full flex-col overflow-hidden surface-panel md:flex-row">
        <DashboardSidebar
          email={user.email ?? "unknown@joycrm.app"}
          basePath={`/o/${org.organization_slug}`}
          organizationName={org.organization_name}
          role={org.role}
          avatarUrl={avatarUrl}
        />
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--dashboard-bg)]">
          <header className="surface-panel border-b border-soft px-5 py-4 md:px-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="mt-1 text-lg font-semibold uppercase text-main">{org.organization_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Help"
                  title="Help"
                >
                  ?
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  !
                </button>
                <ProfileMenu
                  email={user.email ?? "unknown@joycrm.app"}
                  role={org.role}
                  initial={profileInitial}
                  avatarUrl={avatarUrl}
                />
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
