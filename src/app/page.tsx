"use client";

import { AppProvider } from "@/context/AppContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ViewTabs } from "@/components/ViewTabs";

export default function Home() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">SplitSync</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Credit card statements → Splitwise splits
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">
          <ViewTabs />
        </main>
      </div>
    </AppProvider>
  );
}
