"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BalancesView } from "@/components/BalancesView";
import { BulkSyncButton } from "@/components/BulkSyncButton";
import { CsvManager } from "@/components/CsvManager";
import { CsvUpload } from "@/components/CsvUpload";
import { ExampleLedger } from "@/components/ExampleLedger";
import { LedgerTable } from "@/components/LedgerTable";
import { ManualTransactionForm } from "@/components/ManualTransactionForm";
import { SettingsPanel } from "@/components/SettingsPanel";

export function ViewTabs() {
  const { transactions, hasUploadedCsv } = useApp();
  const showExamples = transactions.length === 0 && !hasUploadedCsv;
  const [showProcessed, setShowProcessed] = useState(false);

  const pendingCount = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          tx.status !== "IGNORED" &&
          tx.status !== "SUCCESS"
      ).length,
    [transactions]
  );

  return (
    <Tabs defaultValue="ledger" className="w-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TabsList>
          <TabsTrigger value="ledger">
            Ledger
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          {!showExamples && (
            <TabsTrigger value="balances">Balances</TabsTrigger>
          )}
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <ManualTransactionForm />
          <CsvUpload />
          <CsvManager />
        </div>
      </div>

      <TabsContent value="ledger" className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-processed"
              checked={showProcessed}
              onCheckedChange={(checked) =>
                setShowProcessed(checked === true)
              }
            />
            <Label htmlFor="show-processed" className="text-sm font-normal">
              Show processed items
            </Label>
          </div>
          {!showExamples && <BulkSyncButton />}
        </div>
        {showExamples ? (
          <ExampleLedger showProcessed={showProcessed} />
        ) : (
          <LedgerTable
            transactions={transactions}
            showProcessed={showProcessed}
          />
        )}
      </TabsContent>

      {!showExamples && (
        <TabsContent value="balances">
          <BalancesView />
        </TabsContent>
      )}

      <TabsContent value="config">
        <SettingsPanel />
      </TabsContent>
    </Tabs>
  );
}
