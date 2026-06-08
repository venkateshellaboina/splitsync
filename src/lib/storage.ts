import type { AutomationRules, GroceryRuleConfig } from "@/types";

const TOKEN_KEY = "splitsync_token";
const RULES_KEY = "splitsync_automation_rules";
const GROCERY_RULE_KEY = "splitsync_grocery_rule";

export const DEFAULT_GROCERY_DESCRIPTION_KEYWORDS = [
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

export const DEFAULT_GROCERY_CATEGORY_KEYWORDS = [
  "grocery",
  "groceries",
  "supermarket",
];

export const DEFAULT_GROCERY_RULE_CONFIG: GroceryRuleConfig = {
  enabled: false,
  groupId: null,
  userIds: [],
  descriptionKeywords: DEFAULT_GROCERY_DESCRIPTION_KEYWORDS,
  categoryKeywords: DEFAULT_GROCERY_CATEGORY_KEYWORDS,
};

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAutomationRules(): AutomationRules {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(RULES_KEY);
    return raw ? (JSON.parse(raw) as AutomationRules) : {};
  } catch {
    return {};
  }
}

export function setAutomationRules(rules: AutomationRules): void {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function getGroceryRuleConfig(): GroceryRuleConfig {
  if (typeof window === "undefined") return DEFAULT_GROCERY_RULE_CONFIG;
  try {
    const raw = localStorage.getItem(GROCERY_RULE_KEY);
    if (!raw) return DEFAULT_GROCERY_RULE_CONFIG;

    const parsed = JSON.parse(raw) as Partial<GroceryRuleConfig>;
    return {
      ...DEFAULT_GROCERY_RULE_CONFIG,
      ...parsed,
      groupId: parsed.groupId ?? null,
      userIds: Array.isArray(parsed.userIds) ? parsed.userIds : [],
      descriptionKeywords: Array.isArray(parsed.descriptionKeywords)
        ? parsed.descriptionKeywords
        : DEFAULT_GROCERY_DESCRIPTION_KEYWORDS,
      categoryKeywords: Array.isArray(parsed.categoryKeywords)
        ? parsed.categoryKeywords
        : DEFAULT_GROCERY_CATEGORY_KEYWORDS,
    };
  } catch {
    return DEFAULT_GROCERY_RULE_CONFIG;
  }
}

export function setGroceryRuleConfig(config: GroceryRuleConfig): void {
  localStorage.setItem(GROCERY_RULE_KEY, JSON.stringify(config));
}

export function saveOrUpdateRule(
  merchantKeyword: string,
  groupId: string,
  userIds: string[]
): void {
  const rules = getAutomationRules();
  rules[merchantKeyword] = { groupId, userIds };
  setAutomationRules(rules);
}
