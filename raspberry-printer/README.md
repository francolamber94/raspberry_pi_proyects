# Sistema de Impresión Distribuida - Raspberry Pi

Este sistema permite configurar una Raspberry Pi como impresora remota para el sistema VentApp, procesando trabajos de impresión de tickets desde una cola centralizada.

## 🚀 Características Principales

- 🖨️ Impresión remota de tickets desde la aplicación web
- 📱 **Dashboard auto-inicio en pantalla completa**
- 📶 Configuración WiFi desde interfaz web
- ⚙️ Auto-configuración y registro de dispositivos
- 🔄 Cola de trabajos con reintentos automáticos
- 🖥️ Soporte para impresoras térmicas y estándar
- 📋 Monitoreo de estado en tiempo real
- 🎯 **Interfaz optimizada para pantallas pequeñas**
- 🔧 Gestión completa del sistema desde el dashboard

## Requisitos

### Hardware
- Raspberry Pi (recomendado Pi 4 o superior)
- Impresora USB (térmica o estándar)
- Tarjeta SD (mínimo 16GB)
- Conexión WiFi

### Software
- Raspberry Pi OS (Debian Bookworm o superior)
- Node.js 18+
- CUPS (sistema de impresión)

## 🚀 Instalación Automática (Recomendado)

**Para Pi SunsetDrive (192.168.68.62)**:
```bash
cd raspberry-printer
./configure-sunset-pi.sh
```

Este script hace todo automáticamente:
- ✅ Copia archivos
- ✅ Instala sistema
- ✅ Configura dashboard
- ✅ Registra dispositivo
- ✅ Muestra URLs de acceso

## Instalación Manual

1. **Descargar y copiar archivos**:
   ```bash
   # En tu computadora, copia todos los archivos a la Raspberry Pi
   scp -r raspberry-printer/* francolamber@192.168.68.62:~/
   ```

2. **Ejecutar instalación**:
   ```bash
   # En la Raspberry Pi
   sshpass -p 'Dire4327' ssh francolamber@192.168.68.62
   cd ~
   chmod +x install.sh
   sudo ./install.sh
   ```

3. **Reiniciar sistema**:
   ```bash
   sudo reboot
   ```

4. **Acceder al dashboard**:
   - Al reiniciar, el dashboard se abre automáticamente en pantalla completa
   - También accesible desde cualquier dispositivo: `http://192.168.68.62:3000`
   - Configuración avanzada en: `http://192.168.68.62:3001`

## Configuración Detallada

### 1. Dashboard Principal (Puerto 3000)

El dashboard principal se abre automáticamente al iniciar la Pi y proporciona:

- **Estado del Sistema**: IP, WiFi, conexión a internet
- **Estado de la Impresora**: Dispositivo, configuración, servidor
- **Cola de Trabajos**: Pendientes, completados, fallidos
- **Configuración WiFi**: Escaneo y conexión a redes
- **Gestión del Sistema**: Reinicio de servicios, logs

### 2. Configuración de Red WiFi

Desde el dashboard principal o la interfaz de configuración:

1. Haz clic en "📡 Buscar Redes" para escanear
2. Selecciona tu red de la lista
3. Ingresa la contraseña
4. Haz clic en "💾 Conectar"

### 3. Configuración del Dispositivo

Desde el dashboard o usando configuración rápida:

**Opción A: Configuración Rápida**
```bash
./quick-setup.sh "Printer-Cocina-01" "cm123abc456def789" "https://ventapp.com.ar/api"
```

**Opción B: Manual**
1. Haz clic en "⚙️ Configurar Impresora" en el dashboard
2. Ingresa nombre único del dispositivo
3. Ingresa Company ID de la empresa
4. Verifica URL del servidor

### 4. Registro del Dispositivo

El registro se hace automáticamente con la configuración rápida, o manualmente:
```bash
cd ~/printer-client
node setup-printer.js
```

### 5. Verificar Estado

Desde el dashboard o por comando:
```bash
printer-status
```

### 6. Aprobar Dispositivo

El administrador debe aprobar el dispositivo desde el panel de administración de VentApp.

### 7. Iniciar Cliente

Los servicios se inician automáticamente. Para control manual:
```bash
sudo systemctl enable printer-client.service
sudo systemctl start printer-client.service
```

## Uso

### Acceso al Sistema

- **📱 Dashboard Principal**: `http://IP_DE_LA_PI:3000` (auto-inicio)
- **⚙️ Configuración Avanzada**: `http://IP_DE_LA_PI:3001`

### Comandos Útiles

- `config-printer` - Mostrar guía de configuración
- `printer-setup` - Registrar dispositivo
- `printer-status` - Ver estado del dispositivo
- `printer-logs` - Ver logs del cliente en tiempo real
- `printer-web` - Ver estado del servidor de configuración
- `printer-dashboard` - Ver estado del dashboard principal

### Imprimir desde la Aplicación Web

1. Ve a cualquier ticket en VentApp
2. Haz clic en el botón "Imprimir QR"
3. Selecciona "Imprimir Remoto" del menú desplegable
4. El ticket se enviará a la cola y será procesado automáticamente

### Monitoreo

#### Ver logs del cliente:
```bash
journalctl -u printer-client.service -f
```

#### Ver estado de servicios:
```bash
systemctl status printer-client.service
systemctl status printer-web-server.service
```

#### Verificar impresoras conectadas:
```bash
lsusb | grep -i printer
lpstat -p
```

## Tipos de Impresión

### Impresoras Térmicas
- Detección automática
- Impresión directa sin drivers adicionales
- Formato optimizado para tickets pequeños

### Impresoras Estándar
- Impresión a través de CUPS
- Generación de PDF temporal
- Formato A4 estándar

## Estructura de Archivos

```
raspberry-printer/
├── install.sh              # Script de instalación principal
├── quick-setup.sh          # Script de configuración rápida
├── dashboard.html          # Dashboard principal (puerto 3000)
├── dashboard-server.js     # Servidor del dashboard
├── autostart-browser.sh    # Script de auto-inicio del navegador
├── printer-client.js       # Cliente principal de impresión
├── setup-printer.js        # Script de registro de dispositivo
├── check-printer-status.js # Script de verificación de estado
├── server.js               # Servidor web de configuración (puerto 3001)
├── index.html              # Interfaz web de configuración avanzada
├── package.json            # Dependencias de Node.js
├── printer-config.json     # Configuración por defecto
├── printer-dashboard.service # Servicio systemd del dashboard
└── README.md               # Esta documentación
```

## API Endpoints

### Dashboard Principal (Puerto 3000)
- `GET /` - Dashboard principal
- `GET /api/ip` - Obtener IP local
- `GET /api/config` - Obtener configuración actual
- `GET /api/jobs` - Obtener trabajos de impresión
- `GET /api/wifi/current` - Red WiFi actual
- `GET /api/wifi/status` - Estado de conexión a internet
- `POST /api/wifi/configure` - Configurar WiFi
- `POST /api/system/restart-services` - Reiniciar servicios
- `POST /api/system/reboot` - Reiniciar sistema
- `GET /api/system/logs` - Obtener logs del sistema

### Servidor de Configuración (Puerto 3001)
- `GET /api/ip` - Obtener IP local
- `GET /api/config` - Obtener configuración actual
- `GET /api/wifi/networks` - Escanear redes WiFi
- `GET /api/wifi/current` - Red WiFi actual
- `POST /api/wifi/configure` - Configurar WiFi
- `POST /api/setup` - Configurar dispositivo

### Servidor Principal (VentApp)
- `POST /api/printer/register` - Registrar dispositivo
- `POST /api/printer/ping` - Enviar ping de estado
- `POST /api/printer/status` - Consultar estado
- `POST /api/printer/get-jobs` - Obtener trabajos de impresión
- `POST /api/printer/update-job` - Actualizar estado de trabajo

## Solución de Problemas

### La impresora no se detecta
```bash
# Verificar conexión USB
lsusb | grep -i printer

# Verificar CUPS
lpstat -p

# Reiniciar CUPS
sudo systemctl restart cups
```

### Error de conexión WiFi
```bash
# Verificar estado de red
nmcli device status

# Reiniciar NetworkManager
sudo systemctl restart NetworkManager

# Ver logs de conexión
journalctl -u NetworkManager -f
```

### El cliente no se conecta al servidor
```bash
# Verificar configuración
cat ~/printer-client/config.json

# Verificar credenciales
ls -la ~/printer-client/credentials.json

# Probar conectividad
curl -v https://ventapp.com.ar/api/health
```

### Problemas de impresión
```bash
# Ver logs del cliente
printer-logs

# Verificar cola de impresión
lpstat -o

# Limpiar cola
sudo cancel -a

# Reiniciar servicio
sudo systemctl restart printer-client.service
```

### Interfaz web no accesible
```bash
# Verificar servidor web
systemctl status printer-web-server.service

# Ver logs del servidor
journalctl -u printer-web-server.service -f

# Reiniciar servidor web
sudo systemctl restart printer-web-server.service
```

## Configuración Avanzada

### Cambiar Puerto del Servidor Web
Edita `/home/francolamber/printer-client/server.js` y cambia:
```javascript
const port = 3001; // Cambiar por el puerto deseado
```

### Configurar Impresora Específica
```bash
# Listar impresoras disponibles
lpstat -p

# Configurar impresora por defecto
lpoptions -d nombre_impresora
```

### Personalizar Formato de Ticket
Edita la función `printTicketThermal` en `printer-client.js` para personalizar el formato de impresión.

## Backup y Restauración

### Crear Backup
```bash
# Backup de configuración
tar -czf printer-backup-$(date +%Y%m%d).tar.gz \
  ~/printer-client/config.json \
  ~/printer-client/credentials.json
```

### Restaurar Configuración
```bash
# Restaurar desde backup
tar -xzf printer-backup-YYYYMMDD.tar.gz -C ~/
```

## Seguridad

- Las credenciales se almacenan con permisos 600 (solo propietario)
- Comunicación HTTPS con el servidor principal
- API keys únicas por dispositivo
- Comandos sudo limitados a operaciones específicas

## Soporte

Para soporte técnico:
1. Revisar logs: `printer-logs`
2. Verificar estado: `printer-status`
3. Consultar documentación en el repositorio
4. Contactar al equipo de VentApp

## Licencia

Este software es propiedad de VentApp y está destinado únicamente para uso interno y clientes autorizados.
