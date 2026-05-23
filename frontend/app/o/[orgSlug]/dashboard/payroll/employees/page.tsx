import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, Info, Users, IndianRupee, Layers, Trash2 } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { EmployeeSalary, SalaryComponent } from "@/lib/types";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; modal?: "create" | "components" | "add-component" }>;
};

async function createSalaryAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/employees`;

  const components: Array<{ component_id: string; amount: number }> = [];
  const entries = Array.from(formData.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, val] = entries[i];
    if (key.startsWith("comp_") && key.endsWith("_id")) {
      const idx = key.replace("comp_", "").replace("_id", "");
      const amountKey = `comp_${idx}_amount`;
      const amount = formData.get(amountKey);
      if (amount) {
        components.push({ component_id: String(val), amount: Number(amount) });
      }
    }
  }

  const body: Record<string, unknown> = {
    user_id: formData.get("user_id"),
    effective_from: formData.get("effective_from"),
    monthly_ctc: formData.get("monthly_ctc"),
    components,
  };

  const { error } = await apiRequest("/api/v1/payroll/employees", {
    method: "POST", orgSlug, body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Employee salary created.")}`);
}

async function deleteSalaryAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const salaryId = String(formData.get("salary_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/employees`;

  const { error } = await apiRequest(`/api/v1/payroll/employees/${encodeURIComponent(salaryId)}`, {
    method: "DELETE", orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Employee salary deleted.")}`);
}

async function createComponentAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/employees`;

  const body: Record<string, unknown> = {
    name: formData.get("name"),
    type: formData.get("type"),
    calculation_type: formData.get("calculation_type"),
    default_value: Number(formData.get("default_value")),
    sort_order: Number(formData.get("sort_order")),
    is_active: true,
  };

  const { error } = await apiRequest("/api/v1/payroll/components", {
    method: "POST", orgSlug, body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Component created.")}`);
}

async function deleteComponentAction(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const componentId = String(formData.get("component_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/employees`;

  const { error } = await apiRequest(`/api/v1/payroll/components/${encodeURIComponent(componentId)}`, {
    method: "DELETE", orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Component deleted.")}`);
}

function formatCurrency(val: number): string {
  return val.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export default async function PayrollEmployeesPage({ params, searchParams }: PageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const payrollPerm = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!payrollPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view payroll.</p>;
  }

  const [salariesRes, compsRes] = await Promise.all([
    apiRequest<EmployeeSalary[]>("/api/v1/payroll/employees", { orgSlug }),
    apiRequest<SalaryComponent[]>("/api/v1/payroll/components", { orgSlug }),
  ]);
  const salaries = salariesRes.data;
  const components = compsRes.data;

  let modalUsers: Array<{ id: string; email: string; full_name: string }> | null = null;
  if (query.modal === "create" && payrollPerm.can_create) {
    const usersRes = await apiRequest<Array<{ id: string; email: string; full_name: string }>>("/api/v1/users", { orgSlug });
    modalUsers = usersRes.data;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Salary Setup</h1>
          <p className="text-muted">Manage employee salaries and salary components.</p>
        </div>
        <div className="flex items-center gap-3">
          {payrollPerm.can_create && (
            <Link href={`/o/${orgSlug}/dashboard/payroll/employees?modal=create`}>
              <Button size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Salary
              </Button>
            </Link>
          )}
          <Link href={`/o/${orgSlug}/dashboard/payroll/employees?modal=components`}>
            <Button variant="outline" size="lg" className="gap-2">
              <Layers className="h-4 w-4" />
              Components
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

      <Card className="overflow-hidden">
        <div className="divide-y divide-border">
          <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted bg-accent/30">
            <Users className="h-3.5 w-3.5" />
            Employees ({salaries?.length ?? 0})
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="px-4 py-3 text-left font-medium text-muted">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Monthly CTC</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Annual CTC</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Effective From</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Components</th>
                {(payrollPerm.can_delete || payrollPerm.can_edit) && (
                  <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(!salaries || salaries.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted/50" />
                      <p>No employee salaries configured yet.</p>
                      <p className="text-xs text-muted/70">Click &quot;Add Salary&quot; to set up your first employee.</p>
                    </div>
                  </td>
                </tr>
              ) : salaries.map((sal) => (
                <tr key={sal.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {sal.user?.full_name?.charAt(0)?.toUpperCase() || sal.user?.email?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-main">{sal.user?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted">{sal.user?.email || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-main">{formatCurrency(sal.monthly_ctc)}</td>
                  <td className="px-4 py-3 text-muted">{formatCurrency(sal.monthly_ctc * 12)}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(sal.effective_from + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={sal.status === "active" ? "success" : "secondary"}>
                      {sal.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {sal.components?.length ?? 0} components
                  </td>
                  {(payrollPerm.can_delete || payrollPerm.can_edit) && (
                    <td className="px-4 py-3 text-right">
                      {payrollPerm.can_delete && (
                        <form action={deleteSalaryAction} className="inline">
                          <input type="hidden" name="organization_slug" value={orgSlug} />
                          <input type="hidden" name="salary_id" value={sal.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {query.modal === "create" && payrollPerm.can_create && modalUsers && (
        <CreateSalaryModal orgSlug={orgSlug} users={modalUsers} components={components} />
      )}

      {query.modal === "components" && (
        <ComponentsModal orgSlug={orgSlug} components={components} canCreate={payrollPerm.can_create} canDelete={payrollPerm.can_delete} />
      )}
    </div>
  );
}

function CreateSalaryModal({ orgSlug, users, components }: { orgSlug: string; users: Array<{ id: string; email: string; full_name: string }>; components: SalaryComponent[] | null }) {
  const earnings = components?.filter((c) => c.type === "earning" && c.is_active) ?? [];
  const deductions = components?.filter((c) => c.type === "deduction" && c.is_active) ?? [];

  return (
    <Modal isOpen={true} closeHref={`/o/${orgSlug}/dashboard/payroll/employees`} title="Add Employee Salary">
      <form action={createSalaryAction} className="space-y-4">
        <input type="hidden" name="organization_slug" value={orgSlug} />

        <div>
          <label className="mb-1 block text-sm font-medium text-main">Employee</label>
          <select
            name="user_id"
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select employee...</option>
            {(users || []).map((u) => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-main">Effective From</label>
          <input
            type="date"
            name="effective_from"
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-main">Monthly CTC (₹)</label>
          <p className="mb-1 text-xs text-muted">Enter total monthly cost to company (e.g. 25000 for ₹3L/year)</p>
          <input
            type="number"
            name="monthly_ctc"
            required
            step="0.01"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {(earnings.length > 0 || deductions.length > 0) && (
          <div className="space-y-3">
            {earnings.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-main">Earnings</label>
                <div className="space-y-2 rounded-xl border border-border p-3">
                  {earnings.map((comp, idx) => (
                    <div key={comp.id} className="flex items-center gap-3">
                      <input type="hidden" name={`comp_${idx}_id`} value={comp.id} />
                      <p className="min-w-[140px] text-sm text-main">{comp.name}</p>
                      <input
                        type="number"
                        name={`comp_${idx}_amount`}
                        placeholder={String(comp.default_value || 0)}
                        step="0.01"
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-xs text-muted w-4">{comp.calculation_type === "percentage" ? "%" : "₹"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {deductions.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-main">Deductions</label>
                <div className="space-y-2 rounded-xl border border-border p-3">
                  {deductions.map((comp, idx) => {
                    const actualIdx = earnings.length + idx;
                    return (
                      <div key={comp.id} className="flex items-center gap-3">
                        <input type="hidden" name={`comp_${actualIdx}_id`} value={comp.id} />
                        <p className="min-w-[140px] text-sm text-main">{comp.name}</p>
                        <input
                          type="number"
                          name={`comp_${actualIdx}_amount`}
                          placeholder={String(comp.default_value || 0)}
                          step="0.01"
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-xs text-muted w-4">{comp.calculation_type === "percentage" ? "%" : "₹"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {components && components.length === 0 && (
          <p className="text-xs text-muted">
            No components defined.{" "}
            <Link href={`/o/${orgSlug}/dashboard/payroll/employees?modal=components`} className="text-primary underline">
              Add components first
            </Link>.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/o/${orgSlug}/dashboard/payroll/employees`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit">Create Salary</Button>
        </div>
      </form>
    </Modal>
  );
}

function ComponentsModal({ orgSlug, components, canCreate, canDelete }: { orgSlug: string; components: SalaryComponent[] | null; canCreate: boolean; canDelete: boolean }) {
  return (
    <Modal isOpen={true} closeHref={`/o/${orgSlug}/dashboard/payroll/employees`} title="Salary Components" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Salary components define the earnings and deductions that make up an employee&apos;s salary.
        </p>

        {canCreate && (
          <details className="rounded-xl border border-border">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-main hover:bg-accent/30">
              <Plus className="h-4 w-4" />
              Add New Component
            </summary>
            <div className="border-t border-border p-4">
              <form action={createComponentAction} className="grid grid-cols-2 gap-3">
                <input type="hidden" name="organization_slug" value={orgSlug} />
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted">Name</label>
                  <input type="text" name="name" required
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Type</label>
                  <select name="type"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="earning">Earning</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Calculation</label>
                  <select name="calculation_type"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="fixed">Fixed (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Default Value</label>
                  <input type="number" name="default_value" defaultValue="0" step="0.01"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Sort Order</label>
                  <input type="number" name="sort_order" defaultValue="1"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="col-span-2 flex justify-end pt-1">
                  <Button type="submit" size="sm">Add Component</Button>
                </div>
              </form>
            </div>
          </details>
        )}

        <div className="rounded-xl border border-border divide-y divide-border">
          <div className="px-4 py-2 bg-accent/30 text-xs font-medium text-muted uppercase tracking-wide">
            Components ({components?.length ?? 0})
          </div>
          {(!components || components.length === 0) ? (
            <div className="px-4 py-6 text-center text-sm text-muted">
              No salary components defined yet.{canCreate ? " Use the form above to add one." : ""}
            </div>
          ) : components.map((comp) => (
            <div key={comp.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <Badge variant={comp.type === "earning" ? "success" : "secondary"} className="uppercase text-[10px] tracking-wider">
                  {comp.type}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-main">{comp.name}</p>
                  <p className="text-xs text-muted">
                    {comp.calculation_type === "percentage" ? `${comp.default_value}%` : `₹${comp.default_value}`}
                    {comp.percentage_of ? ` of ${comp.percentage_of}` : ""}
                  </p>
                </div>
              </div>
              {canDelete && (
                <form action={deleteComponentAction}>
                  <input type="hidden" name="organization_slug" value={orgSlug} />
                  <input type="hidden" name="component_id" value={comp.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
