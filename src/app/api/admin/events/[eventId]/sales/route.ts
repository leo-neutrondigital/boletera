import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthFromRequest, requireRoles } from "@/lib/auth/server-auth";

interface RouteParams {
  params: { eventId: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 🔐 Verificar autenticación y permisos
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid token' },
        { status: 401 }
      );
    }
    
    if (!requireRoles(user.roles, ['admin', 'gestor', 'comprobador'])) {
      return NextResponse.json(
        { 
          error: 'Forbidden - Admin, Gestor or Comprobador access required',
          required: ['admin', 'gestor', 'comprobador'],
          current: user.roles
        },
        { status: 403 }
      );
    }

    const { eventId } = params;
    
    // 📄 Parámetros de paginación y tipo de datos
    const url = new URL(request.url);
    const dataType = url.searchParams.get('dataType'); // 'sales' | 'courtesies' | undefined (all)
    const salesPage = parseInt(url.searchParams.get('salesPage') || '1');
    const salesLimit = parseInt(url.searchParams.get('salesLimit') || '10');
    const courtesyPage = parseInt(url.searchParams.get('courtesyPage') || '1');
    const courtesyLimit = parseInt(url.searchParams.get('courtesyLimit') || '10');
    
    console.log(`📈 Loading sales data for event: ${eventId}`);
    console.log(`👤 Requested by user: ${user.email} (roles: ${user.roles.join(', ')})`);
    console.log(`📊 Data type requested: ${dataType || 'all (default)'}`);
    console.log(`📄 Pagination: Sales(${salesPage}/${salesLimit}) Courtesy(${courtesyPage}/${courtesyLimit})`);

    // 🎯 Variables para almacenar resultados
    let salesOrders: any[] = [];
    let salesStats = {
      total_revenue: 0,
      total_tickets: 0,
      configured_tickets: 0,
      pending_tickets: 0,
      used_tickets: 0,
      total_orders: 0,
      avg_order_value: 0,
      currency: 'MXN',
      by_ticket_type: {} as Record<string, { sold: number; revenue: number; avg_price: number }>
    };
    let salesTotalOrders = 0;
    let salesTotalPages = 0;
    let courtesyTotalOrders = 0;
    let courtesyTotalPages = 0;

    // 📈 VENTAS: Solo ejecutar si se solicitan (dataType='sales' o sin especificar)
    if (!dataType || dataType === 'sales') {
    console.log('🎫 Fetching SALES data...');
    
    // Obtener todos los tickets VENDIDOS del evento
    // 🎯 QUERY SUPER OPTIMIZADA: Filtrar por prefijo de order_id en Firestore
    // Ventas online tienen order_id que comienza con:
    // - "pi_" → Stripe Payment Intents (método principal)
    // - "cs_" → Stripe Checkout Sessions (usado por PayPal)
    // Esto excluye automáticamente cortesías (courtesy_*) y offline (offline_sale_*)
    
    console.log(`🔍 Fetching online sales with order_id prefixes: pi_, cs_`);
    
    const [stripePayments, checkoutSessions] = await Promise.all([
      // Query 1: Stripe Payment Intents (pi_)
      adminDb
        .collection("tickets")
        .where("event_id", "==", eventId)
        .where("order_id", ">=", "pi_")
        .where("order_id", "<", "pj") // Siguiente prefijo alfabéticamente
        .orderBy("order_id")
        .get(),
      
      // Query 2: Checkout Sessions (cs_) - PayPal a través de Stripe
      adminDb
        .collection("tickets")
        .where("event_id", "==", eventId)
        .where("order_id", ">=", "cs_")
        .where("order_id", "<", "ct")
        .orderBy("order_id")
        .get()
    ]);
    
    // Combinar resultados
    const allDocs = [...stripePayments.docs, ...checkoutSessions.docs];
    
    const salesTicketsSnapshot = {
      docs: allDocs,
      size: allDocs.length,
      empty: allDocs.length === 0
    };
      
    console.log(`🎫 Found ${stripePayments.size} Stripe + ${checkoutSessions.size} PayPal = ${salesTicketsSnapshot.size} total online sales`);

    // Agrupar tickets por order_id para crear órdenes
    const salesOrdersMap = new Map();

    // Procesar tickets de ventas y agrupar por order_id
    // Ya vienen filtrados por order_id (pi_* o cs_*) desde Firestore
    let processedCount = 0;
    
    salesTicketsSnapshot.docs.forEach(ticketDoc => {
      const ticketData = ticketDoc.data();
      const orderId = ticketData.order_id;
      
      // Validación básica: debe tener order_id
      if (!orderId) {
        return;
      }

      processedCount++;

      // Crear orden si no existe
      if (!salesOrdersMap.has(orderId)) {
        salesOrdersMap.set(orderId, {
          id: orderId,
          customer_name: ticketData.customer_name,
          customer_email: ticketData.customer_email,
          total_tickets: 0,
          configured_tickets: 0,
          pending_tickets: 0,
          used_tickets: 0,
          total_amount: 0,
          currency: ticketData.currency || 'MXN',
          created_at: ticketData.created_at?.toDate ? ticketData.created_at.toDate() : new Date(ticketData.created_at),
          tickets: []
        });
      }

      const order = salesOrdersMap.get(orderId);
      
      // Agregar ticket a la orden
      order.tickets.push({
        id: ticketDoc.id,
        ticket_type_name: ticketData.ticket_type_name,
        attendee_name: ticketData.attendee_name,
        status: ticketData.status
      });

      // Contar tickets por estado - CORREGIDO para usar 'generated'
      order.total_tickets++;
      if (ticketData.status === 'generated') order.configured_tickets++;  // PDF generado
      else if (ticketData.status === 'purchased') order.pending_tickets++; // Sin configurar
      else if (ticketData.status === 'used') order.used_tickets++;

      // Acumular monto
      const amount = ticketData.amount_paid || 0;
      order.total_amount += amount;
      
      // Estadísticas globales - CORREGIDO para usar 'generated'
      salesStats.total_revenue += amount;
      salesStats.total_tickets++;
      if (ticketData.status === 'generated') salesStats.configured_tickets++;  // PDF generado
      else if (ticketData.status === 'purchased') salesStats.pending_tickets++; // Sin configurar
      else if (ticketData.status === 'used') salesStats.used_tickets++;

      // Estadísticas por tipo de boleto
      const typeName = ticketData.ticket_type_name;
      if (!salesStats.by_ticket_type[typeName]) {
        salesStats.by_ticket_type[typeName] = { sold: 0, revenue: 0, avg_price: 0 };
      }
      salesStats.by_ticket_type[typeName].sold++;
      salesStats.by_ticket_type[typeName].revenue += amount;
    });

    console.log(`📊 Processed ${processedCount} online sales tickets into ${salesOrdersMap.size} orders`);

    // Convertir Map a Array y ordenar por fecha
    const allSalesOrders = Array.from(salesOrdersMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // 📄 Aplicar paginación a ventas
    salesTotalOrders = allSalesOrders.length;
    salesTotalPages = Math.ceil(salesTotalOrders / salesLimit);
    const salesStartIndex = (salesPage - 1) * salesLimit;
    const salesEndIndex = salesStartIndex + salesLimit;
    salesOrders = allSalesOrders.slice(salesStartIndex, salesEndIndex);
    
    salesStats.total_orders = salesTotalOrders; // Total real, no paginado

    // Calcular promedios
    salesStats.avg_order_value = salesStats.total_orders > 0 
      ? salesStats.total_revenue / salesStats.total_orders 
      : 0;

    // Calcular precios promedio por tipo
    Object.keys(salesStats.by_ticket_type).forEach(typeName => {
      const typeStats = salesStats.by_ticket_type[typeName];
      typeStats.avg_price = typeStats.sold > 0 ? typeStats.revenue / typeStats.sold : 0;
    });

    console.log(`💰 Sales stats:`, {
      orders: salesOrders.length,
      tickets: salesStats.total_tickets,
      revenue: salesStats.total_revenue
    });
    } // Fin del bloque de ventas

    // 🎁 Variables para cortesías
    let courtesyOrders: any[] = [];
    let courtesyStats = {
      total_courtesy_tickets: 0,
      configured_courtesy: 0,
      pending_courtesy: 0,
      by_courtesy_type: {} as Record<string, number>
    };

    // 🎁 CORTESÍAS: Solo ejecutar si se solicitan (dataType='courtesies' o sin especificar)
    if (!dataType || dataType === 'courtesies') {
    console.log('🎁 Fetching COURTESY data...');
    
    // Obtener cortesías del evento
    // Si no tiene el campo is_courtesy, usaremos un enfoque diferente
    let courtesyTicketsSnapshot;
    
    try {
      // Intentar buscar con is_courtesy = true
      courtesyTicketsSnapshot = await adminDb
        .collection("tickets")
        .where("event_id", "==", eventId)
        .where("is_courtesy", "==", true)
        .orderBy("created_at", "desc")
        .get();
        
      console.log(`🎁 Found ${courtesyTicketsSnapshot.size} courtesy tickets (with is_courtesy filter)`);
      
      // Si no encuentra nada, buscar por courtesy_type que existe
      if (courtesyTicketsSnapshot.empty) {
        console.log('🔄 No tickets found with is_courtesy=true, trying courtesy_type filter...');
        
        courtesyTicketsSnapshot = await adminDb
          .collection("tickets")
          .where("event_id", "==", eventId)
          .where("courtesy_type", "!=", null)
          .orderBy("created_at", "desc")
          .get();
          
        console.log(`🎁 Found ${courtesyTicketsSnapshot.size} courtesy tickets (by courtesy_type)`);
      }
    } catch (error) {
      console.warn('⚠️ Error with courtesy filters, setting empty result:', error);
      
      // Si hay error, crear un snapshot vacío
      courtesyTicketsSnapshot = {
        size: 0,
        empty: true,
        docs: []
      };
    }

    // Agrupar cortesías por order_id
    const courtesyOrdersMap = new Map();

    (courtesyTicketsSnapshot.docs || []).forEach(ticketDoc => {
      const ticketData = ticketDoc.data();
      const orderId = ticketData.order_id;
      
      // Solo procesar si realmente es una cortesía
      const isCourtesy = ticketData.is_courtesy === true || ticketData.courtesy_type;
      if (!isCourtesy) return;
      
      if (!orderId) {
        console.warn(`⚠️ Courtesy ticket ${ticketDoc.id} has no order_id`);
        return;
      }

      // Crear orden de cortesía si no existe
      if (!courtesyOrdersMap.has(orderId)) {
        courtesyOrdersMap.set(orderId, {
          id: orderId,
          customer_name: ticketData.customer_name,
          customer_email: ticketData.customer_email,
          total_tickets: 0,
          configured_tickets: 0,
          pending_tickets: 0,
          courtesy_type: ticketData.courtesy_type || 'otro',
          created_at: ticketData.created_at?.toDate ? ticketData.created_at.toDate() : new Date(ticketData.created_at),
          tickets: []
        });
      }

      const order = courtesyOrdersMap.get(orderId);
      
      // Agregar ticket a la orden
      order.tickets.push({
        id: ticketDoc.id,
        ticket_type_name: ticketData.ticket_type_name,
        attendee_name: ticketData.attendee_name
      });

      // Contar tickets por estado - CORREGIDO para usar 'generated'
      order.total_tickets++;
      if (ticketData.status === 'generated') order.configured_tickets++;  // PDF generado
      else order.pending_tickets++;  // Sin configurar

      // Estadísticas globales de cortesías - CORREGIDO para usar 'generated'
      courtesyStats.total_courtesy_tickets++;
      if (ticketData.status === 'generated') courtesyStats.configured_courtesy++;  // PDF generado
      else courtesyStats.pending_courtesy++;  // Sin configurar
      
      const courtesyType = ticketData.courtesy_type || 'otro';
      courtesyStats.by_courtesy_type[courtesyType] = (courtesyStats.by_courtesy_type[courtesyType] || 0) + 1;
    });

    // Convertir Map a Array y ordenar por fecha
    const allCourtesyOrders = Array.from(courtesyOrdersMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // 📄 Aplicar paginación a cortesías
    courtesyTotalOrders = allCourtesyOrders.length;
    courtesyTotalPages = Math.ceil(courtesyTotalOrders / courtesyLimit);
    const courtesyStartIndex = (courtesyPage - 1) * courtesyLimit;
    const courtesyEndIndex = courtesyStartIndex + courtesyLimit;
    courtesyOrders = allCourtesyOrders.slice(courtesyStartIndex, courtesyEndIndex);

    console.log(`🎁 Courtesy stats:`, {
      orders: courtesyOrders.length,
      tickets: courtesyStats.total_courtesy_tickets
    });
    } // Fin del bloque de cortesías

    // 📄 Respuesta estructurada con paginación
    const response = {
      success: true,
      event_id: eventId,
      sales: {
        orders: salesOrders,
        stats: salesStats,
        pagination: {
          currentPage: salesPage,
          totalPages: salesTotalPages,
          totalItems: salesTotalOrders,
          itemsPerPage: salesLimit,
          hasNextPage: salesPage < salesTotalPages,
          hasPrevPage: salesPage > 1
        }
      },
      courtesies: {
        orders: courtesyOrders,
        stats: courtesyStats,
        pagination: {
          currentPage: courtesyPage,
          totalPages: courtesyTotalPages,
          totalItems: courtesyTotalOrders,
          itemsPerPage: courtesyLimit,
          hasNextPage: courtesyPage < courtesyTotalPages,
          hasPrevPage: courtesyPage > 1
        }
      },
      summary: {
        total_tickets: salesStats.total_tickets + courtesyStats.total_courtesy_tickets,
        total_revenue: salesStats.total_revenue,
        total_orders: salesTotalOrders + courtesyTotalOrders, // Totales reales
        sales_orders: salesTotalOrders,
        courtesy_orders: courtesyTotalOrders
      }
    };

    console.log(`✅ Event sales data loaded for ${eventId}:`, {
      sales_orders: salesOrders.length,
      courtesy_orders: courtesyOrders.length,
      total_revenue: salesStats.total_revenue,
      total_tickets: response.summary.total_tickets
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ Error loading event sales data:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      }, 
      { status: 500 }
    );
  }
}
