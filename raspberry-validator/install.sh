#!/bin/bash

# Script de instalación para el Validador de Tickets en Raspberry Pi
# Este script automatiza la configuración completa del sistema

# Asegurar que se ejecuta como root
if [ "$(id -u)" != "0" ]; then
   echo "Este script debe ejecutarse como root." 
   exit 1
fi

# Obtener el nombre de usuario no-root
USERNAME=$(logname)
if [ -z "$USERNAME" ]; then
    USERNAME=$(who am i | awk '{print $1}')
fi
echo "Usando el usuario: $USERNAME"

# Directorio base
INSTALL_DIR="/home/$USERNAME/station-validator"

echo "=== Actualizando sistema ==="
apt update
apt install -y chromium-browser x11-xserver-utils unclutter xserver-xorg xinit matchbox-window-manager curl

echo "=== Creando directorios ==="
mkdir -p $INSTALL_DIR
mkdir -p /etc/systemd/system/getty@tty1.service.d/

echo "=== Copiando archivos ==="
cp index.html $INSTALL_DIR/
cp start_x_browser_fix.sh $INSTALL_DIR/
chmod +x $INSTALL_DIR/start_x_browser_fix.sh
cp fbdev.conf /usr/share/X11/xorg.conf.d/99-fbdev.conf
cp validator_x_browser_fix.service /etc/systemd/system/

# Crear archivo para almacenar la IP local
touch $INSTALL_DIR/local_ip.txt
chown $USERNAME:$USERNAME $INSTALL_DIR/local_ip.txt

# Copiar y configurar script para obtener la IP local
cp get_local_ip.sh $INSTALL_DIR/
chmod +x $INSTALL_DIR/get_local_ip.sh
chown $USERNAME:$USERNAME $INSTALL_DIR/get_local_ip.sh

# Añadir tarea cron para actualizar la IP cada 5 minutos
sudo -u $USERNAME bash -c "(crontab -l 2>/dev/null; echo \"*/5 * * * * $INSTALL_DIR/get_local_ip.sh\") | crontab -"

# Configurar autologin
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $USERNAME --noclear %I \$TERM
EOF

# Reemplazar el %i en el archivo de servicio
sed -i "s/%i/$USERNAME/g" /etc/systemd/system/validator_x_browser_fix.service

# Habilitar servicios
echo "=== Habilitando servicios ==="
systemctl daemon-reload
systemctl enable validator_x_browser_fix.service

# Verificar otras instancias y deshabilitarlas si existen
if systemctl list-unit-files | grep -q validator_touch.service; then
    echo "=== Deshabilitando servicio anterior ==="
    systemctl stop validator_touch.service
    systemctl disable validator_touch.service
fi

# Ejecutar obtención de IP por primera vez
sudo -u $USERNAME $INSTALL_DIR/get_local_ip.sh

echo "=== Instalación completada ==="
echo "El sistema se reiniciará en 5 segundos..."
sleep 5
reboot 