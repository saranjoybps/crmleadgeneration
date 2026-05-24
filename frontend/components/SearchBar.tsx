"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

const MODULES = [
  { label: "Dashboard", href: "/dashboard", keywords: ["home", "overview"] },
  { label: "Analytics", href: "/dashboard/analytics", keywords: ["analytics", "stats", "statistics"] },
  { label: "Reports", href: "/dashboard/reports", keywords: ["reports", "report"] },
  { label: "Announcements", href: "/dashboard/announcements", keywords: ["announcements", "announce"] },
  { label: "Projects", href: "/dashboard/projects", keywords: ["projects", "project"] },
  { label: "Roadmap", href: "/dashboard/roadmap", keywords: ["roadmap", "road", "map"] },
  { label: "Calendar", href: "/dashboard/calendar", keywords: ["calendar", "schedule"] },
  { label: "Tickets", href: "/dashboard/tickets", keywords: ["tickets", "ticket", "support"] },
  { label: "Tasks", href: "/dashboard/tasks", keywords: ["tasks", "task"] },
  { label: "Todos", href: "/dashboard/todos", keywords: ["todos", "todo", "list"] },
  { label: "Chat", href: "/dashboard/chat", keywords: ["chat", "messages", "message"] },
  { label: "Shifts", href: "/dashboard/shifts", keywords: ["shifts", "shift", "schedule"] },
  { label: "Attendance", href: "/dashboard/attendance", keywords: ["attendance", "attendance"] },
  { label: "Candidates", href: "/dashboard/candidates", keywords: ["candidates", "candidate", "recruitment"] },
  { label: "Leave", href: "/dashboard/leave", keywords: ["leave", "time off"] },
  { label: "Payroll", href: "/dashboard/payroll", keywords: ["payroll", "pay", "salary"] },
  { label: "Vault", href: "/dashboard/vault", keywords: ["vault", "passwords", "secrets"] },
  { label: "Documents", href: "/dashboard/documents", keywords: ["documents", "docs", "files"] },
  { label: "Users", href: "/dashboard/users", keywords: ["users", "team", "members"] },
  { label: "Settings", href: "/dashboard/settings", keywords: ["settings", "preferences"] },
];

type SearchBarProps = {
  orgSlug: string;
};

export default function SearchBar({ orgSlug }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const lower = query.toLowerCase();
  const filtered = query.trim()
    ? MODULES.filter(
        m =>
          m.label.toLowerCase().includes(lower) ||
          m.keywords.some(k => k.includes(lower))
      )
    : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = selectedIndex >= 0 ? selectedIndex : 0;
      if (filtered[idx]) {
        navigateTo(filtered[idx].href);
      }
    }
  };

  const navigateTo = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/o/${orgSlug}${href}`);
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setSelectedIndex(-1); }}
          onFocus={() => { if (filtered.length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search module... (⌘K)"
          className="h-10 w-full rounded-xl border border-soft bg-white pl-9 pr-9 text-sm text-main placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-soft bg-white shadow-lg z-50 overflow-hidden">
          <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
            {filtered.map((mod, index) => (
              <button
                key={mod.href}
                onClick={() => navigateTo(mod.href)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                  index === selectedIndex ? "bg-slate-100" : "hover:bg-slate-50"
                )}
              >
                <span className="text-sm font-medium text-main">{mod.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
