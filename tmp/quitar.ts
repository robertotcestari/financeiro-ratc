import { markInvoiceAsPaid } from '@/lib/features/imobzi/invoices';
import fs from 'fs';

const pend = JSON.parse(fs.readFileSync('tmp/pend.json', 'utf8'));
const APROVADOS: Record<string, string> = {
  '2bfa5c1c747711f1920442004e494300': '2026-07-06', // Herbicat
  'f7331bf6786111f19ba142004e494300': '2026-07-08', // Pro Imoveis - Monte Aprazivel
  'b74559687c4f11f19bfd42004e494300': '2026-07-29', // Nadruz
  'b2756b767c4f11f18d4942004e494300': '2026-07-08', // Loren
  'ba4a524e7c4f11f1adf442004e494300': '2026-07-24', // Pro Imoveis - Fortaleza 504
  'ee54adf4842a11f1b0a142004e494300': '2026-07-30', // Pro Imoveis - Elisiario 30
  '2e5118a2747711f1834542004e494300': '2026-07-20', // Casa Verde
  '9de967367eaa11f1b75542004e494300': '2026-07-14', // Thais Helena
};

async function main() {
  for (const [id, paidAt] of Object.entries(APROVADOS)) {
    const inv = pend.find((p: any) => p.id === id);
    if (!inv) { console.log(`SKIP\t${id}\tnao encontrado no pend.json`); continue; }
    const r = await markInvoiceAsPaid(id, paidAt, inv);
    console.log(`${r.success ? 'OK  ' : 'FALHA'}\t${paidAt}\tR$ ${inv.value}\t${inv.tenantName}\t${r.message ?? ''}`);
  }
}
main();
