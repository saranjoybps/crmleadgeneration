"use client";

import React, { useMemo, useState } from "react";
import {
  transformRoadmapData,
  getStatusColor,
  getStatusLabel,
  RoadmapItemStatus,
  RoadmapMilestone,
  RoadmapTicket,
  RoadmapTask,
} from "@/lib/roadmap-utils";
import { Milestone, Ticket, Task } from "@/lib/types";
import { Layers, Flag, Ticket as TicketIcon, CheckSquare, AlertCircle, Clock, ChevronRight, ChevronDown } from "lucide-react";
import { format, isBefore } from "date-fns";

interface ExecutiveTimelineProps {
  tasks: Task[];
  milestones?: Milestone[];
  tickets?: Ticket[];
  projects?: Array<{ id: string; name: string }> | null;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500",
    on_track: "bg-sky-500",
    at_risk: "bg-amber-500",
    blocked: "bg-rose-500",
    pending: "bg-slate-400",
  };
  return <span className={`w-2 h-2 rounded-full ${colors[status] || "bg-slate-400"} shrink-0`} />;
}

function Row({
  icon: Icon,
  label,
  name,
  date,
  status,
  progress,
  overdue,
  depth,
  hasChildren,
  expanded,
  onToggle,
}: {
  icon: React.ElementType;
  label: string;
  name: string;
  date: Date;
  status: string;
  progress: number;
  overdue: boolean;
  depth: number;
  hasChildren?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const colors = getStatusColor(status as RoadmapItemStatus);

  return (
    <div
      className={`flex items-center gap-2 py-2 ${onToggle ? "cursor-pointer hover:bg-slate-50 rounded-lg" : ""}`}
      style={{ paddingLeft: `${depth * 24}px` }}
      onClick={onToggle}
    >
      {hasChildren ? (
        <span className="w-4 h-4 flex items-center justify-center shrink-0 text-slate-400">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${overdue ? "bg-rose-100" : colors.light}`}>
        {overdue ? (
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
        ) : (
          <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
        )}
      </div>
      <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0">{label}</span>
      <span className="text-sm text-slate-800 truncate">{name}</span>
      <span className="text-xs text-slate-400 shrink-0 flex items-center gap-1 ml-auto">
        <Clock className="w-3 h-3" />
        {format(date, "MMM d")}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {overdue && <span className="text-[10px] font-bold text-rose-600">Overdue</span>}
        {progress > 0 && progress < 100 && (
          <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colors.progress}`} style={{ width: `${progress}%` }} />
          </div>
        )}
        <StatusDot status={status} />
        <span className={`text-xs ${colors.text}`}>{getStatusLabel(status as RoadmapItemStatus)}</span>
      </div>
    </div>
  );
}

function MilestoneSection({ milestone, today, depth }: { milestone: RoadmapMilestone; today: Date; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const overdue = milestone.status !== "completed" && isBefore(milestone.date, today);
  const hasChildren = milestone.tickets.length > 0;

  return (
    <div>
      <Row
        icon={Flag}
        label="Milestone"
        name={milestone.name}
        date={milestone.date}
        status={milestone.status}
        progress={milestone.progress}
        overdue={overdue}
        depth={depth}
        hasChildren={hasChildren}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      />
      {expanded && hasChildren && (
        <div className="border-l-2 border-amber-200 ml-[22px]">
          {milestone.tickets.map((ticket) => (
            <TicketSection key={ticket.id} ticket={ticket} today={today} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketSection({ ticket, today, depth }: { ticket: RoadmapTicket; today: Date; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const overdue = ticket.status !== "completed" && isBefore(ticket.endDate, today);
  const hasChildren = ticket.tasks.length > 0;

  return (
    <div>
      <Row
        icon={TicketIcon}
        label="Ticket"
        name={ticket.title}
        date={ticket.endDate}
        status={ticket.status}
        progress={ticket.progress}
        overdue={overdue}
        depth={depth}
        hasChildren={hasChildren}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      />
      {expanded && hasChildren && (
        <div className="border-l-2 border-sky-200 ml-[22px]">
          {ticket.tasks.map((task) => (
            <TaskRow key={task.id} task={task} today={today} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, today, depth }: { task: RoadmapTask; today: Date; depth: number }) {
  const overdue = task.status !== "completed" && isBefore(task.endDate, today);

  return (
    <Row
      icon={CheckSquare}
      label="Task"
      name={task.title}
      date={task.endDate}
      status={task.status}
      progress={task.progress}
      overdue={overdue}
      depth={depth}
    />
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 px-1 py-1.5 mt-3 mb-1">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label} ({count})</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

export function ExecutiveTimeline({
  tasks,
  milestones = [],
  tickets = [],
  projects,
}: ExecutiveTimelineProps) {
  const projectNames = useMemo(() => {
    const names = new Map<string, string>();
    (projects ?? []).forEach((p) => names.set(p.id, p.name));
    return names;
  }, [projects]);

  const { projects: roadmapProjects } = useMemo(() => {
    return transformRoadmapData({ tasks, milestones, tickets, projectNames });
  }, [tasks, milestones, tickets, projectNames]);

  const today = new Date();

  if (roadmapProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <Layers className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No roadmap items</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {roadmapProjects.map((project) => (
        <div key={project.id}>
          <h3 className="text-base font-bold text-slate-800 mb-3">{project.name}</h3>

          {project.milestones.length > 0 && (
            <>
              <SectionHeader label="Milestones" count={project.milestones.length} />
              {project.milestones.map((m) => (
                <MilestoneSection key={m.id} milestone={m} today={today} depth={1} />
              ))}
            </>
          )}

          {project.ticketsWithoutMilestone.length > 0 && (
            <>
              <SectionHeader label="Tickets (unlinked)" count={project.ticketsWithoutMilestone.length} />
              <div className="border-l-2 border-sky-300 ml-[22px]">
                {project.ticketsWithoutMilestone.map((t) => (
                  <TicketSection key={t.id} ticket={t} today={today} depth={1} />
                ))}
              </div>
            </>
          )}


        </div>
      ))}
    </div>
  );
}
