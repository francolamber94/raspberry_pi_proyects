#!/bin/bash

# Script para configurar un validador de tickets en Raspberry Pi
# Utiliza los nuevos endpoints de la API

# Colores para los mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

CONFIG_DIR="/home/francolamber/station-validator"
CONFIG_FILE="$CONFIG_DIR/config.json"
CREDENTIALS_FILE="$CONFIG_DIR/credentials.json"

# Asegurar que el directorio existe
mkdir -p $CONFIG_DIR

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

# Copiar el archivo de configuración si se ha proporcionado
if [ -f "raspberry_config.json" ]; then
  print_message "Copiando archivo de configuración..."
  cp raspberry_config.json $CONFIG_FILE
  chmod 644 $CONFIG_FILE
else
  print_error "Archivo de configuración no encontrado. Creando uno básico..."
  cat > $CONFIG_FILE << EOF
{
  "api": {
    "baseUrl": "https://92f0-45-178-195-5.ngrok-free.app/api",
    "endpoints": {
      "register": "/station/register",
      "ping": "/station/ping",
      "status": "/station/status",
      "validate": "/station/validate"
    }
  },
  "device": {
    "pingInterval": 60000
  }
}
EOF
  chmod 644 $CONFIG_FILE
fi

# Obtener valores del archivo de configuración
API_BASE_URL=$(jq -r '.api.baseUrl' $CONFIG_FILE)
REGISTER_ENDPOINT=$(jq -r '.api.endpoints.register' $CONFIG_FILE)
STATUS_ENDPOINT=$(jq -r '.api.endpoints.status' $CONFIG_FILE)
DEVICE_NAME=$(jq -r '.device.name' $CONFIG_FILE)

# Obtener la dirección IP
IP_ADDRESS=$(hostname -I | awk '{print $1}')

# Función para registrar el dispositivo
register_device() {
  print_message "Registrando dispositivo en el servidor..."

  # Comprobar si ya existe un archivo de credenciales
  if [ -f "$CREDENTIALS_FILE" ]; then
    print_warning "El dispositivo ya parece estar registrado."
    API_KEY=$(jq -r '.apiKey' $CREDENTIALS_FILE)

    # Verificar si la API key es válida consultando el estado
    print_message "Verificando API key existente..."
    STATUS_RESPONSE=$(curl -s -X POST "$API_BASE_URL$STATUS_ENDPOINT" \
      -H "Content-Type: application/json" \
      -d "{\"apiKey\":\"$API_KEY\"}")

    # Comprobar si la respuesta contiene un mensaje de error
    if echo "$STATUS_RESPONSE" | jq -e '.success == false' > /dev/null; then
      print_error "API key inválida. Registrando de nuevo..."
    else
      print_message "API key válida. Usando credenciales existentes."
      return 0
    fi
  fi

  # Registrar el dispositivo
  REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE_URL$REGISTER_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{\"ipAddress\":\"$IP_ADDRESS\"}")

  # Verificar si el registro fue exitoso
  if echo "$REGISTER_RESPONSE" | jq -e '.success == true' > /dev/null; then
    # Extraer la API key y guardarla en un archivo
    API_KEY=$(echo "$REGISTER_RESPONSE" | jq -r '.data.apiKey')
    DEVICE_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.id')
    ASSIGNED_NAME=$(echo "$REGISTER_RESPONSE" | jq -r '.data.name')

    cat > $CREDENTIALS_FILE << EOF
{
  "deviceId": "$DEVICE_ID",
  "deviceName": "$ASSIGNED_NAME",
  "apiKey": "$API_KEY",
  "registeredAt": "$(date -Iseconds)"
}
EOF
    chmod 600 $CREDENTIALS_FILE

    # Actualizar el nombre del dispositivo en el archivo de configuración
    jq ".device.name = \"$ASSIGNED_NAME\"" $CONFIG_FILE > tmp.json && mv tmp.json $CONFIG_FILE

    print_message "Dispositivo registrado correctamente con ID: $DEVICE_ID y nombre: $ASSIGNED_NAME"
    return 0
  else
    ERROR_MSG=$(echo "$REGISTER_RESPONSE" | jq -r '.message')
    print_error "Error al registrar el dispositivo: $ERROR_MSG"
    return 1
  fi
}

# Función principal
main() {
  print_message "Iniciando configuración del validador de tickets..."

  # Registrar el dispositivo
  register_device

  print_message "Configuración completada. El dispositivo está esperando aprobación..."
  print_message "Puedes verificar el estado con: ~/check_status.sh"
}

# Ejecutar la función principal
main