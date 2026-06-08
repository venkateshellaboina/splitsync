import type { NormalizedTransaction, SplitwiseGroup } from "@/types";
import { defaultUserShareMap } from "@/lib/user-shares";
import { memberDisplayName } from "@/lib/utils";

const PARKSIDERS_GROUP_NAME = "parksiders";

const PARKSIDERS_MEMBER_NAMES = ["venky", "sai deepak", "prateek"];

const GROCERY_DESCRIPTION_KEYWORDS = [
  "instacart",
  "costco",
  "whole foods",
  "trader joe",
  "kroger",
  "safeway",
  "aldi",
  "publix",
  "wegmans",
  "grocery",
  "supermarket",
  "food market",
  "fresh market",
  "stop & shop",
  "shoprite",
  "heb",
  "sprouts",
  "amazon fresh",
  "freshdirect",
];

const GROCERY_CATEGORY_KEYWORDS = ["grocery", "groceries", "supermarket"];

export interface ParksidersAssignment {
  groupId: string;
  userIds: string[];
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function memberMatchesName(
  member: SplitwiseGroup["members"][number],
  targetName: string
): boolean {
  const target = normalizeForMatch(targetName);
  const fullName = normalizeForMatch(
    memberDisplayName(member.first_name, member.last_name)
  );
  const firstName = normalizeForMatch(member.first_name);

  return (
    fullName === target ||
    firstName === target ||
    fullName.includes(target) ||
    target.includes(firstName)
  );
}

export function resolveParksidersAssignment(
  groups: SplitwiseGroup[]
): ParksidersAssignment | null {
  const group = groups.find((g) =>
    g.name.toLowerCase().includes(PARKSIDERS_GROUP_NAME)
  );
  if (!group) return null;

  const userIds: string[] = [];

  for (const name of PARKSIDERS_MEMBER_NAMES) {
    const member = group.members.find((m) => memberMatchesName(m, name));
    if (!member) return null;
    userIds.push(member.id.toString());
  }

  return {
    groupId: group.id.toString(),
    userIds,
  };
}

export function isGroceryTransaction(tx: NormalizedTransaction): boolean {
  if (tx.isRefund) return false;

  const description = normalizeForMatch(tx.rawDescription);
  const category = tx.category ? normalizeForMatch(tx.category) : "";

  if (
    GROCERY_DESCRIPTION_KEYWORDS.some((keyword) =>
      description.includes(keyword)
    )
  ) {
    return true;
  }

  if (
    category &&
    GROCERY_CATEGORY_KEYWORDS.some((keyword) => category.includes(keyword))
  ) {
    return true;
  }

  return false;
}

export function applyDefaultRules(
  transactions: NormalizedTransaction[],
  groups: SplitwiseGroup[]
): NormalizedTransaction[] {
  const parksiders = resolveParksidersAssignment(groups);
  if (!parksiders) return transactions;

  return transactions.map((tx) => {
    if (tx.status !== "UNASSIGNED" || tx.selectedGroupId) return tx;
    if (!isGroceryTransaction(tx)) return tx;

    const selectedUserIds = [...parksiders.userIds];
    return {
      ...tx,
      selectedGroupId: parksiders.groupId,
      selectedUserIds,
      userShares: defaultUserShareMap(selectedUserIds),
      status: "READY",
    };
  });
}
