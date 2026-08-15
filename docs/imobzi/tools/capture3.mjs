#!/usr/bin/env node
/** Terceira passada: filtros por contrato/contato e relatório de repasse com os params do filtro. */
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

const { IMOBZI_EMAIL: email, IMOBZI_PASSWORD: password, IMOBZI_FIREBASE_API_KEY: key } = process.env;
const TOKEN = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${key}`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password, returnSecureToken: true }),
}).then(r => r.json()).then(d => d.idToken);

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

// contrato e contato de referência, vindos de /leases já capturado
const leases = await grab(`${API}/leases?smart_list=actives`, 'leases actives (3ª amostra)');
const lease = (leases?.leases || [])[0] || {};
const leaseId = lease.db_id;
const contact = lease.tenant || lease.contact || {};

console.log('\n# faturas/lançamentos por vínculo');
if (leaseId) {
  await grab(`${API}/invoices?${qs({ lease_id: leaseId, order_by: 'due_date', sort_by: 'desc' })}`, 'invoices lease_id');
  await grab(`${API}/invoices?${qs({ lease_id: leaseId, order_by: 'due_date', sort_by: 'desc', page: 2 })}`, 'invoices lease_id page=2');
}
if (contact.db_id) {
  await grab(`${API}/invoices?${qs({ contact_id: contact.db_id, contact_type: contact.type || 'person' })}`, 'invoices contact_id');
  await grab(`${API}/financial/transactions?${qs({ contact_id: contact.db_id, contact_type: contact.type || 'person', from_contact: true, order_by: 'due_date', sort_by: 'desc' })}`, 'transactions contact_id');
}

console.log('\n# relatório de repasse (params do filtro da UI)');
const ll = await grab(`${API}/financial/landlord/accounts`, 'landlord/accounts (3ª amostra)');
const llId = (ll?.credit_balance || [])[0]?.landlord_account_id;
if (llId) {
  const filtro = { group_by: 'property', show_non_rented_properties: false, show_other_services: true, show_overdue_rent: true, start_at: '2026-07-01', end_at: '2026-07-31' };
  await grab(`${API}/financial/landlord/account/${llId}/onlending?${qs(filtro)}`, 'onlending report c/ filtro');
  await grab(`${API}/financial/landlord/account/${llId}/onlending?${qs({ ...filtro, group_by: 'contract' })}`, 'onlending report group_by=contract');
}

console.log('\n# lançamentos: variações de período');
await grab(`${API}/financial/transactions?${qs({ start_at: '2026-07-01', end_at: '2026-07-31', periodType: 'custom', order_by: 'due_date', sort_by: 'asc', page: 1 })}`, 'transactions periodType=custom');
await grab(`${API}/financial/transactions?${qs({ start_at: '2026-07-01', end_at: '2026-07-31', order_by: 'paid_at', sort_by: 'desc', page: 1 })}`, 'transactions order_by=paid_at');

fs.writeFileSync(path.join(CDP, 'requests.jsonl'), reqStream.map(o => JSON.stringify(o)).join('\n') + '\n');
fs.writeFileSync(path.join(CDP, 'responses.jsonl'), respStream.map(o => JSON.stringify(o)).join('\n') + '\n');
console.log(`\ntrace atualizado — ${seq} chamadas no total`);
