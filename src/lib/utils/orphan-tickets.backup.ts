/**
 * 🔗 Utilidades para manejar boletos huérfanos
 * 
 * Se encarga de:
 * - Verificar si un usuario tiene boletos huérfanos
 * - Vincular automáticamente boletos cuando se crea/logea una cuenta
 * - Mostrar notificaciones de vinculación exitosa
 */

interface OrphanTicket {
  id: string;
  order_id: string;
  event_id: string;
  ticket_type_name: string;
  amount_paid: number;
  currency: string;
  purchase_date: any;
}

interface LinkOrphanTicketsResponse {
  success: boolean;
  linkedTickets: number;
  ticketIds: string[];
  message: string;
}

interface CheckOrphanTicketsResponse {
  hasOrphanTickets: boolean;
  orphanTicketsCount: number;
  orphanTickets: OrphanTicket[];
  message: string;
}

/**
 * 🔍 Verificar si un usuario tiene boletos huérfanos
 */
export async function checkOrphanTickets(userEmail: string): Promise<CheckOrphanTicketsResponse> {
  try {
    const response = await fetch(`/api/auth/link-orphan-tickets?email=${encodeURIComponent(userEmail)}`);
    
    if (!response.ok) {
      throw new Error('Failed to check orphan tickets');
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error checking orphan tickets:', error);
    return {
      hasOrphanTickets: false,
      orphanTicketsCount: 0,
      orphanTickets: [],
      message: 'Error checking orphan tickets'
    };
  }
}

/**
 * 🔗 Vincular boletos huérfanos a una cuenta de usuario
 */
export async function linkOrphanTickets(userEmail: string, userId: string): Promise<LinkOrphanTicketsResponse> {
  try {
    const response = await fetch('/api/auth/link-orphan-tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        userId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to link orphan tickets');
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error linking orphan tickets:', error);
    return {
      success: false,
      linkedTickets: 0,
      ticketIds: [],
      message: 'Error linking orphan tickets'
    };
  }
}

/**
 * 🎯 Función principal: auto-vincular boletos al login/registro
 * 
 * Debe llamarse cuando:
 * 1. Usuario se registra exitosamente
 * 2. Usuario hace login exitosamente
 * 3. Usuario usa autologin después de compra
 */
export async function autoLinkOrphanTicketsOnAuth(userEmail: string, userId: string): Promise<{
  hasLinkedTickets: boolean;
  linkedCount: number;
  shouldShowNotification: boolean;
  message?: string;
}> {
  try {
    console.log('🔄 Auto-linking orphan tickets for user:', { userEmail, userId });
    
    // 1. Verificar si hay boletos huérfanos
    const checkResult = await checkOrphanTickets(userEmail);
    
    if (!checkResult.hasOrphanTickets) {
      console.log('ℹ️ No orphan tickets found for user');
      return {
        hasLinkedTickets: false,
        linkedCount: 0,
        shouldShowNotification: false
      };
    }
    
    console.log(`🎫 Found ${checkResult.orphanTicketsCount} orphan tickets, linking...`);
    
    // 2. Vincular los boletos
    const linkResult = await linkOrphanTickets(userEmail, userId);
    
    if (linkResult.success && linkResult.linkedTickets > 0) {
      console.log(`✅ Successfully linked ${linkResult.linkedTickets} orphan tickets`);
      
      return {
        hasLinkedTickets: true,
        linkedCount: linkResult.linkedTickets,
        shouldShowNotification: true,
        message: `¡Encontramos y vinculamos ${linkResult.linkedTickets} boleto${linkResult.linkedTickets > 1 ? 's' : ''} a tu cuenta!`
      };
    }
    
    return {
      hasLinkedTickets: false,
      linkedCount: 0,
      shouldShowNotification: false,
      message: 'No se pudieron vincular los boletos'
    };
    
  } catch (error) {
    console.error('❌ Error in auto-link orphan tickets:', error);
    return {
      hasLinkedTickets: false,
      linkedCount: 0,
      shouldShowNotification: false,
      message: 'Error al verificar boletos'
    };
  }
}

/**
 * 🎨 Hook React para manejar la vinculación automática
 * 
 * Uso:
 * ```tsx
 * const { checkAndLinkOrphans } = useOrphanTicketsLink();
 * 
 * // Llamar después de login/registro exitoso
 * await checkAndLinkOrphans(user.email, user.uid);
 * ```
 */
export function useOrphanTicketsLink() {
  const checkAndLinkOrphans = async (userEmail: string, userId: string) => {
    const result = await autoLinkOrphanTicketsOnAuth(userEmail, userId);
    
    // Aquí podrías integrar con tu sistema de notificaciones
    if (result.shouldShowNotification && result.message) {
      console.log('🎉 Show success notification:', result.message);
      
      // Ejemplo con react-hot-toast (si lo tienes instalado):
      // toast.success(result.message);
      
      // O con tu sistema de notificaciones existente
      // showNotification('success', result.message);
    }
    
    return result;
  };
  
  return {
    checkAndLinkOrphans,
    checkOrphanTickets,
    linkOrphanTickets
  };
}

export default {
  checkOrphanTickets,
  linkOrphanTickets,
  autoLinkOrphanTicketsOnAuth,
  useOrphanTicketsLink
};
