import sys
from escpos.printer import Usb

def print_qr(url):
    try:
        # Configurar la impresora USB (usando los valores que vimos en lsusb)
        # Vendor ID: 0x0fe6, Product ID: 0x811e
        p = Usb(0x0fe6, 0x811e)
        
        # Configurar para papel de 58mm
        p.set(align="center")
        
        # Imprimir texto de encabezado
        p.text("QR Code\n")
        p.text("-" * 32 + "\n")
        
        # Generar e imprimir QR code
        # size=8 es un buen tamaño para papel de 58mm
        p.qr(url, size=8)
        
        # Agregar texto con la URL
        p.text("\n")
        p.text(url + "\n")
        p.text("-" * 32 + "\n")
        
        # Alimentar papel
        p.text("\n\n")
        
        # Cortar papel (si la impresora lo soporta)
        try:
            p.cut()
        except:
            pass  # Si no soporta corte, continúa
            
        p.close()
        print("QR code printed successfully!")
        
    except Exception as e:
        print(f"Error printing QR code: {e}")
        print("Make sure the printer is connected and powered on.")
        return False
    
    return True

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 print_qr.py <URL>")
        sys.exit(1)
    
    url = sys.argv[1]
    print(f"Printing QR code for: {url}")
    print_qr(url)
