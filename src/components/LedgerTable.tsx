"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Pencil, RotateCcw, Send, X } from "lucide-react";
import type { NormalizedTransaction } from "@/types";
import { useApp } from "@/context/AppContext";
import { GroupSelector } from "@/components/GroupSelector";
import { MemberMultiSelect } from "@/components/MemberMultiSelect";
import { ShareEditor } from "@/components/ShareEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { extractMerchantKeyword } from "@/lib/rules";
import { saveOrUpdateRule, getStoredToken } from "@/lib/storage";
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
}

const ROW_HEIGHT = 52;

function statusForAssignment(
  groupId: string | null,
  userIds: string[]
): NormalizedTransaction["status"] {
  return groupId && userIds.length > 0 ? "READY" : "UNASSIGNED";
}

export function LedgerTable({
  transactions,
  showProcessed,
}: LedgerTableProps) {
  const { groups, currentUser, updateTransaction } = useApp();
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [activeIndex, setActiveIndex] = useState(0);
  const [groupOpen, setGroupOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [selectorFocus, setSelectorFocus] = useState<"group" | "member">(
    "group"
  );

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (!showProcessed && (tx.status === "IGNORED" || tx.status === "SUCCESS"))
        return false;
      return true;
    });
  }, [transactions, showProcessed]);

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

  const syncTransaction = useCallback(
    async (tx: NormalizedTransaction) => {
      if (!tx.selectedGroupId || tx.selectedUserIds.length === 0) return;
      if (!currentUser) return;

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
        saveOrUpdateRule(
          keyword,
          tx.selectedGroupId,
          tx.selectedUserIds
        );

        markAsSynced(tx);
        updateTransaction(tx.id, {
          status: "SUCCESS",
          previouslySyncedAt: undefined,
          errorMessage: undefined,
        });
      } catch (err) {
        updateTransaction(tx.id, {
          status: "ERROR",
          errorMessage: err instanceof Error ? err.message : "Sync failed",
        });
      }
    },
    [currentUser, updateTransaction]
  );

  const ignoreTransaction = useCallback(
    (tx: NormalizedTransaction, index: number) => {
      updateTransaction(tx.id, { status: "IGNORED" });
      if (index < filtered.length - 1) {
        setActiveIndex(index + 1);
      }
    },
    [updateTransaction, filtered.length]
  );

  const reopenTransaction = useCallback(
    (tx: NormalizedTransaction) => {
      const syncedRecord = getSyncedRecord(tx);
      removeFromSyncedHistory(tx);
      updateTransaction(tx.id, {
        status: statusForAssignment(tx.selectedGroupId, tx.selectedUserIds),
        previouslySyncedAt: syncedRecord?.syncedAt ?? tx.previouslySyncedAt,
        errorMessage: undefined,
      });
    },
    [updateTransaction]
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

  const handleGroupChange = useCallback(
    (tx: NormalizedTransaction, groupId: string | null) => {
      const group = groups.find((g) => g.id.toString() === groupId);
      const memberIds = group
        ? group.members.map((m) => m.id.toString())
        : [];

      updateTransaction(tx.id, {
        selectedGroupId: groupId,
        selectedUserIds: memberIds,
        userShares: defaultUserShareMap(memberIds),
        status: statusForAssignment(groupId, memberIds),
      });
    },
    [groups, updateTransaction]
  );

  const handleMemberChange = useCallback(
    (tx: NormalizedTransaction, userIds: string[]) => {
      updateTransaction(tx.id, {
        selectedUserIds: userIds,
        userShares: buildUserShareMap(userIds, tx.userShares),
        status: statusForAssignment(tx.selectedGroupId, userIds),
      });
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
          setGroupOpen(false);
          setMemberOpen(false);
          setActiveIndex((i) => {
            const next = Math.min(i + 1, filtered.length - 1);
            scrollActiveRowIntoView(next);
            return next;
          });
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          setGroupOpen(false);
          setMemberOpen(false);
          setActiveIndex((i) => {
            const next = Math.max(i - 1, 0);
            scrollActiveRowIntoView(next);
            return next;
          });
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
    scrollActiveRowIntoView,
  ]);

  const renderRow = (tx: NormalizedTransaction, index: number) => {
    const isActive = index === safeActiveIndex;
    const isReadOnly =
      tx.status === "SYNCING" || tx.status === "SUCCESS";
    const group = groups.find(
      (g) => g.id.toString() === tx.selectedGroupId
    );
    const members = group?.members ?? [];

    return (
      <div
        key={tx.id}
        ref={(el) => {
          if (el) rowRefs.current.set(index, el);
          else rowRefs.current.delete(index);
        }}
        className={cn(
          "grid grid-cols-[100px_1fr_100px_160px_160px_80px] gap-2 items-center px-3 border-b border-border text-sm",
          isActive && "outline outline-2 outline-ring outline-offset-[-2px]",
          (tx.status === "SUCCESS" || tx.previouslySyncedAt) && "bg-success/60",
          tx.status === "IGNORED" && "opacity-40 line-through",
          tx.status === "SYNCING" && "animate-pulse",
          tx.status === "ERROR" && "bg-danger/60"
        )}
        style={{ height: ROW_HEIGHT }}
        onClick={() => {
          setActiveIndex(index);
          scrollActiveRowIntoView(index);
        }}
      >
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

        {!tx.isRefund ? (
          <>
            <GroupSelector
              groups={groups}
              value={tx.selectedGroupId}
              onChange={(gid) => handleGroupChange(tx, gid)}
              disabled={isReadOnly || tx.status === "IGNORED"}
              isOpen={isActive && selectorFocus === "group" && groupOpen}
              onOpenChange={(o) => {
                if (isActive) {
                  setGroupOpen(o);
                  setSelectorFocus("group");
                }
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
                if (isActive) {
                  setMemberOpen(o);
                  setSelectorFocus("member");
                }
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
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No transactions to display.</p>
        <p className="text-xs mt-1">Upload a CSV to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[100px_1fr_100px_160px_160px_80px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
        <span>Date</span>
        <span>Description</span>
        <span className="text-right">Amount</span>
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
              members={activeGroup.members}
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
    </div>
  );
}
