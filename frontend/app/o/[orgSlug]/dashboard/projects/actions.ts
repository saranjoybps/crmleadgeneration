"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";

export async function createProject(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const departmentIds = formData.getAll("department_ids").map((v) => String(v).trim()).filter(Boolean);
  const path = `/o/${orgSlug}/dashboard/projects`;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  
  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_create: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const projectsPermissions = permissionsResponse.data?.modules.find(m => m.key === "projects")?.permissions;
  if (!projectsPermissions?.can_create) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create projects.")}`);
  }
  
  if (!name) {
    redirect(`${path}?error=${encodeURIComponent("Project name is required.")}`);
  }

  const ids = formData.getAll("member_user_ids").map((value) => String(value).trim()).filter(Boolean);
  
  const { error } = await apiRequest<{ id: string; name: string; description?: string; status: string }>("/api/v1/projects", {
    method: "POST",
    orgSlug,
    body: {
      name,
      department_ids: departmentIds,
      description: description || null,
      status: "active",
      member_user_ids: ids,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Project created.")}`);
}

export async function updateProject(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const departmentIds = formData.getAll("department_ids").map((v) => String(v).trim()).filter(Boolean);
  const status = String(formData.get("status") ?? "active").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_edit: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const projectsPermissions = permissionsResponse.data?.modules.find(m => m.key === "projects")?.permissions;
  if (!projectsPermissions?.can_edit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to edit projects.")}`);
  }

  const { error } = await apiRequest<{ id: string; name: string; description?: string; status: string }>(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    orgSlug,
    body: {
      name: name || undefined,
      department_ids: departmentIds.length ? departmentIds : undefined,
      description: description || null,
      status,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Project updated.")}`);
}

export async function deleteProject(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_delete: boolean } }>;
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

export async function addProjectMember(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_edit: boolean } }>;
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

export async function removeProjectMember(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_edit: boolean } }>;
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
