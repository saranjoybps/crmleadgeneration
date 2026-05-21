import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Info, ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import type { LeaveType } from "@/lib/types";

type TypesPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    modal?: "create" | "edit" | "delete";
    type_id?: string;
  }>;
};

function formatColor(color: string | null): string {
  return color || "#7c3aed";
}

async function createTypeAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave/types`;

  const { error } = await apiRequest("/api/v1/leave-types", {
    method: "POST",
    orgSlug,
    body: {
      name: formData.get("name"),
      description: formData.get("description") || null,
      days_per_year: parseFloat(String(formData.get("days_per_year") || "0")),
      requires_approval: formData.get("requires_approval") === "true",
      is_active: true,
      sort_order: parseInt(String(formData.get("sort_order") || "0")),
      color: formData.get("color") || null,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave type created.")}`);
}

async function updateTypeAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const typeId = String(formData.get("type_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave/types`;

  const { error } = await apiRequest(`/api/v1/leave-types/${encodeURIComponent(typeId)}`, {
    method: "PATCH",
    orgSlug,
    body: {
      name: formData.get("name"),
      description: formData.get("description") || null,
      days_per_year: parseFloat(String(formData.get("days_per_year") || "0")),
      requires_approval: formData.get("requires_approval") === "true",
      is_active: formData.get("is_active") === "true",
      sort_order: parseInt(String(formData.get("sort_order") || "0")),
      color: formData.get("color") || null,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave type updated.")}`);
}

async function deleteTypeAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const typeId = String(formData.get("type_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave/types`;

  const { error } = await apiRequest(`/api/v1/leave-types/${encodeURIComponent(typeId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave type deleted.")}`);
}

export default async function TypesPage({ params, searchParams }: TypesPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const leavePerm = permsRes.data?.modules.find((m) => m.key === "leave")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!leavePerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission.</p>;
  }

  const { data: leaveTypes } = await apiRequest<LeaveType[]>("/api/v1/leave-types", { orgSlug });

  const selectedType = leaveTypes?.find((t) => t.id === query.type_id);

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
            <h1 className="text-3xl font-bold tracking-tight text-main">Leave Types</h1>
            <p className="text-muted">Configure leave types and allocations.</p>
          </div>
        </div>
        {leavePerm.can_create && (
          <Link href={`/o/${orgSlug}/dashboard/leave/types?modal=create`}>
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Type
            </Button>
          </Link>
        )}
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

      <Card className="p-6">
        {leaveTypes && leaveTypes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft text-left text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Days/Year</th>
                  <th className="pb-3 pr-4">Approval</th>
                  <th className="pb-3 pr-4">Active</th>
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((lt) => (
                  <tr key={lt.id} className="border-b border-soft/50 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: formatColor(lt.color) }}
                        />
                        <span className="font-medium">{lt.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">{lt.days_per_year}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={lt.requires_approval ? "warning" : "secondary"}>
                        {lt.requires_approval ? "Required" : "Auto"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={lt.is_active ? "success" : "secondary"}>
                        {lt.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted">{lt.sort_order}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {leavePerm.can_edit && (
                          <Link href={`/o/${orgSlug}/dashboard/leave/types?modal=edit&type_id=${lt.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                        {leavePerm.can_delete && (
                          <Link href={`/o/${orgSlug}/dashboard/leave/types?modal=delete&type_id=${lt.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-6">No leave types configured yet.</p>
        )}
      </Card>

      {/* Create Modal */}
      {query.modal === "create" && (
        <Modal isOpen={true} closeHref={`/o/${orgSlug}/dashboard/leave/types`} title="Create Leave Type" size="md">
          <form action={createTypeAction} className="space-y-5 p-1">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Name</label>
                <input type="text" name="name" required className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Days Per Year</label>
                <input type="number" name="days_per_year" step="0.5" defaultValue="0" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Sort Order</label>
                <input type="number" name="sort_order" defaultValue="0" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Color</label>
                <input type="color" name="color" defaultValue="#7c3aed" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-1 focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Requires Approval</label>
                <select name="requires_approval" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500">
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Description</label>
              <textarea name="description" rows={2} className="h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" className="flex-1">Create</Button>
              <Link href={`/o/${orgSlug}/dashboard/leave/types`}>
                <Button variant="outline" size="lg" className="border-none text-muted">Cancel</Button>
              </Link>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {query.modal === "edit" && selectedType && (
        <Modal isOpen={true} closeHref={`/o/${orgSlug}/dashboard/leave/types`} title="Edit Leave Type" size="md">
          <form action={updateTypeAction} className="space-y-5 p-1">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="type_id" value={selectedType.id} />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Name</label>
                <input type="text" name="name" defaultValue={selectedType.name} required className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Days Per Year</label>
                <input type="number" name="days_per_year" step="0.5" defaultValue={selectedType.days_per_year} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Sort Order</label>
                <input type="number" name="sort_order" defaultValue={selectedType.sort_order} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Color</label>
                <input type="color" name="color" defaultValue={selectedType.color || "#7c3aed"} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-1 focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Requires Approval</label>
                <select name="requires_approval" defaultValue={String(selectedType.requires_approval)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500">
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Active</label>
                <select name="is_active" defaultValue={String(selectedType.is_active)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Description</label>
              <textarea name="description" defaultValue={selectedType.description || ""} rows={2} className="h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" className="flex-1">Save</Button>
              <Link href={`/o/${orgSlug}/dashboard/leave/types`}>
                <Button variant="outline" size="lg" className="border-none text-muted">Cancel</Button>
              </Link>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Modal */}
      {query.modal === "delete" && selectedType && (
        <Modal isOpen={true} closeHref={`/o/${orgSlug}/dashboard/leave/types`} title="Delete Leave Type" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Delete &ldquo;{selectedType.name}&rdquo;?</h4>
              <p className="mt-2 text-xs text-muted">This action cannot be undone.</p>
            </div>
            <form action={deleteTypeAction} className="flex flex-col gap-2 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="type_id" value={selectedType.id} />
              <Button variant="danger" type="submit" className="py-3">Delete</Button>
              <Link href={`/o/${orgSlug}/dashboard/leave/types`}>
                <Button variant="outline" className="w-full py-3 border-none text-muted">Cancel</Button>
              </Link>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
