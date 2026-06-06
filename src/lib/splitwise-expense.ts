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

export async function createSplitwiseExpense(
  authHeader: string,
  input: SyncExpenseInput
): Promise<SyncExpenseResult> {
  const { amount, description, groupId, userIds, payerId } = input;

  const usersPayload = buildUsersPayload(amount, userIds, payerId);
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

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data?.errors?.base?.[0] ??
          data?.error ??
          `Splitwise API error (${response.status})`;
        return { success: false, error: errorMsg };
      }

      return { success: true, expense: data.expenses?.[0] };
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
