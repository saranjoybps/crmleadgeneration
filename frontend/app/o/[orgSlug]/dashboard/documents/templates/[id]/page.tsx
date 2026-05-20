"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Eye, Code, Plus, Trash2, Copy } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { apiRequest } from "@/lib/api-client";
import type { DocumentTemplate } from "@/lib/types";

type TemplateEditorPageProps = {
  params: Promise<{ orgSlug: string; id: string }>;
};

const SYSTEM_VARIABLES = [
  { key: "employee_name", label: "Employee Name", type: "text" },
  { key: "employee_id", label: "Employee ID", type: "text" },
  { key: "designation", label: "Designation", type: "text" },
  { key: "department", label: "Department", type: "text" },
  { key: "joining_date", label: "Joining Date", type: "date" },
  { key: "salary", label: "Salary", type: "text" },
  { key: "company_name", label: "Company Name", type: "text" },
  { key: "current_date", label: "Current Date", type: "system" },
];

export default function TemplateEditorPage({ params }: TemplateEditorPageProps) {
  const { orgSlug, id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [name, setName] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [content, setContent] = useState("");
  const [variables, setVariables] = useState<Array<{ key: string; label: string; type: string }>>([]);
  const [docTypes, setDocTypes] = useState<Array<{ id: string; name: string; key: string }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      if (!isNew) {
        const [templateRes, typesRes] = await Promise.all([
          apiRequest<DocumentTemplate>(`/api/v1/document-templates/${id}`, { orgSlug }),
          apiRequest<Array<{ id: string; name: string; key: string }>>("/api/v1/document-types", { orgSlug }),
        ]);
        if (templateRes.data) {
          setTemplate(templateRes.data);
          setName(templateRes.data.name);
          setDocumentTypeId(templateRes.data.document_type_id ?? "");
          setContent(templateRes.data.content);
          setVariables(templateRes.data.variables || []);
        }
        if (typesRes.data) setDocTypes(typesRes.data);
      } else {
        const typesRes = await apiRequest<Array<{ id: string; name: string; key: string }>>("/api/v1/document-types", { orgSlug });
        if (typesRes.data) setDocTypes(typesRes.data);
      }
    }
    load();
  }, [id, isNew, orgSlug]);

  const insertVariable = useCallback((varKey: string) => {
    setContent((prev) => prev + `{{${varKey}}}`);
  }, []);

  const addCustomVariable = useCallback(() => {
    const key = `var_${variables.length + 1}`;
    setVariables((prev) => [...prev, { key, label: key.replace(/_/g, " "), type: "text" }]);
  }, [variables.length]);

  const updateVariable = useCallback((index: number, field: string, value: string) => {
    setVariables((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const removeVariable = useCallback((index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const renderPreview = useCallback(() => {
    let html = content;
    const allVars = [...SYSTEM_VARIABLES, ...variables];
    for (const v of allVars) {
      const val = previewData[v.key] || `{{${v.key}}}`;
      html = html.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, "g"), val);
    }
    html = html.replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4; margin: 20mm; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12pt; color: #333; line-height: 1.6; padding: 20px; }
      h1 { font-size: 22pt; color: #1e1b4b; margin-bottom: 8px; }
      h2 { font-size: 16pt; color: #1e1b4b; margin-bottom: 6px; }
      h3 { font-size: 14pt; color: #1e1b4b; margin-bottom: 4px; }
      p { margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
      th { background-color: #f3f0ff; color: #1e1b4b; font-weight: 600; }
      .header { text-align: center; margin-bottom: 24px; }
      .footer { text-align: center; margin-top: 32px; font-size: 9pt; color: #888; }
      .signature { margin-top: 40px; }
      .signature-line { border-top: 1px solid #333; width: 250px; margin-top: 40px; }
    </style></head><body>${html}</body></html>`;
  }, [content, variables, previewData]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (isNew) {
        const res = await apiRequest<DocumentTemplate>("/api/v1/document-templates", {
          method: "POST",
          orgSlug,
          body: { name, document_type_id: documentTypeId || null, content, variables },
        });
        if (res.error) throw new Error(res.error);
        router.push(`/o/${orgSlug}/dashboard/documents/templates`);
      } else {
        const res = await apiRequest<DocumentTemplate>(`/api/v1/document-templates/${id}`, {
          method: "PATCH",
          orgSlug,
          body: { name, content, variables },
        });
        if (res.error) throw new Error(res.error);
        setMessage({ type: "success", text: "Template saved successfully" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  const baseUrl = `/o/${orgSlug}/dashboard/documents/templates`;

  return (
    <div className="h-full flex flex-col" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link href={baseUrl}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template Name"
              className="text-xl font-bold text-main bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-300"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <Code className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
            {showPreview ? "Source" : "Preview"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm mb-4 shrink-0 ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-64 shrink-0 space-y-4 overflow-y-auto">
          <Card className="p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Document Type</h3>
            <select
              value={documentTypeId}
              onChange={(e) => setDocumentTypeId(e.target.value)}
              className="w-full rounded-xl border border-soft bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
            >
              <option value="">No type</option>
              {docTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Variables</h3>
              <button onClick={addCustomVariable} className="text-violet-600 hover:text-violet-800">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System</p>
              {SYSTEM_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-violet-50 text-violet-700 font-mono transition-colors flex items-center gap-1.5"
                >
                  <Copy className="h-3 w-3 shrink-0" />
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
            {variables.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom</p>
                {variables.map((v, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      value={v.key}
                      onChange={(e) => updateVariable(i, "key", e.target.value)}
                      placeholder="key"
                      className="flex-1 rounded-lg border border-soft px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-violet-500"
                    />
                    <button onClick={() => removeVariable(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {showPreview && (
            <Card className="p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Preview Values</h3>
              <div className="space-y-2">
                {[...SYSTEM_VARIABLES, ...variables].map((v) => (
                  <div key={v.key}>
                    <label className="text-[10px] font-medium text-muted">{v.label}</label>
                    <input
                      value={previewData[v.key] || ""}
                      onChange={(e) => setPreviewData((prev) => ({ ...prev, [v.key]: e.target.value }))}
                      placeholder={v.key}
                      className="w-full rounded-lg border border-soft px-2 py-1 text-xs focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {showPreview ? (
            <Card className="h-full overflow-hidden">
              <div className="h-full overflow-y-auto p-6 bg-white">
                <iframe
                  srcDoc={renderPreview()}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </Card>
          ) : (
            <Card className="h-full overflow-hidden">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full resize-none border-0 p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-0"
                placeholder="<h1>Hello {{employee_name}}</h1>
<p>Write your HTML template here...</p>"
                spellCheck={false}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
