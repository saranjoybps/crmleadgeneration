import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, Edit, Trash2, Info, Clock, Users } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Shift, UserShiftAssignment, User } from "@/lib/types";

type ShiftsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    modal?: "create" | "edit" | "delete" | "assign" | "edit-assignment";
    shift_id?: string;
    assignment_id?: string;
  }>;
};

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(`2000-01-01T${iso}`).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

async function createShift(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const gracePeriod = parseInt(formData.get("grace_period") as string) || 5;
  const lateThreshold = parseInt(formData.get("late_threshold") as string) || 30;
  const halfDayAfter = parseInt(formData.get("half_day_after") as string) || 240;
  const description = String(formData.get("description") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const { error } = await apiRequest("/api/v1/shifts", {
    method: "POST",
    orgSlug,
    body: {
      name,
      start_time: startTime,
      end_time: endTime,
      grace_period_minutes: gracePeriod,
      late_threshold_minutes: lateThreshold,
      half_day_after_minutes: halfDayAfter,
      description: description || null,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Shift created.")}`);
}

async function updateShift(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const shiftId = String(formData.get("shift_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const gracePeriod = parseInt(formData.get("grace_period") as string) || 5;
  const lateThreshold = parseInt(formData.get("late_threshold") as string) || 30;
  const halfDayAfter = parseInt(formData.get("half_day_after") as string) || 240;
  const description = String(formData.get("description") ?? "").trim();
  const isActive = formData.get("is_active") === "on";
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const { error } = await apiRequest(`/api/v1/shifts/${encodeURIComponent(shiftId)}`, {
    method: "PATCH",
    orgSlug,
    body: {
      name: name || undefined,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      grace_period_minutes: gracePeriod,
      late_threshold_minutes: lateThreshold,
      half_day_after_minutes: halfDayAfter,
      description: description || null,
      is_active: isActive,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Shift updated.")}`);
}

async function deleteShift(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const shiftId = String(formData.get("shift_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const { error } = await apiRequest(`/api/v1/shifts/${encodeURIComponent(shiftId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Shift deleted.")}`);
}

async function assignShift(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const shiftId = String(formData.get("shift_id") ?? "").trim();
  const effectiveFrom = String(formData.get("effective_from") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const { error } = await apiRequest("/api/v1/shift-assignments", {
    method: "POST",
    orgSlug,
    body: {
      user_id: userId,
      shift_id: shiftId,
      effective_from: effectiveFrom || undefined,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Shift assigned.")}`);
}

async function unassignShift(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const { error } = await apiRequest(`/api/v1/shift-assignments/${encodeURIComponent(assignmentId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Assignment removed.")}`);
}

async function updateAssignment(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const shiftId = String(formData.get("shift_id") ?? "").trim();
  const effectiveFrom = String(formData.get("effective_from") ?? "").trim();
  const effectiveTo = String(formData.get("effective_to") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const body: Record<string, any> = {};
  if (shiftId) body.shift_id = shiftId;
  if (effectiveFrom) body.effective_from = effectiveFrom;
  if (effectiveTo) body.effective_to = effectiveTo;

  const { error } = await apiRequest(`/api/v1/shift-assignments/${encodeURIComponent(assignmentId)}`, {
    method: "PATCH",
    orgSlug,
    body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Assignment updated.")}`);
}

export default async function ShiftsPage({ params, searchParams }: ShiftsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const shiftPerm = permsRes.data?.modules.find((m) => m.key === "shift")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!shiftPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to manage shifts.</p>;
  }

  const { data: shifts, error: shiftsError } = await apiRequest<Shift[]>("/api/v1/shifts", { orgSlug });
  const { data: assignments } = await apiRequest<UserShiftAssignment[]>("/api/v1/shift-assignments", { orgSlug });
  const { data: users } = await apiRequest<User[]>("/api/v1/users", { orgSlug });

  const selectedShift = shifts?.find((s) => s.id === query.shift_id);
  const selectedAssignment = assignments?.find((a) => a.id === query.assignment_id);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Shift Management</h1>
          <p className="text-muted">Create, edit, and assign shifts to team members.</p>
        </div>
        <div className="flex items-center gap-3">
          {shiftPerm.can_create && (
            <Link href={`/o/${orgSlug}/dashboard/shifts?modal=create`}>
              <Button size="lg" className="gap-2 shadow-lg shadow-violet-200">
                <Plus className="h-5 w-5" />
                Add Shift
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

      {shiftsError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{shiftsError}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Shifts
          </h3>
          {shifts && shifts.length > 0 ? (
            <div className="space-y-3">
              {shifts.map((shift) => (
                <div key={shift.id} className="flex items-center justify-between rounded-xl border border-soft p-4 transition-all hover:border-violet-300">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-main">{shift.name}</h4>
                      {!shift.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                      &nbsp;&middot;&nbsp;
                      Grace: {shift.grace_period_minutes}m &middot; Late: {shift.late_threshold_minutes}m
                      &middot; Half-day: {shift.half_day_after_minutes}m
                    </p>
                    {shift.description && (
                      <p className="text-xs text-muted mt-0.5">{shift.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    {shiftPerm.can_edit && (
                      <Link href={`/o/${orgSlug}/dashboard/shifts?modal=edit&shift_id=${shift.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                    {shiftPerm.can_delete && (
                      <Link href={`/o/${orgSlug}/dashboard/shifts?modal=delete&shift_id=${shift.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center text-muted">
              <Clock className="h-8 w-8 mb-2 text-slate-300" />
              <p className="text-sm">No shifts defined yet</p>
              {shiftPerm.can_create && (
                <Link href={`/o/${orgSlug}/dashboard/shifts?modal=create`} className="mt-3">
                  <Button variant="outline" size="sm">Create your first shift</Button>
                </Link>
              )}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assignments
            </h3>
            {shiftPerm.can_create && (
              <Link href={`/o/${orgSlug}/dashboard/shifts?modal=assign`}>
                <Button size="sm" className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Assign
                </Button>
              </Link>
            )}
          </div>
          {assignments && assignments.length > 0 ? (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-soft p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-main">{a.shift?.name || "Unknown Shift"}</p>
                    <p className="text-xs text-muted">
                      User: {users?.find((u) => u.id === a.user_id)?.full_name || a.user_id}
                      &nbsp;&middot;&nbsp;From: {a.effective_from}
                      {a.effective_to ? ` to ${a.effective_to}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {shiftPerm.can_edit && (
                      <Link href={`/o/${orgSlug}/dashboard/shifts?modal=edit-assignment&assignment_id=${a.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                    {shiftPerm.can_delete && (
                      <form action={unassignShift}>
                        <input type="hidden" name="organization_slug" value={orgSlug} />
                        <input type="hidden" name="assignment_id" value={a.id} />
                        <Button variant="ghost" size="sm" type="submit" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center text-muted">
              <Users className="h-8 w-8 mb-2 text-slate-300" />
              <p className="text-sm">No assignments yet</p>
            </div>
          )}
        </Card>
      </div>

      <Modal isOpen={query.modal === "create"} closeHref={`/o/${orgSlug}/dashboard/shifts`} title="Create Shift">
        <form action={createShift} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <Input label="Shift Name" name="name" required placeholder="Morning Shift" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Start Time</label>
              <input type="time" name="start_time" required
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">End Time</label>
              <input type="time" name="end_time" required
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Grace Period (min)" name="grace_period" type="number" defaultValue="5" />
            <Input label="Late Threshold (min)" name="late_threshold" type="number" defaultValue="30" />
            <Input label="Half-day After (min)" name="half_day_after" type="number" defaultValue="240" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Description (Optional)</label>
            <textarea name="description" rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex gap-3 pt-6 border-t border-soft">
            <Button type="submit" className="flex-1 py-4">Create Shift</Button>
            <Link href={`/o/${orgSlug}/dashboard/shifts`} className="flex-1">
              <Button variant="outline" type="button" className="w-full py-4">Cancel</Button>
            </Link>
          </div>
        </form>
      </Modal>

      {selectedShift && (
        <Modal isOpen={query.modal === "edit"} closeHref={`/o/${orgSlug}/dashboard/shifts`} title="Edit Shift">
          <form action={updateShift} className="space-y-6">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="shift_id" value={selectedShift.id} />
            <Input label="Shift Name" name="name" defaultValue={selectedShift.name} required />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Start Time</label>
                <input type="time" name="start_time" defaultValue={selectedShift.start_time} required
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">End Time</label>
                <input type="time" name="end_time" defaultValue={selectedShift.end_time} required
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Grace Period (min)" name="grace_period" type="number" defaultValue={String(selectedShift.grace_period_minutes)} />
              <Input label="Late Threshold (min)" name="late_threshold" type="number" defaultValue={String(selectedShift.late_threshold_minutes)} />
              <Input label="Half-day After (min)" name="half_day_after" type="number" defaultValue={String(selectedShift.half_day_after_minutes)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Description</label>
              <textarea name="description" rows={2} defaultValue={selectedShift.description ?? ""}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-soft">
              <input type="checkbox" name="is_active" id="is_active" defaultChecked={selectedShift.is_active}
                className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
              <label htmlFor="is_active" className="text-sm font-bold text-main cursor-pointer">Active</label>
            </div>
            <div className="flex gap-3 pt-6 border-t border-soft">
              <Button type="submit" className="flex-1 py-4">Save Changes</Button>
              <Link href={`/o/${orgSlug}/dashboard/shifts`} className="flex-1">
                <Button variant="outline" type="button" className="w-full py-4">Cancel</Button>
              </Link>
            </div>
          </form>
        </Modal>
      )}

      {selectedShift && query.modal === "delete" && (
        <Modal isOpen={true} closeHref={`/o/${orgSlug}/dashboard/shifts`} title="Delete Shift" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Delete Shift?</h4>
              <p className="mt-2 text-xs text-muted">Delete <span className="font-bold">{selectedShift.name}</span>?</p>
            </div>
            <form action={deleteShift} className="flex flex-col gap-2 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="shift_id" value={selectedShift.id} />
              <Button variant="danger" type="submit" className="py-3">Delete</Button>
              <Link href={`/o/${orgSlug}/dashboard/shifts`}>
                <Button variant="outline" className="w-full py-3 border-none text-muted">Cancel</Button>
              </Link>
            </form>
          </div>
        </Modal>
      )}

      <Modal isOpen={query.modal === "assign"} closeHref={`/o/${orgSlug}/dashboard/shifts`} title="Assign Shift to User">
        <form action={assignShift} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">User</label>
            <select name="user_id" required
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="">Select user...</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Shift</label>
            <select name="shift_id" required
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="">Select shift...</option>
              {shifts?.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({formatTime(s.start_time)} - {formatTime(s.end_time)})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Effective From</label>
            <input type="date" name="effective_from"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex gap-3 pt-6 border-t border-soft">
            <Button type="submit" className="flex-1 py-4">Assign Shift</Button>
            <Link href={`/o/${orgSlug}/dashboard/shifts`} className="flex-1">
              <Button variant="outline" type="button" className="w-full py-4">Cancel</Button>
            </Link>
          </div>
        </form>
      </Modal>

      {selectedAssignment && query.modal === "edit-assignment" && (
        <Modal isOpen={true} closeHref={`/o/${orgSlug}/dashboard/shifts`} title="Edit Assignment">
          <form action={updateAssignment} className="space-y-6">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="assignment_id" value={selectedAssignment.id} />
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">User</label>
              <p className="h-12 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500">
                {users?.find((u) => u.id === selectedAssignment.user_id)?.full_name || selectedAssignment.user_id}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Shift</label>
              <select name="shift_id" required
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500">
                {shifts?.map((s) => (
                  <option key={s.id} value={s.id} selected={s.id === selectedAssignment.shift_id}>
                    {s.name} ({formatTime(s.start_time)} - {formatTime(s.end_time)})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Effective From</label>
              <input type="date" name="effective_from"
                defaultValue={selectedAssignment.effective_from}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Effective To (leave empty for ongoing)</label>
              <input type="date" name="effective_to"
                defaultValue={selectedAssignment.effective_to ?? ""}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="flex gap-3 pt-6 border-t border-soft">
              <Button type="submit" className="flex-1 py-4">Save Changes</Button>
              <Link href={`/o/${orgSlug}/dashboard/shifts`} className="flex-1">
                <Button variant="outline" type="button" className="w-full py-4">Cancel</Button>
              </Link>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
