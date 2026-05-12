import { Map, Filter, Calendar as CalendarIcon, ChevronRight, Plus, Flag, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { GanttChart } from "@/components/GanttChart";
import { Task } from "@/lib/types";

async function createMilestone(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/roadmap`;

  const { error } = await apiRequest("/api/v1/milestones", {
    method: "POST",
    orgSlug,
    body: { project_id: projectId, name, description: description || null, due_date: dueDate, status: "pending" },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Milestone created.")}`);
}

export default async function RoadmapPage({ params, searchParams }: { 
  params: Promise<{ orgSlug: string }>,
  searchParams: Promise<{ project_id?: string; modal?: string; error?: string; success?: string }>
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const { project_id, modal } = query;
  const org = await getOrganizationContextOrRedirect(orgSlug);

  // Fetch projects for the filter
  const { data: projects } = await apiRequest<any[]>("/api/v1/projects", { orgSlug });
  
  // Fetch tasks with dependencies
  const tasksUrl = project_id 
    ? `/api/v1/tasks?project_id=${project_id}` 
    : "/api/v1/tasks";
  const { data: tasks } = await apiRequest<Task[]>(tasksUrl, { orgSlug });

  // Fetch milestones
  const milestonesUrl = project_id
    ? `/api/v1/milestones?project_id=${project_id}`
    : "/api/v1/milestones";
  const { data: milestones } = await apiRequest<any[]>(milestonesUrl, { orgSlug });

  const activeProject = projects?.find(p => p.id === project_id);
  const closeHref = `/o/${orgSlug}/dashboard/roadmap${project_id ? `?project_id=${project_id}` : ""}`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-violet-600 uppercase tracking-widest mb-1">
            <Map className="h-4 w-4" />
            Roadmap
          </div>
          <h1 className="text-3xl font-black tracking-tight text-main">Project Timeline</h1>
          <p className="mt-1 text-muted font-medium">Visualize your project milestones and task dependencies.</p>
        </div>
        {(org.role === "owner" || org.role === "admin") && (
          <Link href={`${closeHref}${closeHref.includes('?') ? '&' : '?'}modal=create_milestone`}>
            <Button className="gap-2">
              <Plus className="h-5 w-5" />
              New Milestone
            </Button>
          </Link>
        )}
      </header>

      {(query.error || query.success) && (
        <div className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${query.error ? 'bg-red-50 border-red-100 text-red-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
          <div className={`h-2 w-2 rounded-full ${query.error ? 'bg-red-500' : 'bg-emerald-500'}`} />
          {query.error || query.success}
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 rounded-2xl bg-white border border-soft px-4 py-2 shadow-sm">
          <Filter className="h-4 w-4 text-muted" />
          <span className="text-sm font-bold text-main mr-2">Project:</span>
          <div className="flex gap-2">
            <Link 
              href={`/o/${orgSlug}/dashboard/roadmap`}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${!project_id ? "bg-violet-600 text-white shadow-md shadow-violet-200" : "bg-slate-100 text-muted hover:bg-slate-200"}`}
            >
              All
            </Link>
            {projects?.map(p => (
              <Link 
                key={p.id}
                href={`/o/${orgSlug}/dashboard/roadmap?project_id=${p.id}`}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${project_id === p.id ? "bg-violet-600 text-white shadow-md shadow-violet-200" : "bg-slate-100 text-muted hover:bg-slate-200"}`}
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/50">
          <div className="bg-slate-50 border-b border-soft px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white border border-soft flex items-center justify-center shadow-sm">
                <CalendarIcon className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-main">{activeProject?.name || "All Projects"}</h2>
                <p className="text-xs font-bold text-muted uppercase tracking-wider">Gantt Visualization</p>
              </div>
            </div>
            <div className="flex gap-2">
                <Badge variant="outline" className="bg-white border-soft text-muted font-bold">Day View</Badge>
            </div>
          </div>
          <div className="p-6">
            <GanttChart tasks={tasks || []} milestones={milestones || []} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Upcoming Milestones</h3>
          <div className="space-y-4">
            {milestones && milestones.length > 0 ? (
              milestones.map(m => (
                <div key={m.id} className="group relative p-4 rounded-2xl bg-white border border-soft hover:border-violet-200 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                        <Flag className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-main leading-none mb-1">{m.name}</p>
                        <p className="text-[10px] font-bold text-muted uppercase">{new Date(m.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <Badge className={m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {m.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-soft rounded-2xl text-[11px] font-medium text-slate-400 bg-slate-50/50 text-center px-4">
                <Flag className="h-8 w-8 mb-2 opacity-20" />
                {project_id ? "No milestones defined for this project" : "Select a project to see its milestones"}
              </div>
            )}
          </div>
        </Card>
        
        <Card className="p-6 md:col-span-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Critical Dependencies</h3>
          <div className="space-y-3">
            {tasks?.filter(t => (t.dependencies || []).length > 0).slice(0, 5).map(t => (
               <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-soft/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-white border border-soft flex items-center justify-center">
                      <ChevronRight className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-main">{t.title}</p>
                      <p className="text-[10px] font-medium text-muted">Depends on {(t.dependencies || []).length} tasks</p>
                    </div>
                  </div>
                  <Link href={`/o/${orgSlug}/dashboard/tasks?modal=edit&task_id=${t.id}`}>
                    <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-200 border-none cursor-pointer">View Task</Badge>
                  </Link>
               </div>
            ))}
            {(!tasks || tasks.filter(t => (t.dependencies || []).length > 0).length === 0) && (
               <div className="flex items-center justify-center h-48 border-2 border-dashed border-soft rounded-2xl text-[11px] font-medium text-slate-400 bg-slate-50/50">
                 No active task dependencies found
               </div>
            )}
          </div>
        </Card>
      </div>

      {/* CREATE MILESTONE MODAL */}
      <Modal
        isOpen={modal === "create_milestone"}
        closeHref={closeHref}
        title="Create New Milestone"
      >
        <form action={createMilestone} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-main">Project</label>
            <select name="project_id" required defaultValue={project_id || ""} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="">Select a project...</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <Input label="Milestone Name" name="name" required placeholder="e.g. Beta Launch, Q3 Deliverables" />
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-main">Description</label>
            <textarea 
              name="description" 
              rows={3} 
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500" 
              placeholder="What does this milestone involve?"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-main">Target Date</label>
            <input type="date" name="due_date" required className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Link href={closeHref}>
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit">Create Milestone</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
