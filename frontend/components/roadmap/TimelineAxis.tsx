"use client";

import React, { useMemo } from "react";
import {
  format,
  eachMonthOfInterval,
  differenceInDays,
  startOfDay,
} from "date-fns";
import { TimelineRange } from "@/lib/roadmap-utils";

interface TimelineAxisProps {
  range: TimelineRange;
  showQuarters?: boolean;
}

export function TimelineAxis({ range, showQuarters = false }: TimelineAxisProps) {
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

  const quarters = useMemo(() => {
    if (!showQuarters) return [];
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
  }, [months, showQuarters]);

  return (
    <div className="relative">
      {showQuarters && quarters.length > 0 && (
        <div className="h-8 border-b border-slate-200 bg-slate-50">
          {quarters.map((q) => (
            <div
              key={q.label}
              className="absolute top-0 flex items-center justify-center h-8 border-r border-slate-200"
              style={{
                left: `${(q.startDay / range.totalDays) * 100}%`,
                width: `${((q.endDay - q.startDay) / range.totalDays) * 100}%`,
              }}
            >
              <span className="text-xs font-bold text-slate-500">{q.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="h-6 bg-slate-100 border-b border-slate-200 relative">
        {months.map((month, idx) => {
          const nextMonth = months[idx + 1];
          const widthPercent = nextMonth
            ? ((nextMonth.dayPosition - month.dayPosition) / range.totalDays) * 100
            : ((range.totalDays - month.dayPosition) / range.totalDays) * 100;

          return (
            <div
              key={month.label}
              className="absolute top-0 flex items-center justify-center h-6 border-r border-slate-200"
              style={{
                left: `${(month.dayPosition / range.totalDays) * 100}%`,
                width: `${widthPercent}%`,
              }}
            >
              <span className="text-[10px] font-semibold text-slate-600">{month.shortLabel}</span>
            </div>
          );
        })}

        {todayPosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
            style={{
              left: `${(todayPosition / range.totalDays) * 100}%`,
            }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-t-sm whitespace-nowrap">
              Today
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
