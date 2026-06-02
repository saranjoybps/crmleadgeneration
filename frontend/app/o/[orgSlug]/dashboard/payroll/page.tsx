import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Receipt, Users, IndianRupee, TrendingUp, Building2, ArrowUpRight, Cog, Calculator } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { PayrollSummary, PayrollSettings } from "@/lib/types";

type PayrollPageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function PayrollOverviewPage({ params }: PayrollPageProps) {
  const { orgSlug } = await params;

  const [permsRes, { data: summary }, { data: settings }] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<PayrollSummary>("/api/v1/payroll/summary", { orgSlug }),
    apiRequest<PayrollSettings>("/api/v1/payroll/settings", { orgSlug }),
  ]);

  const payrollPerm = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false,
  };
  if (!payrollPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view payroll.</p>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Payroll</h1>
          <p className="text-muted">Overview of payroll costs and employee salary information.</p>
        </div>
        <div className="flex items-center gap-3">
          {payrollPerm.can_edit && (
            <Link href={`/o/${orgSlug}/dashboard/payroll/settings`}>
              <Button variant="outline" size="lg" className="gap-2">
                <Cog className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">Active Employees</p>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-main">{summary?.active_salaries ?? 0}</p>
          <p className="mt-1 text-xs text-muted">out of {summary?.total_employees ?? 0} total</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">Monthly Payroll Cost</p>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-main">
            {(summary?.monthly_payroll_cost ?? 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">Average CTC</p>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-main">
            {(summary?.average_ctc ?? 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">Annual Payroll</p>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-main">
            {((summary?.monthly_payroll_cost ?? 0) * 12).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-main">Quick Links</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/o/${orgSlug}/dashboard/payroll/employees`}>
              <div className="group flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-main">Employee Salaries</p>
                  <p className="text-xs text-muted">Manage salary structures</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
            <Link href={`/o/${orgSlug}/dashboard/leave`}>
              <div className="group flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50">
                <div className="rounded-lg bg-rose-50 p-2 text-rose-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-main">Leave Management</p>
                  <p className="text-xs text-muted">View leave balances</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
            <Link href={`/o/${orgSlug}/dashboard/attendance`}>
              <div className="group flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-main">Attendance</p>
                  <p className="text-xs text-muted">View attendance records</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
            <Link href={`/o/${orgSlug}/dashboard/payroll/calculate`}>
              <div className="group flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                  <Calculator className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-main">Monthly Payroll Report</p>
                  <p className="text-xs text-muted">Monthly salary with leave deduction</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
            <Link href={`/o/${orgSlug}/dashboard/payroll/tax`}>
              <div className="group flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50">
                <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
                  <Calculator className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-main">Tax Configuration</p>
                  <p className="text-xs text-muted">Tax slabs & compliance</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
            <Link href={`/o/${orgSlug}/dashboard/payroll/reports`}>
              <div className="group flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50">
                <div className="rounded-lg bg-purple-50 p-2 text-purple-700">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-main">Payroll Reports</p>
                  <p className="text-xs text-muted">Cost analysis & summaries</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-main">Department Breakdown</h2>
          {summary?.department_breakdown && summary.department_breakdown.length > 0 ? (
            <div className="space-y-3">
              {summary.department_breakdown.map((dept) => (
                <div key={dept.department} className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-main">{dept.department}</p>
                    <p className="text-xs text-muted">{dept.employee_count} employees</p>
                  </div>
                  <p className="text-sm font-semibold text-main">
                    {dept.monthly_cost.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No department data available.</p>
          )}
          {settings && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs text-muted">
                Pay period: <span className="font-medium text-main capitalize">{settings.pay_period_type}</span>
                {" | "}Currency: <span className="font-medium text-main">{settings.currency}</span>
                {" | "}Pay day: <span className="font-medium text-main">{settings.pay_day}</span>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
