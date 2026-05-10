import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ProjectMembersField } from "@/components/ProjectMembersField";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

type ProjectsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; modal?: "view" | "edit" | "delete"; project?: string }>;
};

type UserOption = { user_id: string; email: string };
type ProjectRow = { id: string; name: string; description?: string; status: string };
type MemberRow = { project_id: string; user_id: string; users?: { email?: string; full_name?: string } | Array<{ email?: string; full_name?: string }> };

function resolveJoinedUserEmail(value: unknown): string {
  if (Array.isArray(value)) return String(value[0]?.email ?? "unknown");
  if (value && typeof value === "object" && "email" in value) return String((value as { email?: string }).email ?? "unknown");
  return "unknown";
}

function resolveJoinedUserName(value: unknown): string {
  if (Array.isArray(value)) return String(value[0]?.full_name ?? "");
  if (value && typeof value === "object" && "full_name" in value) return String((value as { full_name?: string }).full_name ?? "");
  return "";
}

async function getApiContext(orgSlug: string) {
  const supabase = await createClient();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!apiBase || !accessToken) return null;
  return { apiBase, accessToken };
}

async function createProject(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  if (!(org.role === "owner" || org.role === "admin")) redirect(`${path}?error=${encodeURIComponent("Only owner/admin can create projects.")}`);
  if (!name) redirect(`${path}?error=${encodeURIComponent("Project name is required.")}`);
  const api = await getApiContext(orgSlug);
  if (!api) redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  const ids = formData.getAll("member_user_ids").map((value) => String(value).trim()).filter(Boolean);
  const resp = await fetch(`${api.apiBase}/api/v1/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
    body: JSON.stringify({ name, description: description || null, status: "active", member_user_ids: ids }),
    cache: "no-store",
  });
  if (!resp.ok) redirect(`${path}?error=${encodeURIComponent("Unable to create project.")}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Project created.")}`);
}

async function updateProject(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;
  const api = await getApiContext(orgSlug);
  if (!api) redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  const resp = await fetch(`${api.apiBase}/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
    body: JSON.stringify({ name: name || undefined, description: description || null, status }),
    cache: "no-store",
  });
  if (!resp.ok) redirect(`${path}?error=${encodeURIComponent("Failed to update project.")}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Project updated.")}`);
}

async function deleteProject(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;
  const api = await getApiContext(orgSlug);
  if (!api) redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  const resp = await fetch(`${api.apiBase}/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
    cache: "no-store",
  });
  if (!resp.ok) redirect(`${path}?error=${encodeURIComponent("Failed to delete project.")}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Project deleted.")}`);
}

async function addProjectMember(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;
  const api = await getApiContext(orgSlug);
  if (!api) redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  const resp = await fetch(`${api.apiBase}/api/v1/projects/${encodeURIComponent(projectId)}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
    body: JSON.stringify({ user_id: userId }),
    cache: "no-store",
  });
  if (!resp.ok) redirect(`${path}?error=${encodeURIComponent("Failed to add member.")}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Project member added.")}&modal=edit&project=${encodeURIComponent(projectId)}`);
}

async function removeProjectMember(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;
  const api = await getApiContext(orgSlug);
  if (!api) redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  const resp = await fetch(`${api.apiBase}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
    cache: "no-store",
  });
  if (!resp.ok) redirect(`${path}?error=${encodeURIComponent("Failed to remove member.")}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Project member removed.")}&modal=edit&project=${encodeURIComponent(projectId)}`);
}

export default async function ProjectsPage({ params, searchParams }: ProjectsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  const supabase = await createClient();
  const api = await getApiContext(orgSlug);
  if (!api) return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">API base URL or session missing.</p>;

  const [projectsResp, usersResp, membersResp] = await Promise.all([
    fetch(`${api.apiBase}/api/v1/projects`, { headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug }, cache: "no-store" }),
    fetch(`${api.apiBase}/api/v1/users?limit=200&offset=0`, { headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug }, cache: "no-store" }),
    supabase
      .from("project_members")
      .select("project_id,user_id,users!project_members_user_id_fkey(email,full_name)")
      .eq("tenant_id", org.organization_id)
      .eq("is_active", true),
  ]);

  const projectsBody = (await projectsResp.json().catch(() => null)) as { data?: ProjectRow[]; error?: { message?: string } } | null;
  if (!projectsResp.ok) return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{projectsBody?.error?.message ?? "Failed to load projects."}</p>;
  const usersBody = (await usersResp.json().catch(() => null)) as { data?: Array<{ user_id: string; users?: unknown }> } | null;

  const projects = projectsBody?.data ?? [];
  const users = usersBody?.data ?? [];
  const userOptions: UserOption[] = users.map((row) => ({ user_id: row.user_id, email: resolveJoinedUserEmail((row as { users?: unknown }).users) }));
  const members = ((membersResp.data ?? []) as MemberRow[]);
  const selectedProject = projects.find((p) => p.id === query.project);
  const selectedMembers = selectedProject ? members.filter((m) => m.project_id === selectedProject.id) : [];
  const selectedMemberIds = new Set(selectedMembers.map((m) => m.user_id));
  const unassignedUsers = userOptions.filter((u) => !selectedMemberIds.has(u.user_id));

  return (
    <section className="space-y-6">
      {query.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p> : null}
      {query.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{query.success}</p> : null}

      {(org.role === "owner" || org.role === "admin") ? (
        <article className="surface-card rounded-2xl border p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-main">Create Project</h2>
          <form action={createProject} className="mt-4 grid gap-3">
            <input type="hidden" name="organization_slug" value={org.organization_slug} />
            <input name="name" required placeholder="Project name" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <textarea name="description" placeholder="Description" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <ProjectMembersField users={userOptions} />
            <button type="submit" className="w-fit rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Create Project</button>
          </form>
        </article>
      ) : null}

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-main">Projects</h2>
        <div className="mt-4 space-y-3">
          {projects.length === 0 ? <p className="text-sm text-muted">No projects yet.</p> : null}
          {projects.map((project) => (
            <div key={project.id} className="rounded-xl border border-soft p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-main">{project.name}</p>
                  <p className="text-xs uppercase text-muted">{project.status}</p>
                  <p className="mt-1 text-sm text-muted">{project.description ?? "No description"}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <Link href={`/o/${org.organization_slug}/dashboard/projects?modal=view&project=${encodeURIComponent(project.id)}`} className="rounded-md border border-soft px-2 py-1">View</Link>
                  {(org.role === "owner" || org.role === "admin") ? <Link href={`/o/${org.organization_slug}/dashboard/projects?modal=edit&project=${encodeURIComponent(project.id)}`} className="rounded-md border border-soft px-2 py-1">Edit</Link> : null}
                  {(org.role === "owner" || org.role === "admin") ? <Link href={`/o/${org.organization_slug}/dashboard/projects?modal=delete&project=${encodeURIComponent(project.id)}`} className="rounded-md border border-red-300 px-2 py-1 text-red-700">Delete</Link> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>

      {selectedProject && query.modal ? (
        <div className="fixed inset-0 z-50 bg-black/35">
          <div className="absolute inset-y-0 right-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-main">{query.modal === "view" ? "Project Details" : query.modal === "edit" ? "Edit Project" : "Delete Project"}</h3>
              <Link href={`/o/${org.organization_slug}/dashboard/projects`} className="rounded-md border border-soft px-2 py-1 text-xs">Close</Link>
            </div>

            {query.modal === "view" ? (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {selectedProject.name}</p>
                <p><span className="font-medium">Status:</span> {selectedProject.status}</p>
                <p><span className="font-medium">Description:</span> {selectedProject.description ?? "No description"}</p>
                <div>
                  <p className="mb-1 font-medium">Members</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.length === 0 ? <p className="text-sm text-muted">No members assigned.</p> : null}
                    {selectedMembers.map((m) => {
                      const label = resolveJoinedUserName(m.users) || resolveJoinedUserEmail(m.users);
                      return <span key={`${m.project_id}-${m.user_id}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs">{label}</span>;
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {query.modal === "edit" && (org.role === "owner" || org.role === "admin") ? (
              <div className="space-y-4">
                <form action={updateProject} className="grid gap-3 md:grid-cols-3">
                  <input type="hidden" name="organization_slug" value={org.organization_slug} />
                  <input type="hidden" name="project_id" value={selectedProject.id} />
                  <input name="name" defaultValue={selectedProject.name} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <select name="status" defaultValue={selectedProject.status} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    <option value="active">active</option>
                    <option value="on_hold">on_hold</option>
                    <option value="completed">completed</option>
                    <option value="archived">archived</option>
                  </select>
                  <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
                  <textarea name="description" defaultValue={selectedProject.description ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-3" />
                </form>

                <div className="rounded-xl border border-soft p-3">
                  <p className="mb-2 text-sm font-medium text-main">Assigned members</p>
                  <div className="space-y-2">
                    {selectedMembers.length === 0 ? <p className="text-sm text-muted">No members assigned.</p> : null}
                    {selectedMembers.map((m) => {
                      const label = resolveJoinedUserName(m.users) || resolveJoinedUserEmail(m.users);
                      return (
                        <form key={`${m.project_id}-${m.user_id}`} action={removeProjectMember} className="flex items-center justify-between rounded-lg border border-soft px-3 py-2">
                          <input type="hidden" name="organization_slug" value={org.organization_slug} />
                          <input type="hidden" name="project_id" value={selectedProject.id} />
                          <input type="hidden" name="user_id" value={m.user_id} />
                          <p className="text-sm">{label}</p>
                          <button type="submit" className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700">Remove</button>
                        </form>
                      );
                    })}
                  </div>
                </div>

                <form action={addProjectMember} className="flex gap-2">
                  <input type="hidden" name="organization_slug" value={org.organization_slug} />
                  <input type="hidden" name="project_id" value={selectedProject.id} />
                  <select name="user_id" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Add member...</option>
                    {unassignedUsers.map((u) => <option key={u.user_id} value={u.user_id}>{u.email}</option>)}
                  </select>
                  <button type="submit" className="rounded-xl border border-soft px-3 py-2 text-sm">Add</button>
                </form>
              </div>
            ) : null}

            {query.modal === "delete" && (org.role === "owner" || org.role === "admin") ? (
              <div className="space-y-3">
                <p className="text-sm text-main">Are you sure you want to delete <span className="font-semibold">{selectedProject.name}</span>?</p>
                <form action={deleteProject}>
                  <input type="hidden" name="organization_slug" value={org.organization_slug} />
                  <input type="hidden" name="project_id" value={selectedProject.id} />
                  <button type="submit" className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">Delete Project</button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
