import type { CardProvider, RawTransactionRow } from "@/types";

export interface ColumnMapping {
  dateKey: string;
  descriptionKey: string;
  categoryKey: string | null;
  amountKey: string | null;
  debitKey: string | null;
  creditKey: string | null;
  provider: CardProvider;
}

function cleanHeader(header: string): string {
  return header.replace(/^\ufeff/, "").trim();
}

function headerMatches(header: string, candidates: string[]): boolean {
  const h = header.toLowerCase();
  return candidates.some(
    (c) => h === c || h.includes(c) || c.includes(h)
  );
}

function findHeader(
  headers: string[],
  prefer: string[],
  avoid: string[] = []
): string | null {
  const cleaned = headers.map(cleanHeader);

  for (const candidate of prefer) {
    const match = cleaned.find((h) => h.toLowerCase() === candidate);
    if (match) return match;
  }

  for (const candidate of prefer) {
    const match = cleaned.find((h) =>
      h.toLowerCase().includes(candidate)
    );
    if (match && !avoid.some((a) => match.toLowerCase().includes(a))) {
      return match;
    }
  }

  return null;
}

export function buildColumnMapping(headers: string[]): ColumnMapping | null {
  const cleaned = headers.map(cleanHeader).filter(Boolean);
  if (cleaned.length === 0) return null;

  const dateKey =
    findHeader(cleaned, [
      "transaction date",
      "trans date",
      "txn date",
      "purchase date",
      "date of transaction",
      "activity date",
      "posted date",
      "post date",
      "posting date",
      "date",
    ]) ?? cleaned[0];

  const descriptionKey =
    findHeader(cleaned, [
      "description",
      "merchant",
      "merchant name",
      "vendor",
      "payee",
      "name",
      "details",
      "transaction description",
      "merchant/description",
      "memo",
    ]) ?? cleaned[1] ?? cleaned[0];

  const categoryKey = findHeader(cleaned, [
    "category",
    "merchant category",
    "transaction type",
    "type",
  ]);

  const amountKey = findHeader(cleaned, [
    "amount",
    "transaction amount",
    "total",
    "sum",
    "value",
  ]);

  const debitKey = findHeader(cleaned, ["debit", "debit amount", "withdrawal"]);
  const creditKey = findHeader(cleaned, [
    "credit",
    "credit amount",
    "deposit",
  ]);

  if (!amountKey && !debitKey && !creditKey) return null;

  const dateLower = dateKey.toLowerCase();
  let provider: CardProvider = "CUSTOM_GENERIC";

  const hasDebitCredit =
    debitKey !== null &&
    creditKey !== null &&
    !amountKey;

  if (
    hasDebitCredit &&
    dateLower.includes("transaction date") &&
    cleaned.some((h) => headerMatches(h, ["description"]))
  ) {
    provider = "CAPITAL_ONE_CREDIT";
  } else if (
    dateLower.includes("transaction date") ||
    (headerMatches(dateKey, ["transaction date"]) &&
      cleaned.some((h) => headerMatches(h, ["description"])) &&
      cleaned.some((h) => headerMatches(h, ["amount"])))
  ) {
    provider = "CHASE_CREDIT";
  } else if (
    headerMatches(dateKey, ["date"]) &&
    !dateLower.includes("transaction") &&
    !dateLower.includes("post") &&
    cleaned.some((h) => headerMatches(h, ["description"])) &&
    (amountKey || debitKey || creditKey)
  ) {
    provider = "AMEX_CREDIT";
  }

  return {
    dateKey,
    descriptionKey,
    categoryKey,
    amountKey,
    debitKey,
    creditKey,
    provider,
  };
}

export function getRowValue(row: RawTransactionRow, key: string): string {
  if (row[key] !== undefined) return row[key];

  const target = key.toLowerCase().trim();
  for (const [k, v] of Object.entries(row)) {
    if (k.replace(/^\ufeff/, "").trim().toLowerCase() === target) {
      return v;
    }
  }

  return "";
}

export interface ExtractedAmount {
  value: number;
  /** Set when amount comes from separate debit/credit columns */
  isRefundOverride?: boolean;
}

export function extractAmount(
  row: RawTransactionRow,
  mapping: ColumnMapping
): ExtractedAmount | null {
  const debitRaw = mapping.debitKey
    ? getRowValue(row, mapping.debitKey)
    : "";
  const creditRaw = mapping.creditKey
    ? getRowValue(row, mapping.creditKey)
    : "";

  const debit = parseAmountString(debitRaw);
  const credit = parseAmountString(creditRaw);

  if (debit !== null && debit !== 0) {
    return { value: Math.abs(debit), isRefundOverride: false };
  }
  if (credit !== null && credit !== 0) {
    return { value: Math.abs(credit), isRefundOverride: true };
  }

  if (mapping.amountKey) {
    const parsed = parseAmountString(getRowValue(row, mapping.amountKey));
    if (parsed !== null) return { value: parsed };
  }

  return null;
}

function parseAmountString(value: string): number | null {
  const raw = value.trim();
  if (!raw || raw === "-") return null;

  const isNegative =
    raw.startsWith("-") ||
    raw.endsWith("-") ||
    raw.includes("(") ||
    raw.toLowerCase().includes("cr");

  const cleaned = raw
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .replace(/[$,\s]/g, "")
    .replace(/cr$/i, "")
    .replace(/^-|-$/g, "");

  if (!cleaned) return null;

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  return isNegative ? -Math.abs(num) : num;
}
