"use client";

import { useRef, useState } from "react";
import type { CardProvider } from "@/types";

function formatProvider(provider: string): string {
  const labels: Record<CardProvider, string> = {
    CHASE_CREDIT: "Chase",
    AMEX_CREDIT: "Amex",
    CAPITAL_ONE_CREDIT: "Capital One",
    APPLE_CARD: "Apple Card",
    CUSTOM_GENERIC: "Generic",
  };
  return labels[provider as CardProvider] ?? provider.replace(/_/g, " ");
}
import { Upload } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { parseCsvFile } from "@/lib/csv-parser";
import { applyDefaultRules } from "@/lib/default-rules";
import { applySyncedHistory } from "@/lib/synced-history";
import { Button } from "@/components/ui/button";

export function CsvUpload() {
  const { groups, setTransactions } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    count: number;
    syncedCount: number;
    provider: string;
    errors: string[];
    detectedColumns?: string[];
  } | null>(null);

  const handleFile = async (file: File) => {
    setIsParsing(true);
    setLastResult(null);
    try {
      const result = await parseCsvFile(file);
      const withDefaults = applyDefaultRules(result.transactions, groups);
      const withHistory = applySyncedHistory(withDefaults);
      setTransactions(withHistory);

      const syncedCount = withHistory.filter((tx) => tx.status === "SUCCESS").length;
      setLastResult({
        count: withHistory.length,
        syncedCount,
        provider: result.provider,
        errors: result.errors,
        detectedColumns: result.detectedColumns,
      });
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={isParsing}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        {isParsing ? "Parsing..." : "Upload CSV"}
      </Button>
      {lastResult && (
        <div className="text-sm text-muted-foreground">
          <span>
            Loaded {lastResult.count} transactions (
            {formatProvider(lastResult.provider)})
            {lastResult.syncedCount > 0 &&
              ` · ${lastResult.syncedCount} already synced`}
            {lastResult.errors.length > 0 &&
              ` · ${lastResult.errors.length} issue${lastResult.errors.length !== 1 ? "s" : ""}`}
          </span>
          {lastResult.count === 0 && lastResult.errors.length > 0 && (
            <p className="text-xs text-warning-foreground mt-1 max-w-xl">
              {lastResult.errors[0]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
