"use client";

import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type SchedulePickerProps = {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
};

export default function SchedulePicker({ date, time, onDateChange, onTimeChange }: SchedulePickerProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Schedule</p>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm",
              "outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-100",
              !date && "text-slate-400",
            )}
          />
        </div>
        <div className="relative flex-1">
          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm",
              "outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-100",
            )}
          />
        </div>
      </div>
    </div>
  );
}
