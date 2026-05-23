import Link from "next/link";
import { Receipt, IndianRupee, Users, Building2 } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Card } from "@/components/ui/Card";
import type { PayrollSummary } from "@/lib/types";
import { Button } from "@/components/ui/Button";

type ReportsPageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function PayrollReportsPage({ params }: ReportsPageProps) {
  const { orgSlug } = await params;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const payrollPerm = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions ?? {
    can_view: false,
  };
  if (!payrollPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view payroll.</p>;
  }

  const { data: summary } = await apiRequest<PayrollSummary>("/api/v1/payroll/summary", { orgSlug });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Payroll Reports</h1>
          <p className="text-muted">Payroll cost analysis and summary reports.</p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-main">Payroll Cost Summary</h2>
              <p className="text-sm text-muted">Monthly payroll cost breakdown by department</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
              <p className="text-sm font-medium text-main">Total Monthly Cost</p>
              <p className="text-lg font-bold text-main">
                {(summary?.monthly_payroll_cost ?? 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
              <p className="text-sm font-medium text-main">Annual Projection</p>
              <p className="text-lg font-bold text-main">
                {((summary?.monthly_payroll_cost ?? 0) * 12).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
              <p className="text-sm font-medium text-main">Average CTC</p>
              <p className="text-lg font-bold text-main">
                {(summary?.average_ctc ?? 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
              <p className="text-sm font-medium text-main">Active Employees</p>
              <p className="text-lg font-bold text-main">{summary?.active_salaries ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-main">Department-wise Cost</h2>
              <p className="text-sm text-muted">Monthly payroll cost per department</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {summary?.department_breakdown && summary.department_breakdown.length > 0 ? (
              summary.department_breakdown.map((dept) => (
                <div key={dept.department} className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted" />
                    <div>
                      <p className="text-sm font-medium text-main">{dept.department}</p>
                      <p className="text-xs text-muted">{dept.employee_count} employees</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-main">
                    {dept.monthly_cost.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No department data available.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-main">Linked Reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href={`/o/${orgSlug}/dashboard/analytics`}>
            <div className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50">
              <Receipt className="h-5 w-5 text-muted" />
              <div>
                <p className="text-sm font-medium text-main">Analytics</p>
                <p className="text-xs text-muted">View payroll in analytics</p>
              </div>
            </div>
          </Link>
          <Link href={`/o/${orgSlug}/dashboard/reports`}>
            <div className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50">
              <Receipt className="h-5 w-5 text-muted" />
              <div>
                <p className="text-sm font-medium text-main">All Reports</p>
                <p className="text-xs text-muted">Full report listing</p>
              </div>
            </div>
          </Link>
          <Link href={`/o/${orgSlug}/dashboard/payroll/employees`}>
            <div className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50">
              <Users className="h-5 w-5 text-muted" />
              <div>
                <p className="text-sm font-medium text-main">Employee Salaries</p>
                <p className="text-xs text-muted">Salary structure details</p>
              </div>
            </div>
          </Link>
        </div>
      </Card>
    </div>
  );
}
