import { getPermissions } from "@/lib/api-data";
import { ReportCard } from "@/components/ReportCard";
import { REPORTS } from "@/lib/report-config";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function ReportsPage({ params }: PageProps) {
  const { orgSlug } = await params;

  const permRes = await getPermissions(orgSlug);
  const canView = permRes.data?.modules.find((m) => m.key === "reports")?.permissions.can_view ?? false;
  if (!canView) return <p className="p-6 text-red-600">You do not have permission to view reports.</p>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-main">Reports</h1>
        <p className="mt-1 text-muted">Select a report to view data, or download directly in Excel or CSV format.</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {REPORTS.map((report) => (
          <ReportCard
            key={report.key}
            title={report.title}
            description={report.description}
            icon={report.icon}
            reportKey={report.key}
            columns={report.columns}
            orgSlug={orgSlug}
            filters={report.filters}
          />
        ))}
      </div>
    </div>
  );
}
