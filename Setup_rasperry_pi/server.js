const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Rutas de archivos de configuración
const CONFIG_DIR = '/home/francolamber/station-validator';
const CONFIG_FILE = `${CONFIG_DIR}/config.json`;
const CREDENTIALS_FILE = `${CONFIG_DIR}/credentials.json`;

// Función para leer la configuración
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(configData);
    }
    console.error('Archivo de configuración no encontrado');
    return { api: { baseUrl: 'https://92f0-45-178-195-5.ngrok-free.app/api' } };
  } catch (error) {
    console.error('Error al leer la configuración:', error);
    return { api: { baseUrl: 'https://92f0-45-178-195-5.ngrok-free.app/api' } };
  }
}

// Función para leer las credenciales
function readCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const credsData = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      return JSON.parse(credsData);
    }
    console.error('Archivo de credenciales no encontrado');
    return { apiKey: 'test-api-key' };
  } catch (error) {
    console.error('Error al leer las credenciales:', error);
    return { apiKey: 'test-api-key' };
  }
}

// Leer la configuración y credenciales
const config = readConfig();
const credentials = readCredentials();

// Configurar la URL de la API
const API_BASE_URL = config.api.baseUrl || 'https://92f0-45-178-195-5.ngrok-free.app/api';
const API_KEY = credentials.apiKey || 'test-api-key';

// Habilitar CORS para todas las rutas
app.use(
  cors({
    origin: '*', // Permite todas las origenes (para desarrollo)
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '.')));

// Servir la interfaz optimizada para printer
app.get('/printer', (req, res) => {
  res.sendFile(path.join(__dirname, 'index-printer-small.html'));
});

// Redirigir la raíz a la interfaz del printer
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index-printer-small.html'));
});

// Endpoint para obtener la URL de la API y la apiKey
app.get('/api/config', (req, res) => {
  res.json({
    api: {
      baseUrl: API_BASE_URL,
      endpoints: {
        register: '/printer/register',
        ping: '/printer/ping',
        status: '/printer/status',
        getJobs: '/printer/get-jobs',
        updateJob: '/printer/update-job'
      }
    },
    printer: {
      name: 'Printer-Station-01',
      pollInterval: 5000
    },
    credentials: {
      apiKey: API_KEY
    },
    validateEndpoint: '/validate-ticket',
    apiKey: API_KEY
  });
});

// Endpoint para configurar el printer
app.post('/api/setup', (req, res) => {
  const { deviceName, serverUrl } = req.body;
  
  if (!deviceName || !serverUrl) {
    return res.status(400).json({ 
      success: false, 
      error: 'deviceName y serverUrl son requeridos' 
    });
  }

  // Aquí normalmente guardaríamos la configuración en un archivo
  // Por ahora, simulamos que se guardó correctamente
  console.log(`Configurando printer: ${deviceName} -> ${serverUrl}`);
  
  res.json({
    success: true,
    message: 'Printer configurado correctamente',
    config: {
      deviceName,
      serverUrl,
      configuredAt: new Date().toISOString()
    }
  });
});

// Endpoint para obtener la IP local
app.get('/api/ip', (req, res) => {
  // Usar varios métodos para obtener la IP, empezando por el más confiable
  exec("hostname -I | awk '{print $1}'", (error, stdout, stderr) => {
    if (!error && stdout.trim()) {
      const ip = stdout.trim();
      console.log('IP obtenida con hostname -I:', ip);

      // Crear un archivo local para que sea accesible más fácilmente
      fs.writeFile(path.join(__dirname, 'local_ip.txt'), ip, err => {
        if (err) {
          console.error('Error al guardar IP en archivo:', err);
        }
      });

      return res.json({ ip: ip });
    }

    // Método alternativo con ip
    exec(
      'ip -4 addr show | grep -oP "(?<=inet\\s)\\d+(\.\\d+){3}" | grep -v "127.0.0.1" | head -n 1',
      (ipError, ipStdout, ipStderr) => {
        if (!ipError && ipStdout.trim()) {
          const ip = ipStdout.trim();
          console.log('IP obtenida con ip addr:', ip);

          // Crear un archivo local
          fs.writeFile(path.join(__dirname, 'local_ip.txt'), ip, err => {
            if (err) {
              console.error('Error al guardar IP en archivo:', err);
            }
          });

          return res.json({ ip: ip });
        }

        // Método alternativo con ifconfig
        exec("ifconfig wlan0 | grep 'inet ' | awk '{print $2}'", (ifError, ifStdout, ifStderr) => {
          if (!ifError && ifStdout.trim()) {
            const ip = ifStdout.trim();
            console.log('IP obtenida con ifconfig:', ip);

            // Crear un archivo local
            fs.writeFile(path.join(__dirname, 'local_ip.txt'), ip, err => {
              if (err) {
                console.error('Error al guardar IP en archivo:', err);
              }
            });

            return res.json({ ip: ip });
          }

          // Si todo falla, intentar con nmcli
          exec(
            "nmcli -t -f IP4.ADDRESS device show wlan0 | grep -o '[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+'",
            (nmError, nmStdout, nmStderr) => {
              if (!nmError && nmStdout.trim()) {
                const ip = nmStdout.trim();
                console.log('IP obtenida con nmcli:', ip);

                // Crear un archivo local
                fs.writeFile(path.join(__dirname, 'local_ip.txt'), ip, err => {
                  if (err) {
                    console.error('Error al guardar IP en archivo:', err);
                  }
                });

                return res.json({ ip: ip });
              }

              // Si todo falla, devolver error
              console.error('No se pudo obtener la IP local:', error || ipError || ifError || nmError);
              res.status(500).json({ error: 'No se pudo determinar la dirección IP' });
            }
          );
        });
      }
    );
  });
});

// Endpoint de salud para comprobar la conexión
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Sistema funcionando correctamente' });
});

// Endpoint para validar tickets
app.post('/api/station/validate', (req, res) => {
  const { stationId, soldTicketId } = req.body;

  console.log(`Validando ticket: ${soldTicketId} en estación ${stationId}`);

  // Simulamos una validación exitosa
  // En un entorno real, aquí habría una verificación con una base de datos
  const isValid = true;

  if (isValid) {
    res.json({
      success: true,
      message: 'Ticket validado correctamente',
      ticket: {
        id: soldTicketId,
        title: 'Entrada General',
        status: 'USED'
      },
      station: {
        id: stationId || 'station-1',
        name: 'Estación Validadora'
      },
      isUnlimitedAccess: false
    });
  } else {
    res.json({
      success: false,
      message: 'Ticket inválido o ya utilizado',
      ticket: {
        id: soldTicketId,
        status: 'INVALID'
      }
    });
  }
});

// Endpoint para simular la validación de tickets con la nueva API
app.post('/api/validate-ticket', (req, res) => {
  const { apiKey, checkoutId, ticketId } = req.body;
  const ticketToValidate = checkoutId || ticketId;

  console.log(`Validando ticket: ${ticketToValidate} con apiKey: ${apiKey}`);

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key no proporcionada'
    });
  }

  if (!ticketToValidate) {
    return res.status(400).json({
      success: false,
      message: 'Debe proporcionar checkoutId o ticketId'
    });
  }

  // Simulamos una validación exitosa
  // En un entorno real, aquí habría una verificación con una base de datos
  const isValid = true;

  if (isValid) {
    res.json({
      success: true,
      message: 'Ticket validado correctamente',
      ticket: {
        id: ticketToValidate,
        title: 'Entrada General',
        status: 'USED'
      },
      station: {
        id: 'cm9byaai9005qux537owojxkv',
        name: 'Estación Validadora'
      },
      isUnlimitedAccess: false
    });
  } else {
    res.json({
      success: false,
      message: 'Ticket inválido o ya utilizado',
      ticket: {
        id: ticketToValidate,
        status: 'INVALID'
      }
    });
  }
});

// Endpoint para ejecutar comandos específicos y seguros
app.post('/api/command', (req, res) => {
  const { command } = req.body;

  // Lista de comandos permitidos por seguridad
  const allowedCommands = {
    get_ip: 'ip -4 addr show | grep -oP "(?<=inet\\s)\\d+(\.\\d+){3}" | grep -v "127.0.0.1" | head -n 1',
    hostname: 'hostname',
    uptime: 'uptime -p',
    memory: 'free -h | grep Mem',
    disk: 'df -h | grep /dev/root',
  };

  if (!allowedCommands[command]) {
    return res.status(403).json({ error: 'Comando no permitido' });
  }

  exec(allowedCommands[command], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ output: stdout.trim() });
  });
});

// Endpoint para obtener redes WiFi disponibles
app.get('/api/wifi/networks', (req, res) => {
  // Primero forzamos un rescan para obtener la lista más actualizada
  exec('sudo nmcli device wifi rescan || true', () => {
    // Usamos un comando más completo para obtener todas las redes
    exec('sudo nmcli --colors=no --fields SSID device wifi list', (error, stdout, stderr) => {
      if (error) {
        console.error('Error al escanear redes WiFi:', error);
        return res.status(500).json({ error: error.message });
      }

      // Procesamiento mejorado para extraer SSIDs
      let networks = [];
      const lines = stdout.split('\n');

      // Saltamos la primera línea que es el encabezado
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          // Extraemos el SSID (que puede contener espacios)
          const ssid = line.trim();
          if (ssid && ssid !== '--') {
            networks.push(ssid);
          }
        }
      }

      // Si el método anterior no funcionó bien, intentamos otro enfoque
      if (networks.length === 0) {
        console.log('Probando método alternativo para escanear redes');
        // Método alternativo más simple
        exec(
          "sudo nmcli -t -f SSID device wifi list | grep -v '^--$' | sort | uniq",
          (altError, altStdout, altStderr) => {
            if (!altError && altStdout) {
              networks = altStdout
                .split('\n')
                .map(network => network.trim())
                .filter(network => network.length > 0 && network !== '--');
            }

            // Eliminar duplicados y ordenar alfabéticamente
            const uniqueNetworks = [...new Set(networks)].sort();
            console.log('Redes WiFi encontradas (únicas):', uniqueNetworks);
            res.json({ networks: uniqueNetworks });
          }
        );
      } else {
        // Eliminar duplicados y ordenar alfabéticamente
        const uniqueNetworks = [...new Set(networks)].sort();
        console.log('Redes WiFi encontradas (únicas):', uniqueNetworks);
        res.json({ networks: uniqueNetworks });
      }
    });
  });
});

// Endpoint para obtener la configuración WiFi actual
app.get('/api/wifi/current', (req, res) => {
  // Usamos comandos más robustos para detectar la red actual
  exec('nmcli -t -f NAME,DEVICE,TYPE connection show --active | grep wifi | head -n 1', (error, stdout, stderr) => {
    if (error || !stdout.trim()) {
      console.log('Método principal para obtener WiFi actual falló, probando alternativa');

      // Método alternativo: obtener directamente de la interfaz wlan0
      exec("sudo nmcli -t -f active,ssid dev wifi | grep '^yes' | cut -d: -f2", (altError, altStdout, altStderr) => {
        if (!altError && altStdout.trim()) {
          const ssid = altStdout.trim();
          console.log('WiFi actual (método alternativo):', ssid);
          return res.json({ ssid: ssid });
        }

        // Tercer método con iw
        exec("sudo iw wlan0 info | grep 'ssid' | awk '{print $2}'", (iwError, iwStdout, iwStderr) => {
          if (!iwError && iwStdout.trim()) {
            const ssid = iwStdout.trim();
            console.log('WiFi actual (método iw):', ssid);
            return res.json({ ssid: ssid });
          }

          console.error('No se pudo determinar la red WiFi actual');
          res.json({ ssid: 'No configurado' });
        });
      });
    } else {
      // Extraer el nombre de la conexión activa
      const connectionName = stdout.trim().split(':')[0];
      console.log('WiFi actual:', connectionName);
      res.json({ ssid: connectionName });
    }
  });
});

// Endpoint para cambiar la configuración WiFi
app.post('/api/wifi/configure', (req, res) => {
  const { ssid, password } = req.body;

  if (!ssid || !password) {
    return res.status(400).json({ error: 'Se requiere SSID y contraseña' });
  }

  console.log(`Configurando red WiFi: SSID="${ssid}" (contraseña oculta por seguridad)`);

  // Rescanear redes para asegurarnos de que la red esté visible
  exec('nmcli device wifi rescan', scanError => {
    if (scanError) {
      console.error('Error al escanear redes WiFi:', scanError);
      // Continuamos de todas formas, porque a veces falla pero la red existe
    }

    // Comprobar si la red ya está configurada
    exec(`nmcli -t connection show | grep "${ssid}"`, (checkError, checkOutput) => {
      if (!checkError && checkOutput.trim()) {
        // Red ya configurada, eliminarla primero
        const connectionName = checkOutput.trim().split(':')[0];
        console.log(`Eliminando configuración existente para "${connectionName}"`);

        exec(`sudo nmcli connection delete "${connectionName}"`, deleteError => {
          if (deleteError) {
            console.error('Error al eliminar configuración WiFi:', deleteError);
            // Continuamos de todas formas
          }
          connectToWifi();
        });
      } else {
        // Red no configurada, conectar directamente
        connectToWifi();
      }
    });
  });

  // Función para conectar a la red WiFi
  function connectToWifi() {
    console.log(`Intentando conectar a "${ssid}"...`);

    // Intentar conectar directamente a la red WiFi
    exec(`sudo nmcli device wifi connect "${ssid}" password "${password}"`, (connectError, connectOutput) => {
      if (connectError) {
        console.error('Error al conectar a la red WiFi:', connectError);

        // Intentar una alternativa: crear la conexión manualmente
        exec(
          `sudo nmcli connection add type wifi con-name "${ssid}" ifname wlan0 ssid "${ssid}" && sudo nmcli connection modify "${ssid}" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "${password}" && sudo nmcli connection up "${ssid}"`,
          (altError, altOutput) => {
            if (altError) {
              console.error('Error al configurar conexión WiFi alternativa:', altError);
              return res.status(500).json({ error: 'No se pudo conectar a la red WiFi' });
            }

            console.log('Conexión WiFi configurada exitosamente (método alternativo)');
            res.json({ success: true, message: 'Configuración WiFi actualizada. Conectando...' });
          }
        );
      } else {
        console.log('Conexión WiFi configurada exitosamente');
        res.json({ success: true, message: 'Configuración WiFi actualizada. Conectando...' });
      }
    });
  }
});

// Endpoint para verificar la conectividad después de cambiar la configuración WiFi
app.get('/api/wifi/status', (req, res) => {
  exec('ping -c 1 8.8.8.8', (error, stdout, stderr) => {
    const connected = !error && stdout.includes('1 packets transmitted, 1 received');
    res.json({ connected });
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en http://0.0.0.0:${port}`);
  console.log(`API configurada en: ${API_BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 5)}`);
});
