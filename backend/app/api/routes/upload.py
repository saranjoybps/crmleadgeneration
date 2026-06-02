import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from app.api.utils import response
from app.core.config import get_settings
from app.core.deps import RequestContext, require_module_permission

router = APIRouter(prefix="", tags=["upload"])

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    ctx: RequestContext = Depends(require_module_permission("documents", "create")),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, WebP, and GIF images are allowed")
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB limit")

    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    settings = get_settings()
    upload_dir = Path(settings.uploads_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    (upload_dir / filename).write_bytes(data)

    url = f"/uploads/{filename}"
    return response({"url": url})
