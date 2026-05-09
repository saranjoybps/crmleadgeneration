"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/app/actions/auth";
import type { AppRole } from "@/lib/types";

type DashboardSidebarProps = {
  email: string;
  basePath?: string;
  organizationName?: string;
  role: AppRole;
};

const MAIN_LINKS = [
  { href: "/dashboard", label: "Dashboard", roles: ["owner", "admin", "member"] },
  { href: "/dashboard/users", label: "Users", roles: ["owner", "admin"] },
  { href: "/dashboard/settings", label: "Settings", roles: ["owner", "admin", "member"] },
] as const;

function isLinkActive(pathname: string, href: string) {
  return href.endsWith("/dashboard") ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({ email, basePath = "", organizationName, role }: DashboardSidebarProps) {
  const pathname = usePathname();
  const links = MAIN_LINKS.filter((item) => (item.roles as readonly string[]).includes(role));

  return (
    <aside className="flex w-full flex-col bg-gradient-to-b from-[#2a1a77] via-[#2b1f84] to-[#221567] px-4 py-6 text-violet-100 md:h-screen md:w-[280px] md:shrink-0 md:overflow-hidden md:px-5">
      <div className="mb-7 px-4">
        <h2 className="text-2xl font-semibold text-white ">JOY CRM</h2>
      </div>

      <nav className="space-y-2">
        {links.map((link) => {
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
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-violet-300/20 pt-5">
        {organizationName ? <p className="rounded-lg bg-white/10 px-3 py-1.5 text-xs uppercase tracking-widest text-violet-100/80">{organizationName}</p> : null}
        <div className="mt-3 rounded-xl bg-black/20 px-3 py-3">
          <p className="text-xs uppercase tracking-widest text-violet-100/70">{role}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-sm text-white">{email}</p>
            <form action={logout}>
              <button type="submit" className="rounded-md p-1.5 text-violet-100/80 transition hover:bg-violet-300/20 hover:text-white">
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
