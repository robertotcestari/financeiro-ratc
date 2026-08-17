import { prisma } from '../lib/core/database/client';
async function main() {
  const id = 'cmsucno4w0001h2ws5as2s8lu';
  const before: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM saved_files WHERE id = '${id}'`);
  console.log('ANTES: ' + JSON.stringify(before));
  if (!before.length) { console.log('Registro nao encontrado — nada a apagar.'); return; }
  await prisma.savedFile.delete({ where: { id } });
  const after: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM saved_files WHERE id = '${id}'`);
  console.log('APOS: ' + (after.length ? JSON.stringify(after) : 'registro removido'));
  const rest: any[] = await prisma.$queryRawUnsafe(
    "SELECT fileName, type, savedAt FROM saved_files WHERE fileName LIKE '%2026_07%' ORDER BY savedAt DESC"
  );
  console.log('=== Restantes de 2026-07 ===');
  if (!rest.length) console.log('(nenhum)');
  for (const r of rest) console.log(`${r.savedAt}\t${r.type}\t${r.fileName}`);
}
main().catch(e => console.log('ERRO: ' + String(e.message).split('\n').slice(0,4).join(' '))).finally(() => prisma.$disconnect());
