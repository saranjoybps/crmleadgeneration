import { getOrganizationContextOrRedirect } from "@/lib/organizations";

export default async function DashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const org = await getOrganizationContextOrRedirect(orgSlug);

  return (
    <section className="space-y-6">
      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-main">Workspace Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Welcome to {org.organization_name}. Manage users and workspace settings from the sidebar.</p>
      </article>

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-main">Getting Started</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
          <li>Create projects and map users/clients from Projects.</li>
          <li>Clients can raise project tickets from Tickets.</li>
          <li>Track linked task execution in the Tasks Kanban board.</li>
        </ul>
      </article>
    </section>
  );
}
