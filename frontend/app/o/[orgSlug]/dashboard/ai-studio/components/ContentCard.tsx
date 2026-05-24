"use client";

import { FileText, Image, MessageSquare, Mail, Calendar, Clock, Pencil, Trash2, Send, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "../data";
import type { StudioContent, ContentType, ContentStatus } from "../types";

type ContentCardProps = {
  item: StudioContent;
  onEdit: (item: StudioContent) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
};

const TYPE_ICONS: Record<ContentType, React.ComponentType<{ className?: string }>> = {
  blog: FileText,
  poster: Image,
  social: MessageSquare,
  email: Mail,
};

const TYPE_LABELS: Record<ContentType, string> = {
  blog: "Blog",
  poster: "Poster",
  social: "Social",
  email: "Email",
};

const STATUS_STYLES: Record<ContentStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-slate-100 text-slate-400 border-slate-200",
};

export default function ContentCard({ item, onEdit, onDelete, onPublish, onArchive }: ContentCardProps) {
  const Icon = TYPE_ICONS[item.type];

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{TYPE_LABELS[item.type]}</p>
            <h3 className="text-sm font-bold text-slate-800 leading-tight line-clamp-1">{item.title}</h3>
          </div>
        </div>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_STYLES[item.status])}>
          {item.status}
        </span>
      </div>

      {item.type === "poster" && item.posterText && (
        <div
          className={cn(
            "mb-3 flex items-center justify-center rounded-xl bg-gradient-to-br p-4",
            item.bgColor ?? "from-violet-600 to-indigo-800",
          )}
        >
          <p className="line-clamp-2 text-center text-sm font-bold text-white">{item.posterText}</p>
        </div>
      )}

      {item.type === "social" && item.socialText && (
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-600">{item.socialText}</p>
      )}

      {item.type === "blog" && item.body && (
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-600">{item.body}</p>
      )}

      {item.type === "email" && item.emailSubject && (
        <p className="mb-3 text-xs font-semibold text-slate-600">
          <span className="text-slate-400">Subject: </span>{item.emailSubject}
        </p>
      )}

      {item.platforms.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {item.platforms.map((p) => (
            <span key={p} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              {PLATFORM_LABELS[p]}
            </span>
          ))}
        </div>
      )}

      {(item.scheduledAt || item.publishedAt) && (
        <div className="mb-3 flex items-center gap-3 text-[10px] font-medium text-slate-400">
          {(item.scheduledAt && item.status === "scheduled") && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(item.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
          {item.publishedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Published {new Date(item.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-slate-100 pt-3 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
        {item.status === "draft" && (
          <button
            type="button"
            onClick={() => onPublish(item.id)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
          >
            <Send className="h-3 w-3" /> Publish
          </button>
        )}
        {item.status !== "archived" && (
          <button
            type="button"
            onClick={() => onArchive(item.id)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-100"
          >
            <Archive className="h-3 w-3" /> Archive
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 ml-auto"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </div>
  );
}
