/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */

const admin = require('firebase-admin');
const { generateUniqueEventSlug } = require('../src/lib/utils/slug-generator');

// Inicializar Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function migrateEventsForCart() {
  console.log('🚀 Iniciando migración de eventos para carrito de compras...');
  
  try {
    // Obtener todos los eventos
    const eventsSnapshot = await db.collection('events').get();
    
    if (eventsSnapshot.empty) {
      console.log('❌ No hay eventos para migrar');
      return;
    }
    
    console.log(`📝 Encontrados ${eventsSnapshot.docs.length} eventos para migrar`);
    
    const existingSlugs = [];
    const batch = db.batch();
    let updateCount = 0;
    
    // Primera pasada: recopilar slugs existentes
    eventsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.slug) {
        existingSlugs.push(data.slug);
      }
    });
    
    // Segunda pasada: actualizar eventos
    for (const doc of eventsSnapshot.docs) {
      const data = doc.data();
      const eventRef = db.collection('events').doc(doc.id);
      
      // Determinar qué campos necesitan actualización
      const updates = {};
      let needsUpdate = false;
      
      // Generar slug si no existe
      if (!data.slug) {
        const startDate = data.start_date.toDate();
        const slug = generateUniqueEventSlug(data.name, startDate, existingSlugs);
        updates.slug = slug;
        existingSlugs.push(slug);
        needsUpdate = true;
        console.log(`  📌 Generando slug para "${data.name}": ${slug}`);
      }
      
      // Establecer valores por defecto para campos nuevos
      if (data.allow_preregistration === undefined) {
        updates.allow_preregistration = false;
        needsUpdate = true;
      }
      
      if (!data.public_description) {
        updates.public_description = data.description || '';
        needsUpdate = true;
      }
      
      if (!data.preregistration_message) {
        updates.preregistration_message = '';
        needsUpdate = true;
      }
      
      if (!data.featured_image_url) {
        updates.featured_image_url = '';
        needsUpdate = true;
      }
      
      if (!data.terms_and_conditions) {
        updates.terms_and_conditions = '';
        needsUpdate = true;
      }
      
      if (!data.contact_email) {
        updates.contact_email = '';
        needsUpdate = true;
      }
      
      // Solo actualizar si hay cambios
      if (needsUpdate) {
        updates.updated_at = admin.firestore.Timestamp.now();
        batch.update(eventRef, updates);
        updateCount++;
        
        console.log(`  ✅ Actualizando evento: ${data.name}`);
      } else {
        console.log(`  ⏭️  Evento ya migrado: ${data.name}`);
      }
    }
    
    // Ejecutar actualizaciones en lotes
    if (updateCount > 0) {
      await batch.commit();
      console.log(`\n🎉 Migración completada: ${updateCount} eventos actualizados`);
    } else {
      console.log('\n✨ Todos los eventos ya estaban migrados');
    }
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

async function migrateUsersForCart() {
  console.log('\n🚀 Iniciando migración de usuarios para carrito de compras...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No hay usuarios para migrar');
      return;
    }
    
    console.log(`📝 Encontrados ${usersSnapshot.docs.length} usuarios para migrar`);
    
    const batch = db.batch();
    let updateCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const userRef = db.collection('users').doc(doc.id);
      
      const updates = {};
      let needsUpdate = false;
      
      // Establecer valores por defecto para campos nuevos
      if (data.marketing_consent === undefined) {
        updates.marketing_consent = false;
        needsUpdate = true;
      }
      
      if (!data.created_via) {
        updates.created_via = 'admin'; // Asumir que usuarios existentes fueron creados por admin
        needsUpdate = true;
      }
      
      if (!data.phone) {
        updates.phone = '';
        needsUpdate = true;
      }
      
      if (!data.company) {
        updates.company = '';
        needsUpdate = true;
      }
      
      if (!data.address) {
        updates.address = {
          city: '',
          country: 'México'
        };
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        batch.update(userRef, updates);
        updateCount++;
        console.log(`  ✅ Actualizando usuario: ${data.name} (${data.email})`);
      } else {
        console.log(`  ⏭️  Usuario ya migrado: ${data.name}`);
      }
    }
    
    // Ejecutar actualizaciones
    if (updateCount > 0) {
      await batch.commit();
      console.log(`\n🎉 Migración de usuarios completada: ${updateCount} usuarios actualizados`);
    } else {
      console.log('\n✨ Todos los usuarios ya estaban migrados');
    }
    
  } catch (error) {
    console.error('❌ Error durante la migración de usuarios:', error);
    throw error;
  }
}

async function migrateTicketTypesForCart() {
  console.log('\n🚀 Iniciando migración de tipos de boletos para carrito de compras...');
  
  try {
    const ticketTypesSnapshot = await db.collection('ticket_types').get();
    
    if (ticketTypesSnapshot.empty) {
      console.log('❌ No hay tipos de boletos para migrar');
      return;
    }
    
    console.log(`📝 Encontrados ${ticketTypesSnapshot.docs.length} tipos de boletos para migrar`);
    
    const batch = db.batch();
    let updateCount = 0;
    
    for (const doc of ticketTypesSnapshot.docs) {
      const data = doc.data();
      const ticketTypeRef = db.collection('ticket_types').doc(doc.id);
      
      const updates = {};
      let needsUpdate = false;
      
      // Establecer valores por defecto para campos nuevos
      if (!data.public_description) {
        updates.public_description = data.description || '';
        needsUpdate = true;
      }
      
      if (!data.features) {
        updates.features = [];
        needsUpdate = true;
      }
      
      if (!data.terms) {
        updates.terms = '';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        updates.updated_at = admin.firestore.Timestamp.now();
        batch.update(ticketTypeRef, updates);
        updateCount++;
        console.log(`  ✅ Actualizando tipo de boleto: ${data.name}`);
      } else {
        console.log(`  ⏭️  Tipo de boleto ya migrado: ${data.name}`);
      }
    }
    
    // Ejecutar actualizaciones
    if (updateCount > 0) {
      await batch.commit();
      console.log(`\n🎉 Migración de tipos de boletos completada: ${updateCount} tipos actualizados`);
    } else {
      console.log('\n✨ Todos los tipos de boletos ya estaban migrados');
    }
    
  } catch (error) {
    console.error('❌ Error durante la migración de tipos de boletos:', error);
    throw error;
  }
}

async function createIndexes() {
  console.log('\n🚀 Creando índices necesarios para las nuevas collections...');
  
  try {
    // Los índices se pueden crear automáticamente cuando se hagan las primeras consultas
    // o usando la CLI de Firebase: firebase firestore:indexes
    
    console.log(`
📋 Índices recomendados para crear manualmente:
   
Collection: events
- slug ASC, published ASC
- published ASC, start_date ASC

Collection: preregistrations  
- user_id ASC, event_id ASC
- event_id ASC, created_at DESC
- event_id ASC, status ASC

Collection: carts
- user_id ASC, expires_at DESC
- expires_at ASC (para limpieza)

Collection: orders
- user_id ASC, created_at DESC
- event_id ASC, created_at DESC
- payment_id ASC
- status ASC, paid_at DESC

Collection: tickets
- user_id ASC, created_at DESC
- event_id ASC, created_at DESC
- order_id ASC
- qr_code ASC

Para crear estos índices automáticamente, ejecuta:
firebase firestore:indexes

O crea el archivo firestore.indexes.json con la configuración.
    `);
    
  } catch (error) {
    console.error('❌ Error al mostrar información de índices:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🎯 MIGRACIÓN PARA CARRITO DE COMPRAS - FASE 1: ESTRUCTURA DE DATOS');
    console.log('=' * 70);
    
    await migrateEventsForCart();
    await migrateUsersForCart();
    await migrateTicketTypesForCart();
    await createIndexes();
    
    console.log('\n' + '=' * 70);
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log(`
🎉 Resumen de cambios:
   ✅ Eventos actualizados con campos para carrito
   ✅ Usuarios actualizados con campos para compradores  
   ✅ Tipos de boletos actualizados con campos públicos
   ✅ Índices documentados para creación manual

🚀 Próximos pasos:
   1. Ejecutar: npm install (para instalar nuevas dependencias)
   2. Crear índices de Firestore si es necesario
   3. Configurar variables de entorno para PayPal
   4. Continuar con Fase 2: Landing de eventos

💡 Las nuevas collections (carts, orders, tickets, preregistrations) 
   se crearán automáticamente cuando se usen por primera vez.
    `);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
main();
