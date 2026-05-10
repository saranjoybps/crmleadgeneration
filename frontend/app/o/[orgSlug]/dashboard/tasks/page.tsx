import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

type TasksPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

const KANBAN_STATUSES = ["open", "in_progress", "review", "hold", "closed"] as const;

function resolveJoinedUserEmail(value: unknown): string {
  if (Array.isArray(value)) return String(value[0]?.email ?? "unknown");
  if (value && typeof value === "object" && "email" in value) return String((value as { email?: string }).email ?? "unknown");
  return "unknown";
}

function resolveJoinedTicketTitle(value: unknown): string {
  if (Array.isArray(value)) return String(value[0]?.title ?? "-");
  if (value && typeof value === "object" && "title" in value) return String((value as { title?: string }).title ?? "-");
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

async function createTask(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const ticketId = String(formData.get("ticket_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assigneeIds = String(formData.get("assignee_user_ids") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const path = `/o/${orgSlug}/dashboard/tasks`;

  const org = await getOrganizationContextOrRedirect(orgSlug);
  const api = await getApiContext(orgSlug);
  if (!api) {
    redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  }
  if (!(org.role === "owner" || org.role === "admin")) {
    redirect(`${path}?error=${encodeURIComponent("Only owner/admin can create tasks.")}`);
  }

  const resp = await fetch(`${api.apiBase}/api/v1/tasks/ticket/${encodeURIComponent(ticketId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api.accessToken}`,
      "X-Org-Slug": orgSlug,
    },
    body: JSON.stringify({
      title,
      description: description || null,
      status: "open",
      assignee_user_ids: assigneeIds,
    }),
    cache: "no-store",
  });
  const payload = (await resp.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!resp.ok) {
    redirect(`${path}?error=${encodeURIComponent(payload?.error?.message ?? `Unable to create task (${resp.status})`)}`);
  }

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task created.")}`);
}

async function updateTaskStatus(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tasks`;

  const api = await getApiContext(orgSlug);
  if (!api) {
    redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  }
  const org = await getOrganizationContextOrRedirect(orgSlug);
  if (org.role === "client") {
    redirect(`${path}?error=${encodeURIComponent("Clients can only view tasks.")}`);
  }
  if (!KANBAN_STATUSES.includes(status as (typeof KANBAN_STATUSES)[number])) {
    redirect(`${path}?error=${encodeURIComponent("Invalid status.")}`);
  }

  const resp = await fetch(`${api.apiBase}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api.accessToken}`,
      "X-Org-Slug": orgSlug,
    },
    body: JSON.stringify({ status }),
    cache: "no-store",
  });
  const payload = (await resp.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!resp.ok) {
    redirect(`${path}?error=${encodeURIComponent(payload?.error?.message ?? `Unable to update task (${resp.status})`)}`);
  }
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task status updated.")}`);
}

export default async function TasksPage({ params, searchParams }: TasksPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  const api = await getApiContext(orgSlug);
  if (!api) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">API base URL or session missing.</p>;
  }

  const [ticketsResp, tasksResp, usersResp] = await Promise.all([
    fetch(`${api.apiBase}/api/v1/tickets`, {
      headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
      cache: "no-store",
    }),
    fetch(`${api.apiBase}/api/v1/tasks`, {
      headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
      cache: "no-store",
    }),
    (org.role === "owner" || org.role === "admin")
      ? fetch(`${api.apiBase}/api/v1/users?limit=200&offset=0`, {
          headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
          cache: "no-store",
        })
      : Promise.resolve(null),
  ]);

  const ticketsBody = (await ticketsResp.json().catch(() => null)) as { data?: Array<{ id: string; title: string }>; error?: { message?: string } } | null;
  const tasksBody = (await tasksResp.json().catch(() => null)) as { data?: Array<{ id: string; title: string; description?: string; status: string; ticket_id: string }>; error?: { message?: string } } | null;
  const usersBody = usersResp
    ? ((await usersResp.json().catch(() => null)) as { data?: Array<{ user_id: string; users?: unknown }>; error?: { message?: string } } | null)
    : null;

  if (!ticketsResp.ok || !tasksResp.ok || (usersResp && !usersResp.ok)) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{ticketsBody?.error?.message ?? tasksBody?.error?.message ?? usersBody?.error?.message ?? "Failed to load tasks module data."}</p>;
  }
  const tickets = ticketsBody?.data ?? [];
  const ticketTitleById = new Map(tickets.map((t) => [t.id, t.title]));
  const tasks = tasksBody?.data ?? [];
  const users = usersBody?.data ?? [];

  return (
    <section className="space-y-6">
      {query.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p> : null}
      {query.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{query.success}</p> : null}

      {(org.role === "owner" || org.role === "admin") ? (
        <article className="surface-card rounded-2xl border p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-main">Create Task</h2>
          <form action={createTask} className="mt-4 grid gap-3">
            <input type="hidden" name="organization_slug" value={org.organization_slug} />
            <select name="ticket_id" required className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
              <option value="">Select ticket</option>
              {(tickets ?? []).map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.title}</option>)}
            </select>
            <input name="title" required placeholder="Task title" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <textarea name="description" placeholder="Task description" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <input name="assignee_user_ids" placeholder="Assignee user IDs (comma-separated)" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <button type="submit" className="w-fit rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Create Task</button>
          </form>
          <div className="mt-3 text-xs text-muted">
            Active users: {(users ?? []).map((row) => `${resolveJoinedUserEmail((row as { users?: unknown }).users)} (${row.user_id})`).join(", ")}
          </div>
        </article>
      ) : null}

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-main">Task Board</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-5">
          {KANBAN_STATUSES.map((status) => (
            <div key={status} className="rounded-xl border border-soft p-3">
              <p className="mb-3 text-sm font-semibold uppercase text-main">{status}</p>
              <div className="space-y-2">
                {(tasks ?? [])
                  .filter((task) => task.status === status)
                  .map((task) => (
                    <div key={task.id} className="rounded-lg border border-soft p-2">
                      <p className="text-sm font-semibold text-main">{task.title}</p>
                      <p className="text-xs text-muted">{ticketTitleById.get(task.ticket_id) ?? resolveJoinedTicketTitle((task as { tickets?: unknown }).tickets)}</p>
                      {(org.role === "owner" || org.role === "admin" || org.role === "member") ? (
                        <form action={updateTaskStatus} className="mt-2 flex gap-2">
                          <input type="hidden" name="organization_slug" value={org.organization_slug} />
                          <input type="hidden" name="task_id" value={task.id} />
                          <select name="status" defaultValue={task.status} className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs">
                            {KANBAN_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
                          </select>
                          <button type="submit" className="rounded-md border border-soft px-2 py-1 text-xs">Save</button>
                        </form>
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
