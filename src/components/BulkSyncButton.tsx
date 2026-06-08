"use client";

import { useMemo, useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  getSyncableTransactions,
  runBulkSync,
  type BulkSyncProgress,
} from "@/lib/bulk-sync";

export function BulkSyncButton() {
  const { transactions, currentUser, updateTransaction } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<BulkSyncProgress | null>(null);

  const syncableCount = useMemo(
    () => getSyncableTransactions(transactions).length,
    [transactions]
  );

  const handleBulkSync = async () => {
    if (!currentUser || syncableCount === 0 || isSyncing) return;

    setIsSyncing(true);
    setProgress({ completed: 0, total: syncableCount, succeeded: 0, failed: 0 });

    try {
      await runBulkSync(transactions, currentUser.id, {
        onProgress: setProgress,
        onTransactionUpdate: updateTransaction,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setProgress(null), 4000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        disabled={!currentUser || syncableCount === 0 || isSyncing}
        onClick={handleBulkSync}
      >
        {isSyncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SendHorizontal className="h-4 w-4" />
        )}
        {isSyncing
          ? progress
            ? progress.completed > 0
              ? `Added ${progress.completed}/${progress.total}…`
              : `Adding ${progress.total} transactions…`
            : "Adding…"
          : `Bulk Add${syncableCount > 0 ? ` (${syncableCount})` : ""}`}
      </Button>
      {progress && isSyncing && (
        <span className="text-xs text-muted-foreground">
          {progress.succeeded} ok · {progress.failed} failed
        </span>
      )}
      {progress && !isSyncing && progress.completed > 0 && (
        <span className="text-xs text-muted-foreground">
          Done — {progress.succeeded} added
          {progress.failed > 0 ? `, ${progress.failed} failed` : ""}
        </span>
      )}
    </div>
  );
}
