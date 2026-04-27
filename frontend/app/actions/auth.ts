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
