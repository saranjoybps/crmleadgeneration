"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, FileText, Image, MessageSquare, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import ContentCard from "./ContentCard";
import type { StudioContent, ContentType, ContentStatus } from "../types";

type ContentListProps = {
  contents: StudioContent[];
  onEdit: (item: StudioContent) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
};

const TYPE_FILTERS: { key: ContentType | "all"; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all", label: "All", icon: SlidersHorizontal },
  { key: "blog", label: "Blog", icon: FileText },
  { key: "poster", label: "Poster", icon: Image },
  { key: "social", label: "Social", icon: MessageSquare },
  { key: "email", label: "Email", icon: Mail },
];

const STATUS_FILTERS: { key: ContentStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
  { key: "archived", label: "Archived" },
];

export default function ContentList({ contents, onEdit, onDelete, onPublish, onArchive }: ContentListProps) {
  const [typeFilter, setTypeFilter] = useState<ContentType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = contents.filter((c) => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.tags.some((t) => t.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content or tags..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                typeFilter === f.key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-white text-slate-500 hover:bg-slate-100",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          );
        })}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              statusFilter === f.key
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-500 hover:bg-slate-100",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <SlidersHorizontal className="mb-3 h-10 w-10" />
          <p className="text-sm font-semibold">No content found</p>
          <p className="text-xs">Try adjusting your filters or create new content</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onPublish={onPublish}
              onArchive={onArchive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
