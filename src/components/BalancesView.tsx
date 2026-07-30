"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Mail,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RemindPreviewModal,
  type RemindTarget,
} from "@/components/RemindPreviewModal";
import { isReminderSynced } from "@/lib/synced-reminders";
import { cn, formatCurrency, memberDisplayName } from "@/lib/utils";

type BalanceFilter = "none" | "outstanding" | "owedToYou" | "youOwe";
type SortColumn = "name" | "amount";
type SortDirection = "asc" | "desc";

const FILTER_OPTIONS: { value: BalanceFilter; label: string }[] = [
  { value: "none", label: "None" },
  { value: "outstanding", label: "Outstanding Balances" },
  { value: "owedToYou", label: "Friends who owe you" },
  { value: "youOwe", label: "Friends you owe" },
];

const ROW_HEIGHT = 52;
const GRID_COLS = "grid-cols-[28px_1fr_160px_90px]";

interface FriendBalanceRow {
  id: number;
  name: string;
  email: string;
  amount: number;
  currencyCode: string;
}

function toBalanceRows(
  friends: ReturnType<typeof useApp>["friends"]
): FriendBalanceRow[] {
  return friends.map((f) => {
    const balance = f.balances?.[0];
    return {
      id: f.id,
      name: memberDisplayName(f.first_name, f.last_name),
      email: f.email,
      amount: balance?.amount ?? 0,
      currencyCode: balance?.currencyCode ?? "USD",
    };
  });
}

function defaultOrder(rows: FriendBalanceRow[]): FriendBalanceRow[] {
  return [...rows].sort((a, b) => {
    const aZero = a.amount === 0;
    const bZero = b.amount === 0;
    if (aZero !== bZero) return aZero ? 1 : -1;
    if (Math.abs(b.amount) !== Math.abs(a.amount)) {
      return Math.abs(b.amount) - Math.abs(a.amount);
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function toRemindTarget(row: FriendBalanceRow): RemindTarget {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    amount: row.amount,
    currencyCode: row.currencyCode,
  };
}

export function BalancesView() {
  const {
    friends,
    token,
    currentUser,
    emailSettings,
    refreshGroups,
    isLoadingGroups,
  } = useApp();
  const [filter, setFilter] = useState<BalanceFilter>("outstanding");
  const [sort, setSort] = useState<{
    column: SortColumn | null;
    direction: SortDirection;
  }>({ column: null, direction: "asc" });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [remindTargets, setRemindTargets] = useState<RemindTarget[] | null>(
    null
  );
  // Bumping this forces a re-render so the reminded-badge/eligibility checks
  // (which read localStorage directly) recompute after a send completes.
  const [, setReminderVersion] = useState(0);

  const toggleSort = useCallback((column: SortColumn) => {
    setSort((prev) => {
      if (prev.column !== column) {
        return { column, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { column, direction: "desc" };
      }
      // Third click on the same column resets to the default order.
      return { column: null, direction: "asc" };
    });
  }, []);

  const sortIcon = (column: SortColumn) => {
    if (sort.column !== column) {
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const rows = useMemo(() => toBalanceRows(friends), [friends]);

  const sortedRows = useMemo(() => {
    let result: FriendBalanceRow[];
    switch (filter) {
      case "outstanding":
        result = rows.filter((r) => r.amount !== 0);
        break;
      case "owedToYou":
        result = rows.filter((r) => r.amount > 0);
        break;
      case "youOwe":
        result = rows.filter((r) => r.amount < 0);
        break;
      case "none":
      default:
        result = rows;
        break;
    }

    if (!sort.column) return defaultOrder(result);

    return [...result].sort((a, b) => {
      const cmp =
        sort.column === "name"
          ? a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          : a.amount - b.amount;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [rows, filter, sort]);

  function isRowReminded(row: FriendBalanceRow): boolean {
    return isReminderSynced(row.id, row.amount, row.currencyCode);
  }

  // Plain (non-memoized): isReminderSynced reads localStorage directly, so this
  // must recompute on every render (reminderVersion bumping after a send is
  // what triggers that re-render). Already-reminded friends always sink to the
  // bottom of the list, below everyone else, regardless of the active sort or
  // filter — only their position changes, not their relative order otherwise.
  const filteredRows = [
    ...sortedRows.filter((r) => !(r.amount > 0 && isRowReminded(r))),
    ...sortedRows.filter((r) => r.amount > 0 && isRowReminded(r)),
  ];

  const owingRows = filteredRows.filter(
    (r) => r.amount > 0 && !isRowReminded(r)
  );
  // Also plain: owingRows is a fresh array every render (see above), so
  // memoizing this derivation over it would never actually hit its cache.
  const selectedOwingRows = owingRows.filter((r) => selectedIds.has(r.id));
  const allOwingSelected =
    owingRows.length > 0 && selectedOwingRows.length === owingRows.length;

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllOwing = () => {
    if (allOwingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(owingRows.map((r) => r.id)));
    }
  };

  const senderName = currentUser
    ? memberDisplayName(currentUser.first_name, currentUser.last_name)
    : "Me";

  const smtp =
    emailSettings && emailSettings.email && emailSettings.appPassword
      ? emailSettings
      : null;

  const handleSent = useCallback(() => {
    setReminderVersion((v) => v + 1);
    setSelectedIds(new Set());
  }, []);

  const totalOwedToYou = rows
    .filter((r) => r.amount > 0)
    .reduce((sum, r) => sum + r.amount, 0);
  const totalYouOwe = rows
    .filter((r) => r.amount < 0)
    .reduce((sum, r) => sum + Math.abs(r.amount), 0);
  const netBalance = totalOwedToYou - totalYouOwe;

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No Splitwise token configured.</p>
        <p className="text-xs mt-1">
          Add your token in Configuration to see friend balances.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-w-2xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-4 text-sm">
          <span className="text-success-foreground">
            Owed to you: {formatCurrency(totalOwedToYou)}
          </span>
          <span className="text-danger-foreground">
            You owe: {formatCurrency(totalYouOwe)}
          </span>
          <span
            className={cn(
              "font-medium",
              netBalance > 0
                ? "text-success-foreground"
                : netBalance < 0
                  ? "text-danger-foreground"
                  : "text-muted-foreground"
            )}
          >
            Overall: {netBalance > 0 ? "+" : netBalance < 0 ? "-" : ""}
            {formatCurrency(Math.abs(netBalance))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as BalanceFilter)}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshGroups}
            disabled={isLoadingGroups}
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoadingGroups && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={selectedOwingRows.length === 0}
            onClick={() =>
              setRemindTargets(selectedOwingRows.map(toRemindTarget))
            }
          >
            <Mail className="h-4 w-4" />
            Bulk Remind
            {selectedOwingRows.length > 0 ? ` (${selectedOwingRows.length})` : ""}
          </Button>
        </div>
      </div>

      {friends.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No friends loaded yet. Click Refresh once your token is saved.
        </p>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No friends match this filter.
        </p>
      ) : (
        <div>
          <div
            className={cn(
              "grid gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border",
              GRID_COLS
            )}
          >
            <Checkbox
              checked={allOwingSelected}
              onCheckedChange={toggleSelectAllOwing}
              disabled={owingRows.length === 0}
              aria-label="Select all friends who owe you"
            />
            <button
              type="button"
              className="flex items-center gap-1 text-left hover:text-foreground"
              onClick={() => toggleSort("name")}
            >
              Name {sortIcon("name")}
            </button>
            <button
              type="button"
              className="flex items-center justify-end gap-1 text-right hover:text-foreground"
              onClick={() => toggleSort("amount")}
            >
              Amount {sortIcon("amount")}
            </button>
            <span className="text-right">Remind</span>
          </div>

          {filteredRows.map((row) => {
            const reminded = row.amount > 0 && isRowReminded(row);
            return (
              <div
                key={row.id}
                className={cn(
                  "grid gap-2 items-center px-3 border-b border-border text-sm",
                  GRID_COLS
                )}
                style={{ height: ROW_HEIGHT }}
              >
                {row.amount > 0 && !reminded ? (
                  <Checkbox
                    checked={selectedIds.has(row.id)}
                    onCheckedChange={() => toggleSelect(row.id)}
                    aria-label={`Select ${row.name}`}
                  />
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate font-medium">{row.name}</span>
                  {reminded && (
                    <span className="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-xs font-medium bg-success text-success-foreground">
                      <Check className="h-3 w-3" />
                      Reminder sent
                    </span>
                  )}
                </div>
                {row.amount === 0 ? (
                  <span className="text-right text-xs text-muted-foreground">
                    Settled up
                  </span>
                ) : (
                  <div className="text-right">
                    <span
                      className={cn(
                        "text-sm font-mono",
                        row.amount > 0
                          ? "text-success-foreground"
                          : "text-danger-foreground"
                      )}
                    >
                      {row.amount > 0 ? "owes you " : "you owe "}
                      {formatCurrency(Math.abs(row.amount), row.currencyCode)}
                    </span>
                  </div>
                )}
                <div className="flex justify-end">
                  {row.amount > 0 &&
                    (reminded ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setRemindTargets([toRemindTarget(row)])}
                        title={`Remind ${row.name} again`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setRemindTargets([toRemindTarget(row)])}
                        title={`Remind ${row.name}`}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {remindTargets && (
        <RemindPreviewModal
          targets={remindTargets}
          senderName={senderName}
          smtp={smtp}
          onDismiss={() => setRemindTargets(null)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}
