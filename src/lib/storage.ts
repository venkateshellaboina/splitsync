import type { AutomationRules, EmailSettings, GroceryRuleConfig } from "@/types";

const TOKEN_KEY = "splitsync_token";
const RULES_KEY = "splitsync_automation_rules";
const GROCERY_RULE_KEY = "splitsync_grocery_rule";
const EMAIL_SETTINGS_KEY = "splitsync_email_settings";
const EMAIL_APP_PASSWORD_KEY = "splitsync_email_app_password";

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

// The app password is stored under its own key, exactly like the Splitwise
// token above — never bundled into the settings blob with the rest of the
// (non-sensitive) email settings.
export function getStoredEmailAppPassword(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(EMAIL_APP_PASSWORD_KEY);
}

export function setStoredEmailAppPassword(appPassword: string): void {
  localStorage.setItem(EMAIL_APP_PASSWORD_KEY, appPassword);
}

export function getStoredEmailSettings(): EmailSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(EMAIL_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Omit<EmailSettings, "appPassword">;
    return { ...parsed, appPassword: getStoredEmailAppPassword() ?? "" };
  } catch {
    return null;
  }
}

export function setStoredEmailSettings(settings: EmailSettings): void {
  const { appPassword, ...rest } = settings;
  localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(rest));
  setStoredEmailAppPassword(appPassword);
}
