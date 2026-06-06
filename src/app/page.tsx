"use client";

import { AppProvider } from "@/context/AppContext";
import { ViewTabs } from "@/components/ViewTabs";

export default function Home() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <h1 className="text-xl font-semibold tracking-tight">SplitSync</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Credit card statements → Splitwise splits
            </p>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">
          <ViewTabs />
        </main>
      </div>
    </AppProvider>
  );
}
