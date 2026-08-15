import { markInvoiceAsPaid } from '@/lib/features/imobzi/invoices';
import fs from 'fs';
const pend = JSON.parse(fs.readFileSync('tmp/pend.json', 'utf8'));
async function main() {
  const id = '290b9e66779811f1bf2e42004e494300'; // Agricola Moreno de Nipoa - venc 14/07/2026
  const inv = pend.find((p: any) => p.id === id);
  const r = await markInvoiceAsPaid(id, '2026-07-14', inv);
  console.log(`${r.success ? 'OK  ' : 'FALHA'}\t2026-07-14\tR$ ${inv.value}\t${inv.tenantName}\t${r.message ?? ''}`);
}
main();
