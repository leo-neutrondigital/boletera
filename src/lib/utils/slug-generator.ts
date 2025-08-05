/**
 * Genera un slug URL-friendly desde un string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Reemplazar caracteres especiales del español
    .replace(/[áàäâã]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöôõ]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/ç/g, 'c')
    // Remover caracteres no alfanuméricos excepto espacios y guiones
    .replace(/[^a-z0-9\s-]/g, '')
    // Reemplazar espacios múltiples con uno solo
    .replace(/\s+/g, ' ')
    // Reemplazar espacios con guiones
    .replace(/\s/g, '-')
    // Remover guiones múltiples
    .replace(/-+/g, '-')
    // Remover guiones al inicio y final
    .replace(/^-|-$/g, '');
}

/**
 * Genera un slug único para un evento agregando fecha si es necesario
 */
export function generateUniqueEventSlug(
  eventName: string, 
  startDate: Date,
  existingSlugs: string[] = []
): string {
  let baseSlug = generateSlug(eventName);
  
  // Si el slug está vacío, usar fecha
  if (!baseSlug) {
    baseSlug = `evento-${startDate.getFullYear()}`;
  }
  
  // Si no hay conflicto, retornar el slug base
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  
  // Agregar año si hay conflicto
  const year = startDate.getFullYear();
  const slugWithYear = `${baseSlug}-${year}`;
  
  if (!existingSlugs.includes(slugWithYear)) {
    return slugWithYear;
  }
  
  // Agregar mes si sigue habiendo conflicto
  const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
  const slugWithMonth = `${baseSlug}-${year}-${month}`;
  
  if (!existingSlugs.includes(slugWithMonth)) {
    return slugWithMonth;
  }
  
  // Agregar día si sigue habiendo conflicto
  const day = startDate.getDate().toString().padStart(2, '0');
  const slugWithDay = `${baseSlug}-${year}-${month}-${day}`;
  
  if (!existingSlugs.includes(slugWithDay)) {
    return slugWithDay;
  }
  
  // Último recurso: agregar timestamp
  const timestamp = Date.now().toString().slice(-6);
  return `${baseSlug}-${timestamp}`;
}

/**
 * Valida que un slug sea válido
 */
export function isValidSlug(slug: string): boolean {
  // Solo letras minúsculas, números y guiones
  // No puede empezar o terminar con guión
  // Debe tener al menos 1 carácter
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length >= 1 && slug.length <= 100;
}

/**
 * Genera sugerencias de slug basadas en el nombre del evento
 */
export function generateSlugSuggestions(eventName: string, startDate: Date): string[] {
  const baseSlug = generateSlug(eventName);
  const year = startDate.getFullYear();
  const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
  
  const suggestions = [
    baseSlug,
    `${baseSlug}-${year}`,
    `${baseSlug}-${year}-${month}`,
  ];
  
  // Filtrar duplicados y slugs inválidos
  return [...new Set(suggestions)].filter(slug => isValidSlug(slug));
}

/**
 * Extrae información del slug para mostrar en URLs amigables
 */
export function parseSlugInfo(slug: string): {
  eventName: string;
  year?: number;
  month?: number;
  day?: number;
} {
  const parts = slug.split('-');
  
  // Intentar extraer año del final
  const lastPart = parts[parts.length - 1];
  const yearMatch = lastPart.match(/^\d{4}$/);
  
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    const eventParts = parts.slice(0, -1);
    
    // Verificar si hay mes
    const secondLastPart = parts[parts.length - 2];
    const monthMatch = secondLastPart?.match(/^(0[1-9]|1[0-2])$/);
    
    if (monthMatch) {
      const month = parseInt(monthMatch[0]);
      const eventPartsWithMonth = parts.slice(0, -2);
      
      // Verificar si hay día
      const thirdLastPart = parts[parts.length - 3];
      const dayMatch = thirdLastPart?.match(/^(0[1-9]|[12][0-9]|3[01])$/);
      
      if (dayMatch) {
        const day = parseInt(dayMatch[0]);
        const eventPartsWithDay = parts.slice(0, -3);
        
        return {
          eventName: eventPartsWithDay.join(' '),
          year,
          month,
          day,
        };
      }
      
      return {
        eventName: eventPartsWithMonth.join(' '),
        year,
        month,
      };
    }
    
    return {
      eventName: eventParts.join(' '),
      year,
    };
  }
  
  return {
    eventName: parts.join(' '),
  };
}

/**
 * Genera una URL completa para un evento
 */
export function generateEventURL(slug: string, baseURL?: string): string {
  const base = baseURL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/events/${slug}`;
}

/**
 * Valida y normaliza un slug de entrada del usuario
 */
export function normalizeSlug(inputSlug: string): string {
  return generateSlug(inputSlug);
}
