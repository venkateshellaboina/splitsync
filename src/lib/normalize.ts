import type {
  CardProvider,
  NormalizedTransaction,
  RawTransactionRow,
} from "@/types";
import {
  buildColumnMapping,
  extractAmount,
  getRowValue,
  type ColumnMapping,
} from "@/lib/column-mapper";

function parseDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const formats: Array<(s: string) => string | null> = [
    (s) => {
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (!m) return null;
      const [, month, day, year] = m;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    },
    (s) => {
      const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
      if (!m) return null;
      const [, year, month, day] = m;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    },
    (s) => {
      const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (!m) return null;
      const [, day, month, year] = m;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    },
    (s) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      return null;
    },
  ];

  for (const tryFormat of formats) {
    const result = tryFormat(trimmed);
    if (result) return result;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function cleanDescription(desc: string): string {
  return desc.trim().replace(/\s+/g, " ");
}

function applyProviderAmountLogic(
  amountVal: number,
  provider: CardProvider
): { amount: number; isRefund: boolean } {
  switch (provider) {
    case "CHASE_CREDIT":
    case "WELLS_FARGO_CREDIT":
      return {
        amount: Math.abs(amountVal),
        isRefund: amountVal > 0,
      };
    case "AMEX_CREDIT":
    case "APPLE_CARD":
      return {
        amount: Math.abs(amountVal),
        isRefund: amountVal < 0,
      };
    case "CAPITAL_ONE_CREDIT":
    case "DISCOVER_CREDIT":
    case "CITI_CREDIT":
      return {
        amount: Math.abs(amountVal),
        isRefund: amountVal < 0,
      };
    case "CUSTOM_GENERIC":
    default:
      return {
        amount: Math.abs(amountVal),
        isRefund: amountVal < 0,
      };
  }
}

export function detectCardProvider(
  headers: string[],
  mapping?: ColumnMapping | null
): CardProvider {
  const resolved = mapping ?? buildColumnMapping(headers);
  return resolved?.provider ?? "CUSTOM_GENERIC";
}

export function normalizeRow(
  row: RawTransactionRow,
  provider: CardProvider,
  mapping: ColumnMapping
): Omit<
  NormalizedTransaction,
  "id" | "status" | "selectedGroupId" | "selectedUserIds"
> | null {
  const date = parseDate(getRowValue(row, mapping.dateKey));
  const rawDescription = getRowValue(row, mapping.descriptionKey);
  const extracted = extractAmount(row, mapping);

  if (
    !date ||
    !rawDescription.trim() ||
    !extracted ||
    extracted.value === 0
  ) {
    return null;
  }

  const { amount, isRefund } =
    extracted.isRefundOverride !== undefined
      ? { amount: extracted.value, isRefund: extracted.isRefundOverride }
      : applyProviderAmountLogic(extracted.value, provider);

  const categoryRaw = mapping.categoryKey
    ? getRowValue(row, mapping.categoryKey)
    : "";

  return {
    date,
    description: cleanDescription(rawDescription),
    amount,
    rawDescription: rawDescription.trim(),
    isRefund,
    ...(categoryRaw.trim() ? { category: categoryRaw.trim() } : {}),
  };
}

export function createTransaction(
  partial: Omit<
    NormalizedTransaction,
    "id" | "status" | "selectedGroupId" | "selectedUserIds"
  >,
  groupId: string | null = null,
  userIds: string[] = []
): NormalizedTransaction {
  const hasAssignment = groupId !== null && userIds.length > 0;
  return {
    ...partial,
    id: crypto.randomUUID(),
    status: hasAssignment ? "READY" : "UNASSIGNED",
    selectedGroupId: groupId,
    selectedUserIds: userIds,
  };
}

export function sortTransactionsByDate(
  transactions: NormalizedTransaction[]
): NormalizedTransaction[] {
  return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
}

export { buildColumnMapping, type ColumnMapping };
