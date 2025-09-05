#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

// Archivos de configuración
const CONFIG_DIR = '/home/francolamber/printer-client';
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json');

// Leer configuración
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(configData);
    }
    throw new Error('Archivo de configuración no encontrado');
  } catch (error) {
    log(`Error al leer la configuración: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Leer credenciales
function readCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const credsData = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      return JSON.parse(credsData);
    }
    throw new Error('Archivo de credenciales no encontrado');
  } catch (error) {
    log(`Error al leer las credenciales: ${error.message}`, 'red');
    log('Ejecute primero: node setup-printer.js', 'yellow');
    process.exit(1);
  }
}

// Consultar estado del dispositivo
async function checkDeviceStatus(config, credentials) {
  try {
    const statusUrl = `${config.api.baseUrl}${config.api.endpoints.status}`;
    
    const response = await axios.post(statusUrl, {
      apiKey: credentials.apiKey
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Error al consultar estado');
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

// Función principal
async function main() {
  try {
    log('=== ESTADO DE IMPRESORA RASPBERRY PI ===\\n', 'blue');

    // Leer configuración y credenciales
    const config = readConfig();
    const credentials = readCredentials();

    log(`Consultando estado del dispositivo: ${credentials.name}`, 'yellow');

    // Consultar estado
    const deviceStatus = await checkDeviceStatus(config, credentials);

    // Mostrar información del dispositivo
    log('\\n--- INFORMACIÓN DEL DISPOSITIVO ---', 'blue');
    log(`Nombre: ${deviceStatus.name}`, 'green');
    log(`ID: ${deviceStatus.id}`, 'green');
    log(`IP: ${deviceStatus.ipAddress || 'No detectada'}`, 'green');
    log(`Estado: ${deviceStatus.status}`, deviceStatus.status === 'APPROVED' ? 'green' : 'yellow');
    log(`Última conexión: ${deviceStatus.lastSeen ? new Date(deviceStatus.lastSeen).toLocaleString() : 'Nunca'}`, 'green');
    log(`Registrado: ${new Date(deviceStatus.createdAt).toLocaleString()}`, 'green');

    // Mostrar mensaje según el estado
    log('\\n--- ESTADO ACTUAL ---', 'blue');
    switch (deviceStatus.status) {
      case 'PENDING':
        log('⏳ El dispositivo está pendiente de aprobación.', 'yellow');
        log('Contacte al administrador para aprobar este dispositivo.', 'yellow');
        break;
      case 'APPROVED':
        log('✅ El dispositivo está aprobado y puede procesar trabajos de impresión.', 'green');
        log('Para iniciar el cliente impresora, ejecute: node printer-client.js', 'blue');
        break;
      case 'REJECTED':
        log('❌ El dispositivo ha sido rechazado.', 'red');
        log('Contacte al administrador para más información.', 'red');
        break;
      default:
        log(`⚠️  Estado desconocido: ${deviceStatus.status}`, 'yellow');
    }

  } catch (error) {
    log(`\\n❌ Error al consultar el estado: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { main };
