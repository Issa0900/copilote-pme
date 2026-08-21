export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string): string {
  // `value` is a date-only string (YYYY-MM-DD). Parse the components directly
  // instead of `new Date(value)`, which treats it as UTC midnight and can
  // shift the displayed date back a day in timezones behind UTC.
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}
