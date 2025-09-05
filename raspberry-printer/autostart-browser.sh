#!/bin/bash
# Script para auto-inicio del navegador con el dashboard
# Se ejecuta automáticamente al iniciar la sesión gráfica

# Esperar a que el dashboard esté disponible
echo "Esperando que el dashboard esté disponible..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "Dashboard disponible en intento $i"
        break
    fi
    echo "Intento $i: Dashboard no disponible, esperando..."
    sleep 2
done

# Esperar un poco más para asegurar que todo esté listo
sleep 5

# Obtener la IP local
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Abrir navegador en pantalla completa
echo "Abriendo dashboard en pantalla completa: http://$LOCAL_IP:3000"

# Usar chromium en modo kiosk (pantalla completa sin barras)
chromium-browser \
  --kiosk \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-component-extensions-with-background-pages \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows \
  --disable-features=TranslateUI \
  --no-first-run \
  --fast \
  --fast-start \
  --disable-default-apps \
  --disable-popup-blocking \
  --disable-zero-browsers-open-for-tests \
  --disable-background-mode \
  --no-default-browser-check \
  --no-first-run \
  --autoplay-policy=no-user-gesture-required \
  "http://$LOCAL_IP:3000" &

echo "Navegador iniciado en modo kiosk"
