import type { NormalizedTransaction } from "@/types";
import { extractMerchantKeyword } from "@/lib/rules";
import { getStoredToken, saveOrUpdateRule } from "@/lib/storage";
import { getSplitwiseDescription } from "@/lib/splitwise-description";
import { isTransactionSynced, markAsSynced } from "@/lib/synced-history";

export interface BulkSyncProgress {
  completed: number;
  total: number;
  succeeded: number;
  failed: number;
}

export function getSyncableTransactions(
  transactions: NormalizedTransaction[]
): NormalizedTransaction[] {
  return transactions.filter(
    (tx) =>
      !tx.isRefund &&
      tx.status !== "SUCCESS" &&
      tx.status !== "IGNORED" &&
      tx.status !== "SYNCING" &&
      tx.selectedGroupId &&
      tx.selectedUserIds.length > 0 &&
      !isTransactionSynced(tx)
  );
}

interface BulkSyncCallbacks {
  onProgress: (progress: BulkSyncProgress) => void;
  onTransactionUpdate: (
    id: string,
    updates: Partial<NormalizedTransaction>
  ) => void;
}

export async function runBulkSync(
  transactions: NormalizedTransaction[],
  payerId: number,
  callbacks: BulkSyncCallbacks
): Promise<{ succeeded: number; failed: number }> {
  const token = getStoredToken();
  if (!token) throw new Error("No Splitwise token configured");

  const syncable = getSyncableTransactions(transactions);
  if (syncable.length === 0) {
    return { succeeded: 0, failed: 0 };
  }

  const total = syncable.length;

  for (const tx of syncable) {
    callbacks.onTransactionUpdate(tx.id, {
      status: "SYNCING",
      errorMessage: undefined,
    });
  }
  callbacks.onProgress({ completed: 0, total, succeeded: 0, failed: 0 });

  const res = await fetch("/api/splitwise/sync/bulk", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expenses: syncable.map((tx) => ({
        amount: tx.amount,
        description: getSplitwiseDescription(tx),
        groupId: tx.selectedGroupId,
        userIds: tx.selectedUserIds.map(Number),
        payerId,
      })),
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    for (const tx of syncable) {
      callbacks.onTransactionUpdate(tx.id, {
        status: "ERROR",
        errorMessage: data.error ?? "Bulk sync failed",
      });
    }
    callbacks.onProgress({
      completed: total,
      total,
      succeeded: 0,
      failed: total,
    });
    return { succeeded: 0, failed: total };
  }

  let succeeded = 0;
  let failed = 0;

  syncable.forEach((tx, index) => {
    const result = data.results?.[index];
    if (result?.success) {
      succeeded++;
      const keyword = extractMerchantKeyword(tx.rawDescription);
      if (tx.selectedGroupId) {
        saveOrUpdateRule(keyword, tx.selectedGroupId, tx.selectedUserIds);
      }
      markAsSynced(tx);
      callbacks.onTransactionUpdate(tx.id, {
        status: "SUCCESS",
        errorMessage: undefined,
      });
    } else {
      failed++;
      callbacks.onTransactionUpdate(tx.id, {
        status: "ERROR",
        errorMessage: result?.error ?? "Sync failed",
      });
    }
  });

  callbacks.onProgress({ completed: total, total, succeeded, failed });
  return { succeeded, failed };
}
