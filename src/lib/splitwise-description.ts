import type { NormalizedTransaction } from "@/types";

/** Prefixes the merchant name with the card transaction date for Splitwise. */
export function formatSplitwiseDescription(
  tx: Pick<NormalizedTransaction, "date" | "description">
): string {
  return `${tx.date} — ${tx.description}`;
}

export function getDefaultSplitwiseDescription(
  tx: Pick<NormalizedTransaction, "date" | "description">
): string {
  return formatSplitwiseDescription(tx);
}

export function getSplitwiseDescription(
  tx: Pick<
    NormalizedTransaction,
    "date" | "description" | "syncDescriptionOverride"
  >
): string {
  const override = tx.syncDescriptionOverride?.trim();
  if (override) return override;
  return formatSplitwiseDescription(tx);
}

export function hasDescriptionOverride(
  tx: Pick<NormalizedTransaction, "syncDescriptionOverride">
): boolean {
  return Boolean(tx.syncDescriptionOverride?.trim());
}
