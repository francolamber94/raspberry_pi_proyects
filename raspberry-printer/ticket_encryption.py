"""
Utilidad para encriptar y desencriptar IDs de tickets
Replica la funcionalidad de VentApp para generar códigos QR consistentes
"""

import re

# Tabla de sustitución para caracteres
CHAR_SUBS = {
    'a': 'z', 'b': 'y', 'c': 'x', 'd': 'w', 'e': 'v', 'f': 'u', 'g': 't', 'h': 's',
    'i': 'r', 'j': 'q', 'k': 'p', 'l': 'o', 'm': 'n', 'n': 'm', 'o': 'l', 'p': 'k',
    'q': 'j', 'r': 'i', 's': 'h', 't': 'g', 'u': 'f', 'v': 'e', 'w': 'd', 'x': 'c',
    'y': 'b', 'z': 'a', '0': '9', '1': '8', '2': '7', '3': '6', '4': '5',
    '5': '4', '6': '3', '7': '2', '8': '1', '9': '0', '-': '_', '_': '-'
}

# Invertir para desencriptar
CHAR_SUBS_REV = {v: k for k, v in CHAR_SUBS.items()}

def encode_id(payload):
    """
    Codifica un ID simple sustituyendo caracteres
    """
    # Eliminar guiones del UUID para hacer más corto
    formatted = payload.replace('-', '')
    
    # Sustituir cada carácter por su contraparte
    result = ''
    for char in formatted.lower():
        result += CHAR_SUBS.get(char, char)
    
    return result

def decode_id(encoded):
    """
    Decodificación de ID
    """
    result = ''
    
    # Sustituir cada carácter por su original
    for char in encoded:
        result += CHAR_SUBS_REV.get(char, char)
    
    # Si el resultado tiene 32 caracteres y es un UUID, reformatearlo
    if len(result) == 32 and re.match(r'^[0-9a-f]+$', result):
        return f"{result[:8]}-{result[8:12]}-{result[12:16]}-{result[16:20]}-{result[20:]}"
    
    return result

def encrypt_ticket_id(ticket_type, ticket_id):
    """
    Función para encriptar un ID con un tipo (i o b)
    
    Args:
        ticket_type (str): Tipo de ticket (i = individual, b = bundle)
        ticket_id (str): ID del ticket
        
    Returns:
        str: String encriptado para usar en QR
    """
    try:
        return f"{ticket_type}{encode_id(ticket_id)}"
    except Exception as e:
        print(f"Error encriptando ID de ticket: {e}")
        # En caso de error, devolver formato válido para el scanner
        return f"{ticket_type}:{ticket_id}"

def decrypt_ticket_code(encrypted_code):
    """
    Función para desencriptar un código de QR
    
    Args:
        encrypted_code (str): Código encriptado del QR
        
    Returns:
        dict|None: Diccionario con tipo e ID si es válido, None si no lo es
    """
    try:
        # Compatibilidad con formato original de URL completa
        url_match = re.match(r'^https?://[^/]+/([ib])/([^/]+)/?$', encrypted_code)
        if url_match:
            return {
                'type': url_match.group(1),
                'id': url_match.group(2)
            }
        
        # Verificar si es un UUID sin encriptar (wallet vieja)
        if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', encrypted_code, re.IGNORECASE):
            return None
        
        # Formato nuevo simple: primer carácter es el tipo, el resto es el ID codificado
        ticket_type = encrypted_code[0]
        
        if ticket_type not in ['i', 'b']:
            return None
        
        encoded_id = encrypted_code[1:]
        ticket_id = decode_id(encoded_id)
        
        return {'type': ticket_type, 'id': ticket_id}
        
    except Exception as e:
        print(f"Error desencriptando código de ticket: {e}")
        return None
