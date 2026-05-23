"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  transformRoadmapData,
  RoadmapProject,
  RoadmapItemStatus,
  getStatusColor,
  getStatusLabel,
  RoadmapTask,
  RoadmapTicket,
  RoadmapMilestone,
  TimelineRange,
} from "@/lib/roadmap-utils";
import { Milestone, Ticket, Task } from "@/lib/types";
import { TimelineAxis } from "./TimelineAxis";
import {
  TimelineMilestoneCard,
  TimelineTicketCard,
  TimelineTaskCard,
} from "./TimelineCard";
import { DependencyPanel } from "./DependencyPanel";
import { RoadmapSummary } from "./RoadmapSummary";
import {
  Layers,
  Link2,
  Eye,
  EyeOff,
  Filter,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface ExecutiveTimelineProps {
  tasks: Task[];
  milestones?: Milestone[];
  tickets?: Ticket[];
}

type GroupBy = "project" | "milestone";
type FilterStatus = "all" | "at_risk" | "blocked" | "on_critical";

export function ExecutiveTimeline({
  tasks,
  milestones = [],
  tickets = [],
}: ExecutiveTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("project");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showSummary, setShowSummary] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const transformed = useMemo(() => {
    return transformRoadmapData({
      tasks,
      milestones,
      tickets,
    });
  }, [tasks, milestones, tickets]);

  const { projects, allItemsMap, timelineRange } = transformed;

  const filteredProjects = useMemo(() => {
    if (filterStatus === "all") {
      return projects;
    }

    return projects
      .map((project) => {
        const filteredMilestones = project.milestones.filter((m) => {
          if (filterStatus === "on_critical") return m.onCriticalPath;
          if (filterStatus === "at_risk") return m.status === "at_risk";
          if (filterStatus === "blocked") return m.status === "blocked";
          return true;
        });

        const filteredTickets = project.ticketsWithoutMilestone.filter((t) => {
          if (filterStatus === "on_critical") return t.onCriticalPath;
          if (filterStatus === "at_risk") return t.status === "at_risk";
          if (filterStatus === "blocked") return t.status === "blocked";
          return true;
        });

        const filteredTasks = project.tasksWithoutTicket.filter((t) => {
          if (filterStatus === "on_critical") return t.onCriticalPath;
          if (filterStatus === "at_risk") return t.status === "at_risk";
          if (filterStatus === "blocked") return t.status === "blocked";
          return true;
        });

        return {
          ...project,
          milestones: filteredMilestones,
          ticketsWithoutMilestone: filteredTickets,
          tasksWithoutTicket: filteredTasks,
        };
      })
      .filter(
        (p) =>
          p.milestones.length > 0 ||
          p.ticketsWithoutMilestone.length > 0 ||
          p.tasksWithoutTicket.length > 0
      );
  }, [projects, filterStatus]);

  const hasAtRisk = useMemo(() => {
    return Array.from(allItemsMap.values()).some(
      (i) => i.status === "at_risk" || i.status === "blocked"
    );
  }, [allItemsMap]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleNavigateTo = useCallback(
    (id: string) => {
      setSelectedId(id);
    },
    []
  );

  const showCriticalPathOnly = filterStatus === "on_critical";

  if (allItemsMap.size === 0) {
    return (
      <div className="rounded-3xl border border-soft bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <Layers className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm font-medium">No roadmap items found</p>
          <p className="text-xs text-slate-400 mt-1">
            Add milestones, tickets with dates, or tasks with dates to see the timeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showSummary && (
        <RoadmapSummary projects={projects} allItemsMap={allItemsMap} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-2xl bg-white border border-soft px-3 py-1.5 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 mr-2">Filter:</span>

          {[
            { key: "all" as FilterStatus, label: "All" },
            { key: "at_risk" as FilterStatus, label: "At Risk" },
            { key: "blocked" as FilterStatus, label: "Blocked" },
            { key: "on_critical" as FilterStatus, label: "Critical Path", icon: Link2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1
                ${filterStatus === key
                  ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }
              `}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowSummary(!showSummary)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-soft text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
        >
          {showSummary ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showSummary ? "Hide Summary" : "Show Summary"}
        </button>

        {hasAtRisk && (
          <button
            onClick={() => setFilterStatus("at_risk")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Items At Risk
          </button>
        )}
      </div>

      <div
        className={`rounded-3xl border border-soft bg-white shadow-sm overflow-hidden
          ${selectedId ? "mr-0" : ""}
        `}
      >
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100">
          <TimelineAxis range={timelineRange} showQuarters />
        </div>

        <div className="relative">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 p-8">
              <Filter className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm font-medium">No items match current filter</p>
              <button
                onClick={() => setFilterStatus("all")}
                className="text-xs text-violet-600 hover:underline mt-2 font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredProjects.map((project) => (
                <div key={project.id} className="group">
                  <div className="flex items-center px-4 py-2.5 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-5 rounded-full bg-violet-500" />
                      <h3 className="text-sm font-bold text-slate-700">{project.name}</h3>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {project.milestones.length > 0 && (
                        <span className="text-[10px] text-slate-500">
                          {project.milestones.length} milestone
                          {project.milestones.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {project.ticketsWithoutMilestone.length > 0 && (
                        <span className="text-[10px] text-slate-500">
                          {project.ticketsWithoutMilestone.length} ticket
                          {project.ticketsWithoutMilestone.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-3">
                    {project.milestones.map((milestone) => (
                      <div key={milestone.id} className="mb-3 last:mb-0">
                        <TimelineMilestoneCard
                          item={milestone}
                          range={timelineRange}
                          onSelect={handleSelect}
                          isSelected={selectedId === milestone.id}
                          showCriticalPathOnly={showCriticalPathOnly}
                        />
                      </div>
                    ))}

                    {project.ticketsWithoutMilestone.map((ticket) => (
                      <div key={ticket.id} className="mb-2 last:mb-0">
                        <TimelineTicketCard
                          item={ticket}
                          range={timelineRange}
                          onSelect={handleSelect}
                          isSelected={selectedId === ticket.id}
                          showCriticalPathOnly={showCriticalPathOnly}
                        />
                      </div>
                    ))}

                    {project.tasksWithoutTicket.map((task) => (
                      <div key={task.id} className="mb-1.5 last:mb-0">
                        <TimelineTaskCard
                          item={task}
                          range={timelineRange}
                          onSelect={handleSelect}
                          isSelected={selectedId === task.id}
                          showCriticalPathOnly={showCriticalPathOnly}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Legend
            </span>

            {[
              { status: "completed" as RoadmapItemStatus, label: "Completed" },
              { status: "on_track" as RoadmapItemStatus, label: "On Track" },
              { status: "at_risk" as RoadmapItemStatus, label: "At Risk" },
              { status: "blocked" as RoadmapItemStatus, label: "Blocked" },
              { status: "pending" as RoadmapItemStatus, label: "Pending" },
            ].map(({ status, label }) => {
              const colors = getStatusColor(status);
              return (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${colors.bg}`} />
                  <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                </div>
              );
            })}

            <div className="ml-auto flex items-center gap-1.5">
              <Link2 className="w-3 h-3 text-violet-500" />
              <span className="text-[10px] text-slate-500 font-medium">
                = On Critical Path
              </span>
            </div>
          </div>
        </div>
      </div>

      <DependencyPanel
        selectedId={selectedId}
        allItemsMap={allItemsMap}
        onClose={handleClosePanel}
        onNavigateTo={handleNavigateTo}
      />
    </div>
  );
}
