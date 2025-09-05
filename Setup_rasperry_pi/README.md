# Configuración de Validador de Tickets en Raspberry Pi

Este repositorio contiene todos los archivos necesarios para configurar una Raspberry Pi con pantalla táctil XPT2046 3.5" como validador de tickets en modo kiosk.

## Contenido del Repositorio

- `index.html`: Interfaz web del validador de tickets
- `install.sh`: Script de instalación automatizada
- `start_x_browser_fix.sh`: Script para iniciar X y el navegador en modo kiosk
- `validator_x_browser_fix.service`: Servicio systemd para autoarranque
- `fbdev.conf`: Configuración de la pantalla táctil
- `server.js`: Servidor Express local para gestión de IP y simulación de API
- `get_local_ip.sh`: Script para obtener la IP local

## Características

- Modo kiosk a pantalla completa
- Cursor del mouse oculto automáticamente (después de 0.5 segundos de inactividad)
- Interfaz táctil optimizada
- Reinicio automático en caso de fallo
- Configuración persistente tras reinicios
- Servidor Express local para mostrar la IP y simular API
- Integración con API remota a través de ngrok
- Configuración WiFi desde la interfaz gráfica

## Requisitos

- Raspberry Pi (probado en Raspberry Pi 4)
- Pantalla táctil XPT2046 3.5"
- Sistema operativo Raspberry Pi OS (Debian Bookworm) instalado
- Conexión a internet (para instalar paquetes)
- Node.js y npm (para el servidor Express)

## Instrucciones de Instalación Rápida

1. Copie todo el contenido de este directorio a la Raspberry Pi
2. Cambie al directorio donde copió los archivos
3. Ejecute el script de instalación como administrador:

```bash
sudo chmod +x install.sh
sudo ./install.sh
```

4. La Raspberry Pi se reiniciará automáticamente y el validador de tickets se iniciará en modo kiosk.

## Instalación Manual Paso a Paso

Si prefiere realizar la instalación manualmente, siga estos pasos:

### 1. Preparar el Sistema

Actualice el sistema e instale las dependencias necesarias:

```bash
sudo apt update
sudo apt install -y chromium-browser x11-xserver-utils unclutter xserver-xorg xinit matchbox-window-manager
```

### 2. Instalar Node.js y dependencias

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar dependencias del servidor Express
cd ~/station-validator
npm install express cors
```

### 3. Configurar la Pantalla Táctil

Copie el archivo de configuración de la pantalla:

```bash
sudo cp fbdev.conf /usr/share/X11/xorg.conf.d/99-fbdev.conf
```

### 4. Crear Directorio para la Aplicación

```bash
mkdir -p ~/station-validator
cp index.html server.js package.json ~/station-validator/
```

### 5. Configurar el Script de Inicio

```bash
cp start_x_browser_fix.sh get_local_ip.sh ~/station-validator/
chmod +x ~/station-validator/start_x_browser_fix.sh ~/station-validator/get_local_ip.sh
```

### 6. Configurar el Servicio Systemd

```bash
sudo cp validator_x_browser_fix.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable validator_x_browser_fix.service
```

### 7. Configurar el Servidor Express como servicio

Cree un archivo de servicio para el servidor Express:

```bash
sudo bash -c 'cat > /etc/systemd/system/station-validator-api.service << EOF
[Unit]
Description=Servidor Express para Validador de Tickets
After=network.target

[Service]
ExecStart=/usr/bin/node /home/francolamber/station-validator/server.js
WorkingDirectory=/home/francolamber/station-validator
Restart=always
User=francolamber
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF'

sudo systemctl daemon-reload
sudo systemctl enable station-validator-api.service
sudo systemctl start station-validator-api.service
```

### 8. Configurar permisos sudo para las operaciones de red

Para permitir que el servidor Express pueda cambiar la configuración WiFi, es necesario configurar permisos sudo específicos:

```bash
sudo bash -c 'cat > /etc/sudoers.d/010_francolamber-nopasswd << EOF
francolamber ALL=(ALL) NOPASSWD: /sbin/ifconfig, /sbin/reboot, /usr/sbin/reboot, /usr/bin/wpa_cli, /usr/bin/iwconfig, /usr/bin/systemctl restart wpa_supplicant, /usr/bin/systemctl restart networking, /usr/bin/cat /etc/wpa_supplicant/wpa_supplicant.conf, /bin/cp /tmp/wpa_supplicant.conf /etc/wpa_supplicant/wpa_supplicant.conf, /bin/chmod, /usr/bin/iwlist wlan0 scan, /usr/bin/wpa_passphrase
EOF'

sudo chmod 440 /etc/sudoers.d/010_francolamber-nopasswd
```

Esto permitirá que el usuario `francolamber` ejecute los comandos necesarios para la configuración de red sin solicitar contraseña.

### 9. Configurar Autologin

```bash
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d/
sudo bash -c 'cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $USER --noclear %I \$TERM
EOF'
```

### 10. Reiniciar la Raspberry Pi

```bash
sudo reboot
```

## Servidor Express Local

El sistema ahora incluye un servidor Express local que proporciona las siguientes funcionalidades:

### Endpoints Disponibles

- `GET /api/ip`: Devuelve la IP local de la Raspberry Pi
- `GET /api/health`: Punto de verificación para comprobar la conectividad
- `POST /api/station/validate`: Simula la validación de tickets
- `POST /api/command`: Ejecuta comandos del sistema de forma segura
- `GET /api/wifi/networks`: Obtiene las redes WiFi disponibles
- `GET /api/wifi/current`: Obtiene la configuración WiFi actual
- `POST /api/wifi/configure`: Configura una nueva conexión WiFi
- `GET /api/wifi/status`: Verifica el estado de la conexión

### Iniciar/Reiniciar el Servidor

```bash
# Iniciar manualmente
cd ~/station-validator
node server.js

# Reiniciar el servicio
sudo systemctl restart station-validator-api.service

# Ver logs del servidor
journalctl -u station-validator-api.service
```

### Integración con API Externa

El validador está configurado para usar:

- El servidor local para obtener la IP (`http://localhost:3000/api/ip`)
- La API remota de ngrok para validar tickets (`https://19b0-45-178-195-5.ngrok-free.app/api/station/validate`)

## Configuración WiFi

El validador incluye una interfaz gráfica para configurar la red WiFi directamente desde la pantalla táctil:

### Acceso a la Configuración WiFi

1. En la interfaz principal del validador, presione el botón "Conf" ubicado junto a la dirección IP
2. Se abrirá un panel con dos pestañas: "Redes" y "Configurar"

### Cambiar la Red WiFi

1. En la pestaña "Redes", presione "Buscar redes" para escanear las redes disponibles
2. Seleccione la red deseada de la lista o proceda a "Configurar"
3. Ingrese el nombre de la red (SSID) y la contraseña
4. Presione "Guardar" para aplicar la configuración
5. El sistema se reiniciará automáticamente para conectarse a la nueva red

### Solución de Problemas WiFi

Si tiene problemas para cambiar la red WiFi:

```bash
# Ver logs detallados del servidor Express
cat ~/station-validator/server-debug.log

# Verificar la configuración WiFi actual
cat /etc/wpa_supplicant/wpa_supplicant.conf

# Reiniciar manualmente la interfaz de red
sudo wpa_cli -i wlan0 reconfigure
```

## Solución de Problemas

### La pantalla no muestra el validador

Verifique los logs para diagnóstico:

```bash
cat ~/station-validator/browser.log
```

Verifique el estado del servicio:

```bash
sudo systemctl status validator_x_browser_fix.service
```

### Problemas con el servidor Express

Si tiene problemas para obtener la IP o conectarse al servidor Express:

```bash
# Verificar estado del servidor
sudo systemctl status station-validator-api.service

# Verificar manualmente que el servidor responde
curl http://localhost:3000/api/ip
curl http://localhost:3000/api/health

# Reiniciar el servidor
sudo systemctl restart station-validator-api.service
```

### Problema de Interfaces Duplicadas

Si ve dos interfaces diferentes al mismo tiempo (una web bonita con header amarillo y otra básica sin estilos), es porque hay dos servicios en conflicto ejecutándose simultáneamente. Solucione esto con:

```bash
# Detener y desactivar el servicio táctil Python (versión sin estilos)
sudo systemctl stop validator_touch.service
sudo systemctl disable validator_touch.service

# Verificar que solo el servicio web esté habilitado
sudo systemctl list-unit-files | grep -i valid
```

### El Cursor del Mouse Sigue Visible

Si el cursor del mouse sigue visible, puede instalar xdotool y moverlo fuera de la pantalla:

```bash
sudo apt install -y xdotool
```

Luego modifique el script `start_x_browser_fix.sh` para añadir:

```bash
# Mover el cursor fuera de la pantalla
DISPLAY=:0 xdotool mousemove 2000 2000
```

### Controlador de Pantalla

Si la pantalla no funciona correctamente, puede que necesite instalar los controladores específicos de su pantalla. Para pantallas Waveshare 3.5", puede utilizar el siguiente repositorio:

```bash
git clone https://github.com/waveshare/LCD-show.git
cd LCD-show/
chmod +x LCD35-show
sudo ./LCD35-show
```

## Personalización

### Cambiar la URL del Validador

Si desea cambiar la URL o configuración del validador, edite el archivo `index.html` en el directorio `~/station-validator/`:

```bash
# Editar el archivo index.html para actualizar la URL de la API remota
nano ~/station-validator/index.html

# Buscar la línea con API_BASE y cambiar la URL de ngrok
# const API_BASE = 'https://your-new-ngrok-url.ngrok-free.app';

# Reiniciar el servicio después de los cambios
sudo systemctl restart validator_x_browser_fix.service
```

### Cambiar la Configuración del Servidor Express

Si necesita modificar el comportamiento del servidor Express:

```bash
# Editar el archivo server.js
nano ~/station-validator/server.js

# Reiniciar el servicio después de los cambios
sudo systemctl restart station-validator-api.service
```

### Cambiar la Configuración del Navegador

Si necesita modificar las opciones del navegador, edite el archivo `start_x_browser_fix.sh` y ajuste los parámetros de la línea que inicia `chromium-browser`.

## Mantenimiento

### Reiniciar el Servicio

Si necesita reiniciar el validador:

```bash
sudo systemctl restart validator_x_browser_fix.service
sudo systemctl restart station-validator-api.service
```

### Actualizar el Validador

Si desea actualizar el archivo HTML del validador, simplemente reemplace el archivo `index.html` en el directorio `~/station-validator/` y reinicie el servicio.

## Visualización de IP y Logs

El validador incluye características de depuración y monitoreo:

### Visualización de IP Local

La interfaz ahora muestra automáticamente la dirección IP local del dispositivo mediante el servidor Express:

- El servidor Express proporciona la IP a través del endpoint `/api/ip`
- La interfaz web consulta este endpoint para mostrar la IP en pantalla
- Se actualiza periódicamente para reflejar cambios en la red

### Visualización de Logs

El validador también incluye un botón "Logs" que muestra mensajes de depuración directamente en la pantalla:

- Muestra logs de conexión y errores
- Útil para diagnóstico rápido sin necesidad de SSH
- Activable/desactivable con un simple toque

Para ver los logs más detallados del sistema:

```bash
# Logs del navegador
cat ~/station-validator/browser_*.log

# Logs del servidor Express
cat ~/station-validator/server.log
journalctl -u station-validator-api.service
```

## Notas Adicionales

- El servicio está configurado para reiniciarse automáticamente en caso de fallos.
- La pantalla táctil debería funcionar correctamente sin calibración adicional.
- Los logs del validador se guardan en `~/station-validator/browser.log`.
- El servidor Express mejora la funcionalidad proporcionando la IP local sin depender de archivos externos.

## Compatibilidad con Raspberry Pi OS Bookworm

Raspberry Pi OS Bookworm introduce cambios importantes en la gestión de redes que afectan el funcionamiento del validador:

### Cambios en la gestión de redes

- Bookworm utiliza **NetworkManager** en lugar de wpa_supplicant para la gestión de redes
- Los métodos tradicionales de configuración WiFi (wpa_supplicant.conf) están deprecados
- La funcionalidad de colocar wpa_supplicant.conf en la partición boot ya no funciona

### Modificaciones implementadas

El servidor Express ha sido actualizado para trabajar con Bookworm:

- Uso de comandos `nmcli` para gestionar redes WiFi
- Mejora en la detección y configuración de redes
- Sistema más robusto para obtener la IP local
- Compatibilidad con conexiones seguras modernas

### Configuración WiFi en Bookworm

Si necesitas configurar la WiFi manualmente en Bookworm:

```bash
# Ver las redes disponibles
sudo nmcli device wifi list

# Conectar a una red
sudo nmcli device wifi connect "NOMBRE_RED" password "CONTRASEÑA"

# Ver conexiones guardadas
nmcli connection show

# Eliminar una conexión guardada
sudo nmcli connection delete "NOMBRE_CONEXIÓN"
```

### Obtención de IP mejorada

El sistema ahora cuenta con múltiples métodos para detectar la IP local:

- Utiliza primero `hostname -I` (más confiable en Bookworm)
- Intenta con `ip addr show` si el primer método falla
- Recurre a `ifconfig` si es necesario
- Finalmente intenta con `nmcli` como último recurso
- Guarda la IP en un archivo local para mayor accesibilidad

### Solución de problemas en Bookworm

Si experimentas problemas con la configuración WiFi:

1. **Verificar el estado de NetworkManager**:

   ```bash
   sudo systemctl status NetworkManager
   ```

2. **Ver redes disponibles**:

   ```bash
   sudo nmcli device wifi rescan && sudo nmcli device wifi list
   ```

3. **Revisar logs del servidor Express**:

   ```bash
   tail -50 ~/station-validator/server.log
   ```

4. **Comprobar servicio Node.js**:

   ```bash
   ps aux | grep node
   systemctl --user status station-validator-api.service
   ```

5. **Reiniciar el servicio manualmente**:

   ```bash
   killall node
   cd ~/station-validator
   node server.js > server.log 2>&1 &
   ```

6. **Verificar cambios de IP**:
   ```bash
   ip addr show wlan0
   hostname -I
   ```

### Actualización del sistema después de una instalación existente

Si instalaste el validador en una versión anterior de Raspberry Pi OS y actualizaste a Bookworm, es recomendable:

1. Actualizar el archivo server.js a la versión compatible con NetworkManager
2. Actualizar index.html para mejor detección de IP
3. Reiniciar el servicio de Node.js

---

Si tiene problemas con la configuración, consulte los logs o contacte con el soporte técnico.

ssh francolamber@192.168.68.59 'sudo systemctl restart validator_x_browser_fix.service'
