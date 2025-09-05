#!/bin/bash
cd /home/francolamber/printer-client
node server.js > server.log 2>&1 &
echo $! > server.pid
echo "Servidor web iniciado en puerto 3001"
echo "Acceda a http://$(hostname -I | awk '{print $1}'):3001 para configurar"
