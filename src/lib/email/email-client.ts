import crypto from 'crypto';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailApiClient {
  private apiUrl: string;
  private apiToken: string;
  private hmacSecret: string;
  private isConfigured: boolean = false;

  constructor() {
    this.apiUrl = process.env.EMAIL_API_URL!;
    this.apiToken = process.env.EMAIL_API_TOKEN!;
    this.hmacSecret = process.env.EMAIL_HMAC_SECRET!;
    
    // Debug: Mostrar qué variables están disponibles
    console.log('🔍 Email environment variables check:', {
      EMAIL_API_URL: !!process.env.EMAIL_API_URL,
      EMAIL_API_TOKEN: !!process.env.EMAIL_API_TOKEN,
      EMAIL_HMAC_SECRET: !!process.env.EMAIL_HMAC_SECRET,
      allEnvKeys: Object.keys(process.env).filter(key => key.startsWith('EMAIL')),
    });
    
    if (!this.apiUrl || !this.apiToken || !this.hmacSecret) {
      console.error('❌ Email API not configured - missing environment variables');
      console.error('Missing vars:', {
        EMAIL_API_URL: !this.apiUrl,
        EMAIL_API_TOKEN: !this.apiToken,
        EMAIL_HMAC_SECRET: !this.hmacSecret,
      });
      this.isConfigured = false;
      // No lanzar error, solo marcar como no configurado
      return;
    }
    
    this.isConfigured = true;
    console.log('📧 Email API client initialized for:', this.apiUrl);
  }

  async sendEmail(payload: EmailPayload): Promise<void> {
    if (!this.isConfigured) {
      console.warn('⚠️ Email API not configured - skipping email send');
      return;
    }
    
    try {
      console.log('📤 Sending email to:', payload.to);
      
      // 1. Preparar payload JSON
      const jsonPayload = JSON.stringify(payload);
      
      // 2. Generar timestamp Unix
      const timestamp = Math.floor(Date.now() / 1000).toString();
      
      // 3. Crear string para firmar: timestamp.body
      const stringToSign = `${timestamp}.${jsonPayload}`;
      
      // 4. Generar signature HMAC-SHA256
      const signature = crypto
        .createHmac('sha256', this.hmacSecret)
        .update(stringToSign)
        .digest('hex');
      
      console.log('🔐 Authentication prepared:', {
        timestamp,
        payloadSize: jsonPayload.length,
        signaturePreview: signature.substring(0, 8) + '...'
      });
      
      // 5. Hacer request con headers de autenticación
      const response = await fetch(`${this.apiUrl}/send-email.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': this.apiToken,
          'X-Timestamp': timestamp,
          'X-Signature': signature,
        },
        body: jsonPayload
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Email API error response:', errorText);
        throw new Error(`Email API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(`Email send failed: ${result.error || 'Unknown error'}`);
      }
      
      console.log('✅ Email sent successfully to:', payload.to);
      
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Método para verificar la conexión con tu API de email
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Email API not configured - missing environment variables'
      };
    }
    
    try {
      // Test con payload mínimo que debería fallar de manera controlada
      await this.sendEmail({
        to: 'test@example.com',
        subject: 'Connection test',
        html: '<p>Test</p>',
        text: 'Test'
      });
      
      return {
        success: true,
        message: 'Email API connection successful'
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Si falla por email inválido, significa que la autenticación funcionó
      if (errorMessage.includes('invalid recipient') || errorMessage.includes('invalid_domains')) {
        return {
          success: true,
          message: 'Email API connection successful (authentication working)'
        };
      }
      
      return {
        success: false,
        message: `Email API connection failed: ${errorMessage}`
      };
    }
  }
}
