// Private classroom chat. Client identities and permissions are server-owned.
export const CHAT_POLICY_ID='76b2317f-84e4-4c70-b6ee-e1f37c6689e1';
export const CHAT_MODES=Object.freeze(['teacher-student','teacher-only','students']);
const GUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const enc=new TextEncoder();
export function createChat(store,{now,fail,json,deterministicId,protect,unprotect,fromBase64,expectedNames}){
  const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const decode=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
  async function signingKey(c){return crypto.subtle.importKey('raw',fromBase64(c.sessionSecret,128),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
  async function token(c,claims){const payload=encode(enc.encode(JSON.stringify(claims)));return payload+'.'+encode(new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(c),enc.encode(payload))));}
  async function policy(){return (await store.getConfig(CHAT_POLICY_ID))?.policy||{revision:'default',devices:{}};}
  async function boot(name){return store.getChat(await deterministicId('chat-boot:'+name));}
  function mode(p,b){const grant=p.devices?.[b?.name];return grant&&grant.bootTicks===b.bootTicks&&CHAT_MODES.includes(grant.mode)?grant.mode:'teacher-student';}
  async function student(c,bearer){
    try{
      if(typeof bearer!=='string'||bearer.length>2048)throw Error();
      const [payload,signature,...extra]=bearer.split('.');if(extra.length||!payload||!signature)throw Error();
      if(!await crypto.subtle.verify('HMAC',await signingKey(c),decode(signature),enc.encode(payload)))throw Error();
      const s=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(payload)));
      if(s.purpose!=='ueplv-chat-student'||!expectedNames.includes(s.name)||!GUID.test(s.deviceId)||!/^\d{17,19}$/.test(s.bootTicks)||!Number.isSafeInteger(s.exp)||s.exp<=now()||s.exp>now()+86400000+60000)throw Error();
      const b=await boot(s.name);if(!b||b.deviceId!==s.deviceId||b.bootTicks!==s.bootTicks)throw Error();
      return {name:s.name,boot:b};
    }catch{fail(401,'chat_session_required','Chat sin conexión.');}
  }
  function mayContact(actor,other,p,boots,write){
    if(other===actor.name)return false;
    if(actor.name==='teacher')return expectedNames.includes(other);
    const mine=boots.find(b=>b.name===actor.name);
    if(other==='teacher')return !write||mode(p,mine)!=='teacher-only';
    const peer=boots.find(b=>b.name===other);
    return !!peer&&mode(p,mine)==='students'&&mode(p,peer)==='students';
  }
  let sweepAt=0;
  async function sweep(){if(now()<sweepAt)return;sweepAt=now()+60000;const expired=await store.expiredChat(now());await store.removeChat(expired.map(x=>x._id));}
  return {
    async enroll(c,envelope){
      const name=envelope?.name,key=c.deviceKeys[name];if(!expectedNames.includes(name)||!key)fail(403,'device_authentication_failed','Equipo no autorizado.');
      let p;try{p=await unprotect(name,key,envelope);}catch{fail(403,'device_authentication_failed','Equipo no autorizado.');}
      if(p.purpose!=='chat-enroll'||!GUID.test(p.requestId)||!GUID.test(p.deviceId)||!/^\d{17,19}$/.test(p.bootTicks)||!Number.isFinite(Date.parse(p.sentUtc))||Math.abs(now()-Date.parse(p.sentUtc))>120000)fail(400,'invalid_chat_enrollment','Solicitud no válida.');
      const device=await store.getDevice(await deterministicId('device:'+name));if(device?.deviceId!==p.deviceId)fail(403,'device_identity_conflict','Equipo no autorizado.');
      const old=await boot(name),row={_id:await deterministicId('chat-boot:'+name),kind:'boot',name,deviceId:p.deviceId,bootTicks:p.bootTicks,createdAt:now()};
      if(old&&BigInt(old.bootTicks)>BigInt(p.bootTicks))fail(409,'old_boot','Inicio anterior rechazado.');
      if(!old||old.bootTicks!==p.bootTicks||old.deviceId!==p.deviceId)await store.saveChatBoot(row);
      return json(await protect(name,key,{accepted:true,requestId:p.requestId,purpose:'chat-session',token:await token(c,{purpose:'ueplv-chat-student',name,deviceId:p.deviceId,bootTicks:p.bootTicks,exp:now()+86400000}),expiresUtc:new Date(now()+86400000).toISOString()}));
    },
    async handle(c,body,staff){
      const actor=staff?{name:'teacher'}:await student(c,body?.token);
      const [p,boots]=await Promise.all([policy(),store.listChatBoots()]);
      if(body?.op==='configure'){
        if(!staff)fail(403,'staff_required','Acceso denegado.');
        if(!CHAT_MODES.includes(body.mode)||!Array.isArray(body.targets)||!body.targets.length||body.targets.length>34||body.targets.some(n=>!expectedNames.includes(n)))fail(400,'invalid_chat_mode','Configuración no válida.');
        const devices={};for(const name of new Set(body.targets)){const b=boots.find(x=>x.name===name);if(b)devices[name]={mode:body.mode,bootTicks:b.bootTicks};}
        const next={revision:crypto.randomUUID(),devices};await store.savePolicy(CHAT_POLICY_ID,next);return json({saved:true,unavailable:body.targets.filter(name=>!devices[name]),...next});
      }
      if(body?.op==='send'){
        if(!GUID.test(body.requestId)||typeof body.text!=='string'||!body.text.trim()||body.text.length>2000||!Array.isArray(body.recipients)||!body.recipients.length||body.recipients.length>34)fail(400,'invalid_chat_message','Mensaje no válido.');
        const recipients=[...new Set(body.recipients)];if(recipients.some(to=>!mayContact(actor,to,p,boots,true)))fail(403,'chat_not_allowed','Este chat no está permitido.');
        const recent=await store.recentChatFrom(actor.name,now()-10000);if(new Set(recent.map(r=>r.requestId)).size>=8&&!recent.some(r=>r.requestId===body.requestId))fail(429,'chat_rate_limited','Espera unos segundos.');
        const rows=[];for(const recipient of recipients){
          const id=await deterministicId('chat-message:'+actor.name+':'+body.requestId+':'+recipient),existing=await store.getChat(id);
          if(existing){if(existing.body!==body.text.trim())fail(409,'chat_request_conflict','Solicitud repetida.');continue;}
          rows.push({_id:id,kind:'message',sender:actor.name,recipient,body:body.text.trim(),requestId:body.requestId,createdAt:now(),expiresAt:now()+86400000});
        }
        // Keep chat from exhausting the shared CMS space used by lab control.
        const history=await store.chatHistory();if(history.length+rows.length>200)await store.removeChat(history.slice(Math.max(0,200-rows.length)).map(x=>x._id));
        await store.insertChat(rows);await sweep();return json({sent:true,recipients});
      }
      if(body?.op!=='poll')fail(400,'invalid_chat_operation','Solicitud no válida.');
      const messages=await store.messagesFor(actor.name,now());
      const contacts=(staff?expectedNames:['teacher',...expectedNames]).filter(name=>mayContact(actor,name,p,boots,false)).map(name=>({name,canSend:mayContact(actor,name,p,boots,true)}));
      return json({name:actor.name,mode:staff?'teacher':mode(p,actor.boot),revision:p.revision,...(staff?{deviceModes:Object.fromEntries(boots.map(b=>[b.name,mode(p,b)]))}:{}),contacts,messages:messages.filter(m=>mayContact(actor,m.sender===actor.name?m.recipient:m.sender,p,boots,false)).reverse().map(m=>({id:m._id,from:m.sender,to:m.recipient,text:m.body,utc:new Date(m.createdAt).toISOString()}))});
    }
  };
}
