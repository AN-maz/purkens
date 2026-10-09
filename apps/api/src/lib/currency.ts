export const CURRENCIES = ["IDR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function parseCurrency(value: string | undefined): Currency | null {
  const currency = (value ?? "IDR").toUpperCase();
  return CURRENCIES.includes(currency as Currency)
    ? (currency as Currency)
    : null;
}
