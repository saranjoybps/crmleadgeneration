"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import AIPromptPanel from "./AIPromptPanel";
import PlatformSelector from "./PlatformSelector";
import SchedulePicker from "./SchedulePicker";
import type { StudioContent, Platform, PosterTemplate } from "../types";
import { POSTER_TEMPLATES, generateId } from "../data";

type PosterCanvasProps = {
  onSave: (content: StudioContent) => void;
  onCancel: () => void;
  editItem?: StudioContent;
};

const FONT_SIZES = ["text-2xl", "text-3xl", "text-4xl", "text-5xl"];

export default function PosterCanvas({ onSave, onCancel, editItem }: PosterCanvasProps) {
  const defaultTemplate = POSTER_TEMPLATES[0];
  const [selectedTemplate, setSelectedTemplate] = useState<PosterTemplate>(
    POSTER_TEMPLATES.find((t) => t.background === editItem?.bgColor) ?? defaultTemplate,
  );
  const [posterText, setPosterText] = useState(editItem?.posterText ?? "");
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [fontSize, setFontSize] = useState("text-3xl");
  const [platforms, setPlatforms] = useState<Platform[]>(editItem?.platforms ?? []);
  const [date, setDate] = useState(editItem?.scheduledAt?.split("T")[0] ?? "");
  const [time, setTime] = useState(editItem?.scheduledAt?.split("T")[1]?.slice(0, 5) ?? "");
  const [showAI, setShowAI] = useState(false);

  function handleAIGenerated(text: string) {
    setPosterText((prev) => (prev ? `${prev}\n${text}` : text));
    setShowAI(false);
  }

  function handleSave() {
    if (!posterText.trim() && !title.trim()) return;
    const scheduledAt = date && time ? `${date}T${time}` : null;
    onSave({
      id: editItem?.id ?? generateId(),
      title: title.trim() || posterText.split("\n")[0].slice(0, 40),
      type: "poster",
      status: editItem?.status ?? (scheduledAt ? "scheduled" : "draft"),
      platforms,
      scheduledAt,
      publishedAt: editItem?.publishedAt ?? null,
      createdAt: editItem?.createdAt ?? new Date().toISOString(),
      posterText: posterText.trim(),
      bgColor: selectedTemplate.background,
      textColor: selectedTemplate.textColor,
      tags: editItem?.tags ?? [],
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">{editItem ? "Edit Poster" : "New Poster"}</h3>
        <button
          type="button"
          onClick={() => setShowAI(!showAI)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Assistant
        </button>
      </div>

      {showAI && (
        <AIPromptPanel
          onGenerated={handleAIGenerated}
          className="mb-4"
        />
      )}

      <div className="grid grid-cols-4 gap-2">
        {POSTER_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedTemplate(t)}
            className={cn(
              "flex h-14 items-center justify-center rounded-xl bg-gradient-to-br text-[10px] font-bold text-white shadow-sm transition-all",
              t.background,
              selectedTemplate.id === t.id && "ring-2 ring-violet-600 ring-offset-2",
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Poster title..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Poster Text</label>
            <textarea
              value={posterText}
              onChange={(e) => setPosterText(e.target.value)}
              placeholder="Enter poster text..."
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Font Size</label>
            <div className="flex gap-1.5">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFontSize(size)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    fontSize === size
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {size.replace("text-", "")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-64 items-center justify-center">
          <div
            className={cn(
              "flex h-64 w-56 items-center justify-center rounded-2xl bg-gradient-to-br p-5 shadow-lg",
              selectedTemplate.background,
            )}
          >
            <p
              className={cn("whitespace-pre-wrap text-center font-bold leading-tight", fontSize)}
              style={{ color: selectedTemplate.textColor }}
            >
              {posterText || "Your poster preview"}
            </p>
          </div>
        </div>
      </div>

      <PlatformSelector selected={platforms} onChange={setPlatforms} />

      <SchedulePicker date={date} time={time} onDateChange={setDate} onTimeChange={setTime} />

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!posterText.trim() && !title.trim()}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {editItem ? "Update" : date && time ? "Schedule" : "Save as Draft"}
        </button>
      </div>
    </div>
  );
}
