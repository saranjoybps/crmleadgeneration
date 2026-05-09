from uuid import uuid4


def response(data, meta=None, error=None):
    return {
        "data": data,
        "meta": meta,
        "error": error,
        "trace_id": str(uuid4()),
    }
