// src/lib/storage/storage-factory.ts

export type StorageType = 'local' | 'cloud' | 'api';

export interface StorageStrategy {
  saveTicketPDF(ticket: any, pdfBuffer: Buffer): Promise<{ url: string; path: string }>;
  getTicketPDFUrl(path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
}

// Factory para crear el storage apropiado
export class StorageFactory {
  static async create(): Promise<StorageStrategy> {
    const storageType = (process.env.STORAGE_TYPE as StorageType) || 'local';
    
    console.log('🛠️ Creating storage of type:', storageType);
    
    switch (storageType) {
      case 'local':
        const { LocalStorageService } = await import('./local-storage');
        return new LocalStorageService();
        
      case 'api':
        const { ApiStorageService } = await import('./api-storage');
        return new ApiStorageService();
        
      case 'cloud':
        const { FirebaseStorageService } = await import('./firebase-storage');
        return new FirebaseStorageService();
        
      default:
        console.warn('⚠️ Unknown storage type, defaulting to local');
        const { LocalStorageService: DefaultLocal } = await import('./local-storage');
        return new DefaultLocal();
    }
  }
}
