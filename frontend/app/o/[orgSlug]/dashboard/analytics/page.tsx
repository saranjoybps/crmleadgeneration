import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { AnalyticsClient } from "./client";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function AnalyticsPage({ params }: PageProps) {
  const { orgSlug } = await params;
  await getOrganizationContextOrRedirect(orgSlug);

  const permRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_view: boolean } }> }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const canView = permRes.data?.modules.find((m) => m.key === "analytics")?.permissions.can_view ?? false;
  if (!canView) return <p className="p-6 text-red-600">You do not have permission to view analytics.</p>;

  const { data } = await apiRequest("/api/v1/analytics/overview?months=12", { orgSlug, cache: "no-store" });

  return <AnalyticsClient data={(data ?? {}) as Record<string, unknown>} orgSlug={orgSlug} />;
}
