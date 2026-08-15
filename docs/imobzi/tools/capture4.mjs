#!/usr/bin/env node
/** Quarta passada: respostas de erro (GET com id inexistente / parâmetro inválido / sem token). */
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

async function grab(url, label, token = TOKEN) {
  const id = String(++seq);
  const headers = { accept: 'application/json, text/plain, */*', 'content-type': 'application/json', authorization: token };
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
  console.log(`  [${status}] ${label} → ${body.slice(0, 120).replace(/\s+/g, ' ')}`);
  await sleep(350);
}

const FAKE = '00000000000000000000000000000000';

console.log('# erros: id inexistente');
await grab(`${API}/invoice/${FAKE}`, 'invoice/{inexistente}');
await grab(`${API}/lease/${FAKE}`, 'lease/{inexistente}');
await grab(`${API}/lease/code/999999`, 'lease/code/{inexistente}');
await grab(`${API}/financial/transaction/${FAKE}`, 'transaction/{inexistente}');
await grab(`${API}/financial/account/${FAKE}`, 'account/{inexistente}');
await grab(`${API}/financial/landlord/account/${FAKE}`, 'landlord/account/{inexistente}');

console.log('\n# erros: parâmetro inválido');
await grab(`${API}/invoices?status=nao_existe&start_at=2026-07-01&end_at=2026-07-31`, 'invoices status inválido');
await grab(`${API}/invoices?start_at=31-07-2026&end_at=2026-07-31`, 'invoices data em formato errado');
await grab(`${API}/financial/transactions?start_at=2026-13-01&end_at=2026-13-31`, 'transactions data inválida');

console.log('\n# erros: autenticação');
await grab(`${API}/invoices?start_at=2026-07-01&end_at=2026-07-31`, 'invoices token inválido', 'token-invalido');
await grab(`${API}/financial/accounts`, 'accounts sem token', '');

fs.writeFileSync(path.join(CDP, 'requests.jsonl'), reqStream.map(o => JSON.stringify(o)).join('\n') + '\n');
fs.writeFileSync(path.join(CDP, 'responses.jsonl'), respStream.map(o => JSON.stringify(o)).join('\n') + '\n');
console.log(`\ntrace atualizado — ${seq} chamadas no total`);
