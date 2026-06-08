export type UserShareMap = Record<string, number>;

export function getUserShareWeights(
  selectedUserIds: string[],
  userShares?: UserShareMap
): number[] {
  return selectedUserIds.map((id) => Math.max(1, userShares?.[id] ?? 1));
}

export function buildUserShareMap(
  selectedUserIds: string[],
  previous?: UserShareMap
): UserShareMap {
  const shares: UserShareMap = {};
  for (const id of selectedUserIds) {
    shares[id] = Math.max(1, previous?.[id] ?? 1);
  }
  return shares;
}

export function defaultUserShareMap(selectedUserIds: string[]): UserShareMap {
  return buildUserShareMap(selectedUserIds);
}

export function hasCustomShares(
  selectedUserIds: string[],
  userShares?: UserShareMap
): boolean {
  return selectedUserIds.some((id) => (userShares?.[id] ?? 1) !== 1);
}

export function formatShareRatio(weights: number[]): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = weights.reduce((acc, weight) => gcd(acc, weight));
  return weights.map((weight) => weight / divisor).join(":");
}
