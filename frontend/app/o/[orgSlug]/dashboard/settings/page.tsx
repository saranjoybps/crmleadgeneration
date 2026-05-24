import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { apiRequest } from "@/lib/api-server";
import SettingsContent from "./SettingsContent";

export default async function SettingsPage({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; tab?: string }>;
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const initialTab = query.tab || "profile";
  const initialError = query.error ?? null;
  const initialSuccess = query.success ?? null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getOrganizationContextOrRedirect(orgSlug);
  const permissionsResponse = await apiRequest<{
    modules: Array<{
      key: string;
      permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
    }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const modules = permissionsResponse.data?.modules ?? [];
  const mod = (key: string) =>
    modules.find((m) => m.key === key)?.permissions ?? { can_view: false, can_create: false, can_edit: false, can_delete: false };
  const settingsPerm = mod("settings");
  const canViewSettings = settingsPerm.can_view;
  const canManage = settingsPerm.can_edit;

  const tenantRes = await supabase.from("tenants").select("id,slug,name,contact_email,domain").eq("id", org.organization_id).maybeSingle();

  if (tenantRes.error || !tenantRes.data) return <p className="p-6 text-red-600">Tenant not found.</p>;
  const tenant = tenantRes.data;

  return (
    <SettingsContent
      orgSlug={orgSlug}
      initialTab={initialTab}
      initialError={initialError}
      initialSuccess={initialSuccess}
      user={user}
      tenant={tenant}
      canManage={canManage}
      canViewSettings={canViewSettings}
    />
  );
}
