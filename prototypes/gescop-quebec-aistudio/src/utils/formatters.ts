/**
 * Formatage standard québécois (CAD, pourcentages, dates)
 */

export function formatCad(amount: number, includeDecimals: boolean = false): string {
  const formatted = new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount);
  return formatted;
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)} %`;
}

export function formatPercentPlain(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)} %`;
}

export function formatNumberFr(value: number): string {
  return new Intl.NumberFormat('fr-CA').format(value);
}
