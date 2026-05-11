"use client";

import { useTransition } from "react";

type AutoSubmitSelectProps = {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  className?: string;
};

export function AutoSubmitSelect({ name, defaultValue, options, className }: AutoSubmitSelectProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      name={name}
      defaultValue={defaultValue}
      disabled={isPending}
      onChange={(e) => {
        const form = e.target.form;
        if (form) {
          startTransition(() => {
            form.requestSubmit();
          });
        }
      }}
      className={`${className} ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
