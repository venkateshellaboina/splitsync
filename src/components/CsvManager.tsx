"use client";

import { useState } from "react";
import { Files, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { formatProviderLabel } from "@/lib/utils";

export function CsvManager() {
  const { uploadedFiles, removeUploadedFile } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  if (uploadedFiles.length === 0) return null;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Files className="h-4 w-4" />
        Manage CSVs ({uploadedFiles.length})
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-[100] mt-1 w-80 rounded-md border border-border bg-card shadow-xl">
            <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
              Uploaded CSVs
            </div>
            <ul className="max-h-64 divide-y divide-border overflow-auto">
              {uploadedFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{file.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {file.transactionCount} transaction
                      {file.transactionCount !== 1 ? "s" : ""} ·{" "}
                      {formatProviderLabel(file.provider)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeUploadedFile(file.id)}
                    title="Remove this CSV and its transactions"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
