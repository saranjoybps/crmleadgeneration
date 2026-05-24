import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { ProjectsContent } from "./ProjectsContent";

type ProjectsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; modal?: "view" | "edit" | "delete" | "create"; project?: string; department_id?: string }>;
};

type UserOption = { user_id: string; email: string };
type ProjectRow = { id: string; name: string; description?: string; status: string; department_id?: string; department_ids?: string[] };
type MemberRow = { project_id: string; user_id: string; users?: { email?: string; full_name?: string } | Array<{ email?: string; full_name?: string }> };
type UserRow = { id: string; email: string; full_name?: string };

export default async function ProjectsPage({ params, searchParams }: ProjectsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const org = await getOrganizationContextOrRedirect(orgSlug);

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const projectsPermissions = permissionsResponse.data?.modules.find(m => m.key === "projects")?.permissions || { can_view: false, can_create: false, can_edit: false, can_delete: false };

  const projectPath = query.department_id ? `/api/v1/projects?department_id=${encodeURIComponent(query.department_id)}` : "/api/v1/projects";
  const [projectsRes, usersRes, membersRes, departmentsRes] = await Promise.all([
    apiRequest<ProjectRow[]>(projectPath, { orgSlug }),
    apiRequest<UserRow[]>("/api/v1/users?limit=200&offset=0", { orgSlug }),
    apiRequest<MemberRow[]>("/api/v1/projects/all-members", { orgSlug }),
    apiRequest<Array<{ id: string; name: string }>>("/api/v1/departments", { orgSlug }),
  ]);

  if (!projectsPermissions.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view projects.</p>;
  }

  if (projectsRes.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{projectsRes.error}</div>;

  const projects = projectsRes.data ?? [];
  const departments = departmentsRes.data ?? [];
  const users = usersRes.data ?? [];
  const members = membersRes.data ?? [];

  return (
    <ProjectsContent
      orgSlug={orgSlug}
      query={{
        error: query.error,
        success: query.success,
        department_id: query.department_id,
      }}
      projects={projects}
      departments={departments}
      users={users}
      members={members}
      projectsPermissions={projectsPermissions}
    />
  );
}
