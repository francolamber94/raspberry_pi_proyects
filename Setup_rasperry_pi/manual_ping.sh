#!/bin/bash

# Script para hacer ping manual al servidor

# Colores para los mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

CONFIG_DIR="/home/francolamber/station-validator"
CONFIG_FILE="$CONFIG_DIR/config.json"
CREDENTIALS_FILE="$CONFIG_DIR/credentials.json"

# Función para mostrar mensajes
print_message() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar que jq y curl están instalados
if ! command -v jq &> /dev/null || ! command -v curl &> /dev/null; then
  print_error "Se requieren jq y curl para este script."
  exit 1
fi

# Verificar que existen los archivos necesarios
if [ ! -f "$CONFIG_FILE" ]; then
  print_error "Archivo de configuración no encontrado en $CONFIG_FILE"
  exit 1
fi

if [ ! -f "$CREDENTIALS_FILE" ]; then
  print_error "Archivo de credenciales no encontrado. El dispositivo no está registrado."
  exit 1
fi

# Obtener valores de los archivos
API_BASE_URL=$(jq -r '.api.baseUrl' $CONFIG_FILE)
PING_ENDPOINT=$(jq -r '.api.endpoints.ping' $CONFIG_FILE)
API_KEY=$(jq -r '.apiKey' $CREDENTIALS_FILE)
DEVICE_ID=$(jq -r '.deviceId' $CREDENTIALS_FILE)
DEVICE_NAME=$(jq -r '.deviceName' $CREDENTIALS_FILE)

# Obtener la dirección IP actual
IP_ADDRESS=$(hostname -I | awk '{print $1}')

print_message "Enviando ping al servidor para el dispositivo $DEVICE_NAME (ID: $DEVICE_ID)..."

# Hacer la petición de ping
RESPONSE=$(curl -s -X POST "$API_BASE_URL$PING_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\":\"$API_KEY\", \"ipAddress\":\"$IP_ADDRESS\"}")

# Verificar respuesta
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
  STATUS=$(echo "$RESPONSE" | jq -r '.data.status')
  print_message "Ping enviado correctamente"
  echo "Estado actual del dispositivo: $STATUS"
  exit 0
else
  ERROR_MSG=$(echo "$RESPONSE" | jq -r '.message')
  print_error "Error al enviar ping: $ERROR_MSG"
  exit 1
fi 