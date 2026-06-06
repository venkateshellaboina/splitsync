import type { AutomationRules, NormalizedTransaction } from "@/types";

export function findMatchingRule(
  rawDescription: string,
  rules: AutomationRules
): { groupId: string; userIds: string[] } | null {
  const lowerDesc = rawDescription.toLowerCase();

  for (const [keyword, rule] of Object.entries(rules)) {
    if (lowerDesc.includes(keyword.toLowerCase())) {
      return rule;
    }
  }

  return null;
}

export function applyRulesToTransactions(
  transactions: NormalizedTransaction[],
  rules: AutomationRules
): NormalizedTransaction[] {
  return transactions.map((tx) => {
    const match = findMatchingRule(tx.rawDescription, rules);
    if (!match) return tx;

    return {
      ...tx,
      selectedGroupId: match.groupId,
      selectedUserIds: [...match.userIds],
      status: "READY",
    };
  });
}

export function extractMerchantKeyword(rawDescription: string): string {
  const cleaned = rawDescription.trim();
  const words = cleaned.split(/\s+/);
  return words.slice(0, 3).join(" ").toLowerCase();
}
