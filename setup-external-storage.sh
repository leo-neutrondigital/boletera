#!/bin/bash

# 🔐 Script para configurar Service Account para Storage externo

echo "🔧 Configuración de Storage externo para Boletera"
echo "================================================="
echo ""

if [ "$1" = "" ]; then
    echo "❌ Error: Debes proporcionar el archivo JSON del Service Account"
    echo ""
    echo "📋 Uso:"
    echo "  ./setup-external-storage.sh service-account.json"
    echo ""
    echo "📥 Pasos:"
    echo "1. Ve a tu Google Cloud Console (tu cuenta personal)"
    echo "2. IAM & Admin → Service Accounts"
    echo "3. Create Service Account con rol 'Storage Object Admin'"
    echo "4. Download JSON key"
    echo "5. Ejecuta: ./setup-external-storage.sh downloaded-key.json"
    exit 1
fi

SERVICE_ACCOUNT_FILE=$1

if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo "❌ Error: Archivo $SERVICE_ACCOUNT_FILE no encontrado"
    exit 1
fi

echo "🔍 Procesando archivo: $SERVICE_ACCOUNT_FILE"

# Convertir a Base64
BASE64_KEY=$(cat "$SERVICE_ACCOUNT_FILE" | base64 | tr -d '\n')

echo ""
echo "✅ Service Account convertido a Base64"
echo ""
echo "📝 Agrega esta línea a tu .env.local:"
echo "STORAGE_SERVICE_ACCOUNT_KEY=\"$BASE64_KEY\""
echo ""
echo "📋 También necesitas:"
echo "STORAGE_BUCKET_NAME=tu-bucket-name"
echo ""
echo "🎯 Ejemplo completo para .env.local:"
echo "# 🧪 TESTING: Bucket externo"
echo "STORAGE_BUCKET_NAME=mi-bucket-test"
echo "STORAGE_SERVICE_ACCOUNT_KEY=\"$BASE64_KEY\""
echo ""
echo "🔥 ¡Listo para testing con tu bucket externo!"
