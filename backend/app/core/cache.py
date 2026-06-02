import json
import logging
from functools import wraps
from typing import Any, Callable, Optional

import requests

from app.core.config import get_settings

logger = logging.getLogger("joyerp.cache")

_client = None


def _get_client() -> Optional[Any]:
    global _client
    settings = get_settings()
    if not settings.upstash_redis_rest_url or not settings.upstash_redis_rest_token:
        return None
    if _client is None:
        class UpstashClient:
            def __init__(self, url: str, token: str):
                self.url = url.rstrip("/")
                self.token = token

            def get(self, key: str) -> Optional[str]:
                try:
                    resp = requests.get(
                        f"{self.url}/get/{key}",
                        headers={"Authorization": f"Bearer {self.token}"},
                        timeout=2,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("result") is not None:
                            return data["result"]
                    return None
                except Exception as e:
                    logger.warning("Redis GET failed for key=%s: %s", key, e)
                    return None

            def set(self, key: str, value: str, ttl: int = 60) -> bool:
                try:
                    resp = requests.post(
                        f"{self.url}/set/{key}",
                        params={"EX": ttl},
                        data=value,
                        headers={"Authorization": f"Bearer {self.token}"},
                        timeout=2,
                    )
                    return resp.status_code == 200
                except Exception as e:
                    logger.warning("Redis SET failed for key=%s: %s", key, e)
                    return False

            def delete(self, key: str) -> bool:
                try:
                    resp = requests.delete(
                        f"{self.url}/del/{key}",
                        headers={"Authorization": f"Bearer {self.token}"},
                        timeout=2,
                    )
                    return resp.status_code == 200
                except Exception as e:
                    logger.warning("Redis DEL failed for key=%s: %s", key, e)
                    return False

            def flush_pattern(self, pattern: str) -> bool:
                try:
                    resp = requests.get(
                        f"{self.url}/keys/{pattern}",
                        headers={"Authorization": f"Bearer {self.token}"},
                        timeout=2,
                    )
                    if resp.status_code == 200:
                        keys = resp.json().get("result", [])
                        for key in keys:
                            self.delete(key)
                    return True
                except Exception as e:
                    logger.warning("Redis FLUSH pattern=%s failed: %s", pattern, e)
                    return False

        _client = UpstashClient(settings.upstash_redis_rest_url, settings.upstash_redis_rest_token)
    return _client


def cache_key(prefix: str, *parts: str) -> str:
    return f"{prefix}:{':'.join(parts)}"


def cached(ttl: int = 60, key_prefix: str = ""):
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            client = _get_client()
            if client is None:
                return func(*args, **kwargs)

            # Build cache key from function name + stringified args
            parts = [func.__name__]
            if key_prefix:
                parts.insert(0, key_prefix)
            for arg in args:
                if hasattr(arg, "__dict__"):
                    for k, v in arg.__dict__.items():
                        if k in ("access_token",):
                            continue
                        parts.append(f"{k}={v}")
                elif arg is not None:
                    parts.append(str(arg))
            for k, v in sorted(kwargs.items()):
                if k in ("access_token",):
                    continue
                parts.append(f"{k}={v}")

            key = cache_key("joy", *parts)
            try:
                cached_data = client.get(key)
                if cached_data is not None:
                    return json.loads(cached_data)
            except Exception:
                pass

            result = func(*args, **kwargs)
            if result is not None:
                try:
                    client.set(key, json.dumps(result, default=str), ttl=ttl)
                except Exception:
                    pass
            return result
        return wrapper
    return decorator


def invalidate_pattern(pattern: str):
    client = _get_client()
    if client is not None:
        client.flush_pattern(pattern)
