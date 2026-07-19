import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CardProvider } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PROVIDER_LABELS: Record<CardProvider, string> = {
  CHASE_CREDIT: "Chase",
  AMEX_CREDIT: "Amex",
  CAPITAL_ONE_CREDIT: "Capital One",
  APPLE_CARD: "Apple Card",
  WELLS_FARGO_CREDIT: "Wells Fargo",
  DISCOVER_CREDIT: "Discover",
  CITI_CREDIT: "Citi",
  CUSTOM_GENERIC: "Generic",
};

export function formatProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider as CardProvider] ?? provider.replace(/_/g, " ");
}

export function formatCurrency(amount: number, currencyCode = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

export function memberDisplayName(
  firstName: string,
  lastName: string | null
): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}
