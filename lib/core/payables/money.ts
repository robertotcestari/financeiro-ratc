export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toNumber(value: { toNumber?: () => number } | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return roundMoney(value);
  if (typeof value === 'string') return roundMoney(Number(value));
  if (typeof value.toNumber === 'function') return roundMoney(value.toNumber());
  return roundMoney(Number(value));
}
