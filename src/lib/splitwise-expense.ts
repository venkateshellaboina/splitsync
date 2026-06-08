import {
  buildUsersPayload,
  toFormUrlEncoded,
} from "@/lib/share-calculation";

const SPLITWISE_BASE = "https://secure.splitwise.com/api/v3.0";

export interface SyncExpenseInput {
  amount: number;
  description: string;
  groupId: string;
  userIds: number[];
  userShares?: number[];
  payerId: number;
}

export interface SyncExpenseResult {
  success: boolean;
  error?: string;
  expense?: unknown;
}

const RATE_LIMIT_RETRY_MS = 5000;
const MAX_RETRIES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Splitwise returns `errors: {}` on success — only treat non-empty errors as failure. */
function extractSplitwiseError(data: Record<string, unknown>): string | null {
  const errors = data.errors;
  if (errors == null) return null;

  if (Array.isArray(errors)) {
    return errors.length > 0 ? String(errors[0]) : null;
  }

  if (typeof errors !== "object") {
    return String(errors);
  }

  const record = errors as Record<string, unknown>;
  const entries = Object.entries(record);
  if (entries.length === 0) return null;

  for (const [, value] of entries) {
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return JSON.stringify(errors);
}

export async function createSplitwiseExpense(
  authHeader: string,
  input: SyncExpenseInput
): Promise<SyncExpenseResult> {
  const { amount, description, groupId, userIds, userShares, payerId } = input;

  const usersPayload = buildUsersPayload(
    amount,
    userIds,
    payerId,
    userShares
  );
  // Omit `date` so Splitwise records the expense at sync time, not the card date.
  const formBody = toFormUrlEncoded({
    cost: amount.toFixed(2),
    description,
    group_id: groupId,
    currency_code: "USD",
    ...usersPayload,
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${SPLITWISE_BASE}/create_expense`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody,
      });

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          await delay(RATE_LIMIT_RETRY_MS);
          continue;
        }
        return {
          success: false,
          error: "Rate Limit Hit: Try again in 5 seconds",
        };
      }

      const data = (await response.json()) as Record<string, unknown>;

      const errorMsg = extractSplitwiseError(data);
      if (errorMsg) {
        return { success: false, error: errorMsg };
      }

      if (!response.ok) {
        return {
          success: false,
          error:
            (typeof data.error === "string" ? data.error : null) ??
            `Splitwise API error (${response.status})`,
        };
      }

      const expenses = data.expenses;
      const expense = Array.isArray(expenses) ? expenses[0] : undefined;
      if (!expense) {
        return {
          success: false,
          error: "Splitwise accepted the request but returned no expense",
        };
      }

      return { success: true, expense };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: message };
    }
  }

  return {
    success: false,
    error: "Rate Limit Hit: Try again in 5 seconds",
  };
}

export async function createSplitwiseExpensesSerial(
  authHeader: string,
  expenses: SyncExpenseInput[]
): Promise<SyncExpenseResult[]> {
  const results: SyncExpenseResult[] = [];

  for (const expense of expenses) {
    const result = await createSplitwiseExpense(authHeader, expense);
    results.push(result);
  }

  return results;
}
