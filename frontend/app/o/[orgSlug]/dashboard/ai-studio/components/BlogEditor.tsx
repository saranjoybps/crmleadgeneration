"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import AIPromptPanel from "./AIPromptPanel";
import PlatformSelector from "./PlatformSelector";
import SchedulePicker from "./SchedulePicker";
import type { StudioContent, Platform } from "../types";
import { generateId } from "../data";

type BlogEditorProps = {
  onSave: (content: StudioContent) => void;
  onCancel: () => void;
  editItem?: StudioContent;
};

export default function BlogEditor({ onSave, onCancel, editItem }: BlogEditorProps) {
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [body, setBody] = useState(editItem?.body ?? "");
  const [tags, setTags] = useState<string[]>(editItem?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(editItem?.platforms ?? []);
  const [date, setDate] = useState(editItem?.scheduledAt?.split("T")[0] ?? "");
  const [time, setTime] = useState(editItem?.scheduledAt?.split("T")[1]?.slice(0, 5) ?? "");
  const [showAI, setShowAI] = useState(false);

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleAIGenerated(text: string) {
    setBody((prev) => (prev ? `${prev}\n\n${text}` : text));
    setShowAI(false);
  }

  function handleSave() {
    if (!title.trim()) return;
    const scheduledAt = date && time ? `${date}T${time}` : null;
    onSave({
      id: editItem?.id ?? generateId(),
      title: title.trim(),
      type: "blog",
      status: editItem?.status ?? (scheduledAt ? "scheduled" : "draft"),
      platforms,
      scheduledAt,
      publishedAt: editItem?.publishedAt ?? null,
      createdAt: editItem?.createdAt ?? new Date().toISOString(),
      body: body.trim(),
      tags,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">{editItem ? "Edit Blog" : "New Blog Post"}</h3>
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
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter blog title..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Content</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your blog content here... Use AI Assistant to generate content!"
          rows={10}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Tags</label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="text-slate-400 hover:text-slate-600">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add a tag..."
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          />
          <button
            type="button"
            onClick={addTag}
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            Add
          </button>
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
          disabled={!title.trim()}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {editItem ? "Update" : date && time ? "Schedule" : "Save as Draft"}
        </button>
      </div>
    </div>
  );
}
