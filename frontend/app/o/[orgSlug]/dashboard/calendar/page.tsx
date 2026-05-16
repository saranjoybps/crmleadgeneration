import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import Link from "next/link";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Task, Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";

export default async function CalendarPage({ params, searchParams }: { 
  params: Promise<{ orgSlug: string }>,
  searchParams: Promise<{ month?: string, year?: string, department_id?: string }>
}) {
  const { orgSlug } = await params;
  const { month, year, department_id } = await searchParams;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  const { data: departments } = await apiRequest<Array<{ id: string; name: string }>>("/api/v1/departments", { orgSlug });

  const now = new Date();
  const currentMonth = month ? parseInt(month) : now.getMonth();
  const currentYear = year ? parseInt(year) : now.getFullYear();

  // Fetch tasks and tickets for this month
  const scopedQ = department_id ? `?department_id=${encodeURIComponent(department_id)}` : "";
  const { data: tasks } = await apiRequest<Task[]>(`/api/v1/tasks${scopedQ}`, { orgSlug });
  const { data: tickets } = await apiRequest<Ticket[]>(`/api/v1/tickets${scopedQ}`, { orgSlug });

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  const getItemsForDay = (day: number) => {
    // Create a local date string YYYY-MM-DD for comparison
    const targetDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayTasks = tasks?.filter(t => {
      if (!t.due_date) return false;
      const dueDateStr = t.due_date.split('T')[0];
      return dueDateStr === targetDate;
    }) || [];

    const dayTickets = tickets?.filter(t => {
      if (!t.due_date) return false;
      const dueDateStr = t.due_date.split('T')[0];
      return dueDateStr === targetDate;
    }) || [];

    return { tasks: dayTasks, tickets: dayTickets };
  };

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  // Combine tasks and tickets for upcoming deadlines
  const upcomingDeadlines = [
    ...(tasks || []).map(t => ({ ...t, itemType: 'task' as const })),
    ...(tickets || []).map(t => ({ ...t, itemType: 'ticket' as const }))
  ]
    .filter(item => item.due_date && new Date(item.due_date) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-violet-600 uppercase tracking-widest mb-1">
            <CalendarIcon className="h-4 w-4" />
            Schedule
          </div>
          <h1 className="text-3xl font-black tracking-tight text-main">{monthName} {currentYear}</h1>
          <p className="mt-1 text-muted font-medium">Track your team deadlines and project delivery dates.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-soft shadow-sm">
          <Link href={`/o/${orgSlug}/dashboard/calendar?month=${prevMonth}&year=${prevYear}`}>
            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10"><ChevronLeft className="h-5 w-5" /></Button>
          </Link>
          <Link href={`/o/${orgSlug}/dashboard/calendar`}>
            <Button variant="outline" className="font-bold border-soft hover:bg-slate-50 rounded-xl">Today</Button>
          </Link>
          <Link href={`/o/${orgSlug}/dashboard/calendar?month=${nextMonth}&year=${nextYear}`}>
            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10"><ChevronRight className="h-5 w-5" /></Button>
          </Link>
        </div>
      </header>
      <div className="flex flex-wrap gap-2">
        <Link href={`/o/${orgSlug}/dashboard/calendar?month=${currentMonth}&year=${currentYear}`} className={cn("px-3 py-1 rounded-xl text-xs font-bold", !department_id ? "bg-violet-600 text-white" : "bg-slate-100 text-muted")}>All Departments</Link>
        {(departments || []).map((d) => (
          <Link key={d.id} href={`/o/${orgSlug}/dashboard/calendar?month=${currentMonth}&year=${currentYear}&department_id=${encodeURIComponent(d.id)}`} className={cn("px-3 py-1 rounded-xl text-xs font-bold", department_id === d.id ? "bg-violet-600 text-white" : "bg-slate-100 text-muted")}>
            {d.name}
          </Link>
        ))}
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/50">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-soft">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[140px]">
          {blanks.map(i => (
            <div key={`blank-${i}`} className="border-b border-r border-soft/50 bg-slate-50/30" />
          ))}
          {days.map(day => {
            const { tasks: dayTasks, tickets: dayTickets } = getItemsForDay(day);
            const isToday = now.getDate() === day && now.getMonth() === currentMonth && now.getFullYear() === currentYear;
            
            return (
              <div key={day} className={cn("relative group border-b border-r border-soft/50 p-2 transition-colors hover:bg-slate-50/50", isToday && "bg-violet-50/20")}>
                <span className={cn(
                  "inline-flex h-7 w-7 items-center justify-center text-sm font-black rounded-full mb-2",
                  isToday ? "bg-violet-600 text-white shadow-md shadow-violet-200" : "text-main"
                )}>
                  {day}
                </span>
                
                <div className="space-y-1 overflow-y-auto max-h-[90px] pr-1 scrollbar-hide">
                  {dayTickets.map(ticket => (
                    <Link key={ticket.id} href={`/o/${orgSlug}/dashboard/tickets?modal=edit&ticket_id=${ticket.id}`}>
                      <div className="truncate rounded-lg bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700 border border-amber-100/50 hover:bg-amber-100 transition-colors mb-1">
                        TKT: {ticket.title}
                      </div>
                    </Link>
                  ))}
                  {dayTasks.map(task => (
                    <Link key={task.id} href={`/o/${orgSlug}/dashboard/tasks?modal=edit&task_id=${task.id}`}>
                      <div className="truncate rounded-lg bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700 border border-violet-100/50 hover:bg-violet-100 transition-colors mb-1">
                        TSK: {task.title}
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Link href={`/o/${orgSlug}/dashboard/tasks?modal=create&due_date=${new Date(currentYear, currentMonth, day).toISOString()}`}>
                     <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg bg-white shadow-sm border border-soft"><Plus className="h-3 w-3 text-violet-600" /></Button>
                   </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-black text-main">Upcoming Deadlines</h2>
          </div>
          <div className="space-y-4">
            {upcomingDeadlines.map(item => (
               <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-soft shadow-sm hover:border-violet-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn("h-8 w-8 rounded-xl border-soft text-main font-black flex items-center justify-center p-0", item.itemType === 'ticket' ? "bg-amber-50" : "bg-slate-50")}>
                      {new Date(item.due_date!).getDate()}
                    </Badge>
                    <div>
                      <p className="text-sm font-bold text-main">
                        <span className="text-[10px] text-muted mr-1">{item.itemType.toUpperCase()}:</span>
                        {item.title}
                      </p>
                      <p className="text-[10px] font-medium text-muted">{new Date(item.due_date!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <Badge className={cn("border-none font-bold uppercase tracking-wider text-[9px]", item.itemType === 'ticket' ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700")}>
                    {item.status}
                  </Badge>
               </div>
            ))}
            {upcomingDeadlines.length === 0 && (
              <div className="flex items-center justify-center h-48 border-2 border-dashed border-soft rounded-3xl text-[11px] font-medium text-slate-400 bg-slate-50/50">
                No upcoming deadlines in the next few weeks
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-white border-none shadow-xl shadow-violet-500/20 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-4">Plan with precision</h2>
            <p className="text-violet-100 text-lg mb-8 leading-relaxed">
              Use the timeline and calendar views to identify bottlenecks before they happen.
            </p>
            <div className="flex gap-4">
              <Link href={`/o/${orgSlug}/dashboard/roadmap`}>
                <Button className="bg-white text-violet-700 hover:bg-violet-50 font-black px-6 rounded-xl h-12 shadow-lg shadow-black/10">View Roadmap</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
