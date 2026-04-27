import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { OrganizationContext } from "@/lib/types";

export async function getOrCreatePrimaryOrganization(): Promise<OrganizationContext> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_user_organization");
  if (error || !data?.length) {
    throw new Error(error?.message ?? "Unable to resolve organization.");
  }
  const org = data[0];
  return {
    organization_id: org.organization_id,
    organization_slug: org.organization_slug,
    organization_name: org.organization_name,
    role: org.role,
  };
}

export async function getOrganizationContextOrRedirect(orgSlug: string): Promise<OrganizationContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations!inner(id,slug,name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("organizations.slug", orgSlug)
    .limit(1)
    .maybeSingle();

  if (error || !data?.organizations) {
    const fallback = await getOrCreatePrimaryOrganization();
    redirect(`/o/${fallback.organization_slug}/dashboard`);
  }

  const org = Array.isArray(data.organizations) ? data.organizations[0] : data.organizations;

  if (!org?.id || !org.slug || !org.name) {
    const fallback = await getOrCreatePrimaryOrganization();
    redirect(`/o/${fallback.organization_slug}/dashboard`);
  }

  return {
    organization_id: org.id,
    organization_slug: org.slug,
    organization_name: org.name,
    role: data.role,
  };
}

export function canManageOrganizationUsers(role: string): boolean {
  return role === "owner" || role === "admin";
}
