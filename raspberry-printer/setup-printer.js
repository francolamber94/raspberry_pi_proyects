#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');

// Colores para los mensajes
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Directorios y archivos
const CONFIG_DIR = '/home/francolamber/printer-client';
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json');

// Leer configuración
function readConfig() {
  try {
    if (fs.existsSync('./printer-config.json')) {
      const configData = fs.readFileSync('./printer-config.json', 'utf8');
      return JSON.parse(configData);
    }
    log('Archivo de configuración no encontrado', 'red');
    process.exit(1);
  } catch (error) {
    log(`Error al leer la configuración: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Obtener IP local
function getLocalIP() {
  return new Promise((resolve, reject) => {
    exec("hostname -I | awk '{print $1}'", (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

// Registrar dispositivo en el servidor
async function registerDevice(config, ipAddress) {
  try {
    const registerUrl = `${config.api.baseUrl}${config.api.endpoints.register}`;
    
    log(`Registrando dispositivo en: ${registerUrl}`, 'blue');
    
    const response = await axios.post(registerUrl, {
      name: config.printer.name,
      ipAddress: ipAddress,
      companyId: config.printer.companyId
    });

    if (response.data.success) {
      log(`✓ Dispositivo registrado exitosamente: ${response.data.data.name}`, 'green');
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Error al registrar dispositivo');
    }
  } catch (error) {
    if (error.response) {
      throw new Error(`Error del servidor: ${error.response.data.message || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('No se pudo conectar al servidor. Verifique la conexión a internet.');
    } else {
      throw new Error(`Error: ${error.message}`);
    }
  }
}

// Crear directorio de configuración
function createConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    log(`✓ Directorio de configuración creado: ${CONFIG_DIR}`, 'green');
  }
}

// Guardar configuración
function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  log(`✓ Configuración guardada en: ${CONFIG_FILE}`, 'green');
}

// Guardar credenciales
function saveCredentials(credentials) {
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
  fs.chmodSync(CREDENTIALS_FILE, 0o600); // Solo el propietario puede leer/escribir
  log(`✓ Credenciales guardadas de forma segura`, 'green');
}

// Función principal
async function main() {
  try {
    log('=== CONFIGURACIÓN DE IMPRESORA RASPBERRY PI ===', 'blue');
    log('Este script configurará su Raspberry Pi como impresora remota.\\n', 'yellow');

    // Leer configuración
    const config = readConfig();
    log(`Configurando dispositivo: ${config.printer.name}`, 'blue');

    // Obtener IP local
    log('Obteniendo dirección IP local...', 'yellow');
    const ipAddress = await getLocalIP();
    log(`✓ IP local detectada: ${ipAddress}`, 'green');

    // Crear directorio de configuración
    createConfigDir();

    // Registrar dispositivo
    log('\\nRegistrando dispositivo en el servidor...', 'yellow');
    const deviceData = await registerDevice(config, ipAddress);

    // Guardar configuración y credenciales
    saveConfig(config);
    saveCredentials({
      deviceId: deviceData.id,
      apiKey: deviceData.apiKey,
      name: deviceData.name
    });

    log('\\n=== CONFIGURACIÓN COMPLETADA ===', 'green');
    log(`Dispositivo: ${deviceData.name}`, 'green');
    log(`Estado: ${deviceData.status}`, 'yellow');
    log(`API Key: ${deviceData.apiKey.substring(0, 8)}...`, 'green');
    
    if (deviceData.status === 'PENDING') {
      log('\\n⚠️  IMPORTANTE: El dispositivo está pendiente de aprobación.', 'yellow');
      log('Contacte al administrador para aprobar este dispositivo.', 'yellow');
      log('\\nPuede verificar el estado con:', 'blue');
      log('node check-printer-status.js', 'blue');
    }

  } catch (error) {
    log(`\\n❌ Error durante la configuración: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { main };
