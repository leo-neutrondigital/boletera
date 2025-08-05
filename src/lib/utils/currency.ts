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
 * Alias para formatPrice (para compatibilidad)
 */
export function formatCurrency(amount: number, currency: "MXN" | "USD"): string {
  return formatPrice(amount, currency);
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

/**
 * Convierte entre monedas (placeholder para futura implementación)
 */
export function convertCurrency(
  amount: number, 
  fromCurrency: "MXN" | "USD", 
  toCurrency: "MXN" | "USD",
  exchangeRate?: number
): number {
  if (fromCurrency === toCurrency) return amount;
  
  // Por ahora usar tasa fija (en producción, usar API de cambio)
  const defaultRate = fromCurrency === "USD" ? 18 : 1/18;
  const rate = exchangeRate || defaultRate;
  
  return amount * rate;
}

/**
 * Obtiene el símbolo de la moneda
 */
export function getCurrencySymbol(currency: "MXN" | "USD"): string {
  return CURRENCIES[currency].symbol;
}

/**
 * Formatea cantidad sin símbolo de moneda
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
