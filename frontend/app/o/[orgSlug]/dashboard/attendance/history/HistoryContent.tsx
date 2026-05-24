"use client";

import { format } from "date-fns";
import { useState } from "react";
import Link from "next/link";
import { Info, Filter, ArrowLeft, Edit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { editRecord, deleteRecord } from "./actions";

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

type ModalState = { type: "edit"; record_id: string } | { type: "delete"; record_id: string } | null;

export default function HistoryContent({
  orgSlug,
  records,
  showAll,
  canEdit,
  canDelete,
  canViewAllUsers,
  queryFrom,
  queryTo,
  queryStatus,
  error,
  success,
  recordsError,
}: {
  orgSlug: string;
  records: AttendanceRecord[] | null | undefined;
  showAll: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewAllUsers: boolean;
  queryFrom?: string;
  queryTo?: string;
  queryStatus?: string;
  error?: string;
  success?: string;
  recordsError?: string;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const selectedRecord = modal?.record_id ? records?.find((r) => r.id === modal.record_id) : undefined;

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
          {canViewAllUsers && (
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

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <Info className="h-5 w-5 text-red-500" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <Info className="h-5 w-5 text-emerald-500" />
          {success}
        </div>
      )}

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">From</label>
            <input
              type="date"
              name="from"
              defaultValue={queryFrom}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">To</label>
            <input
              type="date"
              name="to"
              defaultValue={queryTo}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">Status</label>
            <select
              name="status"
              defaultValue={queryStatus}
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
          <input type="hidden" name="all" value={showAll ? "true" : ""} />
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
                  {(canEdit || canDelete) && <th className="pb-3">Actions</th>}
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
                      {format(new Date(record.date + "T00:00:00"), "MMM d, yyyy")}
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
                    {(canEdit || canDelete) && (
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={() => setModal({ type: "edit", record_id: record.id })}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600" onClick={() => setModal({ type: "delete", record_id: record.id })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

      {selectedRecord && modal?.type === "edit" && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Edit Attendance Record" size="md">
          <form action={editRecord} className="space-y-5 p-1">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="record_id" value={selectedRecord.id} />
            <p className="text-xs text-muted mb-2">
              Editing record for <strong>{format(new Date(selectedRecord.date + "T00:00:00"), "MMM d, yyyy")}</strong>
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
              <Button variant="outline" size="lg" className="border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {selectedRecord && modal?.type === "delete" && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Delete Record" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Delete Attendance Record?</h4>
              <p className="mt-2 text-xs text-muted">
                Delete record for {format(new Date(selectedRecord.date + "T00:00:00"), "MMM d, yyyy")}?
              </p>
            </div>
            <form action={deleteRecord} className="flex flex-col gap-2 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="record_id" value={selectedRecord.id} />
              <Button variant="danger" type="submit" className="py-3">Delete</Button>
              <Button variant="outline" className="w-full py-3 border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
