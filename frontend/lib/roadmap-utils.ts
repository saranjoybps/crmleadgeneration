"use client";

import { Milestone, Ticket, Task, TaskDependency } from "@/lib/types";
import {
  differenceInDays,
  min,
  max,
  parseISO,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";

export type RoadmapItemStatus = "completed" | "on_track" | "at_risk" | "blocked" | "pending";

export interface RoadmapTask {
  id: string;
  type: "task";
  title: string;
  startDate: Date;
  endDate: Date;
  status: RoadmapItemStatus;
  progress: number;
  priority: Task["priority"];
  originalStatus: Task["status"];
  projectId: string;
  dependsOn: string[];
  isBlocking: string[];
  slackDays: number;
  onCriticalPath: boolean;
}

export interface RoadmapTicket {
  id: string;
  type: "ticket";
  title: string;
  startDate: Date;
  endDate: Date;
  status: RoadmapItemStatus;
  progress: number;
  priority: Ticket["priority"];
  originalStatus: Ticket["status"];
  projectId: string | null;
  milestoneId: string | null;
  tasks: RoadmapTask[];
  dependsOn: string[];
  isBlocking: string[];
  slackDays: number;
  onCriticalPath: boolean;
  ticketType: Ticket["type"];
}

export interface RoadmapMilestone {
  id: string;
  type: "milestone";
  name: string;
  date: Date;
  status: RoadmapItemStatus;
  progress: number;
  originalStatus: Milestone["status"];
  projectId: string;
  tickets: RoadmapTicket[];
  dependsOn: string[];
  isBlocking: string[];
  slackDays: number;
  onCriticalPath: boolean;
}

export interface RoadmapProject {
  id: string;
  name: string;
  milestones: RoadmapMilestone[];
  ticketsWithoutMilestone: RoadmapTicket[];
  tasksWithoutTicket: RoadmapTask[];
}

export interface TimelineRange {
  startDate: Date;
  endDate: Date;
  totalDays: number;
}

export interface CriticalPathInfo {
  criticalPath: string[];
  allItems: Map<string, RoadmapTask | RoadmapTicket | RoadmapMilestone>;
  totalDurationDays: number;
}

function statusToProgress(
  status: Milestone["status"] | Ticket["status"] | Task["status"],
  type: string
): number {
  if (type === "milestone") {
    return status === "completed" ? 100 : 0;
  }
  switch (status) {
    case "closed":
    case "completed":
      return 100;
    case "review":
      return 80;
    case "in_progress":
      return 50;
     case "hold":
     case "pending":
    case "cancelled":
    case "open":
    default:
      return 0;
  }
}

function calculateItemStatus(
  progress: number,
  startDate: Date,
  endDate: Date,
  hasUnresolvedBlockers: boolean,
  today: Date = startOfDay(new Date())
): RoadmapItemStatus {
  if (hasUnresolvedBlockers) {
    return "blocked";
  }
  if (progress >= 100) {
    return "completed";
  }

  const daysUntilDeadline = differenceInDays(endDate, today);
  const totalDays = Math.max(1, differenceInDays(endDate, startDate));
  const daysPassed = Math.max(0, differenceInDays(today, startDate));
  const expectedProgress = Math.min(100, (daysPassed / totalDays) * 100);

  if (daysUntilDeadline < 0 && progress < 100) {
    return "at_risk";
  }

  if (progress < expectedProgress - 20) {
    return "at_risk";
  }

  if (isAfter(today, startDate) && progress > 0) {
    return "on_track";
  }

  return "pending";
}

function getSafeDate(
  dateStr: string | null,
  fallback: string | Date,
  addDays: number = 0
): Date {
  let result: Date;
  if (dateStr) {
    result = parseISO(dateStr);
  } else if (typeof fallback === "string") {
    result = parseISO(fallback);
  } else {
    result = fallback;
  }

  if (isNaN(result.getTime())) {
    result = startOfDay(new Date());
  }

  if (addDays !== 0) {
    result = new Date(result.getTime() + addDays * 24 * 60 * 60 * 1000);
  }

  return result;
}

export function transformRoadmapData({
  tasks,
  milestones,
  tickets,
  projectNames,
}: {
  tasks: Task[];
  milestones: Milestone[];
  tickets: Ticket[];
  projectNames?: Map<string, string>;
}): {
  projects: RoadmapProject[];
  allItemsMap: Map<string, RoadmapTask | RoadmapTicket | RoadmapMilestone>;
  timelineRange: TimelineRange;
} {
  const allItemsMap = new Map<string, RoadmapTask | RoadmapTicket | RoadmapMilestone>();
  const today = startOfDay(new Date());

  const projectMap = new Map<string, RoadmapProject>();

  const ticketToMilestone = new Map<string, string>();
  const taskToTicket = new Map<string, string>();

  tickets.forEach((t) => {
    if (t.milestone_id) {
      ticketToMilestone.set(t.id, t.milestone_id);
    }
  });

  tasks.forEach((tsk) => {
    if (tsk.ticket_id) {
      taskToTicket.set(tsk.id, tsk.ticket_id);
    }
  });

  const taskDependencies = new Map<string, string[]>();
  const reverseDependencies = new Map<string, string[]>();

  tasks.forEach((tsk) => {
    const deps = tsk.dependencies?.map((d) => d.depends_on_task_id) || [];
    taskDependencies.set(tsk.id, deps);
    deps.forEach((depId) => {
      if (!reverseDependencies.has(depId)) {
        reverseDependencies.set(depId, []);
      }
      reverseDependencies.get(depId)!.push(tsk.id);
    });
  });

  const transformedTasks: Map<string, RoadmapTask> = new Map();
  tasks.forEach((tsk) => {
    const startDate = getSafeDate(tsk.start_date, tsk.created_at);
    const endDate = getSafeDate(tsk.due_date, tsk.start_date || tsk.created_at, 1);
    const progress = statusToProgress(tsk.status, "task");

    const taskItem: RoadmapTask = {
      id: tsk.id,
      type: "task",
      title: tsk.title,
      startDate,
      endDate,
      status: "pending",
      progress,
      priority: tsk.priority,
      originalStatus: tsk.status,
      projectId: tsk.project_id,
      dependsOn: taskDependencies.get(tsk.id) || [],
      isBlocking: reverseDependencies.get(tsk.id) || [],
      slackDays: 0,
      onCriticalPath: false,
    };

    transformedTasks.set(tsk.id, taskItem);
    allItemsMap.set(tsk.id, taskItem);
  });

  const transformedTickets: Map<string, RoadmapTicket> = new Map();
  tickets.forEach((t) => {
    const linkedTaskIds = tasks.filter((tsk) => tsk.ticket_id === t.id).map((tsk) => tsk.id);
    const linkedTasks = linkedTaskIds
      .map((id) => transformedTasks.get(id))
      .filter(Boolean) as RoadmapTask[];

    const allStartDates = [
      t.start_date ? parseISO(t.start_date) : null,
      ...linkedTasks.map((tk) => tk.startDate),
    ].filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    const allEndDates = [
      t.due_date ? parseISO(t.due_date) : null,
      ...linkedTasks.map((tk) => tk.endDate),
    ].filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    let startDate: Date;
    let endDate: Date;

    if (allStartDates.length > 0) {
      startDate = min(allStartDates);
    } else {
      startDate = getSafeDate(t.start_date, t.created_at);
    }

    if (allEndDates.length > 0) {
      endDate = max(allEndDates);
    } else {
      endDate = getSafeDate(t.due_date, t.start_date || t.created_at, 1);
    }

    const ticketProgress = statusToProgress(t.status, "ticket");
    const overallProgress =
      linkedTasks.length > 0
        ? Math.round(
            linkedTasks.reduce((sum, tk) => sum + tk.progress, 0) / linkedTasks.length
          )
        : ticketProgress;

    const ticketDependsOn = new Set<string>();
    const ticketIsBlocking = new Set<string>();

    linkedTasks.forEach((tk) => {
      tk.dependsOn.forEach((depId) => {
        const depTicketId = taskToTicket.get(depId);
        if (depTicketId && depTicketId !== t.id) {
          ticketDependsOn.add(depTicketId);
        } else if (!depTicketId) {
          ticketDependsOn.add(depId);
        }
      });
      tk.isBlocking.forEach((blockedId) => {
        const blockedTicketId = taskToTicket.get(blockedId);
        if (blockedTicketId && blockedTicketId !== t.id) {
          ticketIsBlocking.add(blockedTicketId);
        } else if (!blockedTicketId) {
          ticketIsBlocking.add(blockedId);
        }
      });
    });

    const ticketItem: RoadmapTicket = {
      id: t.id,
      type: "ticket",
      title: t.title,
      startDate,
      endDate,
      status: "pending",
      progress: ticketProgress,
      priority: t.priority,
      originalStatus: t.status,
      projectId: t.project_id,
      milestoneId: t.milestone_id,
      tasks: linkedTasks,
      dependsOn: Array.from(ticketDependsOn),
      isBlocking: Array.from(ticketIsBlocking),
      slackDays: 0,
      onCriticalPath: false,
      ticketType: t.type,
    };

    transformedTickets.set(t.id, ticketItem);
    allItemsMap.set(t.id, ticketItem);
  });

  const transformedMilestones: Map<string, RoadmapMilestone> = new Map();
  milestones.forEach((m) => {
    const linkedTicketIds = tickets.filter((t) => t.milestone_id === m.id).map((t) => t.id);
    const linkedTickets = linkedTicketIds
      .map((id) => transformedTickets.get(id))
      .filter(Boolean) as RoadmapTicket[];

    const allStartDates = linkedTickets.map((tk) => tk.startDate);
    const allEndDates = [
      parseISO(m.due_date),
      ...linkedTickets.map((tk) => tk.endDate),
    ].filter((d) => !isNaN(d.getTime()));

    let startDate: Date;
    const endDate = max(allEndDates);

    if (allStartDates.length > 0) {
      startDate = min(allStartDates);
    } else {
      startDate = getSafeDate(m.due_date, m.created_at, -7);
    }

    const milestoneProgress = statusToProgress(m.status, "milestone");
    const overallProgress =
      linkedTickets.length > 0
        ? Math.round(
            linkedTickets.reduce((sum, tk) => sum + tk.progress, 0) / linkedTickets.length
          )
        : milestoneProgress;

    const milestoneDependsOn = new Set<string>();
    const milestoneIsBlocking = new Set<string>();

    linkedTickets.forEach((tk) => {
      tk.dependsOn.forEach((depId) => {
        const depItem = allItemsMap.get(depId);
        if (depItem) {
          if (depItem.type === "ticket") {
            const depMilestoneId = (depItem as RoadmapTicket).milestoneId;
            if (depMilestoneId && depMilestoneId !== m.id) {
              milestoneDependsOn.add(depMilestoneId);
            }
          }
        }
      });
    });

    const milestoneItem: RoadmapMilestone = {
      id: m.id,
      type: "milestone",
      name: m.name,
      date: parseISO(m.due_date),
      status: "pending",
      progress: m.status === "completed" ? 100 : overallProgress,
      originalStatus: m.status,
      projectId: m.project_id,
      tickets: linkedTickets,
      dependsOn: Array.from(milestoneDependsOn),
      isBlocking: Array.from(milestoneIsBlocking),
      slackDays: 0,
      onCriticalPath: false,
    };

    transformedMilestones.set(m.id, milestoneItem);
    allItemsMap.set(m.id, milestoneItem);
  });

  allItemsMap.forEach((item) => {
    let hasUnresolvedBlockers = false;
    for (const depId of item.dependsOn) {
      const depItem = allItemsMap.get(depId);
      if (depItem && depItem.progress < 100) {
        hasUnresolvedBlockers = true;
        break;
      }
    }

    item.status = calculateItemStatus(
      item.progress,
      item.type === "milestone"
        ? (item as RoadmapMilestone).tickets.length > 0
          ? min((item as RoadmapMilestone).tickets.map((t) => t.startDate))
          : (item as RoadmapMilestone).date
        : (item as RoadmapTask | RoadmapTicket).startDate,
      item.type === "milestone"
        ? (item as RoadmapMilestone).date
        : (item as RoadmapTask | RoadmapTicket).endDate,
      hasUnresolvedBlockers,
      today
    );
  });

  const allDates: Date[] = [];
  allItemsMap.forEach((item) => {
    if (item.type === "milestone") {
      const m = item as RoadmapMilestone;
      allDates.push(m.date);
      if (m.tickets.length > 0) {
        allDates.push(min(m.tickets.map((t) => t.startDate)));
      }
    } else {
      const ti = item as RoadmapTask | RoadmapTicket;
      allDates.push(ti.startDate);
      allDates.push(ti.endDate);
    }
  });

  let timelineRange: TimelineRange;
  if (allDates.length > 0) {
    const actualStart = min(allDates);
    const actualEnd = max(allDates);
    const bufferDays = Math.max(7, Math.ceil(differenceInDays(actualEnd, actualStart) * 0.1));
    timelineRange = {
      startDate: new Date(actualStart.getTime() - bufferDays * 24 * 60 * 60 * 1000),
      endDate: new Date(actualEnd.getTime() + bufferDays * 24 * 60 * 60 * 1000),
      totalDays: 0,
    };
    timelineRange.totalDays = differenceInDays(timelineRange.endDate, timelineRange.startDate);
  } else {
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 14);
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 60);
    timelineRange = {
      startDate: defaultStart,
      endDate: defaultEnd,
      totalDays: 74,
    };
  }

  const visited = new Set<string>();
  const tempMark = new Set<string>();
  const topologicalOrder: string[] = [];

  function visit(id: string): boolean {
    if (tempMark.has(id)) return false;
    if (visited.has(id)) return true;

    tempMark.add(id);
    const item = allItemsMap.get(id);
    if (item) {
      for (const depId of item.dependsOn) {
        if (!visit(depId)) return false;
      }
    }
    tempMark.delete(id);
    visited.add(id);
    topologicalOrder.unshift(id);
    return true;
  }

  allItemsMap.forEach((_, id) => {
    if (!visited.has(id)) {
      visit(id);
    }
  });

  const earliestStart = new Map<string, number>();
  const latestStart = new Map<string, number>();

  topologicalOrder.forEach((id) => {
    const item = allItemsMap.get(id);
    if (!item) return;

    let startDay: number;
    let duration: number;

    if (item.type === "milestone") {
      const m = item as RoadmapMilestone;
      if (m.tickets.length > 0) {
        const minStart = min(m.tickets.map((t) => t.startDate));
        startDay = differenceInDays(minStart, timelineRange.startDate);
        duration = differenceInDays(m.date, minStart);
      } else {
        startDay = differenceInDays(m.date, timelineRange.startDate);
        duration = 0;
      }
    } else {
      const ti = item as RoadmapTask | RoadmapTicket;
      startDay = differenceInDays(ti.startDate, timelineRange.startDate);
      duration = Math.max(1, differenceInDays(ti.endDate, ti.startDate));
    }

    if (item.dependsOn.length === 0) {
      earliestStart.set(id, startDay);
    } else {
      let maxDepEnd = -Infinity;
      for (const depId of item.dependsOn) {
        const depItem = allItemsMap.get(depId);
        if (depItem) {
          const depStart = earliestStart.get(depId);
          let depDuration: number;
          if (depItem.type === "milestone") {
            const dm = depItem as RoadmapMilestone;
            if (dm.tickets.length > 0) {
              const dMinStart = min(dm.tickets.map((t) => t.startDate));
              depDuration = differenceInDays(dm.date, dMinStart);
            } else {
              depDuration = 0;
            }
          } else {
            const dti = depItem as RoadmapTask | RoadmapTicket;
            depDuration = Math.max(1, differenceInDays(dti.endDate, dti.startDate));
          }
          if (depStart !== undefined) {
            maxDepEnd = Math.max(maxDepEnd, depStart + depDuration);
          }
        }
      }
      earliestStart.set(id, Math.max(startDay, maxDepEnd));
    }
  });

  const reversedOrder = [...topologicalOrder].reverse();
  const projectEnd = timelineRange.totalDays;

  reversedOrder.forEach((id) => {
    const item = allItemsMap.get(id);
    if (!item) return;

    let duration: number;
    if (item.type === "milestone") {
      const m = item as RoadmapMilestone;
      if (m.tickets.length > 0) {
        const minStart = min(m.tickets.map((t) => t.startDate));
        duration = differenceInDays(m.date, minStart);
      } else {
        duration = 0;
      }
    } else {
      const ti = item as RoadmapTask | RoadmapTicket;
      duration = Math.max(1, differenceInDays(ti.endDate, ti.startDate));
    }

    const successors = item.isBlocking;
    if (successors.length === 0) {
      latestStart.set(id, projectEnd - duration);
    } else {
      let minSuccStart = Infinity;
      for (const succId of successors) {
        const ls = latestStart.get(succId);
        if (ls !== undefined) {
          minSuccStart = Math.min(minSuccStart, ls);
        }
      }
      latestStart.set(id, minSuccStart - duration);
    }

    const es = earliestStart.get(id);
    const ls = latestStart.get(id);
    if (es !== undefined && ls !== undefined) {
      item.slackDays = Math.max(0, ls - es);
      item.onCriticalPath = item.slackDays === 0;
    }
  });

  function getProjectName(projectId: string): string {
    return projectNames?.get(projectId) ?? projectId.slice(0, 8);
  }

  milestones.forEach((m) => {
    if (!projectMap.has(m.project_id)) {
      projectMap.set(m.project_id, {
        id: m.project_id,
        name: getProjectName(m.project_id),
        milestones: [],
        ticketsWithoutMilestone: [],
        tasksWithoutTicket: [],
      });
    }
  });

  tickets.forEach((t) => {
    if (t.project_id && !projectMap.has(t.project_id)) {
      projectMap.set(t.project_id, {
        id: t.project_id,
        name: getProjectName(t.project_id),
        milestones: [],
        ticketsWithoutMilestone: [],
        tasksWithoutTicket: [],
      });
    }
  });

  transformedMilestones.forEach((m) => {
    const project = projectMap.get(m.projectId);
    if (project) {
      project.milestones.push(m);
    }
  });

  transformedTickets.forEach((t) => {
    if (!t.milestoneId && t.projectId) {
      const project = projectMap.get(t.projectId);
      if (project) {
        project.ticketsWithoutMilestone.push(t);
      }
    }
  });

  transformedTasks.forEach((tsk) => {
    if (!tsk.id.includes("orphan") && tsk.projectId) {
      const hasTicket = taskToTicket.has(tsk.id);
      if (!hasTicket) {
        const project = projectMap.get(tsk.projectId);
        if (project) project.tasksWithoutTicket.push(tsk);
      }
    }
  });

  projectMap.forEach((project, id) => {
    project.milestones.sort((a, b) => a.date.getTime() - b.date.getTime());
    project.ticketsWithoutMilestone.sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );
    project.tasksWithoutTicket.sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );
  });

  return {
    projects: Array.from(projectMap.values()),
    allItemsMap,
    timelineRange,
  };
}

export function getStatusColor(status: RoadmapItemStatus): {
  bg: string;
  text: string;
  border: string;
  progress: string;
  light: string;
} {
  switch (status) {
    case "completed":
      return {
        bg: "bg-emerald-500",
        text: "text-emerald-700",
        border: "border-emerald-300",
        progress: "bg-emerald-500",
        light: "bg-emerald-50",
      };
    case "on_track":
      return {
        bg: "bg-sky-500",
        text: "text-sky-700",
        border: "border-sky-300",
        progress: "bg-sky-500",
        light: "bg-sky-50",
      };
    case "at_risk":
      return {
        bg: "bg-amber-500",
        text: "text-amber-700",
        border: "border-amber-300",
        progress: "bg-amber-500",
        light: "bg-amber-50",
      };
    case "blocked":
      return {
        bg: "bg-rose-500",
        text: "text-rose-700",
        border: "border-rose-300",
        progress: "bg-rose-500",
        light: "bg-rose-50",
      };
    case "pending":
    default:
      return {
        bg: "bg-slate-400",
        text: "text-slate-600",
        border: "border-slate-300",
        progress: "bg-slate-400",
        light: "bg-slate-50",
      };
  }
}

export function getStatusLabel(status: RoadmapItemStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "on_track":
      return "On Track";
    case "at_risk":
      return "At Risk";
    case "blocked":
      return "Blocked";
    case "pending":
      return "Pending";
    default:
      return status;
  }
}

export function getDependencyInfo(
  itemId: string,
  allItemsMap: Map<string, RoadmapTask | RoadmapTicket | RoadmapMilestone>
): {
  blockers: Array<{
    id: string;
    name: string;
    type: string;
    status: RoadmapItemStatus;
    progress: number;
    endDate?: Date;
  }>;
  blocking: Array<{
    id: string;
    name: string;
    type: string;
    status: RoadmapItemStatus;
    progress: number;
    startDate?: Date;
  }>;
  isOnCriticalPath: boolean;
} {
   const item = allItemsMap.get(itemId);
  if (!item) {
    return { blockers: [], blocking: [], isOnCriticalPath: false };
  }

  type BlockerItem = {
    id: string;
    name: string;
    type: string;
    status: RoadmapItemStatus;
    progress: number;
    endDate?: Date;
  };

  const blockersList: BlockerItem[] = [];
  for (const depId of item.dependsOn) {
    const depItem = allItemsMap.get(depId);
    if (!depItem) continue;
    blockersList.push({
      id: depItem.id,
      name:
        depItem.type === "milestone"
          ? (depItem as RoadmapMilestone).name
          : (depItem as RoadmapTask | RoadmapTicket).title,
      type: depItem.type,
      status: depItem.status,
      progress: depItem.progress,
      endDate:
        depItem.type === "milestone"
          ? (depItem as RoadmapMilestone).date
          : (depItem as RoadmapTask | RoadmapTicket).endDate,
    });
  }

  type BlockingItem = {
    id: string;
    name: string;
    type: string;
    status: RoadmapItemStatus;
    progress: number;
    startDate?: Date;
  };

  const blockingList: BlockingItem[] = [];
  for (const blockedId of item.isBlocking) {
    const blockedItem = allItemsMap.get(blockedId);
    if (!blockedItem) continue;
    blockingList.push({
      id: blockedItem.id,
      name:
        blockedItem.type === "milestone"
          ? (blockedItem as RoadmapMilestone).name
          : (blockedItem as RoadmapTask | RoadmapTicket).title,
      type: blockedItem.type,
      status: blockedItem.status,
      progress: blockedItem.progress,
      startDate:
        blockedItem.type === "milestone"
          ? (blockedItem as RoadmapMilestone).date
          : (blockedItem as RoadmapTask | RoadmapTicket).startDate,
    });
  }

   return {
    blockers: blockersList,
    blocking: blockingList,
    isOnCriticalPath: item.onCriticalPath,
  };
}
