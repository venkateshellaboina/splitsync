const SYNCED_REMINDERS_KEY = "splitsync_synced_reminders";

export interface SyncedReminderRecord {
  fingerprint: string;
  friendId: number;
  name: string;
  amount: number;
  currencyCode: string;
  sentAt: string;
}

export type SyncedReminders = Record<string, SyncedReminderRecord>;

export function reminderFingerprint(
  friendId: number,
  amount: number,
  currencyCode: string
): string {
  return `${friendId}|${amount.toFixed(2)}|${currencyCode}`;
}

export function getSyncedReminders(): SyncedReminders {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SYNCED_REMINDERS_KEY);
    return raw ? (JSON.parse(raw) as SyncedReminders) : {};
  } catch {
    return {};
  }
}

function setSyncedReminders(reminders: SyncedReminders): void {
  localStorage.setItem(SYNCED_REMINDERS_KEY, JSON.stringify(reminders));
}

export function isReminderSynced(
  friendId: number,
  amount: number,
  currencyCode: string
): boolean {
  const history = getSyncedReminders();
  return reminderFingerprint(friendId, amount, currencyCode) in history;
}

export function markReminderSynced(
  friendId: number,
  name: string,
  amount: number,
  currencyCode: string
): void {
  const fingerprint = reminderFingerprint(friendId, amount, currencyCode);
  const history = getSyncedReminders();
  history[fingerprint] = {
    fingerprint,
    friendId,
    name,
    amount,
    currencyCode,
    sentAt: new Date().toISOString(),
  };
  setSyncedReminders(history);
}

export function getSyncedReminderCount(): number {
  return Object.keys(getSyncedReminders()).length;
}

export function clearSyncedReminders(): void {
  localStorage.removeItem(SYNCED_REMINDERS_KEY);
}
