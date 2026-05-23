"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function createTicket(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const milestoneId = String(formData.get("milestone_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "other").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tickets`;

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_create: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const ticketsPermissions = permissionsResponse.data?.modules.find(m => m.key === "tickets")?.permissions;
  if (!ticketsPermissions?.can_create) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create tickets.")}`);
  }

  const { error } = await apiRequest("/api/v1/tickets", {
    method: "POST",
    orgSlug,
    body: { 
      project_id: projectId, 
      milestone_id: milestoneId || null, 
      title, 
      description: description || null, 
      type, 
      status: "open",
      start_date: startDate || null,
      due_date: dueDate || null
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Ticket created.")}`);
}

export async function updateTicket(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const ticketId = String(formData.get("ticket_id") ?? "").trim();
  const milestoneId = String(formData.get("milestone_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "open").trim();
  const type = String(formData.get("type") ?? "other").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tickets`;

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_edit: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const ticketsPermissions = permissionsResponse.data?.modules.find(m => m.key === "tickets")?.permissions;
  if (!ticketsPermissions?.can_edit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to edit tickets.")}`);
  }

  const { error } = await apiRequest(`/api/v1/tickets/${encodeURIComponent(ticketId)}`, {
    method: "PATCH",
    orgSlug,
    body: { 
      title, 
      description: description || null, 
      status, 
      type,
      milestone_id: milestoneId || null,
      start_date: startDate || null,
      due_date: dueDate || null
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Ticket updated.")}`);
}

export async function deleteTicket(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const ticketId = String(formData.get("ticket_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tickets`;

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  
  const ticketsPermissions = permissionsResponse.data?.modules.find(m => m.key === "tickets")?.permissions;
  if (!ticketsPermissions?.can_delete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete tickets.")}`);
  }

  const { error } = await apiRequest(`/api/v1/tickets/${encodeURIComponent(ticketId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Ticket deleted.")}`);
}
