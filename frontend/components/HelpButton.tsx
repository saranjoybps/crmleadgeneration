"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import HelpChatDrawer from "./HelpChatDrawer";

type HelpButtonProps = {
  orgSlug: string;
};

export default function HelpButton({ orgSlug }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
        aria-label="Help"
        title="Help"
      >
        <Sparkles className="h-5 w-5" />
      </button>
      <HelpChatDrawer isOpen={open} onClose={() => setOpen(false)} orgSlug={orgSlug} />
    </>
  );
}
