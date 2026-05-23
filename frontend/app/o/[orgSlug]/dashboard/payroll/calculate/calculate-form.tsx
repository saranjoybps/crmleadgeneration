"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { IndianRupee, Users, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatINR(val: number): string {
  return val.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

type EmployeeOption = {
  user_id: string;
  user?: { full_name?: string; email?: string } | null;
};

type SalaryCalc = Record<string, unknown> & {
  employee_id?: string;
  employee_name?: string;
  month?: number;
  year?: number;
  monthly_ctc?: number;
  total_calendar_days?: number;
  per_day_rate?: number;
  present_days?: number;
  late_days?: number;
  half_days?: number;
  paid_leave_days?: number;
  unpaid_leave_days?: number;
  absent_days?: number;
  effective_days?: number;
  gross_pay?: number;
  total_deductions?: number;
  net_pay?: number;
};

type Props = {
  orgSlug: string;
  selMonth: number;
  selYear: number;
  selectedUserId: string;
  employees: EmployeeOption[];
  calculation: SalaryCalc | null;
  allCalculations: SalaryCalc[];
};

export default function CalculateForm({ orgSlug, selMonth, selYear, selectedUserId, employees, calculation, allCalculations }: Props) {
  const router = useRouter();

  function nav(params: Record<string, string>) {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    router.push(url.toString());
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Monthly Payroll Report</h1>
          <p className="text-muted">
            {MONTHS[selMonth - 1]} {selYear} &middot; Salary calculation with attendance &amp; leave deductions
          </p>
        </div>
        <Link href={`/o/${orgSlug}/dashboard/payroll`}>
          <Button variant="outline" size="lg" className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Payroll Dashboard
          </Button>
        </Link>
      </header>

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Employee</label>
            <select
              value={selectedUserId}
              onChange={(e) => nav({ user_id: e.target.value, month: String(selMonth), year: String(selYear) })}
              className="w-56 rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.user_id} value={e.user_id}>
                  {e.user?.full_name || e.user?.email || e.user_id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Month</label>
            <select
              value={selMonth}
              onChange={(e) => nav({ month: e.target.value, year: String(selYear), user_id: selectedUserId })}
              className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Year</label>
            <input
              type="number"
              value={selYear}
              onChange={(e) => nav({ year: e.target.value, month: String(selMonth), user_id: selectedUserId })}
              className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </Card>

      {/* All Employees Table View */}
      {!selectedUserId && allCalculations.length > 0 && (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft text-left text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="pb-3 pr-4">Employee</th>
                  <th className="pb-3 pr-4 text-right">CTC</th>
                  <th className="pb-3 pr-4 text-right">Present</th>
                  <th className="pb-3 pr-4 text-right">Paid Leave</th>
                  <th className="pb-3 pr-4 text-right">Unpaid Leave</th>
                  <th className="pb-3 pr-4 text-right">Absent</th>
                  <th className="pb-3 pr-4 text-right">Effective Days</th>
                  <th className="pb-3 pr-4 text-right">Gross Pay</th>
                  <th className="pb-3 pr-4 text-right">Deductions</th>
                  <th className="pb-3 pr-4 text-right">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {allCalculations.map((calc, i) => (
                  <tr key={calc.employee_id || i} className="border-b border-soft/50 last:border-0 hover:bg-accent/30">
                    <td className="py-3 pr-4 font-medium">
                      <Link
                        href={`/o/${orgSlug}/dashboard/payroll/calculate?user_id=${calc.employee_id}&month=${selMonth}&year=${selYear}`}
                        className="hover:text-primary"
                      >
                        {calc.employee_name || calc.employee_id}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-right text-muted">{formatINR(calc.monthly_ctc || 0)}</td>
                    <td className="py-3 pr-4 text-right">{calc.present_days ?? "-"}</td>
                    <td className="py-3 pr-4 text-right text-emerald-600">{calc.paid_leave_days ?? "-"}</td>
                    <td className="py-3 pr-4 text-right text-red-600">{calc.unpaid_leave_days ?? "-"}</td>
                    <td className="py-3 pr-4 text-right text-amber-600">{calc.absent_days ?? "-"}</td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {calc.effective_days ?? "-"}/{calc.total_calendar_days ?? "-"}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-main">{formatINR(calc.gross_pay || 0)}</td>
                    <td className="py-3 pr-4 text-right text-red-600">{formatINR(calc.total_deductions || 0)}</td>
                    <td className="py-3 pr-4 text-right font-bold text-emerald-600">{formatINR(calc.net_pay || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-main font-semibold">
                  <td className="pt-3 pr-4">Total</td>
                  <td className="pt-3 pr-4 text-right">{formatINR(allCalculations.reduce((s, c) => s + (c.monthly_ctc || 0), 0))}</td>
                  <td className="pt-3 pr-4 text-right">{allCalculations.reduce((s, c) => s + (c.present_days || 0), 0)}</td>
                  <td className="pt-3 pr-4 text-right text-emerald-600">{allCalculations.reduce((s, c) => s + (c.paid_leave_days || 0), 0)}</td>
                  <td className="pt-3 pr-4 text-right text-red-600">{allCalculations.reduce((s, c) => s + (c.unpaid_leave_days || 0), 0)}</td>
                  <td className="pt-3 pr-4 text-right text-amber-600">{allCalculations.reduce((s, c) => s + (c.absent_days || 0), 0)}</td>
                  <td className="pt-3 pr-4 text-right">{allCalculations.reduce((s, c) => s + (c.effective_days || 0), 0)}</td>
                  <td className="pt-3 pr-4 text-right">{formatINR(allCalculations.reduce((s, c) => s + (c.gross_pay || 0), 0))}</td>
                  <td className="pt-3 pr-4 text-right text-red-600">{formatINR(allCalculations.reduce((s, c) => s + (c.total_deductions || 0), 0))}</td>
                  <td className="pt-3 pr-4 text-right text-emerald-600">{formatINR(allCalculations.reduce((s, c) => s + (c.net_pay || 0), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {!selectedUserId && allCalculations.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted/40" />
          <p className="mt-4 text-lg font-medium text-main">No calculations yet</p>
          <p className="text-sm text-muted">No active employees with salary configuration found for this month.</p>
        </Card>
      )}

      {/* Single Employee Detail View */}
      {selectedUserId && !calculation && (
        <Card className="p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted/40" />
          <p className="mt-4 text-lg font-medium text-main">Loading...</p>
        </Card>
      )}

      {calculation && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted">Gross Pay</p>
                <IndianRupee className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-main">{formatINR(calculation.gross_pay || 0)}</p>
              <p className="mt-1 text-xs text-muted">Out of {formatINR(calculation.monthly_ctc || 0)} monthly CTC</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted">Total Deductions</p>
                <IndianRupee className="h-4 w-4 text-red-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-red-600">{formatINR(calculation.total_deductions || 0)}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted">Net Pay</p>
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{formatINR(calculation.net_pay || 0)}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted">Effective Days</p>
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-main">
                {calculation.effective_days}/{calculation.total_calendar_days}
              </p>
              <p className="mt-1 text-xs text-muted">₹{calculation.per_day_rate}/day</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-main">Attendance Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Present
                  </span>
                  <span className="font-medium text-main">{calculation.present_days}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> Late
                  </span>
                  <span className="font-medium text-main">{calculation.late_days}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted">
                    <Clock className="h-3.5 w-3.5 text-blue-500" /> Half Day
                  </span>
                  <span className="font-medium text-main">{calculation.half_days}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted">
                    <CheckCircle className="h-3.5 w-3.5 text-sky-500" /> Paid Leave
                  </span>
                  <span className="font-medium text-main">{calculation.paid_leave_days}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted">
                    <XCircle className="h-3.5 w-3.5 text-red-500" /> Unpaid Leave
                  </span>
                  <span className="font-medium text-main">{calculation.unpaid_leave_days}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Absent
                  </span>
                  <span className="font-medium text-main">{calculation.absent_days}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-main">Effective Days</span>
                  <span className="text-main">{calculation.effective_days}</span>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-main">Earnings</h3>
              <div className="space-y-2">
                {(calculation.earnings as Array<{ name: string; amount: number }> | undefined)?.length ? (
                  (calculation.earnings as Array<{ name: string; amount: number }>).map((e: { name: string; amount: number }) => (
                    <div key={e.name} className="flex justify-between text-sm">
                      <span className="text-muted">{e.name}</span>
                      <span className="font-medium text-main">{formatINR(e.amount)}</span>
                    </div>
                  ))
                ) : <p className="text-xs text-muted">No earning components</p>}
                <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-main">Gross Pay (pro-rated)</span>
                  <span className="text-main">{formatINR(calculation.gross_pay || 0)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-main">Deductions</h3>
              <div className="space-y-2">
                {(calculation.deductions as Array<{ name: string; amount: number }> | undefined)?.length ? (
                  (calculation.deductions as Array<{ name: string; amount: number }>).map((d: { name: string; amount: number }) => (
                    <div key={d.name} className="flex justify-between text-sm">
                      <span className="text-muted">{d.name}</span>
                      <span className="font-medium text-red-600">{formatINR(d.amount)}</span>
                    </div>
                  ))
                ) : <p className="text-xs text-muted">No deductions</p>}
                <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-main">Total Deductions</span>
                  <span className="text-red-600">{formatINR(calculation.total_deductions || 0)}</span>
                </div>
                <div className="border-t-2 border-main pt-2 flex justify-between text-sm font-bold">
                  <span className="text-main">Net Pay</span>
                  <span className="text-emerald-600">{formatINR(calculation.net_pay || 0)}</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
