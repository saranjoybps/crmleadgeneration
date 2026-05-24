"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import AIPromptPanel from "./AIPromptPanel";
import PlatformSelector from "./PlatformSelector";
import SchedulePicker from "./SchedulePicker";
import type { StudioContent, Platform } from "../types";
import { generateId } from "../data";

type EmailEditorProps = {
  onSave: (content: StudioContent) => void;
  onCancel: () => void;
  editItem?: StudioContent;
};

export default function EmailEditor({ onSave, onCancel, editItem }: EmailEditorProps) {
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [subject, setSubject] = useState(editItem?.emailSubject ?? "");
  const [body, setBody] = useState(editItem?.body ?? "");
  const [platforms, setPlatforms] = useState<Platform[]>(editItem?.platforms ?? ["email"]);
  const [date, setDate] = useState(editItem?.scheduledAt?.split("T")[0] ?? "");
  const [time, setTime] = useState(editItem?.scheduledAt?.split("T")[1]?.slice(0, 5) ?? "");
  const [showAI, setShowAI] = useState(false);

  function handleAIGenerated(text: string) {
    const lines = text.split("\n");
    const possibleSubject = lines.find((l) => l.toLowerCase().startsWith("subject:"));
    if (possibleSubject && !subject) {
      setSubject(possibleSubject.replace(/^subject:\s*/i, ""));
      setBody(lines.filter((l) => !l.toLowerCase().startsWith("subject:")).join("\n").trim());
    } else {
      setBody((prev) => (prev ? `${prev}\n\n${text}` : text));
    }
    setShowAI(false);
  }

  function handleSave() {
    if (!subject.trim() && !title.trim()) return;
    const scheduledAt = date && time ? `${date}T${time}` : null;
    onSave({
      id: editItem?.id ?? generateId(),
      title: title.trim() || subject.trim().slice(0, 40),
      type: "email",
      status: editItem?.status ?? (scheduledAt ? "scheduled" : "draft"),
      platforms,
      scheduledAt,
      publishedAt: editItem?.publishedAt ?? null,
      createdAt: editItem?.createdAt ?? new Date().toISOString(),
      emailSubject: subject.trim(),
      body: body.trim(),
      tags: editItem?.tags ?? [],
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">{editItem ? "Edit Email" : "New Email Newsletter"}</h3>
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
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Campaign Name</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. June Newsletter, Product Update..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Subject Line</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter email subject..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Email Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your email content here... Use AI Assistant to generate!"
          rows={10}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
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
          disabled={!subject.trim() && !title.trim()}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {editItem ? "Update" : date && time ? "Schedule" : "Save as Draft"}
        </button>
      </div>
    </div>
  );
}
