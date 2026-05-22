"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

import type { DashboardSummary } from "@/lib/types";

type Props = {
  summary: DashboardSummary;
};

const PIE_COLORS = ["#7c3aed", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#ec4899"];

export function DashboardCharts({ summary }: Props) {
  const { monthly_trends, project_status_breakdown, ticket_breakdown, task_breakdown } = summary;

  const hasTrends = monthly_trends?.months?.length > 0;
  const hasProjects = project_status_breakdown?.length > 0;
  const hasTickets = ticket_breakdown?.length > 0;
  const hasTasks = task_breakdown?.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Ticket Trends */}
      {hasTrends && (
        <div className="rounded-2xl border border-soft bg-white p-6">
          <h3 className="mb-4 text-lg font-bold text-main">Ticket Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly_trends.months.map((m, i) => ({
                month: m,
                Created: monthly_trends.tickets_created[i],
                Closed: monthly_trends.tickets_closed[i],
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="Created" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="Closed" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Project Status */}
      {hasProjects && (
        <div className="rounded-2xl border border-soft bg-white p-6">
          <h3 className="mb-4 text-lg font-bold text-main">Project Status</h3>
          <div className="flex items-center justify-center h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={project_status_breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {project_status_breakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Ticket Breakdown */}
      {hasTickets && (
        <div className="rounded-2xl border border-soft bg-white p-6">
          <h3 className="mb-4 text-lg font-bold text-main">Tickets by Status</h3>
          <div className="flex items-center justify-center h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ticket_breakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {ticket_breakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Task Breakdown */}
      {hasTasks && (
        <div className="rounded-2xl border border-soft bg-white p-6">
          <h3 className="mb-4 text-lg font-bold text-main">Tasks by Status</h3>
          <div className="flex items-center justify-center h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={task_breakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {task_breakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
