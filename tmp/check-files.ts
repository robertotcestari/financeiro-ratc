import { prisma } from '../lib/core/database/client';
async function main() {
  const rows: any[] = await prisma.$queryRawUnsafe(
    "SELECT * FROM saved_files WHERE fileName LIKE '%2026_07%' ORDER BY savedAt DESC"
  );
  console.log('=== Arquivos de 2026-07 ===');
  for (const r of rows) console.log(JSON.stringify(r));
  if (!rows.length) console.log('(nenhum)');
  const recent: any[] = await prisma.$queryRawUnsafe(
    "SELECT fileName, type, savedAt FROM saved_files ORDER BY savedAt DESC LIMIT 6"
  );
  console.log('=== Mais recentes (por savedAt) ===');
  for (const r of recent) console.log(`${r.savedAt}\t${r.type}\t${r.fileName}`);
}
main().catch(e => console.log('ERRO: ' + String(e.message).split('\n').slice(0,4).join(' '))).finally(() => prisma.$disconnect());
