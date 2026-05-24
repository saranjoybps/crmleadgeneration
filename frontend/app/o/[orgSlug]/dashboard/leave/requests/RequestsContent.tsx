"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, Filter, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import type { LeaveRequest, LeaveStatus } from "@/lib/types";
import { approveAction, rejectAction } from "./actions";

const STATUS_BADGE: Record<LeaveStatus, { label: string; variant: "success" | "warning" | "danger" | "secondary" | "info" }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

type ModalState = { type: "approve"; request_id: string } | { type: "reject"; request_id: string } | null;

export default function RequestsContent({
  orgSlug,
  requests,
  canEdit,
  queryStatus,
  queryFrom,
  queryTo,
  error,
  success,
  reqError,
}: {
  orgSlug: string;
  requests: LeaveRequest[] | null | undefined;
  canEdit: boolean;
  queryStatus?: string;
  queryFrom?: string;
  queryTo?: string;
  error?: string;
  success?: string;
  reqError?: string;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const selectedRequest = modal?.request_id ? requests?.find((r) => r.id === modal.request_id) : undefined;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/o/${orgSlug}/dashboard/leave`}>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-main">Leave Requests</h1>
            <p className="text-muted">View and manage all leave requests.</p>
          </div>
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
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">Status</label>
            <select name="status" defaultValue={queryStatus} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">From</label>
            <input type="date" name="from" defaultValue={queryFrom} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">To</label>
            <input type="date" name="to" defaultValue={queryTo} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500" />
          </div>
          <Button type="submit" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Link href={`/o/${orgSlug}/dashboard/leave/requests`}>
            <Button variant="ghost" size="sm">Clear</Button>
          </Link>
        </form>
      </Card>

      {reqError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{reqError}</div>
      )}

      <Card className="p-6">
        {requests && requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft text-left text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="pb-3 pr-4">Employee</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Dates</th>
                  <th className="pb-3 pr-4">Days</th>
                  <th className="pb-3 pr-4">Reason</th>
                  <th className="pb-3 pr-4">Status</th>
                  {canEdit && <th className="pb-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-soft/50 last:border-0">
                    <td className="py-3 pr-4 font-medium">{req.user?.full_name || req.user?.email || "-"}</td>
                    <td className="py-3 pr-4">{req.leave_type?.name || "-"}</td>
                    <td className="py-3 pr-4 text-muted">{formatDate(req.start_date)} - {formatDate(req.end_date)}</td>
                    <td className="py-3 pr-4">{req.duration_days}{req.half_day ? ` (${req.half_day_period})` : ""}</td>
                    <td className="py-3 pr-4 text-muted max-w-[200px] truncate">{req.reason || "-"}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_BADGE[req.status]?.variant}>{STATUS_BADGE[req.status]?.label}</Badge>
                    </td>
                    {canEdit && req.status === "pending" && (
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-emerald-50 hover:text-emerald-600" onClick={() => setModal({ type: "approve", request_id: req.id })}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600" onClick={() => setModal({ type: "reject", request_id: req.id })}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                    {canEdit && req.status !== "pending" && (
                      <td className="py-3 text-muted text-xs">-</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-6">No leave requests found.</p>
        )}
      </Card>

      {selectedRequest && modal?.type === "approve" && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Approve Leave" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-inner">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Approve Leave Request?</h4>
              <p className="mt-2 text-xs text-muted">
                {selectedRequest.user?.full_name || selectedRequest.user?.email} — {selectedRequest.leave_type?.name}<br />
                {formatDate(selectedRequest.start_date)} to {formatDate(selectedRequest.end_date)} ({selectedRequest.duration_days} days)
              </p>
            </div>
            <form action={approveAction} className="flex flex-col gap-2 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="request_id" value={selectedRequest.id} />
              <Button variant="primary" type="submit" className="py-3 gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button variant="outline" className="w-full py-3 border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </form>
          </div>
        </Modal>
      )}

      {selectedRequest && modal?.type === "reject" && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Reject Leave" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <XCircle className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Reject Leave Request?</h4>
              <p className="mt-2 text-xs text-muted">
                {selectedRequest.user?.full_name || selectedRequest.user?.email} — {selectedRequest.leave_type?.name}<br />
                {formatDate(selectedRequest.start_date)} to {formatDate(selectedRequest.end_date)} ({selectedRequest.duration_days} days)
              </p>
            </div>
            <form action={rejectAction} className="flex flex-col gap-3 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="request_id" value={selectedRequest.id} />
              <textarea
                name="rejection_reason"
                placeholder="Reason for rejection..."
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 resize-none"
              />
              <Button variant="danger" type="submit" className="py-3 gap-2">
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
              <Button variant="outline" className="w-full py-3 border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
