import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/DashboardSidebar";
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

  return (
    <main className="h-screen overflow-hidden">
      <div className="flex h-full flex-col overflow-hidden surface-panel md:flex-row">
        <DashboardSidebar
          email={user.email ?? "unknown@joycrm.app"}
          basePath={`/o/${org.organization_slug}`}
          organizationName={org.organization_name}
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
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M12 18h.01M9.4 9a2.6 2.6 0 1 1 4.4 1.9c-.7.6-1.3 1.1-1.3 2.1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M15 17H9m9-1V11a6 6 0 1 0-12 0v5l-2 2h16l-2-2Zm-4 4a2 2 0 0 1-4 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                  aria-label="Profile"
                  title={user.email ?? "Profile"}
                >
                  {profileInitial}
                </button>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
