#!/usr/bin/env node

const fs = require("fs");
const axios = require("axios");
const { exec } = require("child_process");

// Configuración
const CONFIG_FILE = "/home/francolamber/printer-client/config.json";
const CREDENTIALS_FILE = "/home/francolamber/printer-client/credentials.json";

// Leer archivos
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf8"));

console.log("🖨️ Cliente Impresora Térmica VentApp");
console.log(`Dispositivo: ${credentials.name}`);
console.log(`Servidor: ${config.api.baseUrl}`);

// Función para obtener trabajos
async function getJobs() {
  try {
    const response = await axios.post(`${config.api.baseUrl}/printer/get-jobs`, {
      apiKey: credentials.apiKey,
      limit: 3
    });
    
    if (response.data.success) {
      return response.data.data.jobs;
    }
    return [];
  } catch (error) {
    console.error("❌ Error obteniendo trabajos:", error.message);
    return [];
  }
}

// Función para actualizar trabajo
async function updateJob(jobId, status, errorMessage = null) {
  try {
    await axios.post(`${config.api.baseUrl}/printer/update-job`, {
      apiKey: credentials.apiKey,
      jobId: jobId,
      status: status,
      errorMessage: errorMessage
    });
    console.log(`✅ Trabajo ${jobId} actualizado a ${status}`);
  } catch (error) {
    console.error(`❌ Error actualizando trabajo:`, error.message);
  }
}

// Función para generar HTML con formato local
function generateLocalStyleHTML(ticketData, qrCode) {
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
            <img src="data:image/png;base64,${qrCode}" alt="QR Code" />
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
      </body>
    </html>
  `;
}

// Función para imprimir
async function printJob(job) {
  console.log(`📄 Procesando trabajo: ${job.id}`);
  
  try {
    // Actualizar a PROCESSING
    await updateJob(job.id, "PROCESSING");
    
    const ticketData = job.ticketData;
    console.log(`🔄 Imprimiendo ticket completo: ${JSON.stringify(ticketData, null, 2)}`);
    
    // Crear JSON con datos del ticket para el script de Python
    const ticketJson = JSON.stringify(ticketData);
    
    // Ejecutar script de Python para ticket completo
    return new Promise((resolve, reject) => {
      exec(`python3 /home/francolamber/print_ticket_complete.py '${ticketJson}'`, async (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Error imprimiendo ticket completo:`, error.message);
          console.log(`📋 Fallback: Intentando con QR simple...`);
          
          // Fallback: usar script de QR simple - con encriptación
          const { encryptTicketId } = require('../../ticketEncryption');
          // Mapear tipos correctamente: checkout -> b, ticket/individual -> i
          let typeTicket = 'i'; // default
          if (ticketData.type === 'checkout') {
            typeTicket = 'b';
          } else if (ticketData.type === 'individual' || ticketData.type === 'ticket') {
            typeTicket = 'i';
          }
          const qrCode = encryptTicketId(typeTicket, ticketData.id);
          exec(`python3 /home/francolamber/print_qr.py "${qrCode}"`, async (fallbackError, fallbackStdout, fallbackStderr) => {
            if (fallbackError) {
              console.error(`❌ Error en fallback:`, fallbackError.message);
              await updateJob(job.id, "FAILED", `Ticket completo falló: ${error.message}, Fallback falló: ${fallbackError.message}`);
              reject(fallbackError);
            } else {
              console.log(`✅ Impresión fallback exitosa: ${fallbackStdout.trim()}`);
              await updateJob(job.id, "COMPLETED");
              resolve(true);
            }
          });
        } else {
          console.log(`✅ Impresión completa exitosa: ${stdout.trim()}`);
          await updateJob(job.id, "COMPLETED");
          resolve(true);
        }
      });
    });
    
  } catch (error) {
    console.error(`❌ Error procesando trabajo:`, error.message);
    await updateJob(job.id, "FAILED", error.message);
  }
}

// Bucle principal
async function main() {
  console.log("🔄 Iniciando cliente...");
  
  while (true) {
    try {
      // Obtener trabajos
      const jobs = await getJobs();
      
      if (jobs.length > 0) {
        console.log(`📋 ${jobs.length} trabajos pendientes`);
        
        // Procesar cada trabajo
        for (const job of jobs) {
          await printJob(job);
        }
      }
      
      // Esperar 5 segundos antes del próximo polling
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error("❌ Error en bucle principal:", error.message);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Esperar más tiempo si hay error
    }
  }
}

// Iniciar
main().catch(console.error);
