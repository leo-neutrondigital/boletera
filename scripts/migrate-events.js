// scripts/migrate-events.js
/**
 * Script para migrar eventos existentes al nuevo formato con start_date y end_date
 * Ejecutar: node scripts/migrate-events.js
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin (asegurate de tener las credenciales)
if (!admin.apps.length) {
  admin.initializeApp({
    // Configurar según tu proyecto
    projectId: 'boletera-a72e2', // Reemplaza con tu project ID
  });
}

const db = admin.firestore();

async function migrateEvents() {
  try {
    console.log('🔄 Iniciando migración de eventos...');
    
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.get();
    
    if (snapshot.empty) {
      console.log('ℹ️ No hay eventos para migrar');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Si ya tiene start_date y end_date, saltar
      if (data.start_date && data.end_date) {
        console.log(`⏭️ Saltando ${doc.id} - ya migrado`);
        skippedCount++;
        continue;
      }

      // Si tiene el campo 'date' antiguo, usarlo para ambas fechas
      if (data.date) {
        const updateData = {
          start_date: data.date,
          end_date: data.date, // Para eventos de un día
          updated_at: admin.firestore.Timestamp.now(),
        };

        await doc.ref.update(updateData);
        console.log(`✅ Migrado ${doc.id}: ${data.name}`);
        migratedCount++;
      } else {
        console.log(`⚠️ ${doc.id} no tiene fecha definida - requiere revisión manual`);
      }
    }

    console.log(`🎉 Migración completada:`);
    console.log(`   - Eventos migrados: ${migratedCount}`);
    console.log(`   - Eventos saltados: ${skippedCount}`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
}

// Ejecutar migración
migrateEvents()
  .then(() => {
    console.log('👋 Proceso de migración finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
