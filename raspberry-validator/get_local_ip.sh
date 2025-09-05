#!/bin/bash

# Script para obtener la IP local del dispositivo y guardarla en un archivo

# Obtener específicamente la IP de la interfaz wlan0
ip=$(ip -4 addr show wlan0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n 1)

# Si no encuentra IP en wlan0, intentar con eth0
if [ -z "$ip" ]; then
  ip=$(ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n 1)
fi

# Si aún no encuentra, buscar en cualquier interfaz excepto lo
if [ -z "$ip" ]; then
  ip=$(ip -4 addr show | grep -v "127.0.0.1" | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n 1)
fi

# Ruta al archivo de salida
OUTPUT_FILE="/home/$(whoami)/station-validator/local_ip.txt"

# Guardar la IP
echo $ip > $OUTPUT_FILE
chmod 644 $OUTPUT_FILE

# Mostrar la IP que se guardó (para logs)
echo "IP guardada en $OUTPUT_FILE: $ip" 