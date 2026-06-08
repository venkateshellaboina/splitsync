"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyTheme,
  resolveTheme,
  setStoredTheme,
  subscribeTheme,
  notifyThemeListeners,
  type Theme,
} from "@/lib/theme";

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    resolveTheme,
    () => "light" as Theme
  );

  const handleToggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setStoredTheme(next);
    applyTheme(next);
    notifyThemeListeners();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      suppressHydrationWarning
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      {theme === "dark" ? "Light" : "Dark"}
    </Button>
  );
}
