"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Plus, Trash2, Edit, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { createTemplate, deleteTemplate } from "../actions";
import type { DocumentTemplate } from "@/lib/types";

type ModalState = { type: "create" } | { type: "delete"; template_id: string } | null;

type TemplatesContentProps = {
  orgSlug: string;
  templates: DocumentTemplate[];
  docTypes: Array<{ id: string; name: string; key: string }>;
  canCreate: boolean;
  canDelete: boolean;
  baseUrl: string;
  search: string;
  document_type_id: string;
  error: string;
  success: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TemplatesContent({
  orgSlug, templates, docTypes, canCreate, canDelete, baseUrl,
  search, document_type_id, error, success,
}: TemplatesContentProps) {
  const [modal, setModal] = useState<ModalState>(null);

  const selectedTemplate = modal?.type === "delete" ? templates.find((t) => t.id === modal.template_id) : undefined;

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

      {(error || success) && (
        <div className={cn("rounded-xl border px-4 py-3 text-sm", error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
          {error || success}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-soft items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Search templates..."
              className="w-full rounded-xl border border-soft bg-white pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            name="document_type_id"
            defaultValue={document_type_id ?? ""}
            className="rounded-xl border border-soft bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Types</option>
            {docTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <Button size="sm" onClick={() => setModal({ type: "create" })}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Template
          </Button>
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
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600" onClick={() => setModal({ type: "delete", template_id: template.id })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
            <Button variant="outline" onClick={() => setModal({ type: "create" })}>Create Template</Button>
          </div>
        )}
      </Card>

      {modal?.type === "create" && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Create Template">
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
              <Button variant="outline" type="button" className="flex-1 py-4" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {selectedTemplate && modal?.type === "delete" && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Delete Template" size="sm">
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
              <Button variant="outline" className="w-full py-3 border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
