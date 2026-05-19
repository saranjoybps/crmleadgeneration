import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Clock, LogIn, LogOut, Calendar, Info, CheckCircle2, AlertTriangle, XCircle, Timer } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/types";

type AttendancePageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

async function checkInAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/attendance`;

  const { error } = await apiRequest("/api/v1/attendance/check-in", {
    method: "POST",
    orgSlug,
    body: { note: note || null },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Checked in successfully.")}`);
}

async function checkOutAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/attendance`;

  const { error } = await apiRequest("/api/v1/attendance/check-out", {
    method: "POST",
    orgSlug,
    body: { note: note || null },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Checked out successfully.")}`);
}

const STATUS_BADGE: Record<AttendanceStatus, { label: string; variant: "success" | "warning" | "danger" | "secondary" | "info" }> = {
  present: { label: "Present", variant: "success" },
  late: { label: "Late", variant: "warning" },
  half_day: { label: "Half Day", variant: "info" },
  absent: { label: "Absent", variant: "danger" },
  overtime: { label: "Overtime", variant: "secondary" },
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

export default async function AttendancePage({ params, searchParams }: AttendancePageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const attPerm = permissionsResponse.data?.modules.find((m) => m.key === "attendance")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false,
  };
  if (!attPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view attendance.</p>;
  }

  const { data: todayRecord, error: todayError } = await apiRequest<AttendanceRecord>(
    "/api/v1/attendance/today", { orgSlug }
  );

  const { data: recentRecords } = await apiRequest<AttendanceRecord[]>(
    "/api/v1/attendance/records", { orgSlug }
  );

  const isCheckedIn = todayRecord && !todayRecord.check_out_time;
  const isCheckedOut = todayRecord && todayRecord.check_out_time;
  const canCheckIn = attPerm.can_create && !todayRecord;
  const canCheckOut = attPerm.can_edit && isCheckedIn;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Attendance</h1>
          <p className="text-muted">Check in and out to track your working hours.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/o/${orgSlug}/dashboard/attendance/history`}>
            <Button variant="outline" size="lg" className="gap-2">
              <Calendar className="h-4 w-4" />
              History
            </Button>
          </Link>
        </div>
      </header>

      {query.error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <Info className="h-5 w-5 text-red-500" />
          {query.error}
        </div>
      )}

      {query.success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <Info className="h-5 w-5 text-emerald-500" />
          {query.success}
        </div>
      )}

      {todayError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{todayError}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className={cn(
              "mb-6 flex h-24 w-24 items-center justify-center rounded-full",
              isCheckedOut ? "bg-slate-100 text-slate-400" :
              isCheckedIn ? "bg-emerald-50 text-emerald-600" :
              "bg-violet-50 text-violet-600"
            )}>
              {isCheckedOut ? (
                <LogOut className="h-10 w-10" />
              ) : isCheckedIn ? (
                <LogIn className="h-10 w-10" />
              ) : (
                <Clock className="h-10 w-10" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-main">
              {isCheckedOut ? "Checked Out" :
               isCheckedIn ? "Checked In" :
               "Not Checked In"}
            </h2>

            {todayRecord && todayRecord.shift && (
              <p className="mt-1 text-sm text-muted">
                Shift: {todayRecord.shift.name}
                ({formatTime(todayRecord.shift.start_time)} - {formatTime(todayRecord.shift.end_time)})
              </p>
            )}

            {isCheckedIn && (
              <p className="mt-1 text-sm text-muted">
                Checked in at {formatTime(todayRecord!.check_in_time)}
              </p>
            )}

            {isCheckedOut && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-muted">
                  In: {formatTime(todayRecord!.check_in_time)} &middot; Out: {formatTime(todayRecord!.check_out_time)}
                </p>
                <p className="text-sm font-bold text-main">
                  Total: {formatMinutes(todayRecord!.working_minutes)}
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {canCheckIn && (
                <form action={checkInAction} className="flex gap-2">
                  <input type="hidden" name="organization_slug" value={orgSlug} />
                  <input
                    type="text"
                    name="note"
                    placeholder="Optional note..."
                    className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500 w-48"
                  />
                  <Button type="submit" size="lg" className="gap-2 shadow-lg shadow-emerald-200">
                    <LogIn className="h-5 w-5" />
                    Check In
                  </Button>
                </form>
              )}
              {canCheckOut && (
                <form action={checkOutAction} className="flex gap-2">
                  <input type="hidden" name="organization_slug" value={orgSlug} />
                  <input
                    type="text"
                    name="note"
                    placeholder="Optional note..."
                    className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500 w-48"
                  />
                  <Button type="submit" size="lg" variant="danger" className="gap-2 shadow-lg shadow-red-200">
                    <LogOut className="h-5 w-5" />
                    Check Out
                  </Button>
                </form>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Today&apos;s Status</h3>
          {todayRecord ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Status</span>
                <Badge variant={STATUS_BADGE[todayRecord.status]?.variant}>
                  {STATUS_BADGE[todayRecord.status]?.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Working Hours</span>
                <span className="text-sm font-bold">{formatMinutes(todayRecord.working_minutes)}</span>
              </div>
              {todayRecord.late_minutes != null && todayRecord.late_minutes > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Late By</span>
                  <span className="text-sm font-bold text-amber-600">{todayRecord.late_minutes} min</span>
                </div>
              )}
              {todayRecord.overtime_minutes != null && todayRecord.overtime_minutes > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Overtime</span>
                  <span className="text-sm font-bold text-violet-600">{todayRecord.overtime_minutes} min</span>
                </div>
              )}
              {todayRecord.shift && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Shift</span>
                  <span className="text-sm font-bold">{todayRecord.shift.name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center text-muted">
              <Timer className="h-8 w-8 mb-2 text-slate-300" />
              <p className="text-sm">No record for today</p>
              <p className="text-xs mt-1">Check in to start tracking</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Recent Activity</h3>
        {recentRecords && recentRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft text-left text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Check In</th>
                  <th className="pb-3 pr-4">Check Out</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Hours</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.slice(0, 7).map((record) => (
                  <tr key={record.id} className="border-b border-soft/50 last:border-0">
                    <td className="py-3 pr-4 font-medium">
                      {new Date(record.date + "T00:00:00").toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 text-muted">{formatTime(record.check_in_time)}</td>
                    <td className="py-3 pr-4 text-muted">{formatTime(record.check_out_time)}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_BADGE[record.status]?.variant}>
                        {STATUS_BADGE[record.status]?.label}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-medium">{formatMinutes(record.working_minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-6">No attendance records yet.</p>
        )}
      </Card>
    </div>
  );
}
