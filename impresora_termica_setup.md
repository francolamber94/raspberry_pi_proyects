# Configuración Impresora Térmica Gadnic IT1050 en Raspberry Pi

## Especificaciones de la Impresora

- **Marca**: Gadnic
- **Modelo**: IT1050
- **Ancho de papel**: 58mm
- **Velocidad**: 90 mm/s
- **Interfaz**: USB (micro-USB)
- **Tipo**: Impresora térmica POS

## Identificación del Dispositivo

La impresora se identifica como:

- **Vendor ID**: 0x0fe6 (ICS Advent)
- **Product ID**: 0x811e
- **Producto**: POS58 Printer
- **Fabricante**: YICHIP

## Instalación de Dependencias

### 1. Actualizar el sistema

```bash
sudo apt update
```

### 2. Instalar paquetes base

```bash
sudo apt install -y cups cups-client qrencode imagemagick printer-driver-escpr python3-pip python3-usb
```

### 3. Instalar python-escpos (versión específica)

```bash
# Desinstalar versión problemática si existe
pip3 uninstall python-escpos -y --break-system-packages

# Instalar versión compatible
pip3 install python-escpos==3.0a9 --break-system-packages
```

## Configuración de Permisos USB

### 1. Agregar usuario al grupo lp

```bash
sudo usermod -a -G lp $USER
```

### 2. Crear regla udev para la impresora

```bash
echo 'SUBSYSTEM=="usb", ATTRS{idVendor}=="0fe6", ATTRS{idProduct}=="811e", MODE="0666"' | sudo tee /etc/udev/rules.d/99-pos-printer.rules
```

### 3. Recargar reglas udev

```bash
sudo udevadm control --reload-rules
```

## Script de Impresión QR

Crear el archivo `print_qr.py`:

```python
import sys
from escpos.printer import Usb

def print_qr(url):
    try:
        # Configurar la impresora USB (usando los valores que vimos en lsusb)
        # Vendor ID: 0x0fe6, Product ID: 0x811e
        p = Usb(0x0fe6, 0x811e)

        # Configurar para papel de 58mm
        p.set(align='center')

        # Imprimir texto de encabezado
        p.text('QR Code\n')
        p.text('-' * 32 + '\n')

        # Generar e imprimir QR code
        # size=8 es un buen tamaño para papel de 58mm
        p.qr(url, size=8)

        # Agregar texto con la URL
        p.text('\n')
        p.text(url + '\n')
        p.text('-' * 32 + '\n')

        # Alimentar papel
        p.text('\n\n')

        # Cortar papel (si la impresora lo soporta)
        try:
            p.cut()
        except:
            pass  # Si no soporta corte, continúa

        p.close()
        print('QR code printed successfully!')

    except Exception as e:
        print(f'Error printing QR code: {e}')
        print('Make sure the printer is connected and powered on.')
        return False

    return True

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: python3 print_qr.py <URL>')
        sys.exit(1)

    url = sys.argv[1]
    print(f'Printing QR code for: {url}')
    print_qr(url)
```

## Uso del Script

### 1. Hacer el script ejecutable

```bash
chmod +x print_qr.py
```

### 2. Imprimir un QR code

```bash
python3 print_qr.py www.google.com
```

## Verificación del Sistema

### Verificar que la impresora esté conectada

```bash
lsusb | grep -i "0fe6:811e"
```

### Verificar mensajes del sistema

```bash
dmesg | grep -i usb | tail -5
```

## Troubleshooting

### Problema: "Permission denied"

- Verificar que el usuario esté en el grupo `lp`
- Verificar que las reglas udev estén aplicadas
- Desconectar y reconectar la impresora

### Problema: "Device not found"

- Verificar que la impresora esté encendida
- Verificar conexión USB
- Verificar que los IDs de vendor/product sean correctos

### Problema: ImportError con python-escpos

- Usar la versión específica 3.0a9
- Reinstalar con: `pip3 install python-escpos==3.0a9 --break-system-packages`

## Comandos Útiles

### Imprimir QR simple

```bash
python3 print_qr.py "https://www.ejemplo.com"
```

### Verificar estado de la impresora

```bash
lsusb -v | grep -A10 -B5 "POS58"
```

### Reiniciar servicios si es necesario

```bash
sudo systemctl restart cups
```

## Notas Importantes

1. La impresora debe estar encendida antes de ejecutar el script
2. El papel debe ser térmico de 58mm de ancho
3. El tamaño del QR (size=8) está optimizado para papel de 58mm
4. El script incluye manejo de errores básico
5. La advertencia sobre `media.width.pixel` es normal y no afecta la funcionalidad

## Personalización del Script

Para modificar el formato de impresión, puedes ajustar:

- `size=8`: Tamaño del código QR (1-40)
- `align='center'`: Alineación (left, center, right)
- Texto de encabezado y pie
- Cantidad de líneas en blanco para separación

## Ejemplo de Uso Completo

```bash
# Conectarse a la Raspberry Pi
ssh usuario@192.168.x.x

# Verificar que la impresora esté conectada
lsusb | grep "0fe6:811e"

# Imprimir QR code
python3 print_qr.py "www.google.com"
```

¡La configuración está completa y lista para usar!
