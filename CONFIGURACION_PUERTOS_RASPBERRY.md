# 🖨️ Configuración de Puertos - Raspberry Pi Printer Station

## 📅 **Fecha**: 05/01/2025  
## 🎯 **Objetivo**: Eliminar configuración de impresora del botón "⚙️ Configurar"

---

## 🌐 **ESTRUCTURA DE SERVIDORES**

La Raspberry Pi ejecuta **DOS servidores diferentes** sirviendo contenido en puertos distintos:

### **Puerto 3000 - Dashboard Principal** 
- **Proceso**: `dashboard-server.js`
- **Ubicación**: `/home/francolamber/dashboard-server.js` (directorio home)
- **Archivo servido**: `dashboard.html` (desde directorio home)
- **Uso**: Interfaz principal auto-inicio en pantalla completa

### **Puerto 3001 - Servidor de Configuración**
- **Proceso**: `server.js` 
- **Ubicación**: `/home/francolamber/printer-client/server.js`
- **Archivos servidos**: 
  - **Ruta `/`**: `dashboard.html` (interfaz completa)
  - **Ruta `/mobile`**: `index.html` (interfaz móvil)
- **Uso**: Configuración avanzada y acceso móvil

---

## 🔧 **MODIFICACIONES REALIZADAS**

### **✅ Puerto 3000 - Dashboard Principal (MODIFICADO CORRECTAMENTE)**
```bash
# Archivo modificado: dashboard.html
# Ubicación: /home/francolamber/dashboard.html (directorio home)
# Estado: SIN configuración de impresora + Layout mejorado (sin "Estado", "Dispositivo" ancho completo) ✅
# Comandos ejecutados:
# 1. Backup: cp dashboard.html dashboard.html.backup.TIMESTAMP
# 2. Copia: scp index-small-screen-modified.html francolamber@192.168.68.62:~/dashboard.html
```

### **✅ Puerto 3001 - Interfaz Móvil (MODIFICADO CORRECTAMENTE)**
```bash
# Archivo modificado: index.html  
# Ubicación: /home/francolamber/printer-client/index.html
# Estado: SIN configuración de impresora + Layout mejorado ✅
# Comandos ejecutados:
# 1. Backup: cp index-printer-small.html index-printer-small.html.backup.TIMESTAMP
# 2. Copia: scp index-small-screen-modified.html → index-printer-small.html
# 3. Aplicar: cp index-printer-small.html index.html
```

### **✅ Puerto 3001 - Interfaz Principal (RESTAURADO)**
```bash
# Archivo: dashboard.html
# Ubicación: /home/francolamber/printer-client/dashboard.html  
# Estado: CON configuración de impresora (ORIGINAL RESTAURADO) ✅
# Backup del archivo roto: ./dashboard-broken.html
```

---

## 📋 **COMANDOS EJECUTADOS**

### **1. Modificación Puerto 3000**
```bash
# El archivo dashboard-new.html ya estaba correctamente modificado
# sin la sección "Configurar Impresora"
```

### **2. Modificación Puerto 3001 - Móvil** 
```bash
# Backup del archivo original
sshpass -p 'Dire4327' ssh francolamber@192.168.68.62 \
  "cd printer-client && cp index-printer-small.html index-printer-small.html.backup.TIMESTAMP"

# Copiar archivo modificado
sshpass -p 'Dire4327' scp index-small-screen-modified.html \
  francolamber@192.168.68.62:/home/francolamber/printer-client/index-printer-small.html

# Aplicar como index.html
sshpass -p 'Dire4327' ssh francolamber@192.168.68.62 \
  'cd printer-client && cp index-printer-small.html index.html'
```

### **3. Restauración Puerto 3001 - Principal**
```bash
# Descargar archivo roto para referencia
sshpass -p 'Dire4327' scp \
  francolamber@192.168.68.62:/home/francolamber/printer-client/dashboard.html \
  ./dashboard-broken.html

# Restaurar desde backup
sshpass -p 'Dire4327' ssh francolamber@192.168.68.62 \
  "cd printer-client && cp dashboard.html.backup.20250905_015520 dashboard.html"
```

---

## 🎯 **RESULTADO FINAL**

| Puerto | Archivo | Ruta | Configuración Impresora | Layout | Estado |
|--------|---------|------|------------------------|--------|---------|
| **3000** | `dashboard.html` | `/` | ❌ Eliminada | ✅ Mejorado (sin "Estado") | ✅ Correcto |
| **3001** | `dashboard.html` | `/` | ✅ Presente | ⚪ Original | ✅ Restaurado |
| **3001** | `index.html` | `/mobile` | ❌ Eliminada | ✅ Mejorado (sin "Estado") | ✅ Correcto |

---

## 🔍 **VERIFICACIÓN**

### **Comprobar Estado de Archivos**
```bash
# Puerto 3000 - SIN configuración de impresora
sshpass -p 'Dire4327' ssh francolamber@192.168.68.62 \
  "cd printer-client && grep -c 'Configurar Impresora' dashboard-new.html"
# Resultado esperado: 0

# Puerto 3001 Móvil - SIN configuración de impresora  
sshpass -p 'Dire4327' ssh francolamber@192.168.68.62 \
  "cd printer-client && grep -c 'Configurar Impresora' index.html"
# Resultado esperado: 0

# Puerto 3001 Principal - CON configuración de impresora (restaurado)
sshpass -p 'Dire4327' ssh francolamber@192.168.68.62 \
  "cd printer-client && grep -c 'Configurar Impresora' dashboard.html"  
# Resultado esperado: > 0
```

### **Verificar Procesos Activos**
```bash
sshpass -p 'Dire4327' ssh francolamber@192.168.68.62 \
  "ps aux | grep -E '(dashboard-server|server)\.js' | grep -v grep"

# Resultado esperado:
# dashboard-server.js (puerto 3000)
# server.js (puerto 3001)
```

---

## 🚀 **ACCESO A LAS INTERFACES**

### **Interfaz Principal (Puerto 3000) - MODIFICADA ✅**
- **URL**: `http://192.168.68.62:3000/`
- **Uso**: Auto-inicio, pantalla completa
- **Layout**: IP | WiFi + Dispositivo (ancho completo) - SIN "Estado"
- **Botón "⚙️ Configurar"**: Solo WiFi

### **Interfaz Configuración (Puerto 3001) - ORIGINAL ✅**  
- **URL**: `http://192.168.68.62:3001/`
- **Uso**: Configuración avanzada para administradores
- **Layout**: IP | WiFi | Estado | Dispositivo (4 cuadrados)
- **Botón "⚙️ Configurar"**: WiFi + Impresora

### **Interfaz Móvil (Puerto 3001) - MODIFICADA ✅**
- **URL**: `http://192.168.68.62:3001/mobile`  
- **Uso**: Dispositivos móviles
- **Layout**: IP | WiFi + Dispositivo (ancho completo) - SIN "Estado"
- **Botón "⚙️ Configurar"**: Solo WiFi

---

## 📁 **ARCHIVOS DE BACKUP LOCALES**

- `dashboard-broken.html` - Archivo dashboard.html que tenía problemas
- `dashboard-home-original.html` - Backup del archivo del directorio home
- `index-small-screen-modified.html` - Versión modificada sin configuración impresora
- `dashboard-new.html` - Versión modificada del puerto 3000
- `dashboard-client.html` - Backup adicional

---

## ⚠️ **NOTAS IMPORTANTES**

1. **El puerto 3000 es el principal** - se usa para auto-inicio en pantalla completa
2. **El puerto 3001 mantiene configuración completa** - para administradores  
3. **La interfaz móvil (3001/mobile) no tiene configuración de impresora** - para usuarios finales
4. **Todos los backups están creados** - cambios son reversibles
5. **Los servicios necesitan reinicio** después de cambios en archivos

---

## 🔄 **REINICIAR SERVICIOS**

Después de cualquier cambio en archivos HTML:

```bash
sshpass -p 'Dire4327' ssh francolamber@192.168.68.62 \
  "sudo systemctl restart printer-dashboard.service && \
   sudo systemctl restart printer-web-server.service && \
   sudo systemctl restart printer-kiosk.service"
```

---

**✅ Configuración completada - El puerto 3000 muestra solo configuración WiFi**
