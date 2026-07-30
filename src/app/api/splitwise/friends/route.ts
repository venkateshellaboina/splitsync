import { NextRequest, NextResponse } from "next/server";
import type { SplitwiseMember } from "@/types";

const SPLITWISE_BASE = "https://secure.splitwise.com/api/v3.0";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${SPLITWISE_BASE}/get_friends`, {
      headers: { Authorization: authHeader },
    });

    if (res.status === 429) {
      return NextResponse.json(
        { error: "Rate Limit Hit: Try again in 5 seconds" },
        { status: 429 }
      );
    }

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Splitwise API error: ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const friends: SplitwiseMember[] = (data.friends ?? []).map(
      (f: {
        id: number;
        first_name: string;
        last_name: string | null;
        email: string;
        balance?: { currency_code: string; amount: string }[];
      }) => ({
        id: f.id,
        first_name: f.first_name,
        last_name: f.last_name,
        email: f.email,
        balances: (f.balance ?? []).map((b) => ({
          currencyCode: b.currency_code,
          amount: parseFloat(b.amount),
        })),
      })
    );

    return NextResponse.json({ friends });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
