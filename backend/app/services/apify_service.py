from typing import Any

import requests

from app.core.config import get_settings


ACTORS: dict[str, str] = {
    "google_maps": "compass~crawler-google-places",
    "instagram": "apify~instagram-profile-scraper",
}


def fetch_from_apify(source: str, *, keywords: str, location: str, leads_count: int) -> list[dict[str, Any]]:
    settings = get_settings()
    actor = ACTORS.get(source)
    if not actor:
        return []
    if not settings.apify_api_token:
        raise RuntimeError("APIFY_API_TOKEN must be configured.")

    url = f"https://api.apify.com/v2/acts/{actor}/run-sync-get-dataset-items"
    params = {"token": settings.apify_api_token}

    payload: dict[str, Any]
    if source == "google_maps":
        payload = {
            "searchStringsArray": [keywords] if keywords else [],
            "locationQuery": location,
            "maxCrawledPlacesPerSearch": leads_count,
        }
    else:
        usernames = [value.strip() for value in keywords.split(",") if value.strip()]
        payload = {
            "usernames": usernames,
            "resultsLimit": leads_count,
        }

    response = requests.post(url, params=params, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict)]
