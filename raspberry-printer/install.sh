#!/bin/bash
# Script de instalación para configurar impresora de tickets en Raspberry Pi
# Autor: VentApp
# Fecha: 2025-01-03

# Colores para los mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== INSTALACIÓN DE IMPRESORA DE TICKETS EN RASPBERRY PI ===${NC}"
echo "Este script configurará su Raspberry Pi como impresora de tickets remota."
echo -e "${YELLOW}Asegúrese de que su impresora esté conectada por USB.${NC}\n"

# Comprobar si ejecuta como root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Por favor ejecute este script como root (sudo).${NC}"
  exit 1
fi

# Obtener el nombre de usuario real (no root)
REAL_USER=$(logname 2>/dev/null || echo $SUDO_USER)
if [ -z "$REAL_USER" ]; then
    echo -e "${RED}No se pudo determinar el usuario real. Usando 'francolamber' por defecto.${NC}"
    REAL_USER="francolamber"
fi

echo -e "${BLUE}Usuario detectado: $REAL_USER${NC}"

# Crear directorio para la aplicación
echo -e "\n${GREEN}Paso 1: Creando directorios...${NC}"
mkdir -p /home/$REAL_USER/printer-client
chown $REAL_USER:$REAL_USER /home/$REAL_USER/printer-client

# Copiar archivos de la aplicación
cp printer-client.js /home/$REAL_USER/printer-client/
cp setup-printer.js /home/$REAL_USER/printer-client/
cp check-printer-status.js /home/$REAL_USER/printer-client/
cp server.js /home/$REAL_USER/printer-client/
cp index.html /home/$REAL_USER/printer-client/
cp dashboard.html /home/$REAL_USER/printer-client/
cp dashboard-server.js /home/$REAL_USER/printer-client/
cp autostart-browser.sh /home/$REAL_USER/printer-client/
cp quick-setup.sh /home/$REAL_USER/
cp package.json /home/$REAL_USER/printer-client/
cp printer-config.json /home/$REAL_USER/printer-client/config.json

# Ajustar permisos
chown -R $REAL_USER:$REAL_USER /home/$REAL_USER/printer-client
chown $REAL_USER:$REAL_USER /home/$REAL_USER/quick-setup.sh
chmod +x /home/$REAL_USER/printer-client/*.js
chmod +x /home/$REAL_USER/printer-client/*.sh
chmod +x /home/$REAL_USER/quick-setup.sh

# Instalar dependencias del sistema
echo -e "\n${GREEN}Paso 2: Actualizando sistema e instalando dependencias...${NC}"
apt update
apt install -y nodejs npm curl jq chromium-browser cups cups-client

# Instalar dependencias específicas para impresoras térmicas
echo -e "\n${GREEN}Paso 3: Configurando soporte para impresoras...${NC}"
apt install -y printer-driver-escpos

# Configurar CUPS para impresoras USB
systemctl enable cups
systemctl start cups

# Agregar usuario al grupo de impresión
usermod -a -G lpadmin $REAL_USER

# Instalar dependencias de Node.js
echo -e "\n${GREEN}Paso 4: Instalando dependencias de Node.js...${NC}"
cd /home/$REAL_USER/printer-client
sudo -u $REAL_USER npm install

# Crear script de inicio del servidor web
echo -e "\n${GREEN}Paso 5: Configurando servidor web...${NC}"
cat > /home/$REAL_USER/printer-client/start-server.sh << 'EOF'
#!/bin/bash
cd /home/francolamber/printer-client
node server.js > server.log 2>&1 &
echo $! > server.pid
echo "Servidor web iniciado en puerto 3001"
echo "Acceda a http://$(hostname -I | awk '{print $1}'):3001 para configurar"
EOF

chmod +x /home/$REAL_USER/printer-client/start-server.sh
chown $REAL_USER:$REAL_USER /home/$REAL_USER/printer-client/start-server.sh

# Crear script de parada del servidor
cat > /home/$REAL_USER/printer-client/stop-server.sh << 'EOF'
#!/bin/bash
cd /home/francolamber/printer-client
if [ -f server.pid ]; then
    kill $(cat server.pid) 2>/dev/null
    rm server.pid
    echo "Servidor web detenido"
else
    echo "El servidor no estaba ejecutándose"
fi
EOF

chmod +x /home/$REAL_USER/printer-client/stop-server.sh
chown $REAL_USER:$REAL_USER /home/$REAL_USER/printer-client/stop-server.sh

# Crear servicio systemd para el dashboard principal
echo -e "\n${GREEN}Paso 6: Configurando servicio del dashboard...${NC}"
cat > /etc/systemd/system/printer-dashboard.service << EOF
[Unit]
Description=VentApp Printer Dashboard
After=network.target
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/usr/bin/node /home/$REAL_USER/printer-client/dashboard-server.js
WorkingDirectory=/home/$REAL_USER/printer-client
Restart=always
RestartSec=5
User=$REAL_USER
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Crear servicio systemd para el servidor de configuración
echo -e "\n${GREEN}Paso 7: Configurando servicio de configuración...${NC}"
cat > /etc/systemd/system/printer-web-server.service << EOF
[Unit]
Description=Servidor Web para Configuración de Impresora VentApp
After=network.target printer-dashboard.service

[Service]
ExecStart=/usr/bin/node /home/$REAL_USER/printer-client/server.js
WorkingDirectory=/home/$REAL_USER/printer-client
Restart=always
User=$REAL_USER
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Crear servicio systemd para el cliente impresora
echo -e "\n${GREEN}Paso 8: Configurando servicio del cliente impresora...${NC}"
cat > /etc/systemd/system/printer-client.service << EOF
[Unit]
Description=Cliente Impresora VentApp
After=network.target printer-web-server.service

[Service]
ExecStart=/usr/bin/node /home/$REAL_USER/printer-client/printer-client.js
WorkingDirectory=/home/$REAL_USER/printer-client
Restart=always
RestartSec=10
User=$REAL_USER
Environment=NODE_ENV=production

# No iniciar automáticamente hasta que esté configurado
# Se habilitará manualmente después de la configuración

[Install]
WantedBy=multi-user.target
EOF

# Habilitar y iniciar servicios
systemctl daemon-reload
systemctl enable printer-dashboard.service
systemctl enable printer-web-server.service
systemctl start printer-dashboard.service
systemctl start printer-web-server.service

# Configurar auto-inicio del navegador
echo -e "\n${GREEN}Paso 8: Configurando auto-inicio del dashboard...${NC}"

# Crear directorio autostart si no existe
mkdir -p /home/$REAL_USER/.config/lxsession/LXDE-pi
mkdir -p /home/$REAL_USER/.config/autostart

# Crear archivo autostart para LXDE
cat > /home/$REAL_USER/.config/lxsession/LXDE-pi/autostart << EOF
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash
@point-rpi
@/home/$REAL_USER/printer-client/autostart-browser.sh
EOF

# Crear archivo .desktop para autostart alternativo
cat > /home/$REAL_USER/.config/autostart/ventapp-dashboard.desktop << EOF
[Desktop Entry]
Type=Application
Name=VentApp Dashboard
Comment=Auto-start VentApp Printer Dashboard
Exec=/home/$REAL_USER/printer-client/autostart-browser.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
EOF

# Ajustar permisos
chown -R $REAL_USER:$REAL_USER /home/$REAL_USER/.config
chmod +x /home/$REAL_USER/.config/autostart/ventapp-dashboard.desktop

# Configurar permisos sudo para las operaciones de red
echo -e "\n${GREEN}Paso 9: Configurando permisos de red...${NC}"
cat > /etc/sudoers.d/010_${REAL_USER}-printer << EOF
$REAL_USER ALL=(ALL) NOPASSWD: /sbin/ifconfig, /sbin/reboot, /usr/sbin/reboot, /usr/bin/wpa_cli, /usr/bin/iwconfig, /usr/bin/systemctl restart wpa_supplicant, /usr/bin/systemctl restart networking, /usr/bin/cat /etc/wpa_supplicant/wpa_supplicant.conf, /bin/cp /tmp/wpa_supplicant.conf /etc/wpa_supplicant/wpa_supplicant.conf, /bin/chmod, /usr/bin/iwlist wlan0 scan, /usr/bin/wpa_passphrase, /usr/bin/nmcli, /usr/sbin/iw, /usr/bin/systemctl restart printer-client.service, /usr/bin/systemctl restart printer-web-server.service, /usr/bin/systemctl restart printer-dashboard.service, /usr/bin/journalctl
EOF

chmod 440 /etc/sudoers.d/010_${REAL_USER}-printer

# Configurar autologin
echo -e "\n${GREEN}Paso 10: Configurando autologin...${NC}"
mkdir -p /etc/systemd/system/getty@tty1.service.d/
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $REAL_USER --noclear %I \$TERM
EOF

# Crear script de configuración inicial
echo -e "\n${GREEN}Paso 11: Creando scripts de configuración...${NC}"
cat > /home/$REAL_USER/configure-printer.sh << EOF
#!/bin/bash
echo "=== CONFIGURACIÓN DE IMPRESORA VENTAPP ==="
echo ""
echo "1. El dashboard principal está disponible en:"
echo "   http://\$(hostname -I | awk '{print \$1}'):3000"
echo ""
echo "2. Para configuración avanzada acceda a:"
echo "   http://\$(hostname -I | awk '{print \$1}'):3001"
echo ""
echo "3. Registre el dispositivo ejecutando:"
echo "   cd ~/printer-client && node setup-printer.js"
echo ""
echo "4. Verifique el estado con:"
echo "   cd ~/printer-client && node check-printer-status.js"
echo ""
echo "5. Una vez aprobado, inicie el cliente:"
echo "   sudo systemctl enable printer-client.service"
echo "   sudo systemctl start printer-client.service"
echo ""
read -p "Presione Enter para continuar..."
EOF

chmod +x /home/$REAL_USER/configure-printer.sh
chown $REAL_USER:$REAL_USER /home/$REAL_USER/configure-printer.sh

# Agregar comando de configuración al .bashrc
echo -e "\n${GREEN}Paso 12: Configurando comandos de acceso rápido...${NC}"
if ! grep -q "configure-printer" /home/$REAL_USER/.bashrc; then
    echo "" >> /home/$REAL_USER/.bashrc
    echo "# VentApp Printer Configuration" >> /home/$REAL_USER/.bashrc
    echo "alias config-printer='~/configure-printer.sh'" >> /home/$REAL_USER/.bashrc
    echo "alias printer-status='cd ~/printer-client && node check-printer-status.js'" >> /home/$REAL_USER/.bashrc
    echo "alias printer-setup='cd ~/printer-client && node setup-printer.js'" >> /home/$REAL_USER/.bashrc
    echo "alias printer-logs='journalctl -u printer-client.service -f'" >> /home/$REAL_USER/.bashrc
    echo "alias printer-web='systemctl status printer-web-server.service'" >> /home/$REAL_USER/.bashrc
    echo "alias printer-dashboard='systemctl status printer-dashboard.service'" >> /home/$REAL_USER/.bashrc
fi

# Detectar impresoras conectadas
echo -e "\n${GREEN}Paso 13: Detectando impresoras...${NC}"
lsusb | grep -i printer && echo -e "${GREEN}✓ Impresora USB detectada${NC}" || echo -e "${YELLOW}⚠ No se detectaron impresoras USB${NC}"

# Mostrar información final
echo -e "\n${GREEN}=== INSTALACIÓN COMPLETADA ===${NC}"
echo -e "${BLUE}La impresora VentApp ha sido instalada correctamente.${NC}"
echo ""
echo -e "${YELLOW}PRÓXIMOS PASOS:${NC}"
echo "1. Reinicie el sistema: sudo reboot"
echo "2. Después del reinicio, el dashboard se abrirá automáticamente"
echo "3. O acceda manualmente desde cualquier dispositivo:"
echo "   📱 Dashboard Principal: http://$(hostname -I | awk '{print $1}'):3000"
echo "   ⚙️  Configuración Avanzada: http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo -e "${YELLOW}COMANDOS ÚTILES:${NC}"
echo "• config-printer     - Mostrar guía de configuración"
echo "• printer-setup      - Registrar dispositivo"
echo "• printer-status     - Ver estado del dispositivo"
echo "• printer-logs       - Ver logs del cliente"
echo "• printer-web        - Ver estado del servidor web"
echo "• printer-dashboard  - Ver estado del dashboard"
echo ""
echo -e "${GREEN}¡La instalación ha sido exitosa!${NC}"
echo -e "${BLUE}Reinicie el sistema y siga las instrucciones de configuración.${NC}"

# Preguntar si reiniciar ahora
echo ""
read -p "¿Desea reiniciar el sistema ahora? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    echo -e "${GREEN}Reiniciando sistema...${NC}"
    reboot
else
    echo -e "${YELLOW}Recuerde reiniciar el sistema antes de usar la impresora.${NC}"
fi
