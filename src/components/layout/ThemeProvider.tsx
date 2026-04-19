'use client';

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = Exclude<Theme, "system">;

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "eduplatform-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme: Theme =
      savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
        ? savedTheme
        : "system";

    function syncTheme(nextTheme: Theme) {
      const nextResolvedTheme = nextTheme === "system" ? getSystemTheme() : nextTheme;
      setResolvedTheme(nextResolvedTheme);
      applyTheme(nextResolvedTheme);
    }

    setTheme(initialTheme);
    syncTheme(initialTheme);

    function handleSystemThemeChange() {
      setTheme((currentTheme) => {
        const effectiveTheme = currentTheme ?? "system";
        if (effectiveTheme === "system") {
          syncTheme("system");
        }
        return currentTheme;
      });
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme: (nextTheme) => {
      setTheme(nextTheme);
      const nextResolvedTheme = nextTheme === "system" ? getSystemTheme() : nextTheme;
      setResolvedTheme(nextResolvedTheme);
      applyTheme(nextResolvedTheme);
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    },
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
