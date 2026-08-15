#!/usr/bin/env node
/** Segunda passada: repasses de locadores, faturas em aberto e ligações por contrato. */
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'capture/imobzi';
const CDP = path.join(OUT, 'cdp', 'network');
const BODIES = path.join(CDP, 'bodies');
const API = 'https://my.imobzi.com/v1';

let seq = Math.max(0, ...fs.readdirSync(BODIES).map(Number).filter(Number.isFinite));
const reqStream = fs.readFileSync(path.join(CDP, 'requests.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const respStream = fs.readFileSync(path.join(CDP, 'responses.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const qs = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null)).toString();

async function auth() {
  const { IMOBZI_EMAIL: email, IMOBZI_PASSWORD: password, IMOBZI_FIREBASE_API_KEY: key } = process.env;
  const r = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${key}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!r.ok) throw new Error('auth falhou');
  return (await r.json()).idToken;
}
let TOKEN = await auth();

async function grab(url, label) {
  const id = String(++seq);
  const headers = { accept: 'application/json, text/plain, */*', 'content-type': 'application/json', authorization: TOKEN };
  let status = 0, body = '', ctype = 'application/json';
  try {
    const r = await fetch(url, { headers });
    status = r.status; ctype = r.headers.get('content-type') || ctype; body = await r.text();
  } catch (e) { console.error(`  ✗ ${label}: ${e.message}`); return null; }
  const safeHeaders = { ...headers, authorization: '<redacted>' };
  reqStream.push({ method: 'Network.requestWillBeSent', params: { requestId: id, type: 'XHR', wallTime: 0, request: { method: 'GET', url, headers: safeHeaders } } });
  respStream.push({ method: 'Network.responseReceived', params: { requestId: id, type: 'XHR', response: { url, status, headers: { 'content-type': ctype }, mimeType: ctype.split(';')[0] } } });
  const dir = path.join(BODIES, id); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'request.json'), JSON.stringify({ id, method: 'GET', url, headers: safeHeaders, body: null }, null, 2));
  fs.writeFileSync(path.join(dir, 'response.json'), JSON.stringify({ id, status, headers: { 'content-type': ctype }, mimeType: ctype.split(';')[0], body }, null, 2));
  console.log(`  ${status === 200 ? '✓' : '!'} [${status}] ${label} (${(body.length / 1024).toFixed(1)} kB)`);
  await sleep(350);
  try { return JSON.parse(body); } catch { return null; }
}

console.log('# contas de locadores');
const ll = await grab(`${API}/financial/landlord/accounts`, 'landlord/accounts (2ª amostra)');
const ids = [...(ll?.credit_balance || []), ...(ll?.debit_balance || [])].map(a => a.landlord_account_id).filter(Boolean).slice(0, 2);
for (const id of ids) {
  await grab(`${API}/financial/landlord/account/${id}`, `landlord/account/${id.slice(0, 8)}…`);
  for (const st of ['predicted', 'paid', 'overdue']) {
    await grab(`${API}/financial/landlord/account/${id}/transactions?${qs({ status: st })}`, `landlord transactions status=${st}`);
  }
  await grab(`${API}/financial/landlord/account/${id}/onlending`, 'landlord/{id}/onlending');
  await grab(`${API}/financial/landlord/account/individual-onlending/${id}?${qs({ preview_onlending: 'true' })}`, 'individual-onlending preview');
  await grab(`${API}/reports/landlord/account/onlending?${qs({ landlord_account_id: id, start_at: '2026-07-01', end_at: '2026-07-31' })}`, 'reports/landlord/account/onlending');
}

console.log('\n# faturas em aberto (mês corrente) e por contrato');
const cur = await grab(`${API}/invoices?${qs({ order_by: 'due_date', sort_by: 'asc', status: 'pending', start_at: '2026-08-01', end_at: '2026-08-31', page: 1, contract_type: 'all' })}`, 'invoices pending ago');
const leaseId = cur?.invoices?.find(i => i.lease?.db_id)?.lease?.db_id;
if (leaseId) {
  await grab(`${API}/invoices?${qs({ lease_id: leaseId, order_by: 'due_date', sort_by: 'desc' })}`, 'invoices por lease_id');
}
const contactId = cur?.invoices?.[0]?.contact?.contact_id || cur?.invoices?.[0]?.contact?.db_id;
if (contactId) {
  await grab(`${API}/invoices?${qs({ contact_id: contactId, contact_type: 'person' })}`, 'invoices por contact_id');
  await grab(`${API}/financial/transactions?${qs({ contact_id: contactId, contact_type: 'person', from_contact: 'true', order_by: 'due_date', sort_by: 'desc' })}`, 'transactions por contato');
}

console.log('\n# comissões');
await grab(`${API}/commission/onlending?${qs({ start_at: '2026-07-01', end_at: '2026-07-31' })}`, 'commission/onlending');

fs.writeFileSync(path.join(CDP, 'requests.jsonl'), reqStream.map(o => JSON.stringify(o)).join('\n') + '\n');
fs.writeFileSync(path.join(CDP, 'responses.jsonl'), respStream.map(o => JSON.stringify(o)).join('\n') + '\n');
console.log(`\ntrace atualizado — ${seq} chamadas no total`);
