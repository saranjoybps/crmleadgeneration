import Link from "next/link";

import { logout } from "@/app/actions/auth";

export function DashboardHeader() {
  return (
    <header className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/dashboard/campaigns" className="rounded-md bg-slate-100 px-3 py-2 text-slate-800 hover:bg-slate-200">
            Campaigns
          </Link>
          <Link
            href="/dashboard/create-campaign"
            className="rounded-md bg-brand-600 px-3 py-2 text-white hover:bg-brand-700"
          >
            Create Campaign
          </Link>
        </nav>
        <form action={logout}>
          <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
            Logout
          </button>
        </form>
      </div>
    </header>
  );
}
