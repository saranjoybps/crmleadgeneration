import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

type TicketsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; project_id?: string }>;
};

function resolveJoinedProjectName(value: unknown): string {
  if (Array.isArray(value)) return String(value[0]?.name ?? "-");
  if (value && typeof value === "object" && "name" in value) return String((value as { name?: string }).name ?? "-");
  return "-";
}

async function getApiContext(orgSlug: string) {
  const supabase = await createClient();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!apiBase || !accessToken) return null;
  return { apiBase, accessToken };
}

async function createTicket(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "other").trim();
  const path = `/o/${orgSlug}/dashboard/tickets`;

  const api = await getApiContext(orgSlug);
  if (!api) {
    redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  }
  if (!title || !projectId) {
    redirect(`${path}?error=${encodeURIComponent("Project and title are required.")}`);
  }

  const resp = await fetch(`${api.apiBase}/api/v1/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api.accessToken}`,
      "X-Org-Slug": orgSlug,
    },
    body: JSON.stringify({
      project_id: projectId,
      title,
      description: description || null,
      type,
      status: "open",
    }),
    cache: "no-store",
  });
  const payload = (await resp.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!resp.ok) {
    redirect(`${path}?error=${encodeURIComponent(payload?.error?.message ?? `Failed to create ticket (${resp.status})`)}`);
  }
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Ticket created.")}`);
}

export default async function TicketsPage({ params, searchParams }: TicketsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  const api = await getApiContext(orgSlug);
  if (!api) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">API base URL or session missing.</p>;
  }
  const selectedProject = query.project_id ?? "";

  const [projectsResp, ticketsResp] = await Promise.all([
    fetch(`${api.apiBase}/api/v1/projects`, {
      headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
      cache: "no-store",
    }),
    fetch(`${api.apiBase}/api/v1/tickets${selectedProject ? `?project_id=${encodeURIComponent(selectedProject)}` : ""}`, {
      headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
      cache: "no-store",
    }),
  ]);

  const projectsBody = (await projectsResp.json().catch(() => null)) as { data?: Array<{ id: string; name: string }>; error?: { message?: string } } | null;
  const ticketsBody = (await ticketsResp.json().catch(() => null)) as { data?: Array<{ id: string; title: string; type: string; status: string; project_id: string }>; error?: { message?: string } } | null;
  if (!projectsResp.ok || !ticketsResp.ok) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{projectsBody?.error?.message ?? ticketsBody?.error?.message ?? "Failed to load tickets."}</p>;
  }
  const projects = projectsBody?.data ?? [];
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const tickets = ticketsBody?.data ?? [];

  return (
    <section className="space-y-6">
      {query.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p> : null}
      {query.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{query.success}</p> : null}

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-main">Create Ticket</h2>
        <form action={createTicket} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="organization_slug" value={org.organization_slug} />
          <select name="project_id" required className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">Select project</option>
            {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select name="type" defaultValue="other" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
            <option value="feature">feature</option>
            <option value="bug">bug</option>
            <option value="improvement">improvement</option>
            <option value="recommendation">recommendation</option>
            <option value="other">other</option>
          </select>
          <input name="title" required placeholder="Ticket title" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm md:col-span-2" />
          <textarea name="description" placeholder="Description" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm md:col-span-2" />
          <button type="submit" className="w-fit rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Create Ticket</button>
        </form>
      </article>

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-main">Tickets</h2>
        <div className="mt-4 space-y-3">
          {(tickets ?? []).length === 0 ? <p className="text-sm text-muted">No tickets found.</p> : null}
          {(tickets ?? []).map((ticket) => (
            <div key={ticket.id} className="rounded-xl border border-soft p-4">
              <p className="font-semibold text-main">{ticket.title}</p>
              <p className="text-sm text-muted">
                {projectNameById.get(ticket.project_id) ?? resolveJoinedProjectName((ticket as { projects?: unknown }).projects)} | {ticket.type} | {ticket.status}
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
