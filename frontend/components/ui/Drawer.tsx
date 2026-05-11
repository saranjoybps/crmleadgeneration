"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  isOpen: boolean;
  onClose?: () => void;
  closeHref?: string;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Drawer({ isOpen, onClose, closeHref, title, children, size = "md" }: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  const CloseElement = () => {
    if (closeHref) {
      return (
        <Link 
          href={closeHref}
          className="rounded-xl p-2 text-muted hover:bg-slate-100 transition-all hover:scale-110"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </Link>
      );
    }
    return (
      <button 
        onClick={onClose}
        className="rounded-xl p-2 text-muted hover:bg-slate-100 transition-all hover:scale-110"
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
      </button>
    );
  };

  const Overlay = () => {
    if (closeHref) {
      return <Link href={closeHref} className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" />;
    }
    return <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={onClose} />;
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <Overlay />
      <div 
        className={cn(
          "relative flex h-full w-full flex-col bg-white shadow-2xl transition-transform animate-in slide-in-from-right duration-300 ease-out",
          sizes[size]
        )}
      >
        <div className="flex items-center justify-between border-b border-soft px-6 py-5">
          {title ? (
            <h3 className="text-xl font-bold text-main tracking-tight">{title}</h3>
          ) : <div />}
          <CloseElement />
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
