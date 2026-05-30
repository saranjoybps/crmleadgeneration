import Link from "next/link";
import { login } from "@/app/actions/auth";
import PasswordInput from "@/components/PasswordInput";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen w-full font-sans">
      {/* ── LEFT PANEL ── */}
      <div
        className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1e1040 0%, #2d1b69 45%, #4c1d95 100%)" }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }}
        />
        <div
          className="absolute bottom-10 right-[-80px] h-80 w-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #c4b5fd, transparent 60%)" }}
        />

        {/* Grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 px-10 pt-10">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="1" width="7" height="7" rx="2" fill="#a78bfa" />
                <rect x="10" y="1" width="7" height="7" rx="2" fill="#7c3aed" />
                <rect x="1" y="10" width="7" height="7" rx="2" fill="#7c3aed" />
                <rect x="10" y="10" width="7" height="7" rx="2" fill="#a78bfa" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">JOY ERP</span>
          </div>
        </div>

        {/* Central illustration */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12">
          {/* Dashboard mockup SVG */}
          <div
            className="w-full max-w-sm rounded-2xl p-4 shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Mock top bar */}
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-400 opacity-80" />
              <div className="h-2 w-2 rounded-full bg-yellow-400 opacity-80" />
              <div className="h-2 w-2 rounded-full bg-green-400 opacity-80" />
              <div className="ml-auto h-2 w-24 rounded-full bg-white/10" />
            </div>
            {/* Mock stat cards */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { label: "Projects", val: "3", color: "#7c3aed" },
                { label: "Tickets", val: "2", color: "#f59e0b" },
                { label: "Tasks", val: "5", color: "#06b6d4" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="mb-1 h-1.5 w-4 rounded-full" style={{ background: s.color }} />
                  <div className="text-base font-bold text-white">{s.val}</div>
                  <div className="text-[10px] text-white/40">{s.label}</div>
                </div>
              ))}
            </div>
            {/* Mock chart area */}
            <div
              className="rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="mb-2 h-1.5 w-20 rounded-full bg-white/20" />
              <svg viewBox="0 0 200 60" className="w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 55 C30 50,50 45,80 30 S130 10,200 5" stroke="#a78bfa" strokeWidth="2" fill="none" />
                <path d="M0 55 C30 50,50 45,80 30 S130 10,200 5 L200 60 L0 60Z" fill="url(#g1)" />
                <path d="M0 55 C20 52,60 50,100 48 S160 44,200 40" stroke="#34d399" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
              </svg>
            </div>
            {/* Mock donut row */}
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-12 w-12 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                  <circle
                    cx="18" cy="18" r="14" fill="none"
                    stroke="#7c3aed" strokeWidth="5"
                    strokeDasharray="88 100" strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">88%</span>
              </div>
              <div className="flex-1 space-y-1.5">
                {[["Active", "#7c3aed", "w-4/5"], ["Review", "#f59e0b", "w-1/3"], ["Done", "#34d399", "w-1/2"]].map(
                  ([lbl, color, w]) => (
                    <div key={lbl as string} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: color as string }} />
                      <div className="h-1 flex-1 rounded-full bg-white/10">
                        <div className={`h-full ${w} rounded-full`} style={{ background: color as string, opacity: 0.7 }} />
                      </div>
                      <span className="text-[9px] text-white/30">{lbl}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Copy below card */}
          <div className="mt-8 text-center">
            <h2 className="text-2xl font-bold leading-snug text-white">
              Your workspace,<br />
              <span style={{ color: "#c4b5fd" }}>beautifully organised.</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              Projects, tasks, HR, and insights — all in one place.
            </p>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 px-10 pb-8 text-xs text-white/30">
          © {new Date().getFullYear()} JOY ERP · All rights reserved
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex w-full flex-col items-center justify-center bg-[#f8f7ff] px-6 lg:w-1/2 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "#2d1b69" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="7" height="7" rx="2" fill="#a78bfa" />
              <rect x="10" y="1" width="7" height="7" rx="2" fill="#7c3aed" />
              <rect x="1" y="10" width="7" height="7" rx="2" fill="#7c3aed" />
              <rect x="10" y="10" width="7" height="7" rx="2" fill="#a78bfa" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-[#1e1040]">JOY ERP</span>
        </div>

        <div className="w-full max-w-[380px]">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-[#1e1040]">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-500">Sign in to your Admin Workspace</p>
          </div>

          {/* Error */}
          {params.error ? (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{params.error}</p>
            </div>
          ) : null}

          {/* Form */}
          <form action={login} className="space-y-4">
            {/* Email */}
            <div className="group">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2.5 5.5A1.5 1.5 0 014 4h12a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0116 16H4a1.5 1.5 0 01-1.5-1.5v-9z" />
                    <path d="M2.5 6l7.5 5 7.5-5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="admin@joybps.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-300 transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>

            {/* Password */}
            <div className="group">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                Password
              </label>
              <PasswordInput name="password" required placeholder="••••••••" />
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-violet-600 hover:text-violet-800 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="group relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #8b5cf6 100%)" }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Sign in
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </span>
              {/* Shimmer effect */}
              <div
                className="absolute inset-0 -translate-x-full skew-x-12 bg-white/10 transition-transform duration-700 group-hover:translate-x-[200%]"
              />
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Sign up */}
          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-violet-600 hover:text-violet-800 hover:underline transition-colors"
            >
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Bottom note */}
        <p className="mt-12 text-center text-xs text-slate-400 lg:hidden">
          © {new Date().getFullYear()} JOY ERP
        </p>
      </div>
    </main>
  );
}
