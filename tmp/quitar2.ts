import { markInvoiceAsPaid } from '@/lib/features/imobzi/invoices';
import fs from 'fs';

const pend = JSON.parse(fs.readFileSync('tmp/pend.json', 'utf8'));
const APROVADOS: Record<string, string> = {
  'f81b6d42803c11f182b842004e494300': '2026-07-29', // Uniaudio - repasse Santa Maria
  '1fcceeaa747711f1a08842004e494300': '2026-07-10', // Usina - recebido em outra conta (sem tracking)
};

async function main() {
  for (const [id, paidAt] of Object.entries(APROVADOS)) {
    const inv = pend.find((p: any) => p.id === id);
    if (!inv) { console.log(`SKIP\t${id}`); continue; }
    const r = await markInvoiceAsPaid(id, paidAt, inv);
    console.log(`${r.success ? 'OK  ' : 'FALHA'}\t${paidAt}\tR$ ${inv.value}\t${inv.tenantName}\t${r.message ?? ''}`);
  }
}
main();
