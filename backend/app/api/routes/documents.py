from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse, Response

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.documents import (
    AIGenerateRequest,
    DocumentGenerateRequest,
    DocumentTypeCreate,
    DocumentTypeUpdate,
    TemplateCreate,
    TemplateUpdate,
)
from app.services.documents import DocumentsService

router = APIRouter(prefix="", tags=["documents"])


# ---- Document Types ----

@router.get("/document-types")
def list_document_types(
    ctx: RequestContext = Depends(require_module_permission("documents", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    types = DocumentsService.list_document_types(supabase, ctx)
    return response(types)


@router.post("/document-types")
def create_document_type(
    payload: DocumentTypeCreate,
    ctx: RequestContext = Depends(require_module_permission("documents", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    doc_type = DocumentsService.create_document_type(supabase, payload, ctx)
    return response(doc_type)


@router.patch("/document-types/{type_id}")
def update_document_type(
    type_id: str,
    payload: DocumentTypeUpdate,
    ctx: RequestContext = Depends(require_module_permission("documents", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    doc_type = DocumentsService.update_document_type(supabase, type_id, payload, ctx)
    return response(doc_type)


@router.delete("/document-types/{type_id}")
def delete_document_type(
    type_id: str,
    ctx: RequestContext = Depends(require_module_permission("documents", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    doc_type = DocumentsService.delete_document_type(supabase, type_id, ctx)
    return response(doc_type)


# ---- Templates ----

@router.get("/document-templates")
def list_templates(
    document_type_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("documents", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    templates = DocumentsService.list_templates(supabase, ctx, document_type_id=document_type_id, search=search)
    return response(templates)


@router.post("/document-templates")
def create_template(
    payload: TemplateCreate,
    ctx: RequestContext = Depends(require_module_permission("documents", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    template = DocumentsService.create_template(supabase, payload, ctx)
    return response(template)


@router.get("/document-templates/{template_id}")
def get_template(
    template_id: str,
    ctx: RequestContext = Depends(require_module_permission("documents", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    template = DocumentsService.get_template(supabase, template_id, ctx)
    return response(template)


@router.patch("/document-templates/{template_id}")
def update_template(
    template_id: str,
    payload: TemplateUpdate,
    ctx: RequestContext = Depends(require_module_permission("documents", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    template = DocumentsService.update_template(supabase, template_id, payload, ctx)
    return response(template)


@router.delete("/document-templates/{template_id}")
def delete_template(
    template_id: str,
    ctx: RequestContext = Depends(require_module_permission("documents", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    template = DocumentsService.delete_template(supabase, template_id, ctx)
    return response(template)


# ---- Generated Documents ----

@router.get("/documents")
def list_documents(
    search: str | None = Query(default=None),
    document_type_id: str | None = Query(default=None),
    employee_id: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("documents", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    docs = DocumentsService.list_generated_documents(
        supabase, ctx,
        search=search,
        document_type_id=document_type_id,
        employee_id=employee_id,
        date_from=date_from,
        date_to=date_to,
    )
    return response(docs)


@router.post("/documents/preview")
def preview_document(
    payload: DocumentGenerateRequest,
    ctx: RequestContext = Depends(require_module_permission("documents", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    html = DocumentsService.preview_document(supabase, payload, ctx)
    return response({"html": html})


@router.post("/documents/generate")
def generate_document(
    payload: DocumentGenerateRequest,
    ctx: RequestContext = Depends(require_module_permission("documents", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    doc = DocumentsService.generate_document(supabase, payload, ctx)
    return response(doc)


@router.get("/documents/{doc_id}")
def get_document(
    doc_id: str,
    ctx: RequestContext = Depends(require_module_permission("documents", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    doc = DocumentsService.get_generated_document(supabase, doc_id, ctx)
    return response(doc)


@router.get("/documents/{doc_id}/preview")
def preview_document_html(
    doc_id: str,
    ctx: RequestContext = Depends(require_module_permission("documents", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    doc = DocumentsService.get_generated_document(supabase, doc_id, ctx)
    template = DocumentsService.get_template(supabase, str(doc["template_id"]), ctx)
    rendered_html = DocumentsService._render_template(template["content"], doc["content_data"])
    full_html = f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{DocumentsService._get_default_css()}</style></head><body>{rendered_html}</body></html>"
    return HTMLResponse(content=full_html)


@router.get("/documents/{doc_id}/pdf")
async def download_document_pdf(
    doc_id: str,
    ctx: RequestContext = Depends(require_module_permission("documents", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    pdf_buffer, filename = await DocumentsService.download_pdf(supabase, doc_id, ctx)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: str,
    ctx: RequestContext = Depends(require_module_permission("documents", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    doc = DocumentsService.delete_generated_document(supabase, doc_id, ctx)
    return response(doc)


# ---- AI Content Generation ----

@router.post("/documents/ai-generate")
def ai_generate_content(
    payload: AIGenerateRequest,
    ctx: RequestContext = Depends(require_module_permission("documents", "create")),
):
    content = DocumentsService.ai_generate_content(payload)
    return response({"content": content})
