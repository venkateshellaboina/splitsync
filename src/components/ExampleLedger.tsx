"use client";

import { useState } from "react";
import type { NormalizedTransaction } from "@/types";
import { BulkSyncButton } from "@/components/BulkSyncButton";
import { LedgerTable } from "@/components/LedgerTable";
import { SyncSuccessPopup } from "@/components/SyncSuccessPopup";
import {
  EXAMPLE_CURRENT_USER,
  EXAMPLE_GROUPS,
  EXAMPLE_TRANSACTIONS,
} from "@/lib/example-transactions";

interface ExampleLedgerProps {
  showProcessed: boolean;
}

export function ExampleLedger({ showProcessed }: ExampleLedgerProps) {
  const [transactions, setTransactions] =
    useState<NormalizedTransaction[]>(EXAMPLE_TRANSACTIONS);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  const updateTransaction = (
    id: string,
    updates: Partial<NormalizedTransaction>
  ) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );
  };

  const handleExampleSend = (tx: NormalizedTransaction) => {
    updateTransaction(tx.id, { status: "SUCCESS", errorMessage: undefined });
    setPopupMessage(`"${tx.description}" posted to Splitwise successfully! 🎉`);
  };

  const handleExampleBulkComplete = (succeeded: number) => {
    setPopupMessage(
      `${succeeded} transaction${succeeded === 1 ? "" : "s"} posted to Splitwise successfully! 🎉`
    );
  };

  const dismissPopup = () => {
    setPopupMessage(null);
    setTransactions(EXAMPLE_TRANSACTIONS);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-[240px] flex-1 rounded-md border border-dashed border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Example transactions
          </span>{" "}
          — try assigning a group and members, editing the description or
          shares, or ignoring a row. Single and bulk sending are both safe to
          try. Upload a CSV to replace these with your real transactions.
        </div>
        <BulkSyncButton
          transactions={transactions}
          currentUser={EXAMPLE_CURRENT_USER}
          onUpdateTransaction={updateTransaction}
          isExample
          onExampleBulkComplete={handleExampleBulkComplete}
        />
      </div>

      <LedgerTable
        transactions={transactions}
        showProcessed={showProcessed}
        groups={EXAMPLE_GROUPS}
        currentUser={EXAMPLE_CURRENT_USER}
        onUpdateTransaction={updateTransaction}
        isExample
        onExampleSend={handleExampleSend}
      />

      {popupMessage && (
        <SyncSuccessPopup
          message={popupMessage}
          subtext="(Not really — this was just an example to make sure you understand how the app works :P)"
          onDismiss={dismissPopup}
        />
      )}
    </div>
  );
}
