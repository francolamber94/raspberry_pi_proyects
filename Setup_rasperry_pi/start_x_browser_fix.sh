#!/bin/bash
# Script para iniciar X y el navegador en modo kiosk con una sola instancia

# Redirigir logs a un archivo con timestamp
TIMESTAMP=$(date +%Y%m%d%H%M%S)
LOG_FILE="/home/$(whoami)/station-validator/browser_${TIMESTAMP}.log"
exec > ${LOG_FILE} 2>&1

echo "=== INICIANDO VALIDADOR DE TICKETS (INSTANCIA ÚNICA) ==="
echo "Fecha y hora: $(date)"
echo "PID del proceso: $$"

# Variables
HTML_PATH="/home/$(whoami)/station-validator/index.html"
# Pantalla táctil 3.5"
SCREEN_WIDTH=480
SCREEN_HEIGHT=320

# Verificar si ya hay una instancia en ejecución
echo "Verificando instancias previas..."
RUNNING_INSTANCES=$(pgrep -f "chromium-browser.*kiosk" | wc -l)
echo "Instancias en ejecución: $RUNNING_INSTANCES"

if [ $RUNNING_INSTANCES -gt 0 ]; then
  echo "Ya hay instancias en ejecución. Limpiando..."
  killall chromium-browser 2>/dev/null
  killall matchbox-window-manager 2>/dev/null
  killall xinit 2>/dev/null
  sleep 2
fi

# Limpiar archivos temporales y de sesión de Chromium
echo "Limpiando archivos de sesión de Chromium..."
rm -rf ~/.config/chromium/Default/Session* 2>/dev/null
rm -rf ~/.config/chromium/Default/Preferences 2>/dev/null
rm -rf ~/.config/chromium/SingletonLock 2>/dev/null
rm -rf ~/.config/chromium/SingletonSocket 2>/dev/null

# Matar cualquier Xorg anterior
echo "Deteniendo sesiones X previas..."
killall Xorg 2>/dev/null
sleep 1

# Crear el directorio para XDG_RUNTIME_DIR
echo "Configurando directorios de tiempo de ejecución..."
mkdir -p /tmp/runtime-$(whoami)
chmod 700 /tmp/runtime-$(whoami)

# Iniciar X con matchbox minimalista
echo "Iniciando servidor X con matchbox..."
export DISPLAY=:0
xinit /usr/bin/matchbox-window-manager -use_titlebar no &
sleep 3

# Configurar entorno X
echo "Configurando entorno X..."
xset -dpms
xset s off
xset s noblank

# Ocultar cursor después de 0.5 segundos de inactividad
echo "Configurando ocultación automática del cursor..."
unclutter -idle 0.5 -root &

# Mover el cursor fuera de la vista (probar varios métodos)
echo "Moviendo cursor fuera de la vista..."
# Intentar con valores más altos para asegurar que salga de la pantalla
DISPLAY=:0 xdotool mousemove 2000 2000 2>/dev/null || true
sleep 1

# Ejecutar obtención de IP antes de iniciar el navegador
echo "Obteniendo IP local..."
/home/$(whoami)/station-validator/get_local_ip.sh

# Iniciar navegador en modo kiosk con enfoque en rendimiento
echo "Iniciando Chromium en modo kiosk (única instancia)..."

# Configuración de entorno
export XDG_RUNTIME_DIR=/tmp/runtime-$(whoami)
# Desactivar dbus para evitar errores relacionados
export NO_AT_BRIDGE=1

# Usar un perfil temporal limpio para cada ejecución
TEMP_PROFILE=/tmp/chromium-$(whoami)
rm -rf $TEMP_PROFILE
mkdir -p $TEMP_PROFILE
chmod 700 $TEMP_PROFILE
echo "Usando perfil temporal: $TEMP_PROFILE"

# Iniciar Chromium con opciones básicas y configuración combinada
DISPLAY=:0 chromium-browser --kiosk --incognito --noerrdialogs \
    --disable-translate --no-first-run --fast --fast-start \
    --disable-infobars --user-agent="VALIDADOR_TICKETS_KIOSK" \
    --disable-suggestions-service --disable-save-password-bubble \
    --disable-session-crashed-bubble --disable-features=TranslateUI \
    --disable-features=DialMediaRouteProvider --autoplay-policy=no-user-gesture-required \
    --disk-cache-size=1000000 --media-cache-size=1000000 \
    --user-data-dir="$TEMP_PROFILE" \
    --no-sandbox --disable-gpu --disable-software-rasterizer \
    --disable-dev-shm-usage --disable-features=dbus \
    "file://$HTML_PATH" &

BROWSER_PID=$!
echo "PID del navegador: $BROWSER_PID"

# Esperar 2 segundos para que el navegador se estabilice
sleep 2
echo "Verificando si el navegador sigue en ejecución..."
if ps -p $BROWSER_PID > /dev/null; then
  echo "Navegador en ejecución correctamente."
else
  echo "El navegador no se inició correctamente."
fi

# Mover el cursor nuevamente después de que el navegador haya iniciado
echo "Volviendo a mover el cursor fuera de la vista..."
DISPLAY=:0 xdotool mousemove 2000 2000

# Contador de reinicios para diagnóstico
RESTART_COUNT=0

# Configurar bucle solo para monitorear el navegador
echo "Configurando bucle para monitorear el navegador..."
while true; do
  # Verificar si el navegador sigue en ejecución
  if ! ps -p $BROWSER_PID > /dev/null; then
    RESTART_COUNT=$((RESTART_COUNT+1))
    echo "Navegador terminado, reiniciando (Reinicio #$RESTART_COUNT)..."
    echo "Última hora de reinicio: $(date)"
    
    # Limpiar el directorio del perfil
    rm -rf $TEMP_PROFILE/*
    
    # Ejecutar obtención de IP antes de reiniciar
    /home/$(whoami)/station-validator/get_local_ip.sh
    
    # Reiniciar el navegador con las opciones seguras y combinadas
    DISPLAY=:0 chromium-browser --kiosk --incognito --noerrdialogs \
      --disable-translate --no-first-run --fast --fast-start \
      --disable-infobars --user-agent="VALIDADOR_TICKETS_KIOSK" \
      --disable-suggestions-service --disable-save-password-bubble \
      --disable-session-crashed-bubble --disable-features=TranslateUI \
      --disable-features=DialMediaRouteProvider --autoplay-policy=no-user-gesture-required \
      --disk-cache-size=1000000 --media-cache-size=1000000 \
      --user-data-dir="$TEMP_PROFILE" \
      --no-sandbox --disable-gpu --disable-software-rasterizer \
      --disable-dev-shm-usage --disable-features=dbus \
      "file://$HTML_PATH" &
    BROWSER_PID=$!
    echo "Nuevo PID del navegador: $BROWSER_PID"
    
    # Mover el cursor fuera de la vista después de reiniciar el navegador
    DISPLAY=:0 xdotool mousemove 2000 2000
  fi
  
  # Esperar 10 segundos
  sleep 10
done
