import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
import { getReportConfig } from "@/lib/report-config";
import { ReportTable } from "@/components/ReportTable";
import { Button } from "@/components/ui/Button";

type PageProps = {
  params: Promise<{ orgSlug: string; key: string }>;
  searchParams: Promise<Record<string, string>>;
};

export default async function ReportDetailPage({ params, searchParams }: PageProps) {
  const { orgSlug, key } = await params;
  const sp = await searchParams;

  const config = getReportConfig(key);
  if (!config) notFound();

  const paramsStr = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) paramsStr.set(k, v);
  }
  const qs = paramsStr.toString();

  const [permRes, { data: rawData }] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<Record<string, unknown>[]>(
      `/api/v1/reports/${key}${qs ? `?${qs}` : ""}`,
      { orgSlug }
    ),
  ]);

  const canView = permRes.data?.modules.find((m) => m.key === "reports")?.permissions.can_view ?? false;
  if (!canView) return <p className="p-6 text-red-600">You do not have permission to view reports.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/o/${orgSlug}/dashboard/reports`}>
          <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-main">{config.title} Report</h1>
          <p className="text-sm text-muted">{config.description}</p>
        </div>
      </div>

      <ReportTable
        title={config.title}
        reportKey={config.key}
        columns={config.columns}
        filters={config.filters}
        data={rawData ?? []}
        orgSlug={orgSlug}
      />
    </div>
  );
}
