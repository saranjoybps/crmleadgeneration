"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  closeHref?: string;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export function Modal({ isOpen, onClose, closeHref, title, children, size = "md" }: ModalProps) {
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
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw]",
  };

  const CloseElement = () => {
    if (closeHref) {
      return (
        <Link 
          href={closeHref}
          className="rounded-lg p-1 text-muted hover:bg-slate-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </Link>
      );
    }
    return (
      <button 
        onClick={onClose}
        className="rounded-lg p-1 text-muted hover:bg-slate-100 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    );
  };

  const Overlay = () => {
    if (closeHref) {
      return <Link href={closeHref} className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />;
    }
    return <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />;
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <Overlay />
      <div 
        className={cn(
          "relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl transition-all animate-in zoom-in-95 duration-200",
          sizes[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-soft px-6 py-4">
            <h3 className="text-lg font-semibold text-main tracking-tight">{title}</h3>
            <CloseElement />
          </div>
        )}
        <div className="max-h-[85vh] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
