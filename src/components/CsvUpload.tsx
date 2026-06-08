"use client";

import { useRef, useState } from "react";
import type { CardProvider } from "@/types";

function formatProvider(provider: string): string {
  const labels: Record<CardProvider, string> = {
    CHASE_CREDIT: "Chase",
    AMEX_CREDIT: "Amex",
    CAPITAL_ONE_CREDIT: "Capital One",
    APPLE_CARD: "Apple Card",
    WELLS_FARGO_CREDIT: "Wells Fargo",
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
    fileCount: number;
    syncedCount: number;
    providerLabel: string;
    errors: string[];
    detectedColumns?: string[];
  } | null>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsParsing(true);
    setLastResult(null);
    try {
      const results = await Promise.all(
        files.map(async (file) => ({
          file,
          result: await parseCsvFile(file),
        }))
      );
      const transactions = results.flatMap(({ result }) => result.transactions);
      const withDefaults = applyDefaultRules(transactions, groups);
      const withHistory = applySyncedHistory(withDefaults);
      setTransactions(withHistory);

      const syncedCount = withHistory.filter((tx) => tx.status === "SUCCESS").length;
      const providers = Array.from(
        new Set(results.map(({ result }) => formatProvider(result.provider)))
      );
      const errors = results.flatMap(({ file, result }) =>
        result.errors.map((error) => `${file.name}: ${error}`)
      );
      setLastResult({
        count: withHistory.length,
        fileCount: files.length,
        syncedCount,
        providerLabel: providers.join(", "),
        errors,
        detectedColumns: results.find(({ result }) => result.detectedColumns)
          ?.result.detectedColumns,
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
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          void handleFiles(files);
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
        {isParsing ? "Parsing..." : "Upload CSVs"}
      </Button>
      {lastResult && (
        <div className="text-sm text-muted-foreground">
          <span>
            Loaded {lastResult.count} transactions from {lastResult.fileCount}{" "}
            CSV{lastResult.fileCount !== 1 ? "s" : ""} (
            {lastResult.providerLabel})
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
