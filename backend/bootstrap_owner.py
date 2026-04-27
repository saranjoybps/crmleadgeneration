from app.core.supabase_client import get_supabase_client


def main() -> None:
    supabase = get_supabase_client()
    response = supabase.rpc(
        "bootstrap_admin_owner",
        {
            "p_email": "admin@joy.com",
            "p_organization_name": "Joy Workspace",
            "p_organization_slug": "joy",
        },
    ).execute()

    if not response.data:
        raise RuntimeError("Bootstrap failed: no organization id returned.")

    organization_id = response.data
    if isinstance(response.data, list):
        organization_id = response.data[0]

    print(f"Bootstrap complete. Organization id: {organization_id}")


if __name__ == "__main__":
    main()
