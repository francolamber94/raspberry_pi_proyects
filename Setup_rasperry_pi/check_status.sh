#!/bin/bash

# Script para verificar el estado de aprobación del dispositivo en el servidor

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

# Verificar que jq está instalado
if ! command -v jq &> /dev/null; then
  print_warning "jq no está instalado. Instalando..."
  sudo apt-get update
  sudo apt-get install -y jq
fi

# Verificar que curl está instalado
if ! command -v curl &> /dev/null; then
  print_warning "curl no está instalado. Instalando..."
  sudo apt-get update
  sudo apt-get install -y curl
fi

# Verificar que existen los archivos necesarios
if [ ! -f "$CONFIG_FILE" ]; then
  print_error "Archivo de configuración no encontrado. Ejecuta primero setup_raspberry.sh"
  exit 1
fi

if [ ! -f "$CREDENTIALS_FILE" ]; then
  print_error "Archivo de credenciales no encontrado. El dispositivo no está registrado."
  exit 1
fi

# Obtener valores de los archivos
API_BASE_URL=$(jq -r '.api.baseUrl' $CONFIG_FILE)
STATUS_ENDPOINT=$(jq -r '.api.endpoints.status' $CONFIG_FILE)
API_KEY=$(jq -r '.apiKey' $CREDENTIALS_FILE)
DEVICE_ID=$(jq -r '.deviceId' $CREDENTIALS_FILE)
DEVICE_NAME=$(jq -r '.deviceName' $CREDENTIALS_FILE)

# Verificar el estado
print_message "Consultando estado del dispositivo $DEVICE_NAME (ID: $DEVICE_ID)..."

STATUS_RESPONSE=$(curl -s -X POST "$API_BASE_URL$STATUS_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\":\"$API_KEY\"}")

# Analizar la respuesta
if echo "$STATUS_RESPONSE" | jq -e '.success == true' > /dev/null; then
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status')
  
  if [ "$STATUS" = "APPROVED" ]; then
    print_message "El dispositivo está APROBADO y listo para ser utilizado."
    echo -e "${GREEN}Estado: APROBADO${NC}"
    exit 0
  elif [ "$STATUS" = "PENDING" ]; then
    print_warning "El dispositivo está PENDIENTE de aprobación por un administrador."
    echo -e "${YELLOW}Estado: PENDIENTE${NC}"
    exit 1
  else
    print_error "El dispositivo ha sido RECHAZADO por un administrador."
    echo -e "${RED}Estado: RECHAZADO${NC}"
    exit 2
  fi
else
  ERROR_MSG=$(echo "$STATUS_RESPONSE" | jq -r '.message')
  print_error "Error al consultar el estado: $ERROR_MSG"
  exit 3
fi 