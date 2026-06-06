"use client";

import { useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAutomationRules } from "@/lib/storage";
import {
  clearSyncedHistory,
  getSyncedCount,
} from "@/lib/synced-history";

export function SettingsPanel() {
  const { token, setToken, refreshGroups, isLoadingGroups, groupsError, groups } =
    useApp();
  const [showToken, setShowToken] = useState(false);
  const [localToken, setLocalToken] = useState(token);
  const [syncedCount, setSyncedCount] = useState(getSyncedCount);
  const rules = getAutomationRules();
  const ruleEntries = Object.entries(rules);

  const handleSave = () => {
    setToken(localToken.trim());
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Splitwise Credentials</h2>
        <p className="text-sm text-zinc-500">
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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
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
            <span className="text-sm text-zinc-500">
              {groups.length} group{groups.length !== 1 ? "s" : ""} loaded
            </span>
          )}
        </div>
        {groupsError && (
          <p className="text-sm text-red-600">{groupsError}</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Synced Transactions</h2>
        <p className="text-sm text-zinc-500">
          Successfully synced transactions are remembered locally so re-uploading
          the same CSV won&apos;t prompt you to sync them again.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600">
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
        <p className="text-sm text-zinc-500">
          Built-in: grocery transactions auto-assign to Parksiders (Venky, Sai
          Deepak, Prateek). Saved rules below are applied when you sync a
          transaction.
        </p>
        {ruleEntries.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">No rules saved yet.</p>
        ) : (
          <div className="rounded-md border border-zinc-200 divide-y">
            {ruleEntries.map(([keyword, rule]) => (
              <div key={keyword} className="px-4 py-3 text-sm">
                <span className="font-medium">{keyword}</span>
                <span className="text-zinc-400 mx-2">→</span>
                <span className="text-zinc-600">
                  Group {rule.groupId}, {rule.userIds.length} member
                  {rule.userIds.length !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
