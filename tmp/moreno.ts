import { getImobziAuthToken } from '@/lib/features/imobzi/auth';

async function fetchInvoices(status: string, start: string, end: string) {
  const token = await getImobziAuthToken();
  const params = new URLSearchParams({
    order_by: 'due_date', sort_by: 'asc', status,
    start_at: start, end_at: end, page: '1', contract_type: 'all',
  });
  const res = await fetch(`https://my.imobzi.com/v1/invoices?${params}`, {
    headers: { accept: 'application/json, text/plain, */*', authorization: token, 'content-type': 'application/json' },
  });
  if (!res.ok) throw new Error(`${status}: ${res.statusText}`);
  const d = await res.json();
  return d.invoices || d || [];
}

async function main() {
  const out: any[] = [];
  for (const status of ['paid', 'pending', 'canceled']) {
    let inv: any[] = [];
    try { inv = await fetchInvoices(status, '2025-01-01', '2026-08-31'); } catch { continue; }
    for (const i of inv) {
      const n = (i.contact?.name || '') + ' ' + (i.property?.address || '');
      if (/moreno|nipo|Sebasti/i.test(n)) {
        out.push({ status: i.status, due: i.due_date, paid_at: i.paid_at, total: i.total_value,
                   tenant: i.contact?.name, addr: i.property?.address, desc: i.description });
      }
    }
  }
  console.log('===JSON===');
  console.log(JSON.stringify(out, null, 2));
}
main();
