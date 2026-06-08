import type {
  GroceryRuleConfig,
  NormalizedTransaction,
  SplitwiseGroup,
} from "@/types";
import {
  DEFAULT_GROCERY_CATEGORY_KEYWORDS,
  DEFAULT_GROCERY_DESCRIPTION_KEYWORDS,
  getGroceryRuleConfig,
} from "@/lib/storage";
import { defaultUserShareMap } from "@/lib/user-shares";

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeKeywords(keywords: string[]): string[] {
  return keywords.map(normalizeForMatch).filter(Boolean);
}

export function isGroceryTransaction(
  tx: NormalizedTransaction,
  config: Pick<
    GroceryRuleConfig,
    "descriptionKeywords" | "categoryKeywords"
  > = {
    descriptionKeywords: DEFAULT_GROCERY_DESCRIPTION_KEYWORDS,
    categoryKeywords: DEFAULT_GROCERY_CATEGORY_KEYWORDS,
  }
): boolean {
  if (tx.isRefund) return false;

  const description = normalizeForMatch(tx.rawDescription);
  const category = tx.category ? normalizeForMatch(tx.category) : "";
  const descriptionKeywords = normalizeKeywords(config.descriptionKeywords);
  const categoryKeywords = normalizeKeywords(config.categoryKeywords);

  if (
    descriptionKeywords.some((keyword) =>
      description.includes(keyword)
    )
  ) {
    return true;
  }

  if (
    category &&
    categoryKeywords.some((keyword) => category.includes(keyword))
  ) {
    return true;
  }

  return false;
}

export function applyDefaultRules(
  transactions: NormalizedTransaction[],
  groups: SplitwiseGroup[]
): NormalizedTransaction[] {
  const groceryRule = getGroceryRuleConfig();
  const group = groups.find((g) => g.id.toString() === groceryRule.groupId);
  const groupMemberIds = new Set(group?.members.map((m) => m.id.toString()) ?? []);
  const ruleUserIds = groceryRule.userIds.filter((id) => groupMemberIds.has(id));

  if (
    !groceryRule.enabled ||
    !groceryRule.groupId ||
    !group ||
    ruleUserIds.length === 0
  ) {
    return transactions;
  }

  return transactions.map((tx) => {
    if (tx.status !== "UNASSIGNED" || tx.selectedGroupId) return tx;
    if (!isGroceryTransaction(tx, groceryRule)) return tx;

    const selectedUserIds = [...ruleUserIds];
    return {
      ...tx,
      selectedGroupId: groceryRule.groupId,
      selectedUserIds,
      userShares: defaultUserShareMap(selectedUserIds),
      status: "READY",
    };
  });
}
