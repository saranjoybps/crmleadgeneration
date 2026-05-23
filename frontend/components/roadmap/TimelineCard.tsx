"use client";

import React, { useState } from "react";
import {
  RoadmapTask,
  RoadmapTicket,
  RoadmapMilestone,
  getStatusColor,
  getStatusLabel,
  TimelineRange,
} from "@/lib/roadmap-utils";
import { differenceInDays, format } from "date-fns";
import {
  Flag,
  Ticket,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lock,
  Link2,
  Minus,
  MoreHorizontal,
} from "lucide-react";

interface TimelineCardBaseProps {
  range: TimelineRange;
  onSelect: (id: string) => void;
  isSelected: boolean;
  showCriticalPathOnly?: boolean;
}

interface TimelineMilestoneCardProps extends TimelineCardBaseProps {
  item: RoadmapMilestone;
}

interface TimelineTicketCardProps extends TimelineCardBaseProps {
  item: RoadmapTicket;
}

interface TimelineTaskCardProps extends TimelineCardBaseProps {
  item: RoadmapTask;
}

function getIcon(type: string) {
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

export function TimelineMilestoneCard({
  item,
  range,
  onSelect,
  isSelected,
  showCriticalPathOnly = false,
}: TimelineMilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = getStatusColor(item.status);
  const Icon = getIcon("milestone");

  const ticketStart =
    item.tickets.length > 0
      ? Math.min(...item.tickets.map((t) => differenceInDays(t.startDate, range.startDate)))
      : differenceInDays(item.date, range.startDate);

  const position = Math.min(ticketStart, differenceInDays(item.date, range.startDate));
  const endPosition = differenceInDays(item.date, range.startDate);
  const width = Math.max(2, endPosition - position);
  const leftPercent = (position / range.totalDays) * 100;
  const widthPercent = (width / range.totalDays) * 100;

  if (showCriticalPathOnly && !item.onCriticalPath) {
    return null;
  }

  const hasChildren = item.tickets.length > 0;
  const isBlocked = item.status === "blocked";
  const isAtRisk = item.status === "at_risk";

  return (
    <div className="relative">
      <div
        className={`relative h-14 group cursor-pointer transition-all
          ${isSelected ? "ring-2 ring-violet-500 ring-offset-2 rounded-xl" : ""}
          ${item.onCriticalPath ? "z-10" : ""}
        `}
        style={{
          left: `${leftPercent}%`,
          width: `${Math.max(widthPercent, 5)}%`,
          minWidth: "120px",
        }}
        onClick={() => onSelect(item.id)}
      >
        <div
          className={`absolute inset-0 rounded-xl border-2 ${colors.border} ${colors.light}
            ${item.onCriticalPath ? "shadow-md" : ""}
            ${isBlocked ? "opacity-80" : ""}
            transition-all hover:shadow-lg
          `}
        >
          {item.progress > 0 && (
            <div
              className={`absolute left-0 top-0 bottom-0 rounded-l-xl ${colors.progress} transition-all`}
              style={{ width: `${Math.min(item.progress, 100)}%`, opacity: 0.25 }}
            />
          )}

          <div className="relative h-full flex items-center px-3 gap-2">
            <div
              className={`flex-shrink-0 w-7 h-7 rounded-lg ${colors.bg} flex items-center justify-center
                ${item.onCriticalPath ? "ring-2 ring-violet-400" : ""}
              `}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-xs font-bold truncate ${colors.text}
                  ${isBlocked ? "line-through opacity-60" : ""}
                `}
              >
                {item.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium
                    ${colors.text}
                  `}
                >
                  {item.progress}%
                  {isBlocked && <Lock className="w-2.5 h-2.5" />}
                  {isAtRisk && <AlertTriangle className="w-2.5 h-2.5" />}
                  {item.onCriticalPath && <Link2 className="w-2.5 h-2.5 text-violet-600" />}
                </span>
                <span className="text-[9px] text-slate-400">
                  {format(item.date, "MMM d")}
                </span>
              </div>
            </div>

            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="flex-shrink-0 w-6 h-6 rounded-md hover:bg-white/60 flex items-center justify-center transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
            )}
          </div>

          <div
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              item.onCriticalPath ? "bg-violet-500" : "bg-transparent"
            }`}
          />
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="mt-2 ml-8 space-y-2">
          {item.tickets.map((ticket) => (
            <TimelineTicketCard
              key={ticket.id}
              item={ticket}
              range={range}
              onSelect={onSelect}
              isSelected={false}
              showCriticalPathOnly={showCriticalPathOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TimelineTicketCard({
  item,
  range,
  onSelect,
  isSelected,
  showCriticalPathOnly = false,
}: TimelineTicketCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = getStatusColor(item.status);
  const Icon = getIcon("ticket");

  const position = differenceInDays(item.startDate, range.startDate);
  const width = Math.max(1, differenceInDays(item.endDate, item.startDate));
  const leftPercent = (position / range.totalDays) * 100;
  const widthPercent = (width / range.totalDays) * 100;

  if (showCriticalPathOnly && !item.onCriticalPath) {
    return null;
  }

  const hasChildren = item.tasks.length > 0;
  const isBlocked = item.status === "blocked";
  const isAtRisk = item.status === "at_risk";

  return (
    <div className="relative">
      <div
        className={`relative h-12 group cursor-pointer transition-all
          ${isSelected ? "ring-2 ring-violet-500 ring-offset-2 rounded-lg" : ""}
          ${item.onCriticalPath ? "z-10" : ""}
        `}
        style={{
          left: `${leftPercent}%`,
          width: `${Math.max(widthPercent, 4)}%`,
          minWidth: "100px",
        }}
        onClick={() => onSelect(item.id)}
      >
        <div
          className={`absolute inset-0 rounded-lg border ${colors.border} ${colors.light}
            ${item.onCriticalPath ? "shadow-sm" : ""}
            transition-all hover:shadow-md
          `}
        >
          {item.progress > 0 && (
            <div
              className={`absolute left-0 top-0 bottom-0 rounded-l-lg ${colors.progress} transition-all`}
              style={{ width: `${Math.min(item.progress, 100)}%`, opacity: 0.2 }}
            />
          )}

          <div className="relative h-full flex items-center px-2.5 gap-1.5">
            <div
              className={`flex-shrink-0 w-5 h-5 rounded ${colors.bg} flex items-center justify-center
                ${item.onCriticalPath ? "ring-1.5 ring-violet-400" : ""}
              `}
            >
              <Icon className="w-3 h-3 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-[11px] font-semibold truncate ${colors.text}
                  ${isBlocked ? "line-through opacity-60" : ""}
                `}
              >
                {item.title}
              </p>
              <div className="flex items-center gap-1">
                <span className={`inline-flex items-center text-[9px] ${colors.text}`}>
                  {item.progress}%
                  {isBlocked && <Lock className="w-2 h-2 ml-0.5" />}
                  {isAtRisk && <AlertTriangle className="w-2 h-2 ml-0.5" />}
                </span>
                {item.onCriticalPath && (
                  <span className="text-[8px] text-violet-600 font-medium">Critical</span>
                )}
              </div>
            </div>

            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="flex-shrink-0 w-5 h-5 rounded hover:bg-white/60 flex items-center justify-center transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="mt-1.5 ml-6 space-y-1.5">
          {item.tasks.map((task) => (
            <TimelineTaskCard
              key={task.id}
              item={task}
              range={range}
              onSelect={onSelect}
              isSelected={false}
              showCriticalPathOnly={showCriticalPathOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TimelineTaskCard({
  item,
  range,
  onSelect,
  isSelected,
  showCriticalPathOnly = false,
}: TimelineTaskCardProps) {
  const colors = getStatusColor(item.status);
  const Icon = getIcon("task");

  const position = differenceInDays(item.startDate, range.startDate);
  const width = Math.max(1, differenceInDays(item.endDate, item.startDate));
  const leftPercent = (position / range.totalDays) * 100;
  const widthPercent = (width / range.totalDays) * 100;

  if (showCriticalPathOnly && !item.onCriticalPath) {
    return null;
  }

  const isBlocked = item.status === "blocked";
  const isAtRisk = item.status === "at_risk";

  return (
    <div
      className={`relative h-10 group cursor-pointer transition-all
        ${isSelected ? "ring-2 ring-violet-500 ring-offset-1 rounded-md" : ""}
      `}
      style={{
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 3)}%`,
        minWidth: "80px",
      }}
      onClick={() => onSelect(item.id)}
    >
      <div
        className={`absolute inset-0 rounded-md border ${colors.border} ${colors.light}
          transition-all hover:shadow-sm opacity-90
        `}
      >
        {item.progress > 0 && (
          <div
            className={`absolute left-0 top-0 bottom-0 rounded-l-md ${colors.progress} transition-all`}
            style={{ width: `${Math.min(item.progress, 100)}%`, opacity: 0.15 }}
          />
        )}

        <div className="relative h-full flex items-center px-2 gap-1">
          <div className={`flex-shrink-0 w-1.5 h-4 rounded-full ${colors.bg}`} />

          <div className="min-w-0 flex-1">
            <p
              className={`text-[10px] font-medium truncate ${colors.text}
                ${isBlocked ? "line-through opacity-60" : ""}
              `}
            >
              {item.title}
            </p>
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-slate-500">{item.progress}%</span>
              {isBlocked && <Lock className="w-1.5 h-1.5 text-rose-500" />}
              {isAtRisk && <AlertTriangle className="w-1.5 h-1.5 text-amber-500" />}
              {item.onCriticalPath && (
                <span className="text-[7px] text-violet-600 font-medium">Critical</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
