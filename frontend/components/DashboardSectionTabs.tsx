"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/dashboard/campaigns", label: "Campaigns", key: "campaigns" },
  { href: "/dashboard/users", label: "Users", key: "users" },
  { href: "/dashboard/settings", label: "Settings", key: "settings" },
];

function isTabActive(pathname: string, href: string) {
  if (href.endsWith("/dashboard")) {
    return pathname === href;
  }
  if (href.endsWith("/dashboard/campaigns")) {
    const campaignDetailPrefix = href.replace(/campaigns$/, "campaign/");
    return pathname === href || pathname.startsWith(campaignDetailPrefix);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type DashboardSectionTabsProps = {
  basePath?: string;
};

export function DashboardSectionTabs({ basePath = "" }: DashboardSectionTabsProps) {
  const pathname = usePathname();

  return (
    <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {TABS.map((tab) => {
        const href = `${basePath}${tab.href}`;
        const active = isTabActive(pathname, href);
        return (
          <Link
            key={tab.key}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
