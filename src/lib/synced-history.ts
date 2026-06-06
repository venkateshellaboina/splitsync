import type { NormalizedTransaction } from "@/types";

const SYNCED_KEY = "splitsync_synced_history";

export interface SyncedRecord {
  fingerprint: string;
  date: string;
  amount: number;
  rawDescription: string;
  groupId: string;
  userIds: string[];
  syncedAt: string;
}

export type SyncedHistory = Record<string, SyncedRecord>;

function normalizeDescription(description: string): string {
  return description.toLowerCase().replace(/\s+/g, " ").trim();
}

export function transactionFingerprint(
  tx: Pick<NormalizedTransaction, "date" | "amount" | "rawDescription">
): string {
  return `${tx.date}|${tx.amount.toFixed(2)}|${normalizeDescription(tx.rawDescription)}`;
}

export function getSyncedHistory(): SyncedHistory {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SYNCED_KEY);
    return raw ? (JSON.parse(raw) as SyncedHistory) : {};
  } catch {
    return {};
  }
}

function setSyncedHistory(history: SyncedHistory): void {
  localStorage.setItem(SYNCED_KEY, JSON.stringify(history));
}

export function isTransactionSynced(
  tx: Pick<NormalizedTransaction, "date" | "amount" | "rawDescription">
): boolean {
  const history = getSyncedHistory();
  return transactionFingerprint(tx) in history;
}

export function markAsSynced(
  tx: Pick<
    NormalizedTransaction,
    "date" | "amount" | "rawDescription" | "selectedGroupId" | "selectedUserIds"
  >
): void {
  const fingerprint = transactionFingerprint(tx);
  const history = getSyncedHistory();

  history[fingerprint] = {
    fingerprint,
    date: tx.date,
    amount: tx.amount,
    rawDescription: tx.rawDescription,
    groupId: tx.selectedGroupId ?? "",
    userIds: [...tx.selectedUserIds],
    syncedAt: new Date().toISOString(),
  };

  setSyncedHistory(history);
}

export function applySyncedHistory(
  transactions: NormalizedTransaction[]
): NormalizedTransaction[] {
  const history = getSyncedHistory();

  return transactions.map((tx) => {
    const record = history[transactionFingerprint(tx)];
    if (!record) return tx;

    return {
      ...tx,
      status: "SUCCESS",
      selectedGroupId: record.groupId || tx.selectedGroupId,
      selectedUserIds:
        record.userIds.length > 0 ? record.userIds : tx.selectedUserIds,
      errorMessage: undefined,
    };
  });
}

export function clearSyncedHistory(): void {
  localStorage.removeItem(SYNCED_KEY);
}

export function getSyncedCount(): number {
  return Object.keys(getSyncedHistory()).length;
}
