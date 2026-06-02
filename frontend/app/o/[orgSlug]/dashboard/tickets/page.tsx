import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
import { createClient } from "@/lib/supabase/server";
import { TicketsContent } from "./TicketsContent";
import type { Milestone } from "@/lib/types";

type TicketsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; project_id?: string; modal?: "create" | "edit" | "delete"; ticket_id?: string; department_id?: string }>;
};

function buildTicketUrl(project_id?: string, department_id?: string): string {
  const params = new URLSearchParams();
  if (project_id) params.set("project_id", project_id);
  if (department_id) params.set("department_id", department_id);
  const qs = params.toString();
  return qs ? `/api/v1/tickets?${qs}` : "/api/v1/tickets";
}

export default async function TicketsPage({ params, searchParams }: TicketsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const selectedProject = query.project_id ?? "";
  const milestonesUrl = selectedProject ? `/api/v1/milestones?project_id=${selectedProject}` : "/api/v1/milestones";

  const supabase = await createClient();
  const [permissionsResponse, projectsRes, ticketsRes, { data: milestonesRes }, { data: { user } }] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<Array<{ id: string; name: string }>>("/api/v1/projects", { orgSlug }),
    apiRequest<Array<{ id: string; title: string; type: string; status: string; project_id: string; milestone_id?: string; description?: string; start_date?: string; due_date?: string }>>(
      buildTicketUrl(selectedProject, query.department_id),
      { orgSlug }
    ),
    apiRequest<Milestone[]>(milestonesUrl, { orgSlug }),
    supabase.auth.getUser(),
  ]);

  const ticketsPermissions = permissionsResponse.data?.modules.find(m => m.key === "tickets")?.permissions || { can_view: false, can_create: false, can_edit: false, can_delete: false };

  if (!ticketsPermissions.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view tickets.</p>;
  }

  if (ticketsRes.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{ticketsRes.error}</div>;

  const projects = projectsRes.data ?? [];
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const tickets = ticketsRes.data ?? [];
  const milestones = milestonesRes ?? [];

  return (
    <TicketsContent
      orgSlug={orgSlug}
      query={{
        error: query.error,
        success: query.success,
        project_id: query.project_id,
        department_id: query.department_id,
      }}
      projects={projects}
      tickets={tickets}
      milestones={milestones}
      ticketsPermissions={ticketsPermissions}
      currentUserId={user?.id}
      projectNameById={projectNameById}
    />
  );
}
