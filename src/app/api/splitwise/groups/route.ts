import { NextRequest, NextResponse } from "next/server";
import type { SplitwiseGroup, SplitwiseCurrentUser } from "@/types";

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
    const [groupsRes, userRes] = await Promise.all([
      fetch(`${SPLITWISE_BASE}/get_groups`, {
        headers: { Authorization: authHeader },
      }),
      fetch(`${SPLITWISE_BASE}/get_current_user`, {
        headers: { Authorization: authHeader },
      }),
    ]);

    if (groupsRes.status === 429 || userRes.status === 429) {
      return NextResponse.json(
        { error: "Rate Limit Hit: Try again in 5 seconds" },
        { status: 429 }
      );
    }

    if (!groupsRes.ok) {
      const text = await groupsRes.text();
      return NextResponse.json(
        { error: `Splitwise API error: ${text}` },
        { status: groupsRes.status }
      );
    }

    const groupsData = await groupsRes.json();
    const groups: SplitwiseGroup[] = (groupsData.groups ?? []).map(
      (g: {
        id: number;
        name: string;
        updated_at: string;
        members: SplitwiseGroup["members"];
      }) => ({
        id: g.id,
        name: g.name,
        updated_at: g.updated_at,
        members: g.members ?? [],
      })
    );

    let currentUser: SplitwiseCurrentUser | null = null;
    if (userRes.ok) {
      const userData = await userRes.json();
      const u = userData.user;
      if (u) {
        currentUser = {
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
        };
      }
    }

    return NextResponse.json({ groups, currentUser });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
