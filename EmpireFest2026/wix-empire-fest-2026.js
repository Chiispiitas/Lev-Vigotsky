// Install as backend/empire-fest-2026.js. Existing backend files remain intact.
import { response } from 'wix-http-functions';
import wixData from 'wix-data';
import { createHash } from 'crypto';
import { RUBRICS, validateScores } from 'backend/empire-fest-rubrics';

const EF_PARTICIPANTS='EmpireFest2026Participants';
const EF_SCORES='EmpireFest2026Scores';
const EF_ACCESS='EmpireFest2026Access';
const EF_OPTIONS={suppressAuth:true,consistentRead:true};
function efResponse(status,body){return response({status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'https://chiispiitas.github.io','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'},body:JSON.stringify(body)});}
function efError(message,status=400){const error=new Error(message);error.status=status;throw error;}
function efText(value,max){if(typeof value!=='string'||!value.trim()||value.length>max)efError('Datos de texto inválidos.');return value.trim();}
function efParticipant(p){return {_id:p._id,number:p.number,name:p.name,empire:p.empire,category:p.category};}
function efRecord(r){return {_id:r._id,participantId:r.participantId,rubricId:r.rubricId,judgeName:r.judgeName,scores:r.scores,total:r.total,comment:r.comment,evaluationDate:r.evaluationDate,_createdDate:r._createdDate};}
async function efAll(query){let result=await query.limit(1000).find(EF_OPTIONS);const items=[...result.items];while(result.hasNext()){result=await result.next();items.push(...result.items);if(items.length>20000)efError('El evento excede el límite de consulta. Contacta a la organización.',503);}return items;}
async function efAuthorize(code){
  if(typeof code!=='string'||!/^([a-f0-9]{24})$/.test(code.trim()))efError('Código de acceso inválido.',403);
  const hash=createHash('sha256').update(code.trim()).digest('hex');
  const found=await wixData.query(EF_ACCESS).eq('codeHash',hash).limit(1).find(EF_OPTIONS);
  if(!found.items.length)efError('Código de acceso inválido.',403);
  const user=found.items[0];
  if(user.role!=='admin'&&(user.role!=='judge'||!RUBRICS.some(r=>r.id===user.rubricId)))efError('Acceso no habilitado.',403);
  return user;
}
export function options_empireFest2026(){return efResponse(200,{ok:true});}
export async function post_empireFest2026(request){
  try{
    const text=await request.body.text();if(text.length>16000)efError('Solicitud demasiado grande.');
    let body;try{body=JSON.parse(text);}catch{efError('Solicitud inválida.');}
    const user=await efAuthorize(body.code);
    if(body.action==='bootstrap'){
      const [participants,records]=await Promise.all([
        efAll(wixData.query(EF_PARTICIPANTS).ascending('number')),
        efAll(user.role==='admin'?wixData.query(EF_SCORES).descending('_createdDate'):wixData.query(EF_SCORES).eq('rubricId',user.rubricId).descending('_createdDate'))
      ]);
      return efResponse(200,{ok:true,user:{title:user.title,role:user.role,rubricId:user.rubricId},participants:participants.map(efParticipant),records:records.map(efRecord)});
    }
    if(body.action==='addParticipant'){
      if(user.role!=='admin')efError('Solo la organización puede registrar participantes.',403);
      const p=body.participant||{};
      if(!Number.isInteger(p.number)||p.number<1||p.number>9999)efError('Número de participante inválido.');
      if(!['Miss','Míster'].includes(p.category))efError('Categoría inválida.');
      const participant={_id:`participant-${p.number}`,title:`${p.number}. ${efText(p.name,160)}`,number:p.number,name:efText(p.name,160),empire:efText(p.empire,120),category:p.category};
      // A stable ID makes duplicate numbers fail atomically, even with concurrent organizers.
      const existing=await wixData.query(EF_PARTICIPANTS).eq('_id',participant._id).limit(1).find(EF_OPTIONS);
      if(existing.items.length)efError('Ese número de participante ya está registrado.');
      try{const saved=await wixData.insert(EF_PARTICIPANTS,participant,EF_OPTIONS);return efResponse(200,{ok:true,participant:efParticipant(saved)});}catch{efError('No se pudo registrar. Actualiza la lista antes de reintentar.',409);}
    }
    if(body.action==='submit'){
      if(user.role!=='judge')efError('Solo el jurado puede publicar su evaluación.',403);
      const raw=body.record||{};
      if(raw.rubricId!==user.rubricId)efError('No puedes calificar otra rúbrica.',403);
      if(typeof raw._id!=='string'||!/^[a-f0-9-]{36}$/.test(raw._id))efError('Identificador de publicación inválido.');
      if(typeof raw.evaluationDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw.evaluationDate)||Number.isNaN(Date.parse(raw.evaluationDate))||new Date(raw.evaluationDate).toISOString().slice(0,10)!==raw.evaluationDate)efError('Fecha de evaluación inválida.');
      let total;try{total=validateScores(user.rubricId,raw.scores);}catch(error){efError(error.message);}
      const rubric=RUBRICS.find(r=>r.id===user.rubricId),scores=Object.fromEntries(rubric.criteria.map(c=>[c.id,raw.scores[c.id]]));
      const participantId=efText(raw.participantId,100),comment=typeof raw.comment==='string'?raw.comment.trim():'';if(comment.length>2000)efError('La observación es demasiado larga.');
      const participant=await wixData.query(EF_PARTICIPANTS).eq('_id',participantId).limit(1).find(EF_OPTIONS);if(!participant.items.length)efError('Participante no encontrado.');
      const record={_id:raw._id,title:`${participant.items[0].number}. ${participant.items[0].name} · ${rubric.short}`,participantId,rubricId:user.rubricId,judgeName:user.title,scores,total,comment,evaluationDate:raw.evaluationDate};
      const existing=await wixData.query(EF_SCORES).eq('_id',raw._id).limit(1).find(EF_OPTIONS);
      if(existing.items.length){const old=existing.items[0];if(old.participantId!==record.participantId||old.rubricId!==record.rubricId||JSON.stringify(old.scores)!==JSON.stringify(record.scores)||old.comment!==record.comment||old.evaluationDate!==record.evaluationDate)efError('La publicación ya existe con otros datos.',409);return efResponse(200,{ok:true,record:efRecord(old)});}
      // New revisions are insert-only: preserve all history and never overwrite another judge.
      let saved;try{saved=await wixData.insert(EF_SCORES,record,EF_OPTIONS);}catch{
        const retry=await wixData.query(EF_SCORES).eq('_id',raw._id).limit(1).find(EF_OPTIONS);if(!retry.items.length)throw new Error('Insert failed');
        const old=retry.items[0];if(old.participantId!==record.participantId||old.rubricId!==record.rubricId||JSON.stringify(old.scores)!==JSON.stringify(record.scores)||old.comment!==record.comment||old.evaluationDate!==record.evaluationDate)efError('Conflicto de publicación.',409);saved=old;
      }
      return efResponse(200,{ok:true,record:efRecord(saved)});
    }
    efError('Acción inválida.');
  }catch(error){return efResponse(error.status||500,{ok:false,error:error.status?error.message:'No se pudo completar la operación en Wix. Conserva tu borrador y reintenta.'});}
}
