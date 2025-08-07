import { generateTicketPDF } from '@/lib/pdf/pdf-generator';

export class MockStorageService {
  constructor() {
    console.log('🧪 Using MOCK Storage Service for testing');
  }

  async saveTicketPDF(
    ticket: any, 
    pdfBuffer: Buffer
  ): Promise<{ url: string; path: string }> {
    try {
      const fileName = `ticket_${ticket.order_id}_${ticket.id}.pdf`;
      const path = `tickets/${ticket.event_id}/${fileName}`;
      
      console.log('📄 Mock: Saving PDF to:', path);
      console.log('📊 Mock: PDF size:', pdfBuffer.length, 'bytes');
      
      // Simular guardado exitoso
      const mockUrl = `https://storage.googleapis.com/mock-bucket/${path}`;
      
      console.log('✅ Mock: PDF saved successfully:', mockUrl);
      
      return { url: mockUrl, path };
      
    } catch (error) {
      console.error('❌ Mock: Error saving PDF:', error);
      throw new Error('Mock: Failed to save PDF');
    }
  }

  async getTicketPDFUrl(path: string): Promise<string> {
    return `https://storage.googleapis.com/mock-bucket/${path}`;
  }

  async fileExists(path: string): Promise<boolean> {
    return true; // Mock: always exists
  }
}
