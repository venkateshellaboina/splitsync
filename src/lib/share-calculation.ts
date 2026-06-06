export function buildUsersPayload(
  amount: number,
  userIds: number[],
  payerId: number
): Record<string, string> {
  const totalCents = Math.round(amount * 100);
  const participantCount = userIds.length;
  const baseOwedCents = Math.floor(totalCents / participantCount);
  const remainderCents = totalCents % participantCount;

  const usersPayload: Record<string, string> = {};

  userIds.forEach((id, index) => {
    let owedCents = baseOwedCents;
    if (index < remainderCents) {
      owedCents += 1;
    }

    usersPayload[`users__${index}__user_id`] = id.toString();
    usersPayload[`users__${index}__owed_share`] = (owedCents / 100).toFixed(2);

    if (id === payerId) {
      usersPayload[`users__${index}__paid_share`] = (totalCents / 100).toFixed(
        2
      );
    } else {
      usersPayload[`users__${index}__paid_share`] = "0.00";
    }
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
