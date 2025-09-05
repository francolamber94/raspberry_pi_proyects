# 🔄 Cambios Realizados al Validador - Guía de Rollback

## 📅 **Fecha de Modificación**: 05/09/2025
## 🎯 **Objetivo**: Reemplazar validador con dashboard de impresora

---

## 🚫 **SERVICIOS SYSTEMD DESHABILITADOS**

### **Servicios Movidos a `/etc/systemd/system/disabled/`**

```bash
# Servicios que estaban habilitados y fueron deshabilitados:
validator-api.service
station-validator-api.service  
validator_x_browser_fix.service
validator_basic.service
validator_tty1.service
validator.service
validator_console.service
validator_touchscreen.service
validator_touchscreen_fix.service
validator_touch.service
validator_fullscreen.service
validator_x_browser.service
validator_browser.service
```

### **Comandos para Rollback de Servicios**
```bash
# Para restaurar los servicios del validador:
sudo mv /etc/systemd/system/disabled/*validator* /etc/systemd/system/
sudo systemctl daemon-reload

# Habilitar el servicio principal del validador:
sudo systemctl enable validator_x_browser_fix.service
sudo systemctl start validator_x_browser_fix.service

# Deshabilitar servicios de impresora:
sudo systemctl disable printer-dashboard.service printer-kiosk.service
sudo systemctl stop printer-dashboard.service printer-kiosk.service
```

---

## 📝 **ARCHIVOS DE CONFIGURACIÓN MODIFICADOS**

### **1. ~/.xinitrc**
**📁 Ubicación**: `/home/francolamber/.xinitrc`
**📋 Backup**: `/home/francolamber/.xinitrc.backup`

**Contenido Original** (restaurado desde backup):
```bash
#!/bin/sh
# Configuración para iniciar automáticamente la aplicación en modo kiosko

# Desactivar ahorro de energía y protector de pantalla
xset -dpms
xset s off
xset s noblank

# Ocultar el cursor del mouse
unclutter -idle 0.5 -root &

# Usar un gestor de ventanas mínimo sin decoraciones
matchbox-window-manager -use_titlebar no &

# Iniciar la aplicación de validación
/home/francolamber/station-validator/start.sh
```

**Comando de Rollback**:
```bash
cp ~/.xinitrc.backup ~/.xinitrc
```

### **2. ~/station-validator/start.sh**
**📁 Ubicación**: `/home/francolamber/station-validator/start.sh`
**📋 Backup**: `/home/francolamber/station-validator/start.sh.backup`

**Contenido Original** (restaurado desde backup):
```bash
#!/bin/bash
# Script de inicio automático para el validador de tickets

# Cambiar al directorio del validador
cd /home/francolamber/station-validator

# Iniciar la aplicación Python
python3 validator.py
```

**Comando de Rollback**:
```bash
cp ~/station-validator/start.sh.backup ~/station-validator/start.sh
chmod +x ~/station-validator/start.sh
```

### **3. ~/station-validator/start_browser.sh**
**📁 Ubicación**: `/home/francolamber/station-validator/start_browser.sh`
**📋 Estado**: Renombrado a `start_browser.sh.disabled`

**Comando de Rollback**:
```bash
mv ~/station-validator/start_browser.sh.disabled ~/station-validator/start_browser.sh
chmod +x ~/station-validator/start_browser.sh
```

---

## ⚙️ **CONFIGURACIONES ELIMINADAS**

### **1. Crontab del Usuario**
**📋 Estado**: Eliminado completamente con `crontab -r`

**Contenido Original**:
```bash
*/5 * * * * /home/francolamber/station-validator/get_local_ip.sh
*/5 * * * * /home/francolamber/station-validator/get_local_ip.sh  
*/5 * * * * /home/francolamber/station-validator/get_local_ip.sh
```

**Comando de Rollback**:
```bash
# Restaurar crontab del validador:
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/francolamber/station-validator/get_local_ip.sh") | crontab -
```

### **2. Autostart del Usuario**
**📁 Ubicación**: `~/.config/autostart/ventapp-dashboard.desktop`
**📋 Estado**: Creado nuevo (reemplaza configuración anterior)

**Comando de Rollback**:
```bash
# Eliminar autostart del dashboard:
rm ~/.config/autostart/ventapp-dashboard.desktop

# El validador usaba servicios systemd, no archivos .desktop
```

---

## 🆕 **ARCHIVOS NUEVOS CREADOS (PARA ELIMINAR EN ROLLBACK)**

### **Archivos del Dashboard**
```bash
/home/francolamber/printer-client/dashboard.html
/home/francolamber/printer-client/dashboard-server.js
/home/francolamber/printer-client/start-dashboard-kiosk.sh
/home/francolamber/printer-client/autostart-browser.sh
/home/francolamber/quick-setup.sh
```

### **Servicios Systemd del Dashboard**
```bash
/etc/systemd/system/printer-dashboard.service
/etc/systemd/system/printer-kiosk.service
/etc/systemd/system/printer-web-server.service
/etc/systemd/system/printer-client.service
```

### **Comando para Eliminar Archivos Nuevos**:
```bash
# Eliminar archivos del dashboard:
sudo rm -rf /home/francolamber/printer-client/dashboard*
sudo rm -rf /home/francolamber/printer-client/start-dashboard*
sudo rm -rf /home/francolamber/printer-client/autostart-browser.sh
rm /home/francolamber/quick-setup.sh

# Eliminar servicios del dashboard:
sudo systemctl disable printer-dashboard.service printer-kiosk.service
sudo systemctl stop printer-dashboard.service printer-kiosk.service  
sudo rm /etc/systemd/system/printer-dashboard.service
sudo rm /etc/systemd/system/printer-kiosk.service
sudo systemctl daemon-reload
```

---

## 🔄 **SCRIPT COMPLETO DE ROLLBACK**

```bash
#!/bin/bash
# Script completo para restaurar el validador

echo "=== RESTAURANDO VALIDADOR DE TICKETS ==="

# 1. Detener servicios de impresora
sudo systemctl stop printer-dashboard.service printer-kiosk.service printer-client.service printer-web-server.service
sudo systemctl disable printer-dashboard.service printer-kiosk.service

# 2. Restaurar servicios del validador
sudo mv /etc/systemd/system/disabled/*validator* /etc/systemd/system/ 2>/dev/null
sudo systemctl daemon-reload

# 3. Restaurar archivos de configuración
cp ~/.xinitrc.backup ~/.xinitrc
cp ~/station-validator/start.sh.backup ~/station-validator/start.sh
mv ~/station-validator/start_browser.sh.disabled ~/station-validator/start_browser.sh
chmod +x ~/station-validator/start.sh
chmod +x ~/station-validator/start_browser.sh

# 4. Restaurar crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/francolamber/station-validator/get_local_ip.sh") | crontab -

# 5. Eliminar autostart del dashboard
rm ~/.config/autostart/ventapp-dashboard.desktop 2>/dev/null

# 6. Habilitar servicios del validador
sudo systemctl enable validator_x_browser_fix.service
sudo systemctl start validator_x_browser_fix.service

# 7. Limpiar archivos del dashboard
sudo rm -rf /home/francolamber/printer-client/dashboard*
sudo rm -rf /home/francolamber/printer-client/start-dashboard*
sudo rm -rf /home/francolamber/printer-client/autostart-browser.sh
rm /home/francolamber/quick-setup.sh 2>/dev/null

# 8. Eliminar servicios del dashboard
sudo rm /etc/systemd/system/printer-dashboard.service 2>/dev/null
sudo rm /etc/systemd/system/printer-kiosk.service 2>/dev/null
sudo systemctl daemon-reload

echo "=== ROLLBACK COMPLETADO ==="
echo "Reinicie el sistema: sudo reboot"
```

---

## 📊 **ESTADO ANTES VS DESPUÉS**

### **ANTES (Validador)**
- ✅ Auto-inicio: `validator_x_browser_fix.service`
- ✅ Navegador: `file:///home/francolamber/station-validator/index.html`
- ✅ Script de inicio: `~/station-validator/start_x_browser_fix.sh`
- ✅ Cron: Actualización de IP cada 5 minutos
- ✅ Puerto: 3000 (validador API)

### **DESPUÉS (Dashboard Impresora)**
- ✅ Auto-inicio: `printer-kiosk.service` + `printer-dashboard.service`
- ✅ Navegador: `http://localhost:3000` (dashboard)
- ✅ Script de inicio: `~/printer-client/start-dashboard-kiosk.sh`
- ✅ Sin cron: Actualización desde dashboard web
- ✅ Puerto: 3000 (dashboard), 3001 (config), cliente (sin puerto)

---

## 🔧 **VERIFICACIÓN POST-ROLLBACK**

Después del rollback, verificar que:

```bash
# 1. Servicios del validador estén activos:
systemctl status validator_x_browser_fix.service

# 2. Navegador muestre validador:
ps aux | grep chromium | grep station-validator

# 3. Crontab esté restaurado:
crontab -l | grep station-validator

# 4. Servicios de impresora estén detenidos:
systemctl status printer-dashboard.service
systemctl status printer-kiosk.service
```

---

## 🎯 **NOTAS IMPORTANTES**

1. **Los archivos de backup están creados** y se pueden usar para rollback
2. **Los servicios del validador están intactos** en `/etc/systemd/system/disabled/`
3. **El rollback es completamente reversible** sin pérdida de datos
4. **Los archivos de impresora se pueden eliminar** sin afectar el validador
5. **La configuración de autologin permanece igual** (no se modificó)

---

## 🚀 **PARA VOLVER AL DASHBOARD DE IMPRESORA**

Si después del rollback quieres volver al dashboard:

```bash
# Ejecutar el script de configuración automática:
./configure-sunset-pi.sh
```

**¡Todos los cambios están documentados y son completamente reversibles!** ✅
