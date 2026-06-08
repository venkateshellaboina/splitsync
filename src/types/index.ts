export type CardProvider =
  | "CHASE_CREDIT"
  | "AMEX_CREDIT"
  | "CAPITAL_ONE_CREDIT"
  | "APPLE_CARD"
  | "WELLS_FARGO_CREDIT"
  | "CUSTOM_GENERIC";

export interface RawTransactionRow {
  [key: string]: string;
}

export interface NormalizedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  rawDescription: string;
  status:
    | "UNASSIGNED"
    | "READY"
    | "SYNCING"
    | "SUCCESS"
    | "IGNORED"
    | "ERROR";
  isRefund: boolean;
  category?: string;
  selectedGroupId: string | null;
  selectedUserIds: string[];
  /** Share weights per selected member. Defaults to 1 each. */
  userShares?: Record<string, number>;
  /** When set, used as the Splitwise expense description instead of the default. */
  syncDescriptionOverride?: string;
  /** Set when a synced transaction is reopened for editing. */
  previouslySyncedAt?: string;
  errorMessage?: string;
}

export interface SplitwiseMember {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
}

export interface SplitwiseGroup {
  id: number;
  name: string;
  updated_at: string;
  members: SplitwiseMember[];
}

export interface SplitwiseCurrentUser {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
}

export interface AutomationRule {
  groupId: string;
  userIds: string[];
}

export interface AutomationRules {
  [merchantKeyword: string]: AutomationRule;
}

export interface GroceryRuleConfig {
  enabled: boolean;
  groupId: string | null;
  userIds: string[];
  descriptionKeywords: string[];
  categoryKeywords: string[];
}

export interface SyncExpensePayload {
  amount: number;
  description: string;
  groupId: string;
  userIds: number[];
  userShares?: number[];
  payerId: number;
}
