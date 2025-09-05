#!/bin/bash
# Script de configuración rápida para Raspberry Pi ya instalada
# Uso: ./quick-setup.sh [DEVICE_NAME] [COMPANY_ID] [SERVER_URL]

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== CONFIGURACIÓN RÁPIDA VENTAPP PRINTER ===${NC}"

# Parámetros
DEVICE_NAME=${1:-"Printer-$(date +%s)"}
COMPANY_ID=${2:-""}
SERVER_URL=${3:-"https://ventapp.com.ar/api"}

echo -e "${BLUE}Configurando dispositivo: $DEVICE_NAME${NC}"
echo -e "${BLUE}Empresa ID: ${COMPANY_ID:-'No especificado'}${NC}"
echo -e "${BLUE}Servidor: $SERVER_URL${NC}"

if [ -z "$COMPANY_ID" ]; then
    echo -e "${YELLOW}⚠️  ADVERTENCIA: No se especificó Company ID${NC}"
    echo "Uso: $0 [DEVICE_NAME] [COMPANY_ID] [SERVER_URL]"
    echo "Ejemplo: $0 'Printer-Cocina-01' 'cm123abc456def789' 'https://ventapp.com.ar/api'"
    echo ""
    read -p "¿Continuar sin Company ID? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        echo "Configuración cancelada"
        exit 1
    fi
fi

# Obtener IP local
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}IP Local detectada: $LOCAL_IP${NC}"

# Crear configuración
CONFIG_DIR="/home/francolamber/printer-client"
mkdir -p "$CONFIG_DIR"

# Crear archivo de configuración
cat > "$CONFIG_DIR/config.json" << EOF
{
  "api": {
    "baseUrl": "$SERVER_URL",
    "endpoints": {
      "register": "/printer/register",
      "ping": "/printer/ping",
      "status": "/printer/status",
      "getJobs": "/printer/get-jobs",
      "updateJob": "/printer/update-job"
    }
  },
  "printer": {
    "name": "$DEVICE_NAME",
    "companyId": "$COMPANY_ID",
    "pollInterval": 5000,
    "maxRetries": 3,
    "jobLimit": 3
  }
}
EOF

echo -e "${GREEN}✓ Configuración creada${NC}"

# Registrar dispositivo si hay Company ID
if [ -n "$COMPANY_ID" ]; then
    echo -e "${YELLOW}Registrando dispositivo...${NC}"
    
    cd "$CONFIG_DIR"
    if node setup-printer.js; then
        echo -e "${GREEN}✓ Dispositivo registrado exitosamente${NC}"
        echo -e "${YELLOW}El dispositivo debe ser aprobado por un administrador${NC}"
    else
        echo -e "${RED}❌ Error al registrar dispositivo${NC}"
    fi
fi

# Reiniciar servicios
echo -e "${YELLOW}Reiniciando servicios...${NC}"
sudo systemctl restart printer-dashboard.service
sudo systemctl restart printer-web-server.service
sudo systemctl restart printer-client.service

echo -e "\n${GREEN}=== CONFIGURACIÓN COMPLETADA ===${NC}"
echo -e "${BLUE}Dashboard disponible en: http://$LOCAL_IP:3000${NC}"
echo -e "${BLUE}Configuración avanzada en: http://$LOCAL_IP:3001${NC}"
echo ""
echo -e "${YELLOW}PRÓXIMOS PASOS:${NC}"
echo "1. Acceda al dashboard para verificar el estado"
echo "2. Configure WiFi si es necesario"
echo "3. Espere la aprobación del administrador"
echo "4. ¡El sistema estará listo para imprimir!"
