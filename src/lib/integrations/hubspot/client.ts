import { HubSpotContactData, HubSpotResponse, HubSpotSearchResponse, HubSpotError } from './types';

export class HubSpotClient {
  private apiKey: string;
  private baseUrl = 'https://api.hubapi.com';

  constructor() {
    this.apiKey = process.env.HUBSPOT_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('HUBSPOT_API_KEY is required');
    }
    
    // Debug: log del token (solo primeros caracteres por seguridad)
    console.log('🔧 HubSpot API Key configured:', this.apiKey.substring(0, 8) + '...');
  }

  /**
   * Buscar contacto por email
   */
  async searchContactByEmail(email: string): Promise<HubSpotResponse | null> {
    try {
      const response = await this.makeRequest('POST', '/crm/v3/objects/contacts/search', {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email
              }
            ]
          }
        ],
        properties: ['email', 'firstname', 'lastname', 'phone', 'company'],
        limit: 1
      });

      const searchResponse = response as HubSpotSearchResponse;
      
      if (searchResponse.total > 0 && searchResponse.results.length > 0) {
        return searchResponse.results[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error searching contact by email:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo contacto
   */
  async createContact(contactData: HubSpotContactData): Promise<HubSpotResponse> {
    try {
      const response = await this.makeRequest('POST', '/crm/v3/objects/contacts', contactData);
      return response as HubSpotResponse;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Actualizar contacto existente
   */
  async updateContact(contactId: string, contactData: HubSpotContactData): Promise<HubSpotResponse> {
    try {
      const response = await this.makeRequest('PATCH', `/crm/v3/objects/contacts/${contactId}`, contactData);
      return response as HubSpotResponse;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Realizar petición HTTP a HubSpot API
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Para Private Apps, usar Bearer token
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    console.log('🔧 Making request to:', url);
    console.log('🔧 Headers:', { ...headers, Authorization: 'Bearer ***' });

    const options: RequestInit = {
      method,
      headers
    };

    if (data && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ HubSpot API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          errorData: errorData
        });
        
        const error: HubSpotError = {
          status: response.status.toString(),
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          correlationId: errorData.correlationId || 'unknown',
          category: errorData.category || 'HTTP_ERROR'
        };
        throw error;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        // Es un HubSpotError, re-lanzar tal como está
        throw error;
      }
      
      // Error de red u otro tipo
      console.error('❌ Network/Other Error:', error);
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validar que la configuración sea correcta
   */
  static isConfigured(): boolean {
    return !!(process.env.HUBSPOT_API_KEY && process.env.HUBSPOT_ENABLED === 'true');
  }
}
