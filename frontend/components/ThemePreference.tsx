"use client";

import { useEffect, useState } from "react";

type ThemeOption = "light" | "dark" | "system";

const OPTIONS: ThemeOption[] = ["light", "dark", "system"];

function resolveTheme(theme: ThemeOption) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function ThemePreference() {
  const [theme, setTheme] = useState<ThemeOption>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("joy-theme");
    const nextTheme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setTheme(nextTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = (value: ThemeOption) => {
      const resolved = resolveTheme(value);
      document.documentElement.setAttribute("data-theme", resolved);
      localStorage.setItem("joy-theme", value);
    };

    apply(theme);

    const handleSystemChange = () => {
      if (theme === "system") {
        apply("system");
      }
    };

    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, [theme]);

  if (!mounted) {
    return <div className="h-10" aria-hidden="true" />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => {
        const active = option === theme;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${
              active
                ? "border-violet-500 bg-violet-600 text-white"
                : "border-soft surface-muted text-muted hover:border-violet-300"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
