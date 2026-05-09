"use server";

import { redirect } from "next/navigation";

import { getOrCreatePrimaryOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const org = await getOrCreatePrimaryOrganization();
  redirect(`/o/${org.organization_slug}/dashboard`);
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect("/login?error=Check your email to confirm your account, then login.");
  }

  const org = await getOrCreatePrimaryOrganization();
  redirect(`/o/${org.organization_slug}/dashboard`);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/forgot-password?success=Password reset email sent. Please check your inbox.");
}

export async function resetPassword(formData: FormData) {
  const password = String(formData.get("password") || "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  const org = await getOrCreatePrimaryOrganization();
  redirect(`/o/${org.organization_slug}/dashboard`);
}
