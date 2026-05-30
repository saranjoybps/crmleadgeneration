"use client";

import React, { useMemo } from "react";
import {
  format,
  eachMonthOfInterval,
  eachWeekOfInterval,
  differenceInDays,
  startOfDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from "date-fns";
import { TimelineRange } from "@/lib/roadmap-utils";

interface TimelineAxisProps {
  range: TimelineRange;
  showQuarters?: boolean;
}

export function TimelineAxis({ range, showQuarters = true }: TimelineAxisProps) {
  const today = startOfDay(new Date());
  const todayPosition = useMemo(() => {
    if (today < range.startDate || today > range.endDate) return null;
    return differenceInDays(today, range.startDate);
  }, [today, range]);

  const months = useMemo(() => {
    const result = eachMonthOfInterval({
      start: range.startDate,
      end: range.endDate,
    });
    return result.map((month) => ({
      date: month,
      label: format(month, "MMM yyyy"),
      shortLabel: format(month, "MMM"),
      dayPosition: differenceInDays(month, range.startDate),
      totalDaysInRange: differenceInDays(range.endDate, range.startDate),
    }));
  }, [range]);

  const weeks = useMemo(() => {
    const result = eachWeekOfInterval({
      start: range.startDate,
      end: range.endDate,
    }, { weekStartsOn: 1 });
    return result.map((week) => ({
      date: week,
      label: format(week, "d MMM"),
      dayPosition: differenceInDays(week, range.startDate),
    }));
  }, [range]);

  const quarters = useMemo(() => {
    const quarterMap = new Map<string, { label: string; startDay: number; endDay: number }>();

    months.forEach((month, idx) => {
      const q = Math.floor(month.date.getMonth() / 3) + 1;
      const year = month.date.getFullYear();
      const key = `${year}-Q${q}`;

      if (!quarterMap.has(key)) {
        const endIdx = Math.min(idx + 2, months.length - 1);
        quarterMap.set(key, {
          label: `Q${q} ${year}`,
          startDay: month.dayPosition,
          endDay: months[endIdx].dayPosition,
        });
      }
    });

    return Array.from(quarterMap.values());
  }, [months]);

  return (
    <div className="relative">
      {showQuarters && quarters.length > 0 && (
        <div className="h-7 border-b border-slate-200 bg-slate-50/80 flex">
          {quarters.map((q) => (
            <div
              key={q.label}
              className="flex items-center justify-center h-7 border-r border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider"
              style={{
                width: `${((q.endDay - q.startDay) / range.totalDays) * 100}%`,
              }}
            >
              {q.label}
            </div>
          ))}
        </div>
      )}

      <div className="h-7 bg-white border-b border-slate-200 relative flex">
        {months.map((month, idx) => {
          const nextMonth = months[idx + 1];
          const widthPercent = nextMonth
            ? ((nextMonth.dayPosition - month.dayPosition) / range.totalDays) * 100
            : ((range.totalDays - month.dayPosition) / range.totalDays) * 100;

          const isCurrentMonth = month.date.getMonth() === today.getMonth() && month.date.getFullYear() === today.getFullYear();

          return (
            <div
              key={month.label}
              className={`flex items-center justify-center h-7 border-r border-slate-100 text-[10px] font-bold uppercase tracking-wider
                ${isCurrentMonth ? "text-violet-700 bg-violet-50/50" : "text-slate-500"}
              `}
              style={{ width: `${widthPercent}%` }}
            >
              {month.shortLabel}
            </div>
          );
        })}

        {weeks.map((week) => (
          <div
            key={week.label}
            className="absolute top-7 bottom-0 w-px bg-slate-100/50 z-0"
            style={{ left: `${(week.dayPosition / range.totalDays) * 100}%` }}
          />
        ))}

        {todayPosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 shadow-sm"
            style={{
              left: `${(todayPosition / range.totalDays) * 100}%`,
            }}
          >
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-b whitespace-nowrap z-30">
              TODAY
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
