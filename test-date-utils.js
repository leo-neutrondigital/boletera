// Test rápido para verificar las utilidades de fecha
// Ejecuta: node test-date-utils.js

console.log('📅 Probando utilidades de fecha...\n');

// Simular las funciones (simplificadas para Node.js)
function formatDateToDatetimeLocal(date) {
  if (!date) return '';
  
  let dateObj;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    dateObj = new Date(date);
  }
  
  if (isNaN(dateObj.getTime())) {
    console.warn('⚠️ Invalid date:', date);
    return '';
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDatetimeLocal(datetimeString) {
  if (!datetimeString) return new Date();
  return new Date(datetimeString);
}

// Test casos
const testDate = new Date('2024-09-01T14:30:00');
console.log('📅 Fecha original:', testDate);
console.log('🕐 Timezone local:', Intl.DateTimeFormat().resolvedOptions().timeZone);

// Convertir a datetime-local format
const datetimeLocalString = formatDateToDatetimeLocal(testDate);
console.log('📝 Formato datetime-local:', datetimeLocalString);

// Parsear de vuelta
const parsedDate = parseDatetimeLocal(datetimeLocalString);
console.log('🔄 Fecha parseada:', parsedDate);

// Verificar que no hay desfase
const sameDay = testDate.getDate() === parsedDate.getDate();
const sameMonth = testDate.getMonth() === parsedDate.getMonth();
const sameYear = testDate.getFullYear() === parsedDate.getFullYear();

console.log('\n✅ Verificaciones:');
console.log('   - Mismo día:', sameDay);
console.log('   - Mismo mes:', sameMonth);
console.log('   - Mismo año:', sameYear);
console.log('   - Sin desfase:', sameDay && sameMonth && sameYear);

// Test del método anterior (problemático)
const oldMethod = new Date(testDate.getTime() - testDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
console.log('\n🚫 Método anterior (problemático):', oldMethod);
console.log('📝 Método nuevo (correcto):', datetimeLocalString);
console.log('🔍 ¿Son diferentes?', oldMethod !== datetimeLocalString);
