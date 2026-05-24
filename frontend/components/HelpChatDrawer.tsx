"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Send, Bot, User, Loader2 } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type HelpChatDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  orgSlug: string;
};

export default function HelpChatDrawer({ isOpen, onClose, orgSlug }: HelpChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm your CRM assistant. How can I help you today? You can ask me about any module, feature, or how things work in the system." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/help-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          orgSlug,
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again or contact noreply@joyinfinity.com for support." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-soft bg-white shadow-xl animate-in slide-in-from-right duration-300 ease-out">
        <div className="flex items-center justify-between border-b border-soft px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
              <Bot className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-main">Help & Support</h2>
              <p className="text-[10px] font-medium text-muted uppercase tracking-wider">CRM Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${msg.role === "assistant" ? "bg-violet-100" : "bg-slate-100"}`}>
                {msg.role === "assistant" ? (
                  <Bot className="h-4 w-4 text-violet-600" />
                ) : (
                  <User className="h-4 w-4 text-slate-600" />
                )}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-slate-50 border border-soft text-main"
                  : "bg-violet-600 text-white"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                <Bot className="h-4 w-4 text-violet-600" />
              </div>
              <div className="rounded-2xl bg-slate-50 border border-soft px-4 py-3">
                <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-soft px-6 py-4">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about any module or feature..."
              disabled={loading}
              className="flex-1 h-11 rounded-xl border border-soft bg-white px-4 text-sm text-main placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 text-center">
            Responses are AI-generated. Contact noreply@joyinfinity.com for support.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
