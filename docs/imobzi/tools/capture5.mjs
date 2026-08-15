/** Quinta passada: endpoints que existiam na captura de maio e não haviam sido re-amostrados. */
import fs from 'node:fs'; import path from 'node:path';
const OUT=process.argv[2]; const CDP=path.join(OUT,'cdp','network'); const BODIES=path.join(CDP,'bodies'); const API='https://my.imobzi.com/v1';
let seq=Math.max(0,...fs.readdirSync(BODIES).map(Number).filter(Number.isFinite));
const rq=fs.readFileSync(path.join(CDP,'requests.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const rp=fs.readFileSync(path.join(CDP,'responses.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const {IMOBZI_EMAIL:email,IMOBZI_PASSWORD:password,IMOBZI_FIREBASE_API_KEY:key}=process.env;
const TOKEN=await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${key}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})}).then(r=>r.json()).then(d=>d.idToken);
const uid=JSON.parse(Buffer.from(TOKEN.split('.')[1],'base64').toString()).user_id;
async function grab(url,label){const id=String(++seq);const headers={accept:'application/json, text/plain, */*','content-type':'application/json',authorization:TOKEN};
 const r=await fetch(url,{headers}); const status=r.status, ctype=r.headers.get('content-type')||'application/json', body=await r.text();
 const sh={...headers,authorization:'<redacted>'};
 rq.push({method:'Network.requestWillBeSent',params:{requestId:id,type:'XHR',wallTime:0,request:{method:'GET',url,headers:sh}}});
 rp.push({method:'Network.responseReceived',params:{requestId:id,type:'XHR',response:{url,status,headers:{'content-type':ctype},mimeType:ctype.split(';')[0]}}});
 const dir=path.join(BODIES,id);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'request.json'),JSON.stringify({id,method:'GET',url,headers:sh,body:null},null,2));
 fs.writeFileSync(path.join(dir,'response.json'),JSON.stringify({id,status,headers:{'content-type':ctype},mimeType:ctype.split(';')[0],body},null,2));
 console.log(`  [${status}] ${label} (${(body.length/1024).toFixed(1)} kB)`); await new Promise(r=>setTimeout(r,350));}
await grab(`${API}/network-group/?cursor=`,'network-group');
await grab(`${API}/user/${uid}/rules`,'user/{id}/rules');
await grab(`${API}/lease/checklist`,'lease/checklist (2ª amostra)');
await grab(`${API}/financial/tags`,'financial/tags (2ª amostra)');
await grab(`${API}/financial/organization`,'financial/organization (2ª amostra)');
await grab(`${API}/financial/accounts`,'financial/accounts (2ª amostra)');
fs.writeFileSync(path.join(CDP,'requests.jsonl'),rq.map(o=>JSON.stringify(o)).join('\n')+'\n');
fs.writeFileSync(path.join(CDP,'responses.jsonl'),rp.map(o=>JSON.stringify(o)).join('\n')+'\n');
console.log('total',seq);
