#!/usr/bin/env node
// Extrai (metodoHTTP, path, funcaoDoApp) do bundle main.js do Imobzi.
import fs from 'node:fs';

const src = fs.readFileSync(process.argv[2] || 'bundle/main.js', 'utf8');
const callRe = /new_(get|post|put|delete|patch)\(/g;
const out = [];
let m;
while ((m = callRe.exec(src)) !== null) {
  const method = m[1].toUpperCase();
  const start = m.index + m[0].length;
  const chunk = src.slice(start, start + 400);
  // path: apiUrl()+"..." possivelmente seguido de +var+"..."
  const apiIdx = chunk.indexOf('apiUrl()');
  if (apiIdx === -1) continue;
  let rest = chunk.slice(apiIdx + 'apiUrl()'.length);
  let path = '';
  let i = 0;
  let guard = 0;
  while (guard++ < 12) {
    // consome +"literal"  ou  +ident
    const lit = /^\+"([^"]*)"/.exec(rest.slice(i));
    if (lit) { path += lit[1]; i += lit[0].length; continue; }
    const ident = /^\+([A-Za-z_$][\w$.]*)/.exec(rest.slice(i));
    if (ident) { path += '{' + ident[1] + '}'; i += ident[0].length; continue; }
    break;
  }
  if (!path) continue;
  // nome da função do app: procura o prototype.<nome>= mais próximo antes da chamada
  const before = src.slice(Math.max(0, m.index - 600), m.index);
  const fnMatches = [...before.matchAll(/prototype\.(\w+)\s*=\s*function/g)];
  const fn = fnMatches.length ? fnMatches[fnMatches.length - 1][1] : '';
  // query string: 2o argumento da chamada (heurística: identificador ou "literal")
  const afterPath = rest.slice(i);
  const qs = /^,\s*"([^"]*)"/.exec(afterPath);
  out.push({ method, path, fn, qsLiteral: qs ? qs[1] : null });
}

// dedupe
const seen = new Map();
for (const r of out) {
  const key = `${r.method} ${r.path}`;
  if (!seen.has(key)) seen.set(key, { ...r, fns: new Set() });
  if (r.fn) seen.get(key).fns.add(r.fn);
}
const rows = [...seen.values()]
  .map(r => ({ method: r.method, path: r.path, fns: [...r.fns].join(', '), qsLiteral: r.qsLiteral }))
  .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  for (const r of rows) console.log(`${r.method.padEnd(6)} ${r.path.padEnd(55)} ${r.fns}`);
  console.error(`\n${rows.length} operações distintas`);
}
