import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

type TasksPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; drawer?: "create" | "edit" | "assignees" | "delete"; task_id?: string; ticket_id?: string }>;
};

type TaskRow = { id: string; title: string; description?: string; status: string; ticket_id: string };
type TicketRow = { id: string; title: string };

const KANBAN_STATUSES = ["open", "in_progress", "review", "hold", "closed"] as const;

function resolveJoinedUserEmail(value: unknown): string {
  if (Array.isArray(value)) return String(value[0]?.email ?? "unknown");
  if (value && typeof value === "object" && "email" in value) return String((value as { email?: string }).email ?? "unknown");
  return "unknown";
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
  const assigneeIds = formData.getAll("assignee_user_ids").map((x) => String(x).trim()).filter(Boolean);
  const path = `/o/${orgSlug}/dashboard/tasks`;

  const api = await getApiContext(orgSlug);
  if (!api) redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  const resp = await fetch(`${api.apiBase}/api/v1/tasks/ticket/${encodeURIComponent(ticketId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
    body: JSON.stringify({ title, description: description || null, status: "open", assignee_user_ids: assigneeIds }),
    cache: "no-store",
  });
  const payload = (await resp.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!resp.ok) redirect(`${path}?error=${encodeURIComponent(payload?.error?.message ?? "Unable to create task")}`);
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
  if (!api) redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  const resp = await fetch(`${api.apiBase}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
    body: JSON.stringify({ status }),
    cache: "no-store",
  });
  const payload = (await resp.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!resp.ok) redirect(`${path}?error=${encodeURIComponent(payload?.error?.message ?? "Unable to update status")}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task status updated.")}`);
}

async function updateTask(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tasks`;
  const api = await getApiContext(orgSlug);
  if (!api) redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  const body: Record<string, string | null> = {};
  if (title) body.title = title;
  body.description = description || null;
  if (status) body.status = status;
  const resp = await fetch(`${api.apiBase}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!resp.ok) redirect(`${path}?error=${encodeURIComponent("Failed to update task.")}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task updated.")}`);
}

async function updateTaskAssignees(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const addUserIds = formData.getAll("add_user_ids").map((x) => String(x).trim()).filter(Boolean);
  const removeUserIds = formData.getAll("remove_user_ids").map((x) => String(x).trim()).filter(Boolean);
  const path = `/o/${orgSlug}/dashboard/tasks`;
  const api = await getApiContext(orgSlug);
  if (!api) redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  const resp = await fetch(`${api.apiBase}/api/v1/tasks/${encodeURIComponent(taskId)}/assignees`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
    body: JSON.stringify({ add_user_ids: addUserIds, remove_user_ids: removeUserIds }),
    cache: "no-store",
  });
  if (!resp.ok) redirect(`${path}?error=${encodeURIComponent("Failed to update assignees.")}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task assignees updated.")}`);
}

async function deleteTask(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tasks`;
  const api = await getApiContext(orgSlug);
  if (!api) redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  const resp = await fetch(`${api.apiBase}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
    cache: "no-store",
  });
  if (!resp.ok) redirect(`${path}?error=${encodeURIComponent("Failed to delete task.")}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task deleted.")}`);
}

export default async function TasksPage({ params, searchParams }: TasksPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  const api = await getApiContext(orgSlug);
  if (!api) return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">API base URL or session missing.</p>;

  const [ticketsResp, tasksResp, usersResp] = await Promise.all([
    fetch(`${api.apiBase}/api/v1/tickets`, { headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug }, cache: "no-store" }),
    fetch(`${api.apiBase}/api/v1/tasks`, { headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug }, cache: "no-store" }),
    (org.role === "owner" || org.role === "admin")
      ? fetch(`${api.apiBase}/api/v1/users?limit=200&offset=0`, { headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug }, cache: "no-store" })
      : Promise.resolve(null),
  ]);

  const ticketsBody = (await ticketsResp.json().catch(() => null)) as { data?: TicketRow[]; error?: { message?: string } } | null;
  const tasksBody = (await tasksResp.json().catch(() => null)) as { data?: TaskRow[]; error?: { message?: string } } | null;
  const usersBody = usersResp ? ((await usersResp.json().catch(() => null)) as { data?: Array<{ user_id: string; users?: unknown }> } | null) : null;
  if (!ticketsResp.ok || !tasksResp.ok) return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{ticketsBody?.error?.message ?? tasksBody?.error?.message ?? "Failed to load tasks module data."}</p>;

  const tickets = ticketsBody?.data ?? [];
  const tasks = tasksBody?.data ?? [];
  const users = usersBody?.data ?? [];
  const ticketTitleById = new Map(tickets.map((t) => [t.id, t.title]));
  const selectedTask = tasks.find((t) => t.id === query.task_id);
  const selectedTicketId = query.ticket_id ?? selectedTask?.ticket_id ?? "";

  return (
    <section className="space-y-6">
      {query.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p> : null}
      {query.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{query.success}</p> : null}

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-main">Task Board</h2>
          {(org.role === "owner" || org.role === "admin") ? (
            <Link href={`/o/${org.organization_slug}/dashboard/tasks?drawer=create${selectedTicketId ? `&ticket_id=${encodeURIComponent(selectedTicketId)}` : ""}`} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">
              Create Task
            </Link>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {KANBAN_STATUSES.map((status) => (
            <div key={status} className="rounded-xl border border-soft p-3">
              <p className="mb-3 text-sm font-semibold uppercase text-main">{status}</p>
              <div className="space-y-2">
                {tasks.filter((task) => task.status === status).map((task) => (
                  <div key={task.id} className="rounded-lg border border-soft bg-white p-3">
                    <Link href={`/o/${org.organization_slug}/dashboard/tasks?drawer=edit&task_id=${encodeURIComponent(task.id)}`} className="text-sm font-semibold text-main hover:underline">{task.title}</Link>
                    <p className="text-xs text-muted">{ticketTitleById.get(task.ticket_id) ?? "-"}</p>
                    {(org.role === "owner" || org.role === "admin" || org.role === "member") ? (
                      <form action={updateTaskStatus} className="mt-2 flex gap-2">
                        <input type="hidden" name="organization_slug" value={org.organization_slug} />
                        <input type="hidden" name="task_id" value={task.id} />
                        <select name="status" defaultValue={task.status} className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs">
                          {KANBAN_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
                        </select>
                        <button type="submit" className="rounded-md border border-soft px-2 py-1 text-xs">Move</button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </article>

      {query.drawer && (
        <div className="fixed inset-0 z-50 bg-black/35">
          <div className="absolute inset-y-0 right-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-soft bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-main">
                {query.drawer === "create" ? "Create Task" : query.drawer === "edit" ? "Edit Task" : query.drawer === "assignees" ? "Manage Assignees" : "Delete Task"}
              </h3>
              <Link href={`/o/${org.organization_slug}/dashboard/tasks`} className="rounded-md border border-soft px-2 py-1 text-xs">Close</Link>
            </div>
            <div className="space-y-5 p-6">
              {query.drawer === "create" && (org.role === "owner" || org.role === "admin") ? (
                <form action={createTask} className="grid gap-3">
                  <input type="hidden" name="organization_slug" value={org.organization_slug} />
                  <label className="text-sm font-medium text-main">Ticket</label>
                  <select name="ticket_id" required defaultValue={selectedTicketId} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    <option value="">Select ticket</option>
                    {tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.title}</option>)}
                  </select>
                  <label className="text-sm font-medium text-main">Task title</label>
                  <input name="title" required className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  <label className="text-sm font-medium text-main">Description</label>
                  <textarea name="description" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                  <label className="text-sm font-medium text-main">Assign users</label>
                  <select name="assignee_user_ids" multiple className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    {users.map((row) => <option key={row.user_id} value={row.user_id}>{resolveJoinedUserEmail((row as { users?: unknown }).users)}</option>)}
                  </select>
                  <button type="submit" className="w-fit rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Create Task</button>
                </form>
              ) : null}

              {query.drawer === "edit" && selectedTask ? (
                <div className="space-y-3">
                  <form action={updateTask} className="grid gap-3">
                    <input type="hidden" name="organization_slug" value={org.organization_slug} />
                    <input type="hidden" name="task_id" value={selectedTask.id} />
                    <label className="text-sm font-medium text-main">Task title</label>
                    <input name="title" defaultValue={selectedTask.title} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    <label className="text-sm font-medium text-main">Description</label>
                    <textarea name="description" defaultValue={selectedTask.description ?? ""} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    <label className="text-sm font-medium text-main">Status</label>
                    <select name="status" defaultValue={selectedTask.status} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                      {KANBAN_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                    <button type="submit" className="w-fit rounded-xl border border-soft px-4 py-2.5 text-sm">Save</button>
                  </form>
                  {(org.role === "owner" || org.role === "admin") ? (
                    <div className="flex gap-2">
                      <Link href={`/o/${org.organization_slug}/dashboard/tasks?drawer=assignees&task_id=${encodeURIComponent(selectedTask.id)}`} className="rounded-xl border border-soft px-3 py-2 text-sm">Manage Assignees</Link>
                      <Link href={`/o/${org.organization_slug}/dashboard/tasks?drawer=delete&task_id=${encodeURIComponent(selectedTask.id)}`} className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-700">Delete</Link>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {query.drawer === "assignees" && selectedTask && (org.role === "owner" || org.role === "admin") ? (
                <form action={updateTaskAssignees} className="grid gap-3">
                  <input type="hidden" name="organization_slug" value={org.organization_slug} />
                  <input type="hidden" name="task_id" value={selectedTask.id} />
                  <label className="text-sm font-medium text-main">Add users</label>
                  <select name="add_user_ids" multiple className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    {users.map((row) => <option key={`add-${row.user_id}`} value={row.user_id}>{resolveJoinedUserEmail((row as { users?: unknown }).users)}</option>)}
                  </select>
                  <label className="text-sm font-medium text-main">Remove users</label>
                  <select name="remove_user_ids" multiple className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    {users.map((row) => <option key={`remove-${row.user_id}`} value={row.user_id}>{resolveJoinedUserEmail((row as { users?: unknown }).users)}</option>)}
                  </select>
                  <button type="submit" className="w-fit rounded-xl border border-soft px-4 py-2.5 text-sm">Update Assignees</button>
                </form>
              ) : null}

              {query.drawer === "delete" && selectedTask && (org.role === "owner" || org.role === "admin") ? (
                <form action={deleteTask} className="space-y-3">
                  <input type="hidden" name="organization_slug" value={org.organization_slug} />
                  <input type="hidden" name="task_id" value={selectedTask.id} />
                  <p className="text-sm text-main">Delete task <span className="font-semibold">{selectedTask.title}</span>?</p>
                  <button type="submit" className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">Delete Task</button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
