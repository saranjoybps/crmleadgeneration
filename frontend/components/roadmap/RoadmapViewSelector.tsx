"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const GanttChart = dynamic(() => import("@/components/GanttChart").then((m) => m.GanttChart), {
  ssr: false,
  loading: () => <div className="h-64 rounded-2xl border border-soft bg-white p-6 animate-pulse" />,
});
import { ExecutiveTimeline } from "@/components/roadmap/ExecutiveTimeline";
import { Milestone, Ticket, Task } from "@/lib/types";
import { Layers, BarChart3 } from "lucide-react";

interface RoadmapViewSelectorProps {
  tasks: Task[];
  milestones: Milestone[];
  tickets: Ticket[];
  initialView?: "timeline" | "gantt";
}

type ViewMode = "timeline" | "gantt";

export function RoadmapViewSelector({
  tasks,
  milestones,
  tickets,
  initialView = "timeline",
}: RoadmapViewSelectorProps) {
  const [view, setView] = useState<ViewMode>(initialView);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("timeline")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all
            ${view === "timeline"
              ? "bg-violet-600 text-white shadow-md shadow-violet-200"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }
          `}
        >
          <Layers className="w-4 h-4" />
          Executive Timeline
        </button>
        <button
          onClick={() => setView("gantt")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all
            ${view === "gantt"
              ? "bg-violet-600 text-white shadow-md shadow-violet-200"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }
          `}
        >
          <BarChart3 className="w-4 h-4" />
          Gantt Chart
          <span className="text-[10px] opacity-60 font-normal">(Legacy)</span>
        </button>
      </div>

      {view === "timeline" ? (
        <ExecutiveTimeline
          tasks={tasks}
          milestones={milestones}
          tickets={tickets}
        />
      ) : (
        <GanttChart
          tasks={tasks}
          milestones={milestones}
          tickets={tickets}
        />
      )}
    </div>
  );
}
