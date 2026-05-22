"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";

import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { downloadExcel, downloadCsv } from "@/lib/excel";

export type Column = {
  key: string;
  label: string;
};

export type FilterConfig = {
  key: string;
  label: string;
  type: "date" | "status" | "priority" | "text";
  options?: { label: string; value: string }[];
};

type Props = {
  title: string;
  description: string;
  icon: React.ReactNode;
  reportKey: string;
  columns: Column[];
  orgSlug: string;
  filters?: FilterConfig[];
  defaultFilters?: Record<string, string>;
};

export function ReportCard({ title, description, icon, reportKey, columns, orgSlug, filters, defaultFilters }: Props) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | null>(null);

  async function fetchData() {
    const params = new URLSearchParams(defaultFilters ?? {});
    const { data } = await apiRequest<Record<string, unknown>[]>(`/api/v1/reports/${reportKey}?${params}`, { orgSlug });
    return data ?? [];
  }

  async function handleDownload(format: "xlsx" | "csv") {
    setLoading(format);
    try {
      const data = await fetchData();
      const filename = `${reportKey}-report-${new Date().toISOString().split("T")[0]}`;
      if (format === "xlsx") {
        downloadExcel(data, columns, filename);
      } else {
        downloadCsv(data, columns, filename);
      }
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="group rounded-2xl border border-soft bg-white transition-all hover:border-violet-300 hover:shadow-md">
      <Link href={`/o/${orgSlug}/dashboard/reports/${reportKey}`} className="block p-5 pb-3">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition-transform group-hover:scale-105">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-main flex items-center gap-1">
              {title}
              <ChevronRight className="h-3.5 w-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </h3>
            <p className="text-xs text-muted">{description}</p>
          </div>
        </div>
      </Link>
      <div className="flex gap-2 px-5 pb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDownload("xlsx")}
          disabled={loading !== null}
          className="gap-1.5 text-xs"
        >
          {loading === "xlsx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
          XLSX
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDownload("csv")}
          disabled={loading !== null}
          className="gap-1.5 text-xs"
        >
          {loading === "csv" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          CSV
        </Button>
      </div>
    </div>
  );
}
