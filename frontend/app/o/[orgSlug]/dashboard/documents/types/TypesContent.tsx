"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, FileText } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { createType, deleteType } from "../actions";
import type { DocumentType } from "@/lib/types";

type ModalState = { type: "create" } | { type: "delete"; type_id: string } | null;

type TypesContentProps = {
  orgSlug: string;
  types: DocumentType[];
  canCreate: boolean;
  canDelete: boolean;
  baseUrl: string;
  error: string;
  success: string;
};

export default function TypesContent({
  orgSlug, types, canCreate, canDelete, baseUrl, error, success,
}: TypesContentProps) {
  const [modal, setModal] = useState<ModalState>(null);

  const selectedType = modal?.type === "delete" ? types.find((t) => t.id === modal.type_id) : undefined;

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

      {(error || success) && (
        <div className={cn("rounded-xl border px-4 py-3 text-sm", error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
          {error || success}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between p-4 border-b border-soft">
          <p className="text-sm text-muted">{types.length} document types</p>
          {canCreate && (
            <Button onClick={() => setModal({ type: "create" })}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Type
            </Button>
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
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600" onClick={() => setModal({ type: "delete", type_id: type.id })}>
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
            <p className="text-lg font-medium">No document types</p>
            <p className="text-sm mt-1 mb-4">Create your first document type.</p>
            {canCreate && (
              <Button variant="outline" onClick={() => setModal({ type: "create" })}>Create Type</Button>
            )}
          </div>
        )}
      </Card>

      {canCreate && modal?.type === "create" && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Create Document Type">
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
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Modal>
      )}

      {selectedType && modal?.type === "delete" && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Delete Document Type" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Delete Document Type?</h4>
              <p className="mt-2 text-xs text-muted">Deactivate &quot;{selectedType.name}&quot;?</p>
            </div>
            <form action={deleteType}>
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="type_id" value={selectedType.id} />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setModal(null)}>Cancel</Button>
                <Button variant="danger" type="submit">Deactivate</Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
