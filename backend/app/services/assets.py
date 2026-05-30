from fastapi import HTTPException
from supabase import Client
from postgrest.exceptions import APIError

from app.core.deps import RequestContext
from app.schemas.assets import AssetCreate, AssetUpdate, AssetAssignmentCreate, AssetAssignmentUpdate


class AssetService:
    @staticmethod
    def list_assets(
        supabase: Client,
        ctx: RequestContext,
        asset_type: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ):
        query = (
            supabase.table("assets")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at", desc=True)
        )
        if asset_type:
            query = query.eq("asset_type", asset_type)
        if status:
            query = query.eq("status", status)
        if search:
            query = query.or_(
                f"name.ilike.%{search}%,asset_tag.ilike.%{search}%,serial_number.ilike.%{search}%"
            )
        try:
            res = query.execute()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch assets: {str(e)}")
        return res.data or []

    @staticmethod
    def get_asset(supabase: Client, asset_id: str, ctx: RequestContext):
        data = (
            supabase.table("assets")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", asset_id)
            .maybe_single()
            .execute()
        )
        if not data.data:
            raise HTTPException(status_code=404, detail="Asset not found")
        return data.data

    @staticmethod
    def create_asset(supabase: Client, payload: AssetCreate, ctx: RequestContext):
        existing = (
            supabase.table("assets")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("asset_tag", payload.asset_tag)
            .maybe_single()
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail=f"Asset tag '{payload.asset_tag}' already exists in this organization")
        try:
            created = (
                supabase.table("assets")
                .insert({
                    "tenant_id": ctx.tenant_id,
                    "name": payload.name,
                    "asset_type": payload.asset_type,
                    "asset_tag": payload.asset_tag,
                    "serial_number": payload.serial_number,
                    "brand": payload.brand,
                    "model": payload.model,
                    "purchase_date": payload.purchase_date,
                    "purchase_price": payload.purchase_price,
                    "notes": payload.notes,
                    "created_by": ctx.app_user_id,
                })
                .execute()
            )
        except APIError as exc:
            raise HTTPException(status_code=400, detail=f"Database error: {exc.message}")
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create asset")
        return row

    @staticmethod
    def update_asset(supabase: Client, asset_id: str, payload: AssetUpdate, ctx: RequestContext):
        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        if "asset_tag" in update_data:
            duplicate = (
                supabase.table("assets")
                .select("id")
                .eq("tenant_id", ctx.tenant_id)
                .eq("asset_tag", update_data["asset_tag"])
                .neq("id", asset_id)
                .maybe_single()
                .execute()
            )
            if duplicate.data:
                raise HTTPException(status_code=409, detail=f"Asset tag '{update_data['asset_tag']}' already exists in this organization")
        try:
            updated = (
                supabase.table("assets")
                .update(update_data)
                .eq("tenant_id", ctx.tenant_id)
                .eq("id", asset_id)
                .execute()
            )
        except APIError as exc:
            raise HTTPException(status_code=400, detail=f"Database error: {exc.message}")
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Asset not found")
        return row

    @staticmethod
    def delete_asset(supabase: Client, asset_id: str, ctx: RequestContext):
        active = (
            supabase.table("asset_assignments")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("asset_id", asset_id)
            .eq("status", "active")
            .maybe_single()
            .execute()
        )
        if active.data:
            raise HTTPException(status_code=400, detail="Cannot delete asset that is currently assigned")
        deleted = (
            supabase.table("assets")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", asset_id)
            .execute()
        )
        row = (deleted.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Asset not found")
        return row

    @staticmethod
    def list_assignments(
        supabase: Client,
        ctx: RequestContext,
        user_id: str | None = None,
        status: str | None = None,
        asset_id: str | None = None,
    ):
        query = (
            supabase.table("asset_assignments")
            .select(
                "*, "
                "asset:assets(id, name, asset_tag, asset_type, serial_number, status), "
                "assigned_to:users!asset_assignments_user_id_fkey(id, email, full_name, avatar_url), "
                "assigned_by_user:users!asset_assignments_assigned_by_fkey(id, email, full_name)"
            )
            .eq("tenant_id", ctx.tenant_id)
            .order("created_at", desc=True)
        )
        if user_id:
            query = query.eq("user_id", user_id)
        if status:
            query = query.eq("status", status)
        if asset_id:
            query = query.eq("asset_id", asset_id)
        try:
            res = query.execute()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch assignments: {str(e)}")
        return res.data or []

    @staticmethod
    def create_assignment(supabase: Client, payload: AssetAssignmentCreate, ctx: RequestContext):
        if payload.asset_id:
            asset = (
                supabase.table("assets")
                .select("id,status")
                .eq("id", payload.asset_id)
                .eq("tenant_id", ctx.tenant_id)
                .maybe_single()
                .execute()
            )
            if not asset.data:
                raise HTTPException(status_code=404, detail="Asset not found")
            if asset.data["status"] != "available":
                raise HTTPException(status_code=400, detail="Asset is not available for assignment")
        try:
            created = (
                supabase.table("asset_assignments")
                .insert({
                    "tenant_id": ctx.tenant_id,
                    "asset_id": payload.asset_id,
                    "user_id": payload.user_id,
                    "assigned_by": ctx.app_user_id,
                    "is_own_device": payload.is_own_device,
                    "assignment_date": payload.assignment_date,
                    "expected_return_date": payload.expected_return_date,
                    "notes": payload.notes,
                })
                .execute()
            )
        except APIError as exc:
            raise HTTPException(status_code=400, detail=f"Database error: {exc.message}")
        row = (created.data or [None])[0]
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create assignment")

        if payload.asset_id:
            supabase.table("assets").update({"status": "assigned"}).eq("id", payload.asset_id).execute()

        return row

    @staticmethod
    def update_assignment(supabase: Client, assignment_id: str, payload: AssetAssignmentUpdate, ctx: RequestContext):
        current = (
            supabase.table("asset_assignments")
            .select("id,asset_id,is_own_device,status")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", assignment_id)
            .maybe_single()
            .execute()
        )
        if not current.data:
            raise HTTPException(status_code=404, detail="Assignment not found")

        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        old_asset_id = current.data.get("asset_id")
        old_is_own_device = current.data.get("is_own_device", False)
        new_asset_id = update_data.get("asset_id")
        new_is_own_device = update_data.get("is_own_device", old_is_own_device)

        has_asset_change = (
            "asset_id" in update_data or "is_own_device" in update_data
        )

        if has_asset_change:
            if old_asset_id and (new_asset_id != old_asset_id or new_is_own_device):
                supabase.table("assets").update({"status": "available"}).eq("id", old_asset_id).execute()

            if new_asset_id:
                if new_asset_id != old_asset_id:
                    asset = (
                        supabase.table("assets")
                        .select("id,status")
                        .eq("id", new_asset_id)
                        .eq("tenant_id", ctx.tenant_id)
                        .maybe_single()
                        .execute()
                    )
                    if not asset.data:
                        raise HTTPException(status_code=404, detail="New asset not found")
                    if asset.data["status"] != "available":
                        raise HTTPException(status_code=400, detail="New asset is not available for assignment")
                supabase.table("assets").update({"status": "assigned"}).eq("id", new_asset_id).execute()

            if new_is_own_device and not update_data.get("is_own_device") == old_is_own_device:
                update_data["asset_id"] = None

        try:
            updated = (
                supabase.table("asset_assignments")
                .update(update_data)
                .eq("tenant_id", ctx.tenant_id)
                .eq("id", assignment_id)
                .execute()
            )
        except APIError as exc:
            raise HTTPException(status_code=400, detail=f"Database error: {exc.message}")
        row = (updated.data or [None])[0]
        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")

        if payload.status == "returned" and row.get("asset_id"):
            supabase.table("assets").update({"status": "available"}).eq("id", row["asset_id"]).execute()

        return row
