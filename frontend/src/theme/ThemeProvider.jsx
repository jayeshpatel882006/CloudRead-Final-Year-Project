import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "cloudread-theme";

function readStoredTheme() {
  if (typeof window === "undefined") return "system";
  try {
    return window.localStorage.getItem(STORAGE_KEY) || "system";
  } catch {
    return "system";
  }
}

function writeStoredTheme(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore quota / disabled storage */
  }
}

function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function resolveTheme(value) {
  if (value === "dark") return "dark";
  if (value === "light") return "light";
  return systemPrefersDark() ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => readStoredTheme());
  const [resolved, setResolved] = useState(() => resolveTheme(readStoredTheme()));

  // Apply theme to <html> root so [data-theme] selectors can target every element
  useEffect(() => {
    const next = resolveTheme(preference);
    setResolved(next);
    document.documentElement.setAttribute("data-theme", next);
  }, [preference]);

  // Listen for system preference changes when user is on "system"
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const handler = () => {
      const next = mq.matches ? "dark" : "light";
      setResolved(next);
      document.documentElement.setAttribute("data-theme", next);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [preference]);

  const setTheme = useCallback((value) => {
    writeStoredTheme(value);
    setPreference(value);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  const cycleTheme = useCallback(() => {
    setTheme(preference === "light" ? "dark" : preference === "dark" ? "system" : "light");
  }, [preference, setTheme]);

  return (
    <ThemeContext.Provider
      value={{ preference, resolved, setTheme, toggleTheme, cycleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}