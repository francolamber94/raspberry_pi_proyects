#!/bin/bash
# Script de despliegue para Raspberry Pi específica
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

echo -e "${GREEN}=== DESPLEGANDO VENTAPP DASHBOARD A RASPBERRY PI ===${NC}"
echo -e "${BLUE}IP: $PI_IP${NC}"
echo -e "${BLUE}Usuario: $PI_USER${NC}"

# Verificar conectividad
echo -e "\n${YELLOW}Verificando conectividad...${NC}"
if ! ping -c 1 $PI_IP > /dev/null 2>&1; then
    echo -e "${RED}❌ No se puede conectar a $PI_IP${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Conectividad OK${NC}"

# Copiar archivos a la Pi
echo -e "\n${YELLOW}Copiando archivos...${NC}"
sshpass -p "$PI_PASS" scp -r \
  dashboard.html \
  dashboard-server.js \
  autostart-browser.sh \
  quick-setup.sh \
  printer-dashboard.service \
  install.sh \
  INSTRUCCIONES_DASHBOARD.md \
  $PI_USER@$PI_IP:~/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Archivos copiados exitosamente${NC}"
else
    echo -e "${RED}❌ Error copiando archivos${NC}"
    exit 1
fi

# Ejecutar instalación en la Pi
echo -e "\n${YELLOW}Ejecutando instalación en la Pi...${NC}"
sshpass -p "$PI_PASS" ssh $PI_USER@$PI_IP << 'EOF'
    echo "🔧 Configurando permisos..."
    chmod +x ~/dashboard-server.js
    chmod +x ~/autostart-browser.sh
    chmod +x ~/quick-setup.sh
    chmod +x ~/install.sh

    echo "📁 Creando directorios..."
    mkdir -p ~/printer-client
    
    echo "📋 Copiando archivos al directorio final..."
    cp ~/dashboard.html ~/printer-client/
    cp ~/dashboard-server.js ~/printer-client/
    cp ~/autostart-browser.sh ~/printer-client/
    
    echo "⚙️ Configurando servicios..."
    sudo cp ~/printer-dashboard.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable printer-dashboard.service
    
    echo "🚀 Iniciando dashboard..."
    sudo systemctl restart printer-dashboard.service
    
    echo "📊 Estado de servicios:"
    sudo systemctl status printer-dashboard.service --no-pager -l
    
    echo ""
    echo "✅ Instalación completada!"
    echo "📱 Dashboard disponible en: http://$(hostname -I | awk '{print $1}'):3000"
    echo "⚙️ Configuración en: http://$(hostname -I | awk '{print $1}'):3001"
EOF

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Instalación en Pi completada exitosamente${NC}"
else
    echo -e "\n${RED}❌ Error durante la instalación${NC}"
    exit 1
fi

# Obtener IP actual de la Pi
echo -e "\n${YELLOW}Obteniendo IP de la Pi...${NC}"
ACTUAL_IP=$(sshpass -p "$PI_PASS" ssh $PI_USER@$PI_IP "hostname -I | awk '{print \$1}'" 2>/dev/null)

if [ -n "$ACTUAL_IP" ]; then
    echo -e "${GREEN}✓ IP detectada: $ACTUAL_IP${NC}"
    
    # Actualizar archivos locales con la IP correcta
    echo -e "\n${YELLOW}Actualizando archivos locales con IP correcta...${NC}"
    
    # Actualizar commands.txt
    sed -i.bak "s/192\.168\.68\.59/$ACTUAL_IP/g" commands.txt
    
    # Actualizar README.md
    sed -i.bak "s/192\.168\.68\.59/$ACTUAL_IP/g" README.md
    
    # Actualizar INSTRUCCIONES_DASHBOARD.md
    sed -i.bak "s/IP_PI/$ACTUAL_IP/g" INSTRUCCIONES_DASHBOARD.md
    
    echo -e "${GREEN}✓ Archivos locales actualizados con IP $ACTUAL_IP${NC}"
else
    echo -e "${YELLOW}⚠️ No se pudo obtener IP de la Pi${NC}"
fi

echo -e "\n${GREEN}=== DESPLIEGUE COMPLETADO ===${NC}"
echo -e "${BLUE}🎯 URLs de acceso:${NC}"
echo -e "📱 Dashboard Principal: http://$ACTUAL_IP:3000"
echo -e "⚙️ Configuración Avanzada: http://$ACTUAL_IP:3001"
echo ""
echo -e "${YELLOW}🔧 Configuración rápida (desde la Pi):${NC}"
echo -e "sshpass -p '$PI_PASS' ssh $PI_USER@$PI_IP"
echo -e "./quick-setup.sh 'Printer-SunsetDrive-01' '58065731-debb-423a-9340-98829fde4a06' 'https://lamber.ngrok.app/api'"
echo ""
echo -e "${GREEN}¡El dashboard debería estar funcionando ahora!${NC}"

# Verificar que el dashboard esté funcionando
echo -e "\n${YELLOW}Verificando que el dashboard esté funcionando...${NC}"
sleep 3
if curl -s http://$ACTUAL_IP:3000 > /dev/null; then
    echo -e "${GREEN}✅ Dashboard funcionando correctamente${NC}"
else
    echo -e "${YELLOW}⚠️ Dashboard aún no disponible, puede necesitar unos segundos más${NC}"
fi
