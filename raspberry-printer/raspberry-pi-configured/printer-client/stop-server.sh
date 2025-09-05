#!/bin/bash
cd /home/francolamber/printer-client
if [ -f server.pid ]; then
    kill $(cat server.pid) 2>/dev/null
    rm server.pid
    echo "Servidor web detenido"
else
    echo "El servidor no estaba ejecutándose"
fi
