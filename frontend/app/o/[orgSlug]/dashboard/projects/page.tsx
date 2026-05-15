import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, Info, Edit, Trash2, UserPlus, X, Briefcase } from "lucide-react";

import { ProjectMembersField } from "@/components/ProjectMembersField";
import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DepartmentSelector } from "@/components/DepartmentSelector";

type ProjectsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; modal?: "view" | "edit" | "delete" | "create"; project?: string }>;
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

async function createProject(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  
  // Check permissions
  const permissionsResponse = await apiRequest<{
    modules: Array<{
      key: string;
      permissions: { can_create: boolean };
    }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const projectsPermissions = permissionsResponse.data?.modules.find(m => m.key === "projects")?.permissions;
  if (!projectsPermissions?.can_create) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create projects.")}`);
  }
  
  if (!name) {
    redirect(`${path}?error=${encodeURIComponent("Project name is required.")}`);
  }

  const ids = formData.getAll("member_user_ids").map((value) => String(value).trim()).filter(Boolean);
  
  const { error } = await apiRequest<ProjectRow>("/api/v1/projects", {
    method: "POST",
    orgSlug,
    body: { name, description: description || null, status: "active", member_user_ids: ids },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
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

  // Check permissions
  const permissionsResponse = await apiRequest<{
    modules: Array<{
      key: string;
      permissions: { can_edit: boolean };
    }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const projectsPermissions = permissionsResponse.data?.modules.find(m => m.key === "projects")?.permissions;
  if (!projectsPermissions?.can_edit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to edit projects.")}`);
  }

  const { error } = await apiRequest<ProjectRow>(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    orgSlug,
    body: { name: name || undefined, description: description || null, status },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Project updated.")}`);
}

async function deleteProject(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;

  // Check permissions
  const permissionsResponse = await apiRequest<{
    modules: Array<{
      key: string;
      permissions: { can_delete: boolean };
    }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const projectsPermissions = permissionsResponse.data?.modules.find(m => m.key === "projects")?.permissions;
  if (!projectsPermissions?.can_delete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete projects.")}`);
  }

  const { error } = await apiRequest(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Project deleted.")}`);
}

async function addProjectMember(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;

  // Check permissions
  const permissionsResponse = await apiRequest<{
    modules: Array<{
      key: string;
      permissions: { can_edit: boolean };
    }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const projectsPermissions = permissionsResponse.data?.modules.find(m => m.key === "projects")?.permissions;
  if (!projectsPermissions?.can_edit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to manage project members.")}`);
  }

  const { error } = await apiRequest(`/api/v1/projects/${encodeURIComponent(projectId)}/members`, {
    method: "POST",
    orgSlug,
    body: { user_id: userId },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Member added.")}&modal=edit&project=${encodeURIComponent(projectId)}`);
}

async function removeProjectMember(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;

  // Check permissions
  const permissionsResponse = await apiRequest<{
    modules: Array<{
      key: string;
      permissions: { can_edit: boolean };
    }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const projectsPermissions = permissionsResponse.data?.modules.find(m => m.key === "projects")?.permissions;
  if (!projectsPermissions?.can_edit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to manage project members.")}`);
  }

  const { error } = await apiRequest(`/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Member removed.")}&modal=edit&project=${encodeURIComponent(projectId)}`);
}

export default async function ProjectsPage({ params, searchParams }: ProjectsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  const supabase = await createClient();

  // Fetch permissions
  const permissionsResponse = await apiRequest<{
    modules: Array<{
      key: string;
      permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
    }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const projectsPermissions = permissionsResponse.data?.modules.find(m => m.key === "projects")?.permissions || { can_view: false, can_create: false, can_edit: false, can_delete: false };

  const [projectsRes, usersRes, membersResp] = await Promise.all([
    apiRequest<ProjectRow[]>("/api/v1/projects", { orgSlug }),
    apiRequest<Array<{ user_id: string; users?: unknown }>>("/api/v1/users?limit=200&offset=0", { orgSlug }),
    supabase
      .from("project_members")
      .select("project_id,user_id,users!project_members_user_id_fkey(email,full_name)")
      .eq("tenant_id", org.organization_id)
      .eq("is_active", true),
  ]);

  if (projectsRes.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{projectsRes.error}</div>;

  const projects = projectsRes.data ?? [];
  const users = usersRes.data ?? [];
  const userOptions: UserOption[] = users.map((row) => ({
    user_id: row.user_id,
    email: resolveJoinedUserEmail((row as { users?: unknown }).users),
  }));
  const members = (membersResp.data ?? []) as MemberRow[];
  const selectedProject = projects.find((p) => p.id === query.project);
  const selectedMembers = selectedProject ? members.filter((m) => m.project_id === selectedProject.id) : [];
  const selectedMemberIds = new Set(selectedMembers.map((m) => m.user_id));
  const unassignedUsers = userOptions.filter((u) => !selectedMemberIds.has(u.user_id));

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": return "success";
      case "on_hold": return "warning";
      case "completed": return "info";
      case "archived": return "default";
      default: return "default";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Projects</h1>
          <p className="text-muted">Manage your organization&apos;s projects and team members.</p>
        </div>
        <div className="flex items-center gap-4">
          <DepartmentSelector
            orgSlug={orgSlug}
            placeholder="Filter by department..."
            showAllOption={true}
            className="w-48"
          />
          {projectsPermissions.can_create && (
            <Link href={`/o/${orgSlug}/dashboard/projects?modal=create`}>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                New Project
              </Button>
            </Link>
          )}
        </div>
      </header>

      {query.error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm animate-in zoom-in-95 duration-200">
          <Info className="h-5 w-5 shrink-0 text-red-500" />
          {query.error}
        </div>
      )}

      {query.success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm animate-in zoom-in-95 duration-200">
          <Info className="h-5 w-5 shrink-0 text-emerald-500" />
          {query.success}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-soft py-20 text-center">
            <div className="rounded-full bg-violet-50 p-4 text-violet-500">
              <Briefcase className="h-10 w-10" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-main">No projects found</h3>
            <p className="mt-1 text-muted">Get started by creating your first project.</p>
            {projectsPermissions.can_create && (
              <Link href={`/o/${orgSlug}/dashboard/projects?modal=create`} className="mt-6">
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
              </Link>
            )}
          </div>
        ) : (
          projects.map((project) => {
            const projectMembers = members.filter(m => m.project_id === project.id);
            return (
              <div key={project.id} className="group relative flex flex-col rounded-3xl border border-soft bg-white p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/5">
                <div className="mb-4 flex items-start justify-between">
                  <Badge variant={getStatusVariant(project.status)}>{project.status}</Badge>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {projectsPermissions.can_edit && (
                      <Link href={`/o/${orgSlug}/dashboard/projects?modal=edit&project=${project.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Edit className="h-4 w-4 text-muted" /></Button>
                      </Link>
                    )}
                    {projectsPermissions.can_delete && (
                      <Link href={`/o/${orgSlug}/dashboard/projects?modal=delete&project=${project.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                      </Link>
                    )}
                  </div>
                </div>
                
                <Link href={`/o/${orgSlug}/dashboard/projects?modal=view&project=${project.id}`} className="flex-1">
                  <h3 className="text-xl font-bold text-main transition-colors group-hover:text-violet-600">{project.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted leading-relaxed">
                    {project.description ?? "No description provided."}
                  </p>
                </Link>

                <div className="mt-6 flex items-center justify-between pt-6 border-t border-soft">
                  <div className="flex -space-x-2 overflow-hidden">
                    {projectMembers.slice(0, 3).map((m) => (
                      <div key={m.user_id} title={resolveJoinedUserEmail(m.users)} className="inline-block h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {resolveJoinedUserEmail(m.users)[0].toUpperCase()}
                      </div>
                    ))}
                    {projectMembers.length > 3 && (
                      <div className="inline-block h-8 w-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-bold text-muted">
                        +{projectMembers.length - 3}
                      </div>
                    )}
                  </div>
                  <Link href={`/o/${orgSlug}/dashboard/projects?modal=view&project=${project.id}`}>
                    <Button variant="ghost" size="sm" className="text-violet-600 font-bold hover:bg-violet-50">View Details</Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal 
        isOpen={query.modal === "create"} 
        closeHref={`/o/${orgSlug}/dashboard/projects`}
        title="Create New Project"
      >
        <form action={createProject} className="space-y-6">
          <input type="hidden" name="organization_slug" value={org.organization_slug} />
          <Input label="Project Name" name="name" required placeholder="Enter project name..." />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-main">Description</label>
            <textarea 
              name="description" 
              rows={4} 
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" 
              placeholder="What is this project about?"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-main">Initial Team Members</label>
            <ProjectMembersField users={userOptions} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Link href={`/o/${orgSlug}/dashboard/projects`}>
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </Modal>

      {/* VIEW MODAL */}
      {selectedProject && (
        <Modal 
          isOpen={query.modal === "view"} 
          closeHref={`/o/${orgSlug}/dashboard/projects`}
          title={selectedProject.name}
          size="lg"
        >
          <div className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Status</p>
                <Badge variant={getStatusVariant(selectedProject.status)}>{selectedProject.status}</Badge>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Created At</p>
                <p className="text-sm font-medium text-main">May 11, 2026</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Description</p>
              <p className="text-sm leading-relaxed text-main">
                {selectedProject.description ?? "No description provided for this project."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Team Members</p>
                <Badge variant="outline">{selectedMembers.length} members</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedMembers.length === 0 ? (
                  <p className="col-span-full py-4 text-center text-sm text-muted">No members assigned.</p>
                ) : (
                  selectedMembers.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3 rounded-xl border border-soft p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                        {resolveJoinedUserEmail(m.users)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-main">{resolveJoinedUserName(m.users) || "Anonymous"}</p>
                        <p className="truncate text-xs text-muted">{resolveJoinedUserEmail(m.users)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {selectedProject && (
        <Modal 
          isOpen={query.modal === "edit"} 
          closeHref={`/o/${orgSlug}/dashboard/projects`}
          title={`Edit ${selectedProject.name}`}
          size="lg"
        >
          <div className="space-y-10">
            <form action={updateProject} className="space-y-6">
              <input type="hidden" name="organization_slug" value={org.organization_slug} />
              <input type="hidden" name="project_id" value={selectedProject.id} />
              <div className="grid gap-6 sm:grid-cols-2">
                <Input label="Project Name" name="name" defaultValue={selectedProject.name} required />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-main">Status</label>
                  <select 
                    name="status" 
                    defaultValue={selectedProject.status}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-main">Description</label>
                <textarea 
                  name="description" 
                  defaultValue={selectedProject.description ?? ""}
                  rows={3} 
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit">Save Changes</Button>
              </div>
            </form>

            <div className="rounded-3xl border border-soft p-6 bg-slate-50/50">
              <div className="mb-6 flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider text-main">Manage Team</h4>
                <Link href={`/o/${orgSlug}/dashboard/projects?modal=edit&project=${selectedProject.id}`}>
                  <Badge variant="info">Active</Badge>
                </Link>
              </div>
              
              <div className="space-y-3">
                {selectedMembers.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                        {resolveJoinedUserEmail(m.users)[0].toUpperCase()}
                      </div>
                      <p className="text-sm font-medium">{resolveJoinedUserEmail(m.users)}</p>
                    </div>
                    <form action={removeProjectMember}>
                      <input type="hidden" name="organization_slug" value={org.organization_slug} />
                      <input type="hidden" name="project_id" value={selectedProject.id} />
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><X className="h-4 w-4" /></Button>
                    </form>
                  </div>
                ))}
              </div>

              <form action={addProjectMember} className="mt-6 flex gap-2">
                <input type="hidden" name="organization_slug" value={org.organization_slug} />
                <input type="hidden" name="project_id" value={selectedProject.id} />
                <select name="user_id" required className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Add member...</option>
                  {unassignedUsers.map((u) => <option key={u.user_id} value={u.user_id}>{u.email}</option>)}
                </select>
                <Button variant="secondary" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add
                </Button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {selectedProject && (
        <Modal 
          isOpen={query.modal === "delete"} 
          closeHref={`/o/${orgSlug}/dashboard/projects`}
          title="Confirm Deletion"
          size="sm"
        >
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main">Delete Project?</h4>
              <p className="mt-2 text-sm text-muted">
                Are you sure you want to delete <span className="font-bold text-main">{selectedProject.name}</span>? This action cannot be undone and will delete all associated data.
              </p>
            </div>
            <form action={deleteProject} className="flex gap-3 pt-2">
              <Link href={`/o/${orgSlug}/dashboard/projects`} className="flex-1">
                <Button variant="outline" className="w-full">Cancel</Button>
              </Link>
              <input type="hidden" name="organization_slug" value={org.organization_slug} />
              <input type="hidden" name="project_id" value={selectedProject.id} />
              <Button variant="danger" type="submit" className="flex-1 bg-red-600 text-white hover:bg-red-700">Delete</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
