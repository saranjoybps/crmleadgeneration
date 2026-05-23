import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const projectsPermissions = permissionsResponse.data?.modules.find(m => m.key === "projects")?.permissions || { can_view: false, can_create: false, can_edit: false, can_delete: false };

  const projectPath = query.department_id ? `/api/v1/projects?department_id=${encodeURIComponent(query.department_id)}` : "/api/v1/projects";
  const [projectsRes, usersRes, membersResp, departmentsRes] = await Promise.all([
    apiRequest<ProjectRow[]>(projectPath, { orgSlug }),
    apiRequest<UserRow[]>("/api/v1/users?limit=200&offset=0", { orgSlug }),
    supabase
      .from("project_members")
      .select("project_id,user_id,users!project_members_user_id_fkey(email,full_name)")
      .eq("tenant_id", org.organization_id)
      .eq("is_active", true),
    apiRequest<Array<{ id: string; name: string }>>("/api/v1/departments", { orgSlug }),
  ]);

  if (projectsRes.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{projectsRes.error}</div>;

  const projects = projectsRes.data ?? [];
  const departments = departmentsRes.data ?? [];
  const users = usersRes.data ?? [];
  const members = (membersResp.data ?? []) as MemberRow[];

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
