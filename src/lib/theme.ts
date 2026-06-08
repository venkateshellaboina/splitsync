export type Theme = "light" | "dark";

const THEME_KEY = "splitsync_theme";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

export function setStoredTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
}

export function toggleTheme(current: Theme): Theme {
  const next = current === "dark" ? "light" : "dark";
  setStoredTheme(next);
  applyTheme(next);
  notifyThemeListeners();
  return next;
}

const themeListeners = new Set<() => void>();

export function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);

  if (typeof window !== "undefined") {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", listener);
    return () => {
      themeListeners.delete(listener);
      media.removeEventListener("change", listener);
    };
  }

  return () => {
    themeListeners.delete(listener);
  };
}

export function notifyThemeListeners(): void {
  themeListeners.forEach((listener) => listener());
}
