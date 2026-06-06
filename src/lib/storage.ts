import type { AutomationRules } from "@/types";

const TOKEN_KEY = "splitsync_token";
const RULES_KEY = "splitsync_automation_rules";

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

export function saveOrUpdateRule(
  merchantKeyword: string,
  groupId: string,
  userIds: string[]
): void {
  const rules = getAutomationRules();
  rules[merchantKeyword] = { groupId, userIds };
  setAutomationRules(rules);
}
