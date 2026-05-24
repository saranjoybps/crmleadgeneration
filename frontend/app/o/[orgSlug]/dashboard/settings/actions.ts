"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { apiRequest } from "@/lib/api-server";

function cleanOptional(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function updateProfileDetails(formData: FormData) {
  const organizationSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${organizationSlug}/dashboard/settings`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = cleanOptional(formData.get("full_name"));
  const avatarUrl = cleanOptional(formData.get("avatar_url"));

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      job_title: cleanOptional(formData.get("job_title")),
      avatar_url: avatarUrl,
    },
  });

  if (authError) redirect(`${path}?error=${encodeURIComponent(authError.message)}`);

  const { error: dbError } = await supabase
    .from("users")
    .update({ 
      full_name: fullName,
      avatar_url: avatarUrl
    })
    .eq("auth_user_id", user.id);

  if (dbError) {
    console.error("Failed to sync profile to users table:", dbError);
  }

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Profile updated successfully.")}`);
}

export async function updateTenantDetails(formData: FormData) {
  const tenantId = String(formData.get("organization_id") ?? "").trim();
  const tenantSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${tenantSlug}/dashboard/settings`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await getOrganizationContextOrRedirect(tenantSlug);
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug: tenantSlug, cache: "no-store" }
  );
  const canEditSettings = permsRes.data?.modules.find((m) => m.key === "settings")?.permissions.can_edit ?? false;
  if (!canEditSettings) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to update tenant details.")}`);
  }

  const payload = {
    name: cleanOptional(formData.get("name")),
    contact_email: cleanOptional(formData.get("contact_email")),
    domain: cleanOptional(formData.get("domain")),
  };

  if (!payload.name) redirect(`${path}?error=${encodeURIComponent("Tenant name is required.")}`);

  const { error } = await supabase.from("tenants").update(payload).eq("id", tenantId);
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Tenant details updated successfully.")}`);
}
