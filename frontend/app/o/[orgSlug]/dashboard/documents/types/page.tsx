import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, Trash2, FileText } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { DocumentType } from "@/lib/types";

type DocumentTypesPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    modal?: "create" | "edit" | "delete";
    type_id?: string;
  }>;
};

async function createType(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents/types`;

  const { error } = await apiRequest("/api/v1/document-types", {
    method: "POST",
    orgSlug,
    body: { name, key, description: description || null },
  });
  revalidatePath(path);
  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error)}`);
  }
  redirect(`${path}?success=Document+type+created`);
}

async function deleteType(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const typeId = String(formData.get("type_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents/types`;

  const { error } = await apiRequest(`/api/v1/document-types/${typeId}`, {
    method: "DELETE",
    orgSlug,
  });
  revalidatePath(path);
  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error)}`);
  }
  redirect(`${path}?success=Document+type+deleted`);
}

export default async function DocumentTypesPage({ params, searchParams }: DocumentTypesPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const [permissionsRes, typesRes] = await Promise.all([
    apiRequest<{ modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }> }>(
      "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
    ),
    apiRequest<DocumentType[]>("/api/v1/document-types", { orgSlug, cache: "no-store" }),
  ]);

  const docPerm = permissionsRes.data?.modules.find((m) => m.key === "documents")?.permissions;
  const canCreate = docPerm?.can_create ?? false;
  const canDelete = docPerm?.can_delete ?? false;

  const types = typesRes.data ?? [];
  const selectedType = types.find((t) => t.id === query.type_id);

  const baseUrl = `/o/${orgSlug}/dashboard/documents/types`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-main">Document Types</h1>
          <p className="text-sm text-muted mt-1">Manage document categories</p>
        </div>
        <Link href={`/o/${orgSlug}/dashboard/documents`}>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1.5" />
            Back to Documents
          </Button>
        </Link>
      </div>

      {(query.error || query.success) && (
        <div className={cn("rounded-xl border px-4 py-3 text-sm", query.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
          {query.error || query.success}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between p-4 border-b border-soft">
          <p className="text-sm text-muted">{types.length} document types</p>
          {canCreate && (
            <Link href={`${baseUrl}?modal=create`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New Type
              </Button>
            </Link>
          )}
        </div>

        {types.length > 0 ? (
          <div className="divide-y divide-soft">
            {types.map((type) => (
              <div key={type.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 text-violet-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-main">{type.name}</p>
                    <p className="text-xs text-muted font-mono">{type.key}</p>
                  </div>
                  {!type.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {type.description && (
                    <span className="text-xs text-muted hidden md:block mr-2 max-w-[200px] truncate">{type.description}</span>
                  )}
                  {type.tenant_id && canDelete && (
                    <Link href={`${baseUrl}?modal=delete&type_id=${type.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center text-muted">
            <FileText className="h-10 w-10 mb-3 text-slate-300" />
            <p className="text-lg font-medium">No document types</p>
            <p className="text-sm mt-1 mb-4">Create your first document type.</p>
            {canCreate && (
              <Link href={`${baseUrl}?modal=create`}>
                <Button variant="outline">Create Type</Button>
              </Link>
            )}
          </div>
        )}
      </Card>

      <Modal isOpen={query.modal === "create"} closeHref={baseUrl} title="Create Document Type">
        <form action={createType} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <Input label="Name" name="name" required placeholder="e.g. Internship Certificate" />
          <Input label="Key" name="key" required placeholder="e.g. internship_certificate" />
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Description</label>
            <textarea name="description" rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500"
              placeholder="Optional description" />
          </div>
          <div className="flex gap-3 pt-6 border-t border-soft">
            <Button type="submit" className="flex-1 py-4">Create</Button>
            <Link href={baseUrl} className="flex-1">
              <Button variant="outline" type="button" className="w-full py-4">Cancel</Button>
            </Link>
          </div>
        </form>
      </Modal>

      {selectedType && query.modal === "delete" && (
        <Modal isOpen={true} closeHref={baseUrl} title="Delete Document Type" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Delete Document Type?</h4>
              <p className="mt-2 text-xs text-muted">Deactivate &quot;{selectedType.name}&quot;?</p>
            </div>
            <form action={deleteType} className="flex flex-col gap-2 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="type_id" value={selectedType.id} />
              <Button variant="danger" type="submit" className="py-3">Deactivate</Button>
              <Link href={baseUrl}>
                <Button variant="outline" className="w-full py-3 border-none text-muted">Cancel</Button>
              </Link>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
