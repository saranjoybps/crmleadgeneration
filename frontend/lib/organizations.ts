import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { OrganizationContext } from "@/lib/types";

async function _getOrCreatePrimaryOrganization(): Promise<OrganizationContext> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_user_tenant", { p_tenant_slug: null });
  if (error || !data?.length) {
    throw new Error(error?.message ?? "Unable to resolve organization.");
  }
  const org = data[0];
  const departments = data
    .filter((r: any) => r.department_id)
    .map((r: any) => ({ id: r.department_id, name: r.department_name }));
  return {
    organization_id: org.tenant_id,
    organization_slug: org.tenant_slug,
    organization_name: org.tenant_name,
    role: org.role_key,
    departments,
  };
}

export const getOrCreatePrimaryOrganization = cache(_getOrCreatePrimaryOrganization);

async function _getOrganizationContextOrRedirect(orgSlug: string): Promise<OrganizationContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase.rpc("ensure_user_tenant", { p_tenant_slug: orgSlug });
  if (error || !data?.length) {
    const fallback = await getOrCreatePrimaryOrganization();
    redirect(`/o/${fallback.organization_slug}/dashboard`);
  }

  const departments = data
    .filter((r: any) => r.department_id)
    .map((r: any) => ({ id: r.department_id, name: r.department_name }));
  const row = data[0];
  return {
    organization_id: row.tenant_id,
    organization_slug: row.tenant_slug,
    organization_name: row.tenant_name,
    role: row.role_key,
    departments,
  };
}

export const getOrganizationContextOrRedirect = cache(_getOrganizationContextOrRedirect);

export function canManageOrganizationUsers(role: string): boolean {
  return role === "owner" || role === "admin";
}
