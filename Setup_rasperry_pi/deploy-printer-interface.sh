#!/bin/bash

# Script para desplegar la nueva interfaz del printer a la Raspberry Pi
# Uso: ./deploy-printer-interface.sh

PI_USER="francolamber"
PI_HOST="192.168.68.62"
PI_PASSWORD="Dire4327"
REMOTE_DIR="/home/francolamber/station-validator"

echo "🚀 Desplegando nueva interfaz del printer a la Raspberry Pi..."
echo "Host: $PI_HOST"
echo "Usuario: $PI_USER"
echo "Directorio remoto: $REMOTE_DIR"

# Verificar que los archivos existen
if [ ! -f "index-printer-small.html" ]; then
    echo "❌ Error: No se encuentra index-printer-small.html"
    exit 1
fi

if [ ! -f "server.js" ]; then
    echo "❌ Error: No se encuentra server.js"
    exit 1
fi

echo ""
echo "📁 Copiando archivos a la Raspberry Pi..."

# Copiar la nueva interfaz
echo "Copiando index-printer-small.html..."
sshpass -p "$PI_PASSWORD" scp index-printer-small.html $PI_USER@$PI_HOST:$REMOTE_DIR/

# Copiar el servidor actualizado
echo "Copiando server.js actualizado..."
sshpass -p "$PI_PASSWORD" scp server.js $PI_USER@$PI_HOST:$REMOTE_DIR/

# Hacer backup del index.html original y reemplazarlo
echo "Haciendo backup del index.html original y actualizando..."
sshpass -p "$PI_PASSWORD" ssh $PI_USER@$PI_HOST << 'ENDSSH'
cd /home/francolamber/station-validator

# Hacer backup del archivo original si existe
if [ -f "index.html" ]; then
    echo "Haciendo backup de index.html..."
    cp index.html index.html.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copiar la nueva interfaz como index.html
echo "Instalando nueva interfaz..."
cp index-printer-small.html index.html

# Verificar que el servicio está ejecutándose
echo "Verificando servicio..."
if pgrep -f "node.*server.js" > /dev/null; then
    echo "Reiniciando servicio del validador..."
    pkill -f "node.*server.js"
    sleep 2
    nohup node server.js > validator.log 2>&1 &
    echo "Servicio reiniciado"
else
    echo "Iniciando servicio del validador..."
    nohup node server.js > validator.log 2>&1 &
    echo "Servicio iniciado"
fi

# Mostrar estado
sleep 3
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Servicio ejecutándose correctamente"
    echo "🌐 Interfaz disponible en http://$(hostname -I | awk '{print $1}'):3000"
else
    echo "❌ Error: El servicio no está ejecutándose"
fi

echo "📋 Archivos en el directorio:"
ls -la

echo ""
echo "📄 Últimas líneas del log:"
tail -10 validator.log 2>/dev/null || echo "No se pudo leer el log"

ENDSSH

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "🔗 Accede a la nueva interfaz en:"
echo "   http://192.168.68.62:3000"
echo ""
echo "💡 La nueva interfaz incluye:"
echo "   - Diseño optimizado para pantalla pequeña"
echo "   - Estado del printer en tiempo real"
echo "   - Configuración WiFi simplificada"
echo "   - Gestión de trabajos de impresión"
echo "   - Información del sistema compacta"
echo ""
echo "🔧 Para monitorear el servicio:"
echo "   sshpass -p 'Dire4327' ssh francolamber@192.168.68.62 'tail -f /home/francolamber/station-validator/validator.log'"
