# HubSpot Integration

Integración automática de preregistros con HubSpot CRM.

## 🎯 Funcionalidad

- ✅ **Envío automático** de preregistros a HubSpot como contactos
- ✅ **Detección de duplicados** - actualiza contactos existentes por email
- ✅ **Sin afectar flujo principal** - errores de HubSpot no fallan preregistros
- ✅ **Configuración simple** - se habilita/deshabilita con variables de entorno

## ⚙️ Configuración

### 1. Variables de Entorno

Agregar a `.env.local`:

```bash
# HubSpot Integration
HUBSPOT_ENABLED=true
HUBSPOT_API_KEY=your_private_app_access_token
```

### 2. Configuración en HubSpot

1. **Crear Private App** en HubSpot:
   - Ve a Settings → Private Apps
   - Create private app
   - Scopes necesarios: `crm.objects.contacts.read`, `crm.objects.contacts.write`

2. **Propiedades personalizadas** (opcional):
   - `event_name` - Nombre del evento
   - `event_id` - ID del evento en Boletera
   - `registration_source` - Siempre será "boletera_preregistration"

## 📊 Datos Mapeados

| Campo Boletera | Campo HubSpot | Descripción |
|----------------|---------------|-------------|
| `email` | `email` | Email del contacto |
| `name` | `firstname` + `lastname` | Nombre dividido automáticamente |
| `phone` | `phone` | Teléfono |
| `company` | `company` | Empresa |
| `eventName` | `event_name` | Nombre del evento |
| `eventId` | `event_id` | ID del evento |
| - | `registration_source` | Valor fijo: "boletera_preregistration" |
| - | `registration_date` | Fecha de preregistro |
| - | `hs_lead_status` | Valor fijo: "PRE_REGISTERED" |
| - | `lifecyclestage` | Valor fijo: "lead" |

## 🔧 Uso

La integración se ejecuta automáticamente cuando se crea un preregistro. No requiere código adicional.

```typescript
// La integración se activa automáticamente en:
// POST /api/preregistrations
```

## 🧪 Testing

Para probar en desarrollo:

1. Configurar variables de entorno
2. Crear un preregistro desde la UI
3. Verificar logs en consola
4. Verificar contacto creado en HubSpot

## 🛡️ Manejo de Errores

- **Configuración faltante**: Se ignora silenciosamente
- **Errores de API**: Se logean pero no afectan el preregistro
- **Duplicados**: Se actualizan automáticamente por email
- **Campos faltantes**: Se omiten campos opcionales

## 📝 Logs

```bash
# Éxito
✅ HubSpot contact created successfully: user@example.com
✅ HubSpot contact updated successfully: user@example.com

# Configuración
🔧 HubSpot not configured, skipping sync

# Errores (no afectan flujo principal)
❌ HubSpot sync failed (continuing anyway): {...}
```

## 🚀 Estructura de Archivos

```
src/lib/integrations/hubspot/
├── index.ts         # Función principal exportada
├── client.ts        # Cliente API HubSpot
└── types.ts         # Interfaces TypeScript
```
