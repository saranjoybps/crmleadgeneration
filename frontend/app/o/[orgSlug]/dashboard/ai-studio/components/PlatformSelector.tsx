"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_LABELS } from "../data";
import type { Platform } from "../types";

type PlatformSelectorProps = {
  selected: Platform[];
  onChange: (platforms: Platform[]) => void;
};

const ALL_PLATFORMS: Platform[] = ["linkedin", "twitter", "instagram", "facebook", "internal", "email"];

export default function PlatformSelector({ selected, onChange }: PlatformSelectorProps) {
  function toggle(platform: Platform) {
    if (selected.includes(platform)) {
      onChange(selected.filter((p) => p !== platform));
    } else {
      onChange([...selected, platform]);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Platforms</p>
      <div className="flex flex-wrap gap-2">
        {ALL_PLATFORMS.map((platform) => {
          const active = selected.includes(platform);
          return (
            <button
              key={platform}
              type="button"
              onClick={() => toggle(platform)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                active
                  ? "border-violet-300 bg-violet-50 text-violet-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              {active && <Check className="h-3 w-3" />}
              {PLATFORM_LABELS[platform]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
