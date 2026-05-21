import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Info, CalendarCheck, Plus, XCircle, CalendarDays, Clock } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { LeaveBalance, LeaveRequest, LeaveStatus, LeaveType } from "@/lib/types";

type LeavePageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; modal?: "apply" }>;
};

const STATUS_BADGE: Record<LeaveStatus, { label: string; variant: "success" | "warning" | "danger" | "secondary" }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

async function applyLeaveAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave`;

  const body: Record<string, unknown> = {
    leave_type_id: formData.get("leave_type_id"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    half_day: formData.get("half_day") === "true",
    half_day_period: formData.get("half_day_period") || null,
    reason: formData.get("reason") || null,
  };

  const { error } = await apiRequest("/api/v1/leave-requests", {
    method: "POST",
    orgSlug,
    body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave request submitted.")}`);
}

async function cancelLeaveAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave`;

  const { error } = await apiRequest(`/api/v1/leave-requests/${encodeURIComponent(requestId)}/cancel`, {
    method: "PATCH",
    orgSlug,
    body: {},
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave request cancelled.")}`);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default async function LeavePage({ params, searchParams }: LeavePageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const leavePerm = permsRes.data?.modules.find((m) => m.key === "leave")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false,
  };
  if (!leavePerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view leave.</p>;
  }

  const { data: balances } = await apiRequest<LeaveBalance[]>("/api/v1/leave-balances", { orgSlug });
  const { data: myRequests } = await apiRequest<LeaveRequest[]>("/api/v1/leave-requests", { orgSlug });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Leave</h1>
          <p className="text-muted">Manage your leave requests and balances.</p>
        </div>
        <div className="flex items-center gap-3">
          {leavePerm.can_create && (
            <Link href={`/o/${orgSlug}/dashboard/leave?modal=apply`}>
              <Button size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Apply Leave
              </Button>
            </Link>
          )}
          <Link href={`/o/${orgSlug}/dashboard/leave/requests`}>
            <Button variant="outline" size="lg" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              All Requests
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

      {/* Balance Cards */}
      {balances && balances.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {balances.map((bal) => {
            const pct = bal.total_days > 0 ? Math.round((bal.used_days / bal.total_days) * 100) : 0;
            return (
              <Card key={bal.leave_type_id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-main">{bal.leave_type?.name || "Leave"}</h3>
                  <span className="text-2xl font-bold text-main">{bal.available_days}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted mb-2">
                  <span>Used: {bal.used_days}</span>
                  <span>{bal.pending_days > 0 ? `Pending: ${bal.pending_days}` : ""}</span>
                  <span>Total: {bal.total_days}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-600 transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* My Requests */}
      <Card className="p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">My Leave Requests</h3>
        {myRequests && myRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft text-left text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Dates</th>
                  <th className="pb-3 pr-4">Days</th>
                  <th className="pb-3 pr-4">Reason</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((req) => (
                  <tr key={req.id} className="border-b border-soft/50 last:border-0">
                    <td className="py-3 pr-4 font-medium">{req.leave_type?.name || "-"}</td>
                    <td className="py-3 pr-4 text-muted">
                      {formatDate(req.start_date)} - {formatDate(req.end_date)}
                    </td>
                    <td className="py-3 pr-4">
                      {req.duration_days}{req.half_day ? ` (${req.half_day_period})` : ""}
                    </td>
                    <td className="py-3 pr-4 text-muted max-w-[200px] truncate">{req.reason || "-"}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_BADGE[req.status]?.variant}>{STATUS_BADGE[req.status]?.label}</Badge>
                    </td>
                    <td className="py-3">
                      {req.status === "pending" && (
                        <form action={cancelLeaveAction}>
                          <input type="hidden" name="organization_slug" value={orgSlug} />
                          <input type="hidden" name="request_id" value={req.id} />
                          <Button variant="ghost" type="submit" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600">
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center text-muted">
            <CalendarCheck className="h-10 w-10 mb-3 text-slate-300" />
            <p className="text-sm">No leave requests yet</p>
            <p className="text-xs mt-1">Apply for leave to get started.</p>
          </div>
        )}
      </Card>

      {/* Apply Modal */}
      {query.modal === "apply" && leavePerm.can_create && (
        <ApplyLeaveModal orgSlug={orgSlug} onClose={`/o/${orgSlug}/dashboard/leave`} />
      )}
    </div>
  );
}

async function ApplyLeaveModal({ orgSlug, onClose }: { orgSlug: string; onClose: string }) {
  const { data: leaveTypes } = await apiRequest<LeaveType[]>("/api/v1/leave-types", { orgSlug, cache: "no-store" });

  return (
    <Modal isOpen={true} closeHref={onClose} title="Apply for Leave" size="md">
      <form action={applyLeaveAction} className="space-y-5 p-1">
        <input type="hidden" name="organization_slug" value={orgSlug} />

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Leave Type</label>
          <select
            name="leave_type_id"
            required
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Select leave type...</option>
            {leaveTypes?.filter((lt) => lt.is_active).map((lt) => (
              <option key={lt.id} value={lt.id}>{lt.name} ({lt.days_per_year} days/year)</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Start Date</label>
            <input
              type="date"
              name="start_date"
              required
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">End Date</label>
            <input
              type="date"
              name="end_date"
              required
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="half_day" value="true" className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm font-medium text-main">Half-day leave</span>
          </label>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Period</label>
          <select
            name="half_day_period"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500"
          >
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
          </select>
          <p className="mt-1 text-xs text-muted">Only applicable when half-day is checked. Uncheck for full day.</p>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Reason</label>
          <textarea
            name="reason"
            rows={3}
            className="h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 resize-none"
            placeholder="Optional reason for leave..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" size="lg" className="flex-1 gap-2">
            <CalendarCheck className="h-4 w-4" />
            Submit Request
          </Button>
          <Link href={onClose}>
            <Button variant="outline" size="lg" className="border-none text-muted">Cancel</Button>
          </Link>
        </div>
      </form>
    </Modal>
  );
}
