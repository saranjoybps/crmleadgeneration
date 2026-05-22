"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { AreaChartCard } from "@/components/charts/AreaChartCard";
import { BarChartCard } from "@/components/charts/BarChartCard";
import { PieChartCard } from "@/components/charts/PieChartCard";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { RadialBarChartCard } from "@/components/charts/RadialBarChartCard";
import { ScatterChartCard } from "@/components/charts/ScatterChartCard";
import type { AnalyticsOverview } from "@/lib/types";

type Props = {
  data: Record<string, unknown>;
  orgSlug: string;
};

const PERIODS = [
  { label: "3 Months", value: 3 },
  { label: "6 Months", value: 6 },
  { label: "12 Months", value: 12 },
  { label: "24 Months", value: 24 },
];

export function AnalyticsClient({ data: initialData, orgSlug }: Props) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(false);

  async function refresh(m: number) {
    setMonths(m);
    setLoading(true);
    const res = await apiRequest(`/api/v1/analytics/overview?months=${m}`, { orgSlug });
    if (res.data) setData(res.data as Record<string, unknown>);
    setLoading(false);
  }

  const typedData = data as unknown as AnalyticsOverview;

  const ticketTrends = typedData?.ticket_trends?.months?.length
    ? typedData.ticket_trends.months.map((m, i) => ({
        month: m,
        Created: typedData.ticket_trends.created[i],
        Closed: typedData.ticket_trends.closed[i],
      }))
    : [];

  const attendanceTrends = typedData?.attendance_trends?.months?.length
    ? typedData.attendance_trends.months.map((m, i) => ({
        month: m,
        Rate: typedData.attendance_trends.rate[i],
      }))
    : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Analytics & Insights</h1>
          <p className="mt-1 text-muted">Key metrics and trends across your workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={months === p.value ? "primary" : "ghost"}
              onClick={() => refresh(p.value)}
              disabled={loading}
              className="rounded-xl px-3 text-xs font-bold"
            >
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => refresh(months)} disabled={loading} className="rounded-xl px-3">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {ticketTrends.length > 0 && (
          <AreaChartCard
            title="📈 Ticket Trends"
            data={ticketTrends}
            xKey="month"
            series={[
              { dataKey: "Created", color: "#7c3aed", name: "Created" },
              { dataKey: "Closed", color: "#10b981", name: "Closed" },
            ]}
          />
        )}

        {typedData?.project_status?.length > 0 && (
          <PieChartCard title="🎯 Project Status" data={typedData.project_status} donut />
        )}

        {typedData?.task_completion?.length > 0 && (
          <BarChartCard
            title="✅ Task Completion"
            data={typedData.task_completion}
            xKey="name"
            series={[
              { dataKey: "open", color: "#f59e0b", name: "Open" },
              { dataKey: "in_progress", color: "#6366f1", name: "In Progress" },
              { dataKey: "closed", color: "#10b981", name: "Closed" },
            ]}
            stacked
          />
        )}

        {attendanceTrends.length > 0 && (
          <LineChartCard
            title="📅 Attendance Rate"
            data={attendanceTrends}
            xKey="month"
            series={[{ dataKey: "Rate", color: "#7c3aed", name: "Attendance %" }]}
          />
        )}

        {typedData?.leave_distribution?.length > 0 && (
          <PieChartCard title="🏖 Leave Distribution" data={typedData.leave_distribution} />
        )}

        {typedData?.time_by_project?.length > 0 && (
          <RadialBarChartCard title="⏱ Hours per Project" data={typedData.time_by_project} />
        )}

        {typedData?.recruitment_funnel?.length > 0 && (
          <BarChartCard
            title="👤 Recruitment Funnel"
            data={typedData.recruitment_funnel}
            xKey="name"
            series={[{ dataKey: "value", color: "#7c3aed", name: "Candidates" }]}
          />
        )}

        {typedData?.tasks_vs_tickets?.length > 0 && (
          <ScatterChartCard title="📊 Tasks vs Tickets per Project" data={typedData.tasks_vs_tickets} />
        )}
      </div>
    </div>
  );
}
