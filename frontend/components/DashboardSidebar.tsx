"use client";

import { clsx, type ClassValue } from "clsx";
import { 
  LayoutDashboard, 
  Briefcase, 
  Ticket, 
  CheckSquare, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

import { logout } from "@/app/actions/auth";
import type { AppRole } from "@/lib/types";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  email: string;
  basePath?: string;
  organizationName?: string;
  role: AppRole;
};

const MAIN_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "admin", "member", "client"] },
  { href: "/dashboard/projects", label: "Projects", icon: Briefcase, roles: ["owner", "admin", "member", "client"] },
  { href: "/dashboard/tickets", label: "Tickets", icon: Ticket, roles: ["owner", "admin", "member", "client"] },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare, roles: ["owner", "admin", "member", "client"] },
  { href: "/dashboard/users", label: "Users", icon: Users, roles: ["owner", "admin"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["owner", "admin", "member", "client"] },
] as const;

function isLinkActive(pathname: string, href: string) {
  return href.endsWith("/dashboard") ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({ email, basePath = "", organizationName, role }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const links = MAIN_LINKS.filter((item) => (item.roles as readonly string[]).includes(role));

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Header */}
      <div className="flex h-16 items-center justify-between border-b border-soft bg-white px-4 md:hidden">
        <h2 className="text-xl font-bold tracking-tight text-violet-600">JOY CRM</h2>
        <button 
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-2 text-muted hover:bg-slate-50"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[70] flex w-72 flex-col bg-[#1e1b4b] text-indigo-100 transition-transform duration-300 md:relative md:z-0 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-20 items-center justify-between px-6">
          <h2 className="text-2xl font-bold tracking-tighter text-white">JOY CRM</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 text-indigo-300 hover:bg-indigo-800 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <nav className="space-y-1.5">
            {links.map((link) => {
              const href = `${basePath}${link.href}`;
              const active = isLinkActive(pathname, href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                    active 
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-900/20" 
                      : "text-indigo-200/80 hover:bg-indigo-800 hover:text-white"
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-colors", active ? "text-white" : "text-indigo-400")} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-indigo-800/60 p-4">
          {organizationName && (
            <div className="mb-4 rounded-xl bg-indigo-900/40 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-400">Organization</p>
              <p className="truncate text-sm font-semibold text-white">{organizationName}</p>
            </div>
          )}
          
          <div className="rounded-2xl bg-indigo-900/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 font-bold text-white shadow-inner">
                {email[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{email}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">{role}</p>
              </div>
            </div>
            <form action={logout} className="mt-4">
              <button 
                type="submit" 
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-800/50 py-2.5 text-xs font-bold text-indigo-100 transition-colors hover:bg-red-500/20 hover:text-red-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
