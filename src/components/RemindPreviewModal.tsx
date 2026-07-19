"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import type { EmailSettings } from "@/types";
import { Button } from "@/components/ui/button";
import {
  buildMailtoHref,
  buildReminderSubject,
  defaultReminderBody,
  renderReminderBody,
} from "@/lib/reminders";
import { runBulkRemind, type RemindTarget } from "@/lib/email-send";
import { cn, formatCurrency } from "@/lib/utils";

export type { RemindTarget };

interface RemindPreviewModalProps {
  targets: RemindTarget[];
  senderName: string;
  smtp: EmailSettings | null;
  onDismiss: () => void;
  onSent: () => void;
}

interface SendResult {
  target: RemindTarget;
  success: boolean;
  error?: string;
}

export function RemindPreviewModal({
  targets,
  senderName,
  smtp,
  onDismiss,
  onSent,
}: RemindPreviewModalProps) {
  const [bodyTemplate, setBodyTemplate] = useState(() =>
    defaultReminderBody(senderName)
  );
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(
    null
  );
  const [results, setResults] = useState<SendResult[] | null>(null);

  const isBulk = targets.length > 1;
  const previewName = isBulk ? "XYZ" : targets[0].name;
  const previewAmount = isBulk
    ? "$XX.XX"
    : formatCurrency(targets[0].amount, targets[0].currencyCode);
  const renderedPreview = renderReminderBody(bodyTemplate, previewName, previewAmount);
  const previewSubject = buildReminderSubject(previewAmount);

  const handleClose = () => {
    if (isSending) return;
    onDismiss();
  };

  const handleConfirmSend = async () => {
    if (!smtp || isSending) return;
    setIsSending(true);
    setResults(null);

    const collected: SendResult[] = [];
    await runBulkRemind(targets, smtp, bodyTemplate, {
      onProgress: (p) => setProgress({ completed: p.completed, total: p.total }),
      onTargetResult: (target, success, error) => {
        collected.push({ target, success, error });
      },
    });

    setIsSending(false);
    setResults(collected);
    onSent();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
      onClick={handleClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg space-y-3 overflow-auto rounded-lg border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-lg font-semibold">
            {isBulk ? `Remind ${targets.length} friends` : `Remind ${targets[0].name}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {smtp
              ? isBulk
                ? "Edit the message below — it applies to everyone selected. Each person still gets their own separate email with their own name and amount filled in; no one sees anyone else's."
                : "Edit the message below, then confirm to send."
              : "No email account is configured in Configuration → Email Reminders, so nothing can be sent automatically yet. Use \"Open email draft\" to send manually instead."}
          </p>
        </div>

        {results ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {results.filter((r) => r.success).length} sent
              {results.some((r) => !r.success)
                ? `, ${results.filter((r) => !r.success).length} failed`
                : ""}
            </p>
            <div className="space-y-1.5">
              {results.map((r) => (
                <div
                  key={r.target.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-xs"
                >
                  <span className="font-medium">{r.target.name}</span>
                  <span
                    className={cn(
                      r.success ? "text-success-foreground" : "text-danger-foreground"
                    )}
                  >
                    {r.success ? "Sent" : r.error ?? "Failed"}
                  </span>
                </div>
              ))}
            </div>
            <Button size="sm" onClick={onDismiss}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label htmlFor="reminder-body" className="text-xs font-medium text-muted-foreground">
                Message{" "}
                {isBulk && (
                  <span className="font-normal">
                    ({"{{name}}"} and {"{{amount}}"} are replaced per person)
                  </span>
                )}
              </label>
              <textarea
                id="reminder-body"
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                disabled={isSending}
                className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1 rounded-md border border-dashed border-border bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Preview{isBulk ? ` (example — shown for "${previewName}")` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Subject:</span>{" "}
                {previewSubject}
              </p>
              <p className="whitespace-pre-line text-xs text-muted-foreground">
                {renderedPreview}
              </p>
            </div>

            {isBulk && (
              <div className="rounded-md border border-border divide-y divide-border">
                {targets.map((t) => {
                  const theirAmount = formatCurrency(t.amount, t.currencyCode);
                  const theirBody = renderReminderBody(bodyTemplate, t.name, theirAmount);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs"
                    >
                      <span className="font-medium">{t.name}</span>
                      <span className="font-mono text-success-foreground">
                        {theirAmount}
                      </span>
                      <a
                        href={buildMailtoHref(
                          t.email,
                          buildReminderSubject(theirAmount),
                          theirBody
                        )}
                        className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
                        title={`Open email draft for ${t.name}`}
                      >
                        <Mail className="h-3 w-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {isSending && progress && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending {progress.completed}/{progress.total}…
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleConfirmSend}
                disabled={!smtp || isSending}
              >
                {isSending ? "Sending…" : "Confirm & Send"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose} disabled={isSending}>
                Cancel
              </Button>
              {!isBulk && (
                <a
                  href={buildMailtoHref(
                    targets[0].email,
                    previewSubject,
                    renderedPreview
                  )}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Mail className="h-3 w-3" />
                  Open email draft instead
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
