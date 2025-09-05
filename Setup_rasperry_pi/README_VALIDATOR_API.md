# API de Validación de Dispositivos Raspberry Pi

Este documento describe la configuración y uso de la API para registrar y validar dispositivos Raspberry Pi como validadores de tickets para eventos.

## Contenidos

- [Estructura de archivos](#estructura-de-archivos)
- [Endpoints API](#endpoints-api)
- [Scripts de configuración](#scripts-de-configuración)
- [Comandos de instalación](#comandos-de-instalación)
- [Solución de problemas](#solución-de-problemas)

## Estructura de archivos

### Archivos del servidor

Los archivos relacionados con la API de validación en el servidor están en:

```
src/server/api/routers/devices/index.ts       # Router tRPC para gestionar dispositivos
src/pages/api/station/register.ts             # Endpoint REST para registro de dispositivos
src/pages/api/station/ping.ts                 # Endpoint REST para actualizaciones de estado
src/pages/api/station/status.ts               # Endpoint REST para consultar el estado
src/pages/api/station/validate.ts             # Endpoint REST para validar tickets
```

### Scripts para configurar Raspberry Pi

Los scripts para configurar las Raspberry Pi como validadores están en la raíz del proyecto:

```
setup_raspberry.sh          # Script principal para configurar una Raspberry Pi
check_status.sh             # Script para verificar el estado de aprobación
manual_ping.sh              # Script para enviar pings manuales al servidor
raspberry_config.json       # Archivo de configuración con URLs y endpoints
setup_commands.txt          # Comandos listos para ejecutar
```

## Endpoints API

La API proporciona los siguientes endpoints REST públicos:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/station/register` | POST | Registra un nuevo dispositivo en el sistema |
| `/api/station/ping` | POST | Actualiza el estado y la IP del dispositivo |
| `/api/station/status` | POST | Consulta el estado de aprobación del dispositivo |
| `/api/station/validate` | POST | Valida un ticket utilizando un dispositivo aprobado |

Y los siguientes endpoints tRPC protegidos:

| Procedimiento | Descripción |
|---------------|-------------|
| `devices.getDevices` | Obtiene la lista de dispositivos registrados |
| `devices.updateDeviceApproval` | Aprueba o rechaza un dispositivo |

## Scripts de configuración

### setup_raspberry.sh

Script principal para configurar una Raspberry Pi como validador:

- Crea un directorio de configuración
- Verifica dependencias necesarias (jq, curl)
- Copia el archivo de configuración
- Registra el dispositivo en el servidor
- Almacena de forma segura la API key

### check_status.sh

Script para verificar el estado de aprobación del dispositivo:

- Consulta el estado actual (PENDING, APPROVED, REJECTED)
- Muestra información detallada del dispositivo

### manual_ping.sh

Script para enviar pings manuales al servidor:

- Actualiza la IP y el timestamp del dispositivo
- Útil para mantener actualizado el estado o para cambios de red

## Comandos de instalación

Puedes encontrar los comandos completos para configurar una Raspberry Pi en el archivo `setup_commands.txt`. Aquí hay un resumen:

1. **Modificar URL base en raspberry_config.json**:
   ```bash
   # Reemplaza con tu dominio real
   sed -i 's|https://tu-dominio.com|https://ventapp.com.ar|g' raspberry_config.json
   ```

2. **Transferir archivos a la Raspberry Pi**:
   ```bash
   scp raspberry_config.json setup_raspberry.sh check_status.sh manual_ping.sh francolamber@192.168.68.53:~/
   ```

3. **Hacer ejecutables los scripts**:
   ```bash
   ssh francolamber@192.168.68.53 'chmod +x ~/setup_raspberry.sh ~/check_status.sh ~/manual_ping.sh'
   ```

4. **Ejecutar configuración inicial**:
   ```bash
   ssh francolamber@192.168.68.53 '~/setup_raspberry.sh'
   ```

5. **Verificar el estado**:
   ```bash
   ssh francolamber@192.168.68.53 '~/check_status.sh'
   ```

6. **Configurar ping periódico (opcional)**:
   ```bash
   ssh francolamber@192.168.68.53 '(crontab -l 2>/dev/null; echo "0 * * * * /home/francolamber/manual_ping.sh >> /home/francolamber/ping.log 2>&1") | crontab -'
   ```

## Solución de problemas

### Error: parse error: Invalid numeric literal

Si ves este error durante el registro del dispositivo:
```
parse error: Invalid numeric literal at line 1, column 10
[ERROR] Error al registrar el dispositivo:
```

Posibles causas y soluciones:

1. **URL incorrecta en el archivo de configuración**:
   - Verifica que la URL base en `raspberry_config.json` sea correcta
   - Asegúrate de que incluya `https://` o `http://` según corresponda

2. **Servidor no disponible**:
   - Verifica que el servidor esté en línea y sea accesible desde la Raspberry Pi
   - Comprueba la conectividad con `curl -v https://tu-dominio.com/api/health`

3. **Error en la respuesta del servidor**:
   - Revisa los logs del servidor para detectar errores en el endpoint de registro

4. **Problemas con el parsing JSON**:
   - Es posible que la respuesta del servidor no sea un JSON válido
   - Intenta ejecutar el comando `curl` directamente para ver la respuesta completa:
     ```bash
     curl -v -X POST "https://tu-dominio.com/api/station/register" \
       -H "Content-Type: application/json" \
       -d '{"name":"Pi-Test", "ipAddress":"192.168.1.100"}'
     ```

### Error: API key no válida

Si al verificar el estado aparece un error de API key no válida:

1. **Eliminar credenciales antiguas**:
   ```bash
   rm ~/station-validator/credentials.json
   ```

2. **Volver a registrar el dispositivo**:
   ```bash
   ~/setup_raspberry.sh
   ```

### Problemas de conectividad

Para diagnosticar problemas de conectividad:

1. **Verificar conectividad a Internet**:
   ```bash
   ping -c 4 8.8.8.8
   ```

2. **Verificar resolución DNS**:
   ```bash
   ping -c 4 ventapp.com.ar
   ```

3. **Verificar acceso al servidor**:
   ```bash
   curl -v https://ventapp.com.ar/api/health
   ``` 