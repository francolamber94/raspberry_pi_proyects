# 🖨️ VentApp Printer Dashboard - Instrucciones de Uso

## 🎯 **Nuevo Sistema de Auto-Inicio**

### ✅ **¿Qué Cambia?**

Ahora cuando la Raspberry Pi se enciende:

1. **Se inicia automáticamente el dashboard en pantalla completa** (puerto 3000)
2. **Se pueden ver todos los estados del sistema** sin necesidad de SSH
3. **Se puede configurar WiFi directamente desde la pantalla**
4. **Se puede gestionar la cola de trabajos de impresión**
5. **Se pueden reiniciar servicios sin comandos de terminal**

### 📱 **Acceso al Sistema**

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Dashboard Principal** | `http://IP_PI:3000` | Auto-inicio, estado completo, gestión |
| **Configuración Avanzada** | `http://IP_PI:3001` | Configuración detallada de dispositivo |

## 🚀 **Instalación y Configuración**

### **1. Instalación Inicial**

```bash
# Copiar archivos a la Raspberry Pi
scp -r raspberry-printer/* francolamber@192.168.68.59:~/

# Conectar por SSH
ssh francolamber@192.168.68.59

# Ejecutar instalación
chmod +x install.sh
sudo ./install.sh

# El sistema se reiniciará automáticamente
```

### **2. Configuración Rápida (Recomendado)**

```bash
# Después del reinicio, usar configuración rápida
ssh francolamber@192.168.68.59
./quick-setup.sh "Printer-Cocina-01" "cm123abc456def789" "https://ventapp.com.ar/api"
```

### **3. Configuración Manual**

1. **Acceder al dashboard**: `http://IP_PI:3000`
2. **Configurar WiFi**: Buscar redes → Seleccionar → Ingresar contraseña
3. **Configurar dispositivo**: Nombre + Company ID + URL servidor
4. **Registrar**: El sistema se registra automáticamente
5. **Aprobar**: Admin aprueba desde panel VentApp

## 🖥️ **Funcionalidades del Dashboard**

### **📊 Estado del Sistema**
- ✅ **IP Local**: Dirección IP actual de la Pi
- ✅ **WiFi**: Red conectada y estado
- ✅ **Internet**: Conectividad externa
- ✅ **Dispositivo**: Nombre y estado de configuración
- ✅ **Servidor**: Conexión con VentApp
- ✅ **Trabajos**: Contadores en tiempo real

### **⚙️ Configuración**
- ✅ **WiFi**: Escanear redes, conectar, recordar configuración
- ✅ **Dispositivo**: Configurar nombre, empresa, servidor
- ✅ **Sistema**: Reiniciar servicios, reiniciar Pi

### **📋 Cola de Trabajos**
- ✅ **Ver trabajos**: Pendientes, procesando, completados, fallidos
- ✅ **Gestionar**: Cancelar, reenviar, limpiar completados
- ✅ **Monitoreo**: Actualización automática cada 30 segundos

### **📝 Logs del Sistema**
- ✅ **Ver logs**: Logs del cliente de impresión
- ✅ **Tiempo real**: Actualización automática
- ✅ **Gestión**: Limpiar, mostrar/ocultar

## 🔧 **Servicios del Sistema**

| Servicio | Descripción | Puerto | Auto-inicio |
|----------|-------------|---------|-------------|
| `printer-dashboard.service` | Dashboard principal | 3000 | ✅ Sí |
| `printer-web-server.service` | Configuración avanzada | 3001 | ✅ Sí |
| `printer-client.service` | Cliente de impresión | - | ✅ Sí |

### **Comandos de Control**

```bash
# Ver estado de servicios
printer-dashboard
printer-web
systemctl status printer-client.service

# Reiniciar servicios
sudo systemctl restart printer-dashboard.service
sudo systemctl restart printer-web-server.service
sudo systemctl restart printer-client.service

# Ver logs
printer-logs
journalctl -u printer-dashboard.service -f
```

## 🌐 **Configuración de Red**

### **Desde el Dashboard**
1. Haz clic en "📡 Buscar Redes"
2. Selecciona tu red de la lista
3. Ingresa la contraseña
4. Haz clic en "💾 Conectar"
5. El sistema se reconecta automáticamente

### **Desde SSH (Alternativo)**
```bash
# Escanear redes
sudo nmcli device wifi list

# Conectar a red
sudo nmcli device wifi connect "NOMBRE_RED" password "CONTRASEÑA"
```

## 📱 **Experiencia de Usuario**

### **Al Encender la Pi**
1. ⚡ **Boot automático** → Servicios se inician
2. 🖥️ **Dashboard se abre** en pantalla completa automáticamente
3. 🌐 **Estado visible** inmediatamente en pantalla
4. ⚙️ **Configuración** disponible con un clic

### **Gestión Remota**
- 📱 **Desde móvil**: Acceder a `http://IP_PI:3000`
- 💻 **Desde PC**: Mismo URL, interfaz responsive
- 🔧 **Sin SSH**: Todo configurable desde la interfaz web

## 🚨 **Solución de Problemas**

### **Dashboard no se abre automáticamente**
```bash
# Verificar servicio
sudo systemctl status printer-dashboard.service

# Reiniciar servicio
sudo systemctl restart printer-dashboard.service

# Abrir manualmente
chromium-browser --kiosk http://localhost:3000
```

### **No se puede acceder remotamente**
```bash
# Verificar IP
hostname -I

# Verificar puerto
sudo netstat -tlnp | grep :3000

# Verificar firewall (si está habilitado)
sudo ufw status
```

### **Servicios no funcionan**
```bash
# Reiniciar todos los servicios
sudo systemctl restart printer-dashboard.service
sudo systemctl restart printer-web-server.service
sudo systemctl restart printer-client.service

# Ver logs de errores
journalctl -u printer-dashboard.service --no-pager -n 50
```

## 🎉 **Beneficios del Nuevo Sistema**

### **✅ Para el Usuario**
- **Sin necesidad de SSH** para configuración básica
- **Interfaz visual** para todos los estados
- **Configuración WiFi** desde pantalla táctil
- **Monitoreo en tiempo real** de trabajos
- **Acceso remoto** desde cualquier dispositivo

### **✅ Para el Administrador**
- **Auto-inicio completo** sin intervención
- **Configuración rápida** con un solo comando
- **Monitoreo remoto** del estado de impresoras
- **Gestión centralizada** desde panel web
- **Logs accesibles** sin SSH

### **✅ Para el Sistema**
- **Mayor confiabilidad** con auto-reinicio
- **Menos dependencia** de conocimientos técnicos
- **Configuración persistente** que se recuerda
- **Escalabilidad** para múltiples dispositivos
- **Mantenimiento simplificado**

---

**¡El sistema de impresión distribuida ahora es completamente autónomo y fácil de usar!** 🚀
