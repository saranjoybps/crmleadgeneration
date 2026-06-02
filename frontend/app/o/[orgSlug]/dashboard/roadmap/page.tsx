import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
import { Task } from "@/lib/types";
import RoadmapContent from "./RoadmapContent";

function buildUrl(base: string, project_id?: string, department_id?: string): string {
  const params = new URLSearchParams();
  if (project_id) params.set("project_id", project_id);
  if (department_id) params.set("department_id", department_id);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function RoadmapPage({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>,
  searchParams: Promise<{ project_id?: string; department_id?: string; error?: string; success?: string }>
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const { project_id, department_id } = query;

  const [permissionsResponse, departmentsRes, projectsRes, tasksRes, ticketsRes, milestonesRes] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<Array<{ id: string; name: string }>>("/api/v1/departments", { orgSlug }),
    apiRequest<any[]>(buildUrl("/api/v1/projects", project_id, department_id), { orgSlug }),
    apiRequest<Task[]>(buildUrl("/api/v1/tasks", project_id, department_id), { orgSlug }),
    apiRequest<any[]>(buildUrl("/api/v1/tickets", project_id, department_id), { orgSlug }),
    apiRequest<any[]>(buildUrl("/api/v1/milestones", project_id, department_id), { orgSlug }),
  ]);

  const roadmapPermissions = permissionsResponse.data?.modules.find((m) => m.key === "roadmap")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!roadmapPermissions.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view roadmap.</p>;
  }

  return (
    <RoadmapContent
      orgSlug={orgSlug}
      project_id={project_id}
      department_id={department_id}
      error={query.error}
      success={query.success}
      roadmapPermissions={roadmapPermissions}
      departments={departmentsRes.data}
      projects={projectsRes.data}
      tasks={tasksRes.data || []}
      tickets={ticketsRes.data}
      milestones={milestonesRes.data}
    />
  );
}
