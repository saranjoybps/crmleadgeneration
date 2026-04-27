"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/app/actions/auth";

type DashboardSidebarProps = {
  email: string;
  basePath?: string;
  organizationName?: string;
};

const MAIN_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: "campaigns" },
  { href: "/dashboard/create-campaign", label: "Create Campaign", icon: "create" },
  { href: "/dashboard/users", label: "Users", icon: "users" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

function isLinkActive(pathname: string, href: string) {
  if (href.endsWith("/dashboard")) {
    return pathname === href;
  }
  if (href.endsWith("/dashboard/campaigns")) {
    const campaignDetailPrefix = href.replace(/campaigns$/, "campaign/");
    return pathname === href || pathname.startsWith(campaignDetailPrefix);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" className={className} width="16" height="16" aria-hidden="true">
        <path {...common} d="M3 13h8V3H3zM13 21h8v-6h-8zM13 11h8V3h-8zM3 21h8v-6H3z" />
      </svg>
    );
  }
  if (name === "campaigns") {
    return (
      <svg viewBox="0 0 24 24" className={className} width="16" height="16" aria-hidden="true">
        <path {...common} d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    );
  }
  if (name === "create") {
    return (
      <svg viewBox="0 0 24 24" className={className} width="16" height="16" aria-hidden="true">
        <path {...common} d="M12 5v14M5 12h14" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" className={className} width="16" height="16" aria-hidden="true">
        <path {...common} d="M16 19a4 4 0 0 0-8 0M12 13a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 19a3.5 3.5 0 0 0-5-3.2M17 12a2.8 2.8 0 1 0 0-5.6" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg viewBox="0 0 24 24" className={className} width="16" height="16" aria-hidden="true">
        <path
          {...common}
          d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 3.5-1.8-.6a6.8 6.8 0 0 0-.4-1l.9-1.7-1.8-1.8-1.7.9a6.8 6.8 0 0 0-1-.4L14 4h-4l-.6 1.8a6.8 6.8 0 0 0-1 .4l-1.7-.9L4.9 7.1l.9 1.7a6.8 6.8 0 0 0-.4 1L4 12v4l1.8.6a6.8 6.8 0 0 0 .4 1l-.9 1.7 1.8 1.8 1.7-.9a6.8 6.8 0 0 0 1 .4L10 22h4l.6-1.8a6.8 6.8 0 0 0 1-.4l1.7.9 1.8-1.8-.9-1.7a6.8 6.8 0 0 0 .4-1L20 16v-4Z"
        />
      </svg>
    );
  }
  return null;
}

export function DashboardSidebar({ email, basePath = "", organizationName }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col bg-gradient-to-b from-[#2a1a77] via-[#2b1f84] to-[#221567] px-4 py-6 text-violet-100 md:h-screen md:w-[280px] md:shrink-0 md:overflow-hidden md:px-5">
      <div className="mb-7 px-4">
        <h2 className="text-2xl font-semibold text-white ">JOY CRM</h2>
      </div>

      <nav className="space-y-2">
        {MAIN_LINKS.map((link) => {
          const href = `${basePath}${link.href}`;
          const active = isLinkActive(pathname, href);
          return (
            <Link
              key={link.href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                active ? "bg-violet-300/40 text-white shadow-sm" : "text-violet-100/90 hover:bg-violet-300/15"
              }`}
            >
              <SidebarIcon name={link.icon} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-violet-300/20 pt-5">
        {organizationName ? <p className="rounded-lg bg-white/10 px-3 py-1.5 text-xs uppercase tracking-widest text-violet-100/80">{organizationName}</p> : null}
        <div className="mt-3 rounded-xl bg-black/20 px-3 py-3">
          <p className="text-xs uppercase tracking-widest text-violet-100/70">Account</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-sm text-white">{email}</p>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md p-1.5 text-violet-100/80 transition hover:bg-violet-300/20 hover:text-white"
                aria-label="Logout"
                title="Logout"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" width="16" height="16" aria-hidden="true">
                  <path
                    d="M14 7l5 5-5 5M19 12H9M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
