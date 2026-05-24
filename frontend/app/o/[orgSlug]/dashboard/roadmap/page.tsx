import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Task } from "@/lib/types";
import { createMilestone, updateMilestone, deleteMilestone } from "./actions";
import RoadmapContent from "./RoadmapContent";

export default async function RoadmapPage({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>,
  searchParams: Promise<{ project_id?: string; department_id?: string; error?: string; success?: string }>
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const { project_id, department_id } = query;
  await getOrganizationContextOrRedirect(orgSlug);
  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const roadmapPermissions = permissionsResponse.data?.modules.find((m) => m.key === "roadmap")?.permissions ?? {
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
  };
  if (!roadmapPermissions.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view roadmap.</p>;
  }
  const { data: departments } = await apiRequest<Array<{ id: string; name: string }>>("/api/v1/departments", { orgSlug });

  const { data: projects } = await apiRequest<any[]>(department_id ? `/api/v1/projects?department_id=${encodeURIComponent(department_id)}` : "/api/v1/projects", { orgSlug });

  const tasksUrl = `/api/v1/tasks${project_id || department_id ? "?" : ""}${project_id ? `project_id=${encodeURIComponent(project_id)}` : ""}${department_id ? `${project_id ? "&" : ""}department_id=${encodeURIComponent(department_id)}` : ""}`;
  const { data: tasks } = await apiRequest<Task[]>(tasksUrl, { orgSlug });

  const ticketsUrl = `/api/v1/tickets${project_id || department_id ? "?" : ""}${project_id ? `project_id=${encodeURIComponent(project_id)}` : ""}${department_id ? `${project_id ? "&" : ""}department_id=${encodeURIComponent(department_id)}` : ""}`;
  const { data: tickets } = await apiRequest<any[]>(ticketsUrl, { orgSlug });

  const milestonesUrl = `/api/v1/milestones${project_id || department_id ? "?" : ""}${project_id ? `project_id=${encodeURIComponent(project_id)}` : ""}${department_id ? `${project_id ? "&" : ""}department_id=${encodeURIComponent(department_id)}` : ""}`;
  const { data: milestones } = await apiRequest<any[]>(milestonesUrl, { orgSlug });

  return (
    <RoadmapContent
      orgSlug={orgSlug}
      project_id={project_id}
      department_id={department_id}
      error={query.error}
      success={query.success}
      roadmapPermissions={roadmapPermissions}
      departments={departments}
      projects={projects}
      tasks={tasks || []}
      tickets={tickets}
      milestones={milestones}
    />
  );
}
