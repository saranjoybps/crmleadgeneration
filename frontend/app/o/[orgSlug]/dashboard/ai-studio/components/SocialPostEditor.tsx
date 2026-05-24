"use client";

import { useState } from "react";
import { Sparkles, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import AIPromptPanel from "./AIPromptPanel";
import PlatformSelector from "./PlatformSelector";
import SchedulePicker from "./SchedulePicker";
import type { StudioContent, Platform } from "../types";
import { generateId, simulateAIHashtags } from "../data";

type SocialPostEditorProps = {
  onSave: (content: StudioContent) => void;
  onCancel: () => void;
  editItem?: StudioContent;
};

const CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  internal: 5000,
  email: 5000,
};

export default function SocialPostEditor({ onSave, onCancel, editItem }: SocialPostEditorProps) {
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [socialText, setSocialText] = useState(editItem?.socialText ?? "");
  const [platforms, setPlatforms] = useState<Platform[]>(editItem?.platforms ?? []);
  const [date, setDate] = useState(editItem?.scheduledAt?.split("T")[0] ?? "");
  const [time, setTime] = useState(editItem?.scheduledAt?.split("T")[1]?.slice(0, 5) ?? "");
  const [showAI, setShowAI] = useState(false);
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [loadingHashtags, setLoadingHashtags] = useState(false);

  const minLimit = platforms.length > 0
    ? Math.min(...platforms.map((p) => CHAR_LIMITS[p] ?? 280))
    : 280;
  const charCount = socialText.length;
  const overLimit = charCount > minLimit;

  async function handleGenerateHashtags() {
    if (!socialText.trim()) return;
    setLoadingHashtags(true);
    const tags = await simulateAIHashtags();
    setSuggestedHashtags(tags);
    setLoadingHashtags(false);
  }

  function handleAddHashtag(tag: string) {
    setSocialText((prev) => `${prev} ${tag}`.trim());
    setSuggestedHashtags([]);
  }

  function handleAIGenerated(text: string) {
    setSocialText(text);
    setShowAI(false);
  }

  function handleSave() {
    if (!socialText.trim() && !title.trim()) return;
    const scheduledAt = date && time ? `${date}T${time}` : null;
    onSave({
      id: editItem?.id ?? generateId(),
      title: title.trim() || socialText.split("\n")[0].slice(0, 40),
      type: "social",
      status: editItem?.status ?? (scheduledAt ? "scheduled" : "draft"),
      platforms,
      scheduledAt,
      publishedAt: editItem?.publishedAt ?? null,
      createdAt: editItem?.createdAt ?? new Date().toISOString(),
      socialText: socialText.trim(),
      tags: editItem?.tags ?? [],
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">{editItem ? "Edit Social Post" : "New Social Post"}</h3>
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

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Title (internal)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Internal title for this post..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Post Content</label>
          <span className={cn("text-xs font-semibold", overLimit ? "text-red-500" : "text-slate-400")}>
            {charCount}/{minLimit}
          </span>
        </div>
        <textarea
          value={socialText}
          onChange={(e) => setSocialText(e.target.value)}
          placeholder="What do you want to share?"
          rows={5}
          className={cn(
            "w-full resize-none rounded-xl border bg-white p-4 text-sm leading-relaxed text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:ring-2",
            overLimit
              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 focus:border-violet-500 focus:ring-violet-100",
          )}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleGenerateHashtags}
          disabled={loadingHashtags || !socialText.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Hash className="h-3.5 w-3.5" />
          {loadingHashtags ? "Generating..." : "Suggest Hashtags"}
        </button>
      </div>

      {suggestedHashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestedHashtags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAddHashtag(tag)}
              className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 transition-all hover:bg-violet-200"
            >
              {tag} +
            </button>
          ))}
        </div>
      )}

      {/* Platform Preview */}
      {platforms.length > 0 && socialText.trim() && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Preview</p>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{socialText}</p>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            {platforms.map((p) => (
              <span key={p} className="rounded-md bg-slate-100 px-2 py-0.5 font-medium capitalize">{p}</span>
            ))}
          </div>
        </div>
      )}

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
          disabled={!socialText.trim() && !title.trim()}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {editItem ? "Update" : date && time ? "Schedule" : "Save as Draft"}
        </button>
      </div>
    </div>
  );
}
