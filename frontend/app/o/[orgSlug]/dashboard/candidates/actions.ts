"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiRequest } from "@/lib/api-server";

export async function createCandidate(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const currentCompany = String(formData.get("current_company") ?? "").trim();
  const experienceYears = String(formData.get("experience_years") ?? "").trim();
  const expectedSalary = String(formData.get("expected_salary") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const resumeUrl = String(formData.get("resume_url") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/candidates`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "recruitment")?.permissions.can_create ?? false;
  if (!canCreate) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create candidates.")}`);
  }

  const { error } = await apiRequest("/api/v1/candidates", {
    method: "POST",
    orgSlug,
    body: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      position,
      source: source || null,
      current_company: currentCompany || null,
      experience_years: experienceYears ? parseInt(experienceYears) : null,
      expected_salary: expectedSalary ? parseFloat(expectedSalary) : null,
      location: location || null,
      resume_url: resumeUrl || null,
      notes: notes || null,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Candidate added.")}`);
}

export async function deleteCandidate(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/candidates`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "recruitment")?.permissions.can_delete ?? false;
  if (!canDelete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete candidates.")}`);
  }

  const { error } = await apiRequest(`/api/v1/candidates/${encodeURIComponent(candidateId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Candidate deleted.")}`);
}

export async function updateCandidate(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/candidates/${candidateId}`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "recruitment")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to update candidates.")}`);
  }

  const body: Record<string, any> = {};
  for (const field of ["first_name", "last_name", "email", "phone", "position", "source", "current_company", "location", "resume_url", "notes"]) {
    const val = String(formData.get(field) ?? "").trim();
    if (val) body[field] = val;
  }
  const exp = String(formData.get("experience_years") ?? "").trim();
  if (exp) body.experience_years = parseInt(exp);
  const sal = String(formData.get("expected_salary") ?? "").trim();
  if (sal) body.expected_salary = parseFloat(sal);

  const { error } = await apiRequest(`/api/v1/candidates/${encodeURIComponent(candidateId)}`, {
    method: "PATCH", orgSlug, body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Candidate updated.")}`);
}

export async function changeStatus(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/candidates/${candidateId}`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "recruitment")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to change candidate status.")}`);
  }

  const { error } = await apiRequest(`/api/v1/candidates/${encodeURIComponent(candidateId)}/status`, {
    method: "PATCH", orgSlug,
    body: { status, note: note || null },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Status updated.")}`);
}

export async function scheduleInterview(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const interviewerId = String(formData.get("interviewer_id") ?? "").trim();
  const scheduledAt = String(formData.get("scheduled_at") ?? "").trim();
  const duration = parseInt(String(formData.get("duration") ?? "60"));
  const interviewType = String(formData.get("interview_type") ?? "screening");
  const roundNumber = parseInt(String(formData.get("round_number") ?? "1"));
  const notes = String(formData.get("notes") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/candidates/${candidateId}`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "recruitment")?.permissions.can_create ?? false;
  if (!canCreate) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to schedule interviews.")}`);
  }

  const { error } = await apiRequest(`/api/v1/candidates/${encodeURIComponent(candidateId)}/interviews`, {
    method: "POST", orgSlug,
    body: {
      interviewer_id: interviewerId,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
      interview_type: interviewType,
      round_number: roundNumber,
      notes: notes || null,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Interview scheduled.")}`);
}

export async function addFeedback(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const interviewId = String(formData.get("interview_id") ?? "").trim();
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const rating = parseInt(String(formData.get("rating") ?? "0"));
  const feedback = String(formData.get("feedback") ?? "").trim();
  const status = String(formData.get("status") ?? "completed");
  const path = `/o/${orgSlug}/dashboard/candidates/${candidateId}`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "recruitment")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to add feedback.")}`);
  }

  const { error } = await apiRequest(`/api/v1/interviews/${encodeURIComponent(interviewId)}`, {
    method: "PATCH", orgSlug,
    body: {
      rating: rating || null,
      feedback: feedback || null,
      status,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Feedback added.")}`);
}

export async function deleteInterview(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const interviewId = String(formData.get("interview_id") ?? "").trim();
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/candidates/${candidateId}`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "recruitment")?.permissions.can_delete ?? false;
  if (!canDelete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete interviews.")}`);
  }

  const { error } = await apiRequest(`/api/v1/interviews/${encodeURIComponent(interviewId)}`, {
    method: "DELETE", orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Interview cancelled.")}`);
}
