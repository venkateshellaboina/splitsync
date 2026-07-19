export const NAME_PLACEHOLDER = "{{name}}";
export const AMOUNT_PLACEHOLDER = "{{amount}}";

export function defaultReminderBody(senderName: string): string {
  return (
    `Hi ${NAME_PLACEHOLDER},\n\n` +
    `Just a friendly reminder that you owe me ${AMOUNT_PLACEHOLDER} on Splitwise. ` +
    `Would you mind settling up when you get a chance?\n\n` +
    `Thanks!\n${senderName}`
  );
}

export function renderReminderBody(
  template: string,
  name: string,
  amountStr: string
): string {
  return template
    .split(NAME_PLACEHOLDER)
    .join(name)
    .split(AMOUNT_PLACEHOLDER)
    .join(amountStr);
}

export function buildReminderSubject(amountStr: string): string {
  return `Splitwise balance reminder — ${amountStr}`;
}

export function buildMailtoHref(
  email: string,
  subject: string,
  body: string
): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
