import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, Info, Calculator, Trash2 } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { TaxSlab } from "@/lib/types";

type TaxPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; modal?: "create" }>;
};

async function createSlabAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/tax`;

  const body: Record<string, unknown> = {
    financial_year: formData.get("financial_year"),
    from_amount: Number(formData.get("from_amount")),
    to_amount: formData.get("to_amount") ? Number(formData.get("to_amount")) : null,
    tax_rate: Number(formData.get("tax_rate")),
    additional_cess: Number(formData.get("additional_cess")),
    is_active: formData.get("is_active") === "on",
  };

  const { error } = await apiRequest("/api/v1/payroll/tax-slabs", {
    method: "POST", orgSlug, body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Tax slab created.")}`);
}

async function deleteSlabAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const slabId = String(formData.get("slab_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/tax`;

  const { error } = await apiRequest(`/api/v1/payroll/tax-slabs/${encodeURIComponent(slabId)}`, {
    method: "DELETE", orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Tax slab deleted.")}`);
}

export default async function PayrollTaxPage({ params, searchParams }: TaxPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const payrollPerm = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions ?? {
    can_view: false, can_create: false, can_delete: false,
  };
  if (!payrollPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view payroll.</p>;
  }

  const currentYear = new Date().getFullYear();
  const defaultFY = `${currentYear}-${currentYear + 1}`;
  const { data: slabs } = await apiRequest<TaxSlab[]>(`/api/v1/payroll/tax-slabs?financial_year=${defaultFY}`, { orgSlug });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Tax Configuration</h1>
          <p className="text-muted">Manage income tax slabs for financial year {defaultFY}.</p>
        </div>
        {payrollPerm.can_create && (
          <Link href={`/o/${orgSlug}/dashboard/payroll/tax?modal=create`}>
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Slab
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
                {payrollPerm.can_delete && (
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
                        <Link href={`/o/${orgSlug}/dashboard/payroll/tax?modal=create`}>
                          <Button variant="outline" size="sm">Add your first slab</Button>
                        </Link>
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
                  {payrollPerm.can_delete && (
                    <td className="px-4 py-3 text-right">
                      <form action={deleteSlabAction} className="inline">
                        <input type="hidden" name="organization_slug" value={orgSlug} />
                        <input type="hidden" name="slab_id" value={slab.id} />
                        <Button type="submit" variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {query.modal === "create" && payrollPerm.can_create && (
        <CreateSlabModal orgSlug={orgSlug} defaultFY={defaultFY} />
      )}
    </div>
  );
}

function CreateSlabModal({ orgSlug, defaultFY }: { orgSlug: string; defaultFY: string }) {
  return (
    <Modal isOpen={true} closeHref={`/o/${orgSlug}/dashboard/payroll/tax`} title="Add Tax Slab">
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
          <Link href={`/o/${orgSlug}/dashboard/payroll/tax`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit">Create Slab</Button>
        </div>
      </form>
    </Modal>
  );
}
