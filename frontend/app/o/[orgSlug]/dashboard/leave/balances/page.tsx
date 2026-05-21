import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AllLeaveBalances } from "@/lib/types";

type BalancesPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ year?: string }>;
};

export default async function BalancesPage({ params, searchParams }: BalancesPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const leavePerm = permsRes.data?.modules.find((m) => m.key === "leave")?.permissions ?? { can_view: false };
  const usersPerm = permsRes.data?.modules.find((m) => m.key === "users")?.permissions ?? { can_view: false };

  if (!leavePerm.can_view || !usersPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view balances.</p>;
  }

  const year = query.year || String(new Date().getFullYear());
  const { data: allBalances } = await apiRequest<AllLeaveBalances>(`/api/v1/leave-balances/all?year=${year}`, { orgSlug });

  if (!allBalances) {
    return <p className="p-6 text-red-600">Failed to load balances.</p>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center gap-4">
        <Link href={`/o/${orgSlug}/dashboard/leave`}>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Leave Balances</h1>
          <p className="text-muted">Leave balance overview for {year}.</p>
        </div>
      </header>

      <Card className="p-6 overflow-x-auto">
        {allBalances.members.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-soft text-left text-xs font-bold uppercase tracking-wider text-muted">
                <th className="pb-3 pr-4 whitespace-nowrap">Employee</th>
                {allBalances.leave_types.map((lt) => (
                  <th key={lt.id} className="pb-3 pr-4 text-center whitespace-nowrap">{lt.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allBalances.members.map((member) => (
                <tr key={member.user_id} className="border-b border-soft/50 last:border-0">
                  <td className="py-3 pr-4 font-medium whitespace-nowrap">{member.full_name || member.email}</td>
                  {allBalances.leave_types.map((lt) => {
                    const bal = member.balances.find((b) => b.leave_type_id === lt.id);
                    const used = bal ? bal.used_days : 0;
                    const total = bal ? bal.total_days : 0;
                    const pending = bal ? bal.pending_days : 0;
                    const available = bal ? bal.available_days : 0;
                    return (
                      <td key={lt.id} className="py-3 pr-4 text-center">
                        <span className={available <= 0 ? "text-red-600 font-bold" : ""}>
                          {used}/{total}
                        </span>
                        {pending > 0 && <span className="text-amber-500 text-xs ml-1">(+{pending})</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted text-center py-6">No members found.</p>
        )}
      </Card>
    </div>
  );
}
