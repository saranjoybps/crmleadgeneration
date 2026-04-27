from fastapi import Header, HTTPException
import requests

from app.core.config import get_settings


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Invalid Authorization header.")
    return token.strip()


def get_authenticated_user_id(authorization: str | None = Header(default=None)) -> str:
    token = _extract_bearer_token(authorization)
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_service_key:
        raise HTTPException(status_code=500, detail="Supabase auth verification is not configured.")

    response = requests.get(
        f"{settings.supabase_url}/auth/v1/user",
        headers={
            "apikey": settings.supabase_service_key,
            "Authorization": f"Bearer {token}",
        },
        timeout=10,
    )

    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Invalid or expired access token.")

    payload = response.json()
    user_id = payload.get("id")
    if not isinstance(user_id, str) or not user_id.strip():
        raise HTTPException(status_code=401, detail="Token does not contain a valid user id.")

    return user_id
