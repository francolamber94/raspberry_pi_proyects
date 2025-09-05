#!/bin/bash

# Obtener específicamente la IP de la interfaz wlan0
ip=$(ip -4 addr show wlan0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n 1)

# Si no encuentra IP en wlan0, intentar con eth0
if [ -z "$ip" ]; then
  ip=$(ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n 1)
fi

# Si aún no encuentra, buscar en cualquier interfaz excepto lo
if [ -z "$ip" ]; then
  ip=$(ip -4 addr show | grep -v "127.0.0.1" | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n 1)
fi

# Guardar la IP directamente en la carpeta donde está el HTML
# esto es importante para que el navegador pueda accederlo
echo $ip > /home/francolamber/station-validator/local_ip.txt
chmod 644 /home/francolamber/station-validator/local_ip.txt
