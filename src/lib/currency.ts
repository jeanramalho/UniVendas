export const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '');
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeCurrencyInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return formatCurrency(parseCurrencyInput(trimmed));
}

export function currencyInputValue(value?: number): string {
  if (!value) return '';
  return formatCurrency(value);
}
