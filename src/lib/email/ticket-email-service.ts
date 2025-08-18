import { StorageFactory } from '@/lib/storage/storage-factory';
import { EmailApiClient } from './email-client';
import { generateTicketEmailHTML, generateTicketEmailText, EmailTemplateData } from './email-templates';
import { generateTicketPDF } from '@/lib/pdf/pdf-generator';
import { formatCurrency } from '@/lib/utils/currency';

export interface TicketEmailService {
  generateAndSendTicket(
    ticket: any,
    event: any,
    ticketType: any
  ): Promise<{ pdf_url: string; pdf_path: string }>;
}

export class TicketEmailService {
  private emailClient: EmailApiClient;
  
  constructor() {
    this.emailClient = new EmailApiClient();
  }

  async generateAndSendTicket(
    ticket: any,
    event: any, 
    ticketType: any
  ): Promise<{ pdf_url: string; pdf_path: string }> {
    try {
      console.log('🎫 Starting ticket generation and email process for:', ticket.id);
      
      // 1. Generar PDF
      console.log('📄 Generating PDF...');
      const pdfBuffer = await generateTicketPDF(ticket);
      
      // 2. Subir PDF a storage
      console.log('📤 Uploading PDF...');
      const storage = await StorageFactory.create();
      const { url: pdf_url, path: pdf_path } = await storage.saveTicketPDF(ticket, pdfBuffer);
      
      // 3. Preparar datos para el email
      const emailData: EmailTemplateData = {
        attendee_name: ticket.attendee_name,
        attendee_email: ticket.customer_email,
        event: {
          name: event.name,
          start_date: event.start_date,
          end_date: event.end_date,
          location: event.location,
          description: event.description
        },
        ticket: {
          id: ticket.id,
          order_id: ticket.order_id,
          ticket_type_name: ticketType.name,
          price: ticketType.price,
          currency: ticketType.currency || 'USD',
          pdf_url: pdf_url,
          qr_id: ticket.qr_id
        },
        app_url: process.env.NEXT_PUBLIC_APP_URL!,
        qr_validation_url: `${process.env.NEXT_PUBLIC_APP_URL}/validate/${ticket.qr_id}`
      };
      
      // 4. Generar contenido del email
      console.log('📧 Generating email content...');
      const htmlContent = generateTicketEmailHTML(emailData);
      const textContent = generateTicketEmailText(emailData);
      
      // 5. Enviar email
      console.log('📨 Sending email to:', ticket.customer_email);
      await this.emailClient.sendEmail({
        to: ticket.customer_email,
        subject: `🎫 Tu boleto para ${event.name} está listo`,
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ Ticket generated and email sent successfully');
      
      return { pdf_url, pdf_path };
      
    } catch (error) {
      console.error('❌ Error in ticket generation and email process:', error);
      throw error;
    }
  }

  // Método para reenviar boleto (solo admin/gestor)
  async resendTicketEmail(
    ticket: any,
    event: any,
    ticketType: any
  ): Promise<void> {
    try {
      console.log('📮 Resending ticket email for:', ticket.id);
      
      if (!ticket.pdf_url) {
        throw new Error('Ticket PDF not found. Generate PDF first.');
      }
      
      // Preparar datos para el email (reutilizar PDF existente)
      const emailData: EmailTemplateData = {
        attendee_name: ticket.attendee_name,
        attendee_email: ticket.customer_email,
        event: {
          name: event.name,
          start_date: event.start_date,
          end_date: event.end_date,
          location: event.location,
          description: event.description
        },
        ticket: {
          id: ticket.id,
          order_id: ticket.order_id,
          ticket_type_name: ticketType.name,
          price: ticketType.price,
          currency: ticketType.currency || 'USD',
          pdf_url: ticket.pdf_url,
          qr_id: ticket.qr_id
        },
        app_url: process.env.NEXT_PUBLIC_APP_URL!,
        qr_validation_url: `${process.env.NEXT_PUBLIC_APP_URL}/validate/${ticket.qr_id}`
      };
      
      // Generar y enviar email
      const htmlContent = generateTicketEmailHTML(emailData);
      const textContent = generateTicketEmailText(emailData);
      
      await this.emailClient.sendEmail({
        to: ticket.customer_email,
        subject: `🎫 Tu boleto para ${event.name} (Reenviado)`,
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ Ticket email resent successfully');
      
    } catch (error) {
      console.error('❌ Error resending ticket email:', error);
      throw error;
    }
  }

  async testEmailConnection(): Promise<{ success: boolean; message: string }> {
    return await this.emailClient.testConnection();
  }
}
