import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FileText, Download, Trash2, Plus, Search, FilePlus, X } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { GeneratedDocument } from "@/lib/types";

type DocumentsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    modal?: "delete" | "preview";
    doc_id?: string;
    search?: string;
    document_type_id?: string;
    employee_id?: string;
    date_from?: string;
    date_to?: string;
  }>;
};

async function deleteDocument(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const docId = String(formData.get("doc_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents`;

  const { error } = await apiRequest(`/api/v1/documents/${docId}`, {
    method: "DELETE",
    orgSlug,
  });
  revalidatePath(path);
  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error)}`);
  }
  redirect(`${path}?success=Document+deleted`);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default async function DocumentsPage({ params, searchParams }: DocumentsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const docsPath = buildUrl("/api/v1/documents", {
    search: query.search,
    document_type_id: query.document_type_id,
    employee_id: query.employee_id,
    date_from: query.date_from,
    date_to: query.date_to,
  });

  const [permissionsRes, docsRes, typesRes] = await Promise.all([
    apiRequest<{ modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }> }>(
      "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
    ),
    apiRequest<GeneratedDocument[]>(docsPath, { orgSlug, cache: "no-store" }),
    apiRequest<Array<{ id: string; name: string; key: string }>>("/api/v1/document-types", {
      orgSlug,
      cache: "no-store",
    }),
  ]);

  const docPerm = permissionsRes.data?.modules.find((m) => m.key === "documents")?.permissions;
  const canView = docPerm?.can_view ?? false;
  const canCreate = docPerm?.can_create ?? false;
  const canDelete = docPerm?.can_delete ?? false;

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64 text-muted">
        <p>You do not have permission to view documents.</p>
      </div>
    );
  }

  const docs = docsRes.data ?? [];
  const docTypes = typesRes.data ?? [];
  const selectedDoc = docs.find((d) => d.id === query.doc_id);

  const baseUrl = `/o/${orgSlug}/dashboard/documents`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-main">Documents</h1>
          <p className="text-sm text-muted mt-1">Manage generated documents</p>
        </div>
        <div className="flex gap-2">
          <Link href={`${baseUrl}/templates`}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1.5" />
              Templates
            </Button>
          </Link>
          {canCreate && (
            <Link href={`${baseUrl}/generate`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Generate
              </Button>
            </Link>
          )}
        </div>
      </div>

      {(query.error || query.success) && (
        <div className={cn("rounded-xl border px-4 py-3 text-sm", query.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
          {query.error || query.success}
        </div>
      )}

      <Card>
        <form action={baseUrl} method="GET" className="flex flex-wrap gap-3 p-4 border-b border-soft">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              name="search"
              defaultValue={query.search ?? ""}
              placeholder="Search by title or employee..."
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
          <input
            name="date_from"
            type="date"
            defaultValue={query.date_from ?? ""}
            className="rounded-xl border border-soft bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
          />
          <input
            name="date_to"
            type="date"
            defaultValue={query.date_to ?? ""}
            className="rounded-xl border border-soft bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
          />
          <Button type="submit" size="sm" variant="secondary">Filter</Button>
        </form>

        {docs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-soft text-left text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Generated By</th>
                  <th className="px-4 py-3">Generated At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id} className="border-b border-soft hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-violet-500 shrink-0" />
                        <span className="text-sm font-medium text-main">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{doc.employee?.full_name || doc.employee?.email || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{doc.document_type?.name || "—"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{doc.generated_by_user?.full_name || doc.generated_by_user?.email || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted">{formatDate(doc.generated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`${baseUrl}?modal=preview&doc_id=${doc.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <a href={`/api/documents/${orgSlug}/${doc.id}/pdf`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:text-violet-600">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        {canDelete && (
                          <Link href={`${baseUrl}?modal=delete&doc_id=${doc.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center text-muted">
            <FilePlus className="h-10 w-10 mb-3 text-slate-300" />
            <p className="text-lg font-medium">No documents found</p>
            <p className="text-sm mt-1 mb-4">
              {query.search || query.document_type_id ? "Try different filters." : "Start by generating a new document."}
            </p>
            {canCreate && !query.search && !query.document_type_id && (
              <Link href={`${baseUrl}/generate`}>
                <Button variant="outline">Generate your first document</Button>
              </Link>
            )}
          </div>
        )}
      </Card>

      {selectedDoc && query.modal === "delete" && (
        <Modal isOpen={true} closeHref={baseUrl} title="Delete Document" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Delete Document?</h4>
              <p className="mt-2 text-xs text-muted">Delete &quot;{selectedDoc.title}&quot;?</p>
            </div>
            <form action={deleteDocument} className="flex flex-col gap-2 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="doc_id" value={selectedDoc.id} />
              <Button variant="danger" type="submit" className="py-3">Delete</Button>
              <Link href={baseUrl}>
                <Button variant="outline" className="w-full py-3 border-none text-muted">Cancel</Button>
              </Link>
            </form>
          </div>
        </Modal>
      )}

      {selectedDoc && query.modal === "preview" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <Link href={baseUrl} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-[95vw] h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-soft px-6 py-4 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-main tracking-tight">{selectedDoc.title}</h3>
                <p className="text-xs text-muted mt-0.5">
                  Generated by {selectedDoc.generated_by_user?.full_name || selectedDoc.generated_by_user?.email || "Unknown"} on {formatDate(selectedDoc.generated_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/api/documents/${orgSlug}/${selectedDoc.id}/pdf`}>
                  <Button size="sm">
                    <Download className="h-4 w-4 mr-1.5" />
                    Download PDF
                  </Button>
                </a>
                <Link href={baseUrl} className="rounded-lg p-1 text-muted hover:bg-slate-100 transition-colors">
                  <X className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              <iframe
                src={`/api/documents/${orgSlug}/${selectedDoc.id}/preview`}
                className="w-full h-full border-0"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
