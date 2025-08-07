import { promises as fs } from 'fs';
import path from 'path';

export class LocalStorageService {
  private baseDir: string;
  
  constructor() {
    // Usar public/tickets/pdf como base
    this.baseDir = path.join(process.cwd(), 'public', 'tickets', 'pdf');
    console.log('🏠 Using local storage at:', this.baseDir);
  }

  async saveTicketPDF(
    ticket: any, 
    pdfBuffer: Buffer
  ): Promise<{ url: string; path: string }> {
    try {
      // Generar path organizado
      const fileName = `ticket_${ticket.order_id}_${ticket.id}.pdf`;
      const eventDir = path.join(this.baseDir, ticket.event_id);
      const filePath = path.join(eventDir, fileName);
      
      // Crear directorio del evento si no existe
      await fs.mkdir(eventDir, { recursive: true });
      
      console.log('📄 Saving PDF to:', filePath);
      
      // Guardar archivo
      await fs.writeFile(filePath, pdfBuffer);
      
      // Crear .htaccess en el directorio raíz si no existe
      await this.ensureHtaccess();
      
      // URL pública relativa
      const relativePath = `tickets/pdf/${ticket.event_id}/${fileName}`;
      const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${relativePath}`;
      
      console.log('✅ PDF saved successfully:', publicUrl);
      
      return { url: publicUrl, path: relativePath };
      
    } catch (error) {
      console.error('❌ Error saving PDF locally:', error);
      throw new Error(`Failed to save PDF to local storage: ${error.message}`);
    }
  }

  private async ensureHtaccess(): Promise<void> {
    const htaccessPath = path.join(process.cwd(), 'public', 'tickets', '.htaccess');
    
    try {
      await fs.access(htaccessPath);
      // Ya existe, no hacer nada
    } catch {
      // No existe, crear
      const htaccessContent = `# Boletera PDF Security - Configuración Básica
# ===========================================

# Prevenir listing de directorios
Options -Indexes

# Prevenir embedding en otros sitios
Header always set X-Frame-Options "DENY"

# Prevenir sniffing de tipo de archivo
Header always set X-Content-Type-Options "nosniff"

# Cache control para PDFs (1 día)
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType application/pdf "access plus 1 day"
</IfModule>

# Solo permitir archivos PDF
<Files "*.pdf">
    <RequireAll>
        Require all granted
    </RequireAll>
</Files>

# Bloquear acceso a otros tipos de archivo
<Files "*">
    <If "%{REQUEST_URI} !~ m#\\.pdf$#">
        Require all denied
    </If>
</Files>`;
      
      await fs.writeFile(htaccessPath, htaccessContent);
      console.log('✅ .htaccess created for PDF protection');
    }
  }

  async getTicketPDFUrl(path: string): Promise<string> {
    return `${process.env.NEXT_PUBLIC_APP_URL}/${path}`;
  }

  async deleteFile(relativePath: string): Promise<void> {
    try {
      const fullPath = path.join(process.cwd(), 'public', relativePath);
      await fs.unlink(fullPath);
      console.log('🗑️ Local file deleted:', relativePath);
    } catch (error) {
      console.error('Error deleting local file:', error);
      throw error;
    }
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(process.cwd(), 'public', relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  // Método para verificar que todo está configurado correctamente
  async checkConfiguration(): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar que el directorio base existe y es escribible
      await fs.mkdir(this.baseDir, { recursive: true });
      
      // Probar escribir y leer un archivo de test
      const testFile = path.join(this.baseDir, 'test.txt');
      await fs.writeFile(testFile, 'test');
      await fs.readFile(testFile);
      await fs.unlink(testFile);
      
      return {
        success: true,
        message: 'Local storage configured correctly'
      };
    } catch (error) {
      return {
        success: false,
        message: `Local storage configuration error: ${error.message}`
      };
    }
  }
}
