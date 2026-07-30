"use client";

import { Button } from "@/components/ui/button";

interface SyncSuccessPopupProps {
  message: string;
  subtext?: string;
  onDismiss: () => void;
}

export function SyncSuccessPopup({
  message,
  subtext,
  onDismiss,
}: SyncSuccessPopupProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
      onClick={onDismiss}
    >
      <div
        className="max-w-sm space-y-3 rounded-lg border border-border bg-card p-5 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-lg font-semibold">{message}</p>
        {subtext && <p className="text-sm text-muted-foreground">{subtext}</p>}
        <Button size="sm" onClick={onDismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
