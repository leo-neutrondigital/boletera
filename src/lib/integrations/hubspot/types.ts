export interface PreregistrationData {
  email: string;
  name: string;
  phone?: string;
  company?: string;
  eventName: string;
  eventId: string;
}

export interface HubSpotContactData {
  properties: {
    email: string;
    firstname: string;
    lastname?: string;
    phone?: string;
    company?: string;
    // Propiedades estándar de HubSpot
    hs_lead_status?: string;
    lifecyclestage?: string;
    // Usar Record para permitir cualquier propiedad adicional
    [key: string]: string | undefined;
  };
}

export interface HubSpotResponse {
  id: string;
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotSearchResponse {
  total: number;
  results: HubSpotResponse[];
}

export interface HubSpotError {
  status: string;
  message: string;
  correlationId: string;
  category: string;
}
