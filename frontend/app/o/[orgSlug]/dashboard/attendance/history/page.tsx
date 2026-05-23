import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Info, Calendar, Filter, ArrowLeft, Edit, Trash2 } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus, User } from "@/lib/types";

type HistoryPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    from?: string;
    to?: string;
    status?: string;
    user_id?: string;
    all?: string;
    modal?: "edit" | "delete";
    record_id?: string;
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

async function deleteRecord(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const recordId = String(formData.get("record_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/attendance/history`;
  const { error } = await apiRequest(`/api/v1/attendance/records/${encodeURIComponent(recordId)}`, {
    method: "DELETE",
    orgSlug,
  });
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Record deleted.")}`);
}

async function editRecord(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const recordId = String(formData.get("record_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/attendance/history`;

  const body: Record<string, unknown> = {};
  const checkIn = formData.get("check_in_time");
  if (checkIn) body.check_in_time = checkIn;
  const checkOut = formData.get("check_out_time");
  if (checkOut) body.check_out_time = checkOut;
  const status = formData.get("status");
  if (status) body.status = status;
  const correctionReason = formData.get("correction_reason");
  if (correctionReason) body.correction_reason = correctionReason;

  const { error } = await apiRequest(`/api/v1/attendance/records/${encodeURIComponent(recordId)}`, {
    method: "PATCH",
    orgSlug,
    body,
  });
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Record updated.")}`);
}

export default async function HistoryPage({ params, searchParams }: HistoryPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const attPerm = permsRes.data?.modules.find((m) => m.key === "attendance")?.permissions ?? {
    can_view: false, can_edit: false, can_delete: false,
  };
  if (!attPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view attendance records.</p>;
  }

  const showAll = query.all === "true" && (permsRes.data?.modules.find((m) => m.key === "users")?.permissions.can_view ?? false);

  const paramsObj = new URLSearchParams();
  if (query.from) paramsObj.set("from_date", query.from);
  if (query.to) paramsObj.set("to_date", query.to);
  if (query.status) paramsObj.set("status", query.status);
  if (query.user_id) paramsObj.set("user_id", query.user_id);

  const apiPath = showAll
    ? `/api/v1/attendance/records/all?${paramsObj.toString()}`
    : `/api/v1/attendance/records?${paramsObj.toString()}`;

  const { data: records, error: recordsError } = await apiRequest<AttendanceRecord[]>(apiPath, { orgSlug });

  const selectedRecord = records?.find((r) => r.id === query.record_id);

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
            <h1 className="text-3xl font-bold tracking-tight text-main">Attendance History</h1>
            <p className="text-muted">{showAll ? "All employees" : "Your"} attendance records.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {permsRes.data?.modules.find((m) => m.key === "users")?.permissions.can_view && (
            <Link
              href={`/o/${orgSlug}/dashboard/attendance/history${showAll ? "" : "?all=true"}`}
            >
              <Button variant={showAll ? "primary" : "outline"} size="sm">
                {showAll ? "My Records" : "All Employees"}
              </Button>
            </Link>
          )}
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

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">From</label>
            <input
              type="date"
              name="from"
              defaultValue={query.from}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">To</label>
            <input
              type="date"
              name="to"
              defaultValue={query.to}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">Status</label>
            <select
              name="status"
              defaultValue={query.status}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
            >
              <option value="">All</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
              <option value="overtime">Overtime</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
          <input type="hidden" name="all" value={query.all || ""} />
          <Button type="submit" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Link href={`/o/${orgSlug}/dashboard/attendance/history`}>
            <Button variant="ghost" size="sm">Clear</Button>
          </Link>
        </form>
      </Card>

      {recordsError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{recordsError}</div>
      )}

      <Card className="p-6">
        {records && records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft text-left text-xs font-bold uppercase tracking-wider text-muted">
                  {showAll && <th className="pb-3 pr-4">Employee</th>}
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Check In</th>
                  <th className="pb-3 pr-4">Check Out</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Hours</th>
                  {showAll && <th className="pb-3 pr-4">Shift</th>}
                  {(attPerm.can_edit || attPerm.can_delete) && <th className="pb-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-soft/50 last:border-0">
                    {showAll && (
                      <td className="py-3 pr-4 font-medium">
                        {record.user?.full_name || record.user?.email || "-"}
                      </td>
                    )}
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
                    {showAll && (
                      <td className="py-3 pr-4 text-muted">{record.shift?.name || "-"}</td>
                    )}
                    {(attPerm.can_edit || attPerm.can_delete) && (
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {attPerm.can_edit && (
                            <Link
                              href={`/o/${orgSlug}/dashboard/attendance/history?modal=edit&record_id=${record.id}&all=${query.all || ""}&from=${query.from || ""}&to=${query.to || ""}&status=${query.status || ""}`}
                            >
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                          {attPerm.can_delete && (
                            <Link
                              href={`/o/${orgSlug}/dashboard/attendance/history?modal=delete&record_id=${record.id}&all=${query.all || ""}`}
                            >
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-6">No records found for the selected filters.</p>
        )}
      </Card>

      {selectedRecord && query.modal === "edit" && (
        <Modal isOpen={true} closeHref={`/o/${orgSlug}/dashboard/attendance/history`} title="Edit Attendance Record" size="md">
          <form action={editRecord} className="space-y-5 p-1">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="record_id" value={selectedRecord.id} />
            <p className="text-xs text-muted mb-2">
              Editing record for <strong>{new Date(selectedRecord.date + "T00:00:00").toLocaleDateString()}</strong>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Check In</label>
                <input
                  type="datetime-local"
                  name="check_in_time"
                  defaultValue={selectedRecord.check_in_time?.replace("Z", "") || ""}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Check Out</label>
                <input
                  type="datetime-local"
                  name="check_out_time"
                  defaultValue={selectedRecord.check_out_time?.replace("Z", "") || ""}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Status</label>
              <select
                name="status"
                defaultValue={selectedRecord.status}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
                <option value="overtime">Overtime</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Correction Reason</label>
              <textarea
                name="correction_reason"
                rows={2}
                className="h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="Reason for correction..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" className="flex-1">Save Changes</Button>
              <Link href={`/o/${orgSlug}/dashboard/attendance/history`}>
                <Button variant="outline" size="lg" className="border-none text-muted">Cancel</Button>
              </Link>
            </div>
          </form>
        </Modal>
      )}

      {selectedRecord && query.modal === "delete" && (
        <Modal isOpen={true} closeHref={`/o/${orgSlug}/dashboard/attendance/history`} title="Delete Record" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Delete Attendance Record?</h4>
              <p className="mt-2 text-xs text-muted">
                Delete record for {new Date(selectedRecord.date + "T00:00:00").toLocaleDateString()}?
              </p>
            </div>
            <form action={deleteRecord} className="flex flex-col gap-2 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="record_id" value={selectedRecord.id} />
              <Button variant="danger" type="submit" className="py-3">Delete</Button>
              <Link href={`/o/${orgSlug}/dashboard/attendance/history`}>
                <Button variant="outline" className="w-full py-3 border-none text-muted">Cancel</Button>
              </Link>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
