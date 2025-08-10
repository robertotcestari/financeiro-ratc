/**
 * Format currency value for display in Brazilian Real
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Format date for display in Brazilian format
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC'
  }).format(date)
}