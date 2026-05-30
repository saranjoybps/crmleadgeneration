from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict


class AssetCreate(BaseModel):
    name: str
    asset_type: Literal["laptop", "id_card", "gift", "other"]
    asset_tag: str
    serial_number: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[Literal["laptop", "id_card", "gift", "other"]] = None
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    status: Optional[Literal["available", "assigned", "maintenance", "retired"]] = None
    notes: Optional[str] = None


class AssetAssignmentCreate(BaseModel):
    asset_id: Optional[str] = None
    user_id: str
    is_own_device: bool = False
    assignment_date: str
    expected_return_date: Optional[str] = None
    notes: Optional[str] = None


class AssetAssignmentUpdate(BaseModel):
    asset_id: Optional[str] = None
    user_id: Optional[str] = None
    is_own_device: Optional[bool] = None
    assignment_date: Optional[str] = None
    expected_return_date: Optional[str] = None
    actual_return_date: Optional[str] = None
    return_condition: Optional[str] = None
    status: Optional[Literal["active", "returned"]] = None
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
