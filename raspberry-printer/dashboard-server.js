const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const app = express();
const port = 3000; // Puerto principal del dashboard

// Rutas de archivos de configuración
const CONFIG_DIR = '/home/francolamber/printer-client';
const CONFIG_FILE = `${CONFIG_DIR}/config.json`;
const CREDENTIALS_FILE = `${CONFIG_DIR}/credentials.json`;

// Función para leer la configuración
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(configData);
    }
    return { 
      api: { baseUrl: 'https://ventapp.com.ar/api' },
      printer: { name: 'Printer-1' }
    };
  } catch (error) {
    console.error('Error al leer la configuración:', error);
    return { 
      api: { baseUrl: 'https://ventapp.com.ar/api' },
      printer: { name: 'Printer-1' }
    };
  }
}

// Función para leer las credenciales
function readCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const credsData = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      return JSON.parse(credsData);
    }
    return { apiKey: 'not-configured', name: 'No configurado' };
  } catch (error) {
    console.error('Error al leer las credenciales:', error);
    return { apiKey: 'not-configured', name: 'No configurado' };
  }
}

// Habilitar CORS para todas las rutas
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Servir el dashboard como página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Endpoint para obtener la IP local
app.get('/api/ip', (req, res) => {
  exec("hostname -I | awk '{print $1}'", (error, stdout, stderr) => {
    if (!error && stdout.trim()) {
      const ip = stdout.trim();
      return res.json({ ip: ip });
    }

    // Método alternativo
    exec('ip -4 addr show | grep -oP "(?<=inet\\s)\\d+(\.\\d+){3}" | grep -v "127.0.0.1" | head -n 1',
      (ipError, ipStdout, ipStderr) => {
        if (!ipError && ipStdout.trim()) {
          return res.json({ ip: ipStdout.trim() });
        }
        res.status(500).json({ error: 'No se pudo determinar la dirección IP' });
      }
    );
  });
});

// Endpoint para obtener la configuración actual
app.get('/api/config', (req, res) => {
  const config = readConfig();
  const credentials = readCredentials();
  
  res.json({
    deviceName: credentials.name || config.printer?.name || 'No configurado',
    status: credentials.apiKey !== 'not-configured' ? 'CONFIGURED' : 'NOT_CONFIGURED',
    serverUrl: config.api?.baseUrl || 'https://ventapp.com.ar/api',
    apiKey: credentials.apiKey.substring(0, 8) + '...'
  });
});

// Endpoint para obtener redes WiFi disponibles
app.get('/api/wifi/networks', (req, res) => {
  exec('sudo nmcli device wifi rescan || true', () => {
    exec('sudo nmcli --colors=no --fields SSID device wifi list', (error, stdout, stderr) => {
      if (error) {
        console.error('Error al escanear redes WiFi:', error);
        return res.status(500).json({ error: error.message });
      }

      let networks = [];
      const lines = stdout.split('\n');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && line !== '--') {
          networks.push(line);
        }
      }

      const uniqueNetworks = [...new Set(networks)].sort();
      res.json({ networks: uniqueNetworks });
    });
  });
});

// Endpoint para obtener la configuración WiFi actual
app.get('/api/wifi/current', (req, res) => {
  exec('nmcli -t -f NAME,DEVICE,TYPE connection show --active | grep wifi | head -n 1', (error, stdout, stderr) => {
    if (error || !stdout.trim()) {
      exec("sudo nmcli -t -f active,ssid dev wifi | grep '^yes' | cut -d: -f2", (altError, altStdout, altStderr) => {
        if (!altError && altStdout.trim()) {
          return res.json({ ssid: altStdout.trim() });
        }
        res.json({ ssid: 'No configurado' });
      });
    } else {
      const connectionName = stdout.trim().split(':')[0];
      res.json({ ssid: connectionName });
    }
  });
});

// Endpoint para verificar conectividad a internet
app.get('/api/wifi/status', (req, res) => {
  exec('ping -c 1 8.8.8.8', (error, stdout, stderr) => {
    const connected = !error && stdout.includes('1 packets transmitted, 1 received');
    res.json({ connected });
  });
});

// Endpoint para configurar WiFi
app.post('/api/wifi/configure', (req, res) => {
  const { ssid, password } = req.body;

  if (!ssid || !password) {
    return res.status(400).json({ error: 'Se requiere SSID y contraseña' });
  }

  console.log(`Configurando red WiFi: SSID="${ssid}"`);

  // Conectar a la red WiFi
  exec(`sudo nmcli device wifi connect "${ssid}" password "${password}"`, (connectError, connectOutput) => {
    if (connectError) {
      console.error('Error al conectar a la red WiFi:', connectError);
      return res.status(500).json({ error: 'No se pudo conectar a la red WiFi' });
    }

    console.log('Conexión WiFi configurada exitosamente');
    res.json({ success: true, message: 'WiFi configurado correctamente' });
  });
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Dashboard funcionando correctamente' });
});

// Endpoint para obtener trabajos de impresión
app.get('/api/jobs', async (req, res) => {
  try {
    const config = readConfig();
    const credentials = readCredentials();

    if (credentials.apiKey === 'not-configured') {
      return res.json({ 
        success: false,
        jobs: [], 
        stats: { pending: 0, completed: 0, failed: 0 },
        message: 'Dispositivo no configurado' 
      });
    }

    // Consultar trabajos desde el servidor principal
    const jobsUrl = `${config.api.baseUrl}/printer/get-jobs`;
    const response = await axios.post(jobsUrl, {
      apiKey: credentials.apiKey,
      limit: 20
    });

    if (response.data.success) {
      const jobs = response.data.data.jobs || [];
      
      // Calcular estadísticas
      const stats = {
        pending: jobs.filter(j => j.status === 'PENDING').length,
        processing: jobs.filter(j => j.status === 'PROCESSING').length,
        completed: jobs.filter(j => j.status === 'COMPLETED').length,
        failed: jobs.filter(j => j.status === 'FAILED').length
      };

      res.json({ 
        success: true,
        jobs: jobs,
        stats: stats,
        totalPending: response.data.data.totalPending || 0
      });
    } else {
      res.json({ 
        success: false, 
        jobs: [], 
        stats: { pending: 0, completed: 0, failed: 0 },
        error: response.data.message 
      });
    }
  } catch (error) {
    console.error('Error obteniendo trabajos:', error);
    res.json({ 
      success: false, 
      jobs: [], 
      stats: { pending: 0, completed: 0, failed: 0 },
      error: error.message 
    });
  }
});

// Endpoint para reenviar trabajo fallido
app.post('/api/job/retry', async (req, res) => {
  try {
    const { jobId } = req.body;
    const config = readConfig();
    const credentials = readCredentials();

    if (!jobId) {
      return res.status(400).json({ error: 'jobId requerido' });
    }

    // Aquí implementarías la lógica para reenviar el trabajo
    // Por simplicidad, simulamos éxito
    res.json({ success: true, message: 'Trabajo reenviado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para cancelar trabajo
app.post('/api/job/cancel', async (req, res) => {
  try {
    const { jobId } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: 'jobId requerido' });
    }

    // Aquí implementarías la lógica para cancelar el trabajo
    res.json({ success: true, message: 'Trabajo cancelado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para limpiar trabajos completados
app.post('/api/jobs/clear-completed', (req, res) => {
  // Aquí implementarías la lógica para limpiar trabajos completados
  res.json({ success: true, message: 'Trabajos completados limpiados' });
});

// Endpoints del sistema
app.post('/api/system/restart-services', (req, res) => {
  exec('sudo systemctl restart printer-client.service && sudo systemctl restart printer-web-server.service', (error) => {
    if (error) {
      console.error('Error reiniciando servicios:', error);
      return res.status(500).json({ error: 'Error al reiniciar servicios' });
    }
    res.json({ success: true, message: 'Servicios reiniciados' });
  });
});

app.post('/api/system/reboot', (req, res) => {
  res.json({ success: true, message: 'Sistema reiniciando...' });
  // Reiniciar después de enviar respuesta
  setTimeout(() => {
    exec('sudo reboot', (error) => {
      if (error) {
        console.error('Error al reiniciar:', error);
      }
    });
  }, 1000);
});

app.get('/api/system/logs', (req, res) => {
  exec('journalctl -u printer-client.service --no-pager -n 50', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Error obteniendo logs' });
    }
    res.json({ success: true, logs: stdout });
  });
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`🖨️ VentApp Printer Dashboard ejecutándose en puerto ${port}`);
  console.log(`📱 Acceda desde: http://0.0.0.0:${port}`);
  console.log(`⚙️ Configuración avanzada en: http://0.0.0.0:3001`);
  
  // Mostrar IP local al iniciar
  exec("hostname -I | awk '{print $1}'", (error, stdout) => {
    if (!error && stdout.trim()) {
      console.log(`🌐 URL del Dashboard: http://${stdout.trim()}:${port}`);
    }
  });
});
