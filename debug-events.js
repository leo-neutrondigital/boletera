// Script temporal para debuggear eventos
const admin = require('firebase-admin');

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'boletera-a72e2'
  });
}

async function debugEvents() {
  const db = admin.firestore();
  
  console.log('🔍 Buscando todos los eventos...');
  
  try {
    const eventsSnapshot = await db.collection('events').get();
    console.log(`📋 Total eventos encontrados: ${eventsSnapshot.size}`);
    
    eventsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📄 Evento ID: ${doc.id}`);
      console.log(`   Nombre: ${data.name}`);
      console.log(`   Estado: ${data.status || 'sin estado'}`);
      console.log(`   Activo: ${data.active !== false ? 'Sí' : 'No'}`);
      console.log('---');
    });
    
    // Buscar específicamente el evento problemático
    console.log('\n🎯 Buscando evento específico: 689ggsCvpgcRNSJuLBUt');
    const specificEventDoc = await db.collection('events').doc('689ggsCvpgcRNSJuLBUt').get();
    
    if (specificEventDoc.exists) {
      console.log('✅ Evento encontrado:', specificEventDoc.data());
    } else {
      console.log('❌ Evento NO encontrado');
      
      // Buscar si hay algún evento con ese ID en otra colección o como subcampo
      console.log('\n🔍 Buscando en toda la base de datos...');
      const collections = ['events', 'active_events', 'archived_events'];
      
      for (const collectionName of collections) {
        try {
          const snapshot = await db.collection(collectionName).get();
          console.log(`📋 Revisando colección: ${collectionName} (${snapshot.size} documentos)`);
          
          snapshot.forEach(doc => {
            if (doc.id === '689ggsCvpgcRNSJuLBUt') {
              console.log(`✅ Encontrado en ${collectionName}:`, doc.data());
            }
          });
        } catch (error) {
          console.log(`⚠️ No se pudo acceder a la colección ${collectionName}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

debugEvents();
