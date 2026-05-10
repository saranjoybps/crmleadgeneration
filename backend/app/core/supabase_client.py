from supabase import Client, create_client

from app.core.config import get_settings


def get_supabase_client(access_token: str | None = None) -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured.")
    client = create_client(settings.supabase_url, settings.supabase_service_key)
    if access_token:
        # Run PostgREST/RPC calls in caller's auth context so auth.uid() is available.
        client.postgrest.auth(token=access_token)
    return client
