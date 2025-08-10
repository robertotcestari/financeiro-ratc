// Shared CSV parsing helpers for legacy unified CSV scripts

export function extractCityCode(propertyName: string): string | null {
  if (!propertyName || propertyName === '-') return null;
  const match = propertyName.match(/^([A-Z]{3})\s*-/);
  return match ? match[1] : null;
}

export function parseMonetaryValue(value: string): number {
  if (!value) return 0;
  let v = value.replace(/^"|"$/g, '');
  v = v.replace(/\./g, '').replace(',', '.');
  return parseFloat(v) || 0;
}

export function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}
