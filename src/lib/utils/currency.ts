/**
 * Utilidades para formateo de monedas y precios
 */

const CURRENCY_SYMBOLS = {
  MXN: '$',
  USD: '$',
  EUR: '€',
  GBP: '£',
} as const;

const CURRENCY_NAMES = {
  MXN: 'Peso Mexicano',
  USD: 'Dólar Estadounidense', 
  EUR: 'Euro',
  GBP: 'Libra Esterlina',
} as const;

// Export para compatibilidad con el formulario
export const CURRENCIES = {
  MXN: { name: 'Peso Mexicano', symbol: '$' },
  USD: { name: 'Dólar Estadounidense', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'Libra Esterlina', symbol: '£' },
} as const;

export type Currency = keyof typeof CURRENCY_SYMBOLS;

/**
 * Formatea un precio con símbolo de moneda
 * @param amount - Cantidad numérica
 * @param currency - Código de moneda (MXN, USD, etc.)
 * @param showDecimals - Si mostrar decimales (default: true)
 * @returns String formateado como "$1,234.56"
 */
export function formatCurrency(
  amount: number | string, 
  currency: Currency = 'MXN',
  showDecimals: boolean = true
): string {
  // Convertir a número si es string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Validar que sea un número válido
  if (isNaN(numAmount) || numAmount == null) {
    return `${CURRENCY_SYMBOLS[currency]}0${showDecimals ? '.00' : ''}`;
  }

  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  };

  const formatted = numAmount.toLocaleString('es-MX', options);
  return `${symbol}${formatted}`;
}

/**
 * Formatea precio para inputs de formulario (sin símbolo)
 * @param price - Precio como número o string
 * @returns String con 2 decimales como "1234.56"
 */
export function formatPriceForInput(price: number | string): string {
  // Convertir a número si es string
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Validar que sea un número válido
  if (isNaN(numPrice) || numPrice == null) {
    return '0.00';
  }
  
  return numPrice.toFixed(2);
}

/**
 * Parsea un string de precio a número
 * @param priceString - String como "1234.56" o "$1,234.56"
 * @returns Número parseado o 0 si es inválido
 */
export function parsePriceFromString(priceString: string): number {
  if (!priceString || typeof priceString !== 'string') {
    return 0;
  }

  // Remover símbolos de moneda y espacios
  const cleanString = priceString
    .replace(/[$€£,\s]/g, '') // Remover símbolos comunes y espacios
    .trim();

  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Obtiene el símbolo de una moneda
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency] || '$';
}

/**
 * Obtiene el nombre completo de una moneda
 */
export function getCurrencyName(currency: Currency): string {
  return CURRENCY_NAMES[currency] || 'Moneda Desconocida';
}

/**
 * Valida si un string es un precio válido
 */
export function isValidPrice(priceString: string): boolean {
  const parsed = parsePriceFromString(priceString);
  return parsed >= 0 && !isNaN(parsed);
}

/**
 * Formatea para mostrar rangos de precios
 * @param minPrice - Precio mínimo
 * @param maxPrice - Precio máximo 
 * @param currency - Moneda
 * @returns String como "Desde $500" o "$500 - $1,200"
 */
export function formatPriceRange(
  minPrice: number,
  maxPrice?: number,
  currency: Currency = 'MXN'
): string {
  if (!maxPrice || minPrice === maxPrice) {
    return formatCurrency(minPrice, currency);
  }
  
  return `${formatCurrency(minPrice, currency)} - ${formatCurrency(maxPrice, currency)}`;
}
