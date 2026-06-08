function distributeWeightedCents(
  totalCents: number,
  weights: number[]
): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const owedCents = weights.map((weight) =>
    Math.floor((totalCents * weight) / totalWeight)
  );
  const remainder = totalCents - owedCents.reduce((sum, cents) => sum + cents, 0);

  const fractional = weights.map((weight, index) => ({
    index,
    fraction: (totalCents * weight) / totalWeight - owedCents[index],
  }));
  fractional.sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < remainder; i++) {
    owedCents[fractional[i % fractional.length].index]++;
  }

  return owedCents;
}

/**
 * Build Splitwise users payload. Always includes the payer (who paid the bill).
 * `splitUserIds` are the members selected to owe a share of the expense.
 */
export function buildUsersPayload(
  amount: number,
  splitUserIds: number[],
  payerId: number,
  shareWeights?: number[]
): Record<string, string> {
  const totalCents = Math.round(amount * 100);
  const weights = splitUserIds.map((_, index) =>
    Math.max(1, shareWeights?.[index] ?? 1)
  );

  const owedByUserId = new Map<number, number>();
  if (splitUserIds.length > 0) {
    const owedCents = distributeWeightedCents(totalCents, weights);
    splitUserIds.forEach((id, index) => {
      owedByUserId.set(id, owedCents[index]);
    });
  }

  const participantIds = [...splitUserIds];
  if (!participantIds.includes(payerId)) {
    participantIds.unshift(payerId);
  }

  const usersPayload: Record<string, string> = {};
  participantIds.forEach((id, index) => {
    const owedCents = owedByUserId.get(id) ?? 0;
    usersPayload[`users__${index}__user_id`] = id.toString();
    usersPayload[`users__${index}__owed_share`] = (owedCents / 100).toFixed(2);
    usersPayload[`users__${index}__paid_share`] =
      id === payerId ? (totalCents / 100).toFixed(2) : "0.00";
  });

  return usersPayload;
}

export function toFormUrlEncoded(
  params: Record<string, string>
): string {
  return Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");
}
