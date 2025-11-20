// 📅 Utilidades centralizadas para manejo consistente de fechas
// Resuelve problemas de timezone y desfases entre frontend/backend

/**
 * Convierte cualquier fecha a string en formato YYYY-MM-DD usando timezone local
 * Evita problemas de desfase por UTC conversion
 */
export function formatDateToLocalString(date: any): string {
  let dateObj: Date;
  
  // Manejar diferentes tipos de entrada
  if (!date) {
    return '';
  }
  
  if (date?.toDate) {
    // Firestore Timestamp
    dateObj = date.toDate();
  } else if (typeof date === 'string') {
    // String date
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    // Date object
    dateObj = date;
  } else {
    // Fallback
    dateObj = new Date(date);
  }
  
  // Verificar que sea una fecha válida
  if (isNaN(dateObj.getTime())) {
    console.warn('⚠️ Invalid date provided to formatDateToLocalString:', date);
    return '';
  }
  
  // Usar timezone local en lugar de UTC
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD usando timezone local
 */
export function getTodayAsLocalString(): string {
  const today = new Date();
  return formatDateToLocalString(today);
}

/**
 * 🆕 Obtiene la fecha actual en timezone de México (America/Mexico_City)
 * Útil para asegurar consistencia en la aplicación
 */
export function getTodayInMexicoTimezone(): string {
  const now = new Date();
  // Usar timezone específico de México
  const mexicoDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  
  const year = mexicoDate.getFullYear();
  const month = String(mexicoDate.getMonth() + 1).padStart(2, '0');
  const day = String(mexicoDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 🆕 Convierte cualquier fecha a string YYYY-MM-DD usando timezone de México
 * Evita desfases por diferencias de timezone entre servidor y zona horaria de la app
 */
export function formatDateToMexicoTimezone(date: any): string {
  if (!date) {
    return '';
  }
  
  let dateObj: Date;
  
  // Manejar diferentes tipos de entrada
  if (date?.toDate) {
    // Firestore Timestamp
    dateObj = date.toDate();
  } else if (typeof date === 'string') {
    // String date
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    // Date object
    dateObj = date;
  } else {
    // Fallback
    dateObj = new Date(date);
  }
  
  // Verificar que sea una fecha válida
  if (isNaN(dateObj.getTime())) {
    console.warn('⚠️ Invalid date provided to formatDateToMexicoTimezone:', date);
    return '';
  }
  
  // Convertir a timezone México antes de extraer componentes
  const mexicoDate = new Date(
    dateObj.toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
  );
  
  const year = mexicoDate.getFullYear();
  const month = String(mexicoDate.getMonth() + 1).padStart(2, '0');
  const day = String(mexicoDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Convierte fecha a Date object desde diferentes formatos
 */
export function normalizeDate(date: any): Date {
  if (!date) {
    return new Date();
  }
  
  if (date?.toDate) {
    // Firestore Timestamp
    return date.toDate();
  } else if (typeof date === 'string') {
    // String date
    return new Date(date);
  } else if (date instanceof Date) {
    // Date object
    return date;
  } else {
    // Fallback
    return new Date(date);
  }
}

/**
 * 🆕 Convierte Date a formato datetime-local para inputs HTML
 * Evita problemas de timezone que causan desfases de día
 */
export function formatDateToDatetimeLocal(date: any): string {
  if (!date) {
    return '';
  }
  
  const dateObj = normalizeDate(date);
  
  if (isNaN(dateObj.getTime())) {
    console.warn('⚠️ Invalid date provided to formatDateToDatetimeLocal:', date);
    return '';
  }
  
  // Usar timezone local para evitar desfases
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * 🆕 Convierte valor de input datetime-local a Date object
 * Maneja correctamente el timezone local
 */
export function parseDatetimeLocal(datetimeString: string): Date {
  if (!datetimeString) {
    return new Date();
  }
  
  // datetime-local ya está en timezone local, no necesita conversión
  return new Date(datetimeString);
}

/**
 * Verifica si una fecha está dentro del rango de un evento
 * Usa timezone local para evitar desfases
 */
export function isDateInEventRange(
  checkDate: string | Date,
  eventStartDate: any,
  eventEndDate: any
): { 
  isInRange: boolean;
  isBefore: boolean;
  isAfter: boolean;
  checkDateStr: string;
  eventStartStr: string;
  eventEndStr: string;
} {
  const checkDateStr = typeof checkDate === 'string' 
    ? checkDate 
    : formatDateToLocalString(checkDate);
  
  const eventStartStr = formatDateToLocalString(eventStartDate);
  const eventEndStr = formatDateToLocalString(eventEndDate);
  
  const isBefore = checkDateStr < eventStartStr;
  const isAfter = checkDateStr > eventEndStr;
  const isInRange = !isBefore && !isAfter;
  
  return {
    isInRange,
    isBefore,
    isAfter,
    checkDateStr,
    eventStartStr,
    eventEndStr
  };
}

/**
 * Formatea una fecha para mostrar en español usando timezone de México
 * Formato: "viernes 1 de septiembre"
 */
export function formatDateForDisplayMexico(dateStr: string): string {
  try {
    // Crear fecha asumiendo que dateStr está en formato YYYY-MM-DD en timezone México
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Crear fecha específicamente en timezone México
    const date = new Date();
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0); // Mediodía para evitar problemas de timezone
    
    // Formatear usando Intl para español de México
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Mexico_City'
    }).format(date);
  } catch (error) {
    console.warn('⚠️ Error formatting date for display:', dateStr, error);
    return dateStr;
  }
}

/**
 * Debug helper para logging de fechas
 */
export function debugDate(label: string, date: any): void {
  console.log(`📅 ${label}:`, {
    original: date,
    normalized: normalizeDate(date),
    localString: formatDateToLocalString(date),
    datetimeLocal: formatDateToDatetimeLocal(date),
    utcString: date?.toISOString ? date.toISOString().split('T')[0] : 'N/A',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
}
