import Link from "next/link";

import { forgotPassword } from "@/app/actions/auth";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const isSuccess = !!params.success;

  return (
    <main className="flex min-h-screen w-full font-sans">
      {/* ── LEFT PANEL ── */}
      <div
        className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1e1040 0%, #2d1b69 45%, #4c1d95 100%)" }}
      >
        {/* Blobs */}
        <div
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }}
        />
        <div
          className="absolute bottom-10 right-[-80px] h-80 w-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)" }}
        />

        {/* Grid texture */}
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
            <span className="text-xl font-bold tracking-tight text-white">JOY CRM</span>
          </div>
        </div>

        {/* Central illustration */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12">
          {/* Lock / reset visual */}
          <div
            className="flex h-28 w-28 items-center justify-center rounded-3xl shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(12px)",
            }}
          >
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <rect x="8" y="22" width="36" height="26" rx="6" fill="#7c3aed" fillOpacity="0.3" stroke="#a78bfa" strokeWidth="1.5" />
              <path d="M16 22v-6a10 10 0 0120 0v6" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
              <circle cx="26" cy="35" r="4" fill="#a78bfa" />
              <path d="M26 39v4" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
              {/* Sparkle top-right */}
              <path d="M40 8l1.5 3 3 1.5-3 1.5L40 17l-1.5-3-3-1.5 3-1.5z" fill="#f59e0b" fillOpacity="0.8" />
            </svg>
          </div>

          {/* Steps card */}
          <div
            className="mt-8 w-full max-w-sm rounded-2xl p-5 shadow-xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(12px)",
            }}
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-violet-300">
              How it works
            </p>

            {[
              {
                step: "01",
                title: "Enter your email",
                desc: "Provide the email linked to your JOY CRM account.",
                color: "#a78bfa",
              },
              {
                step: "02",
                title: "Check your inbox",
                desc: "We'll send a secure reset link within a few seconds.",
                color: "#34d399",
              },
              {
                step: "03",
                title: "Set a new password",
                desc: "Follow the link and choose a strong new password.",
                color: "#f59e0b",
              },
            ].map((s) => (
              <div key={s.step} className="mb-4 flex items-start gap-3 last:mb-0">
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                  style={{ background: `${s.color}20`, color: s.color }}
                >
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{s.title}</p>
                  <p className="text-xs leading-relaxed text-white/45">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Security note */}
          <div className="mt-5 flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-violet-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1a9 9 0 00-6.185 15.538A9 9 0 1010 1zm-.75 5.25a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5zm.75 7.25a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-white/35">Reset links expire after 30 minutes for your security.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-10 pb-8 text-xs text-white/30">
          © {new Date().getFullYear()} JOY CRM · All rights reserved
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
          <span className="text-lg font-bold tracking-tight text-[#1e1040]">JOY CRM</span>
        </div>

        <div className="w-full max-w-[380px]">
          {/* Back to login */}
          <Link
            href="/login"
            className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-violet-600"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back to login
          </Link>

          {isSuccess ? (
            /* ── SUCCESS STATE ── */
            <div className="text-center">
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)" }}
              >
                <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#1e1040]">Check your inbox</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{params.success}</p>
              <p className="mt-4 text-xs text-slate-400">
                Didn't receive it?{" "}
                <span className="font-medium text-violet-600">Check your spam folder</span> or try again below.
              </p>

              <div className="mt-6 space-y-3">
                <Link
                  href="/login"
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #8b5cf6 100%)" }}
                >
                  Back to login
                  <div className="absolute inset-0 -translate-x-full skew-x-12 bg-white/10 transition-transform duration-700 group-hover:translate-x-[200%]" />
                </Link>
                <Link
                  href="/forgot-password"
                  className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-violet-300 hover:text-violet-700"
                >
                  Send again
                </Link>
              </div>
            </div>
          ) : (
            /* ── FORM STATE ── */
            <>
              <div className="mb-7">
                <div
                  className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)" }}
                >
                  <svg className="h-6 w-6 text-violet-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="9" width="14" height="9" rx="2" />
                    <path d="M7 9V6a3 3 0 016 0v3" strokeLinecap="round" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-[#1e1040]">Forgot password?</h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  No worries — enter your email and we'll send you a reset link.
                </p>
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

              <form action={forgotPassword} className="space-y-4">
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
                      placeholder="admin@joybps.com"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-300 transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="group relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #8b5cf6 100%)" }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Send Reset Link
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3.105 3.105a.75.75 0 01.89-.11l13 7.5a.75.75 0 010 1.31l-13 7.5a.75.75 0 01-1.105-.66V3.855a.75.75 0 01.215-.75z" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 -translate-x-full skew-x-12 bg-white/10 transition-transform duration-700 group-hover:translate-x-[200%]" />
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">remember it now?</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link
                href="/login"
                className="group flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-violet-300 hover:text-violet-700 hover:shadow-md"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10.5 3H6a2 2 0 00-2 2v10a2 2 0 002 2h4.5" strokeLinecap="round" />
                  <path d="M13 7l3 3-3 3M16 10H8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to login
              </Link>
            </>
          )}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400 lg:hidden">
          © {new Date().getFullYear()} JOY CRM
        </p>
      </div>
    </main>
  );
}