import { getImobziAuthToken } from '@/lib/features/imobzi/auth';

async function fetchAll(status: string, start: string, end: string) {
  const token = await getImobziAuthToken();
  const all: any[] = [];
  for (let page = 1; page <= 15; page++) {
    const params = new URLSearchParams({
      order_by: 'due_date', sort_by: 'asc', status,
      start_at: start, end_at: end, page: String(page), contract_type: 'all',
    });
    const res = await fetch(`https://my.imobzi.com/v1/invoices?${params}`, {
      headers: { accept: 'application/json, text/plain, */*', authorization: token, 'content-type': 'application/json' },
    });
    if (!res.ok) break;
    const d = await res.json();
    const inv = d.invoices || [];
    if (!inv.length) break;
    all.push(...inv);
  }
  return all;
}

async function main() {
  const out: any[] = [];
  for (const status of ['paid', 'pending']) {
    const inv = await fetchAll(status, '2025-08-01', '2026-08-31');
    for (const i of inv) {
      if (/moreno|nipo/i.test((i.contact?.name || ''))) {
        out.push({ status: i.status, due: i.due_date, paid_at: i.paid_at, total: i.total_value, desc: i.description });
      }
    }
  }
  console.log('===JSON===');
  console.log(JSON.stringify(out, null, 2));
}
main();
