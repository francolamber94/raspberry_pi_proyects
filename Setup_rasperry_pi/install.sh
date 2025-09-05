#!/bin/bash
# Script de instalación para configurar validador de tickets en Raspberry Pi con pantalla XPT2046 3.5"
# Autor: Claude
# Fecha: 2025-04-05

# Colores para los mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== INSTALACIÓN DE VALIDADOR DE TICKETS EN RASPBERRY PI ===${NC}"
echo "Este script configurará su Raspberry Pi como validador de tickets en modo kiosk."
echo -e "${YELLOW}Asegúrese de que su pantalla táctil XPT2046 3.5\" esté conectada.${NC}\n"

# Comprobar si ejecuta como root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Por favor ejecute este script como root (sudo).${NC}"
  exit 1
fi

# Crear directorio para la aplicación
echo -e "\n${GREEN}Paso 1: Creando directorios...${NC}"
mkdir -p /home/$(logname)/station-validator
cp index.html /home/$(logname)/station-validator/

# Instalar dependencias necesarias
echo -e "\n${GREEN}Paso 2: Actualizando sistema e instalando dependencias...${NC}"
apt update
apt install -y chromium-browser x11-xserver-utils unclutter xserver-xorg xinit matchbox-window-manager xdotool

# Configurar pantalla táctil
echo -e "\n${GREEN}Paso 3: Configurando pantalla táctil...${NC}"
# Copiar la configuración de fbdev
cp fbdev.conf /usr/share/X11/xorg.conf.d/99-fbdev.conf
echo -e "${YELLOW}Configuración de pantalla instalada.${NC}"

# Instalar scripts y servicios
echo -e "\n${GREEN}Paso 4: Instalando scripts y servicios...${NC}"
cp start_x_browser_fix.sh /home/$(logname)/station-validator/
chown $(logname):$(logname) /home/$(logname)/station-validator/start_x_browser_fix.sh
chmod +x /home/$(logname)/station-validator/start_x_browser_fix.sh

cp validator_x_browser_fix.service /etc/systemd/system/
# Ajustar el nombre de usuario en el archivo de servicio
sed -i "s/francolamber/$(logname)/g" /etc/systemd/system/validator_x_browser_fix.service

# Desactivar servicios potencialmente conflictivos
echo -e "\n${GREEN}Paso 5: Desactivando servicios duplicados...${NC}"
systemctl disable validator_touch.service 2>/dev/null
systemctl disable validator_browser.service 2>/dev/null
systemctl disable validator_x_browser.service 2>/dev/null
systemctl disable validator_touchscreen.service 2>/dev/null
systemctl disable validator_touchscreen_fix.service 2>/dev/null

systemctl daemon-reload
systemctl enable validator_x_browser_fix.service
echo -e "${YELLOW}Servicios correctamente configurados.${NC}"

# Configurar autologin
echo -e "\n${GREEN}Paso 6: Configurando inicio automático...${NC}"
mkdir -p /etc/systemd/system/getty@tty1.service.d/
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $(logname) --noclear %I \$TERM
EOF

echo -e "\n${GREEN}¡Instalación completada!${NC}"
echo -e "${YELLOW}La Raspberry Pi se reiniciará en 5 segundos...${NC}"
echo -e "${YELLOW}Después del reinicio, el validador de tickets debería iniciarse automáticamente.${NC}"
echo -e "${YELLOW}El cursor del mouse se ocultará automáticamente después de 0.5 segundos de inactividad.${NC}"
echo -e "${YELLOW}Si el cursor sigue visible, se moverá fuera de la pantalla.${NC}"
sleep 5
reboot 