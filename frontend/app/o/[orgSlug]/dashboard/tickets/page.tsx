import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { TicketsContent } from "./TicketsContent";
import type { Milestone } from "@/lib/types";

type TicketsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; project_id?: string; modal?: "create" | "edit" | "delete"; ticket_id?: string; department_id?: string }>;
};

export default async function TicketsPage({ params, searchParams }: TicketsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);
  const selectedProject = query.project_id ?? "";

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const ticketsPermissions = permissionsResponse.data?.modules.find(m => m.key === "tickets")?.permissions || { can_view: false, can_create: false, can_edit: false, can_delete: false };

  const [projectsRes, ticketsRes] = await Promise.all([
    apiRequest<Array<{ id: string; name: string }>>("/api/v1/projects", { orgSlug }),
    apiRequest<Array<{ id: string; title: string; type: string; status: string; project_id: string; milestone_id?: string; description?: string; start_date?: string; due_date?: string }>>(
      `/api/v1/tickets${selectedProject ? `?project_id=${encodeURIComponent(selectedProject)}` : ""}${query.department_id ? `${selectedProject ? '&' : '?'}department_id=${encodeURIComponent(query.department_id)}` : ""}`,
      { orgSlug }
    ),
  ]);

  if (!ticketsPermissions.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view tickets.</p>;
  }

  if (ticketsRes.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{ticketsRes.error}</div>;

  const projects = projectsRes.data ?? [];
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const tickets = ticketsRes.data ?? [];
  
  // Fetch milestones
  const milestonesUrl = selectedProject 
    ? `/api/v1/milestones?project_id=${selectedProject}` 
    : "/api/v1/milestones";
  const { data: milestonesRes } = await apiRequest<Milestone[]>(milestonesUrl, { orgSlug });
  const milestones = milestonesRes ?? [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
