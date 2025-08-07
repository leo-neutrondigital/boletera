import { getStorage } from 'firebase-admin/storage';
import { getApp, initializeApp, cert } from 'firebase-admin/app';

export class FirebaseStorageService {
  private bucket;
  
  constructor() {
    // Usar bucket desde variable de entorno - súper fácil cambiar
    const bucketName = process.env.STORAGE_BUCKET_NAME || 
                      process.env.FIREBASE_STORAGE_BUCKET ||
                      'default-tickets-bucket';
    
    console.log('🪣 Using storage bucket:', bucketName);
    
    // ✨ Detectar si necesitamos credenciales específicas para storage
    if (process.env.STORAGE_SERVICE_ACCOUNT_KEY) {
      // Usar Service Account específico para storage
      this.bucket = this.initializeWithCustomCredentials(bucketName);
    } else {
      // Usar credenciales por defecto del proyecto
      this.bucket = getStorage().bucket(bucketName);
    }
  }

  private initializeWithCustomCredentials(bucketName: string) {
    try {
      // Intentar obtener app existente para storage
      const storageApp = getApp('storage-app');
      return getStorage(storageApp).bucket(bucketName);
    } catch {
      // Crear nueva app para storage con credenciales específicas
      const serviceAccountKey = JSON.parse(
        Buffer.from(process.env.STORAGE_SERVICE_ACCOUNT_KEY!, 'base64').toString()
      );
      
      const storageApp = initializeApp({
        credential: cert(serviceAccountKey),
        storageBucket: bucketName
      }, 'storage-app');
      
      return getStorage(storageApp).bucket(bucketName);
    }
  }

  async saveTicketPDF(
    ticket: any, 
    pdfBuffer: Buffer
  ): Promise<{ url: string; path: string }> {
    try {
      // Path organizado: tickets/eventId/filename
      const fileName = `ticket_${ticket.order_id}_${ticket.id}.pdf`;
      const path = `tickets/${ticket.event_id}/${fileName}`;
      
      const file = this.bucket.file(path);
      
      console.log('📄 Saving PDF to:', path);
      
      // Subir archivo con metadata
      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'public, max-age=31536000', // Cache 1 año
          metadata: {
            ticketId: ticket.id,
            orderId: ticket.order_id,
            eventId: ticket.event_id,
            attendeeName: ticket.attendee_name || 'Pendiente',
            generatedAt: new Date().toISOString(),
            version: '1.0'
          }
        }
      });
      
      // Hacer público para acceso directo
      await file.makePublic();
      
      // URL pública
      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${path}`;
      
      console.log('✅ PDF saved successfully:', publicUrl);
      
      return { url: publicUrl, path };
      
    } catch (error) {
      console.error('❌ Error saving PDF to storage:', error);
      throw new Error('Failed to save PDF to storage');
    }
  }

  async getTicketPDFUrl(path: string): Promise<string> {
    return `https://storage.googleapis.com/${this.bucket.name}/${path}`;
  }

  async getSignedUrl(path: string, expiresInHours = 24): Promise<string> {
    try {
      const file = this.bucket.file(path);
      
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + (expiresInHours * 60 * 60 * 1000),
      });
      
      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await this.bucket.file(path).delete();
      console.log('🗑️ File deleted:', path);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const [exists] = await this.bucket.file(path).exists();
      return exists;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }
}
