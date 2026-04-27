from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.leads import router as leads_router
from app.core.config import get_settings


settings = get_settings()

app = FastAPI(title="Lead Generation CRM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
