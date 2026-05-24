import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import type { Todo } from "@/lib/types";
import TodosContent from "./TodosContent";

type TodosPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ 
    error?: string; 
    success?: string; 
    filter?: "all" | "pending" | "completed";
  }>;
};

export default async function TodosPage({ params, searchParams }: TodosPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);
  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const todosPerm = permissionsResponse.data?.modules.find((m) => m.key === "todos")?.permissions ?? {
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
  };
  if (!todosPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view todos.</p>;
  }

  const filter = query.filter || "all";
  let apiPath = "/api/v1/todos";
  if (filter === "pending") apiPath += "?is_completed=false";
  if (filter === "completed") apiPath += "?is_completed=true";

  const { data: todos, error: todosError } = await apiRequest<Todo[]>(apiPath, { orgSlug });

  if (todosError) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{todosError}</div>;

  return <TodosContent orgSlug={orgSlug} query={query} todos={todos} todosPerm={todosPerm} filter={filter} />;
}
