"use client";

import React, { useMemo } from "react";
import {
  RoadmapTask,
  RoadmapTicket,
  RoadmapMilestone,
  RoadmapProject,
  getStatusColor,
  getStatusLabel,
  RoadmapItemStatus,
} from "@/lib/roadmap-utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Flag,
  Ticket,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Minus,
} from "lucide-react";

interface RoadmapSummaryProps {
  projects: RoadmapProject[];
  allItemsMap: Map<string, RoadmapTask | RoadmapTicket | RoadmapMilestone>;
}

function countByStatus(
  items: Array<{ status: RoadmapItemStatus }>
): Record<RoadmapItemStatus, number> {
  const counts: Record<RoadmapItemStatus, number> = {
    completed: 0,
    on_track: 0,
    at_risk: 0,
    blocked: 0,
    pending: 0,
  };
  items.forEach((item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
  });
  return counts;
}

export function RoadmapSummary({ projects, allItemsMap }: RoadmapSummaryProps) {
  const stats = useMemo(() => {
    const allItems = Array.from(allItemsMap.values());
    const byStatus = countByStatus(allItems);

    const criticalCount = allItems.filter((i) => i.onCriticalPath).length;
    const milestoneCount = allItems.filter((i) => i.type === "milestone").length;
    const ticketCount = allItems.filter((i) => i.type === "ticket").length;
    const taskCount = allItems.filter((i) => i.type === "task").length;

    const totalProgress =
      allItems.length > 0
        ? Math.round(allItems.reduce((sum, i) => sum + i.progress, 0) / allItems.length)
        : 0;

     const allStatusData: Array<{
      name: string;
      value: number;
      status: RoadmapItemStatus;
    }> = [
      { name: "Completed", value: byStatus.completed, status: "completed" },
      { name: "On Track", value: byStatus.on_track, status: "on_track" },
      { name: "At Risk", value: byStatus.at_risk, status: "at_risk" },
      { name: "Blocked", value: byStatus.blocked, status: "blocked" },
      { name: "Pending", value: byStatus.pending, status: "pending" },
    ];
    const statusChartData = allStatusData.filter((d) => d.value > 0);

    const typeChartData = [
      { name: "Milestones", value: milestoneCount, icon: Flag },
      { name: "Tickets", value: ticketCount, icon: Ticket },
      { name: "Tasks", value: taskCount, icon: CheckSquare },
    ].filter((d) => d.value > 0);

    return {
      byStatus,
      criticalCount,
      milestoneCount,
      ticketCount,
      taskCount,
      totalProgress,
      totalItems: allItems.length,
      statusChartData,
      typeChartData,
    };
  }, [projects, allItemsMap]);

  const STAT_ICONS = [
    { key: "total", icon: TrendingUp, label: "Total Items", value: stats.totalItems, color: "violet" },
    { key: "completed", icon: CheckCircle2, label: "Completed", value: stats.byStatus.completed, color: "emerald" },
    { key: "at_risk", icon: AlertTriangle, label: "At Risk", value: stats.byStatus.at_risk, color: "amber" },
    { key: "blocked", icon: Lock, label: "Blocked", value: stats.byStatus.blocked, color: "rose" },
  ];

  const COLOR_MAP: Record<string, string> = {
    completed: "#10b981",
    on_track: "#0ea5e9",
    at_risk: "#f59e0b",
    blocked: "#f43f5e",
    pending: "#94a3b8",
  };

  if (stats.totalItems === 0) {
    return (
      <div className="rounded-3xl border border-soft bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          No roadmap items to summarize
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAT_ICONS.map((stat) => {
          const Icon = stat.icon;
          const isHighlight = stat.key === "at_risk" || stat.key === "blocked";

          return (
            <div
              key={stat.key}
              className={`p-4 rounded-2xl border transition-all
                ${isHighlight && stat.value > 0
                  ? stat.color === "amber"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-rose-50 border-rose-200"
                  : "bg-white border-slate-200"
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon
                  className={`w-4 h-4
                    ${stat.color === "violet" ? "text-violet-500" :
                      stat.color === "emerald" ? "text-emerald-500" :
                      stat.color === "amber" ? "text-amber-500" :
                      "text-rose-500"
                    }
                  `}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {stat.label}
                </span>
              </div>
              <p className={`text-2xl font-black
                ${stat.color === "violet" ? "text-violet-600" :
                  stat.color === "emerald" ? "text-emerald-600" :
                  stat.color === "amber" ? "text-amber-600" :
                  "text-rose-600"
                }
              `}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {stats.statusChartData.length > 0 && (
          <div className="p-5 rounded-2xl border border-slate-200 bg-white">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Status Breakdown
            </h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLOR_MAP[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {stats.statusChartData.map((item) => (
                <div key={item.status} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLOR_MAP[item.status] }}
                  />
                  <span className="text-[10px] font-medium text-slate-600">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Overall Progress
          </h4>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="relative w-28 h-28 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${stats.totalProgress * 2.51} 251`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-black text-violet-600">{stats.totalProgress}%</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 font-medium">
                Across {stats.totalItems} items
              </p>
            </div>
          </div>

          {stats.criticalCount > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                  <TrendingUp className="w-3 h-3" />
                  {stats.criticalCount} on Critical Path
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
