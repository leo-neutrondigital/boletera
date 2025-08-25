import { EmailApiClient } from './email-client';
import { generatePreregistroMarketingEmailHTML, generatePreregistroMarketingEmailText } from './preregistro-marketing.template';

export interface PreregistroEmailData {
  customer_name: string;
  customer_email: string;
  event_name: string;
  event_start_date: Date;
  event_end_date: Date;
  event_location: string;
  event_description?: string;
  interested_tickets: Array<{
    ticket_type_name: string;
    quantity: number;
    unit_price: number;
    currency: string;
  }>;
  app_url: string;
  event_slug: string;
}

export class PreregistroEmailService {
  private emailClient: EmailApiClient;
  
  constructor() {
    this.emailClient = new EmailApiClient();
  }

  async sendPreregistroMarketingEmail(
    preregistroData: PreregistroEmailData
  ): Promise<void> {
    try {
      console.log('📧 Enviando email de preregistro a:', preregistroData.customer_email);
      
      // Generar contenido del email usando los templates existentes
      const htmlContent = generatePreregistroMarketingEmailHTML(preregistroData);
      const textContent = generatePreregistroMarketingEmailText(preregistroData);
      
      // Enviar email usando el cliente existente
      await this.emailClient.sendEmail({
        to: preregistroData.customer_email,
        subject: `¡Tu interés en ${preregistroData.event_name} fue registrado! 🎉`,
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ Email de preregistro enviado exitosamente a:', preregistroData.customer_email);
      
    } catch (error) {
      console.error('❌ Error enviando email de preregistro:', error);
      throw new Error(`Failed to send preregistro email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testEmailConnection(): Promise<{ success: boolean; message: string }> {
    return await this.emailClient.testConnection();
  }
}
