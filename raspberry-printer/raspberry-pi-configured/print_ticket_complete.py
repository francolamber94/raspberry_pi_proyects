#!/usr/bin/env python3
import sys
import json
import os
from escpos.printer import Usb

# Añadir el directorio padre al path para importar ticket_encryption
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ticket_encryption import encrypt_ticket_id

def print_ticket_complete(ticket_data_json):
    """
    Imprime un ticket con el formato EXACTO del TicketQRTemplate local
    Replicando el diseño HTML en impresión térmica
    """
    try:
        # Configurar la impresora USB
        p = Usb(0x0fe6, 0x811e)
        
        # Parsear datos del ticket
        ticket_data = json.loads(ticket_data_json)
        
        # Formatear fecha como en el template local
        def format_date_time(date_str):
            if not date_str:
                return ''
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                return dt.strftime('%d/%m/%Y %H:%M')
            except:
                return date_str
        
        # Función para centrar texto manualmente (escpos no siempre funciona bien)
        def center_text(text, width=32):
            text = str(text)
            if len(text) >= width:
                return text
            padding = (width - len(text)) // 2
            return ' ' * padding + text
        
        # === CONFIGURACIÓN INICIAL ===
        p.set(align="center")
        
        # === TÍTULO DEL EVENTO (centrado, bold) ===
        if ticket_data.get('eventName'):
            p.set(bold=True)
            p.text(center_text(ticket_data['eventName']) + "\n")
            p.set(bold=False)
        
        # === UBICACIÓN (centrada) ===
        if ticket_data.get('location'):
            p.text(center_text(ticket_data['location']) + "\n")
        
        # === SEGUNDA LÍNEA DE UBICACIÓN ===
        if ticket_data.get('locationDetails'):
            p.text(center_text(ticket_data['locationDetails']) + "\n")
        
        # === FECHA Y HORA (centrada y bold) ===
        if ticket_data.get('dateTime'):
            formatted_date = format_date_time(ticket_data['dateTime'])
            if formatted_date:
                p.set(bold=True)
                p.text(center_text(formatted_date) + "\n")
                p.set(bold=False)
        
        # === BADGE DE BUNDLE (con asteriscos más visibles) ===
        if ticket_data.get('isBundle'):
            # Asegurar texto normal para las líneas
            p.set(bold=False)
            p.text(center_text("*" * 32) + "\n")
            p.set(bold=True)
            p.text(center_text("*** TICKET MULTIPLE ***") + "\n")
            p.set(bold=False)
            p.text(center_text("*" * 32) + "\n")
        
        # === CÓDIGO QR (centrado y más grande) ===
        # Espacio antes del QR (igual que en template HTML)
        p.text("\n")
        # Usar encriptación para el código QR
        # Mapear tipos correctamente: checkout -> b, ticket/individual -> i
        raw_type = ticket_data.get('type', 'individual')
        if raw_type == 'checkout':
            ticket_type = 'b'
        elif raw_type in ['individual', 'ticket']:
            ticket_type = 'i'
        else:
            ticket_type = raw_type[0]  # fallback
        qr_code = encrypt_ticket_id(ticket_type, ticket_data['id'])
        # Asegurar centrado antes del QR
        p.set(align="center")
        # Aumentar tamaño del QR para mejor visibilidad (size=10 en lugar de 8)
        p.qr(qr_code, size=10)
        # Espacio después del QR
        p.text("\n")
        
        # === INFORMACIÓN DE ASIENTOS (centrada, igual que template) ===
        if ticket_data.get('selectedSeats') and len(ticket_data['selectedSeats']) > 0:
            p.text(center_text("Detalles de asientos:") + "\n")
            
            # Agrupar asientos por sector (igual que template)
            seats_by_sector = {}
            for seat in ticket_data['selectedSeats']:
                sector = seat.get('sectorName', 'General')
                if sector not in seats_by_sector:
                    seats_by_sector[sector] = []
                seats_by_sector[sector].append(seat)
            
            for sector_name, seats in seats_by_sector.items():
                p.set(bold=True)
                p.text(center_text(sector_name) + "\n")
                p.set(bold=False)
                # Formatear asientos en una línea como chips
                seat_chips = []
                for seat in seats:
                    chip_text = ""
                    if seat.get('row'):
                        chip_text += f"F {seat['row']}"
                    if seat.get('seatNumber'):
                        chip_text += f" - A {seat['seatNumber']}"
                    if chip_text:
                        seat_chips.append(chip_text.strip())
                
                if seat_chips:
                    seats_line = " | ".join(seat_chips)
                    p.text(center_text(seats_line) + "\n")
        
        # === NOMBRE DE USUARIO (centrado y bold) ===
        if ticket_data.get('fullName'):
            p.set(bold=True)
            p.text(center_text(ticket_data['fullName']) + "\n")
            p.set(bold=False)
        
        # === PIE DE PÁGINA (border-top con asteriscos visibles) ===
        p.set(bold=False)
        p.text(center_text("*" * 32) + "\n")
        p.text(center_text("Escanee este codigo en el evento") + "\n")
        p.text(center_text(f"ID: {ticket_data['id']}") + "\n")
        
        # Fecha de impresión
        from datetime import datetime
        today = datetime.now().strftime("%d/%m/%Y")
        p.text(center_text(today) + "\n")
        
        # CORTAR INMEDIATAMENTE - sin espacios extra para ahorrar papel
        try:
            p.cut()
        except:
            pass  # Si no soporta corte, continúa
            
        p.close()
        print("Ticket completo impreso exitosamente!")
        return True
        
    except Exception as e:
        print(f"Error imprimiendo ticket completo: {e}")
        print("Make sure the printer is connected and powered on.")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 print_ticket_complete.py '<JSON_DATA>'")
        print("Example JSON: '{\"id\":\"123\",\"eventName\":\"Mi Evento\",\"location\":\"Teatro\",\"fullName\":\"Juan Perez\",\"type\":\"ticket\"}'")
        sys.exit(1)
    
    ticket_data_json = sys.argv[1]
    print(f"Imprimiendo ticket completo...")
    print_ticket_complete(ticket_data_json)
