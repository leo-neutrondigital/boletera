# 🎫 Sistema de PDFs y QR - Guía de Configuración

## 🪣 **Configuración de Storage (Google Cloud)**

### **Para Pruebas:**
```bash
# .env.local
STORAGE_BUCKET_NAME=mi-bucket-pruebas
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Para Cliente Nuevo:**
```bash
# .env.production
STORAGE_BUCKET_NAME=cliente-nuevo-tickets
NEXT_PUBLIC_APP_URL=https://boletera-cliente.com
```

## 🚀 **Setup Rápido**

### **1. Crear Bucket en Google Cloud:**
```bash
# Crear bucket
gsutil mb gs://tu-bucket-nombre

# Configurar permisos públicos (para PDFs)
gsutil iam ch allUsers:objectViewer gs://tu-bucket-nombre
```

### **2. Configurar Service Account:**
- Debe tener permisos de `Storage Object Admin` en el bucket
- Las credenciales ya están configuradas en Firebase Admin

### **3. Variables de Entorno:**
```bash
# Solo estas dos variables son necesarias
STORAGE_BUCKET_NAME=tu-bucket-nombre
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

## 📄 **Cómo Funciona**

### **Generación de PDF:**
1. Usuario configura boleto con datos del asistente
2. Al hacer clic en "Generar PDF":
   - Se genera QR con URL de validación
   - Se crea PDF con diseño profesional
   - Se guarda en Google Storage
   - Se actualiza ticket con URLs

### **Estructura de Archivos:**
```
tu-bucket/
├── tickets/
│   ├── evento-123/
│   │   ├── ticket_orden-abc_boleto-xyz.pdf
│   │   └── ticket_orden-def_boleto-uvw.pdf
│   └── evento-456/
│       └── ticket_orden-ghi_boleto-rst.pdf
```

### **URLs Generadas:**
- **PDF**: `https://storage.googleapis.com/tu-bucket/tickets/evento-123/ticket_orden-abc_boleto-xyz.pdf`
- **QR**: `https://tu-dominio.com/validate/qr-unique-id`

## 🔄 **Cambio de Cliente**

### **Super Fácil - Solo 2 pasos:**

1. **Cambiar variable:**
```bash
# De:
STORAGE_BUCKET_NAME=mi-bucket-pruebas

# A:
STORAGE_BUCKET_NAME=cliente-nuevo-prod
```

2. **Deploy** - ¡Ya está! 🎉

### **No necesitas:**
- ❌ Migrar archivos (datos de prueba se borran)
- ❌ Cambiar código
- ❌ Scripts complejos
- ❌ Configuración adicional

## 🎨 **Características del PDF**

### **Diseño Professional:**
- Header con gradiente y logo
- Información organizada en grid
- QR code prominente
- Instrucciones claras
- IDs técnicos al final

### **Contenido Incluido:**
- ✅ Nombre del evento
- ✅ Tipo de boleto y precio
- ✅ Datos del asistente
- ✅ Fecha y ubicación
- ✅ Requerimientos especiales
- ✅ Código QR para validación
- ✅ IDs de orden y boleto
- ✅ Fecha de generación

## 🔒 **Seguridad**

### **Permisos API:**
- Solo el comprador puede generar sus PDFs
- Administradores pueden generar cualquier PDF
- Verificación de autenticación en cada request

### **URLs Públicas:**
- PDFs son públicos (necesario para descarga)
- Solo quien tenga el link exacto puede acceder
- URLs son largas y difíciles de adivinar

## 🐛 **Troubleshooting**

### **Error: "Storage bucket not found"**
```bash
# Verificar que el bucket existe
gsutil ls gs://tu-bucket-nombre

# Si no existe, crearlo
gsutil mb gs://tu-bucket-nombre
```

### **Error: "Permission denied"**
- Verificar permisos del Service Account
- Debe tener rol `Storage Object Admin`

### **Error: "QR code not generated"**
- Verificar `NEXT_PUBLIC_APP_URL` esté configurada
- Debe ser una URL completa con protocolo

### **PDFs no se abren:**
- Verificar que bucket tenga permisos públicos
- Probar URL directa en navegador

## 📊 **Monitoreo**

### **Logs Útiles:**
```bash
# Ver logs de generación
console.log("🎫 Generating PDF for ticket:", ticketId)
console.log("✅ PDF generated, size:", pdfBuffer.length, "bytes")
console.log("🪣 Using storage bucket:", bucketName)
```

### **Métricas a Monitorear:**
- Tiempo de generación de PDF
- Tamaño promedio de archivos
- Errores de storage
- Uso de bandwidth

## 💡 **Mejoras Futuras**

### **Fáciles de implementar:**
- Plantillas de PDF personalizables
- Logos de cliente en PDF
- Envío automático por email
- Generación batch de múltiples PDFs

### **Avanzadas:**
- CDN para mejor performance
- Compresión de PDFs
- Watermarks dinámicos
- Integración con WhatsApp

---

**🎯 Sistema listo para producción con máxima flexibilidad de buckets!**
