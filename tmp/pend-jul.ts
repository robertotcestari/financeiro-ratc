import { getImobziPendingInvoices } from '@/lib/features/imobzi/invoices';

async function main() {
  const inv = await getImobziPendingInvoices(7, 2026);
  console.log('===JSON===');
  console.log(JSON.stringify(inv, null, 2));
}
main();
