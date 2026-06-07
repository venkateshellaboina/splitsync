"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BulkSyncButton } from "@/components/BulkSyncButton";
import { CsvUpload } from "@/components/CsvUpload";
import { LedgerTable } from "@/components/LedgerTable";
import { SettingsPanel } from "@/components/SettingsPanel";

export function ViewTabs() {
  const { transactions } = useApp();
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
              <span className="ml-1.5 rounded-full bg-zinc-200 px-1.5 py-0.5 text-xs">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <CsvUpload />
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
          <BulkSyncButton />
        </div>
        <LedgerTable
          transactions={transactions}
          showProcessed={showProcessed}
        />
      </TabsContent>

      <TabsContent value="config">
        <SettingsPanel />
      </TabsContent>
    </Tabs>
  );
}
