"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { Plus, Info, Edit, Trash2, UserPlus, X, Briefcase } from "lucide-react";

import { ProjectMembersField } from "@/components/ProjectMembersField";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { DepartmentSelector } from "@/components/DepartmentSelector";
import { createProject, updateProject, deleteProject, addProjectMember, removeProjectMember } from "./actions";

type UserOption = { user_id: string; email: string };
type ProjectRow = { id: string; name: string; description?: string; status: string; department_id?: string; department_ids?: string[]; created_at: string };
type MemberRow = { project_id: string; user_id: string; users?: { email?: string; full_name?: string } | Array<{ email?: string; full_name?: string }> };
type UserRow = { id: string; email: string; full_name?: string };
type DepartmentRow = { id: string; name: string };

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

type ModalState = 
  | { type: "create" } 
  | { type: "view"; project_id: string } 
  | { type: "edit"; project_id: string } 
  | { type: "delete"; project_id: string } 
  | null;

export function ProjectsContent({
  orgSlug,
  query,
  projects,
  departments,
  users,
  members,
  projectsPermissions,
}: {
  orgSlug: string;
  query: { error?: string; success?: string; department_id?: string; modal?: "view" | "edit" | "delete" | "create"; project?: string };
  projects: ProjectRow[];
  departments: DepartmentRow[];
  users: UserRow[];
  members: MemberRow[];
  projectsPermissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
}) {
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    if (query.modal === "create") {
      setModal({ type: "create" });
    } else if (query.modal === "edit" && query.project) {
      setModal({ type: "edit", project_id: query.project });
    } else if (query.modal === "view" && query.project) {
      setModal({ type: "view", project_id: query.project });
    } else if (query.modal === "delete" && query.project) {
      setModal({ type: "delete", project_id: query.project });
    }
  }, [query.modal, query.project]);

  const userOptions: UserOption[] = useMemo(
    () => users.map((row) => ({
      user_id: row.id,
      email: row.full_name ? `${row.full_name} (${row.email})` : row.email,
    })),
    [users]
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === (modal && "project_id" in modal ? modal.project_id : null)),
    [modal, projects]
  );

  const selectedMembers = useMemo(
    () => selectedProject ? members.filter((m) => m.project_id === selectedProject.id) : [],
    [selectedProject, members]
  );

  const selectedMemberIds = useMemo(
    () => new Set(selectedMembers.map((m) => m.user_id)),
    [selectedMembers]
  );

  const unassignedUsers = useMemo(
    () => userOptions.filter((u) => !selectedMemberIds.has(u.user_id)),
    [userOptions, selectedMemberIds]
  );

  const getProjectDepartmentNames = useCallback(
    (project: ProjectRow) => {
      const ids = project.department_ids && project.department_ids.length ? project.department_ids : (project.department_id ? [project.department_id] : []);
      return ids.map((id) => departments.find((d) => d.id === id)?.name).filter(Boolean) as string[];
    },
    [departments]
  );

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
            value={query.department_id || ""}
            name="department_id"
            placeholder="Filter by department..."
            showAllOption={true}
            className="w-48"
          />
          {projectsPermissions.can_create && (
            <Button size="lg" className="gap-2" onClick={() => setModal({ type: "create" })}>
              <Plus className="h-5 w-5" />
              New Project
            </Button>
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
              <Button variant="outline" className="mt-6 gap-2" onClick={() => setModal({ type: "create" })}>
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setModal({ type: "edit", project_id: project.id })}>
                        <Edit className="h-4 w-4 text-muted" />
                      </Button>
                    )}
                    {projectsPermissions.can_delete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50" onClick={() => setModal({ type: "delete", project_id: project.id })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <button onClick={() => setModal({ type: "view", project_id: project.id })} className="flex-1 text-left">
                  <h3 className="text-xl font-bold text-main transition-colors group-hover:text-violet-600">{project.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted leading-relaxed">
                    {project.description ?? "No description provided."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getProjectDepartmentNames(project).map((dept) => (
                      <Badge key={`${project.id}-${dept}`} variant="outline">{dept}</Badge>
                    ))}
                  </div>
                </button>

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
                  <Button variant="ghost" size="sm" className="text-violet-600 font-bold hover:bg-violet-50" onClick={() => setModal({ type: "view", project_id: project.id })}>View Details</Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={modal?.type === "create"}
        onClose={() => setModal(null)}
        title="Create New Project"
      >
        <form action={createProject} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
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
            <label className="text-sm font-medium text-main">Departments</label>
            <select
              name="department_ids"
              required
              multiple
              className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-main">Initial Team Members</label>
            <ProjectMembersField users={userOptions} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </Modal>

      {/* VIEW MODAL */}
      {selectedProject && (
        <Modal
          isOpen={modal?.type === "view"}
          onClose={() => setModal(null)}
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
                <p className="text-sm font-medium text-main">{selectedProject.created_at ? format(new Date(selectedProject.created_at), "MMM d, yyyy") : "N/A"}</p>
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
          isOpen={modal?.type === "edit"}
          onClose={() => setModal(null)}
          title={`Edit ${selectedProject.name}`}
          size="lg"
        >
          <div className="space-y-10">
            <form action={updateProject} className="space-y-6">
              <input type="hidden" name="organization_slug" value={orgSlug} />
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
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-main">Departments</label>
                  <select
                    name="department_ids"
                    defaultValue={selectedProject.department_ids && selectedProject.department_ids.length ? selectedProject.department_ids : (selectedProject.department_id ? [selectedProject.department_id] : [])}
                    multiple
                    className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              <div className="flex justify-end pt-2 gap-3">
                <Button variant="outline" type="button" onClick={() => setModal(null)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>

            <div className="rounded-3xl border border-soft p-6 bg-slate-50/50">
              <div className="mb-6 flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider text-main">Manage Team</h4>
                <Badge variant="info">Active</Badge>
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
                      <input type="hidden" name="organization_slug" value={orgSlug} />
                      <input type="hidden" name="project_id" value={selectedProject.id} />
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><X className="h-4 w-4" /></Button>
                    </form>
                  </div>
                ))}
              </div>

              <form action={addProjectMember} className="mt-6 flex gap-2">
                <input type="hidden" name="organization_slug" value={orgSlug} />
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
          isOpen={modal?.type === "delete"}
          onClose={() => setModal(null)}
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
              <Button variant="outline" className="flex-1" type="button" onClick={() => setModal(null)}>Cancel</Button>
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="project_id" value={selectedProject.id} />
              <Button variant="danger" type="submit" className="flex-1 bg-red-600 text-white hover:bg-red-700">Delete</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
