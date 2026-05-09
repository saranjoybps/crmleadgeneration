import Link from "next/link";

import { resetPassword } from "@/app/actions/auth";

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <form action={resetPassword} className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-800">Reset Password</h1>
        {params.error ? <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{params.error}</p> : null}
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="New password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
          Update Password
        </button>
        <p className="text-sm text-slate-600">
          Back to{" "}
          <Link href="/login" className="text-brand-700 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}
