// Gera CUIDs únicos para os registros
const chars = '0123456789abcdefghijklmnopqrstuvwxyz';

function generateCuid(index) {
  const timestamp = Date.now().toString(36).slice(-4);
  const counter = index.toString(36).padStart(4, '0');
  const random = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `c${timestamp}${counter}${random}`;
}

// Gera 32 CUIDs para os registros
for (let i = 0; i < 32; i++) {
  console.log(generateCuid(i));
}