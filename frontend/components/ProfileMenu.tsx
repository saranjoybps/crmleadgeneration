"use client";

import { useEffect, useRef, useState } from "react";

import { logout } from "@/app/actions/auth";

type ProfileMenuProps = {
  email: string;
  role: string;
  initial: string;
};

export function ProfileMenu({ email, role, initial }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700"
        aria-label="Profile"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-soft bg-white p-3 shadow-lg">
          <p className="truncate text-sm font-semibold text-main">{email}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">{role}</p>
          <div className="mt-3 border-t border-soft pt-3">
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-soft px-3 py-2 text-sm font-medium text-main transition hover:bg-slate-50"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-slate-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
