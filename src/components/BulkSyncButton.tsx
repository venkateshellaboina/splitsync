"use client";

import { useMemo, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
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
          <UploadCloud className="h-4 w-4" />
        )}
        {isSyncing
          ? progress
            ? progress.completed > 0
              ? `Synced ${progress.completed}/${progress.total}…`
              : `Syncing ${progress.total} transactions…`
            : "Syncing…"
          : `Bulk Sync${syncableCount > 0 ? ` (${syncableCount})` : ""}`}
      </Button>
      {progress && isSyncing && (
        <span className="text-xs text-zinc-500">
          {progress.succeeded} ok · {progress.failed} failed
        </span>
      )}
      {progress && !isSyncing && progress.completed > 0 && (
        <span className="text-xs text-zinc-500">
          Done — {progress.succeeded} synced
          {progress.failed > 0 ? `, ${progress.failed} failed` : ""}
        </span>
      )}
    </div>
  );
}
