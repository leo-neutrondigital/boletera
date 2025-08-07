export class ApiStorageService {
  private apiUrl: string;
  private apiToken: string;
  
  constructor() {
    this.apiUrl = process.env.STORAGE_API_URL!;
    this.apiToken = process.env.STORAGE_API_TOKEN!;
    
    if (!this.apiUrl || !this.apiToken) {
      throw new Error('STORAGE_API_URL and STORAGE_API_TOKEN are required');
    }
    
    console.log('🔗 Using API storage at:', this.apiUrl);
  }

  async saveTicketPDF(
    ticket: any, 
    pdfBuffer: Buffer
  ): Promise<{ url: string; path: string }> {
    try {
      // Generar nombre del archivo
      const fileName = `ticket_${ticket.order_id}_${ticket.id}.pdf`;
      const folderPath = `tickets/${ticket.event_id}`;
      
      console.log('📤 Uploading PDF:', fileName);
      
      // Crear FormData
      const formData = new FormData();
      
      // Convertir Buffer a Blob
      const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
      
      // Agregar archivo y metadatos - IMPORTANTE: usar 'archivo' no 'file'
      formData.append('archivo', pdfBlob, fileName);  // ✅ Tu API espera 'archivo'
      formData.append('folder', folderPath);
      formData.append('ticket_id', ticket.id);
      formData.append('order_id', ticket.order_id);
      formData.append('event_id', ticket.event_id);
      formData.append('attendee_name', ticket.attendee_name || '');
      
      // Llamar a tu API
      const response = await fetch(`${this.apiUrl}/upload-ticket.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          // No establecer Content-Type, FormData lo maneja automáticamente
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      // ✅ Tu API devuelve { status: 'ok', url: '...', file: '...' }
      if (result.status !== 'ok') {
        throw new Error(`Upload failed: ${result.message || 'Unknown error'}`);
      }
      
      console.log('✅ PDF uploaded successfully:', result.url);
      
      return {
        url: result.url,
        path: result.file || fileName  // Tu API devuelve 'file', nosotros usamos 'path'
      };
      
    } catch (error) {
      console.error('❌ Error uploading PDF to API:', error);
      throw new Error(`Failed to upload PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTicketPDFUrl(filename: string): Promise<string> {
    // Asumir que tu API devuelve URLs completas
    // Si no, construir la URL aquí
    return filename.startsWith('http') 
      ? filename 
      : `${this.apiUrl}/tickets/${filename}`;
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      console.log('🗑️ Deleting PDF:', filename);
      
      // ✅ Tu API espera $_POST['filename'], no JSON
      const formData = new FormData();
      formData.append('filename', filename);
      
      const response = await fetch(`${this.apiUrl}/delete-ticket.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          // No Content-Type para FormData
        },
        body: formData  // FormData en lugar de JSON
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete API Error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      // ✅ Tu API devuelve { status: 'ok' } o { status: 'error' }
      if (result.status !== 'ok') {
        throw new Error(`Delete failed: ${result.message || 'Unknown error'}`);
      }
      
      console.log('✅ PDF deleted successfully');
      
    } catch (error) {
      console.error('❌ Error deleting PDF:', error);
      // No lanzar error aquí, solo logear
      // El archivo podría no existir, etc.
    }
  }

  async fileExists(filename: string): Promise<boolean> {
    try {
      // Hacer un HEAD request para verificar si existe
      const response = await fetch(`${this.apiUrl}/check-ticket.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: filename
        })
      });
      
      return response.ok;
      
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  // Método para verificar la conexión con tu API
  async checkConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test simple con un request que debería fallar de manera controlada
      const response = await fetch(`${this.apiUrl}/upload-ticket.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        }
        // Sin FormData - debe dar error 400, no 403
      });
      
      // Si obtenemos una respuesta (aunque sea error 400), la conexión funciona
      const result = await response.json();
      
      if (response.status === 403) {
        return {
          success: false,
          message: 'Authentication failed - check API token'
        };
      }
      
      if (response.status === 400 && result.message?.includes('archivo')) {
        return {
          success: true,
          message: 'API connection successful (authentication OK)'
        };
      }
      
      return {
        success: true,
        message: `API responded with status ${response.status}`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `API connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
