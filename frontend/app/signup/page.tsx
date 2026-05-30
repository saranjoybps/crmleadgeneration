import Link from "next/link";

import { signup } from "@/app/actions/auth";
import PasswordInput from "@/components/PasswordInput";

type SignupPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
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
          className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full opacity-10"
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

        {/* Central content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12">
          {/* Feature list card */}
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px)",
            }}
          >
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-violet-300">
              Everything you need
            </p>

            {[
              {
                icon: (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="4" width="16" height="13" rx="2" />
                    <path d="M2 8h16" strokeLinecap="round" />
                    <path d="M6 12h2M6 15h5" strokeLinecap="round" />
                  </svg>
                ),
                title: "Project & Task Management",
                desc: "Track projects, assign tasks, and hit every deadline.",
                color: "#a78bfa",
              },
              {
                icon: (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" />
                    <path d="M10 6v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
                title: "HR & Attendance",
                desc: "Manage shifts, leave, and candidates in one hub.",
                color: "#34d399",
              },
              {
                icon: (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 10h14M3 6h14M3 14h8" strokeLinecap="round" />
                  </svg>
                ),
                title: "Smart Ticketing",
                desc: "Resolve issues faster with a built-in ticket system.",
                color: "#f59e0b",
              },
              {
                icon: (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 14l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="2" y="2" width="16" height="16" rx="3" />
                  </svg>
                ),
                title: "Insights & Analytics",
                desc: "Live dashboards to keep your team aligned.",
                color: "#06b6d4",
              },
            ].map((f, i) => (
              <div key={i} className="mb-4 flex items-start gap-3 last:mb-0">
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${f.color}20`, color: f.color }}
                >
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs leading-relaxed text-white/45">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial pill */}
          <div
            className="mt-6 flex items-center gap-3 rounded-full px-4 py-2.5"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {/* Avatars */}
            <div className="flex -space-x-2">
              {["#7c3aed", "#f59e0b", "#34d399"].map((c, i) => (
                <div
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-[#2d1b69]"
                  style={{ background: c }}
                >
                  {["A", "J", "K"][i]}
                </div>
              ))}
            </div>
            <p className="text-xs text-white/60">
              <span className="font-semibold text-white">2,400+</span> teams already onboard
            </p>
          </div>
        </div>

        {/* Bottom */}
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

        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-3xl font-bold tracking-tight text-[#1e1040]">Create your account</h1>
            <p className="mt-1.5 text-sm text-slate-500">Get started with your free workspace today.</p>
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
          <form action={signup} className="space-y-4">
            {/* Email */}
            <div>
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
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-300 transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                Password
              </label>
              <PasswordInput name="password" required minLength={8} placeholder="Min. 8 characters" />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                Confirm password
              </label>
              <PasswordInput name="confirm_password" required minLength={8} placeholder="Re-enter your password" />
            </div>

            {/* Password strength hint */}
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <svg className="h-3.5 w-3.5 text-violet-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0010 7zm0 7.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              Use at least 8 characters with a mix of letters and numbers.
            </p>

            {/* Terms */}
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer accent-violet-600"
              />
              <span className="text-xs leading-relaxed text-slate-500">
                I agree to the{" "}
                <Link href="/terms" className="font-medium text-violet-600 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-medium text-violet-600 hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className="group relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #8b5cf6 100%)" }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Create Account
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                </svg>
              </span>
              {/* Shimmer */}
              <div className="absolute inset-0 -translate-x-full skew-x-12 bg-white/10 transition-transform duration-700 group-hover:translate-x-[200%]" />
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">already have an account?</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Login link */}
          <Link
            href="/login"
            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-violet-300 hover:text-violet-700 hover:shadow-md"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10.5 3H6a2 2 0 00-2 2v10a2 2 0 002 2h4.5" strokeLinecap="round" />
              <path d="M13 7l3 3-3 3M16 10H8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign in instead
          </Link>
        </div>

        <p className="mt-10 text-center text-xs text-slate-400 lg:hidden">
          © {new Date().getFullYear()} JOY ERP
        </p>
      </div>
    </main>
  );
}
