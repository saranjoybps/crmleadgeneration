"use client";

import { useState } from "react";
import { Plus, Info, Calculator, Trash2, Edit } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { TaxSlab } from "@/lib/types";
import { createSlabAction, deleteSlabAction, updateSlabAction } from "./actions";

type ModalState = { type: "create" } | { type: "edit"; slab: TaxSlab } | null;

type TaxContentProps = {
  orgSlug: string;
  slabs: TaxSlab[] | null;
  query: { error?: string; success?: string };
  payrollPerm: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
  defaultFY: string;
};

export default function TaxContent({ orgSlug, slabs, query, payrollPerm, defaultFY }: TaxContentProps) {
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Tax Configuration</h1>
          <p className="text-muted">Manage income tax slabs for financial year {defaultFY}.</p>
        </div>
        {payrollPerm.can_create && (
          <button onClick={() => setModal({ type: "create" })}>
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Slab
            </Button>
          </button>
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

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="px-4 py-3 text-left font-medium text-muted">From (₹)</th>
                <th className="px-4 py-3 text-left font-medium text-muted">To (₹)</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Tax Rate</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Cess</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Status</th>
                {(payrollPerm.can_delete || payrollPerm.can_edit) && (
                  <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(!slabs || slabs.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <Calculator className="h-8 w-8 text-muted/50" />
                      <p>No tax slabs configured for {defaultFY}.</p>
                      {payrollPerm.can_create && (
                        <button onClick={() => setModal({ type: "create" })}>
                          <Button variant="outline" size="sm">Add your first slab</Button>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : slabs.map((slab) => (
                <tr key={slab.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium text-main">
                    {slab.from_amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {slab.to_amount ? slab.to_amount.toLocaleString("en-IN") : "Above"}
                  </td>
                  <td className="px-4 py-3 font-medium text-main">{slab.tax_rate}%</td>
                  <td className="px-4 py-3 text-muted">{slab.additional_cess}%</td>
                  <td className="px-4 py-3">
                    <Badge variant={slab.is_active ? "success" : "secondary"}>
                      {slab.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  {(payrollPerm.can_edit || payrollPerm.can_delete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {payrollPerm.can_edit && (
                          <button onClick={() => setModal({ type: "edit", slab })}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </button>
                        )}
                        {payrollPerm.can_delete && (
                          <form action={deleteSlabAction} className="inline">
                            <input type="hidden" name="organization_slug" value={orgSlug} />
                            <input type="hidden" name="slab_id" value={slab.id} />
                            <Button type="submit" variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal?.type === "create" && payrollPerm.can_create && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Add Tax Slab">
          <form action={createSlabAction} className="space-y-4">
            <input type="hidden" name="organization_slug" value={orgSlug} />

            <div>
              <label className="mb-1 block text-sm font-medium text-main">Financial Year</label>
              <input
                type="text"
                name="financial_year"
                defaultValue={defaultFY}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-main">From Amount (₹)</label>
                <input
                  type="number"
                  name="from_amount"
                  required
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-main">To Amount (₹)</label>
                <input
                  type="number"
                  name="to_amount"
                  step="0.01"
                  placeholder="Leave empty for above"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Tax Rate (%)</label>
                <input
                  type="number"
                  name="tax_rate"
                  required
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Additional Cess (%)</label>
                <input
                  type="number"
                  name="additional_cess"
                  defaultValue="0"
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-main">Active</span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)}>
                <Button type="button" variant="outline">Cancel</Button>
              </button>
              <Button type="submit">Create Slab</Button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "edit" && payrollPerm.can_edit && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Edit Tax Slab">
          <form action={updateSlabAction} className="space-y-4">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="slab_id" value={modal.slab.id} />

            <div>
              <label className="mb-1 block text-sm font-medium text-main">Financial Year</label>
              <input
                type="text"
                name="financial_year"
                defaultValue={modal.slab.financial_year}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-main">From Amount (₹)</label>
                <input
                  type="number"
                  name="from_amount"
                  defaultValue={Number(modal.slab.from_amount)}
                  required
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-main">To Amount (₹)</label>
                <input
                  type="number"
                  name="to_amount"
                  defaultValue={modal.slab.to_amount ? Number(modal.slab.to_amount) : ""}
                  step="0.01"
                  placeholder="Leave empty for above"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Tax Rate (%)</label>
                <input
                  type="number"
                  name="tax_rate"
                  defaultValue={Number(modal.slab.tax_rate)}
                  required
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Additional Cess (%)</label>
                <input
                  type="number"
                  name="additional_cess"
                  defaultValue={Number(modal.slab.additional_cess)}
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={modal.slab.is_active}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-main">Active</span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)}>
                <Button type="button" variant="outline">Cancel</Button>
              </button>
              <Button type="submit">Update Slab</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
