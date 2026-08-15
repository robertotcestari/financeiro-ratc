#!/usr/bin/env node
/**
 * Sondagem de validação: manda um valor inválido em cada query param e coleta a
 * resposta 422 do FastAPI, que enumera os valores/tipos aceitos.
 * Só GET, sem efeito colateral. Grava no trace e num resumo markdown.
 */
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

const { IMOBZI_EMAIL: email, IMOBZI_PASSWORD: password, IMOBZI_FIREBASE_API_KEY: key } = process.env;
const TOKEN = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${key}`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password, returnSecureToken: true }),
}).then(r => r.json()).then(d => d.idToken);

async function probe(base, param, baseParams) {
  const id = String(++seq);
  const url = `${API}${base}?${new URLSearchParams({ ...baseParams, [param]: '___probe___' })}`;
  const headers = { accept: 'application/json, text/plain, */*', 'content-type': 'application/json', authorization: TOKEN };
  let status = 0, body = '', ctype = 'application/json';
  try {
    const r = await fetch(url, { headers });
    status = r.status; ctype = r.headers.get('content-type') || ctype; body = await r.text();
  } catch (e) { return { param, error: e.message }; }

  const safeHeaders = { ...headers, authorization: '<redacted>' };
  reqStream.push({ method: 'Network.requestWillBeSent', params: { requestId: id, type: 'XHR', wallTime: 0, request: { method: 'GET', url, headers: safeHeaders } } });
  respStream.push({ method: 'Network.responseReceived', params: { requestId: id, type: 'XHR', response: { url, status, headers: { 'content-type': ctype }, mimeType: ctype.split(';')[0] } } });
  const dir = path.join(BODIES, id); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'request.json'), JSON.stringify({ id, method: 'GET', url, headers: safeHeaders, body: null }, null, 2));
  fs.writeFileSync(path.join(dir, 'response.json'), JSON.stringify({ id, status, headers: { 'content-type': ctype }, mimeType: ctype.split(';')[0], body }, null, 2));
  await sleep(300);

  let expected = null, type = null;
  try {
    const j = JSON.parse(body);
    const d = Array.isArray(j.detail) ? j.detail[0] : null;
    if (d) { expected = d.ctx?.expected || d.msg; type = d.type; }
    else if (j.message) expected = j.message.slice(0, 120);
  } catch { /* corpo não-JSON */ }
  return { param, status, type, expected };
}

const ALVOS = [
  {
    base: '/invoices',
    baseParams: { start_at: '2026-07-01', end_at: '2026-07-31' },
    params: ['status', 'period', 'payment_method', 'payments_methods_available', 'order_by', 'sort_by',
             'contract_type', 'page', 'lease_id', 'contact_id', 'contact_type', 'account_id',
             'start_at', 'category_id', 'property_id', 'search_text', 'smart_list', 'periodType'],
  },
  {
    base: '/financial/transactions',
    baseParams: { start_at: '2026-07-01', end_at: '2026-07-31' },
    params: ['periodType', 'order_by', 'sort_by', 'status', 'account_id', 'contact_id', 'contact_type',
             'from_contact', 'page', 'category_id', 'type', 'tag_id', 'property_id', 'lease_id', 'search_text'],
  },
  {
    base: '/leases',
    baseParams: {},
    params: ['smart_list', 'order_by', 'sort_by', 'page', 'search_text', 'search_type', 'owner_id',
             'owner_type', 'property_id', 'start_at', 'status'],
  },
  {
    base: '/financial/landlord/accounts',
    baseParams: {},
    params: ['status', 'order_by', 'page', 'search_text'],
  },
];

const linhas = [];
for (const alvo of ALVOS) {
  console.log(`\n## ${alvo.base}`);
  linhas.push(`\n### GET ${alvo.base}\n`, '| param | status | tipo do erro | aceita |', '|---|---|---|---|');
  for (const p of alvo.params) {
    const r = await probe(alvo.base, p, alvo.baseParams);
    const aceita = (r.expected || '').replace(/\|/g, '\\|').slice(0, 200);
    console.log(`  ${String(r.status).padEnd(4)} ${p.padEnd(28)} ${r.type || ''} ${aceita.slice(0, 90)}`);
    linhas.push(`| \`${p}\` | ${r.status} | ${r.type || '—'} | ${aceita || '—'} |`);
  }
}

fs.writeFileSync(path.join(CDP, 'requests.jsonl'), reqStream.map(o => JSON.stringify(o)).join('\n') + '\n');
fs.writeFileSync(path.join(CDP, 'responses.jsonl'), respStream.map(o => JSON.stringify(o)).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'param-probe.md'), linhas.join('\n') + '\n');
console.log(`\nresumo em ${path.join(OUT, 'param-probe.md')} — ${seq} chamadas no trace`);
