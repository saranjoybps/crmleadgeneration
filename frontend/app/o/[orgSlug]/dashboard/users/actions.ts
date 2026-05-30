"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { apiRequest } from "@/lib/api-server";

export async function createUserDirect(formData: FormData) {
  const debugId = randomUUID();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const rawRoleKey = String(formData.get("role") ?? "member").trim().toLowerCase();
  const roleKey = rawRoleKey || "member";
  const path = `/o/${orgSlug}/dashboard/users`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canCreateUsers = permsRes.data?.modules.find((m) => m.key === "users")?.permissions.can_create ?? false;
  if (!canCreateUsers) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create users.")}`);

  if (!email || !password) redirect(`${path}?error=${encodeURIComponent("Email and password are required.")}`);

  const { error } = await apiRequest("/api/v1/users", {
    method: "POST",
    orgSlug,
    body: { email, password, full_name: fullName || null, role_key: roleKey },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent(`User created: ${email}`)}`);
}

export async function updateMemberRole(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const roleKey = String(formData.get("role") ?? "member").trim().toLowerCase();
  const path = `/o/${orgSlug}/dashboard/users`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canEditUsers = permsRes.data?.modules.find((m) => m.key === "users")?.permissions.can_edit ?? false;
  if (!canEditUsers) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to edit users.")}`);

  const { error } = await apiRequest(`/api/v1/auth/assign-role`, {
    method: "POST",
    orgSlug,
    body: { user_id: String(formData.get("user_id")), role_key: roleKey },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Role updated.")}`);
}

export async function updateUserDetails(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/users`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canEditUsers = permsRes.data?.modules.find((m) => m.key === "users")?.permissions.can_edit ?? false;
  if (!canEditUsers) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to edit users.")}`);

  const { error } = await apiRequest(`/api/v1/users/${userId}`, {
    method: "PATCH",
    orgSlug,
    body: { full_name: fullName || null },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("User updated.")}`);
}

export async function removeMember(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const membershipId = String(formData.get("member_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/users`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canDeleteUsers = permsRes.data?.modules.find((m) => m.key === "users")?.permissions.can_delete ?? false;
  if (!canDeleteUsers) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to remove users.")}`);

  const { error } = await apiRequest(`/api/v1/users/${encodeURIComponent(membershipId)}`, {
    method: "DELETE",
    orgSlug,
  });
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Member removed.")}`);
}
