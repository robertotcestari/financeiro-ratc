#!/usr/bin/env node
/**
 * Captura dirigida da API interna do Imobzi (somente GET), gravando no formato
 * de trace CDP que a skill browser-to-api consome.
 *
 * Uso: node capture.mjs <outDir>
 * Requer no ambiente: IMOBZI_EMAIL, IMOBZI_PASSWORD, IMOBZI_FIREBASE_API_KEY
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'capture/imobzi';
const CDP = path.join(OUT, 'cdp', 'network');
const BODIES = path.join(CDP, 'bodies');
fs.mkdirSync(BODIES, { recursive: true });

const API = 'https://my.imobzi.com/v1';
const API_ALT = 'https://api.imobzi.app/v1';

const reqStream = [];
const respStream = [];
let seq = 0;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function auth() {
  const { IMOBZI_EMAIL: email, IMOBZI_PASSWORD: password, IMOBZI_FIREBASE_API_KEY: key } = process.env;
  if (!email || !password || !key) throw new Error('faltam IMOBZI_EMAIL/PASSWORD/FIREBASE_API_KEY');
  const r = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!r.ok) throw new Error('auth falhou: ' + (await r.text()).slice(0, 200));
  return (await r.json()).idToken;
}

let TOKEN = null;

/** Executa um GET e grava request/response no trace. */
async function grab(url, label) {
  const id = String(++seq);
  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    authorization: TOKEN,
  };
  let status = 0, body = '', ctype = 'application/json';
  try {
    const r = await fetch(url, { headers });
    status = r.status;
    ctype = r.headers.get('content-type') || ctype;
    body = await r.text();
  } catch (e) {
    console.error(`  ✗ ${label}: ${e.message}`);
    return null;
  }

  const safeHeaders = { ...headers, authorization: '<redacted>' };
  reqStream.push({
    method: 'Network.requestWillBeSent',
    params: { requestId: id, type: 'XHR', wallTime: 0, request: { method: 'GET', url, headers: safeHeaders } },
  });
  respStream.push({
    method: 'Network.responseReceived',
    params: { requestId: id, type: 'XHR', response: { url, status, headers: { 'content-type': ctype }, mimeType: ctype.split(';')[0] } },
  });
  const dir = path.join(BODIES, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'request.json'), JSON.stringify({ id, method: 'GET', url, headers: safeHeaders, body: null }, null, 2));
  fs.writeFileSync(path.join(dir, 'response.json'), JSON.stringify({ id, status, headers: { 'content-type': ctype }, mimeType: ctype.split(';')[0], body }, null, 2));

  const kb = (body.length / 1024).toFixed(1);
  console.log(`  ${status === 200 ? '✓' : '!'} [${status}] ${label} (${kb} kB)`);
  await sleep(350);
  try { return JSON.parse(body); } catch { return null; }
}

const qs = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null)).toString();

// ---------------------------------------------------------------- fluxo
TOKEN = await auth();
console.log('autenticado\n');

const MES = { start: '2026-07-01', end: '2026-07-31' };   // mês fechado (referência do fechamento)
const MES_ANT = { start: '2026-06-01', end: '2026-06-30' };

console.log('# faturas');
const invAll = await grab(`${API}/invoices?${qs({ order_by: 'due_date', sort_by: 'asc', status: 'all', payments_methods_available: 'all_payments', payment_method: 'all_payments', start_at: MES.start, end_at: MES.end, page: 1, contract_type: 'all' })}`, 'invoices status=all jul');
await grab(`${API}/invoices?${qs({ order_by: 'due_date', sort_by: 'asc', status: 'pending', start_at: MES.start, end_at: MES.end, page: 1, contract_type: 'all' })}`, 'invoices status=pending jul');
await grab(`${API}/invoices?${qs({ order_by: 'due_date', sort_by: 'desc', status: 'overdue', start_at: MES_ANT.start, end_at: MES.end, page: 1 })}`, 'invoices status=overdue jun-jul');
const invPaid = await grab(`${API}/invoices?${qs({ order_by: 'date', sort_by: 'desc', status: 'paid', period: 'paid_at', payment_method: 'all_payments', start_at: MES.start, end_at: MES.end, page: 1 })}`, 'invoices period=paid_at jul');
await grab(`${API}/invoices?${qs({ order_by: 'due_date', sort_by: 'asc', status: 'all', start_at: MES.start, end_at: MES.end, page: 2 })}`, 'invoices página 2');
await grab(`${API}/invoices?${qs({ order_by: 'due_date', sort_by: 'asc', status: 'all', period: 'created_at', start_at: MES.start, end_at: MES.end })}`, 'invoices period=created_at');

const invoiceIds = [
  ...(invAll?.invoices || []).slice(0, 2).map(i => i.invoice_id),
  ...(invPaid?.invoices || []).slice(0, 1).map(i => i.invoice_id),
].filter(Boolean);

console.log('\n# fatura individual');
for (const id of invoiceIds) await grab(`${API}/invoice/${id}`, `invoice/${String(id).slice(0, 8)}…`);

console.log('\n# repasse por fatura');
for (const id of invoiceIds.slice(0, 2)) await grab(`${API}/financial/landlord/account/onlending/${id}`, `onlending da fatura ${String(id).slice(0, 8)}…`);

console.log('\n# contratos');
const leases = await grab(`${API}/leases?${qs({ smart_list: '' })}`, 'leases (sem filtro)');
await grab(`${API}/leases?${qs({ smart_list: 'actives_except_vacation_rental', start_at: MES.start, end_at: MES.end })}`, 'leases smart_list=actives_except_vacation_rental');
await grab(`${API}/leases?${qs({ smart_list: 'actives' })}`, 'leases smart_list=actives');
await grab(`${API}/lease/checklist`, 'lease/checklist');

const leaseList = leases?.leases || leases?.data || [];
const leaseIds = leaseList.slice(0, 2).map(l => l.db_id || l.id).filter(Boolean);
const leaseCodes = leaseList.slice(0, 2).map(l => l.code).filter(Boolean);
for (const id of leaseIds) await grab(`${API}/lease/${id}`, `lease/${String(id).slice(0, 8)}…`);
for (const code of leaseCodes) await grab(`${API}/lease/code/${code}`, `lease/code/${code}`);

console.log('\n# contas e lançamentos');
const accounts = await grab(`${API}/financial/accounts`, 'financial/accounts');
const accountIds = (accounts?.accounts || []).slice(0, 2).map(a => a.db_id).filter(Boolean);
for (const id of accountIds) await grab(`${API}/financial/account/${id}`, `financial/account/${id}`);

const tx1 = await grab(`${API}/financial/transactions?${qs({ start_at: MES.start, end_at: MES.end, periodType: 'this_month', order_by: 'due_date', sort_by: 'desc', page: 1 })}`, 'transactions jul');
await grab(`${API}/financial/transactions?${qs({ start_at: MES_ANT.start, end_at: MES_ANT.end, periodType: 'last_month', order_by: 'due_date', sort_by: 'desc', page: 1 })}`, 'transactions jun');
if (accountIds[0]) await grab(`${API}/financial/transactions?${qs({ start_at: MES.start, end_at: MES.end, account_id: accountIds[0], order_by: 'due_date', sort_by: 'desc', page: 1 })}`, 'transactions por conta');
await grab(`${API}/financial/transactions?${qs({ start_at: MES.start, end_at: MES.end, status: 'paid', order_by: 'due_date', sort_by: 'desc', page: 1 })}`, 'transactions status=paid');

const txList = tx1?.transactions || tx1?.data || [];
for (const t of txList.slice(0, 2)) {
  const id = t.transaction_id || t.db_id || t.id;
  if (id) await grab(`${API}/financial/transaction/${id}`, `financial/transaction/${String(id).slice(0, 8)}…`);
}

console.log('\n# taxonomia financeira');
await grab(`${API}/financial/categories`, 'financial/categories');
await grab(`${API}/financial/categories?${qs({ type: 'credit' })}`, 'financial/categories type=credit');
await grab(`${API}/financial/tags`, 'financial/tags');
await grab(`${API}/financial/organization`, 'financial/organization');
await grab(`${API}/banks`, 'banks');

console.log('\n# contas de locadores (repasses)');
const landlords = await grab(`${API}/financial/landlord/accounts`, 'financial/landlord/accounts');
const landlordIds = (landlords?.landlord_accounts || landlords?.accounts || landlords?.data || [])
  .slice(0, 2).map(a => a.db_id || a.landlord_account_id || a.id).filter(Boolean);
for (const id of landlordIds) {
  await grab(`${API}/financial/landlord/account/${id}`, `landlord/account/${String(id).slice(0, 8)}…`);
  for (const st of ['predicted', 'paid', 'overdue']) {
    await grab(`${API}/financial/landlord/account/${id}/transactions?${qs({ status: st })}`, `landlord transactions status=${st}`);
  }
  await grab(`${API}/financial/landlord/account/${id}/onlending`, `landlord onlending report`);
}

console.log('\n# host alternativo api.imobzi.app');
if (accountIds[0]) {
  await grab(`${API_ALT}/financial/transactions?${qs({ start_at: MES.start, end_at: MES.end, periodType: 'this_month', order_by: 'due_date', sort_by: 'desc', page: 1, account_id: accountIds[0] })}`, 'api.imobzi.app transactions');
}

console.log('\n# conta/plano');
await grab(`${API}/parameters`, 'parameters');
await grab(`${API}/real-estate`, 'real-estate');
await grab(`${API}/subscription`, 'subscription');

fs.writeFileSync(path.join(CDP, 'requests.jsonl'), reqStream.map(o => JSON.stringify(o)).join('\n') + '\n');
fs.writeFileSync(path.join(CDP, 'responses.jsonl'), respStream.map(o => JSON.stringify(o)).join('\n') + '\n');
console.log(`\ntrace gravado em ${CDP} — ${seq} chamadas`);
