"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
export function ThemeToggle({
  value,
  onChange,
}: {
  value?: "light" | "dark";
  onChange: (theme: "light" | "dark") => void;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  useEffect(() => {
    const next =
      value ||
      (localStorage.getItem("syrka-roadmaps:theme") === "light"
        ? "light"
        : "dark");
    queueMicrotask(() => setTheme(next));
    document.documentElement.dataset.theme = next;
    document.cookie =
      "syrka_roadmaps_theme=" +
      next +
      "; Path=/; Max-Age=31536000; SameSite=Lax";
  }, [value]);
  return (
    <button
      className="icon-button theme-toggle"
      aria-label={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("syrka-roadmaps:theme", next);
        document.documentElement.dataset.theme = next;
        document.cookie =
          "syrka_roadmaps_theme=" +
          next +
          "; Path=/; Max-Age=31536000; SameSite=Lax";
        onChange(next);
      }}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
