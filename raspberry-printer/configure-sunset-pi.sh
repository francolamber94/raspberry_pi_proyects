#!/bin/bash
# Configuración específica para Pi SunsetDrive
# IP: 192.168.68.62
# Usuario: francolamber  
# Password: Dire4327

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PI_IP="192.168.68.62"
PI_USER="francolamber"
PI_PASS="Dire4327"
DEVICE_NAME="Printer-SunsetDrive-01"
COMPANY_ID="58065731-debb-423a-9340-98829fde4a06"
SERVER_URL="https://lamber.ngrok.app/api"

echo -e "${GREEN}=== CONFIGURACIÓN AUTOMÁTICA PI SUNSETDRIVE ===${NC}"
echo -e "${BLUE}🎯 Dispositivo: $DEVICE_NAME${NC}"
echo -e "${BLUE}🏢 Empresa ID: $COMPANY_ID${NC}"
echo -e "${BLUE}🌐 Servidor: $SERVER_URL${NC}"
echo -e "${BLUE}📍 IP Pi: $PI_IP${NC}"

# 1. Desplegar archivos
echo -e "\n${YELLOW}📦 Paso 1: Desplegando archivos...${NC}"
./deploy-to-pi.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en el despliegue${NC}"
    exit 1
fi

# 2. Configuración rápida
echo -e "\n${YELLOW}⚙️ Paso 2: Configuración automática...${NC}"
sshpass -p "$PI_PASS" ssh $PI_USER@$PI_IP << EOF
    echo "🔧 Ejecutando configuración rápida..."
    ./quick-setup.sh "$DEVICE_NAME" "$COMPANY_ID" "$SERVER_URL"
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Configuración completada${NC}"
else
    echo -e "${RED}❌ Error en la configuración${NC}"
fi

# 3. Verificar estado
echo -e "\n${YELLOW}🔍 Paso 3: Verificando estado...${NC}"
sshpass -p "$PI_PASS" ssh $PI_USER@$PI_IP << 'EOF'
    echo "📊 Estado de servicios:"
    systemctl is-active printer-dashboard.service
    systemctl is-active printer-web-server.service
    systemctl is-active printer-client.service
    
    echo ""
    echo "🌐 IP Local:"
    hostname -I | awk '{print $1}'
    
    echo ""
    echo "📱 URLs de acceso:"
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    echo "Dashboard: http://$LOCAL_IP:3000"
    echo "Config: http://$LOCAL_IP:3001"
EOF

echo -e "\n${GREEN}=== CONFIGURACIÓN COMPLETADA ===${NC}"
echo -e "${BLUE}🎉 Tu Pi SunsetDrive está lista!${NC}"
echo ""
echo -e "${YELLOW}📱 Acceso directo:${NC}"
echo -e "Dashboard: http://$PI_IP:3000"
echo -e "Config: http://$PI_IP:3001"
echo ""
echo -e "${YELLOW}🔧 Para reconfigurar:${NC}"
echo -e "sshpass -p '$PI_PASS' ssh $PI_USER@$PI_IP"
echo -e "./quick-setup.sh '$DEVICE_NAME' '$COMPANY_ID' '$SERVER_URL'"
echo ""
echo -e "${GREEN}¡El dashboard debería estar visible en la pantalla de la Pi!${NC}"
