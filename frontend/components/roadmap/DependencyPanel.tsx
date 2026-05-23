"use client";

import React from "react";
import {
  RoadmapTask,
  RoadmapTicket,
  RoadmapMilestone,
  getStatusColor,
  getStatusLabel,
  getDependencyInfo,
} from "@/lib/roadmap-utils";
import { format } from "date-fns";
import {
  X,
  Lock,
  Unlock,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  Ticket,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Minus,
  TrendingUp,
} from "lucide-react";

interface DependencyPanelProps {
  selectedId: string | null;
  allItemsMap: Map<string, RoadmapTask | RoadmapTicket | RoadmapMilestone>;
  onClose: () => void;
  onNavigateTo: (id: string) => void;
}

function getTypeIcon(type: string) {
  switch (type) {
    case "milestone":
      return Flag;
    case "ticket":
      return Ticket;
    case "task":
      return CheckSquare;
    default:
      return Minus;
  }
}

export function DependencyPanel({
  selectedId,
  allItemsMap,
  onClose,
  onNavigateTo,
}: DependencyPanelProps) {
  if (!selectedId) return null;

  const item = allItemsMap.get(selectedId);
  if (!item) return null;

  const colors = getStatusColor(item.status);
  const TypeIcon = getTypeIcon(item.type);
  const depInfo = getDependencyInfo(selectedId, allItemsMap);

  const blockersResolved = depInfo.blockers.filter((b) => b.progress >= 100).length;
  const blockersTotal = depInfo.blockers.length;
  const unresolvedBlockers = depInfo.blockers.filter((b) => b.progress < 100);

  const isAtRisk =
    item.status === "at_risk" ||
    unresolvedBlockers.some((b) => b.status === "at_risk" || b.status === "blocked");

  const name =
    item.type === "milestone"
      ? (item as RoadmapMilestone).name
      : (item as RoadmapTask | RoadmapTicket).title;

  const startDate =
    item.type === "milestone"
      ? (item as RoadmapMilestone).date
      : (item as RoadmapTask | RoadmapTicket).startDate;

  const endDate =
    item.type === "milestone"
      ? (item as RoadmapMilestone).date
      : (item as RoadmapTask | RoadmapTicket).endDate;

  const childCount =
    item.type === "milestone"
      ? (item as RoadmapMilestone).tickets.length
      : item.type === "ticket"
        ? (item as RoadmapTicket).tasks.length
        : 0;

  return (
    <div className="fixed inset-y-0 right-0 w-96 max-w-full bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-4 duration-200">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0
                ${item.onCriticalPath ? "ring-2 ring-violet-400 ring-offset-2" : ""}
              `}
            >
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-base font-bold ${colors.text} truncate`}>{name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.light} ${colors.text}`}>
                  {getStatusLabel(item.status)}
                </span>
                <span className="text-xs text-slate-400 capitalize">{item.type}</span>
                {item.onCriticalPath && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                    <TrendingUp className="w-3 h-3" />
                    Critical Path
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress</p>
              <div className="mt-1.5">
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${colors.progress}`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className={`text-sm font-bold mt-1 ${colors.text}`}>{item.progress}%</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timeline</p>
              <div className="mt-1.5">
                {item.type !== "milestone" ? (
                  <>
                    <p className="text-xs font-medium text-slate-600">
                      {format(startDate, "MMM d")}
                      <span className="mx-1 text-slate-400">→</span>
                      {format(endDate, "MMM d, yyyy")}
                    </p>
                    {item.slackDays > 0 && (
                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.slackDays} day{item.slackDays !== 1 ? "s" : ""} of slack
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-slate-600">
                    {format((item as RoadmapMilestone).date, "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {childCount > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {item.type === "milestone" ? "Tickets" : "Tasks"} in this {item.type}
              </p>
              <p className="text-sm font-bold text-slate-700 mt-1">{childCount} items</p>
            </div>
          )}

          {isAtRisk && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">
                    {unresolvedBlockers.length > 0
                      ? "Has unresolved blockers"
                      : item.status === "at_risk"
                        ? "At Risk - Behind schedule"
                        : "Potential risk detected"}
                  </p>
                  {unresolvedBlockers.length > 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      {unresolvedBlockers.length} blocker{unresolvedBlockers.length !== 1 ? "s" : ""}{" "}
                      must be resolved first
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {depInfo.blockers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowLeft className="w-4 h-4 text-slate-400" />
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Blocked By
                </h4>
                <span className="text-xs text-slate-400">
                  {blockersResolved}/{blockersTotal} complete
                </span>
              </div>
              <div className="space-y-2">
                {depInfo.blockers.map((blocker) => {
                  const bColors = getStatusColor(blocker.status);
                  const BIcon = getTypeIcon(blocker.type);
                  const isResolved = blocker.progress >= 100;

                  return (
                    <button
                      key={blocker.id}
                      onClick={() => onNavigateTo(blocker.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all
                        ${isResolved
                          ? "bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50"
                          : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg ${bColors.bg} flex items-center justify-center flex-shrink-0`}
                        >
                          {isResolved ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <BIcon className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${bColors.text} truncate`}>
                            {blocker.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 capitalize">
                              {blocker.type}
                            </span>
                            <span className="text-[10px] font-medium text-slate-600">
                              {blocker.progress}%
                            </span>
                            {blocker.endDate && (
                              <span className="text-[10px] text-slate-400">
                                Due: {format(blocker.endDate, "MMM d")}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {depInfo.blocking.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Blocking
                </h4>
                <span className="text-xs text-slate-400">
                  {depInfo.blocking.length} item{depInfo.blocking.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {depInfo.blocking.map((blocked) => {
                  const bColors = getStatusColor(blocked.status);
                  const BIcon = getTypeIcon(blocked.type);

                  return (
                    <button
                      key={blocked.id}
                      onClick={() => onNavigateTo(blocked.id)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg ${bColors.bg} flex items-center justify-center flex-shrink-0`}
                        >
                          <BIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${bColors.text} truncate`}>
                            {blocked.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 capitalize">
                              {blocked.type}
                            </span>
                            <span className="text-[10px] font-medium text-slate-600">
                              {blocked.progress}%
                            </span>
                            {blocked.startDate && (
                              <span className="text-[10px] text-slate-400">
                                Starts: {format(blocked.startDate, "MMM d")}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {depInfo.isOnCriticalPath && (
            <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
              <div className="flex items-start gap-2">
                <Link2 className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-violet-800">On the Critical Path</p>
                  <p className="text-xs text-violet-700 mt-1">
                    This item has zero slack time. Any delay here will directly impact the
                    overall project timeline.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
