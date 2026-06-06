"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Loader2, Upload, X } from "lucide-react";
import type { NormalizedTransaction } from "@/types";
import { useApp } from "@/context/AppContext";
import { GroupSelector } from "@/components/GroupSelector";
import { MemberMultiSelect } from "@/components/MemberMultiSelect";
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
import { isTransactionSynced, markAsSynced } from "@/lib/synced-history";

interface LedgerTableProps {
  transactions: NormalizedTransaction[];
  showProcessed: boolean;
  isRefundView?: boolean;
}

const ROW_HEIGHT = 52;

export function LedgerTable({
  transactions,
  showProcessed,
  isRefundView = false,
}: LedgerTableProps) {
  const { groups, currentUser, updateTransaction } = useApp();
  const parentRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [groupOpen, setGroupOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [selectorFocus, setSelectorFocus] = useState<"group" | "member">(
    "group"
  );

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.isRefund !== isRefundView) return false;
      if (!showProcessed && (tx.status === "IGNORED" || tx.status === "SUCCESS"))
        return false;
      return true;
    });
  }, [transactions, showProcessed, isRefundView]);

  const useVirtual = filtered.length > 500;

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    enabled: useVirtual,
  });

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, activeIndex]);

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
        updateTransaction(tx.id, { status: "SUCCESS", errorMessage: undefined });
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

  const handleGroupChange = useCallback(
    (tx: NormalizedTransaction, groupId: string | null) => {
      const group = groups.find((g) => g.id.toString() === groupId);
      const memberIds = group
        ? group.members.map((m) => m.id.toString())
        : [];

      updateTransaction(tx.id, {
        selectedGroupId: groupId,
        selectedUserIds: memberIds,
        status:
          groupId && memberIds.length > 0 ? "READY" : "UNASSIGNED",
      });
    },
    [groups, updateTransaction]
  );

  const handleMemberChange = useCallback(
    (tx: NormalizedTransaction, userIds: string[]) => {
      updateTransaction(tx.id, {
        selectedUserIds: userIds,
        status:
          tx.selectedGroupId && userIds.length > 0 ? "READY" : "UNASSIGNED",
      });
    },
    [updateTransaction]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (filtered.length === 0) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const activeTx = filtered[activeIndex];
      if (!activeTx) return;

      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          setGroupOpen(false);
          setMemberOpen(false);
          setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          setGroupOpen(false);
          setMemberOpen(false);
          setActiveIndex((i) => Math.max(i - 1, 0));
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
            ignoreTransaction(activeTx, activeIndex);
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    filtered,
    activeIndex,
    selectorFocus,
    syncTransaction,
    ignoreTransaction,
  ]);

  const renderRow = (tx: NormalizedTransaction, index: number) => {
    const isActive = index === activeIndex;
    const isReadOnly =
      tx.status === "SYNCING" || tx.status === "SUCCESS";
    const group = groups.find(
      (g) => g.id.toString() === tx.selectedGroupId
    );
    const members = group?.members ?? [];

    return (
      <div
        key={tx.id}
        className={cn(
          "grid grid-cols-[100px_1fr_100px_160px_160px_80px] gap-2 items-center px-3 border-b border-zinc-100 text-sm",
          isActive && "outline outline-2 outline-zinc-400 outline-offset-[-2px]",
          tx.status === "SUCCESS" && "bg-green-50/40",
          tx.status === "IGNORED" && "opacity-40 line-through",
          tx.status === "SYNCING" && "animate-pulse",
          tx.status === "ERROR" && "bg-red-50/30"
        )}
        style={{ height: ROW_HEIGHT }}
        onClick={() => setActiveIndex(index)}
      >
        <span className="text-xs text-zinc-500">{tx.date}</span>
        <div className="min-w-0">
          <p className="truncate font-medium">{tx.description}</p>
          {hasDescriptionOverride(tx) && (
            <p className="truncate text-xs text-blue-600">
              Sync: {tx.syncDescriptionOverride}
            </p>
          )}
          {tx.errorMessage && (
            <p className="truncate text-xs text-red-600">{tx.errorMessage}</p>
          )}
        </div>
        <span className="text-right font-mono text-xs">
          {formatCurrency(tx.amount)}
        </span>

        {!isRefundView ? (
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
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ) : tx.status === "SUCCESS" ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : tx.status !== "IGNORED" ? (
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
                    title="Sync to Splitwise"
                  >
                    <Upload className="h-3.5 w-3.5" />
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
              ) : null}
            </div>
          </>
        ) : (
          <span className="col-span-3 text-xs text-zinc-400 italic">
            Refund / credit
          </span>
        )}
      </div>
    );
  };

  const activeTx = filtered[activeIndex];
  const canEditDescription =
    activeTx &&
    !isRefundView &&
    activeTx.status !== "SYNCING" &&
    activeTx.status !== "SUCCESS" &&
    activeTx.status !== "IGNORED";

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <p className="text-sm">No transactions to display.</p>
        <p className="text-xs mt-1">Upload a CSV to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[100px_1fr_100px_160px_160px_80px] gap-2 px-3 py-2 text-xs font-medium text-zinc-500 border-b border-zinc-200">
        <span>Date</span>
        <span>Description</span>
        <span className="text-right">Amount</span>
        {!isRefundView ? (
          <>
            <span>Group</span>
            <span>Members</span>
            <span className="text-right">Actions</span>
          </>
        ) : (
          <span className="col-span-3">Type</span>
        )}
      </div>

      {canEditDescription && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-200 bg-zinc-50">
          <label
            htmlFor={`sync-desc-${activeTx.id}`}
            className="text-xs font-medium text-zinc-600 shrink-0"
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
                  value.trim() === defaultDesc ? undefined : value,
              });
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-8 text-xs flex-1"
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

      {useVirtual ? (
        <div
          ref={parentRef}
          className="h-[calc(100vh-280px)] overflow-auto"
        >
          <div
            style={{
              height: virtualizer.getTotalSize(),
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const tx = filtered[virtualRow.index];
              return (
                <div
                  key={tx.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {renderRow(tx, virtualRow.index)}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-280px)] overflow-auto">
          {filtered.map((tx, index) => renderRow(tx, index))}
        </div>
      )}

      <p className="text-xs text-zinc-400 px-3">
        Keyboard: ↑/↓ or J/K navigate · Space toggle selector · Tab switch
        selector · Enter sync · Delete ignore
      </p>
    </div>
  );
}
