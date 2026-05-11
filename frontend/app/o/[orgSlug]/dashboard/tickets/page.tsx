import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, Ticket, Info, Edit, Trash2, Split, Clock, CheckCircle2, AlertCircle } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { TicketComments } from "@/components/TicketComments";
import { createClient } from "@/lib/supabase/server";

type TicketsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; project_id?: string; modal?: "create" | "edit" | "delete"; ticket_id?: string }>;
};

function resolveJoinedProjectName(value: unknown): string {
  if (Array.isArray(value)) return String(value[0]?.name ?? "-");
  if (value && typeof value === "object" && "name" in value) return String((value as { name?: string }).name ?? "-");
  return "-";
}

async function createTicket(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "other").trim();
  const path = `/o/${orgSlug}/dashboard/tickets`;

  const { error } = await apiRequest("/api/v1/tickets", {
    method: "POST",
    orgSlug,
    body: { project_id: projectId, title, description: description || null, type, status: "open" },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Ticket created.")}`);
}

async function updateTicket(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const ticketId = String(formData.get("ticket_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "open").trim();
  const type = String(formData.get("type") ?? "other").trim();
  const path = `/o/${orgSlug}/dashboard/tickets`;

  const { error } = await apiRequest(`/api/v1/tickets/${encodeURIComponent(ticketId)}`, {
    method: "PATCH",
    orgSlug,
    body: { title, description: description || null, status, type },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Ticket updated.")}`);
}

async function deleteTicket(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const ticketId = String(formData.get("ticket_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tickets`;

  const { error } = await apiRequest(`/api/v1/tickets/${encodeURIComponent(ticketId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Ticket deleted.")}`);
}

export default async function TicketsPage({ params, searchParams }: TicketsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  const selectedProject = query.project_id ?? "";

  const [projectsRes, ticketsRes] = await Promise.all([
    apiRequest<Array<{ id: string; name: string }>>("/api/v1/projects", { orgSlug }),
    apiRequest<Array<{ id: string; title: string; type: string; status: string; project_id: string; description?: string }>>(
      `/api/v1/tickets${selectedProject ? `?project_id=${encodeURIComponent(selectedProject)}` : ""}`,
      { orgSlug }
    ),
  ]);

  if (ticketsRes.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{ticketsRes.error}</div>;

  const projects = projectsRes.data ?? [];
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const tickets = ticketsRes.data ?? [];
  const selectedTicket = tickets.find((t) => t.id === query.ticket_id);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "closed": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-violet-500" />;
      case "open": return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default: return <Clock className="h-4 w-4 text-muted" />;
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case "bug": return "danger";
      case "feature": return "success";
      case "improvement": return "info";
      default: return "default";
    }
  };

  const closeHref = `/o/${orgSlug}/dashboard/tickets`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Tickets</h1>
          <p className="text-muted">Track issues, feature requests, and support tickets.</p>
        </div>
        <Link href={`/o/${orgSlug}/dashboard/tickets?modal=create`}>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create Ticket
          </Button>
        </Link>
      </header>

      {query.error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <Info className="h-5 w-5 text-red-500" />
          {query.error}
        </div>
      )}

      {query.success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <Info className="h-5 w-5 text-emerald-500" />
          {query.success}
        </div>
      )}

      <div className="grid gap-4">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-soft py-20 text-center">
            <div className="rounded-full bg-violet-50 p-4 text-violet-500">
              <Ticket className="h-10 w-10" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-main">No tickets yet</h3>
            <p className="mt-1 text-muted">Tickets help you track specific items within a project.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-3xl border border-soft bg-white p-5 shadow-sm transition-all hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/5">
              <div className="flex gap-4 min-w-0">
                <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-500 transition-colors">
                  <Ticket className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-main truncate">{ticket.title}</h3>
                    <Badge variant={getTypeVariant(ticket.type)}>{ticket.type}</Badge>
                    <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted border border-soft/50">
                      {getStatusIcon(ticket.status)}
                      {ticket.status.replace("_", " ")}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted">
                    <span className="font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg">{projectNameById.get(ticket.project_id) || "General"}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate">{ticket.description || "No description"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-0 flex items-center gap-2 self-end sm:self-center">
                {(org.role === "owner" || org.role === "admin") && (
                  <Link href={`/o/${orgSlug}/dashboard/tasks?ticket_id=${ticket.id}`}>
                    <Button variant="secondary" size="sm" className="gap-2 h-9">
                      <Split className="h-4 w-4" />
                      Tasks
                    </Button>
                  </Link>
                )}
                <Link href={`/o/${orgSlug}/dashboard/tickets?modal=edit&ticket_id=${ticket.id}`}>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl"><Edit className="h-4 w-4 text-muted" /></Button>
                </Link>
                {(org.role === "owner" || org.role === "admin") && (
                  <Link href={`/o/${orgSlug}/dashboard/tickets?modal=delete&ticket_id=${ticket.id}`}>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={query.modal === "create"}
        closeHref={closeHref}
        title="Create New Ticket"
      >
        <form action={createTicket} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-main">Select Project</label>
            <select name="project_id" required className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="">Choose a project...</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-main">Ticket Type</label>
            <select name="type" defaultValue="other" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="feature">Feature Request</option>
              <option value="bug">Bug Report</option>
              <option value="improvement">Improvement</option>
              <option value="recommendation">Recommendation</option>
              <option value="other">Other</option>
            </select>
          </div>

          <Input label="Title" name="title" required placeholder="What is this ticket about?" />
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-main">Description</label>
            <textarea 
              name="description" 
              rows={4} 
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500" 
              placeholder="Provide more details..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Link href={closeHref}>
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit">Create Ticket</Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      {selectedTicket && (
        <Modal
          isOpen={query.modal === "edit"}
          closeHref={closeHref}
          title="Edit Ticket"
        >
          <form action={updateTicket} className="space-y-6">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="ticket_id" value={selectedTicket.id} />
            
            <Input label="Title" name="title" defaultValue={selectedTicket.title} required />
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-main">Type</label>
                <select name="type" defaultValue={selectedTicket.type} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500">
                  <option value="feature">Feature</option>
                  <option value="bug">Bug</option>
                  <option value="improvement">Improvement</option>
                  <option value="recommendation">Recommendation</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-main">Status</label>
                <select name="status" defaultValue={selectedTicket.status} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500">
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="hold">Hold</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-main">Description</label>
              <textarea 
                name="description" 
                defaultValue={selectedTicket.description ?? ""}
                rows={4} 
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500" 
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-b border-soft pb-8">
              <Link href={closeHref}>
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>

          <div className="mt-8">
            <TicketComments ticketId={selectedTicket.id} orgSlug={orgSlug} currentUserId={user?.id} />
          </div>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {selectedTicket && query.modal === "delete" && (
        <Modal
          isOpen={true}
          closeHref={closeHref}
          title="Delete Ticket"
          size="sm"
        >
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main">Delete Ticket?</h4>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-main underline decoration-red-200">{selectedTicket.title}</span>?
              </p>
            </div>
            <form action={deleteTicket} className="flex gap-3 pt-2">
              <Link href={closeHref} className="flex-1">
                <Button variant="outline" className="w-full">Cancel</Button>
              </Link>
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="ticket_id" value={selectedTicket.id} />
              <Button variant="danger" type="submit" className="flex-1 bg-red-600 text-white hover:bg-red-700">Delete</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
