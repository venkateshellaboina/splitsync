"use client";

import { useMemo, useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import type { NormalizedTransaction, SplitwiseCurrentUser } from "@/types";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { SyncSuccessPopup } from "@/components/SyncSuccessPopup";
import {
  getSyncableTransactions,
  runBulkSync,
  runExampleBulkSync,
  type BulkSyncProgress,
} from "@/lib/bulk-sync";

interface BulkSyncButtonProps {
  /** Overrides the transactions from AppContext — used to drive the example ledger. */
  transactions?: NormalizedTransaction[];
  /** Overrides the current user from AppContext — used by the example ledger. */
  currentUser?: SplitwiseCurrentUser | null;
  /** Overrides AppContext's updateTransaction — lets the example ledger keep its state local. */
  onUpdateTransaction?: (
    id: string,
    updates: Partial<NormalizedTransaction>
  ) => void;
  /** When set, bulk sync never hits the network or real local storage. */
  isExample?: boolean;
  onExampleBulkComplete?: (succeeded: number) => void;
}

export function BulkSyncButton({
  transactions: transactionsProp,
  currentUser: currentUserProp,
  onUpdateTransaction,
  isExample = false,
  onExampleBulkComplete,
}: BulkSyncButtonProps = {}) {
  const app = useApp();
  const transactions = transactionsProp ?? app.transactions;
  const currentUser =
    currentUserProp !== undefined ? currentUserProp : app.currentUser;
  const updateTransaction = onUpdateTransaction ?? app.updateTransaction;
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<BulkSyncProgress | null>(null);
  const [syncedPopup, setSyncedPopup] = useState<string | null>(null);

  const syncableCount = useMemo(
    () => getSyncableTransactions(transactions).length,
    [transactions]
  );

  const handleBulkSync = async () => {
    if (!currentUser || syncableCount === 0 || isSyncing) return;

    setIsSyncing(true);
    setProgress({ completed: 0, total: syncableCount, succeeded: 0, failed: 0 });

    try {
      const result = isExample
        ? await runExampleBulkSync(transactions, {
            onProgress: setProgress,
            onTransactionUpdate: updateTransaction,
          })
        : await runBulkSync(transactions, currentUser.id, {
            onProgress: setProgress,
            onTransactionUpdate: updateTransaction,
          });
      if (result.succeeded > 0) {
        if (isExample) {
          onExampleBulkComplete?.(result.succeeded);
        } else {
          setSyncedPopup(
            `${result.succeeded} transaction${result.succeeded === 1 ? "" : "s"} posted to Splitwise successfully! 🎉`
          );
        }
      }
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
              ? `Synced ${progress.completed}/${progress.total}…`
              : `Syncing ${progress.total} transactions…`
            : "Syncing…"
          : `Bulk Add${syncableCount > 0 ? ` (${syncableCount})` : ""}`}
      </Button>
      {progress && isSyncing && (
        <span className="text-xs text-muted-foreground">
          {progress.succeeded} ok · {progress.failed} failed
        </span>
      )}
      {progress && !isSyncing && progress.completed > 0 && (
        <span className="text-xs text-muted-foreground">
          Done — {progress.succeeded} synced
          {progress.failed > 0 ? `, ${progress.failed} failed` : ""}
        </span>
      )}

      {syncedPopup && (
        <SyncSuccessPopup
          message={syncedPopup}
          onDismiss={() => setSyncedPopup(null)}
        />
      )}
    </div>
  );
}
