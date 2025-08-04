// src/lib/utils/currency.ts

export const CURRENCIES = {
  MXN: { symbol: "$", name: "Peso Mexicano" },
  USD: { symbol: "$", name: "Dólar Americano" },
} as const;

/**
 * Formatea un precio con su moneda
 */
export function formatPrice(amount: number, currency: "MXN" | "USD"): string {
  const formatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}

/**
 * Parsea un string de precio a número
 */
export function parsePrice(priceStr: string): number {
  return parseFloat(priceStr.replace(/[^0-9.-]+/g, "")) || 0;
}

/**
 * Valida que un precio sea válido
 */
export function isValidPrice(price: number): boolean {
  return !isNaN(price) && price >= 0 && isFinite(price);
}

/**
 * Formatea precio para mostrar en inputs
 */
export function formatPriceForInput(price: number): string {
  return price.toFixed(2);
}
