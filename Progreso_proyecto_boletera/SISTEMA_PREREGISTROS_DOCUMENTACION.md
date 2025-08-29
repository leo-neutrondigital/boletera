# 📋 Sistema de Preregistros y Manejo de Emails - Documentación Técnica

## 🎯 Resumen del Sistema

El proyecto incluye un **sistema completo de preregistros** para captura de leads y un **manejo inteligente de emails duplicados** en compras, diseñado para maximizar conversiones sin crear fricción en el usuario.

---

## 🆕 Funcionalidades Implementadas

### **1. Sistema de Preregistros (Lead Generation)**

**Características:**
- ✅ **NO requiere creación de cuenta** - Solo captura datos como leads
- ✅ **Captura boletos de interés** - Tipos, cantidades y precios deseados
- ✅ **Email de marketing** - Con CTA directo al flujo de compra
- ✅ **Dashboard administrativo** - Gestión completa para el equipo de ventas

**Flujo:**
```
Usuario → Selecciona "Preregistro" → Elige boletos → Llena datos básicos → 
Email marketing → Ventas contacta → Direcciona a compra
```

**Base de Datos:**
```typescript
// Preregistros se guardan con user_id: null
interface Preregistration {
  user_id: null; // Sin asociación a cuentas
  interested_tickets: TicketInterest[]; // Boletos de interés
  status: 'nuevo' | 'contactado' | 'interesado' | 'convertido';
  source: 'landing_page';
}
```

### **2. Dashboard de Preregistros para Admins**

**Ubicación:** `/dashboard/eventos/[id]/preregistros`

**Funcionalidades:**
- ✅ **Lista visual** con tarjetas por preregistro
- ✅ **Boletos de interés** mostrados con precios
- ✅ **WhatsApp directo** con mensaje personalizado automático
- ✅ **Copiar emails** al portapapeles para campañas
- ✅ **Estados de CRM** (Nuevo → Contactado → Interesado → Convertido)
- ✅ **Eliminación múltiple** (solo admins)
- ✅ **Exportación CSV** con filtros
- ✅ **Búsqueda y filtrado** avanzado
- ✅ **Paginación segura** (sin riesgo de romper scroll)

**Permisos:**
- 👀 **Ver**: Admin, Gestor, Comprobador
- ✏️ **Editar**: Admin, Gestor  
- 🗑️ **Eliminar**: Solo Admin

### **3. Manejo Automático de Emails Duplicados**

**Problema resuelto:** Usuarios que intentan comprar con email ya registrado.

**Solución automática:**
1. ✅ **Detección silenciosa** - Sistema detecta email duplicado sin interrumpir
2. ✅ **Compra continúa** - Sin alertas ni opciones confusas para el usuario
3. ✅ **Asociación automática** - Boletos se vinculan a cuenta existente
4. ✅ **Mensaje post-compra** - "Para ver boletos → [Iniciar Sesión]"
5. ✅ **Email específico** - Instrucciones claras para acceder a boletos

**Flujo:**
```
Email duplicado detectado → Compra normal → Boletos a cuenta existente → 
Email: "Inicia sesión para ver boletos" → Botón directo al login
```

---

## 📧 Templates de Email

### **Email de Preregistro (Marketing)**
- 🎯 **Enfoque:** Lead nurturing y conversión
- 📞 **CTA principal:** Botón "¡Comprar ahora!" al flujo del evento
- 📋 **Contenido:** Boletos de interés, próximos pasos, contacto en 24-48h

### **Email de Compra - Email Duplicado**  
- 🎯 **Enfoque:** Acceso a boletos existentes
- 🔑 **CTA principal:** Botón "Iniciar Sesión"
- 📋 **Contenido:** Compra exitosa, instrucciones de acceso, botón de login

### **Email de Compra - Email Nuevo**
- 🎯 **Enfoque:** Bienvenida y configuración
- ⚙️ **CTA principal:** "Configurar asistentes"
- 📋 **Contenido:** Cuenta creada, próximos pasos, acceso automático

---

## 🗂️ Estructura de Archivos

### **Componentes Nuevos:**
```
src/app/dashboard/eventos/[id]/preregistros/
├── page.tsx                    # Página principal
├── preregistros-page-client.tsx # Componente cliente completo
└── layout.tsx                  # Provider wrapper

src/lib/utils/
└── preregistros-utils.ts       # Utilidades (WhatsApp, copiar email)

src/lib/email/
└── preregistro-confirmation.template.ts # Template de marketing
```

### **APIs Actualizadas:**
```
src/lib/api/
├── preregistrations.ts         # CRUD completo + stats
└── 

src/app/api/payments/
└── capture/route.ts            # Manejo automático de emails duplicados
```

### **Contextos Expandidos:**
```
src/contexts/
├── SalesPageContext.tsx        # Soporte para preregistros
└── AuthContext.tsx            # Sin cambios
```

---

## 🔧 Funciones Clave

### **Preregistros:**
```typescript
// Crear preregistro sin usuario
createPreregistrationWithUserData({
  user_id: null, // Sin cuenta
  interested_tickets: [...], // Boletos de interés
  source: 'landing_page'
});

// Generar mensaje de WhatsApp personalizado
generateWhatsAppMessage(preregistro); // Incluye boletos de interés

// Exportar CSV con filtros
exportPreregistrosCSV(filteredData);
```

### **Emails Duplicados:**
```typescript
// Detección automática en capture
const existingUser = await getUserByEmail(email);
if (existingUser) {
  // Asociar boletos a cuenta existente
  // Enviar email específico
  // Flag: emailExisted = true
}
```

---

## 🎯 Flujos de Usuario

### **Preregistro (Sin Cuenta):**
```
Landing → "Preregistrarme" → Seleccionar boletos → Datos básicos → 
Confirmación → Email marketing → Ventas contacta
```

### **Compra Email Nuevo:**
```
Landing → "Comprar" → Seleccionar boletos → Datos → PayPal → 
Cuenta creada + Auto-login → Email confirmación
```

### **Compra Email Duplicado:**
```
Landing → "Comprar" → Datos (email existe) → PayPal → 
Boletos asociados → "Inicia sesión para ver boletos" → Email específico
```

---

## 📊 Métricas y Analytics

### **Dashboard de Preregistros:**
- 📈 **Estadísticas:** Total, Nuevos, Contactados, Interesados, Convertidos
- 📋 **Filtros:** Por estado, búsqueda por nombre/email/empresa
- 📄 **Paginación:** 10 elementos por página (patrón seguro)
- 📊 **Exportación:** CSV con boletos de interés incluidos

### **Seguimiento de Conversión:**
- 🎯 **Lead → Venta:** Tracking de preregistros que se convierten
- 📧 **Email duplicado:** Métricas de usuarios que inician sesión post-compra
- 📱 **WhatsApp:** Clicks en botones de contacto directo

---

## 🛡️ Seguridad y Permisos

### **Matriz de Permisos:**
```typescript
preregistros: {
  read: ["admin", "gestor", "comprobador"],
  update: ["admin", "gestor"], 
  delete: ["admin"], // Solo eliminación múltiple
  export: ["admin", "gestor"]
}
```

### **Validaciones:**
- ✅ **Server-side:** Todas las operaciones validadas en API
- ✅ **Client-side:** UI condicional basada en roles
- ✅ **Firestore Rules:** Permisos a nivel de base de datos

---

## 🧪 Casos de Prueba Críticos

### **Preregistros:**
- [ ] Preregistro sin login → Email marketing enviado
- [ ] Admin ve preregistros con boletos de interés
- [ ] WhatsApp abre con mensaje personalizado
- [ ] Exportación CSV incluye boletos de interés

### **Emails Duplicados:**
- [ ] Email existe → Compra continúa sin interrupción
- [ ] Boletos asociados a cuenta existente
- [ ] Email específico enviado con botón de login
- [ ] Usuario puede acceder a boletos después de login

---

## 🚀 Beneficios del Sistema

### **Para Ventas:**
- 🎯 **Leads calificados** con contexto completo de interés
- 📱 **Contacto directo** por WhatsApp con mensaje automático
- 📊 **Dashboard completo** con estados de CRM
- 📈 **Métricas claras** de conversión

### **Para Usuarios:**
- ⚡ **Preregistro rápido** sin crear cuentas
- 🛒 **Compras sin fricción** aunque email exista
- 📧 **Emails claros** según su situación
- 🔑 **Acceso fácil** a boletos con un click

### **Para el Negocio:**
- 📈 **Mayor conversión** por menos fricción
- 🎯 **Lead nurturing** efectivo
- 💼 **Proceso de ventas** optimizado
- 🔄 **Flujos automatizados** que escalan

---

*Documentación técnica - Sistema implementado en Agosto 2025*
