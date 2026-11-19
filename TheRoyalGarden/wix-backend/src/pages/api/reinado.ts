import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { phases, canScore, validateMarks, latestScores } from '../../competition.mjs';

export const prerender = false;
const origins = new Set(['https://ueplv.com','https://www.ueplv.com','https://chiispiitas.github.io']);
const query = auth.elevate(items.query);
const insert = auth.elevate(items.insert);
const readOptions = {consistentRead:true};
const collections = {
  candidates:'RoyalGardenCandidates', access:'RoyalGardenAccess',
  scores:'RoyalGardenScores', finalists:'RoyalGardenFinalists'
};
const listing = async (collection:string) => {
  let page = await query(collection).limit(100).find(readOptions);
  const rows = [...page.items];
  while (page.hasNext()) { page = await page.next(); rows.push(...page.items); }
  return rows;
};
class Problem extends Error {
  constructor(public status:number,message:string){ super(message); }
}
async function digest(code:string) {
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));
  return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
}
const person = (r:any) => ({id:r._id,name:r.title,panel:r.panel});
const candidate = (r:any) => ({id:r._id,name:r.title,group:r.group,course:r.course,
  queen:r.queen || '',tutor:r.tutor,number:r.number});
const score = (r:any) => ({candidate:r.candidate,phase:r.phase,judge:r.judge,
  revision:r.revision,total:r.total,marks:JSON.parse(r.marks),comment:r.comment});
function headers(request:Request){
  const origin = request.headers.get('Origin') || '';
  return {'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
    ...(origins.has(origin) ? {'Access-Control-Allow-Origin':origin} : {}),
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
}
export const OPTIONS:APIRoute = ({request}) => new Response(null,{status:204,headers:headers(request)});
export const GET:APIRoute = ({request}) => new Response(JSON.stringify({app:'The Royal Garden',version:1}),{headers:headers(request)});
export const POST:APIRoute = async ({request}) => {
  const send = (data:unknown,status=200) => new Response(JSON.stringify(data),{status,headers:headers(request)});
  try {
    const origin = request.headers.get('Origin');
    if (origin && !origins.has(origin)) throw new Problem(403,'Abre la app desde el enlace oficial.');
    const raw = await request.text();
    if (raw.length > 10000) throw new Problem(413,'Solicitud demasiado larga.');
    let body:any;
    try { body=JSON.parse(raw); } catch { throw new Problem(400,'Solicitud inválida.'); }
    const code = typeof body?.code === 'string' ? body.code.trim().toLowerCase() : '';
    const field = /^[a-f0-9]{32}$/.test(code) ? 'hash' : /^[a-z]{3,20}[0-9]{6}$/.test(code) ? 'shortHash' : null;
    if (!field) throw new Problem(401,'Código de acceso inválido.');
    const access = await query(collections.access).eq(field,await digest(code)).limit(1).find(readOptions);
    if (!access.items.length) throw new Problem(401,'Código de acceso inválido.');
    const user = person(access.items[0]);
    if (!['mini','main','admin'].includes(user.panel)) throw new Problem(403,'Acceso no disponible.');
    if (!['state','score','finalists'].includes(body.action)) throw new Problem(400,'Acción inválida.');
    if ((body.action === 'finalists' && user.panel !== 'admin') ||
        (body.action === 'score' && user.panel === 'admin')) throw new Problem(403,'Acción no permitida.');
    const [candidateItems,finalItems] = await Promise.all([listing(collections.candidates),listing(collections.finalists)]);
    const candidates = candidateItems.map(candidate).filter(c=>user.panel==='admin'||c.group===user.panel).sort((a,b)=>a.number-b.number);
    const selection = finalItems.find(r=>r._id==='official-finalists');
    const finalists:string[] = user.panel==='mini' || !selection ? [] : JSON.parse(selection.candidates);
    if (body.action === 'state') {
      const [records, people] = await Promise.all([
        user.panel==='admin' ? listing(collections.scores) :
          query(collections.scores).eq('judge',user.id).limit(100).find(readOptions).then(async page=>{
            const rows = [...page.items];
            while (page.hasNext()) { page=await page.next(); rows.push(...page.items); }
            return rows;
          }),
        user.panel==='admin' ? listing(collections.access) : Promise.resolve([])
      ]);
      return send({user,candidates,finalists,phases,scores:latestScores(records).map(score),
        judges:people.map(person).filter(r=>r.panel!=='admin')});
    }
    if (body.action === 'finalists') {
      if (!Array.isArray(body.candidates) || !body.candidates.length || body.confirmed!==true ||
          new Set(body.candidates).size!==body.candidates.length ||
          !body.candidates.every((id:unknown)=>candidates.some(c=>c.id===id && c.group==='main')))
        throw new Problem(400,'Selecciona y confirma las finalistas del Reinado.');
      const selected = [...body.candidates].sort();
      if (selection) {
        if (JSON.stringify([...finalists].sort())===JSON.stringify(selected)) return send({ok:true});
        throw new Problem(409,'La lista de finalistas ya fue confirmada.');
      }
      try {
        await insert(collections.finalists,{_id:'official-finalists',title:'Finalistas confirmadas',candidates:JSON.stringify(selected)});
      } catch(error) {
        const current=(await query(collections.finalists).eq('_id','official-finalists').limit(1).find(readOptions)).items[0];
        if (!current) throw error;
        if (current.candidates!==JSON.stringify(selected)) throw new Problem(409,'La lista de finalistas ya fue confirmada.');
      }
      return send({ok:true});
    }
    const target = candidates.find(c=>c.id===body.candidate);
    if (!canScore(user.panel,body.phase,target,finalists)) throw new Problem(403,'Esta evaluación no está habilitada para tu jurado.');
    const validated = validateMarks(body.phase,body.marks);
    if (!validated) throw new Problem(400,'Completa todos los criterios con una puntuación válida.');
    if (typeof body.comment!=='string' || body.comment.length>1000 ||
        typeof body.requestId!=='string' || !/^[0-9a-f-]{36}$/.test(body.requestId) ||
        !Number.isSafeInteger(body.revision) || body.revision<0)
      throw new Problem(400,'Datos de la evaluación inválidos.');
    const existing = async () => (await query(collections.scores).eq('judge',user.id)
      .eq('phase',body.phase).eq('candidate',target!.id).descending('revision').limit(1).find(readOptions)).items[0];
    const previous = await existing();
    if (previous?.requestId===body.requestId) return send({score:score(previous)});
    if ((previous?.revision ?? 0)!==body.revision) throw new Problem(409,'La nota cambió. Recarga antes de volver a publicarla.');
    const revision = body.revision+1;
    const row = {_id:[target!.id,body.phase,user.id,revision].join('-'),title:target!.name+' · '+user.name,
      candidate:target!.id,phase:body.phase,judge:user.id,revision,total:validated.total,
      marks:JSON.stringify(validated.marks),comment:body.comment,requestId:body.requestId};
    try { await insert(collections.scores,row); } catch(error) {
      const latest = await existing();
      if (latest?.requestId===body.requestId) return send({score:score(latest)});
      if ((latest?.revision ?? 0)>=revision) throw new Problem(409,'La nota cambió. Recarga antes de volver a publicarla.');
      throw error;
    }
    return send({score:score(row)});
  } catch(error) {
    if (error instanceof Problem) return send({error:error.message},error.status);
    console.error('Royal Garden CMS',error instanceof Error ? error.message : String(error));
    return send({error:'No se pudo conectar con el CMS. Intenta de nuevo.'},503);
  }
};
