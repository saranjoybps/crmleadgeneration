import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import type { Asset, AssetAssignment, User } from "@/lib/types";
import AssetsContent from "./AssetsContent";

export default async function AssetsPage({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>,
  searchParams: Promise<{ error?: string; success?: string }>,
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });

  const assetsPerm = permissionsResponse.data?.modules.find((m) => m.key === "assets")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };

  if (!assetsPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view assets.</p>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? "";

  const [assetsRes, assignmentsRes, usersRes] = await Promise.all([
    apiRequest<Asset[]>("/api/v1/assets", { orgSlug }),
    apiRequest<AssetAssignment[]>("/api/v1/assets/assignments", { orgSlug }),
    apiRequest<User[]>("/api/v1/users", { orgSlug }),
  ]);

  return (
    <AssetsContent
      orgSlug={orgSlug}
      currentUserId={currentUserId}
      assetsPerm={assetsPerm}
      assets={assetsRes.data ?? []}
      assignments={assignmentsRes.data ?? []}
      users={usersRes.data ?? []}
      error={query.error ?? ""}
      success={query.success ?? ""}
    />
  );
}
