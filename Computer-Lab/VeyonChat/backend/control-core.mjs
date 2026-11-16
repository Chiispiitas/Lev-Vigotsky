import {POLICY_ID,DEFAULT_POLICY,validatePolicy,readPolicy,devicePolicy} from './policy-core.mjs';
import {createChat} from './chat-core.mjs';
// Framework-free security and workflow core. All persistence is injected for tests.
import { createReleaseManager, ReleaseError } from './release-core.mjs';
export const CONFIG_ID = '2f819598-c169-4736-99d0-6d48cfbd5301';
export const EXPECTED_NAMES = [...Array.from({ length: 33 }, (_, i) => `UEPLV-${String(i + 1).padStart(2, '0')}`),'UEPLV-34'];
export const ACTIONS = Object.freeze(['class','class-ai','exam','free','close-apps','cleanup','status','uwf-status','uwf-enable','uwf-disable','uwf-purge-swap','uwf-repair','uwf-reset-stage1','uwf-reset-stage2','windows-update','maintenance','reboot','shutdown','shutdown-warning-test','maintenance-enter','student-return','freeze-reboot','thaw-reboot']);
const SESSION_CREDENTIALS_ID='b785ec71-c16e-4c9e-a9cc-5ac27221da61';
const COOKIE = '__Host-ueplv_staff';
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });
const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
export class ControlError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
const fail = (status, code, message) => { throw new ControlError(status, code, message); };
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
const canonicalJson = value => JSON.stringify(value, function (_key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]])) : item;
});
const string = (value, max = 200) => typeof value === 'string' ? value.slice(0, max) : '';
const random = length => crypto.getRandomValues(new Uint8Array(length));
export function toBase64(bytes) { let s = ''; for (const byte of bytes) s += String.fromCharCode(byte); return btoa(s); }
export function fromBase64(value, maxBytes = 131072) {
  if (typeof value !== 'string' || value.length > Math.ceil(maxBytes / 3) * 4 + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) throw new Error('Invalid base64');
  return Uint8Array.from(atob(value), x => x.charCodeAt(0));
}
function url64(bytes) { return toBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''); }
function unurl64(value) { if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid token'); return fromBase64(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)); }
export async function sha256Hex(value) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)))].map(x => x.toString(16).padStart(2, '0')).join(''); }
export async function deterministicId(value) { const h = await sha256Hex(value); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`; }
function constantEqual(a, b) { let diff = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] || 0) ^ (b[i] || 0); return diff === 0; }
async function hmacKey(bytes, usages) { return crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, usages); }
export async function protect(name, key, payload) {
  const bytes = fromBase64(key, 64); if (bytes.length !== 64) throw new Error('Invalid credential');
  const e = { name, nonce: toBase64(random(24)), iv: toBase64(random(16)), data: '', mac: '' };
  const aes = await crypto.subtle.importKey('raw', bytes.slice(0, 32), 'AES-CBC', false, ['encrypt']);
  e.data = toBase64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: fromBase64(e.iv) }, aes, enc.encode(JSON.stringify(payload)))));
  e.mac = toBase64(new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(bytes.slice(32), ['sign']), enc.encode(`${e.name}\n${e.nonce}\n${e.iv}\n${e.data}`))));
  return e;
}
export async function unprotect(name, key, envelope) {
  if (!envelope || envelope.name !== name) throw new Error('Invalid identity');
  const bytes = fromBase64(key, 64); if (bytes.length !== 64 || fromBase64(envelope.iv, 16).length !== 16 || fromBase64(envelope.nonce, 24).length !== 24) throw new Error('Invalid credential or message');
  const signature = fromBase64(envelope.mac, 32); if (signature.length !== 32) throw new Error('Invalid MAC');
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(bytes.slice(32), ['verify']), signature, enc.encode(`${name}\n${envelope.nonce}\n${envelope.iv}\n${envelope.data}`));
  if (!valid) throw new Error('Invalid MAC'); // Authenticate before AES-CBC decryption.
  const aes = await crypto.subtle.importKey('raw', bytes.slice(0, 32), 'AES-CBC', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: fromBase64(envelope.iv) }, aes, fromBase64(envelope.data, 98304));
  return JSON.parse(dec.decode(plaintext));
}
async function readBody(request,maxBytes=131072) {
  if ((request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() !== 'application/json') fail(415, 'json_required', 'Se requiere JSON.');
  if (Number(request.headers.get('content-length') || '0') > maxBytes) fail(413, 'body_too_large', 'Solicitud demasiado grande.');
  const reader = request.body?.getReader(); if (!reader) fail(400, 'empty_request', 'Falta la solicitud.');
  const chunks = []; let size = 0;
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > maxBytes) { await reader.cancel(); fail(413, 'body_too_large', 'Solicitud demasiado grande.'); } chunks.push(part.value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const part of chunks) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(dec.decode(bytes)); } catch { fail(400, 'invalid_json', 'JSON no válido.'); }
}
function checkOrigin(request, publicOrigin) { if (request.headers.get('origin') !== (publicOrigin || new URL(request.url).origin) && !['https://ueplv.com','https://www.ueplv.com'].includes(request.headers.get('origin'))) fail(403, 'origin_rejected', 'Origen no autorizado.'); }
function validResult(result) { return result && GUID.test(result.id || '') && ACTIONS.includes(result.action) && typeof result.state === 'string' && typeof result.detail === 'string'; }
function cleanResults(results) { return (Array.isArray(results) ? results : []).filter(validResult).slice(-100).map(r => ({ id: r.id, action: r.action, state: string(r.state, 40), detail: string(r.detail, 600), utc: string(r.utc, 40), bootTicks: Number.isSafeInteger(r.bootTicks) ? r.bootTicks : 0 })); }
function cleanStatus(input, name) {
  const s = { name, version: string(input.version, 32), utc: string(input.utc, 40), mode: string(input.mode, 32), modeApplied:typeof input.modeApplied==='boolean'?input.modeApplied:null, policyError:string(input.policyError,600), uwfError: string(input.uwfError, 300), bootTicks: Number.isSafeInteger(input.bootTicks) ? input.bootTicks : 0, cloudConfigured:typeof input.cloudConfigured==='boolean'?input.cloudConfigured:null,cloudLastSuccessUtc:string(input.cloudLastSuccessUtc,40),cloudLastError:string(input.cloudLastError,600) };
  for (const k of ['currentEnabled','nextEnabled','currentCProtected','nextCProtected','currentServicing','nextServicing']) s[k] = typeof input[k] === 'boolean' ? input[k] : null;
  for (const k of ['overlayMB','availableMB','overlayWarningMB','overlayCriticalMB']) s[k] = Number.isFinite(input[k]) && input[k] >= 0 ? Math.min(input[k], 2 ** 40) : null;
  const i = input.installation; s.installation = i && typeof i === 'object' ? { stage: string(i.stage, 80), success: typeof i.success === 'boolean' ? i.success : null, detail: string(i.detail, 600), utc: string(i.utc, 40) } : null;
  s.installedReleaseVersion=string(input.installedReleaseVersion,24);
  const u=input.update;s.update=u&&typeof u==='object'?{installedVersion:string(u.installedVersion,24),availableVersion:string(u.availableVersion,24),phase:string(u.phase,80),lastError:string(u.lastError,600),downloadedUtc:string(u.downloadedUtc,40)}:null;
  const session=input.session;s.session=session&&typeof session==='object'?{phase:string(session.phase,40),error:string(session.error,600),user:string(session.user,80)}:null;
  const f=input.freezeLease;s.freezeLease=f&&typeof f==='object'?{phase:string(f.phase,40),remainingBoots:Number.isInteger(f.remainingBoots)?Math.max(0,Math.min(99,f.remainingBoots)):0,requestedBoots:Number.isInteger(f.requestedBoots)?Math.max(0,Math.min(99,f.requestedBoots)):0,error:string(f.error,600)}:null;
  return s;
}
function wireJob(item) { return { ...(item.action==='thaw-reboot'?{rebootCount:item.rebootCount}:{}), id: item._id, action: item.action, issuedUtc: item.issuedUtc, expiresUtc: item.expiresUtc }; }
export function createControl(store, options = {}) {
  const now = options.now || Date.now;
  // Wix may route SSR requests through an internal origin. This is deployment-owned,
  // never inferred from Origin, Forwarded, Host, or another caller-supplied header.
  const publicOrigin = options.publicOrigin ? new URL(options.publicOrigin).origin : null;
  const releases=createReleaseManager(store,{now,protect,unprotect,deterministicId,expectedNames:EXPECTED_NAMES});
  let cachedConfig, configUntil = 0, sweepAfter = 0;
  const loginAttempts = new Map();
  const chat=createChat(store,{now,fail,json,deterministicId,protect,unprotect,fromBase64,expectedNames:EXPECTED_NAMES});
  async function config() {
    if (cachedConfig && now() < configUntil) return cachedConfig;
    const c = await store.getConfig(CONFIG_ID);
    if (!c || c.schemaVersion !== 1 || !/^[a-f0-9]{64}$/i.test(c.adminTokenHash || '') || fromBase64(c.sessionSecret, 128).length < 32 || !c.deviceKeys) throw new Error('Control configuration unavailable');
    cachedConfig = c; configUntil = now() + 60000; return c;
  }
  async function makeSession(c) {
    const issued = Math.floor(now() / 1000), payload = url64(enc.encode(JSON.stringify({ sub: 'staff', iat: issued, exp: issued + SESSION_SECONDS, jti: url64(random(24)) })));
    const signature = url64(new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(fromBase64(c.sessionSecret, 128), ['sign']), enc.encode(payload))));
    return `${payload}.${signature}`;
  }
  async function requireSession(request, c) {
    try {
      const pair = (request.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`));
      const bearer=request.headers.get('authorization');if(bearer&&!['https://ueplv.com','https://www.ueplv.com'].includes(request.headers.get('origin')))throw new Error();const value = bearer?.startsWith('Bearer ')?bearer.slice(7):pair?.slice(COOKIE.length + 1); if (!value || value.length > 1024) throw new Error();
      const parts = value.split('.'); if (parts.length !== 2) throw new Error();
      if (!(await crypto.subtle.verify('HMAC', await hmacKey(fromBase64(c.sessionSecret, 128), ['verify']), unurl64(parts[1]), enc.encode(parts[0])))) throw new Error();
      const p = JSON.parse(dec.decode(unurl64(parts[0]))), time = Math.floor(now() / 1000);
      if (p.sub !== 'staff' || !Number.isSafeInteger(p.iat) || !Number.isSafeInteger(p.exp) || p.exp <= time || p.iat > time + 60 || p.exp - p.iat !== SESSION_SECONDS || !p.jti) throw new Error();
    } catch { fail(401, 'authentication_required', 'Inicie sesión para controlar el laboratorio.'); }
  }
  async function sweep(force = false) {
    if (!force && now() < sweepAfter) return; sweepAfter = now() + 60000;
    const [polls, jobs] = await Promise.all([store.listPolls(450), store.listJobs(450)]);
    if (polls.length > 250) {
      const keep = new Set(polls.slice(0, 200).map(x => x._id)); const newest = new Map();
      for (const p of polls) if (!newest.has(p.name) || p.sequence > newest.get(p.name).sequence) newest.set(p.name,p);
      for (const p of newest.values()) keep.add(p._id);
      const remove = polls.filter(p => !keep.has(p._id)).map(p => p._id); if (remove.length) await store.removePolls(remove);
    }
    if (jobs.length > 200) { const remove = jobs.slice(200).filter(j => j.expiresAt < now()).map(j => j._id); if (remove.length) await store.removeJobs(remove); }
  }
  async function status() {
    const [registered, polls, jobs] = await Promise.all([store.listDevices(), store.listPolls(450), store.listJobs(300)]);
    const latest = new Map(); for (const p of polls) if (!latest.has(p.name) || p.sequence > latest.get(p.name).sequence) latest.set(p.name, p);
    return { serverUtc: new Date(now()).toISOString(), expected: EXPECTED_NAMES, pollIntervalSeconds: 105, commandIntervalSeconds: 5, onlineThresholdSeconds: 150,
      devices: EXPECTED_NAMES.map(name => {
        const d = registered.find(x => x.name === name), p = latest.get(name), results = cleanResults(p?.payload?.results);
        return { name, deviceId: d?.deviceId || null, enrolledUtc: d?.enrolledUtc || null, lastSeenUtc: p ? new Date(p.receivedAt).toISOString() : null, status: p?.payload?.status || null, results,
          jobs: jobs.filter(j => j.name === name).sort((a,b) => b.issuedAt-a.issuedAt || a._id.localeCompare(b._id)).slice(0, 30).map(j => { const r = results.find(x => x.id === j._id); return { ...wireJob(j), state: r?.state || (j.expiresAt <= now() ? 'expired' : 'queued'), detail: r?.detail || '' }; }) };
      }) };
  }
  let cachedPolicy=null,policyUntil=0;
  async function policy(){if(cachedPolicy&&now()<policyUntil)return cachedPolicy;const row=await store.getConfig(POLICY_ID);cachedPolicy=readPolicy(row?.policy||DEFAULT_POLICY);policyUntil=now()+5000;return cachedPolicy;}
  let credentialCache=null,credentialUntil=0;
  async function credentialSources(){if(credentialCache&&now()<credentialUntil)return credentialCache;const row=await store.getConfig(SESSION_CREDENTIALS_ID);credentialCache=row?.policy?.credentials||{};credentialUntil=now()+60000;return credentialCache;}
  async function agentJob(item,c){const job=wireJob(item);if(job.action==='maintenance-enter'){
    const source=(await credentialSources())[item.name];if(!source)throw new Error('Maintenance credential unavailable');
    const credential=await unprotect(item.name,c.deviceKeys[item.name],source);
    if(credential.purpose!=='ueplv-maintenance-source'||credential.account!=='MAINTENANCE'||typeof credential.password!=='string'||!credential.password||credential.password.length>256)throw new Error('Maintenance credential invalid');
    job.credentialEnvelope=JSON.stringify(await protect(item.name,c.deviceKeys[item.name],{purpose:'ueplv-maintenance-login',jobId:job.id,expiresUtc:job.expiresUtc,account:'MAINTENANCE',password:credential.password}));
  }return job;}
  const commandDevices = new Map();
  async function commands(envelope, c) {
    const name=envelope?.name;
    if(!EXPECTED_NAMES.includes(name)||!Object.prototype.hasOwnProperty.call(c.deviceKeys,name))fail(403,'device_authentication_failed','Equipo no autorizado.');
    const key=c.deviceKeys[name];let p;
    try{p=await unprotect(name,key,envelope);}catch{fail(403,'device_authentication_failed','Equipo no autorizado.');}
    const reply={requestId:p?.requestId||'',serverUtc:new Date(now()).toISOString(),accepted:false,error:null,jobs:[]};
    const reject=async message=>{reply.error=message;return json(await protect(name,key,reply));};
    if(!p||!GUID.test(p.requestId||'')||!GUID.test(p.deviceId||'')||!Number.isFinite(Date.parse(p.sentUtc))||Math.abs(now()-Date.parse(p.sentUtc))>120000||!Array.isArray(p.knownIds)||p.knownIds.length>1000||p.knownIds.some(id=>!GUID.test(id)))return reject('Invalid or stale command request');
    let cached=commandDevices.get(name);
    if(!cached||cached.until<=now()){
      const device=await store.getDevice(await deterministicId(`device:${name}`));
      if(!device)return reject('Device must enroll through its heartbeat first');
      cached={deviceId:device.deviceId,until:now()+60000};commandDevices.set(name,cached);
    }
    if(cached.deviceId!==p.deviceId)return reject('Device identity conflict');
    const known=new Set(p.knownIds),jobs=await store.jobsFor(name,now());
    reply.accepted=true;reply.policy=devicePolicy(await policy());
    reply.jobs=await Promise.all(jobs.filter(j=>ACTIONS.includes(j.action)&&j.expiresAt>now()&&j.issuedAt<=now()+60000&&j.expiresAt-j.issuedAt<=300000&&!known.has(j._id)).slice(0,15).map(j=>agentJob(j,c)));
    // Read-only delivery: no heartbeat, sequence, registration, or result writes.
    return json(await protect(name,key,reply));
  }
  async function poll(envelope, c) {
    const name = envelope?.name; if (!EXPECTED_NAMES.includes(name) || !Object.prototype.hasOwnProperty.call(c.deviceKeys, name)) fail(403, 'device_authentication_failed', 'Equipo no autorizado.');
    const key = c.deviceKeys[name]; let p;
    try { p = await unprotect(name, key, envelope); } catch { fail(403, 'device_authentication_failed', 'Equipo no autorizado.'); }
    const reply = { requestId: p?.requestId || '', serverUtc: new Date(now()).toISOString(), accepted: false, error: null, jobs: [] };
    const reject = async message => { reply.error = message; return json(await protect(name, key, reply)); };
    if (!p || !GUID.test(p.requestId || '') || !GUID.test(p.deviceId || '') || !Number.isSafeInteger(p.sequence) || p.sequence < 1 || !p.status || p.status.name !== name || !Number.isFinite(Date.parse(p.sentUtc)) || Math.abs(now() - Date.parse(p.sentUtc)) > 120000) return reject('Invalid or stale enrollment request');
    const deviceId = await deterministicId(`device:${name}`); let device = await store.getDevice(deviceId);
    if (!device) {
      try { device = await store.insertDevice({ _id: deviceId, name, deviceId: p.deviceId, enrolledUtc: reply.serverUtc }); }
      catch { device = await store.getDevice(deviceId); if (!device) throw new Error('Enrollment storage failed'); }
    }
    if (device.deviceId !== p.deviceId) return reject('Device identity conflict; staff must reset registration');
    const latest = await store.latestPoll(name);
    if (latest && p.sequence <= latest.sequence) return reject('Poll replay rejected');
    const item = { _id: await deterministicId(`poll:${name}:${p.sequence}`), name, deviceId: p.deviceId, sequence: p.sequence, receivedAt: now(), payload: { requestId: p.requestId, sentUtc: p.sentUtc, status: cleanStatus(p.status, name), results: cleanResults(p.results) } };
    try { await store.insertPoll(item); } catch { if (await store.getPoll(item._id)) return reject('Poll replay rejected'); throw new Error('Poll storage failed'); }
    const jobs = await store.jobsFor(name, now()); const results = item.payload.results;
    reply.accepted = true; reply.policy=devicePolicy(await policy());reply.jobs = await Promise.all(jobs.filter(j => ACTIONS.includes(j.action) && j.expiresAt > now() && j.issuedAt <= now() + 60000 && j.expiresAt - j.issuedAt <= 300000 && !results.some(r => r.id === j._id)).slice(0, 15).map(j=>agentJob(j,c)));
    reply.update=await releases.forStatus(p.status);
    await sweep();
    return json(await protect(name, key, reply));
  }
  return async function handle(request, route) {
    try {
      const c = await config();
      if(route==='agent/chat'){if(request.method!=='POST')return json({error:'Method not allowed'},405);return await chat.enroll(c,await readBody(request));}
      if(route==='chat/student'){if(request.method!=='POST')return json({error:'Method not allowed'},405);return await chat.handle(c,await readBody(request),false);}
      if(route==='agent/commands'){if(request.method!=='POST')return json({error:'Method not allowed'},405);return await commands(await readBody(request),c);}
      if (route === 'agent/poll') { if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405); return await poll(await readBody(request), c); }
      if (route === 'agent/update') { if(request.method!=='POST')return json({error:'Method not allowed'},405);return json(await releases.download(await readBody(request),c)); }
      if (route === 'admin/session') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405); checkOrigin(request,publicOrigin);
        const ip = request.headers.get('cf-connecting-ip') || 'unknown', attempt = loginAttempts.get(ip), time = now();
        if (attempt && time < attempt.until && attempt.count >= 8) fail(429, 'login_rate_limited', 'Espere un minuto antes de intentar nuevamente.');
        const body = await readBody(request), token = typeof body.token === 'string' ? body.token.trim() : '';
        if (token.length < 12 || token.length > 160 || !constantEqual(enc.encode(await sha256Hex(token)), enc.encode(c.adminTokenHash.toLowerCase()))) {
          if (loginAttempts.size > 512) loginAttempts.clear(); loginAttempts.set(ip, { count: attempt && time < attempt.until ? attempt.count + 1 : 1, until: time + 60000 });
          fail(401, 'invalid_access_token', 'La clave de acceso no es válida.');
        }
        loginAttempts.delete(ip); const session = await makeSession(c);
        return json({ authenticated: true, ...(['https://ueplv.com','https://www.ueplv.com'].includes(request.headers.get('origin'))?{sessionToken:session}:{}), expiresUtc: new Date(time + SESSION_SECONDS * 1000).toISOString() }, 200, { 'Set-Cookie': `${COOKIE}=${session}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}` });
      }
      await requireSession(request, c);
      if(route==='admin/chat'){if(request.method!=='POST')return json({error:'Method not allowed'},405);checkOrigin(request,publicOrigin);return await chat.handle(c,await readBody(request),true);}
      if(route==='admin/test-vm'){
        if(request.method!=='POST')return json({error:'Method not allowed'},405);checkOrigin(request,publicOrigin);
        const body=await readBody(request);let bytes;try{bytes=fromBase64(body.key,64);}catch{fail(400,'invalid_key','Clave no valida.');}
        if(body.name!=='UEPLV-34'||bytes.length!==64)fail(400,'invalid_vm','Solo se permite el equipo de prueba 34.');
        if(c.deviceKeys['UEPLV-34']&&c.deviceKeys['UEPLV-34']!==body.key)fail(409,'vm_key_conflict','La VM 34 ya tiene otra credencial.');
        const sources=await credentialSources();const source=sources['UEPLV-32'];if(!source)fail(409,'credential_missing','Falta la credencial de mantenimiento.');
        const credential=await unprotect('UEPLV-32',c.deviceKeys['UEPLV-32'],source);
        await store.saveConfig(CONFIG_ID,{...c,deviceKeys:{...c.deviceKeys,'UEPLV-34':body.key}});
        const credentials={...sources,'UEPLV-34':await protect('UEPLV-34',body.key,credential)};
        await store.savePolicy(SESSION_CREDENTIALS_ID,{schemaVersion:1,credentials});credentialCache=credentials;credentialUntil=now()+60000;configUntil=0;cachedConfig=null;
        return json({configured:true,name:'UEPLV-34'});
      }
      if(route==='admin/session-credentials'){
        if(request.method!=='POST')return json({error:'Method not allowed'},405);checkOrigin(request,publicOrigin);
        const body=await readBody(request),credentials=body.credentials;
        if(!credentials||typeof credentials!=='object'||Array.isArray(credentials)||Object.keys(credentials).length!==EXPECTED_NAMES.length)fail(400,'invalid_credentials','Faltan credenciales de equipos.');
        for(const name of EXPECTED_NAMES){let entry;try{entry=await unprotect(name,c.deviceKeys[name],credentials[name]);}catch{fail(400,'invalid_credentials','Credencial cifrada no valida.');}
          if(entry.purpose!=='ueplv-maintenance-source'||entry.account!=='MAINTENANCE'||typeof entry.password!=='string'||!entry.password||entry.password.length>256)fail(400,'invalid_credentials','Credencial no valida.');}
        await store.savePolicy(SESSION_CREDENTIALS_ID,{schemaVersion:1,credentials});credentialCache=credentials;credentialUntil=now()+60000;return json({saved:EXPECTED_NAMES.length});
      }
      if(route==='admin/policies'){if(request.method==='GET')return json(await policy());if(request.method!=='POST')return json({error:'Method not allowed'},405);checkOrigin(request,publicOrigin);let value;try{value=validatePolicy({...await readBody(request),revision:now()});}catch(e){return json({error:e.message},400);}await store.savePolicy(POLICY_ID,value);cachedPolicy=value;policyUntil=now()+5000;return json(value);}
      if (route === 'admin/logout') { if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405); checkOrigin(request,publicOrigin); return json({ authenticated: false }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0` }); }
      if (route === 'admin/status') {
        if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        const payload = await status(), {serverUtc: _serverUtc, ...stablePayload} = payload;
        // serverUtc changes on every request; a weak validator identifies equivalent
        // fleet data while the authenticated client calculates elapsed time locally.
        const tag = `W/"${await sha256Hex(canonicalJson(stablePayload))}"`;
        const headers = {...JSON_HEADERS, 'Cache-Control':'private, no-store, max-age=0', ETag:tag, Vary:'Cookie'};
        const conditional = request.headers.get('if-none-match') || '';
        if (conditional.split(',').some(value => value.trim() === '*' || value.trim().replace(/^W\//,'') === tag.slice(2))) {
          return new Response(null, {status:304,headers});
        }
        return json(payload,200,headers);
      }
      if(route==='admin/releases'){
        if(request.method==='GET')return json(await releases.list());
        if(request.method!=='POST')return json({error:'Method not allowed'},405);
        checkOrigin(request,publicOrigin);return json(await releases.publish(c,await readBody(request,524288)));
      }
      if (route === 'admin/jobs') {
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405); checkOrigin(request,publicOrigin);
        const body = await readBody(request), targets = [...new Set(Array.isArray(body.targets) ? body.targets : [])].sort();
        if (!GUID.test(body.requestId || '') || !ACTIONS.includes(body.action) || targets.length < 1 || targets.length > 33 || targets.some(n => !EXPECTED_NAMES.includes(n))) fail(400, 'invalid_command', 'Comando o equipos no válidos.');
        if(body.action==='thaw-reboot'&&(!Number.isInteger(body.rebootCount)||body.rebootCount<1||body.rebootCount>99))fail(400,'invalid_reboot_count','Elige entre 1 y 99 reinicios.');
        if(['freeze-reboot','thaw-reboot'].includes(body.action)){
          const polls=await store.listPolls(450),latest=new Map();for(const poll of polls)if(!latest.has(poll.name)||poll.sequence>latest.get(poll.name).sequence)latest.set(poll.name,poll);
          const unsupported=targets.filter(name=>{const v=latest.get(name)?.payload?.status?.version||'';const n=v.split('.').map(Number);return !/^\d+\.\d+\.\d+$/.test(v)||n[0]<1||(n[0]===1&&n[1]<9);});
          if(unsupported.length)fail(409,'agent_update_required','Actualice el servicio en: '+unsupported.join(', '));
        }
        if(['maintenance-enter','student-return'].includes(body.action)){
          const polls=await store.listPolls(450),latest=new Map();for(const poll of polls)if(!latest.has(poll.name)||poll.sequence>latest.get(poll.name).sequence)latest.set(poll.name,poll);
          const unsupported=targets.filter(name=>{const v=latest.get(name)?.payload?.status?.version||'';return !/^\d+\.\d+\.\d+$/.test(v)||Number(v.split('.')[0])<1||(Number(v.split('.')[0])===1&&Number(v.split('.')[1])<6);});
          if(unsupported.length)fail(409,'agent_update_required','Actualice el servicio en: '+unsupported.join(', '));
          if(body.action==='maintenance-enter'){const sources=await credentialSources();if(targets.some(name=>!sources[name]))fail(409,'credential_missing','Falta configurar la credencial de mantenimiento.');}
        }
        const targetsHash = await sha256Hex(JSON.stringify({ action:body.action,targets,...(body.action==='thaw-reboot'?{rebootCount:body.rebootCount}:{}) }));
        let existing = await store.jobsByRequest(body.requestId);
        if (existing.some(j => j.action !== body.action || j.targetsHash !== targetsHash || !targets.includes(j.name))) fail(409, 'request_id_conflict', 'El identificador ya corresponde a otro comando.');
        const additional = targets.filter(name => !existing.some(j => j.name === name)).length;
        let current = await store.listJobs(550);
        if (additional && current.length + additional > 500) {
          await sweep(true);
          current = await store.listJobs(550);
          if (current.length + additional > 500) fail(429, 'history_full', 'El historial de comandos alcanzó su límite. Espere a que caduquen y se limpien los comandos pendientes.');
        }
        if (additional && current.filter(j => j.expiresAt > now()).length + additional > 250) fail(429, 'queue_full', 'Hay demasiados comandos pendientes. Espere a que terminen o caduquen.');
        const issuedAt=now(), expiresAt=issuedAt+300000, issuedUtc = new Date(issuedAt).toISOString(), expiresUtc = new Date(expiresAt).toISOString();
        const missing = await Promise.all(targets.filter(n => !existing.some(j => j.name === n)).map(async name => ({ _id: await deterministicId(`job:${body.requestId}:${name}`), name, action: body.action, ...(body.action==='thaw-reboot'?{rebootCount:body.rebootCount}:{}), requestId: body.requestId, targetsHash, issuedAt, expiresAt, issuedUtc, expiresUtc })));
        if (missing.length) await store.insertJobs(missing);
        existing = await store.jobsByRequest(body.requestId);
        if (existing.length !== targets.length || existing.some(j => j.action !== body.action)) fail(503, 'command_storage_incomplete', 'No se guardaron todos los comandos. Reintente la misma solicitud.');
        await sweep(); return json({ jobs: existing.map(j => ({ name: j.name, ...wireJob(j), state: j.expiresAt <= now() ? 'expired' : 'queued' })) });
      }
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      if (error instanceof ControlError||error instanceof ReleaseError) return json({ error: error.message, code: error.code }, error.status);
      console.error('UEPLV control request failed:', error?.name || 'Error', error?.message?.slice(0, 180) || 'Unavailable');
      return json({ error: 'El servicio no está disponible temporalmente. Revise la conexión y reintente.', code: 'service_unavailable' }, 503);
    }
  };
}
