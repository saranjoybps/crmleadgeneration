import Link from "next/link";
import { Briefcase, Ticket, CheckSquare, ListChecks, Users, ArrowRight, Megaphone, CalendarCheck, UserPlus, Timer, AlertTriangle, Calendar, Clock } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import dynamic from "next/dynamic";

const DashboardCharts = dynamic(() => import("@/components/DashboardCharts").then((m) => m.DashboardCharts), {
  loading: () => <div className="h-64 rounded-2xl border border-soft bg-white p-6 animate-pulse" />,
});
import type { DashboardSummary } from "@/lib/types";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function DashboardPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const org = await getOrganizationContextOrRedirect(orgSlug);

  const { data: summary } = await apiRequest<DashboardSummary>("/api/v1/dashboard/summary", { orgSlug });

  const statCards = [
    { label: "Active Projects", value: summary?.active_projects ?? 0, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50", href: `/o/${orgSlug}/dashboard/projects` },
    { label: "Open Tickets", value: summary?.open_tickets ?? 0, icon: Ticket, color: "text-amber-600", bg: "bg-amber-50", href: `/o/${orgSlug}/dashboard/tickets` },
    { label: "Pending Tasks", value: summary?.pending_tasks ?? 0, icon: CheckSquare, color: "text-violet-600", bg: "bg-violet-50", href: `/o/${orgSlug}/dashboard/tasks` },
    { label: "Team Members", value: summary?.team_members ?? 0, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", href: `/o/${orgSlug}/dashboard/users` },
    { label: "Pending Todos", value: summary?.pending_todos ?? 0, icon: ListChecks, color: "text-pink-600", bg: "bg-pink-50", href: `/o/${orgSlug}/dashboard/todos` },
  ];

  const extraStats = [
    { label: "Unread Announcements", value: summary?.unread_announcements ?? 0, icon: Megaphone, color: "text-violet-600", bg: "bg-violet-50", href: `/o/${orgSlug}/dashboard/announcements` },
    { label: "Pending Leave", value: summary?.pending_leave_requests ?? 0, icon: CalendarCheck, color: "text-orange-600", bg: "bg-orange-50", href: `/o/${orgSlug}/dashboard/leave` },
    { label: "New Candidates", value: summary?.new_candidates_this_month ?? 0, icon: UserPlus, color: "text-cyan-600", bg: "bg-cyan-50", href: `/o/${orgSlug}/dashboard/candidates` },
    { label: "Hours Logged", value: summary ? `${summary.total_logged_hours}h` : "0h", icon: Timer, color: "text-indigo-600", bg: "bg-indigo-50", href: `/o/${orgSlug}/dashboard/tasks` },
  ];

  const attendance = summary?.attendance_today ?? { present: 0, absent: 0, late: 0, on_leave: 0, total: 0 };
  const totalAtt = attendance.total || 1;
  const presentPct = Math.round((attendance.present / totalAtt) * 100);

  const deadlines = summary?.upcoming_deadlines ?? [];
  const activities = summary?.recent_activity ?? [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-main">Welcome back, {org.organization_name}</h1>
        <p className="mt-1 text-muted text-lg">Here&apos;s what&apos;s happening in your workspace today.</p>
      </header>

      {/* Main Stats */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="flex items-center gap-4 p-5 transition-all group-hover:border-violet-300 group-hover:shadow-lg group-hover:shadow-violet-500/5 group-hover:-translate-y-0.5">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{stat.label}</p>
                <p className="text-2xl font-black text-main">{stat.value}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {extraStats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="flex items-center gap-3 p-4 transition-all group-hover:border-violet-200">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted">{stat.label}</p>
                <p className="text-xl font-black text-main">{stat.value}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Section */}
      <DashboardCharts summary={summary ?? {} as DashboardSummary} />

      {/* Bottom Grid: Attendance + Deadlines + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Attendance */}
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-main flex items-center gap-2">
            <Clock className="h-5 w-5 text-violet-500" />
            Today&apos;s Attendance
          </h3>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-3 flex-1 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${presentPct}%` }} />
            </div>
            <span className="text-sm font-bold text-main">{presentPct}%</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted">Present</span>
              <span className="ml-auto font-bold text-main">{attendance.present}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-muted">Absent</span>
              <span className="ml-auto font-bold text-main">{attendance.absent}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-muted">Late</span>
              <span className="ml-auto font-bold text-main">{attendance.late}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-muted">On Leave</span>
              <span className="ml-auto font-bold text-main">{attendance.on_leave}</span>
            </div>
          </div>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-main flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Upcoming Deadlines
          </h3>
          {deadlines.length === 0 ? (
            <p className="text-sm text-muted">No upcoming deadlines this week.</p>
          ) : (
            <div className="space-y-3">
              {deadlines.slice(0, 5).map((d, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-soft last:border-0 last:pb-0">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${d.type === "task" ? "bg-violet-500" : "bg-amber-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-main truncate">{d.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(d.due_date).toLocaleDateString()}
                      {d.project_name && <span>· {d.project_name}</span>}
                    </div>
                  </div>
                  <Badge className={`text-[9px] ${d.type === "task" ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-700"}`}>
                    {d.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-main flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-500" />
            Recent Activity
          </h3>
          {activities.length === 0 ? (
            <p className="text-sm text-muted">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 8).map((a, i) => (
                <div key={i} className="flex items-start gap-3 pb-2 border-b border-soft last:border-0 last:pb-0">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                    a.module === "ticket" ? "bg-amber-500" :
                    a.module === "task" ? "bg-violet-500" :
                    a.module === "recruitment" ? "bg-emerald-500" :
                    a.module === "leave" ? "bg-blue-500" : "bg-slate-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-main truncate">{a.title}</p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {a.action} · {a.module}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 bg-gradient-to-br from-violet-600 to-indigo-700 text-white border-none shadow-xl shadow-violet-500/20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Quick Actions</h2>
            <p className="text-violet-100 text-sm mt-1">Jump to key tasks and modules.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/o/${orgSlug}/dashboard/projects?modal=create`}>
              <Button className="bg-white text-violet-700 hover:bg-violet-50 font-bold">Create Project</Button>
            </Link>
            <Link href={`/o/${orgSlug}/dashboard/tickets?modal=create`}>
              <Button className="bg-white/20 text-white hover:bg-white/30 border border-white/30 font-bold">Raise Ticket</Button>
            </Link>
            <Link href={`/o/${orgSlug}/dashboard/analytics`}>
              <Button className="bg-white/20 text-white hover:bg-white/30 border border-white/30 font-bold">
                Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
