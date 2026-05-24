"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiRequest } from "@/lib/api-server";

export async function createCredential(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "");
  const path = `/o/${orgSlug}/dashboard/vault`;

  const permRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>("/api/v1/auth/permissions", { orgSlug });
  const canCreate = permRes.data?.modules.find((m) => m.key === "vault")?.permissions.can_create;
  if (!canCreate) redirect(`${path}?error=${encodeURIComponent("You do not have permission to create credentials.")}`);

  const body = {
    label: String(formData.get("label") ?? ""),
    username: String(formData.get("username") ?? "") || null,
    email_id: String(formData.get("email_id") ?? "") || null,
    password: String(formData.get("password") ?? ""),
    notes: String(formData.get("notes") ?? "") || null,
    login_url: String(formData.get("login_url") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    tags: String(formData.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    status: String(formData.get("status") ?? "active"),
  };
  const { error } = await apiRequest("/api/v1/vault", { method: "POST", orgSlug, body });
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Credential created.")}`);
}

export async function updateCredential(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "");
  const credentialId = String(formData.get("credential_id") ?? "");
  const path = `/o/${orgSlug}/dashboard/vault`;

  const permRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", { orgSlug });
  const canEdit = permRes.data?.modules.find((m) => m.key === "vault")?.permissions.can_edit;
  if (!canEdit) redirect(`${path}?error=${encodeURIComponent("You do not have permission to update credentials.")}`);

  const body = {
    label: String(formData.get("label") ?? ""),
    username: String(formData.get("username") ?? "") || null,
    email_id: String(formData.get("email_id") ?? "") || null,
    password: String(formData.get("password") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || null,
    login_url: String(formData.get("login_url") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    tags: String(formData.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    status: String(formData.get("status") ?? "active"),
  };
  const { error } = await apiRequest(`/api/v1/vault/${encodeURIComponent(credentialId)}`, { method: "PATCH", orgSlug, body });
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Credential updated.")}`);
}

export async function deleteCredential(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "");
  const credentialId = String(formData.get("credential_id") ?? "");
  const path = `/o/${orgSlug}/dashboard/vault`;

  const permRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>("/api/v1/auth/permissions", { orgSlug });
  const canDelete = permRes.data?.modules.find((m) => m.key === "vault")?.permissions.can_delete;
  if (!canDelete) redirect(`${path}?error=${encodeURIComponent("You do not have permission to delete credentials.")}`);

  const { error } = await apiRequest(`/api/v1/vault/${encodeURIComponent(credentialId)}`, { method: "DELETE", orgSlug });
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Credential deleted.")}`);
}

export async function updateShare(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "");
  const credentialId = String(formData.get("credential_id") ?? "");
  const path = `/o/${orgSlug}/dashboard/vault?modal=share&credential_id=${credentialId}`;

  const permRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", { orgSlug });
  const canEdit = permRes.data?.modules.find((m) => m.key === "vault")?.permissions.can_edit;
  if (!canEdit) redirect(`${path}&error=${encodeURIComponent("You do not have permission to share credentials.")}`);

  const body = {
    user_id: String(formData.get("user_id") ?? ""),
    access: String(formData.get("access") ?? "grant"),
  };
  const { error } = await apiRequest(`/api/v1/vault/${encodeURIComponent(credentialId)}/shares`, { method: "POST", orgSlug, body });
  if (error) redirect(`${path}&error=${encodeURIComponent(error)}`);
  revalidatePath(`/o/${orgSlug}/dashboard/vault`);
  redirect(`${path}&success=${encodeURIComponent("Share updated.")}`);
}
