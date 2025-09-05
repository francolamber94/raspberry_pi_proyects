const { encryptTicketId } = require('./ticketEncryption');

console.log('🧪 Prueba de mapeo completo de tipos:');
console.log('=====================================\n');

// Casos de prueba
const testCases = [
  { type: 'checkout', id: 'bb5f93d3-7489-42fc-a721-be6bdd1780a4', expected: 'b' },
  { type: 'ticket', id: 'cmf391rge0034ky04b7mkrrix', expected: 'i' },
  { type: 'individual', id: 'test-individual-123', expected: 'i' }
];

testCases.forEach((testCase, index) => {
  console.log(`Prueba ${index + 1} - Tipo: ${testCase.type}`);
  
  // Aplicar mapeo como en el código corregido
  let typeTicket = 'i'; // default
  if (testCase.type === 'checkout') {
    typeTicket = 'b';
  } else if (testCase.type === 'individual' || testCase.type === 'ticket') {
    typeTicket = 'i';
  }
  
  const encrypted = encryptTicketId(typeTicket, testCase.id);
  
  console.log(`  Tipo mapeado: ${typeTicket}`);
  console.log(`  QR generado: ${encrypted}`);
  console.log(`  ¿Correcto?: ${encrypted.startsWith(testCase.expected) ? '✅ SÍ' : '❌ NO'}\n`);
});