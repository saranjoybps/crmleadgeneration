import re
from datetime import date, datetime, timezone
from io import BytesIO

from fastapi import HTTPException
from supabase import Client
from playwright.sync_api import sync_playwright

from app.core.config import get_settings
from app.core.deps import RequestContext
from app.schemas.documents import (
    AIGenerateRequest,
    DocumentGenerateRequest,
    DocumentTypeCreate,
    DocumentTypeUpdate,
    TemplateCreate,
    TemplateUpdate,
)


class DocumentsService:
    @staticmethod
    def _render_template(content: str, content_data: dict) -> str:
        rendered = content
        for key, value in content_data.items():
            rendered = rendered.replace("{{" + key + "}}", str(value) if value is not None else "")
        rendered = rendered.replace("{{current_date}}", date.today().strftime("%B %d, %Y"))
        return rendered

    @staticmethod
    def _get_default_css() -> str:
        return """
        @page { size: A4; margin: 20mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12pt; color: #333; line-height: 1.6; }
        h1 { font-size: 22pt; color: #1e1b4b; margin-bottom: 8px; }
        h2 { font-size: 16pt; color: #1e1b4b; margin-bottom: 6px; }
        h3 { font-size: 14pt; color: #1e1b4b; margin-bottom: 4px; }
        p { margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background-color: #f3f0ff; color: #1e1b4b; font-weight: 600; }
        .header { text-align: center; margin-bottom: 24px; }
        .footer { text-align: center; margin-top: 32px; font-size: 9pt; color: #888; border-top: 1px solid #ddd; padding-top: 12px; }
        .signature { margin-top: 40px; }
        .signature-line { border-top: 1px solid #333; width: 250px; margin-top: 40px; }
        .page-break { page-break-before: always; }
        """

    # ---- Document Types ----

    @staticmethod
    def list_document_types(supabase: Client, ctx: RequestContext):
        res = (
            supabase.table("document_types")
            .select("*")
            .or_("tenant_id.is.null,tenant_id.eq." + ctx.tenant_id)
            .order("name")
            .execute()
        )
        return res.data or []

    @staticmethod
    def create_document_type(supabase: Client, payload: DocumentTypeCreate, ctx: RequestContext):
        created = (
            supabase.table("document_types")
            .insert({
                "tenant_id": ctx.tenant_id,
                "name": payload.name,
                "key": payload.key,
                "description": payload.description,
            })
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create document type")
        return row

    @staticmethod
    def update_document_type(supabase: Client, type_id: str, payload: DocumentTypeUpdate, ctx: RequestContext):
        update_data = payload.model_dump(exclude_unset=True)
        updated = (
            supabase.table("document_types")
            .update(update_data)
            .eq("id", type_id)
            .eq("tenant_id", ctx.tenant_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Document type not found")
        return row

    @staticmethod
    def delete_document_type(supabase: Client, type_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("document_types")
            .update({"is_active": False})
            .eq("id", type_id)
            .eq("tenant_id", ctx.tenant_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Document type not found")
        return row

    # ---- Templates ----

    @staticmethod
    def list_templates(supabase: Client, ctx: RequestContext, document_type_id: str | None = None, search: str | None = None):
        query = (
            supabase.table("document_templates")
            .select("*, document_type:document_type_id(id, name, key)")
            .eq("tenant_id", ctx.tenant_id)
            .order("updated_at", desc=True)
        )
        if document_type_id:
            query = query.eq("document_type_id", document_type_id)
        if search:
            query = query.ilike("name", f"%{search}%")
        res = query.execute()
        return res.data or []

    @staticmethod
    def create_template(supabase: Client, payload: TemplateCreate, ctx: RequestContext):
        created = (
            supabase.table("document_templates")
            .insert({
                "tenant_id": ctx.tenant_id,
                "name": payload.name,
                "document_type_id": payload.document_type_id,
                "content": payload.content,
                "variables": payload.variables or [],
                "created_by": ctx.app_user_id,
            })
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create template")
        return row

    @staticmethod
    def get_template(supabase: Client, template_id: str, ctx: RequestContext):
        res = (
            supabase.table("document_templates")
            .select("*, document_type:document_type_id(id, name, key)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", template_id)
            .execute()
        )
        row = (res.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Template not found")
        return row

    @staticmethod
    def update_template(supabase: Client, template_id: str, payload: TemplateUpdate, ctx: RequestContext):
        update_data = payload.model_dump(exclude_unset=True)
        updated = (
            supabase.table("document_templates")
            .update(update_data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", template_id)
            .execute()
        )
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Template not found")
        return row

    @staticmethod
    def delete_template(supabase: Client, template_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("document_templates")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", template_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Template not found")
        return row

    # ---- Generated Documents ----

    @staticmethod
    def list_generated_documents(
        supabase: Client,
        ctx: RequestContext,
        search: str | None = None,
        document_type_id: str | None = None,
        employee_id: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ):
        query = (
            supabase.table("generated_documents")
            .select("*, template:template_id(id, name), document_type:document_type_id(id, name), employee:employee_id(id, full_name, email), generated_by_user:generated_by(id, full_name, email)")
            .eq("tenant_id", ctx.tenant_id)
            .order("generated_at", desc=True)
        )
        if document_type_id:
            query = query.eq("document_type_id", document_type_id)
        if employee_id:
            query = query.eq("employee_id", employee_id)
        if date_from:
            query = query.gte("generated_at", date_from)
        if date_to:
            query = query.lte("generated_at", date_to)
        if search:
            query = query.ilike("title", f"%{search}%")
        res = query.execute()
        return res.data or []

    @staticmethod
    def get_generated_document(supabase: Client, doc_id: str, ctx: RequestContext):
        res = (
            supabase.table("generated_documents")
            .select("*, template:template_id(id, name, content, variables), document_type:document_type_id(id, name), employee:employee_id(id, full_name, email), generated_by_user:generated_by(id, full_name, email)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", doc_id)
            .execute()
        )
        row = (res.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        return row

    @staticmethod
    def generate_document(supabase: Client, payload: DocumentGenerateRequest, ctx: RequestContext):
        template = DocumentsService.get_template(supabase, payload.template_id, ctx)
        rendered_html = DocumentsService._render_template(template["content"], payload.content_data)
        full_html = f"<!DOCTYPE html><html><head><style>{DocumentsService._get_default_css()}</style></head><body>{rendered_html}</body></html>"
        created = (
            supabase.table("generated_documents")
            .insert({
                "tenant_id": ctx.tenant_id,
                "template_id": payload.template_id,
                "document_type_id": template.get("document_type_id"),
                "employee_id": payload.employee_id,
                "title": payload.title,
                "content_data": payload.content_data,
                "generated_by": ctx.app_user_id,
            })
            .execute()
        )
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to save generated document")
        return {**row, "rendered_html": full_html}

    @staticmethod
    def preview_document(supabase: Client, payload: DocumentGenerateRequest, ctx: RequestContext):
        template = DocumentsService.get_template(supabase, payload.template_id, ctx)
        rendered_html = DocumentsService._render_template(template["content"], payload.content_data)
        full_html = f"<!DOCTYPE html><html><head><style>{DocumentsService._get_default_css()}</style></head><body>{rendered_html}</body></html>"
        return full_html

    @staticmethod
    def download_pdf(supabase: Client, doc_id: str, ctx: RequestContext):
        doc = DocumentsService.get_generated_document(supabase, doc_id, ctx)
        template = DocumentsService.get_template(supabase, str(doc["template_id"]), ctx)
        rendered_html = DocumentsService._render_template(template["content"], doc["content_data"])
        full_html = f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{DocumentsService._get_default_css()}</style></head><body>{rendered_html}</body></html>"
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.set_content(full_html, wait_until="networkidle")
            pdf_bytes = page.pdf(format='A4', margin={'top': '20mm', 'bottom': '20mm', 'left': '20mm', 'right': '20mm'})
            browser.close()
        return BytesIO(pdf_bytes), f"{doc['title']}.pdf"

    @staticmethod
    def delete_generated_document(supabase: Client, doc_id: str, ctx: RequestContext):
        deleted = (
            supabase.table("generated_documents")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", doc_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Generated document not found")
        return row

    # ---- AI Content Generation ----

    @staticmethod
    def ai_generate_content(payload: AIGenerateRequest):
        settings = get_settings()
        if not settings.openai_api_key:
            raise HTTPException(status_code=501, detail="AI content generation is not configured. Set OPENAI_API_KEY in your environment.")

        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        doc_type_label = payload.document_type_key.replace("_", " ").title()
        system_prompt = f"You are a professional HR document writer. Generate a {doc_type_label} in HTML format."
        user_prompt = f"""
Generate a professional {doc_type_label} with the following details:
- Employee Name: {payload.employee_name}
- Employee ID: {payload.employee_id or 'N/A'}
- Designation: {payload.designation or 'N/A'}
- Department: {payload.department or 'N/A'}
- Joining Date: {payload.joining_date or 'N/A'}
- Salary: {payload.salary or 'N/A'}
- Company Name: {payload.company_name or '[Company Name]'}
- Date: {date.today().strftime('%B %d, %Y')}

Additional Context: {payload.additional_context or 'N/A'}

Return ONLY valid HTML content (no markdown, no code fences). Use proper HTML tags: h1, h2, p, table, etc.
Include a signature area at the bottom. Use inline styles for professional formatting.
"""
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
        )
        content = response.choices[0].message.content or ""
        content = re.sub(r"^```(?:html)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
        return content.strip()
