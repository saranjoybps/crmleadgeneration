"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Wand2, Download, Eye, Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { apiRequest } from "@/lib/api-client";
import type { DocumentTemplate, DocumentType, User } from "@/lib/types";

type GeneratePageProps = {
  params: Promise<{ orgSlug: string }>;
};

const SYSTEM_VARIABLES = [
  { key: "employee_name", label: "Employee Name", type: "text" },
  { key: "employee_id", label: "Employee ID", type: "text" },
  { key: "designation", label: "Designation", type: "text" },
  { key: "department", label: "Department", type: "text" },
  { key: "joining_date", label: "Joining Date", type: "date" },
  { key: "salary", label: "Salary", type: "text" },
  { key: "company_name", label: "Company Name", type: "text" },
  { key: "company_logo_url", label: "Company Logo URL", type: "text" },
  { key: "signature_url", label: "Signature Image URL", type: "text" },
  { key: "watermark_text", label: "Watermark Text", type: "text" },
];

export default function GenerateDocumentPage({ params }: GeneratePageProps) {
  const { orgSlug } = use(params);
  const router = useRouter();

  const [permLoaded, setPermLoaded] = useState(false);
  const [permDenied, setPermDenied] = useState(false);

  useEffect(() => {
    apiRequest<{ modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean } }> }>(
      "/api/v1/auth/permissions", { orgSlug }
    ).then((res) => {
      const docPerm = res.data?.modules.find((m) => m.key === "documents")?.permissions;
      if (!docPerm?.can_view || !docPerm?.can_create) {
        setPermDenied(true);
      }
      setPermLoaded(true);
    });
  }, [orgSlug]);

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [title, setTitle] = useState("");
  const [contentData, setContentData] = useState<Record<string, string>>({});
  const [customVars, setCustomVars] = useState<Array<{ key: string; label: string; type: string }>>([]);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [generatedDocId, setGeneratedDocId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const handleUpload = async (field: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(field);
      try {
        const { headers } = await import("@/lib/api-client").then(m => m.getApiContext(orgSlug));
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/upload`, {
          method: "POST",
          headers: { "Authorization": headers["Authorization"] || "", "X-Org-Slug": orgSlug },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Upload failed");
        setContentData((prev) => ({ ...prev, [field]: data.data?.url || "" }));
      } catch (err) {
        setMessage({ type: "error", text: err instanceof Error ? err.message : "Upload failed" });
      } finally {
        setUploading(null);
      }
    };
    input.click();
  };

  useEffect(() => {
    async function load() {
      const [templatesRes, typesRes, employeesRes] = await Promise.all([
        apiRequest<DocumentTemplate[]>("/api/v1/document-templates", { orgSlug }),
        apiRequest<DocumentType[]>("/api/v1/document-types", { orgSlug }),
        apiRequest<Array<User & { full_name: string }>>("/api/v1/users", { orgSlug }),
      ]);
      if (templatesRes.data) setTemplates(templatesRes.data);
      if (typesRes.data) setDocTypes(typesRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
    }
    load();
  }, [orgSlug]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const allVars = [...SYSTEM_VARIABLES, ...(selectedTemplate?.variables || []), ...customVars];

  useEffect(() => {
    if (selectedTemplate?.variables) {
      setCustomVars(selectedTemplate.variables as typeof customVars);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    if (employeeId) {
      const emp = employees.find((e) => e.id === employeeId);
      if (emp) {
        setContentData((prev) => ({
          ...prev,
          employee_name: emp.full_name || emp.email || "",
          employee_id: emp.id,
        }));
      }
    }
  }, [employeeId, employees]);

  const handleGenerate = async () => {
    if (!selectedTemplateId || !employeeId || !title) return;
    setGenerating(true);
    setMessage(null);
    try {
      const res = await apiRequest<any>("/api/v1/documents/generate", {
        method: "POST",
        orgSlug,
        body: { template_id: selectedTemplateId, employee_id: employeeId, title, content_data: contentData },
      });
      if (res.error) throw new Error(res.error);
      setGeneratedDocId(res.data?.id ?? null);
      setPreviewHtml(res.data?.rendered_html ?? null);
      setMessage({ type: "success", text: "Document generated successfully" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to generate" });
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplateId || !employeeId) return;
    setMessage(null);
    try {
      const res = await apiRequest<{ html: string }>("/api/v1/documents/preview", {
        method: "POST",
        orgSlug,
        body: { template_id: selectedTemplateId, employee_id: employeeId, title: title || "Preview", content_data: contentData },
      });
      if (res.error) throw new Error(res.error);
      setPreviewHtml(res.data?.html ?? null);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to preview" });
    }
  };

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    setMessage(null);
    try {
      const docType = docTypes.find((t) => t.id === selectedTemplate?.document_type_id);
      const res = await apiRequest<{ content: string }>("/api/v1/documents/ai-generate", {
        method: "POST",
        orgSlug,
        body: {
          document_type_key: docType?.key || "general",
          employee_name: contentData.employee_name || "",
          employee_id: contentData.employee_id || "",
          designation: contentData.designation || "",
          department: contentData.department || "",
          joining_date: contentData.joining_date || "",
          salary: contentData.salary || "",
          company_name: contentData.company_name || "",
        },
      });
      if (res.error) throw new Error(res.error);
      const match = res.data?.content?.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (match) {
        setPreviewHtml(match[1]);
      } else {
        setPreviewHtml(res.data?.content ?? null);
      }
      setMessage({ type: "success", text: "AI content generated. Review and save as needed." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "AI generation failed" });
    } finally {
      setAiGenerating(false);
    }
  };

  const baseUrl = `/o/${orgSlug}/dashboard/documents`;

  if (!permLoaded) {
    return <div className="flex items-center justify-center h-64 text-muted"><p>Loading...</p></div>;
  }

  if (permDenied) {
    return <div className="flex items-center justify-center h-64 text-muted"><p>You do not have permission to generate documents.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={baseUrl}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-main">Generate Document</h1>
            <p className="text-sm text-muted mt-1">Fill in the details and generate a professional document</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Document Details</h2>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Document Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Offer Letter - John Doe"
                className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => { setSelectedTemplateId(e.target.value); setPreviewHtml(null); setGeneratedDocId(null); }}
                className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Employee</label>
              <select
                value={employeeId}
                onChange={(e) => { setEmployeeId(e.target.value); setPreviewHtml(null); setGeneratedDocId(null); }}
                className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select employee...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name || e.email}</option>
                ))}
              </select>
            </div>
          </Card>

          {selectedTemplate && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Variables</h2>
                <Button variant="ghost" size="sm" onClick={handleAIGenerate} disabled={aiGenerating}>
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                  {aiGenerating ? "AI..." : "AI Generate"}
                </Button>
              </div>
              {allVars.map((v) => (
                <div key={v.key} className="space-y-1">
                  <label className="text-xs font-medium text-muted">{v.label}</label>
                  <div className="flex gap-2">
                    {v.key === "company_logo_url" || v.key === "signature_url" ? (
                      <>
                        <input
                          value={contentData[v.key] || ""}
                          onChange={(e) => setContentData((prev) => ({ ...prev, [v.key]: e.target.value }))}
                          placeholder={`{{${v.key}}}`}
                          className="flex-1 rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-violet-500"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpload(v.key)}
                          disabled={uploading === v.key}
                          className="shrink-0"
                        >
                          <Upload className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : v.type === "date" ? (
                      <input
                        type="date"
                        value={contentData[v.key] || ""}
                        onChange={(e) => setContentData((prev) => ({ ...prev, [v.key]: e.target.value }))}
                        className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
                      />
                    ) : (
                      <input
                        value={contentData[v.key] || ""}
                        onChange={(e) => setContentData((prev) => ({ ...prev, [v.key]: e.target.value }))}
                        placeholder={`{{${v.key}}}`}
                        className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-violet-500"
                      />
                    )}
                  </div>
                  {v.key === "watermark_text" && (
                    <p className="text-[10px] text-muted">Appears diagonally in the PDF background</p>
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={handlePreview} variant="outline" disabled={!selectedTemplateId || !employeeId}>
                  <Eye className="h-4 w-4 mr-1.5" />
                  Preview
                </Button>
                <Button onClick={handleGenerate} disabled={!selectedTemplateId || !employeeId || !title || generating}>
                  <FileText className="h-4 w-4 mr-1.5" />
                  {generating ? "Generating..." : "Generate"}
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full overflow-hidden">
            {previewHtml ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-soft bg-slate-50">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Preview</span>
                  <div className="flex gap-1">
                    {generatedDocId && (
                      <a href={`/api/documents/${orgSlug}/${generatedDocId}/pdf`}>
                        <Button size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download PDF
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
                      @page { size: A4; margin: 20mm; }
                      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12pt; color: #333; line-height: 1.6; }
                      h1 { font-size: 22pt; color: #1e1b4b; margin-bottom: 8px; }
                      h2 { font-size: 16pt; color: #1e1b4b; margin-bottom: 6px; }
                      p { margin-bottom: 8px; }
                      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
                      th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
                      th { background-color: #f3f0ff; color: #1e1b4b; font-weight: 600; }
                      .header { text-align: center; margin-bottom: 24px; }
                      .footer { text-align: center; margin-top: 32px; font-size: 9pt; color: #888; border-top: 1px solid #ddd; padding-top: 12px; }
                      .signature { margin-top: 40px; }
                      .signature-line { border-top: 1px solid #333; width: 250px; margin-top: 40px; }
                    </style></head><body>${previewHtml}</body></html>`}
                    className="w-full h-full border-0"
                    title="Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted py-16">
                <FileText className="h-12 w-12 mb-4 text-slate-300" />
                <p className="text-lg font-medium">Select a template and fill in the details</p>
                <p className="text-sm mt-1">The document preview will appear here</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
