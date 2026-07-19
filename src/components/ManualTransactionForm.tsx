"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { createTransaction } from "@/lib/normalize";
import { applyDefaultRules } from "@/lib/default-rules";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ManualTransactionForm() {
  const { groups, setTransactions } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(todayIsoDate);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isRefund, setIsRefund] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setDate(todayIsoDate());
    setDescription("");
    setAmount("");
    setIsRefund(false);
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDescription = description.trim();
    const parsedAmount = Number.parseFloat(amount);

    if (!date) {
      setError("Choose a transaction date.");
      return;
    }
    if (!trimmedDescription) {
      setError("Add a description.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    const transaction = createTransaction({
      date,
      description: trimmedDescription,
      amount: parsedAmount,
      rawDescription: trimmedDescription,
      isRefund,
      category: "Manual",
      cardLabel: "Manual",
    });
    const withDefaults = applyDefaultRules([transaction], groups)[0];

    setTransactions((prev) => [withDefaults, ...prev]);
    resetForm();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Plus className="h-4 w-4" />
        New Transaction
      </Button>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="absolute right-0 z-[100] mt-2 w-[360px] space-y-3 rounded-md border border-border bg-card p-3 shadow-xl"
        >
          <div>
            <h3 className="text-sm font-medium">Add Manual Transaction</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a transaction that did not appear in the uploaded CSV.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="manual-date" className="text-xs">
                Date
              </Label>
              <Input
                id="manual-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-amount" className="text-xs">
                Amount
              </Label>
              <Input
                id="manual-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="manual-description" className="text-xs">
              Description
            </Label>
            <Input
              id="manual-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Merchant or expense name"
              className="h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="manual-refund"
              checked={isRefund}
              onCheckedChange={(checked) => setIsRefund(checked === true)}
            />
            <Label htmlFor="manual-refund" className="text-xs font-normal">
              Mark as refund/payment
            </Label>
          </div>

          {error && <p className="text-xs text-danger-foreground">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add Transaction
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
