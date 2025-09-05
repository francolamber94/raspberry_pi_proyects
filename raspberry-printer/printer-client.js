#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const QRCode = require('qrcode');
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');
const { encryptTicketId } = require('./ticketEncryption');

// Colores para los mensajes
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Archivos de configuración
const CONFIG_DIR = '/home/francolamber/printer-client';
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json');

class PrinterClient {
  constructor() {
    this.config = null;
    this.credentials = null;
    this.printer = null;
    this.isRunning = false;
    this.pollInterval = null;
  }

  // Leer configuración
  readConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        this.config = JSON.parse(configData);
      } else {
        throw new Error('Archivo de configuración no encontrado');
      }
    } catch (error) {
      log(`Error al leer la configuración: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  // Leer credenciales
  readCredentials() {
    try {
      if (fs.existsSync(CREDENTIALS_FILE)) {
        const credsData = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
        this.credentials = JSON.parse(credsData);
      } else {
        throw new Error('Archivo de credenciales no encontrado');
      }
    } catch (error) {
      log(`Error al leer las credenciales: ${error.message}`, 'red');
      log('Ejecute primero: node setup-printer.js', 'yellow');
      process.exit(1);
    }
  }

  // Inicializar impresora térmica
  initializePrinter() {
    try {
      this.printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: '/dev/usb/lp0', // Puerto USB estándar para impresoras
        characterSet: CharacterSet.PC437_USA,
        removeSpecialCharacters: false,
        lineCharacter: '-',
        breakLine: BreakLine.WORD,
        options: {
          timeout: 5000,
        }
      });

      log('✓ Impresora térmica inicializada', 'green');
      return true;
    } catch (error) {
      log(`⚠️  No se pudo inicializar impresora térmica: ${error.message}`, 'yellow');
      log('Se usará impresión por defecto del sistema', 'yellow');
      return false;
    }
  }

  // Obtener IP local
  async getLocalIP() {
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

  // Enviar ping al servidor
  async sendPing() {
    try {
      const ipAddress = await this.getLocalIP();
      const pingUrl = `${this.config.api.baseUrl}${this.config.api.endpoints.ping}`;
      
      const response = await axios.post(pingUrl, {
        apiKey: this.credentials.apiKey,
        ipAddress: ipAddress
      });

      if (response.data.success) {
        log(`✓ Ping enviado - Estado: ${response.data.data.status}`, 'green');
        return response.data.data.status === 'APPROVED';
      } else {
        log(`❌ Error en ping: ${response.data.message}`, 'red');
        return false;
      }
    } catch (error) {
      log(`❌ Error enviando ping: ${error.message}`, 'red');
      return false;
    }
  }

  // Obtener trabajos de impresión
  async getJobs() {
    try {
      const jobsUrl = `${this.config.api.baseUrl}${this.config.api.endpoints.getJobs}`;
      
      const response = await axios.post(jobsUrl, {
        apiKey: this.credentials.apiKey,
        limit: this.config.printer.jobLimit || 3
      });

      if (response.data.success) {
        const jobs = response.data.data.jobs;
        if (jobs.length > 0) {
          log(`📄 Recibidos ${jobs.length} trabajos de impresión`, 'blue');
        }
        return jobs;
      } else {
        log(`❌ Error obteniendo trabajos: ${response.data.message}`, 'red');
        return [];
      }
    } catch (error) {
      log(`❌ Error obteniendo trabajos: ${error.message}`, 'red');
      return [];
    }
  }

  // Actualizar estado de trabajo
  async updateJobStatus(jobId, status, errorMessage = null) {
    try {
      const updateUrl = `${this.config.api.baseUrl}${this.config.api.endpoints.updateJob}`;
      
      const response = await axios.post(updateUrl, {
        apiKey: this.credentials.apiKey,
        jobId: jobId,
        status: status,
        errorMessage: errorMessage
      });

      if (response.data.success) {
        log(`✓ Trabajo ${jobId} actualizado a ${status}`, 'green');
        return true;
      } else {
        log(`❌ Error actualizando trabajo: ${response.data.message}`, 'red');
        return false;
      }
    } catch (error) {
      log(`❌ Error actualizando trabajo: ${error.message}`, 'red');
      return false;
    }
  }

  // Generar código QR
  async generateQR(data) {
    try {
      return await QRCode.toBuffer(data, {
        type: 'png',
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      throw new Error(`Error generando QR: ${error.message}`);
    }
  }

  // Generar HTML con el mismo formato que la impresión local
  generateLocalStyleHTML(ticketData, qrDataURL, qrCode) {
    // Formatear fecha
    const formatDateTime = (dateTime) => {
      if (!dateTime) return '';
      try {
        const date = new Date(dateTime);
        return date.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return '';
      }
    };

    // Agrupar asientos por sector
    const groupSeatsBySector = (seats) => {
      const seatsBySector = {};
      if (!seats || !Array.isArray(seats)) return seatsBySector;
      
      seats.forEach(seat => {
        const sectorName = seat.sectorName || 'General';
        if (!seatsBySector[sectorName]) {
          seatsBySector[sectorName] = [];
        }
        seatsBySector[sectorName].push({
          row: seat.row,
          seatNumber: seat.seatNumber
        });
      });
      return seatsBySector;
    };

    // Determinar datos según el tipo
    let eventName, location, dateTime, seats, userName, isBundle;
    
    if (ticketData.type === 'checkout') {
      eventName = ticketData.eventName || 'Evento Múltiple';
      location = ticketData.location || '';
      dateTime = formatDateTime(ticketData.dateTime);
      userName = ticketData.fullName || '';
      isBundle = true;
      
      // Para bundles, combinar todos los asientos
      seats = [];
      if (ticketData.tickets) {
        ticketData.tickets.forEach(ticket => {
          if (ticket.selectedSeats) {
            seats.push(...ticket.selectedSeats);
          }
        });
      }
    } else {
      eventName = ticketData.eventName || ticketData.title || 'Evento';
      location = ticketData.location || '';
      dateTime = formatDateTime(ticketData.dateTime);
      userName = ticketData.fullName || '';
      seats = ticketData.selectedSeats || [];
      isBundle = false;
    }

    const seatsBySector = groupSeatsBySector(seats);

    return `
      <html>
        <head>
          <title>Ticket QR - ${eventName}</title>
          <style>
            body {
              margin: 0;
              padding: 5px;
              display: flex;
              flex-direction: column;
              align-items: center;
              font-family: Arial, sans-serif;
              width: 48mm;
            }
            .ticket-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 100%;
              max-width: 48mm;
            }
            .ticket-header {
              text-align: center;
              margin-bottom: 8px;
              width: 100%;
            }
            .ticket-header h1 {
              font-size: 14px;
              margin: 0 0 3px 0;
              white-space: normal;
              word-break: break-word;
            }
            .ticket-header p {
              font-size: 10px;
              margin: 0;
            }
            .qr-container {
              margin: 5px 0;
              text-align: center;
            }
            img {
              max-width: 100%;
              width: 42mm;
              height: 42mm;
            }
            .ticket-info {
              width: 100%;
              text-align: center;
              font-size: 10px;
              margin-top: 5px;
            }
            .sector-info {
              font-weight: bold;
              margin: 5px 0 2px;
              font-size: 11px;
              color: #333;
            }
            .seat-info {
              margin: 2px 0;
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
            }
            .seat-chip {
              background-color: #f0f0f0;
              border-radius: 10px;
              padding: 2px 5px;
              margin: 2px;
              font-size: 9px;
            }
            .ticket-footer {
              text-align: center;
              margin-top: 8px;
              font-size: 10px;
              width: 100%;
              border-top: 1px dashed #ccc;
              padding-top: 8px;
            }
            .ticket-id {
              font-family: monospace;
              font-size: 10px;
              margin-top: 3px;
            }
            .user-name {
              font-weight: bold;
              font-size: 11px;
              margin-top: 4px;
            }
            .event-date {
              font-weight: bold;
              margin: 4px 0;
            }
            .location {
              font-style: italic;
              margin-bottom: 4px;
            }
            .bundle-badge {
              font-size: 11px;
              font-weight: bold;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 3px 0;
              margin: 5px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
              width: 100%;
              text-align: center;
            }
            @media print {
              @page {
                size: 48mm 210mm;
                margin: 0;
              }
              body {
                width: 48mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <div class="ticket-header">
              <h1>${eventName}</h1>
              ${location ? `<p class="location">${location}</p>` : ''}
              ${dateTime ? `<p class="event-date">${dateTime}</p>` : ''}
              ${isBundle ? `<div class="bundle-badge">*** TICKET MÚLTIPLE ***</div>` : ''}
            </div>
            
            <div class="qr-container">
              <img src="${qrDataURL}" alt="QR Code" />
            </div>
            
            ${Object.keys(seatsBySector).length > 0 ? `
            <div class="ticket-info">
              <p>Detalles de asientos:</p>
              ${Object.entries(seatsBySector).map(([sectorName, seats]) => `
                <div>
                  <p class="sector-info">${sectorName}</p>
                  <div class="seat-info">
                    ${seats.map(seat => `
                      <span class="seat-chip">
                        ${seat.row ? ` ${seat.row}` : ''} 
                        ${seat.seatNumber ? `- A ${seat.seatNumber}` : ''}
                      </span>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
            ` : ''}
            
            ${userName ? `<p class="user-name">${userName}</p>` : ''}
            
            <div class="ticket-footer">
              <p>Escanee este código en el evento</p>
              <p class="ticket-id">ID: ${ticketData.id}</p>
              <p>${new Date().toLocaleDateString('es-AR')}</p>
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              setTimeout(() => window.close(), 500);
            }, 200);
          </script>
        </body>
      </html>
    `;
  }

  // Imprimir ticket con impresora térmica
  async printTicketThermal(job) {
    if (!this.printer) {
      throw new Error('Impresora térmica no disponible');
    }

    const ticketData = job.ticketData;
    
    try {
      // Limpiar buffer
      this.printer.clear();

      // Encabezado
      this.printer.alignCenter();
      this.printer.setTextSize(1, 1);
      this.printer.bold(true);
      this.printer.println('VENTAPP - TICKET');
      this.printer.bold(false);
      this.printer.drawLine();

      // Información del evento
      this.printer.alignLeft();
      this.printer.setTextNormal();
      
      if (ticketData.type === 'checkout') {
        this.printer.println(`Cliente: ${ticketData.fullName || 'N/A'}`);
        this.printer.println(`Email: ${ticketData.email || 'N/A'}`);
        this.printer.println(`Telefono: ${ticketData.phone || 'N/A'}`);
        this.printer.println(`DNI: ${ticketData.dniPassport || 'N/A'}`);
        this.printer.drawLine();
        
        // Tickets del bundle
        ticketData.tickets.forEach((ticket, index) => {
          this.printer.println(`Ticket ${index + 1}:`);
          this.printer.println(`  ${ticket.title}`);
          this.printer.println(`  Evento: ${ticket.post.title}`);
          this.printer.println(`  Lugar: ${ticket.post.place}`);
          this.printer.println(`  Precio: $${ticket.price}`);
          this.printer.println('');
        });
        
        this.printer.drawLine();
        this.printer.bold(true);
        this.printer.println(`Total: $${ticketData.totalPrice}`);
        this.printer.bold(false);
      } else {
        // Ticket individual
        this.printer.println(`Cliente: ${ticketData.fullName || 'N/A'}`);
        this.printer.println(`Ticket: ${ticketData.title}`);
        this.printer.println(`Evento: ${ticketData.post.title}`);
        this.printer.println(`Lugar: ${ticketData.post.place}`);
        this.printer.println(`Precio: $${ticketData.price}`);
      }

      this.printer.drawLine();
      
      // Código QR - usar encriptación
      // Mapear tipos correctamente: checkout -> b, ticket/individual -> i
      let typeTicket = 'i'; // default
      if (ticketData.type === 'checkout') {
        typeTicket = 'b';
      } else if (ticketData.type === 'individual' || ticketData.type === 'ticket') {
        typeTicket = 'i';
      }
      const qrCode = encryptTicketId(typeTicket, ticketData.id);
      const qrBuffer = await this.generateQR(qrCode);
      
      this.printer.alignCenter();
      this.printer.printImageBuffer(qrBuffer);
      
      this.printer.println('');
      this.printer.setTextSize(0, 0);
      this.printer.println(qrCode);
      
      // Pie de página
      this.printer.println('');
      this.printer.drawLine();
      this.printer.println(`Impreso: ${new Date().toLocaleString()}`);
      this.printer.println('Conserve este ticket');
      
      // Cortar papel
      this.printer.cut();

      // Enviar a imprimir
      await this.printer.execute();
      
      return true;
    } catch (error) {
      throw new Error(`Error en impresión térmica: ${error.message}`);
    }
  }

  // Imprimir ticket con impresión del sistema
  async printTicketSystem(job) {
    const ticketData = job.ticketData;
    
    try {
      // Generar código QR - usar encriptación
      // Mapear tipos correctamente: checkout -> b, ticket/individual -> i
      let typeTicket = 'i'; // default
      if (ticketData.type === 'checkout') {
        typeTicket = 'b';
      } else if (ticketData.type === 'individual' || ticketData.type === 'ticket') {
        typeTicket = 'i';
      }
      const qrCode = encryptTicketId(typeTicket, ticketData.id);
      const qrDataURL = await QRCode.toDataURL(qrCode, { width: 200 });
      
      // Usar el mismo formato que la impresión local
      const html = this.generateLocalStyleHTML(ticketData, qrDataURL, qrCode);

      // Guardar HTML temporal
      const tempFile = `/tmp/ticket_${job.id}.html`;
      fs.writeFileSync(tempFile, html);

      // Imprimir usando chromium-browser
      return new Promise((resolve, reject) => {
        exec(`chromium-browser --headless --disable-gpu --print-to-pdf=/tmp/ticket_${job.id}.pdf "${tempFile}"`, (error) => {
          if (error) {
            reject(new Error(`Error generando PDF: ${error.message}`));
            return;
          }

          // Imprimir PDF
          exec(`lp /tmp/ticket_${job.id}.pdf`, (printError) => {
            // Limpiar archivos temporales
            fs.unlinkSync(tempFile);
            fs.unlinkSync(`/tmp/ticket_${job.id}.pdf`);

            if (printError) {
              reject(new Error(`Error imprimiendo: ${printError.message}`));
            } else {
              resolve(true);
            }
          });
        });
      });
    } catch (error) {
      throw new Error(`Error en impresión del sistema: ${error.message}`);
    }
  }

  // Procesar trabajo de impresión
  async processJob(job) {
    log(`📄 Procesando trabajo: ${job.id} (${job.printType})`, 'blue');
    
    try {
      // Actualizar estado a PROCESSING
      await this.updateJobStatus(job.id, 'PROCESSING');

      // Intentar impresión térmica primero, luego sistema
      let printed = false;
      
      if (this.printer) {
        try {
          await this.printTicketThermal(job);
          printed = true;
          log(`✅ Trabajo ${job.id} impreso con impresora térmica`, 'green');
        } catch (thermalError) {
          log(`⚠️  Error en impresora térmica: ${thermalError.message}`, 'yellow');
          log('Intentando con impresión del sistema...', 'yellow');
        }
      }

      if (!printed) {
        await this.printTicketSystem(job);
        log(`✅ Trabajo ${job.id} impreso con sistema`, 'green');
      }

      // Actualizar estado a COMPLETED
      await this.updateJobStatus(job.id, 'COMPLETED');
      
    } catch (error) {
      log(`❌ Error procesando trabajo ${job.id}: ${error.message}`, 'red');
      await this.updateJobStatus(job.id, 'FAILED', error.message);
    }
  }

  // Bucle principal de polling
  async pollForJobs() {
    if (!this.isRunning) return;

    try {
      // Enviar ping
      const isApproved = await this.sendPing();
      
      if (!isApproved) {
        log('⏳ Dispositivo no aprobado, esperando...', 'yellow');
        return;
      }

      // Obtener trabajos
      const jobs = await this.getJobs();
      
      // Procesar trabajos
      for (const job of jobs) {
        if (!this.isRunning) break;
        await this.processJob(job);
      }

    } catch (error) {
      log(`❌ Error en polling: ${error.message}`, 'red');
    }
  }

  // Iniciar cliente
  async start() {
    log('🖨️  Iniciando cliente impresora...', 'blue');
    
    // Leer configuración
    this.readConfig();
    this.readCredentials();
    
    log(`Dispositivo: ${this.credentials.name}`, 'green');
    
    // Inicializar impresora
    this.initializePrinter();
    
    // Marcar como ejecutándose
    this.isRunning = true;
    
    // Iniciar polling
    log(`🔄 Iniciando polling cada ${this.config.printer.pollInterval}ms`, 'blue');
    
    // Ejecutar inmediatamente
    await this.pollForJobs();
    
    // Programar polling
    this.pollInterval = setInterval(() => {
      this.pollForJobs();
    }, this.config.printer.pollInterval);
    
    log('✅ Cliente impresora iniciado correctamente', 'green');
  }

  // Detener cliente
  stop() {
    log('🛑 Deteniendo cliente impresora...', 'yellow');
    this.isRunning = false;
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    log('✅ Cliente impresora detenido', 'green');
  }
}

// Manejo de señales para cierre limpio
process.on('SIGINT', () => {
  log('\\n🛑 Recibida señal SIGINT, cerrando...', 'yellow');
  if (global.printerClient) {
    global.printerClient.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\\n🛑 Recibida señal SIGTERM, cerrando...', 'yellow');
  if (global.printerClient) {
    global.printerClient.stop();
  }
  process.exit(0);
});

// Función principal
async function main() {
  const client = new PrinterClient();
  global.printerClient = client;
  
  try {
    await client.start();
    
    // Mantener el proceso vivo
    process.stdin.resume();
    
  } catch (error) {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { PrinterClient };
