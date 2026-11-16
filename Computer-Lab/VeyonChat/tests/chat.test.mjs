import test from 'node:test';
import assert from 'node:assert/strict';
import {createControl,CONFIG_ID,protect,unprotect,sha256Hex,toBase64,deterministicId} from '../backend/control-core.mjs';
const KEY=toBase64(Uint8Array.from({length:64},(_,i)=>i));
class Store {
  rows=new Map();config=new Map();devices=new Map();
  async getConfig(id){return this.config.get(id)||null;}
  async savePolicy(id,policy){this.config.set(id,{policy:structuredClone(policy)});}
  async getDevice(id){return this.devices.get(id)||null;}
  async getChat(id){return this.rows.get(id)||null;}
  async saveChatBoot(row){this.rows.set(row._id,structuredClone(row));}
  async listChatBoots(){return [...this.rows.values()].filter(r=>r.kind==='boot');}
  async messagesFor(name,time){return [...this.rows.values()].filter(r=>r.kind==='message'&&r.expiresAt>time&&(r.sender===name||r.recipient===name)).sort((a,b)=>b.createdAt-a.createdAt).slice(0,100);}
  async recentChatFrom(name,since){return [...this.rows.values()].filter(r=>r.kind==='message'&&r.sender===name&&r.createdAt>since);}
  async insertChat(rows){for(const row of rows)if(!this.rows.has(row._id))this.rows.set(row._id,structuredClone(row));}
  async expiredChat(time){return [...this.rows.values()].filter(r=>r.kind==='message'&&r.expiresAt<=time);}
  async chatHistory(){return [...this.rows.values()].filter(r=>r.kind==='message').sort((a,b)=>b.createdAt-a.createdAt);}
  async removeChat(ids){ids.forEach(id=>this.rows.delete(id));}
}
async function setup(){
  const store=new Store();let time=Date.now();const pass='test-only-long-chat-password';
  store.config.set(CONFIG_ID,{schemaVersion:1,adminTokenHash:await sha256Hex(pass),sessionSecret:toBase64(new Uint8Array(32).fill(42)),deviceKeys:{'UEPLV-01':KEY,'UEPLV-02':KEY}});
  for(const n of ['UEPLV-01','UEPLV-02'])store.devices.set(await deterministicId('device:'+n),{deviceId:'8b469a00-d12f-4bc6-a8c6-35e693039a91'});
  const handle=createControl(store,{now:()=>time});let cookie;
  async function call(route,body,staff=false,origin='https://chat.test'){const r=await handle(new Request('https://chat.test/api/'+route,{method:'POST',headers:{'content-type':'application/json',origin,...(staff?{cookie}: {})},body:JSON.stringify(body)}),route);return {status:r.status,body:await r.json(),headers:r.headers};}
  const login=await call('admin/session',{token:pass});cookie=login.headers.get('set-cookie').split(';')[0];
  async function enroll(name='UEPLV-01',bootTicks='638900000000000000'){
    const req={purpose:'chat-enroll',requestId:crypto.randomUUID(),sentUtc:new Date(time).toISOString(),deviceId:'8b469a00-d12f-4bc6-a8c6-35e693039a91',bootTicks};
    const response=await call('agent/chat',await protect(name,KEY,req));assert.equal(response.status,200);return (await unprotect(name,KEY,response.body)).token;
  }
  const a=await enroll(),b=await enroll('UEPLV-02');
  const student=(token,body)=>call('chat/student',{token,...body});
  const staff=body=>call('admin/chat',body,true);
  const send=(token,to,text='Hola')=>student(token,{op:'send',recipients:[to],text,requestId:crypto.randomUUID()});
  const configure=(mode,targets=['UEPLV-01','UEPLV-02'])=>staff({op:'configure',mode,targets});
  return {store,call,student,staff,send,configure,enroll,a,b,advance:ms=>{time+=ms;}};
}
test('default: teacher/student replies work; peers and spoofed sender denied',async()=>{const c=await setup();assert.equal((await c.send(c.a,'teacher')).status,200);assert.equal((await c.send(c.a,'UEPLV-02')).status,403);assert.equal((await c.student(c.a,{op:'poll'})).body.contacts.length,1);assert.equal((await c.student(c.a,{op:'configure',mode:'students',targets:['UEPLV-01']})).status,403);const reply=await c.staff({op:'send',recipients:['UEPLV-01'],text:'Respuesta',requestId:crypto.randomUUID(),sender:'UEPLV-02'});assert.equal(reply.status,200);assert.ok((await c.student(c.a,{op:'poll'})).body.messages.some(m=>m.from==='teacher'&&m.text==='Respuesta'));});
test('one-way mode blocks every student send but still delivers teacher messages',async()=>{const c=await setup();await c.configure('teacher-only');assert.equal((await c.send(c.a,'teacher')).status,403);assert.equal((await c.send(c.a,'UEPLV-02')).status,403);await c.staff({op:'send',recipients:['UEPLV-01'],text:'Anuncio',requestId:crypto.randomUUID()});const p=await c.student(c.a,{op:'poll'});assert.equal(p.body.contacts[0].canSend,false);assert.equal(p.body.messages[0].text,'Anuncio');});
test('peer list requires grants for both PCs and reads stay private',async()=>{const c=await setup();await c.configure('students',['UEPLV-01']);assert.equal((await c.send(c.a,'UEPLV-02')).status,403);await c.configure('students');assert.equal((await c.send(c.a,'UEPLV-02')).status,200);assert.ok((await c.student(c.b,{op:'poll'})).body.messages.some(m=>m.from==='UEPLV-01'));assert.ok((await c.student(c.a,{op:'poll'})).body.contacts.some(m=>m.name==='UEPLV-02'));assert.equal((await c.student(c.a,{op:'send',recipients:['UEPLV-03'],text:'no',requestId:crypto.randomUUID()})).status,403);});
test('restart revokes old token and temporary grant without affecting other PC',async()=>{const c=await setup();await c.configure('students');const token=await c.enroll('UEPLV-01','638900000010000000');assert.equal((await c.student(c.a,{op:'poll'})).status,401);assert.equal((await c.send(token,'teacher')).status,200);assert.equal((await c.send(token,'UEPLV-02')).status,403);assert.equal((await c.send(c.b,'UEPLV-01')).status,403);assert.equal((await c.student(token,{op:'poll'})).body.mode,'teacher-student');});
test('renewing same boot keeps grant; next config replaces it immediately',async()=>{const c=await setup();await c.configure('students');const token=await c.enroll();assert.equal((await c.send(token,'UEPLV-02')).status,200);await c.configure('teacher-student',['UEPLV-02']);assert.equal((await c.send(token,'UEPLV-02')).status,403);assert.equal((await c.student(token,{op:'poll'})).body.contacts.length,1);});
test('retries deduplicate and altered duplicate cannot overwrite a message',async()=>{const c=await setup(),body={op:'send',recipients:['teacher'],text:'Hola',requestId:crypto.randomUUID()};assert.equal((await c.student(c.a,body)).status,200);assert.equal((await c.student(c.a,body)).status,200);assert.equal((await c.student(c.a,{...body,text:'Cambio'})).status,409);assert.equal([...c.store.rows.values()].filter(r=>r.kind==='message').length,1);});
test('staff authentication/origin and token tampering/expiry are enforced',async()=>{const c=await setup();assert.equal((await c.call('admin/chat',{op:'poll'})).status,401);assert.equal((await c.call('admin/chat',{op:'poll'},true,'https://evil.test')).status,403);assert.equal((await c.student(c.a+'broken',{op:'poll'})).status,401);c.advance(86400001);assert.equal((await c.student(c.a,{op:'poll'})).status,401);});
test('expired messages disappear; malformed and overlong messages are rejected',async()=>{const c=await setup();await c.send(c.a,'teacher');assert.equal((await c.send(c.a,'teacher','a'.repeat(2001))).status,400);assert.equal((await c.send(c.a,'teacher','   ')).status,400);c.advance(86400001);const token=await c.enroll();assert.equal((await c.student(token,{op:'poll'})).body.messages.length,0);});
test('chat retention reserves CMS capacity for lab controls',async()=>{const c=await setup();for(let i=0;i<250;i++)c.store.rows.set('history-'+i,{_id:'history-'+i,kind:'message',sender:'teacher',recipient:'UEPLV-02',body:'old',requestId:'old-'+i,createdAt:i,expiresAt:Date.now()+86400000});assert.equal((await c.send(c.a,'teacher','new')).status,200);assert.equal((await c.store.chatHistory()).length,200);assert.equal((await c.store.listChatBoots()).length,2);});
