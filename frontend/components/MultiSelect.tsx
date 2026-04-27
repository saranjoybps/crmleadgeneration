"use client";

import { useEffect, useRef, useState } from "react";

type MultiSelectProps = {
  label: string;
  name: string;
  options: { label: string; value: string }[];
  values: string[];
  onChange: (values: string[]) => void;
};

export function MultiSelect({ label, name, options, values, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && event.target instanceof Node && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedLabels = options.filter((opt) => values.includes(opt.value)).map((opt) => opt.label);

  function toggleValue(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    onChange([...values, value]);
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:border-violet-300"
      >
        {selectedLabels.length > 0 ? selectedLabels.join(", ") : `Select ${label.toLowerCase()}`}
      </button>
      {open ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={values.includes(option.value)}
                onChange={() => toggleValue(option.value)}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}
      {values.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </div>
  );
}
