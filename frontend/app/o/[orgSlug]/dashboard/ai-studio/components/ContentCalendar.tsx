"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Image, MessageSquare, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudioContent, ContentType } from "../types";

type ContentCalendarProps = {
  contents: StudioContent[];
  onEdit: (item: StudioContent) => void;
};

const TYPE_ICONS: Record<ContentType, React.ComponentType<{ className?: string }>> = {
  blog: FileText,
  poster: Image,
  social: MessageSquare,
  email: Mail,
};

const TYPE_COLORS: Record<ContentType, string> = {
  blog: "bg-violet-500",
  poster: "bg-pink-500",
  social: "bg-blue-500",
  email: "bg-amber-500",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export default function ContentCalendar({ contents, onEdit }: ContentCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const days = getMonthDays(year, month);

  function getContentForDay(day: number): StudioContent[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return contents.filter((c) => {
      const target = c.scheduledAt ?? c.publishedAt ?? c.createdAt;
      return target?.startsWith(dateStr);
    });
  }

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else { setMonth(month - 1); }
  }

  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else { setMonth(month + 1); }
  }

  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
  }

  const today = new Date();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h3 className="text-base font-bold text-slate-800">
          {MONTHS[month]} {year}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50"
          >
            Today
          </button>
          <div className="flex">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-l-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="-ml-px rounded-r-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAYS.map((d) => (
          <div key={d} className="border-r border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-slate-50 p-2" />;
          }

          const dayContents = getContentForDay(day);
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

          return (
            <div
              key={day}
              className={cn(
                "min-h-[100px] border-b border-r border-slate-50 p-2 transition-colors hover:bg-slate-50",
              )}
            >
              <span
                className={cn(
                  "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  isToday ? "bg-violet-600 text-white" : "text-slate-600",
                )}
              >
                {day}
              </span>
              <div className="space-y-1">
                {dayContents.slice(0, 3).map((c) => {
                  const Icon = TYPE_ICONS[c.type];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onEdit(c)}
                      className={cn(
                        "flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left transition-opacity hover:opacity-80",
                        TYPE_COLORS[c.type],
                      )}
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0 text-white" />
                      <span className="truncate text-[10px] font-medium text-white">{c.title}</span>
                    </button>
                  );
                })}
                {dayContents.length > 3 && (
                  <p className="px-1.5 text-[10px] font-semibold text-slate-400">+{dayContents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
