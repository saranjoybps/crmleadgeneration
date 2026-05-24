"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  name: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
}

export default function PasswordInput({
  name,
  placeholder,
  required,
  minLength,
  defaultValue,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="9" width="14" height="9" rx="2" />
          <path d="M7 9V6a3 3 0 016 0v3" strokeLinecap="round" />
        </svg>
      </span>
      <input
        name={name}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-300 transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
