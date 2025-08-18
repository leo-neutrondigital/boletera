// src/lib/utils/event-dates.ts
import { format, differenceInDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import type { Event, EventDateInfo } from "@/types";

/**
 * Obtiene información sobre las fechas de un evento
 */
export function getEventDateInfo(event: Event): EventDateInfo {
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  
  const isMultiDay = !isSameDay(startDate, endDate);
  const duration = differenceInDays(endDate, startDate) + 1; // +1 porque incluye ambos días
  
  let dateRange: string;
  
  if (isMultiDay) {
    // Diferentes formatos según la duración
    if (duration <= 7) {
      // Menos de una semana: "15-17 Dic 2024"
      const startDay = format(startDate, "d", { locale: es });
      const endFormat = isSameMonth(startDate, endDate) 
        ? "d MMM yyyy" 
        : "d MMM yyyy";
      const endDay = format(endDate, endFormat, { locale: es });
      
      dateRange = `${startDay}-${endDay}`;
    } else {
      // Más de una semana: "15 Dic - 22 Ene 2024"
      const startFormat = format(startDate, "d MMM", { locale: es });
      const endFormat = format(endDate, "d MMM yyyy", { locale: es });
      dateRange = `${startFormat} - ${endFormat}`;
    }
  } else {
    // Un solo día: "15 Dic 2024"
    dateRange = format(startDate, "d MMM yyyy", { locale: es });
  }
  
  return {
    isMultiDay,
    duration,
    dateRange,
  };
}

/**
 * Genera array de todas las fechas del evento
 */
export function getEventDays(event: Event): Date[] {
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const days: Date[] = [];
  
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

/**
 * Formatea la duración del evento para mostrar al usuario
 */
export function formatEventDuration(duration: number): string {
  if (duration === 1) return "1 día";
  if (duration <= 7) return `${duration} días`;
  
  const weeks = Math.floor(duration / 7);
  const remainingDays = duration % 7;
  
  if (remainingDays === 0) {
    return weeks === 1 ? "1 semana" : `${weeks} semanas`;
  }
  
  return `${weeks} sem ${remainingDays} días`;
}

/**
 * Formatea las fechas del evento para mostrar en emails y PDFs
 * Función compatible con el template de email
 */
export function formatEventDates(startDate: Date, endDate: Date): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const isMultiDay = !isSameDay(start, end);
  
  if (isMultiDay) {
    // Multi-día: "15-17 de Diciembre, 2024"
    const startDay = format(start, "d", { locale: es });
    const endFormat = isSameMonth(start, end) 
      ? "d 'de' MMMM, yyyy" 
      : "d 'de' MMMM, yyyy";
    const endFormatted = format(end, endFormat, { locale: es });
    
    if (isSameMonth(start, end)) {
      return `${startDay}-${endFormatted}`;
    } else {
      const startFormatted = format(start, "d 'de' MMMM", { locale: es });
      return `${startFormatted} - ${endFormatted}`;
    }
  } else {
    // Un solo día: "15 de Diciembre, 2024"
    return format(start, "d 'de' MMMM, yyyy", { locale: es });
  }
}

/**
 * Verifica si dos fechas están en el mismo mes
 */
function isSameMonth(date1: Date, date2: Date): boolean {
  return date1.getMonth() === date2.getMonth() && 
         date1.getFullYear() === date2.getFullYear();
}
