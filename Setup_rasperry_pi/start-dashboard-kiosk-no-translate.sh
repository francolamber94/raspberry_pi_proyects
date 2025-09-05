#!/bin/bash
# Script para iniciar X y el dashboard en modo kiosk SIN traducciones

# Redirigir logs a un archivo con timestamp
TIMESTAMP=$(date +%Y%m%d%H%M%S)
LOG_FILE="/home/$(whoami)/printer-client/dashboard_${TIMESTAMP}.log"
exec > ${LOG_FILE} 2>&1

echo "=== INICIANDO DASHBOARD IMPRESORA (MODO KIOSK - SIN TRADUCCIONES) ==="
echo "Fecha y hora: $(date)"
echo "PID del proceso: $$"

# Variables
DASHBOARD_URL="http://localhost:3000?nocache=$(date +%s)"
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

# Mover el cursor fuera de la vista
echo "Moviendo cursor fuera de la vista..."
DISPLAY=:0 xdotool mousemove 2000 2000 2>/dev/null || true
sleep 1

# Esperar a que el dashboard esté disponible
echo "Esperando que el dashboard esté disponible..."
for i in {1..30}; do
    if curl -s http://localhost:3000?nocache=$(date +%s) > /dev/null; then
        echo "Dashboard disponible en intento $i"
        break
    fi
    echo "Intento $i: Dashboard no disponible, esperando..."
    sleep 2
done

# Configuración de entorno
export XDG_RUNTIME_DIR=/tmp/runtime-$(whoami)
export NO_AT_BRIDGE=1

# Usar un perfil temporal limpio para cada ejecución
TEMP_PROFILE=/tmp/chromium-dashboard-$(whoami)
rm -rf $TEMP_PROFILE
mkdir -p $TEMP_PROFILE
chmod 700 $TEMP_PROFILE
echo "Usando perfil temporal: $TEMP_PROFILE"

# Crear archivo de preferencias para deshabilitar traducción completamente
PREFS_FILE="$TEMP_PROFILE/Default/Preferences"
mkdir -p "$TEMP_PROFILE/Default"
cat > "$PREFS_FILE" << 'EOF'
{
   "translate": {
      "enabled": false
   },
   "translate_blocked_languages": [ "es", "en", "pt", "fr", "de", "it" ],
   "translate_denied_count_for_language": {
      "es": 10,
      "en": 10
   },
   "translate_site_blacklist": [ "localhost", "127.0.0.1", "192.168.*" ],
   "browser": {
      "show_home_button": false,
      "check_default_browser": false
   },
   "profile": {
      "default_content_setting_values": {
         "translate": 2
      }
   }
}
EOF

echo "Archivo de preferencias creado para deshabilitar traducción"

# Iniciar Chromium en modo kiosk para el dashboard con parámetros anti-traducción
echo "Iniciando Chromium con dashboard (SIN traducciones)..."
DISPLAY=:0 chromium-browser --kiosk --incognito --noerrdialogs \
    --disable-translate --no-first-run --fast --fast-start \
    --disable-infobars --user-agent="VENTAPP_PRINTER_DASHBOARD" \
    --disable-suggestions-service --disable-save-password-bubble \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI,Translate,OfferTranslateUI \
    --disable-features=DialMediaRouteProvider \
    --autoplay-policy=no-user-gesture-required \
    --disk-cache-size=1000000 --media-cache-size=1000000 \
    --user-data-dir="$TEMP_PROFILE" \
    --no-sandbox --disable-gpu --disable-software-rasterizer \
    --disable-dev-shm-usage --disable-features=dbus \
    --lang=es --accept-lang=es \
    --disable-component-extensions-with-background-pages \
    --disable-background-timer-throttling \
    --disable-renderer-backgrounding \
    --disable-backgrounding-occluded-windows \
    --force-color-profile=srgb \
    --disable-ipc-flooding-protection \
    "$DASHBOARD_URL" &

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
echo "Moviendo cursor fuera de la vista..."
DISPLAY=:0 xdotool mousemove 2000 2000 2>/dev/null || true

# Contador de reinicios para diagnóstico
RESTART_COUNT=0

# Bucle para monitorear el navegador
echo "Configurando bucle para monitorear el navegador..."
while true; do
  # Verificar si el navegador sigue en ejecución
  if ! ps -p $BROWSER_PID > /dev/null; then
    RESTART_COUNT=$((RESTART_COUNT+1))
    echo "Navegador terminado, reiniciando (Reinicio #$RESTART_COUNT)..."
    echo "Última hora de reinicio: $(date)"
    
    # Limpiar el directorio del perfil pero mantener las preferencias
    rm -rf $TEMP_PROFILE/Default/Session* 2>/dev/null
    rm -rf $TEMP_PROFILE/SingletonLock 2>/dev/null
    rm -rf $TEMP_PROFILE/SingletonSocket 2>/dev/null
    
    # Recrear archivo de preferencias si no existe
    if [ ! -f "$PREFS_FILE" ]; then
        mkdir -p "$TEMP_PROFILE/Default"
        cat > "$PREFS_FILE" << 'EOF'
{
   "translate": {
      "enabled": false
   },
   "translate_blocked_languages": [ "es", "en", "pt", "fr", "de", "it" ],
   "translate_denied_count_for_language": {
      "es": 10,
      "en": 10
   },
   "translate_site_blacklist": [ "localhost", "127.0.0.1", "192.168.*" ],
   "browser": {
      "show_home_button": false,
      "check_default_browser": false
   },
   "profile": {
      "default_content_setting_values": {
         "translate": 2
      }
   }
}
EOF
    fi
    
    # Verificar que el dashboard siga disponible
    if ! curl -s http://localhost:3000?nocache=$(date +%s) > /dev/null; then
        echo "Dashboard no disponible, esperando..."
        sleep 5
        continue
    fi
    
    # Reiniciar el navegador
    DISPLAY=:0 chromium-browser --kiosk --incognito --noerrdialogs \
      --disable-translate --no-first-run --fast --fast-start \
      --disable-infobars --user-agent="VENTAPP_PRINTER_DASHBOARD" \
      --disable-suggestions-service --disable-save-password-bubble \
      --disable-session-crashed-bubble \
      --disable-features=TranslateUI,Translate,OfferTranslateUI \
      --disable-features=DialMediaRouteProvider \
      --autoplay-policy=no-user-gesture-required \
      --disk-cache-size=1000000 --media-cache-size=1000000 \
      --user-data-dir="$TEMP_PROFILE" \
      --no-sandbox --disable-gpu --disable-software-rasterizer \
      --disable-dev-shm-usage --disable-features=dbus \
      --lang=es --accept-lang=es \
      --disable-component-extensions-with-background-pages \
      --disable-background-timer-throttling \
      --disable-renderer-backgrounding \
      --disable-backgrounding-occluded-windows \
      --force-color-profile=srgb \
      --disable-ipc-flooding-protection \
      "$DASHBOARD_URL" &
    BROWSER_PID=$!
    echo "Nuevo PID del navegador: $BROWSER_PID"
    
    # Mover el cursor fuera de la vista después de reiniciar
    DISPLAY=:0 xdotool mousemove 2000 2000 2>/dev/null || true
  fi
  
  # Esperar 10 segundos antes de la siguiente verificación
  sleep 10
done
