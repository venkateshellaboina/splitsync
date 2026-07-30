"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import type { EmailProviderId, EmailSettings, GroceryRuleConfig } from "@/types";
import { useApp } from "@/context/AppContext";
import { GroupSelector } from "@/components/GroupSelector";
import { MemberMultiSelect } from "@/components/MemberMultiSelect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAutomationRules,
  getGroceryRuleConfig,
  setGroceryRuleConfig,
} from "@/lib/storage";
import {
  detectProviderFromEmail,
  PROVIDER_LABELS,
  PROVIDER_PRESETS,
} from "@/lib/email-provider";
import {
  clearSyncedHistory,
  getSyncedCount,
} from "@/lib/synced-history";
import {
  clearSyncedReminders,
  getSyncedReminderCount,
} from "@/lib/synced-reminders";
import { memberDisplayName } from "@/lib/utils";

function formatKeywords(keywords: string[]): string {
  return keywords.join(", ");
}

function parseKeywords(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  provider: "gmail",
  email: "",
  appPassword: "",
  host: PROVIDER_PRESETS.gmail?.host ?? "",
  port: PROVIDER_PRESETS.gmail?.port ?? 587,
};

const NOTICE_TIMEOUT_MS = 10_000;

export function SettingsPanel() {
  const {
    token,
    setToken,
    refreshGroups,
    isLoadingGroups,
    groupsError,
    groups,
    currentUser,
    emailSettings,
    setEmailSettings,
  } = useApp();
  const splitwiseEmail = currentUser?.email ?? "";
  const splitwiseProvider = splitwiseEmail
    ? detectProviderFromEmail(splitwiseEmail)
    : null;
  const [showToken, setShowToken] = useState(false);
  const [localToken, setLocalToken] = useState(token);
  const [syncedCount, setSyncedCount] = useState(getSyncedCount);
  const [syncedReminderCount, setSyncedReminderCount] = useState(
    getSyncedReminderCount
  );
  const [groceryRule, setGroceryRule] = useState(getGroceryRuleConfig);
  const [grocerySaved, setGrocerySaved] = useState(false);
  const rules = getAutomationRules();
  const ruleEntries = Object.entries(rules);
  const selectedGroceryGroup = groups.find(
    (group) => group.id.toString() === groceryRule.groupId
  );

  const [localEmail, setLocalEmail] = useState<EmailSettings>(
    () => emailSettings ?? DEFAULT_EMAIL_SETTINGS
  );
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const savedNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedNoticeTimerRef.current) clearTimeout(savedNoticeTimerRef.current);
      if (testNoticeTimerRef.current) clearTimeout(testNoticeTimerRef.current);
    };
  }, []);

  // Keep the form in sync with context (e.g. once auto-fill populates it
  // after Splitwise data loads) without an effect: adjust state during
  // render, guarded so it only reacts to an actual change in emailSettings.
  const [syncedFrom, setSyncedFrom] = useState(emailSettings);
  if (emailSettings !== syncedFrom) {
    setSyncedFrom(emailSettings);
    if (emailSettings) setLocalEmail(emailSettings);
  }

  const handleSave = () => {
    const trimmed = localToken.trim();
    if (trimmed === token) return;
    setToken(trimmed);
  };

  const updateGroceryRule = (updates: Partial<GroceryRuleConfig>) => {
    setGrocerySaved(false);
    setGroceryRule((prev) => ({ ...prev, ...updates }));
  };

  const handleGroceryGroupChange = (groupId: string | null) => {
    const group = groups.find((g) => g.id.toString() === groupId);
    const userIds = group ? group.members.map((member) => member.id.toString()) : [];
    updateGroceryRule({ groupId, userIds });
  };

  const handleGrocerySave = () => {
    setGroceryRuleConfig(groceryRule);
    setGrocerySaved(true);
  };

  const handleProviderChange = (provider: EmailProviderId) => {
    const preset = PROVIDER_PRESETS[provider];
    setEmailSaved(false);
    setLocalEmail((prev) => ({
      ...prev,
      provider,
      host: preset?.host ?? prev.host,
      port: preset?.port ?? prev.port,
      // Restore the Splitwise account's email when switching back to its
      // provider; clear it when switching away so a stale address from a
      // different provider isn't left behind.
      email: provider === splitwiseProvider ? splitwiseEmail : "",
    }));
  };

  const handleSaveEmailSettings = () => {
    const current = emailSettings ?? DEFAULT_EMAIL_SETTINGS;
    const unchanged =
      localEmail.provider === current.provider &&
      localEmail.email === current.email &&
      localEmail.host === current.host &&
      localEmail.port === current.port &&
      localEmail.appPassword === current.appPassword;
    if (unchanged) return;

    setEmailSettings(localEmail);
    setEmailSaved(true);
    if (savedNoticeTimerRef.current) clearTimeout(savedNoticeTimerRef.current);
    savedNoticeTimerRef.current = setTimeout(
      () => setEmailSaved(false),
      NOTICE_TIMEOUT_MS
    );
  };

  const handleSendTest = async () => {
    setTestStatus("sending");
    setTestError(null);
    if (testNoticeTimerRef.current) clearTimeout(testNoticeTimerRef.current);

    const finishWithNotice = (status: "success" | "error", error?: string) => {
      setTestStatus(status);
      setTestError(error ?? null);
      testNoticeTimerRef.current = setTimeout(() => {
        setTestStatus("idle");
        setTestError(null);
      }, NOTICE_TIMEOUT_MS);
    };

    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp: {
            host: localEmail.host,
            port: localEmail.port,
            email: localEmail.email,
            appPassword: localEmail.appPassword,
          },
          to: localEmail.email,
          subject: "SplitSync test email",
          body: "This is a test email from SplitSync to confirm your Email Reminders setup is working.",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        finishWithNotice("error", data.error ?? "Failed to send test email");
        return;
      }
      finishWithNotice("success");
    } catch (err) {
      finishWithNotice(
        "error",
        err instanceof Error ? err.message : "Failed to send test email"
      );
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Splitwise Credentials</h2>
        <p className="text-sm text-muted-foreground">
          Enter your Splitwise Personal Access Token. It is stored locally in
          your browser and never committed to source control.
        </p>
        <div className="space-y-2">
          <Label htmlFor="token">Personal Access Token</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                value={localToken}
                onChange={(e) => setLocalToken(e.target.value)}
                placeholder="Enter your Splitwise developer token"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshGroups}
            disabled={!token || isLoadingGroups}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoadingGroups ? "animate-spin" : ""}`}
            />
            Refresh Groups
          </Button>
          {token && (
            <span className="text-sm text-muted-foreground">
              {groups.length} group{groups.length !== 1 ? "s" : ""} loaded
            </span>
          )}
        </div>
        {groupsError && (
          <p className="text-sm text-danger-foreground">{groupsError}</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Synced Transactions</h2>
        <p className="text-sm text-muted-foreground">
          Successfully synced transactions are remembered locally so re-uploading
          the same CSV won&apos;t prompt you to sync them again.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {syncedCount} transaction{syncedCount !== 1 ? "s" : ""} in history
          </span>
          {syncedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearSyncedHistory();
                setSyncedCount(0);
              }}
            >
              Clear history
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Automation Rules</h2>
        <p className="text-sm text-muted-foreground">
          Configure grocery auto-assignment for your own Splitwise group. Saved
          merchant rules below are applied when you sync a transaction.
        </p>

        <div className="space-y-4 rounded-md border border-border p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Grocery auto-assignment</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Matching grocery transactions will be assigned to this group and
                member set when a CSV is uploaded.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={groceryRule.enabled}
                onCheckedChange={(checked) =>
                  updateGroceryRule({ enabled: checked === true })
                }
              />
              Enabled
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Group</Label>
              <GroupSelector
                groups={groups}
                value={groceryRule.groupId}
                onChange={handleGroceryGroupChange}
                disabled={groups.length === 0}
              />
            </div>
            <div className="space-y-2">
              <Label>Members</Label>
              <MemberMultiSelect
                members={selectedGroceryGroup?.members ?? []}
                selectedUserIds={groceryRule.userIds}
                onChange={(userIds) => updateGroceryRule({ userIds })}
                disabled={!selectedGroceryGroup}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grocery-description-keywords">
              Description keywords
            </Label>
            <textarea
              id="grocery-description-keywords"
              value={formatKeywords(groceryRule.descriptionKeywords)}
              onChange={(e) =>
                updateGroceryRule({
                  descriptionKeywords: parseKeywords(e.target.value),
                })
              }
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="costco, instacart, whole foods"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grocery-category-keywords">Category keywords</Label>
            <Input
              id="grocery-category-keywords"
              value={formatKeywords(groceryRule.categoryKeywords)}
              onChange={(e) =>
                updateGroceryRule({
                  categoryKeywords: parseKeywords(e.target.value),
                })
              }
              placeholder="grocery, groceries, supermarket"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleGrocerySave}
              disabled={
                groceryRule.enabled &&
                (!groceryRule.groupId || groceryRule.userIds.length === 0)
              }
            >
              Save grocery rule
            </Button>
            {grocerySaved && (
              <span className="text-xs text-success-foreground">Saved</span>
            )}
            {groceryRule.enabled &&
              (!groceryRule.groupId || groceryRule.userIds.length === 0) && (
                <span className="text-xs text-warning-foreground">
                  Choose a group and at least one member.
                </span>
              )}
          </div>
        </div>

        {ruleEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No rules saved yet.</p>
        ) : (
          <div className="rounded-md border border-border divide-y divide-border">
            {ruleEntries.map(([keyword, rule]) => (
              <div key={keyword} className="px-4 py-3 text-sm">
                <span className="font-medium">{keyword}</span>
                <span className="text-muted-foreground mx-2">→</span>
                <span className="text-muted-foreground">
                  {groups.find((group) => group.id.toString() === rule.groupId)
                    ?.name ?? `Group ${rule.groupId}`}
                  ,{" "}
                  {rule.userIds
                    .map((userId) => {
                      const group = groups.find(
                        (g) => g.id.toString() === rule.groupId
                      );
                      const member = group?.members.find(
                        (m) => m.id.toString() === userId
                      );
                      return member
                        ? memberDisplayName(member.first_name, member.last_name)
                        : userId;
                    })
                    .join(", ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Email Reminders</h2>
        <p className="text-sm text-muted-foreground">
          Send balance reminders from your own email account via SMTP.
          Defaults to the email on your Splitwise account — change it if
          you&apos;d rather send from somewhere else.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email-provider">Provider</Label>
            <select
              id="email-provider"
              value={localEmail.provider}
              onChange={(e) =>
                handleProviderChange(e.target.value as EmailProviderId)
              }
              className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              {(Object.keys(PROVIDER_LABELS) as EmailProviderId[]).map(
                (id) => (
                  <option key={id} value={id}>
                    {PROVIDER_LABELS[id]}
                  </option>
                )
              )}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-address">Email address</Label>
            <Input
              id="email-address"
              type="email"
              value={localEmail.email}
              onChange={(e) => {
                setEmailSaved(false);
                setLocalEmail((prev) => ({ ...prev, email: e.target.value }));
              }}
              placeholder="you@example.com"
            />
          </div>
        </div>

        {localEmail.provider === "custom" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP host</Label>
              <Input
                id="smtp-host"
                value={localEmail.host}
                onChange={(e) => {
                  setEmailSaved(false);
                  setLocalEmail((prev) => ({ ...prev, host: e.target.value }));
                }}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP port</Label>
              <Input
                id="smtp-port"
                type="number"
                value={localEmail.port}
                onChange={(e) => {
                  setEmailSaved(false);
                  setLocalEmail((prev) => ({
                    ...prev,
                    port: Number(e.target.value) || 587,
                  }));
                }}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="app-password">App password</Label>
          <div className="relative">
            <Input
              id="app-password"
              type={showAppPassword ? "text" : "password"}
              value={localEmail.appPassword}
              onChange={(e) => {
                setEmailSaved(false);
                setLocalEmail((prev) => ({
                  ...prev,
                  appPassword: e.target.value,
                }));
              }}
              placeholder="Paste the app password from your provider"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowAppPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showAppPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Never your real account password — see the README for how to
            generate one for your provider.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={handleSaveEmailSettings}>
            Save
          </Button>
          {emailSaved && (
            <span className="text-xs text-success-foreground">Saved</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTest}
            disabled={
              testStatus === "sending" ||
              !localEmail.email ||
              !localEmail.appPassword ||
              !localEmail.host
            }
          >
            {testStatus === "sending"
              ? "Sending…"
              : "Send test email to myself"}
          </Button>
          {testStatus === "success" && (
            <span className="text-xs text-success-foreground">
              Test email sent — check your inbox.
            </span>
          )}
          {testStatus === "error" && (
            <span className="text-xs text-danger-foreground">
              {testError}
            </span>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Synced Reminders</h2>
        <p className="text-sm text-muted-foreground">
          Friends already sent a reminder for their current balance
          won&apos;t be reminded again until that balance changes.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {syncedReminderCount} reminder
            {syncedReminderCount !== 1 ? "s" : ""} sent
          </span>
          {syncedReminderCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearSyncedReminders();
                setSyncedReminderCount(0);
              }}
            >
              Clear history
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
