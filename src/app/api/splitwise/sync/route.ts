import { NextRequest, NextResponse } from "next/server";
import {
  createSplitwiseExpense,
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

  let body: SyncExpenseInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { amount, description, groupId, userIds, payerId } = body;

  if (
    !amount ||
    !description ||
    !groupId ||
    !userIds?.length ||
    !payerId
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const result = await createSplitwiseExpense(authHeader, body);

  if (!result.success) {
    const status = result.error?.includes("Rate Limit") ? 429 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ success: true, expense: result.expense });
}
