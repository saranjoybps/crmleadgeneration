import { Briefcase, Ticket, CheckSquare, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type DashboardSummary = {
  active_projects: number;
  open_tickets: number;
  pending_tasks: number;
  team_members: number;
};

export default async function DashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const org = await getOrganizationContextOrRedirect(orgSlug);

  const { data: summary } = await apiRequest<DashboardSummary>("/api/v1/dashboard/summary", { orgSlug });

  const stats = [
    { label: "Active Projects", value: summary?.active_projects ?? 0, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50", href: `/o/${orgSlug}/dashboard/projects` },
    { label: "Open Tickets", value: summary?.open_tickets ?? 0, icon: Ticket, color: "text-amber-600", bg: "bg-amber-50", href: `/o/${orgSlug}/dashboard/tickets` },
    { label: "Pending Tasks", value: summary?.pending_tasks ?? 0, icon: CheckSquare, color: "text-violet-600", bg: "bg-violet-50", href: `/o/${orgSlug}/dashboard/tasks` },
    { label: "Team Members", value: summary?.team_members ?? 0, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", href: `/o/${orgSlug}/dashboard/users` },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-main">Welcome back, {org.organization_name}</h1>
        <p className="mt-1 text-muted text-lg">Here&apos;s what&apos;s happening in your workspace today.</p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="flex items-center gap-5 p-6 transition-all group-hover:border-violet-300 group-hover:shadow-lg group-hover:shadow-violet-500/5 group-hover:-translate-y-1">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-muted">{stat.label}</p>
                <p className="text-3xl font-black text-main">{stat.value}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-main">Getting Started</h2>
            <div className="h-2 w-24 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-1/3 bg-violet-600" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600">1</div>
              <div>
                <h3 className="font-bold text-main">Create your first project</h3>
                <p className="mt-1 text-sm text-muted">Set up a workspace for your team and clients to collaborate.</p>
                <Link href={`/o/${orgSlug}/dashboard/projects`}>
                  <Button variant="ghost" size="sm" className="mt-3 px-0 text-violet-600 hover:bg-transparent hover:underline group">
                    Go to Projects <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex gap-4 opacity-60">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">2</div>
              <div>
                <h3 className="font-bold text-main">Invite your team</h3>
                <p className="mt-1 text-sm text-muted">Add members and assign them roles within the organization.</p>
              </div>
            </div>
            <div className="flex gap-4 opacity-60">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">3</div>
              <div>
                <h3 className="font-bold text-main">Start tracking tasks</h3>
                <p className="mt-1 text-sm text-muted">Use the Kanban board to manage execution and meet deadlines.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-violet-600 to-indigo-700 text-white border-none shadow-xl shadow-violet-500/20">
          <div className="rounded-full bg-white/20 p-4 mb-6 backdrop-blur-sm">
            <Briefcase className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Power up your workflow</h2>
          <p className="text-violet-100 mb-8 max-w-xs mx-auto">
            Ready to scale? Add your first client project and start managing tickets with Joy CRM.
          </p>
          <Link href={`/o/${orgSlug}/dashboard/projects?modal=create`}>
            <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50 font-bold px-8 h-14 text-lg rounded-2xl">
              Create Project
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
