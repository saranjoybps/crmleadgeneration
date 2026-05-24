"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import type { LeaveType } from "@/lib/types";
import { createTypeAction, updateTypeAction, deleteTypeAction } from "./actions";

function formatColor(color: string | null): string {
  return color || "#7c3aed";
}

type ModalState = { type: "create" } | { type: "edit"; type_id: string } | { type: "delete"; type_id: string } | null;

export default function TypesContent({
  orgSlug,
  leaveTypes,
  canCreate,
  canEdit,
  canDelete,
  error,
  success,
}: {
  orgSlug: string;
  leaveTypes: LeaveType[] | null | undefined;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  error?: string;
  success?: string;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const selectedType = modal && "type_id" in modal ? leaveTypes?.find((t) => t.id === modal.type_id) : undefined;

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
        {canCreate && (
          <Button size="lg" className="gap-2" onClick={() => setModal({ type: "create" })}>
            <Plus className="h-4 w-4" />
            Add Type
          </Button>
        )}
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
                        {canEdit && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={() => setModal({ type: "edit", type_id: lt.id })}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600" onClick={() => setModal({ type: "delete", type_id: lt.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
      {modal?.type === "create" && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Create Leave Type" size="md">
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
              <Button variant="outline" size="lg" className="border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {modal?.type === "edit" && selectedType && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Edit Leave Type" size="md">
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
              <Button variant="outline" size="lg" className="border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Modal */}
      {modal?.type === "delete" && selectedType && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Delete Leave Type" size="sm">
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
              <Button variant="outline" className="w-full py-3 border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
