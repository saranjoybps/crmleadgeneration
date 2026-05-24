"use client";

import { useState } from "react";
import { Sparkles, Wand2, Loader2, Check, Copy, FileText, MessageSquare, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { simulateAI, simulateAISocial, simulateAIEmail, simulateAIHashtags } from "../data";
import type { AIGenerationType } from "../types";

type AIPromptPanelProps = {
  onGenerated: (text: string) => void;
  className?: string;
};

const GENERATION_TYPES: { key: AIGenerationType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "blog", label: "Blog Content", icon: FileText },
  { key: "social", label: "Social Post", icon: MessageSquare },
  { key: "email", label: "Email", icon: Mail },
  { key: "hashtags", label: "Hashtags", icon: Sparkles },
  { key: "tagline", label: "Tagline", icon: Wand2 },
];

const TONE_OPTIONS = ["Professional", "Casual", "Enthusiastic", "Formal", "Witty"];

export default function AIPromptPanel({ onGenerated, className }: AIPromptPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<AIGenerationType>("blog");
  const [tone, setTone] = useState("Professional");
  const [loading, setLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setGeneratedText("");

    let result: string;
    switch (type) {
      case "social":
        result = await simulateAISocial();
        break;
      case "email":
        result = await simulateAIEmail();
        break;
      case "hashtags": {
        const tags = await simulateAIHashtags();
        result = tags.join(" ");
        break;
      }
      case "tagline":
        await new Promise((r) => setTimeout(r, 800));
        result = `"${prompt}" – Empowering Your Business with JOY CRM`;
        break;
      default:
        result = await simulateAI();
    }

    setGeneratedText(result);
    setLoading(false);
  }

  function handleApply() {
    onGenerated(generatedText);
  }

  function handleCopy() {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5", className)}>
      <div className="mb-4 flex items-center gap-2">
        <Wand2 className="h-5 w-5 text-violet-600" />
        <h3 className="text-sm font-bold text-violet-900">AI Studio Assistant</h3>
      </div>

      <div className="mb-4 space-y-3">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Content Type</p>
          <div className="flex flex-wrap gap-1.5">
            {GENERATION_TYPES.map((gt) => {
              const Icon = gt.icon;
              return (
                <button
                  key={gt.key}
                  type="button"
                  onClick={() => setType(gt.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    type === gt.key
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {gt.label}
                </button>
              );
            })}
          </div>
        </div>

        {type !== "hashtags" && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Tone</p>
            <div className="flex flex-wrap gap-1.5">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                    tone === t
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-white text-slate-500 hover:bg-slate-100",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {type === "hashtags" ? "Topic" : "Prompt"}
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              type === "hashtags"
                ? "e.g. product launch, team building..."
                : "e.g. Write a blog about our new AI features..."
            }
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white shadow-sm transition-all",
            loading || !prompt.trim()
              ? "cursor-not-allowed bg-slate-300"
              : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98]",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate
            </>
          )}
        </button>
      </div>

      {generatedText && (
        <div className="rounded-xl border border-violet-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-600">
              <Sparkles className="h-3 w-3" />
              Generated {type === "blog" ? "Content" : type === "social" ? "Post" : type === "email" ? "Email" : type === "hashtags" ? "Hashtags" : "Tagline"}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700"
              >
                <Check className="h-3 w-3" />
                Apply
              </button>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{generatedText}</p>
          {type === "hashtags" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {generatedText.split(" ").filter((t) => t.startsWith("#")).map((tag) => (
                <span key={tag} className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
