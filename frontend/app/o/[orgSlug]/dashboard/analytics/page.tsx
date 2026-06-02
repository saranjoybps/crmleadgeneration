import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
import { AnalyticsClient } from "./client";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function AnalyticsPage({ params }: PageProps) {
  const { orgSlug } = await params;

  const [permRes, { data }] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest("/api/v1/analytics/overview?months=12", { orgSlug }),
  ]);

  const canView = permRes.data?.modules.find((m) => m.key === "analytics")?.permissions.can_view ?? false;
  if (!canView) return <p className="p-6 text-red-600">You do not have permission to view analytics.</p>;

  return <AnalyticsClient data={(data ?? {}) as Record<string, unknown>} orgSlug={orgSlug} />;
}
