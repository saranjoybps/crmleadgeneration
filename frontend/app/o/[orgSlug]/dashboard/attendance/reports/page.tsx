import Link from "next/link";
import { Info, Calendar, ArrowLeft, TrendingUp } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/types";

type ReportsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    date?: string;
    from?: string;
    to?: string;
    view?: "daily" | "summary";
  }>;
};

const STATUS_BADGE: Record<AttendanceStatus, { label: string; variant: "success" | "warning" | "danger" | "secondary" | "info" }> = {
  present: { label: "Present", variant: "success" },
  late: { label: "Late", variant: "warning" },
  half_day: { label: "Half Day", variant: "info" },
  absent: { label: "Absent", variant: "danger" },
  overtime: { label: "Overtime", variant: "secondary" },
  on_leave: { label: "On Leave", variant: "info" },
};

function formatMinutes(mins: number | null): string {
  if (!mins && mins !== 0) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const attPerm = permsRes.data?.modules.find((m) => m.key === "attendance")?.permissions ?? { can_view: false };
  if (!attPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view reports.</p>;
  }

  const view = query.view || "daily";
  const today = new Date().toISOString().split("T")[0];

  let dailyData: any = null;
  let summaryData: any = null;

  if (view === "daily") {
    const reportDate = query.date || today;
    const { data } = await apiRequest(`/api/v1/attendance/reports/daily?date=${reportDate}`, { orgSlug });
    dailyData = data;
  } else {
    const paramsObj = new URLSearchParams();
    if (query.from) paramsObj.set("from_date", query.from);
    if (query.to) paramsObj.set("to_date", query.to);
    const { data } = await apiRequest(`/api/v1/attendance/reports/summary?${paramsObj.toString()}`, { orgSlug });
    summaryData = data;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/o/${orgSlug}/dashboard/attendance`}>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-main">Attendance Reports</h1>
            <p className="text-muted">View attendance summaries and trends.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/o/${orgSlug}/dashboard/attendance/reports?view=daily`}>
            <Button variant={view === "daily" ? "primary" : "outline"} size="sm">Daily</Button>
          </Link>
          <Link href={`/o/${orgSlug}/dashboard/attendance/reports?view=summary`}>
            <Button variant={view === "summary" ? "primary" : "outline"} size="sm">Summary</Button>
          </Link>
        </div>
      </header>

      {query.error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <Info className="h-5 w-5 text-red-500" />
          {query.error}
        </div>
      )}

      {view === "daily" && (
        <>
          <Card className="p-4">
            <form className="flex items-end gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">Date</label>
                <input type="date" name="date" defaultValue={query.date || today}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500" />
              </div>
              <input type="hidden" name="view" value="daily" />
              <Button type="submit" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                View
              </Button>
            </form>
          </Card>

          {dailyData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-main">{dailyData.summary?.present || 0}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mt-1">Present</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{dailyData.summary?.late || 0}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mt-1">Late</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-violet-600">{dailyData.summary?.half_day || 0}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mt-1">Half Day</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{dailyData.summary?.absent || 0}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mt-1">Absent</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{dailyData.summary?.overtime || 0}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mt-1">Overtime</p>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">
                  Records for {dailyData.date}
                </h3>
                {dailyData.records?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-soft text-left text-xs font-bold uppercase tracking-wider text-muted">
                          <th className="pb-3 pr-4">Employee</th>
                          <th className="pb-3 pr-4">Check In</th>
                          <th className="pb-3 pr-4">Check Out</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyData.records.map((record: any) => (
                          <tr key={record.id} className="border-b border-soft/50 last:border-0">
                            <td className="py-3 pr-4 font-medium">
                              {record.user?.full_name || record.user?.email || "-"}
                            </td>
                            <td className="py-3 pr-4 text-muted">{formatTime(record.check_in_time)}</td>
                            <td className="py-3 pr-4 text-muted">{formatTime(record.check_out_time)}</td>
                            <td className="py-3 pr-4">
                              <Badge variant={STATUS_BADGE[record.status as AttendanceStatus]?.variant}>
                                {STATUS_BADGE[record.status as AttendanceStatus]?.label}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4 font-medium">{formatMinutes(record.working_minutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted text-center py-6">No records for this date.</p>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      {view === "summary" && (
        <>
          <Card className="p-4">
            <form className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">From</label>
                <input type="date" name="from" defaultValue={query.from}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">To</label>
                <input type="date" name="to" defaultValue={query.to}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500" />
              </div>
              <input type="hidden" name="view" value="summary" />
              <Button type="submit" size="sm" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Generate
              </Button>
            </form>
          </Card>

          {summaryData && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-main">{summaryData.total_records || 0}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mt-1">Total Records</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-main">{summaryData.total_working_hours || 0}h</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mt-1">Total Working Hours</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{summaryData.total_late_minutes || 0}m</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mt-1">Total Late Minutes</p>
                </Card>
              </div>

              {summaryData.total_overtime_hours > 0 && (
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{summaryData.total_overtime_hours}h</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mt-1">Total Overtime Hours</p>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
