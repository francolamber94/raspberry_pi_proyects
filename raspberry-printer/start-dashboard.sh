#!/bin/bash
# Script de inicio automático - DASHBOARD DE IMPRESORA VENTAPP

echo "Iniciando Dashboard de Impresora VentApp..."

# Esperar a que el dashboard esté disponible
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "Dashboard disponible en intento $i"
        break
    fi
    echo "Esperando dashboard... intento $i"
    sleep 2
done

# Iniciar navegador con dashboard de impresora
chromium-browser --kiosk --disable-infobars --no-first-run --disable-translate http://localhost:3000
