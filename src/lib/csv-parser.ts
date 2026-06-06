import Papa from "papaparse";
import type { CardProvider, NormalizedTransaction } from "@/types";
import {
  buildColumnMapping,
  createTransaction,
  detectCardProvider,
  normalizeRow,
} from "@/lib/normalize";
import { applyRulesToTransactions } from "@/lib/rules";
import { getAutomationRules } from "@/lib/storage";

export interface ParseResult {
  transactions: NormalizedTransaction[];
  provider: CardProvider;
  errors: string[];
  detectedColumns?: string[];
}

const HEADER_HINTS = [
  "transaction date",
  "date",
  "description",
  "amount",
  "debit",
  "credit",
  "merchant",
  "payee",
];

function cleanCell(value: string): string {
  return value.replace(/^\ufeff/, "").trim();
}

function scoreHeaderRow(cells: string[]): number {
  const lower = cells.map((c) => cleanCell(c).toLowerCase());
  return lower.filter((c) =>
    HEADER_HINTS.some((hint) => c.includes(hint))
  ).length;
}

function findHeaderRowIndex(rows: string[][]): number {
  let bestIndex = 0;
  let bestScore = 0;

  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const score = scoreHeaderRow(rows[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestScore >= 2 ? bestIndex : 0;
}

function parseRawCsv(text: string): string[][] {
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
  });
  return result.data.map((row) => row.map(cleanCell));
}

function rowsToObjects(
  headers: string[],
  dataRows: string[][]
): Record<string, string>[] {
  return dataRows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (header) obj[header] = row[i] ?? "";
    });
    return obj;
  });
}

function parseCsvText(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const rawRows = parseRawCsv(text);
  if (rawRows.length === 0) return { headers: [], rows: [] };

  const headerIndex = findHeaderRowIndex(rawRows);
  const headers = rawRows[headerIndex].map(cleanCell).filter(Boolean);
  const dataRows = rawRows.slice(headerIndex + 1);

  return {
    headers,
    rows: rowsToObjects(headers, dataRows),
  };
}

function processParsedData(
  headers: string[],
  rows: Record<string, string>[]
): ParseResult {
  const mapping = buildColumnMapping(headers);

  if (!mapping) {
    return {
      transactions: [],
      provider: "CUSTOM_GENERIC",
      errors: [
        `Could not detect columns. Found headers: ${headers.join(", ")}`,
      ],
      detectedColumns: headers,
    };
  }

  const provider = detectCardProvider(headers, mapping);
  const errors: string[] = [];
  const transactions: NormalizedTransaction[] = [];
  let skipped = 0;

  for (const row of rows) {
    const normalized = normalizeRow(row, provider, mapping);
    if (!normalized) {
      skipped++;
      if (errors.length < 5) {
        errors.push(
          `Skipped row (date="${getPreview(row, mapping.dateKey)}", desc="${getPreview(row, mapping.descriptionKey)}")`
        );
      }
      continue;
    }
    transactions.push(createTransaction(normalized));
  }

  if (transactions.length === 0 && rows.length > 0) {
    errors.unshift(
      `Mapped columns: date="${mapping.dateKey}", description="${mapping.descriptionKey}", amount="${mapping.amountKey ?? mapping.debitKey ?? mapping.creditKey}" (${provider.replace(/_/g, " ")})`
    );
  } else if (skipped > 5) {
    errors.push(`...and ${skipped - 5} more skipped rows`);
  }

  const rules = getAutomationRules();
  const withRules = applyRulesToTransactions(transactions, rules);

  return {
    transactions: withRules,
    provider,
    errors,
    detectedColumns: headers,
  };
}

export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== "string") {
        resolve({
          transactions: [],
          provider: "CUSTOM_GENERIC",
          errors: ["Failed to read file"],
        });
        return;
      }

      const { headers, rows } = parseCsvText(text);
      resolve(processParsedData(headers, rows));
    };

    reader.onerror = () => {
      resolve({
        transactions: [],
        provider: "CUSTOM_GENERIC",
        errors: ["Failed to read file"],
      });
    };

    reader.readAsText(file);
  });
}

function getPreview(
  row: Record<string, string>,
  key: string
): string {
  const val =
    row[key] ??
    Object.entries(row).find(
      ([k]) => k.toLowerCase() === key.toLowerCase()
    )?.[1];
  return (val ?? "").slice(0, 30);
}
