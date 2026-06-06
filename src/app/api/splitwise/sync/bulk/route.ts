import { NextRequest, NextResponse } from "next/server";
import {
  createSplitwiseExpensesSerial,
  type SyncExpenseInput,
} from "@/lib/splitwise-expense";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  let body: { expenses?: SyncExpenseInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const expenses = body.expenses;
  if (!expenses?.length) {
    return NextResponse.json(
      { error: "No expenses provided" },
      { status: 400 }
    );
  }

  for (const expense of expenses) {
    if (
      !expense.amount ||
      !expense.description ||
      !expense.groupId ||
      !expense.userIds?.length ||
      !expense.payerId
    ) {
      return NextResponse.json(
        { error: "Each expense must include amount, description, groupId, userIds, and payerId" },
        { status: 400 }
      );
    }
  }

  const results = await createSplitwiseExpensesSerial(authHeader, expenses);

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;

  return NextResponse.json({
    results,
    succeeded,
    failed,
    total: results.length,
  });
}
