"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const success = (message: string) => toast(message, "success");
  const error = (message: string) => toast(message, "error");

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      {mounted && createPortal(
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 w-full max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl p-4 shadow-2xl transition-all animate-in slide-in-from-right-full duration-300",
                t.type === "success" && "bg-emerald-50 text-emerald-900 border border-emerald-200",
                t.type === "error" && "bg-red-50 text-red-900 border border-red-200",
                t.type === "info" && "bg-violet-50 text-violet-900 border border-violet-200",
                t.type === "warning" && "bg-amber-50 text-amber-900 border border-amber-200"
              )}
            >
              <div className="flex items-center gap-3">
                {t.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                {t.type === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}
                {t.type === "info" && <Info className="h-5 w-5 text-violet-600" />}
                {t.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                <p className="text-sm font-semibold">{t.message}</p>
              </div>
              <button 
                onClick={() => removeToast(t.id)}
                className="rounded-lg p-1 hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
