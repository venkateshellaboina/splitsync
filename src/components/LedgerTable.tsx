"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Loader2,
  Pencil,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import type {
  NormalizedTransaction,
  SplitwiseCurrentUser,
  SplitwiseGroup,
  SplitwiseMember,
} from "@/types";
import { useApp } from "@/context/AppContext";
import { Checkbox } from "@/components/ui/checkbox";
import { GroupSelector } from "@/components/GroupSelector";
import { MemberMultiSelect } from "@/components/MemberMultiSelect";
import { ShareEditor } from "@/components/ShareEditor";
import { SyncSuccessPopup } from "@/components/SyncSuccessPopup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { extractMerchantKeyword } from "@/lib/rules";
import { getStoredToken, saveOrUpdateRule } from "@/lib/storage";
import {
  getDefaultSplitwiseDescription,
  getSplitwiseDescription,
  hasDescriptionOverride,
} from "@/lib/splitwise-description";
import {
  formatSyncedTimestamp,
  getSyncedRecord,
  isTransactionSynced,
  markAsSynced,
  removeFromSyncedHistory,
} from "@/lib/synced-history";
import {
  buildUserShareMap,
  defaultUserShareMap,
  getUserShareWeights,
  hasCustomShares,
} from "@/lib/user-shares";

interface LedgerTableProps {
  transactions: NormalizedTransaction[];
  showProcessed: boolean;
  /** Overrides the groups from AppContext — used to drive the example ledger with fake data. */
  groups?: SplitwiseGroup[];
  /** Overrides the current user from AppContext — used by the example ledger. */
  currentUser?: SplitwiseCurrentUser | null;
  /** Overrides the friends list from AppContext — used to pick members for "Non-group expenses". */
  friends?: SplitwiseMember[];
  /** Overrides AppContext's updateTransaction — lets the example ledger keep its state local. */
  onUpdateTransaction?: (
    id: string,
    updates: Partial<NormalizedTransaction>
  ) => void;
  /** When set, "Send to Splitwise" never hits the network or real local storage. */
  isExample?: boolean;
  onExampleSend?: (tx: NormalizedTransaction) => void;
}

const ROW_HEIGHT = 52;
const GRID_COLS =
  "grid-cols-[28px_100px_1fr_100px_100px_160px_160px_80px]";

type SortColumn = "date" | "description" | "amount" | "card";
type SortDirection = "asc" | "desc";

function statusForAssignment(
  groupId: string | null,
  userIds: string[]
): NormalizedTransaction["status"] {
  return groupId && userIds.length > 0 ? "READY" : "UNASSIGNED";
}

function canOpenGroupSelector(tx: NormalizedTransaction | undefined): boolean {
  return Boolean(
    tx &&
      !tx.isRefund &&
      tx.status !== "SYNCING" &&
      tx.status !== "SUCCESS" &&
      tx.status !== "IGNORED"
  );
}

/**
 * Splitwise's "Non-group expenses" (id 0) only ever reports the current user
 * as a "member" — the people you'd actually split with are your friends.
 */
function getSelectableMembers(
  group: SplitwiseGroup | undefined,
  friends: SplitwiseMember[],
  currentUser: SplitwiseCurrentUser | null
): SplitwiseMember[] {
  if (!group) return [];
  if (group.id !== 0) return group.members;

  const byId = new Map<number, SplitwiseMember>();
  if (currentUser) {
    byId.set(currentUser.id, {
      id: currentUser.id,
      first_name: currentUser.first_name,
      last_name: currentUser.last_name,
      email: currentUser.email,
    });
  }
  for (const friend of friends) {
    byId.set(friend.id, friend);
  }
  return Array.from(byId.values());
}

export function LedgerTable({
  transactions,
  showProcessed,
  groups: groupsProp,
  currentUser: currentUserProp,
  friends: friendsProp,
  onUpdateTransaction,
  isExample = false,
  onExampleSend,
}: LedgerTableProps) {
  const app = useApp();
  const groups = groupsProp ?? app.groups;
  const currentUser =
    currentUserProp !== undefined ? currentUserProp : app.currentUser;
  const friends = friendsProp ?? app.friends;
  const updateTransaction = onUpdateTransaction ?? app.updateTransaction;
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [activeIndex, setActiveIndex] = useState(0);
  const [groupOpen, setGroupOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [selectorFocus, setSelectorFocus] = useState<"group" | "member">(
    "group"
  );
  const [syncedPopup, setSyncedPopup] = useState<string | null>(null);
  const [sort, setSort] = useState<{
    column: SortColumn | null;
    direction: SortDirection;
  }>({ column: null, direction: "asc" });
  const sortColumn = sort.column;
  const sortDirection = sort.direction;

  const filtered = useMemo(() => {
    const visible = transactions.filter((tx) => {
      if (!showProcessed && (tx.status === "IGNORED" || tx.status === "SUCCESS"))
        return false;
      return true;
    });

    if (!sortColumn) return visible;

    const sorted = [...visible].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "description":
          cmp = a.description.localeCompare(b.description, undefined, {
            sensitivity: "base",
          });
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
        case "card":
          cmp = (a.cardLabel ?? "").localeCompare(b.cardLabel ?? "", undefined, {
            sensitivity: "base",
          });
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [transactions, showProcessed, sortColumn, sortDirection]);

  const toggleSort = useCallback((column: SortColumn) => {
    setSort((prev) => {
      if (prev.column !== column) {
        return { column, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { column, direction: "desc" };
      }
      // Third click on the same column resets to the original, unsorted order.
      return { column: null, direction: "asc" };
    });
  }, []);

  const safeActiveIndex = useMemo(
    () => Math.min(activeIndex, Math.max(0, filtered.length - 1)),
    [activeIndex, filtered.length]
  );

  const scrollActiveRowIntoView = useCallback((index: number) => {
    requestAnimationFrame(() => {
      rowRefs.current.get(index)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  }, []);

  const navigateToIndex = useCallback(
    (index: number, options?: { openGroupSelector?: boolean }) => {
      const next = Math.min(Math.max(index, 0), filtered.length - 1);
      const shouldOpenGroupSelector = options?.openGroupSelector ?? true;
      setActiveIndex(next);
      setSelectorFocus("group");
      setMemberOpen(false);
      setGroupOpen(shouldOpenGroupSelector && canOpenGroupSelector(filtered[next]));
      scrollActiveRowIntoView(next);
    },
    [filtered, scrollActiveRowIntoView]
  );

  const syncTransaction = useCallback(
    async (tx: NormalizedTransaction) => {
      if (!tx.selectedGroupId || tx.selectedUserIds.length === 0) return;
      if (!currentUser) return;

      if (isExample) {
        onExampleSend?.(tx);
        return;
      }

      if (isTransactionSynced(tx) || tx.status === "SUCCESS") {
        updateTransaction(tx.id, { status: "SUCCESS", errorMessage: undefined });
        return;
      }

      const token = getStoredToken();
      if (!token) return;

      updateTransaction(tx.id, { status: "SYNCING", errorMessage: undefined });

      try {
        const res = await fetch("/api/splitwise/sync", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: tx.amount,
            description: getSplitwiseDescription(tx),
            groupId: tx.selectedGroupId,
            userIds: tx.selectedUserIds.map(Number),
            userShares: getUserShareWeights(tx.selectedUserIds, tx.userShares),
            payerId: currentUser.id,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          updateTransaction(tx.id, {
            status: "ERROR",
            errorMessage: data.error ?? "Sync failed",
          });
          return;
        }

        const keyword = extractMerchantKeyword(tx.rawDescription);
        saveOrUpdateRule(keyword, tx.selectedGroupId, tx.selectedUserIds);

        markAsSynced(tx);
        updateTransaction(tx.id, {
          status: "SUCCESS",
          previouslySyncedAt: undefined,
          errorMessage: undefined,
        });
        setSyncedPopup(`"${tx.description}" posted to Splitwise successfully! 🎉`);
      } catch (err) {
        updateTransaction(tx.id, {
          status: "ERROR",
          errorMessage: err instanceof Error ? err.message : "Sync failed",
        });
      }
    },
    [currentUser, updateTransaction, isExample, onExampleSend]
  );

  const ignoreTransaction = useCallback(
    (tx: NormalizedTransaction, index: number) => {
      updateTransaction(tx.id, { status: "IGNORED" });
      if (index < filtered.length - 1) {
        navigateToIndex(index + 1);
      }
    },
    [updateTransaction, filtered.length, navigateToIndex]
  );

  const reopenTransaction = useCallback(
    (tx: NormalizedTransaction) => {
      if (isExample) {
        updateTransaction(tx.id, {
          status: statusForAssignment(tx.selectedGroupId, tx.selectedUserIds),
          errorMessage: undefined,
        });
        return;
      }

      const syncedRecord = getSyncedRecord(tx);
      removeFromSyncedHistory(tx);
      updateTransaction(tx.id, {
        status: statusForAssignment(tx.selectedGroupId, tx.selectedUserIds),
        previouslySyncedAt: syncedRecord?.syncedAt ?? tx.previouslySyncedAt,
        errorMessage: undefined,
      });
    },
    [updateTransaction, isExample]
  );

  const restoreTransaction = useCallback(
    (tx: NormalizedTransaction) => {
      updateTransaction(tx.id, {
        status: statusForAssignment(tx.selectedGroupId, tx.selectedUserIds),
        errorMessage: undefined,
      });
    },
    [updateTransaction]
  );

  const getPropagationTargets = useCallback(
    (tx: NormalizedTransaction) => {
      const selectedCount = transactions.filter((t) => t.selected).length;
      if (!tx.selected || selectedCount <= 1) return [tx];
      return transactions.filter((t) => t.selected && !t.isRefund);
    },
    [transactions]
  );

  const handleGroupChange = useCallback(
    (tx: NormalizedTransaction, groupId: string | null) => {
      const group = groups.find((g) => g.id.toString() === groupId);
      const memberIds = group
        ? group.members.map((m) => m.id.toString())
        : [];
      const status = statusForAssignment(groupId, memberIds);

      for (const target of getPropagationTargets(tx)) {
        updateTransaction(target.id, {
          selectedGroupId: groupId,
          selectedUserIds: memberIds,
          userShares: defaultUserShareMap(memberIds),
          status,
          selected: status === "READY" ? true : target.selected,
        });
      }
    },
    [groups, updateTransaction, getPropagationTargets]
  );

  const handleMemberChange = useCallback(
    (tx: NormalizedTransaction, userIds: string[]) => {
      for (const target of getPropagationTargets(tx)) {
        const status = statusForAssignment(target.selectedGroupId, userIds);
        updateTransaction(target.id, {
          selectedUserIds: userIds,
          userShares: buildUserShareMap(userIds, target.userShares),
          status,
          selected: status === "READY" ? true : target.selected,
        });
      }
    },
    [updateTransaction, getPropagationTargets]
  );

  const toggleSelect = useCallback(
    (tx: NormalizedTransaction) => {
      updateTransaction(tx.id, { selected: !tx.selected });
    },
    [updateTransaction]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (filtered.length === 0) return;

      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable='true']")) {
        return;
      }

      const activeTx = filtered[safeActiveIndex];
      if (!activeTx) return;

      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          navigateToIndex(safeActiveIndex + 1);
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          navigateToIndex(safeActiveIndex - 1);
          break;
        case " ":
          e.preventDefault();
          if (selectorFocus === "group") {
            setGroupOpen((o) => !o);
            setMemberOpen(false);
          } else {
            setMemberOpen((o) => !o);
            setGroupOpen(false);
          }
          break;
        case "Tab":
          if (!e.shiftKey) {
            e.preventDefault();
            setSelectorFocus((f) => (f === "group" ? "member" : "group"));
            setGroupOpen(false);
            setMemberOpen(false);
          }
          break;
        case "Enter":
          e.preventDefault();
          if (
            activeTx.selectedGroupId &&
            activeTx.selectedUserIds.length > 0 &&
            activeTx.status !== "SYNCING" &&
            activeTx.status !== "SUCCESS"
          ) {
            syncTransaction(activeTx);
          }
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          if (
            activeTx.status !== "SYNCING" &&
            activeTx.status !== "SUCCESS"
          ) {
            ignoreTransaction(activeTx, safeActiveIndex);
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    filtered,
    safeActiveIndex,
    selectorFocus,
    syncTransaction,
    ignoreTransaction,
    navigateToIndex,
  ]);

  const renderRow = (tx: NormalizedTransaction, index: number) => {
    const isActive = index === safeActiveIndex;
    const isReadOnly =
      tx.status === "SYNCING" || tx.status === "SUCCESS";
    const group = groups.find(
      (g) => g.id.toString() === tx.selectedGroupId
    );
    const members = getSelectableMembers(group, friends, currentUser);

    return (
      <div
        key={tx.id}
        ref={(el) => {
          if (el) rowRefs.current.set(index, el);
          else rowRefs.current.delete(index);
        }}
        className={cn(
          "relative grid gap-2 items-center px-3 border-b border-border bg-background text-sm",
          GRID_COLS,
          isActive
            ? "z-20 outline outline-2 outline-ring outline-offset-[-2px]"
            : "z-0",
          (tx.status === "SUCCESS" || tx.previouslySyncedAt) && "bg-success/60",
          tx.status === "IGNORED" && "opacity-40 line-through",
          tx.status === "SYNCING" && "animate-pulse",
          tx.status === "ERROR" && "bg-danger/60"
        )}
        style={{ height: ROW_HEIGHT }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest(
              "button, input, textarea, label, [role='checkbox']"
            )
          ) {
            return;
          }
          navigateToIndex(index, { openGroupSelector: false });
        }}
      >
        <Checkbox
          checked={tx.selected === true}
          onCheckedChange={() => toggleSelect(tx)}
          aria-label={`Select ${tx.description}`}
        />
        <span className="text-xs text-muted-foreground">{tx.date}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium">{tx.description}</p>
            {tx.isRefund && (
              <span className="shrink-0 rounded px-1 py-0.5 text-xs font-medium bg-warning text-warning-foreground">
                Refund
              </span>
            )}
            {(tx.status === "SUCCESS" || tx.previouslySyncedAt) && (
              <span className="shrink-0 rounded px-1 py-0.5 text-xs font-medium bg-success text-success-foreground">
                Posted
              </span>
            )}
          </div>
          {tx.previouslySyncedAt && tx.status !== "SUCCESS" && (
            <p className="truncate text-xs text-success-foreground">
              Previously synced {formatSyncedTimestamp(tx.previouslySyncedAt)}
            </p>
          )}
          {hasDescriptionOverride(tx) && (
            <p className="truncate text-xs text-primary">
              Sync: {tx.syncDescriptionOverride}
            </p>
          )}
          {hasCustomShares(tx.selectedUserIds, tx.userShares) && (
            <p className="truncate text-xs text-muted-foreground">
              Custom shares
            </p>
          )}
          {tx.errorMessage && (
            <p className="truncate text-xs text-danger-foreground">{tx.errorMessage}</p>
          )}
        </div>
        <span className="text-right font-mono text-xs">
          {formatCurrency(tx.amount)}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {tx.cardLabel ?? "—"}
        </span>

        {!tx.isRefund ? (
          <>
            <GroupSelector
              groups={groups}
              value={tx.selectedGroupId}
              onChange={(gid) => handleGroupChange(tx, gid)}
              disabled={isReadOnly || tx.status === "IGNORED"}
              isOpen={isActive && selectorFocus === "group" && groupOpen}
              onOpenChange={(o) => {
                if (!isActive) {
                  setActiveIndex(index);
                  scrollActiveRowIntoView(index);
                }
                setSelectorFocus("group");
                setMemberOpen(false);
                setGroupOpen(o);
              }}
            />
            <MemberMultiSelect
              members={members}
              selectedUserIds={tx.selectedUserIds}
              onChange={(ids) => handleMemberChange(tx, ids)}
              disabled={
                isReadOnly ||
                tx.status === "IGNORED" ||
                !tx.selectedGroupId
              }
              isOpen={isActive && selectorFocus === "member" && memberOpen}
              onOpenChange={(o) => {
                if (!isActive) {
                  setActiveIndex(index);
                  scrollActiveRowIntoView(index);
                }
                setSelectorFocus("member");
                setGroupOpen(false);
                setMemberOpen(o);
              }}
            />
            <div className="flex justify-end gap-1">
              {tx.status === "SYNCING" ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : tx.status === "SUCCESS" ? (
                <>
                  <Check className="h-4 w-4 text-success-foreground self-center" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      reopenTransaction(tx);
                    }}
                    title="Edit and re-send (creates a new Splitwise expense)"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : tx.status === "IGNORED" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    restoreTransaction(tx);
                  }}
                  title="Restore transaction"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!tx.selectedGroupId || !tx.selectedUserIds.length}
                    onClick={(e) => {
                      e.stopPropagation();
                      syncTransaction(tx);
                    }}
                    title="Send to Splitwise"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      ignoreTransaction(tx, index);
                    }}
                    title="Ignore"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground italic">—</span>
            <span className="text-xs text-muted-foreground italic">—</span>
            <div className="flex justify-end">
              {tx.status === "IGNORED" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    restoreTransaction(tx);
                  }}
                  title="Restore transaction"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    ignoreTransaction(tx, index);
                  }}
                  title="Ignore"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const selectedCount = filtered.filter((tx) => tx.selected).length;
  const allSelected = filtered.length > 0 && selectedCount === filtered.length;
  const someSelected = selectedCount > 0;
  const toggleSelectAll = () => {
    const shouldSelect = !allSelected;
    for (const tx of filtered) {
      if (tx.selected !== shouldSelect) {
        updateTransaction(tx.id, { selected: shouldSelect });
      }
    }
  };
  const clearSelection = () => {
    for (const tx of filtered) {
      if (tx.selected) updateTransaction(tx.id, { selected: false });
    }
  };

  const sortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const activeTx = filtered[safeActiveIndex];
  const canEditAssignment =
    activeTx &&
    !activeTx.isRefund &&
    activeTx.status !== "SYNCING" &&
    activeTx.status !== "SUCCESS" &&
    activeTx.status !== "IGNORED";
  const canEditDescription = canEditAssignment;
  const canEditShares =
    canEditAssignment && activeTx.selectedUserIds.length > 0;
  const activeGroup = groups.find(
    (g) => g.id.toString() === activeTx?.selectedGroupId
  );

  if (filtered.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">No transactions to display.</p>
          <p className="text-xs mt-1">Upload a CSV to get started.</p>
        </div>
        {syncedPopup && (
          <SyncSuccessPopup
            message={syncedPopup}
            onDismiss={() => setSyncedPopup(null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-2">
      {someSelected && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <span>
            {selectedCount} selected — included in Bulk Add once assigned a
            group and members. Assigning one applies to all selected.
          </span>
          <button
            type="button"
            className="text-xs font-medium text-foreground hover:underline"
            onClick={clearSelection}
          >
            Clear selection
          </button>
        </div>
      )}

      <div
        className={cn(
          "grid gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border",
          GRID_COLS
        )}
      >
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
        />
        <button
          type="button"
          className="flex items-center gap-1 text-left hover:text-foreground"
          onClick={() => toggleSort("date")}
        >
          Date {sortIcon("date")}
        </button>
        <button
          type="button"
          className="flex items-center gap-1 text-left hover:text-foreground"
          onClick={() => toggleSort("description")}
        >
          Description {sortIcon("description")}
        </button>
        <button
          type="button"
          className="flex items-center justify-end gap-1 text-right hover:text-foreground"
          onClick={() => toggleSort("amount")}
        >
          Amount {sortIcon("amount")}
        </button>
        <button
          type="button"
          className="flex items-center gap-1 text-left hover:text-foreground"
          onClick={() => toggleSort("card")}
        >
          Card {sortIcon("card")}
        </button>
        <span>Group</span>
        <span>Members</span>
        <span className="text-right">Actions</span>
      </div>

      {(canEditDescription || canEditShares) && (
        <div className="space-y-2 px-3 py-2 rounded-md border border-border bg-muted">
          {activeTx.previouslySyncedAt && (
            <p className="text-xs text-success-foreground">
              Previously posted to Splitwise on{" "}
              {formatSyncedTimestamp(activeTx.previouslySyncedAt)}. Edits will
              create a new expense when re-sent.
            </p>
          )}
          {canEditDescription && (
            <div className="flex items-center gap-2">
              <label
                htmlFor={`sync-desc-${activeTx.id}`}
                className="text-xs font-medium text-muted-foreground shrink-0"
              >
                Splitwise description
              </label>
              <Input
                id={`sync-desc-${activeTx.id}`}
                value={
                  activeTx.syncDescriptionOverride ??
                  getDefaultSplitwiseDescription(activeTx)
                }
                onChange={(e) => {
                  const value = e.target.value;
                  const defaultDesc = getDefaultSplitwiseDescription(activeTx);
                  updateTransaction(activeTx.id, {
                    syncDescriptionOverride:
                      value === defaultDesc ? undefined : value,
                  });
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className="h-8 text-xs flex-1 min-w-0"
              />
              {hasDescriptionOverride(activeTx) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTransaction(activeTx.id, {
                      syncDescriptionOverride: undefined,
                    });
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          )}
          {canEditShares && activeGroup && (
            <ShareEditor
              members={getSelectableMembers(activeGroup, friends, currentUser)}
              selectedUserIds={activeTx.selectedUserIds}
              userShares={activeTx.userShares ?? defaultUserShareMap(activeTx.selectedUserIds)}
              onChange={(userShares) =>
                updateTransaction(activeTx.id, { userShares })
              }
            />
          )}
        </div>
      )}

      <div>
        {filtered.map((tx, index) => renderRow(tx, index))}
      </div>

      <p className="text-xs text-muted-foreground px-3">
        Keyboard: ↑/↓ or J/K navigate · Space toggle selector · Tab switch
        selector · Enter send · Delete ignore · Use Edit on posted rows to
        update and re-send
      </p>

      {syncedPopup && (
        <SyncSuccessPopup
          message={syncedPopup}
          onDismiss={() => setSyncedPopup(null)}
        />
      )}
    </div>
  );
}
