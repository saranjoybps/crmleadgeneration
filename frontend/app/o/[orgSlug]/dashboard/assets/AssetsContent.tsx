"use client";

import React, { useState, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  Monitor,
  CreditCard,
  Gift,
  Box,
  AlertCircle,
  CheckCircle2,
  Undo2,
  Pencil,
} from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { Asset, AssetAssignment, AssetType, AssetStatus, AssignmentStatus, User as UserType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createAsset, updateAsset, deleteAsset, issueAsset, updateAssignment, returnAsset } from "./actions";

type Props = {
  orgSlug: string;
  currentUserId: string;
  assetsPerm: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
  assets: Asset[];
  assignments: AssetAssignment[];
  users: UserType[];
};

const TYPE_ICONS: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  laptop: Monitor,
  id_card: CreditCard,
  gift: Gift,
  other: Box,
};

const TYPE_COLORS: Record<AssetType, string> = {
  laptop: "bg-violet-100 text-violet-700",
  id_card: "bg-sky-100 text-sky-700",
  gift: "bg-pink-100 text-pink-700",
  other: "bg-slate-100 text-slate-700",
};

const STATUS_BADGE: Record<AssetStatus, { variant: "success" | "warning" | "danger" | "default"; label: string }> = {
  available: { variant: "success", label: "Available" },
  assigned: { variant: "warning", label: "Assigned" },
  maintenance: { variant: "danger", label: "Maintenance" },
  retired: { variant: "default", label: "Retired" },
};

type Tab = "assets" | "assignments" | "my-assets";

export default function AssetsContent({ orgSlug, currentUserId, assetsPerm, assets, assignments, users }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("assets");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [assignStatusFilter, setAssignStatusFilter] = useState<string>("");
  const [assignUserFilter, setAssignUserFilter] = useState<string>("");

  // Modal state
  const [showCreateAsset, setShowCreateAsset] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);
  const [showIssueAsset, setShowIssueAsset] = useState(false);
  const [returnAssignmentId, setReturnAssignmentId] = useState<string | null>(null);
  const [editAssignment, setEditAssignment] = useState<AssetAssignment | null>(null);

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.asset_tag.toLowerCase().includes(search.toLowerCase()) && !(a.serial_number ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter && a.asset_type !== typeFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      return true;
    });
  }, [assets, search, typeFilter, statusFilter]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (assignStatusFilter && a.status !== assignStatusFilter) return false;
      if (assignUserFilter && a.user_id !== assignUserFilter) return false;
      return true;
    });
  }, [assignments, assignStatusFilter, assignUserFilter]);

  const typeOptions: AssetType[] = ["laptop", "id_card", "gift", "other"];
  const statusOptions: AssetStatus[] = ["available", "assigned", "maintenance", "retired"];

  function formatDate(d: string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" });
  }

  function getUserName(userId: string) {
    const u = users.find((u) => u.id === userId);
    return u?.full_name || u?.email || userId.slice(0, 8);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "assets", label: "All Assets" },
    { key: "assignments", label: "Assignments" },
    { key: "my-assets", label: "My Assets" },
  ];

  const availableAssets = assets.filter((a) => a.status === "available");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-violet-600 uppercase tracking-widest mb-1">
            <Package className="h-4 w-4" />
            Assets
          </div>
          <h1 className="text-3xl font-black tracking-tight text-main">Asset Management</h1>
          <p className="mt-1 text-muted font-medium">Track laptops, ID cards, gifts, and other organization assets.</p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-main">{assets.length}</p>
            <p className="text-[11px] font-semibold text-muted">Total Assets</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-main">{assets.filter((a) => a.status === "available").length}</p>
            <p className="text-[11px] font-semibold text-muted">Available</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Monitor className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-main">{assignments.filter((a) => a.status === "active").length}</p>
            <p className="text-[11px] font-semibold text-muted">Active Assignments</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-main">{assets.filter((a) => a.status === "maintenance").length}</p>
            <p className="text-[11px] font-semibold text-muted">In Maintenance</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/50">
        <div className="flex border-b border-soft">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-5 py-3.5 text-sm font-bold transition-all border-b-2",
                activeTab === tab.key
                  ? "text-violet-600 border-violet-600"
                  : "text-muted border-transparent hover:text-main hover:border-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ======= ALL ASSETS TAB ======= */}
          {activeTab === "assets" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      placeholder="Search assets..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-xl border border-soft bg-white pl-9 pr-4 py-2.5 text-sm font-medium text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-xl border border-soft bg-white px-3 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">All Types</option>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-soft bg-white px-3 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">All Status</option>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                {assetsPerm.can_create && (
                  <Button onClick={() => setShowCreateAsset(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Asset
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-soft">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Asset Tag</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Name</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Type</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Serial</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Status</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft">
                    {filteredAssets.map((asset) => {
                      const TypeIcon = TYPE_ICONS[asset.asset_type];
                      const statusInfo = STATUS_BADGE[asset.status];
                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs font-bold text-main">{asset.asset_tag}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0", TYPE_COLORS[asset.asset_type])}>
                                <TypeIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-bold text-main">{asset.name}</p>
                                {(asset.brand || asset.model) && (
                                  <p className="text-[11px] text-muted">{[asset.brand, asset.model].filter(Boolean).join(" ")}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline" className="text-[9px] uppercase">{asset.asset_type.replace("_", " ")}</Badge>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-muted">{asset.serial_number || "—"}</td>
                          <td className="px-4 py-3.5">
                            <Badge variant={statusInfo.variant} className="text-[9px]">{statusInfo.label}</Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              {assetsPerm.can_edit && (
                                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditAsset(asset)}>Edit</Button>
                              )}
                              {assetsPerm.can_delete && asset.status !== "assigned" && (
                                <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700" onClick={() => setDeleteAssetId(asset.id)}>Delete</Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredAssets.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                          <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          {search || typeFilter || statusFilter ? "No assets match your filters." : "No assets yet. Add your first asset!"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======= ASSIGNMENTS TAB ======= */}
          {activeTab === "assignments" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <select
                    value={assignStatusFilter}
                    onChange={(e) => setAssignStatusFilter(e.target.value)}
                    className="rounded-xl border border-soft bg-white px-3 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="returned">Returned</option>
                  </select>
                  <select
                    value={assignUserFilter}
                    onChange={(e) => setAssignUserFilter(e.target.value)}
                    className="rounded-xl border border-soft bg-white px-3 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">All Users</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                    ))}
                  </select>
                </div>
                {assetsPerm.can_create && (
                  <Button onClick={() => setShowIssueAsset(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Issue Asset
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-soft">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Asset</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Assigned To</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Issued By</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Issued</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Expected Return</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Status</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft">
                    {filteredAssignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0", a.is_own_device ? "bg-emerald-100 text-emerald-700" : TYPE_COLORS[a.asset?.asset_type ?? "other"])}>
                              {a.is_own_device ? <Monitor className="h-4 w-4" /> : React.createElement(TYPE_ICONS[a.asset?.asset_type ?? "other"], { className: "h-4 w-4" })}
                            </div>
                            <div>
                              <p className="font-bold text-main text-xs">
                                {a.is_own_device ? "Own Device (Laptop)" : (a.asset?.name || "Unknown Asset")}
                              </p>
                              {!a.is_own_device && a.asset && (
                                <p className="text-[10px] text-muted font-mono">{a.asset.asset_tag}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-main shrink-0">
                              {a.assigned_to?.full_name?.[0] || a.assigned_to?.email?.[0] || "?"}
                            </div>
                            <span className="font-semibold text-main text-xs">{a.assigned_to?.full_name || a.assigned_to?.email || getUserName(a.user_id)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted">{a.assigned_by_user?.full_name || getUserName(a.assigned_by)}</td>
                        <td className="px-4 py-3.5 text-xs text-muted">{formatDate(a.assignment_date)}</td>
                        <td className="px-4 py-3.5 text-xs text-muted">{formatDate(a.expected_return_date)}</td>
                        <td className="px-4 py-3.5">
                          {a.status === "active" ? (
                            <Badge variant="warning" className="text-[9px]">Active</Badge>
                          ) : (
                            <Badge variant="success" className="text-[9px]">Returned</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {assetsPerm.can_edit && (
                              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditAssignment(a)}>
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            )}
                            {a.status === "active" && assetsPerm.can_edit && (
                              <Button variant="secondary" size="sm" className="text-xs" onClick={() => setReturnAssignmentId(a.id)}>
                                <Undo2 className="h-3 w-3 mr-1" />
                                Return
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAssignments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">
                          <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No assignments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======= MY ASSETS TAB ======= */}
          {activeTab === "my-assets" && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted">Assets currently assigned to you.</p>
              {(() => {
                const myAssignments = assignments.filter((a) => a.user_id === currentUserId && a.status === "active");
                if (myAssignments.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-48 border-2 border-dashed border-soft rounded-3xl text-[11px] font-medium text-slate-400 bg-slate-50/50">
                      <div className="text-center">
                        <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p>No assets assigned to you.</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="grid gap-4 md:grid-cols-2">
                    {myAssignments.map((a) => (
                      <Card key={a.id} className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", a.is_own_device ? "bg-emerald-100 text-emerald-700" : TYPE_COLORS[a.asset?.asset_type ?? "other"])}>
                            {a.is_own_device ? <Monitor className="h-6 w-6" /> : React.createElement(TYPE_ICONS[a.asset?.asset_type ?? "other"], { className: "h-6 w-6" })}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-main">
                              {a.is_own_device ? "Own Device (Laptop)" : a.asset?.name}
                            </h3>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted">
                                <span className="font-semibold">Type:</span>
                                <Badge variant="outline" className="text-[9px] uppercase">{a.asset?.asset_type || "laptop"}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted">
                                <span className="font-semibold">Issued:</span> {formatDate(a.assignment_date)}
                              </div>
                              {a.expected_return_date && (
                                <div className="flex items-center gap-2 text-xs text-muted">
                                  <span className="font-semibold">Expected Return:</span> {formatDate(a.expected_return_date)}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="warning" className="text-[9px] shrink-0">Active</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </Card>

      {/* ======= MODALS ======= */}

      {/* Create Asset Modal */}
      <Modal isOpen={showCreateAsset} onClose={() => setShowCreateAsset(false)} title="Add Asset">
        <form action={createAsset} className="space-y-4">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Name *</label>
              <input name="name" required className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g. Dell Latitude 5420" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Asset Tag *</label>
              <input name="asset_tag" required className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g. AST-001" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Type *</label>
              <select name="asset_type" required className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500">
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Serial Number</label>
              <input name="serial_number" className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g. SN-12345" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Brand</label>
              <input name="brand" className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g. Dell" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Model</label>
              <input name="model" className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g. Latitude 5420" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Purchase Date</label>
              <input name="purchase_date" type="date" className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Purchase Price</label>
              <input name="purchase_price" type="number" step="0.01" className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g. 1200.00" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Notes</label>
            <textarea name="notes" rows={2} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreateAsset(false)}>Cancel</Button>
            <Button type="submit">Create Asset</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Asset Modal */}
      <Modal isOpen={!!editAsset} onClose={() => setEditAsset(null)} title="Edit Asset">
        <form action={updateAsset} className="space-y-4">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <input type="hidden" name="asset_id" value={editAsset?.id ?? ""} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Name</label>
              <input name="name" defaultValue={editAsset?.name ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Asset Tag</label>
              <input name="asset_tag" defaultValue={editAsset?.asset_tag ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Type</label>
              <select name="asset_type" defaultValue={editAsset?.asset_type ?? "other"} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500">
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Status</label>
              <select name="status" defaultValue={editAsset?.status ?? "available"} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500">
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Serial Number</label>
              <input name="serial_number" defaultValue={editAsset?.serial_number ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Brand</label>
              <input name="brand" defaultValue={editAsset?.brand ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Model</label>
              <input name="model" defaultValue={editAsset?.model ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Purchase Date</label>
              <input name="purchase_date" type="date" defaultValue={editAsset?.purchase_date ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Purchase Price</label>
              <input name="purchase_price" type="number" step="0.01" defaultValue={editAsset?.purchase_price ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Notes</label>
            <textarea name="notes" rows={2} defaultValue={editAsset?.notes ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setEditAsset(null)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Asset Modal */}
      <Modal isOpen={!!deleteAssetId} onClose={() => setDeleteAssetId(null)} title="Delete Asset" size="sm">
        <form action={deleteAsset} className="space-y-4">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <input type="hidden" name="asset_id" value={deleteAssetId ?? ""} />
          <p className="text-sm text-muted">Are you sure you want to delete this asset? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setDeleteAssetId(null)}>Cancel</Button>
            <Button variant="danger" type="submit">Delete</Button>
          </div>
        </form>
      </Modal>

      {/* Issue Asset Modal */}
      <Modal isOpen={showIssueAsset} onClose={() => setShowIssueAsset(false)} title="Issue Asset">
        <form action={issueAsset} className="space-y-4">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Assign To *</label>
            <select name="user_id" required className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Select user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Asset (leave empty for own device)</label>
            <select name="asset_id" className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">— Select physical asset —</option>
              {availableAssets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_own_device" id="is_own_device" value="true" className="rounded border-soft text-violet-600 focus:ring-violet-500" />
            <label htmlFor="is_own_device" className="text-sm font-medium text-main">Own device (employee uses personal laptop)</label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Assignment Date *</label>
              <input name="assignment_date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Expected Return Date</label>
              <input name="expected_return_date" type="date" className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Notes</label>
            <textarea name="notes" rows={2} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Reason for assignment, condition notes, etc." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowIssueAsset(false)}>Cancel</Button>
            <Button type="submit">Issue Asset</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal isOpen={!!editAssignment} onClose={() => setEditAssignment(null)} title="Edit Assignment">
        <form action={updateAssignment} className="space-y-4">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <input type="hidden" name="assignment_id" value={editAssignment?.id ?? ""} />
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Asset</label>
            <select name="asset_id" defaultValue={editAssignment?.asset_id ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">— Select physical asset —</option>
              {assets.filter((a) => a.status === "available" || a.id === editAssignment?.asset_id).map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_own_device" id="edit_is_own_device" value="true" defaultChecked={editAssignment?.is_own_device ?? false} className="rounded border-soft text-violet-600 focus:ring-violet-500" />
            <label htmlFor="edit_is_own_device" className="text-sm font-medium text-main">Own device (employee uses personal laptop)</label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Assignment Date</label>
              <input name="assignment_date" type="date" defaultValue={editAssignment?.assignment_date ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Expected Return Date</label>
              <input name="expected_return_date" type="date" defaultValue={editAssignment?.expected_return_date ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Notes</label>
            <textarea name="notes" rows={2} defaultValue={editAssignment?.notes ?? ""} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setEditAssignment(null)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Return Asset Modal */}
      <Modal isOpen={!!returnAssignmentId} onClose={() => setReturnAssignmentId(null)} title="Return Asset" size="sm">
        <form action={returnAsset} className="space-y-4">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <input type="hidden" name="assignment_id" value={returnAssignmentId ?? ""} />
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Return Date *</label>
            <input name="actual_return_date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Condition Notes</label>
            <textarea name="return_condition" rows={3} className="w-full rounded-xl border border-soft bg-white px-4 py-2.5 text-sm font-medium text-main focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Describe the condition of the asset upon return (e.g., scratches, missing accessories, fully functional)" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setReturnAssignmentId(null)}>Cancel</Button>
            <Button type="submit">Confirm Return</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
