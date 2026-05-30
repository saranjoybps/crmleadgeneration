"use client";

import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Clock,
  ListTodo,
} from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Task, Ticket as TicketType } from "@/lib/types";
import { cn } from "@/lib/utils";

type CalendarItem = {
  id: string;
  title: string;
  type: "ticket" | "task";
  status: string;
  priority: string;
  due_date: string;
};

export default function CalendarContent({
  orgSlug,
  tasks,
  tickets,
}: {
  orgSlug: string;
  tasks: Task[];
  tickets: TicketType[];
}) {
  const now = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const todayStr = formatDate(now);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" });

  const allItems = useMemo(() => {
    const items: CalendarItem[] = [
      ...tickets.map((t) => ({
        id: t.id,
        title: t.title,
        type: "ticket" as const,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date ?? "",
      })),
      ...tasks.map((t) => ({
        id: t.id,
        title: t.title,
        type: "task" as const,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date ?? "",
      })),
    ];
    return items.filter((i) => i.due_date);
  }, [tickets, tasks]);

  const getItemsForDay = (day: number) => {
    const targetDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return allItems.filter((i) => i.due_date.split("T")[0] === targetDate);
  };

  const overdueItems = useMemo(
    () => allItems.filter((i) => i.due_date.split("T")[0] < todayStr && i.status !== "closed"),
    [allItems, todayStr]
  );
  const todayItems = useMemo(
    () => allItems.filter((i) => i.due_date.split("T")[0] === todayStr),
    [allItems, todayStr]
  );
  const thisMonthItems = useMemo(
    () => allItems.filter((i) => {
      const d = i.due_date.split("T")[0];
      return d >= todayStr && d.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`);
    }),
    [allItems, todayStr, currentYear, currentMonth]
  );
  const completedCount = useMemo(
    () => allItems.filter((i) => i.status === "closed").length,
    [allItems]
  );

  const upcomingDeadlines = useMemo(
    () => [...allItems]
      .filter((i) => i.due_date.split("T")[0] >= todayStr)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 8),
    [allItems, todayStr]
  );

  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else { setCurrentMonth((m) => m - 1); }
  };
  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else { setCurrentMonth((m) => m + 1); }
  };
  const goToToday = () => {
    const d = new Date();
    setCurrentMonth(d.getMonth());
    setCurrentYear(d.getFullYear());
  };

  const isOverdue = (dueDate: string) => dueDate.split("T")[0] < todayStr;
  const isClosedItem = (status: string) => status === "closed";

  const getItemLink = (item: CalendarItem) => {
    const base = `/o/${orgSlug}/dashboard`;
    const modal = item.type === "ticket" ? "edit&ticket_id" : "edit&task_id";
    return `${base}/${item.type}s?modal=${modal}=${item.id}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-violet-600 uppercase tracking-widest mb-1">
            <CalendarIcon className="h-4 w-4" />
            Schedule
          </div>
          <h1 className="text-3xl font-black tracking-tight text-main">{monthName} {currentYear}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-soft shadow-sm">
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-main">{overdueItems.length}</p>
            <p className="text-[11px] font-semibold text-muted">Overdue</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <CalendarIcon className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-main">{todayItems.length}</p>
            <p className="text-[11px] font-semibold text-muted">Due Today</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-main">{thisMonthItems.length}</p>
            <p className="text-[11px] font-semibold text-muted">This Month</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-main">{completedCount}</p>
            <p className="text-[11px] font-semibold text-muted">Completed</p>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/50">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-soft">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[150px]">
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`blank-${i}`} className="border-b border-r border-soft/50 bg-slate-50/30" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const items = getItemsForDay(day);
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const hasOverdue = items.some((it) => isOverdue(it.due_date) && !isClosedItem(it.status));

            return (
              <div
                key={day}
                className={cn(
                  "relative group border-b border-r border-soft/50 p-2 transition-all hover:bg-slate-50/50",
                  isToday && "bg-violet-50/30",
                  hasOverdue && "bg-red-50/20"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center text-sm font-black rounded-full",
                      isToday ? "bg-violet-600 text-white shadow-md shadow-violet-200" : "text-main"
                    )}
                  >
                    {day}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/o/${orgSlug}/dashboard/tasks?modal=create&due_date=${new Date(currentYear, currentMonth, day).toISOString()}`}
                    >
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg bg-white shadow-sm border border-soft">
                        <Plus className="h-3 w-3 text-violet-600" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[100px] pr-0.5 scrollbar-hide">
                  {items.slice(0, 4).map((item) => {
                    const overdue = isOverdue(item.due_date) && !isClosedItem(item.status);
                    return (
                      <Link key={`${item.type}-${item.id}`} href={getItemLink(item)}>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all border",
                            item.type === "ticket"
                              ? "bg-amber-50 text-amber-800 border-amber-200/60 hover:bg-amber-100 hover:border-amber-300"
                              : "bg-violet-50 text-violet-800 border-violet-200/60 hover:bg-violet-100 hover:border-violet-300",
                            overdue && "!bg-red-50 !text-red-800 !border-red-200"
                          )}
                        >
                          {item.type === "ticket" ? (
                            <Ticket className="h-3 w-3 shrink-0 opacity-70" />
                          ) : (
                            <ListTodo className="h-3 w-3 shrink-0 opacity-70" />
                          )}
                          <span className="truncate">{item.title}</span>
                          {overdue && <AlertCircle className="h-2.5 w-2.5 shrink-0 text-red-500 ml-auto" />}
                          {isClosedItem(item.status) && <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-500 ml-auto" />}
                        </div>
                      </Link>
                    );
                  })}
                  {items.length > 4 && (
                    <p className="text-[10px] font-semibold text-muted text-center pt-0.5">+{items.length - 4} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-violet-600" />
            </div>
            <h2 className="text-lg font-black text-main">Upcoming Deadlines</h2>
          </div>
          <div className="space-y-3">
            {upcomingDeadlines.map((item) => (
              <Link key={`${item.type}-${item.id}`} href={getItemLink(item)}>
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-soft shadow-sm hover:border-violet-200 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                        item.type === "ticket" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"
                      )}
                    >
                      {item.type === "ticket" ? <Ticket className="h-4 w-4" /> : <ListTodo className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-main truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold uppercase text-muted">{item.type}</span>
                        <span className="text-[10px] text-muted">|</span>
                        <span className="text-[10px] font-semibold text-muted">
                          {new Date(item.due_date).toLocaleDateString("default", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={item.priority === "urgent" ? "danger" : item.priority === "high" ? "warning" : "default"}
                    className="shrink-0 text-[9px]"
                  >
                    {item.priority}
                  </Badge>
                </div>
              </Link>
            ))}
            {upcomingDeadlines.length === 0 && (
              <div className="flex items-center justify-center h-40 border-2 border-dashed border-soft rounded-3xl text-[11px] font-medium text-slate-400 bg-slate-50/50">
                No upcoming deadlines
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-lg font-black text-main">Overdue</h2>
            {overdueItems.length > 0 && (
              <Badge variant="danger" className="text-[9px]">{overdueItems.length}</Badge>
            )}
          </div>
          <div className="space-y-3">
            {overdueItems.slice(0, 8).map((item) => (
              <Link key={`${item.type}-${item.id}`} href={getItemLink(item)}>
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-red-50 border border-red-100 shadow-sm hover:bg-red-100 hover:border-red-200 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-red-900 truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold uppercase text-red-600">{item.type}</span>
                        <span className="text-[10px] text-red-400">|</span>
                        <span className="text-[10px] font-semibold text-red-600">
                          Due {new Date(item.due_date).toLocaleDateString("default", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={item.priority === "urgent" ? "danger" : item.priority === "high" ? "warning" : "default"}
                    className="shrink-0 text-[9px]"
                  >
                    {item.priority}
                  </Badge>
                </div>
              </Link>
            ))}
            {overdueItems.length === 0 && (
              <div className="flex items-center justify-center h-40 border-2 border-dashed border-soft rounded-3xl text-[11px] font-medium text-slate-400 bg-slate-50/50">
                <div className="text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                  <p>All caught up! Nothing overdue.</p>
                </div>
              </div>
            )}
            {overdueItems.length > 8 && (
              <p className="text-center text-[10px] font-semibold text-muted pt-1">+{overdueItems.length - 8} more overdue items</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
