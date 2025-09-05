/**
 * Utilidad para encriptar y desencriptar IDs de tickets
 * Replica la funcionalidad de VentApp para generar códigos QR consistentes
 */

/**
 * Tabla de sustitución para caracteres
 * Caracteres seguros para URL que usamos para reemplazar
 */
const CHAR_SUBS = {
  a: 'z', b: 'y', c: 'x', d: 'w', e: 'v', f: 'u', g: 't', h: 's',
  i: 'r', j: 'q', k: 'p', l: 'o', m: 'n', n: 'm', o: 'l', p: 'k',
  q: 'j', r: 'i', s: 'h', t: 'g', u: 'f', v: 'e', w: 'd', x: 'c',
  y: 'b', z: 'a', '0': '9', '1': '8', '2': '7', '3': '6', '4': '5',
  '5': '4', '6': '3', '7': '2', '8': '1', '9': '0', '-': '_', '_': '-'
};

// Invertir para desencriptar
const CHAR_SUBS_REV = {};
for (const key in CHAR_SUBS) {
  CHAR_SUBS_REV[CHAR_SUBS[key]] = key;
}

/**
 * Codifica un ID simple sustituyendo caracteres
 */
function encodeId(payload) {
  // Eliminar guiones del UUID para hacer más corto
  const formatted = payload.replace(/-/g, '');

  // Sustituir cada carácter por su contraparte
  let result = '';
  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i].toLowerCase();
    result += CHAR_SUBS[char] || char;
  }

  return result;
}

/**
 * Decodificación de ID
 */
function decodeId(encoded) {
  let result = '';

  // Sustituir cada carácter por su original
  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    result += CHAR_SUBS_REV[char] || char;
  }

  // Si el resultado tiene 32 caracteres y es un UUID, reformatearlo
  if (result.length === 32 && /^[0-9a-f]+$/.test(result)) {
    return result.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
  }

  return result;
}

/**
 * Función para encriptar un ID con un tipo (i o b)
 * @param {string} type - Tipo de ticket (i = individual, b = bundle)
 * @param {string} id - ID del ticket
 * @returns {string} String encriptado para usar en QR
 */
function encryptTicketId(type, id) {
  try {
    return `${type}${encodeId(id)}`;
  } catch (error) {
    console.error('Error encriptando ID de ticket:', error);
    // En caso de error, devolver formato válido para el scanner
    return `${type}:${id}`;
  }
}

/**
 * Función para desencriptar un código de QR
 * @param {string} encryptedCode - Código encriptado del QR
 * @returns {Object|null} Objeto con tipo e ID si es válido, null si no lo es
 */
function decryptTicketCode(encryptedCode) {
  try {
    // Compatibilidad con formato original de URL completa
    const urlRegex = new RegExp('^https?://[^/]+/([ib])/([^/]+)/?$');
    const urlMatch = encryptedCode.match(urlRegex);
    if (urlMatch) {
      return {
        type: urlMatch[1],
        id: urlMatch[2],
      };
    }

    // Verificar si es un UUID sin encriptar (wallet vieja)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(encryptedCode)) {
      return null;
    }

    // Formato nuevo simple: primer carácter es el tipo, el resto es el ID codificado
    const type = encryptedCode.charAt(0);

    if (type !== 'i' && type !== 'b') return null;

    const encodedId = encryptedCode.substring(1);
    const id = decodeId(encodedId);

    return { type, id };
  } catch (error) {
    console.error('Error desencriptando código de ticket:', error);
    return null;
  }
}

module.exports = {
  encryptTicketId,
  decryptTicketCode
};
