import type { EmailSettings } from "@/types";
import {
  buildReminderSubject,
  renderReminderBody,
} from "@/lib/reminders";
import { markReminderSynced } from "@/lib/synced-reminders";
import { formatCurrency } from "@/lib/utils";

export interface RemindTarget {
  id: number;
  name: string;
  email: string;
  amount: number;
  currencyCode: string;
}

export interface EmailSendProgress {
  completed: number;
  total: number;
  succeeded: number;
  failed: number;
}

interface EmailSendCallbacks {
  onProgress: (progress: EmailSendProgress) => void;
  onTargetResult?: (target: RemindTarget, success: boolean, error?: string) => void;
}

async function sendOne(
  smtp: EmailSettings,
  target: RemindTarget,
  bodyTemplate: string
): Promise<{ success: boolean; error?: string }> {
  const amountStr = formatCurrency(target.amount, target.currencyCode);
  const subject = buildReminderSubject(amountStr);
  const body = renderReminderBody(bodyTemplate, target.name, amountStr);

  try {
    const res = await fetch("/api/reminders/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        smtp: {
          host: smtp.host,
          port: smtp.port,
          email: smtp.email,
          appPassword: smtp.appPassword,
        },
        to: target.email,
        subject,
        body,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error ?? "Failed to send" };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send",
    };
  }
}

export async function runBulkRemind(
  targets: RemindTarget[],
  smtp: EmailSettings,
  bodyTemplate: string,
  callbacks: EmailSendCallbacks
): Promise<{ succeeded: number; failed: number }> {
  const total = targets.length;
  let completed = 0;
  let succeeded = 0;
  let failed = 0;

  callbacks.onProgress({ completed: 0, total, succeeded: 0, failed: 0 });

  for (const target of targets) {
    const result = await sendOne(smtp, target, bodyTemplate);
    completed++;

    if (result.success) {
      succeeded++;
      markReminderSynced(target.id, target.name, target.amount, target.currencyCode);
    } else {
      failed++;
    }

    callbacks.onTargetResult?.(target, result.success, result.error);
    callbacks.onProgress({ completed, total, succeeded, failed });
  }

  return { succeeded, failed };
}
