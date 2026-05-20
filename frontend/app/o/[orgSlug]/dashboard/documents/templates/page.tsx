import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FileText, Plus, Trash2, Edit, Search } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { DocumentTemplate } from "@/lib/types";

type TemplatesPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    modal?: "create" | "delete";
    template_id?: string;
    search?: string;
    document_type_id?: string;
  }>;
};

async function createTemplate(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const documentTypeId = String(formData.get("document_type_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents/templates`;

  const { error } = await apiRequest("/api/v1/document-templates", {
    method: "POST",
    orgSlug,
    body: {
      name,
      document_type_id: documentTypeId || null,
      content: "<h1>{{employee_name}}</h1>\n<p>Start building your template...</p>",
      variables: [],
    },
  });
  revalidatePath(path);
  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error)}`);
  }
  redirect(`${path}?success=Template+created`);
}

async function deleteTemplate(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const templateId = String(formData.get("template_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents/templates`;

  const { error } = await apiRequest(`/api/v1/document-templates/${templateId}`, {
    method: "DELETE",
    orgSlug,
  });
  revalidatePath(path);
  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error)}`);
  }
  redirect(`${path}?success=Template+deleted`);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildUrl(base: string, params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const qstr = qs.toString();
  return qstr ? `${base}?${qstr}` : base;
}

export default async function TemplatesPage({ params, searchParams }: TemplatesPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const templatesPath = buildUrl("/api/v1/document-templates", {
    search: query.search,
    document_type_id: query.document_type_id,
  });

  const [permissionsRes, templatesRes, typesRes] = await Promise.all([
    apiRequest<{ modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }> }>(
      "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
    ),
    apiRequest<DocumentTemplate[]>(templatesPath, { orgSlug, cache: "no-store" }),
    apiRequest<Array<{ id: string; name: string; key: string }>>("/api/v1/document-types", {
      orgSlug,
      cache: "no-store",
    }),
  ]);

  const docPerm = permissionsRes.data?.modules.find((m) => m.key === "documents")?.permissions;
  const canCreate = docPerm?.can_create ?? false;
  const canDelete = docPerm?.can_delete ?? false;

  const templates = templatesRes.data ?? [];
  const docTypes = typesRes.data ?? [];
  const selectedTemplate = templates.find((t) => t.id === query.template_id);

  const baseUrl = `/o/${orgSlug}/dashboard/documents/templates`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-main">Document Templates</h1>
          <p className="text-sm text-muted mt-1">Create and manage reusable document templates</p>
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
        <div className="flex flex-wrap gap-3 p-4 border-b border-soft items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              name="search"
              defaultValue={query.search ?? ""}
              placeholder="Search templates..."
              className="w-full rounded-xl border border-soft bg-white pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            name="document_type_id"
            defaultValue={query.document_type_id ?? ""}
            className="rounded-xl border border-soft bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Types</option>
            {docTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <Link href={`${baseUrl}?modal=create`}>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              New Template
            </Button>
          </Link>
        </div>

        {templates.length > 0 ? (
          <div className="divide-y divide-soft">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 text-violet-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-main truncate">{template.name}</p>
                    <p className="text-xs text-muted">
                      {template.document_type?.name || "No type"} &middot; {template.variables?.length || 0} variables
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{formatDate(template.updated_at)}</Badge>
                  <Link href={`${baseUrl}/${template.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  {canDelete && (
                    <Link href={`${baseUrl}?modal=delete&template_id=${template.id}`}>
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
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm mt-1 mb-4">Create your first reusable document template.</p>
            <Link href={`${baseUrl}?modal=create`}>
              <Button variant="outline">Create Template</Button>
            </Link>
          </div>
        )}
      </Card>

      <Modal isOpen={query.modal === "create"} closeHref={baseUrl} title="Create Template">
        <form action={createTemplate} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <Input label="Template Name" name="name" required placeholder="e.g. Standard Offer Letter" />
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Document Type</label>
            <select name="document_type_id" required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select type...</option>
              {docTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-6 border-t border-soft">
            <Button type="submit" className="flex-1 py-4">Create Template</Button>
            <Link href={baseUrl} className="flex-1">
              <Button variant="outline" type="button" className="w-full py-4">Cancel</Button>
            </Link>
          </div>
        </form>
      </Modal>

      {selectedTemplate && query.modal === "delete" && (
        <Modal isOpen={true} closeHref={baseUrl} title="Delete Template" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Delete Template?</h4>
              <p className="mt-2 text-xs text-muted">Delete &quot;{selectedTemplate.name}&quot;?</p>
            </div>
            <form action={deleteTemplate} className="flex flex-col gap-2 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="template_id" value={selectedTemplate.id} />
              <Button variant="danger" type="submit" className="py-3">Delete</Button>
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
