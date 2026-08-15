#!/usr/bin/env node
/**
 * Copia o trace capturado e redige PII em qualquer profundidade dos corpos,
 * por nome de chave, ANTES de gerar a spec. Assim nenhum dado de cliente entra
 * no pipeline (nem em exemplos, nem em enums inferidos).
 *
 * Uso: node pre-scrub.mjs <traceOrigem> <traceDestino>
 */
import fs from 'node:fs';
import path from 'node:path';

const [ORIG, DEST] = process.argv.slice(2);

const CHAVES_PII = new Set([
  'name', 'fullname', 'lastname', 'firstname', 'contact_name', 'company_name', 'nickname',
  'email', 'emails', 'phone', 'phones', 'mobile', 'cpf', 'cnpj', 'rg', 'document',
  'address', 'address_complement', 'neighborhood', 'zipcode', 'street', 'number',
  'barcode', 'payment_authentication', 'invoice_url', 'bank_slip_url', 'pix_url',
  'contact_key', 'db_key', 'profile_image', 'contact_profile_image', 'cover_photo',
  'legal_information', 'owners', 'beneficiaries', 'tenants', 'guarantors', 'users',
  'user_default', 'created_by', 'updated_by', 'observation', 'notes', 'history',
  'body', 'html', 'template',   // HTML do recibo de repasse traz nomes de clientes
]);

const DOCS = [
  [/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '00.000.000/0001-00'],
  [/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '000.000.000-00'],
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'email@exemplo.com'],
  [/\(\d{2}\)\s?\d{4,5}-\d{4}/g, '(00) 00000-0000'],
  [/\b\d{5}-\d{3}\b/g, '00000-000'],
];

function limpaTexto(s) {
  let out = s;
  for (const [re, rep] of DOCS) out = out.replace(re, rep);
  return out;
}

function redige(node, chavePai = null) {
  if (Array.isArray(node)) return node.map(n => redige(n, chavePai));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = CHAVES_PII.has(k.toLowerCase()) ? mascara(v) : redige(v, k);
    }
    return out;
  }
  if (typeof node === 'string') return limpaTexto(node);
  return node;
}

/** Preserva o formato (string/array/objeto) para a inferência de tipos continuar coerente. */
function mascara(v) {
  if (v == null) return v;
  if (Array.isArray(v)) return v.map(mascara);
  // objeto sob chave PII: mascara todos os valores, inclusive mapas id → nome
  if (typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mascara(x)]));
  if (typeof v === 'string') return '<redacted>';
  return v;
}

const cdpOrig = path.join(ORIG, 'cdp', 'network');
const cdpDest = path.join(DEST, 'cdp', 'network');
fs.mkdirSync(path.join(cdpDest, 'bodies'), { recursive: true });
fs.copyFileSync(path.join(cdpOrig, 'requests.jsonl'), path.join(cdpDest, 'requests.jsonl'));
fs.copyFileSync(path.join(cdpOrig, 'responses.jsonl'), path.join(cdpDest, 'responses.jsonl'));

let n = 0;
for (const dir of fs.readdirSync(path.join(cdpOrig, 'bodies'))) {
  const src = path.join(cdpOrig, 'bodies', dir);
  const dst = path.join(cdpDest, 'bodies', dir);
  fs.mkdirSync(dst, { recursive: true });
  fs.copyFileSync(path.join(src, 'request.json'), path.join(dst, 'request.json'));
  const resp = JSON.parse(fs.readFileSync(path.join(src, 'response.json'), 'utf8'));
  try {
    resp.body = JSON.stringify(redige(JSON.parse(resp.body)));
  } catch {
    resp.body = limpaTexto(String(resp.body ?? ''));
  }
  fs.writeFileSync(path.join(dst, 'response.json'), JSON.stringify(resp, null, 2));
  n++;
}
console.log(`${n} respostas redigidas em ${cdpDest}`);
