export type CardProvider =
  | "CHASE_CREDIT"
  | "AMEX_CREDIT"
  | "CAPITAL_ONE_CREDIT"
  | "APPLE_CARD"
  | "WELLS_FARGO_CREDIT"
  | "DISCOVER_CREDIT"
  | "CITI_CREDIT"
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
  /** Id of the UploadedCsvFile this transaction came from, if any. */
  sourceFileId?: string;
  /** Human-readable card/bank label (e.g. "Chase", "Manual"), shown in the Card column. */
  cardLabel?: string;
  /** Checkbox state — also determines Bulk Add inclusion. Auto-set true once a group and members are assigned. */
  selected?: boolean;
}

export interface UploadedCsvFile {
  id: string;
  name: string;
  size: number;
  provider: CardProvider;
  transactionCount: number;
  uploadedAt: string;
  contentHash: string;
}

export interface SplitwiseBalance {
  currencyCode: string;
  /** Positive = this friend owes the current user. Negative = the current user owes this friend. */
  amount: number;
}

export interface SplitwiseMember {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  /** Only populated for friends (via /get_friends), not group members. */
  balances?: SplitwiseBalance[];
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

export type EmailProviderId = "gmail" | "outlook" | "yahoo" | "icloud" | "custom";

export interface EmailSettings {
  provider: EmailProviderId;
  email: string;
  appPassword: string;
  host: string;
  port: number;
}
