import type { EmailProviderId } from "@/types";

export const PROVIDER_LABELS: Record<EmailProviderId, string> = {
  gmail: "Gmail / Google Workspace",
  outlook: "Outlook / Microsoft 365",
  yahoo: "Yahoo Mail",
  icloud: "iCloud Mail",
  custom: "Custom",
};

export const PROVIDER_PRESETS: Record<
  EmailProviderId,
  { host: string; port: number } | null
> = {
  gmail: { host: "smtp.gmail.com", port: 587 },
  outlook: { host: "smtp.office365.com", port: 587 },
  yahoo: { host: "smtp.mail.yahoo.com", port: 587 },
  icloud: { host: "smtp.mail.me.com", port: 587 },
  custom: null,
};

export function detectProviderFromEmail(email: string): EmailProviderId {
  const domain = email.split("@")[1]?.toLowerCase().trim() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") return "gmail";
  if (
    domain === "outlook.com" ||
    domain === "hotmail.com" ||
    domain === "live.com" ||
    domain === "msn.com"
  ) {
    return "outlook";
  }
  if (domain.startsWith("yahoo.")) return "yahoo";
  if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com") {
    return "icloud";
  }
  return "custom";
}
