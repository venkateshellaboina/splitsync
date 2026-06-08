"use client";

import { useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import type { GroceryRuleConfig } from "@/types";
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
  clearSyncedHistory,
  getSyncedCount,
} from "@/lib/synced-history";
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

export function SettingsPanel() {
  const { token, setToken, refreshGroups, isLoadingGroups, groupsError, groups } =
    useApp();
  const [showToken, setShowToken] = useState(false);
  const [localToken, setLocalToken] = useState(token);
  const [syncedCount, setSyncedCount] = useState(getSyncedCount);
  const [groceryRule, setGroceryRule] = useState(getGroceryRuleConfig);
  const [grocerySaved, setGrocerySaved] = useState(false);
  const rules = getAutomationRules();
  const ruleEntries = Object.entries(rules);
  const selectedGroceryGroup = groups.find(
    (group) => group.id.toString() === groceryRule.groupId
  );

  const handleSave = () => {
    setToken(localToken.trim());
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
    </div>
  );
}
