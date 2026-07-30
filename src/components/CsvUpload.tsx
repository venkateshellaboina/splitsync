"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import type { NormalizedTransaction, UploadedCsvFile } from "@/types";
import { useApp } from "@/context/AppContext";
import { parseCsvFile } from "@/lib/csv-parser";
import { applyDefaultRules } from "@/lib/default-rules";
import { sortTransactionsByDate } from "@/lib/normalize";
import { applySyncedHistory } from "@/lib/synced-history";
import { Button } from "@/components/ui/button";
import { formatProviderLabel } from "@/lib/utils";

async function hashFileContent(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const LAST_RESULT_TIMEOUT_MS = 10_000;

export function CsvUpload() {
  const {
    groups,
    setTransactions,
    setHasUploadedCsv,
    uploadedFiles,
    setUploadedFiles,
  } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const hideResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFileCountRef = useRef(uploadedFiles.length);
  const [isParsing, setIsParsing] = useState(false);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{
    count: number;
    fileCount: number;
    syncedCount: number;
    providerLabel: string;
    errors: string[];
    detectedColumns?: string[];
  } | null>(null);

  const clearLastResult = useCallback(() => {
    if (hideResultTimerRef.current) {
      clearTimeout(hideResultTimerRef.current);
      hideResultTimerRef.current = null;
    }
    setLastResult(null);
  }, []);

  // If a CSV is deleted (via the Manage CSVs panel) before the auto-hide
  // timer fires, hide the "Loaded N transactions" message immediately.
  useEffect(() => {
    if (uploadedFiles.length < prevFileCountRef.current) {
      clearLastResult();
    }
    prevFileCountRef.current = uploadedFiles.length;
  }, [uploadedFiles.length, clearLastResult]);

  useEffect(() => {
    return () => {
      if (hideResultTimerRef.current) clearTimeout(hideResultTimerRef.current);
    };
  }, []);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsParsing(true);
    clearLastResult();
    try {
      const withHashes = await Promise.all(
        files.map(async (file) => ({
          file,
          hash: await hashFileContent(await file.text()),
        }))
      );

      const existingHashes = new Set(uploadedFiles.map((f) => f.contentHash));
      const seenInBatch = new Set<string>();
      const duplicates: string[] = [];
      const newFiles: { file: File; hash: string }[] = [];

      for (const entry of withHashes) {
        if (existingHashes.has(entry.hash) || seenInBatch.has(entry.hash)) {
          duplicates.push(entry.file.name);
          continue;
        }
        seenInBatch.add(entry.hash);
        newFiles.push(entry);
      }

      setDuplicateNames(duplicates);

      if (newFiles.length === 0) {
        return;
      }

      setHasUploadedCsv(true);

      const results = await Promise.all(
        newFiles.map(async ({ file, hash }) => ({
          file,
          hash,
          result: await parseCsvFile(file),
        }))
      );

      const newUploadedFiles: UploadedCsvFile[] = [];
      const newTransactions: NormalizedTransaction[] = [];

      for (const { file, hash, result } of results) {
        const fileId = crypto.randomUUID();
        const cardLabel = formatProviderLabel(result.provider);
        newUploadedFiles.push({
          id: fileId,
          name: file.name,
          size: file.size,
          provider: result.provider,
          transactionCount: result.transactions.length,
          uploadedAt: new Date().toISOString(),
          contentHash: hash,
        });
        newTransactions.push(
          ...result.transactions.map((tx) => ({
            ...tx,
            sourceFileId: fileId,
            cardLabel,
          }))
        );
      }

      const withRules = applyDefaultRules(newTransactions, groups);
      const withHistory = applySyncedHistory(withRules);

      setUploadedFiles((prev) => [...prev, ...newUploadedFiles]);
      setTransactions((prev) =>
        sortTransactionsByDate([...prev, ...withHistory])
      );

      const syncedCount = withHistory.filter(
        (tx) => tx.status === "SUCCESS"
      ).length;
      const providers = Array.from(
        new Set(results.map(({ result }) => formatProviderLabel(result.provider)))
      );
      const errors = results.flatMap(({ file, result }) =>
        result.errors.map((error) => `${file.name}: ${error}`)
      );
      setLastResult({
        count: withHistory.length,
        fileCount: newFiles.length,
        syncedCount,
        providerLabel: providers.join(", "),
        errors,
        detectedColumns: results.find(({ result }) => result.detectedColumns)
          ?.result.detectedColumns,
      });
      hideResultTimerRef.current = setTimeout(() => {
        setLastResult(null);
        hideResultTimerRef.current = null;
      }, LAST_RESULT_TIMEOUT_MS);
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

      {duplicateNames.length > 0 && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setDuplicateNames([])}
        >
          <div
            className="max-w-sm space-y-3 rounded-lg border border-border bg-card p-5 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold">
              {duplicateNames.length === 1
                ? `"${duplicateNames[0]}" has already been uploaded.`
                : `${duplicateNames.length} of these files have already been uploaded:`}
            </p>
            {duplicateNames.length > 1 && (
              <ul className="list-disc space-y-0.5 pl-5 text-left text-xs text-muted-foreground">
                {duplicateNames.map((name) => (
                  <li key={name} className="truncate">
                    {name}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Skipped — no duplicate transactions were added.
            </p>
            <Button size="sm" onClick={() => setDuplicateNames([])}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
