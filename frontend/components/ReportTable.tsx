"use client";

import { useState, useMemo } from "react";
import { FileSpreadsheet, FileText, Search, ArrowUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { downloadExcel, downloadCsv } from "@/lib/excel";
import type { Column, FilterConfig } from "@/components/ReportCard";

type Props = {
  title: string;
  reportKey: string;
  columns: Column[];
  filters: FilterConfig[];
  data: Record<string, unknown>[];
  orgSlug: string;
};

export function ReportTable({ title, reportKey, columns, filters: filterConfigs, data, orgSlug }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let rows = [...data];

    for (const [k, v] of Object.entries(activeFilters)) {
      if (v) {
        rows = rows.filter((r) => String(r[k] ?? "") === v);
      }
    }

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q))
      );
    }

    if (sortKey) {
      rows.sort((a, b) => {
        const av = String(a[sortKey] ?? "");
        const bv = String(b[sortKey] ?? "");
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return rows;
  }, [data, activeFilters, search, sortKey, sortDir]);

  function updateFilter(key: string, value: string) {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setActiveFilters({});
    setSearch("");
  }

  async function handleDownload(format: "xlsx" | "csv") {
    setLoading(format);
    try {
      const filename = `${reportKey}-report-${new Date().toISOString().split("T")[0]}`;
      if (format === "xlsx") {
        downloadExcel(filtered, columns, filename);
      } else {
        downloadCsv(filtered, columns, filename);
      }
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setLoading(null);
    }
  }

  const hasAnyFilter = Object.values(activeFilters).some(Boolean) || search;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-56 rounded-xl border border-slate-300 bg-white pl-9 pr-4 text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {hasAnyFilter && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted">
              Clear
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading === "xlsx" || loading === "csv" ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted" />
          ) : null}
          <Button size="sm" variant="outline" onClick={() => handleDownload("xlsx")} className="gap-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            XLSX
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleDownload("csv")} className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      {filterConfigs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {filterConfigs.map((f) => {
            if (f.type === "date") {
              return (
                <div key={f.key} className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">{f.label}</label>
                  <input
                    type="date"
                    value={activeFilters[f.key] ?? ""}
                    onChange={(e) => updateFilter(f.key, e.target.value)}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              );
            }
            if (f.type === "status" || f.type === "priority") {
              return (
                <div key={f.key} className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">{f.label}</label>
                  <select
                    value={activeFilters[f.key] ?? ""}
                    onChange={(e) => updateFilter(f.key, e.target.value)}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs focus:ring-2 focus:ring-violet-500"
                  >
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-muted">
        Showing <strong className="text-main">{filtered.length}</strong> of <strong className="text-main">{data.length}</strong> records
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-soft bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-soft bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="cursor-pointer select-none px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted transition hover:text-main"
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted">
                  No records found.
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i} className="border-b border-soft last:border-0 hover:bg-slate-50/50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="max-w-[250px] truncate px-4 py-3 text-sm text-main">
                      {formatCellValue(row[col.key], col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCellValue(value: unknown, key: string): string {
  if (value === null || value === undefined) return "—";
  const s = String(value);

  if (key === "working_minutes" || key === "duration_minutes") {
    const mins = Number(value);
    if (!isNaN(mins)) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
  }

  if (key === "is_active") {
    return value === true ? "Yes" : "No";
  }

  if (key === "duration_days") {
    return `${value}d`;
  }

  if (key === "experience_years") {
    return value != null ? `${value}y` : "—";
  }

  if (s.includes("T") && s.length > 16) {
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      }
    } catch {
      return s;
    }
  }

  return s;
}
