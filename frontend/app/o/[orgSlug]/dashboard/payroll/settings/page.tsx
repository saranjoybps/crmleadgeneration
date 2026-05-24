import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Info, Cog } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { PayrollSettings } from "@/lib/types";

type SettingsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

async function saveSettingsAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/settings`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to save settings.")}`);
  }

  const body: Record<string, unknown> = {
    pay_period_type: formData.get("pay_period_type"),
    pay_day: Number(formData.get("pay_day")),
    currency: formData.get("currency"),
    enable_tax: formData.get("enable_tax") === "on",
    enable_pf: formData.get("enable_pf") === "on",
    enable_esi: formData.get("enable_esi") === "on",
    pf_employee_share: Number(formData.get("pf_employee_share")),
    pf_employer_share: Number(formData.get("pf_employer_share")),
    pf_wage_limit: Number(formData.get("pf_wage_limit")),
    esi_employee_share: Number(formData.get("esi_employee_share")),
    esi_employer_share: Number(formData.get("esi_employer_share")),
    esi_wage_limit: Number(formData.get("esi_wage_limit")),
  };

  const { error } = await apiRequest("/api/v1/payroll/settings", {
    method: "PUT", orgSlug, body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Settings saved.")}`);
}

export default async function PayrollSettingsPage({ params, searchParams }: SettingsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_edit: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const payrollPerm = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions ?? {
    can_view: false, can_edit: false,
  };
  if (!payrollPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view payroll.</p>;
  }

  const { data: settings } = await apiRequest<PayrollSettings>("/api/v1/payroll/settings", { orgSlug });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Payroll Settings</h1>
          <p className="text-muted">Configure payroll preferences and compliance options.</p>
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

      <form action={saveSettingsAction}>
        <input type="hidden" name="organization_slug" value={orgSlug} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-main">Pay Period</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Pay Period Type</label>
                <select
                  name="pay_period_type"
                  defaultValue={settings?.pay_period_type || "monthly"}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="monthly">Monthly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Pay Day</label>
                <input
                  type="number"
                  name="pay_day"
                  defaultValue={settings?.pay_day || 1}
                  min={1}
                  max={31}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Currency</label>
                <input
                  type="text"
                  name="currency"
                  defaultValue={settings?.currency || "INR"}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-main">Compliance</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="enable_tax"
                  defaultChecked={settings?.enable_tax ?? true}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-main">Enable Tax Deduction</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="enable_pf"
                  defaultChecked={settings?.enable_pf ?? true}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-main">Enable Provident Fund</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="enable_esi"
                  defaultChecked={settings?.enable_esi ?? false}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-main">Enable ESI</span>
              </label>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-main">Provident Fund</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Employee Share (%)</label>
                <input
                  type="number"
                  name="pf_employee_share"
                  defaultValue={settings?.pf_employee_share ?? 12}
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Employer Share (%)</label>
                <input
                  type="number"
                  name="pf_employer_share"
                  defaultValue={settings?.pf_employer_share ?? 12}
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Wage Limit (₹)</label>
                <input
                  type="number"
                  name="pf_wage_limit"
                  defaultValue={settings?.pf_wage_limit ?? 15000}
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-main">ESI</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Employee Share (%)</label>
                <input
                  type="number"
                  name="esi_employee_share"
                  defaultValue={settings?.esi_employee_share ?? 0.75}
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Employer Share (%)</label>
                <input
                  type="number"
                  name="esi_employer_share"
                  defaultValue={settings?.esi_employer_share ?? 3.25}
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-main">Wage Limit (₹)</label>
                <input
                  type="number"
                  name="esi_wage_limit"
                  defaultValue={settings?.esi_wage_limit ?? 21000}
                  step="0.01"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link href={`/o/${orgSlug}/dashboard/payroll`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          {payrollPerm.can_edit && (
            <Button type="submit">Save Settings</Button>
          )}
        </div>
      </form>
    </div>
  );
}
