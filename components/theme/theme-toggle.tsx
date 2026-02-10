"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "button";
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme();

  // Prevent hydration mismatch by showing placeholder until mounted
  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center",
          variant === "button" ? "px-3 py-2 gap-2" : "w-9 h-9",
          "rounded-lg bg-[var(--panel)] border border-[var(--border)]",
          className
        )}
      >
        <div className="h-4 w-4" />
        {variant === "button" && <span className="text-sm">Tema</span>}
      </div>
    );
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
          "text-sm font-medium transition-colors",
          "bg-[var(--panel)] border border-[var(--border)]",
          "hover:bg-[var(--panel-strong)]",
          "text-[var(--fg)]",
          className
        )}
        aria-label={`Cambiar a tema ${theme === "dark" ? "claro" : "oscuro"}`}
      >
        {theme === "dark" ? (
          <>
            <Sun className="h-4 w-4" />
            <span>Claro</span>
          </>
        ) : (
          <>
            <Moon className="h-4 w-4" />
            <span>Oscuro</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center",
        "w-9 h-9 rounded-lg transition-colors",
        "bg-[var(--panel)] border border-[var(--border)]",
        "hover:bg-[var(--panel-strong)]",
        "text-[var(--fg)]",
        className
      )}
      aria-label={`Cambiar a tema ${theme === "dark" ? "claro" : "oscuro"}`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
