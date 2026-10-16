import {readTabSession,writeTabSession,clearTabSession} from './session.js?v=20261016-organizacion';
import {RUBRICS,validateScores,latestScores,consolidate,CATEGORIES,rankedRows} from './rubrics.js?v=20261015-mini';
const ENDPOINT='https://chiispiitas.wixsite.com/mr-david-collection/_functions/empireFest2026';
const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=value=>Number(value).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2});
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let state={features:{},user:null,code:'',participants:[],records:[],selected:null,view:'evaluate',category:'all',search:''};
let draft={},busy=false;
let storageWarning=false;
const storage={get(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{storageWarning=true;return null;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{storageWarning=true;return false;}}};
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4500);}
async function api(action,fields={}){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action,code:state.code,...fields}),signal:controller.signal});
    let data;try{data=await response.json();}catch{throw new Error('El servicio Wix todavía no está disponible. Tu borrador permanece en este dispositivo.');}
    if(!response.ok||!data.ok){const error=new Error(data.error||'No se pudo completar la operación.');error.status=response.status;throw error;}
    return data;
  }catch(error){if(error.name==='AbortError')throw new Error('Wix tardó demasiado en responder. Tu borrador se conserva; puedes reintentar.');if(error instanceof TypeError)throw new Error('No se pudo conectar con Wix. Revisa tu conexión; tu borrador se conserva.');throw error;}finally{clearTimeout(timeout);}
}
function draftKey(){return `empirefest2026:live:${state.user?.rubricId}:${encodeURIComponent(state.user?.title||'')}:${state.selected}`;}
function saveDraft(){draft.dirty=true;const saved=storage.set(draftKey(),draft);const node=$('#draftStatus');if(node)node.textContent=saved?'Borrador guardado en este dispositivo.':'No se pudo guardar el borrador. Mantén esta página abierta.';}
function loadDraft(){
  const saved=latestScores(state.records).find(r=>r.participantId===state.selected&&r.rubricId===state.user.rubricId);
  const local=storage.get(draftKey());
  draft=local?.dirty?local:{scores:saved?{...saved.scores}:{},comment:saved?.comment||'',evaluationDate:saved?.evaluationDate||today(),dirty:false,published:!!saved,submissionId:saved?._id};
}
$('#loginForm').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;$('#loginStatus').textContent='Conectando con Wix…';$('#loginStatus').className='';
  state.code=$('#code').value.trim();
  try{const data=await api('bootstrap');applyBootstrap(data);$('#code').value='';showWorkspace();}
  catch(error){state.code='';$('#loginStatus').textContent=error.message;$('#loginStatus').className='error';}finally{button.disabled=false;}
});
$('#logout').onclick=()=>{clearTabSession();state.code='';state.user=null;$('#workspace').hidden=true;$('#login').hidden=false;$('#logout').hidden=true;$('#loginStatus').textContent='';};
function rememberSession(){if(state.user&&state.code)writeTabSession({code:state.code,selected:state.selected,view:state.view,category:state.category,search:state.search});}
function applyBootstrap(data,previous={}){
  state.user=data.user;state.participants=data.participants;state.records=data.records;state.features=data.features||{};
  state.selected=state.participants.some(p=>p._id===previous.selected)?previous.selected:state.participants[0]?._id;
  const views=state.user.role==='admin'?['results','participants']:['evaluate','history'];
  state.view=views.includes(previous.view)?previous.view:views[0];
  state.category=['all',...CATEGORIES].includes(previous.category)?previous.category:'all';state.search=previous.search||'';
  if(state.user.role==='judge')loadDraft();else draft={};
}
async function restoreSession(){
  const saved=readTabSession();if(!saved)return;
  const button=$('#loginForm button');button.disabled=true;$('#loginStatus').textContent='Restableciendo sesión…';state.code=saved.code;
  try{const data=await api('bootstrap');applyBootstrap(data,saved);showWorkspace();$('#loginStatus').textContent='';}
  catch(error){if(error.status===401||error.status===403)clearTabSession();state.code='';$('#loginStatus').textContent=error.message;$('#loginStatus').className='error';}
  finally{button.disabled=false;}
}
window.addEventListener('pagehide',rememberSession);
function showWorkspace(){
  $('#login').hidden=true;$('#workspace').hidden=false;$('#logout').hidden=false;
  $('#modeLabel').textContent=state.user.role==='admin'?'ORGANIZACIÓN · EMPIRE FEST 2026':'JURADO · EMPIRE FEST 2026';
  $('#welcome').textContent=state.user.title;
  const rubric=RUBRICS.find(r=>r.id===state.user.rubricId);
  $('#specialty').textContent=state.user.role==='admin'?'Participantes y consolidado de las tres rúbricas.':rubric.title+' · '+rubric.specialty;
  $('#connection').textContent='Conectado';$('#connection').className='connection';
  renderNav();renderView();
}
function renderNav(){
  const views=state.user.role==='admin'?[['results','Consolidado'],['participants','Participantes']]:[['evaluate','Evaluar'],['history','Mis evaluaciones']];
  $('#navigation').innerHTML=views.map(([id,label])=>`<button data-view="${id}" class="${state.view===id?'active':''}">${label}</button>`).join('')+(state.user.role==='admin'?'<button id="reloadOrganization" class="outline" type="button">Recargar</button>':'');
  $('#navigation').querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{state.view=button.dataset.view;renderNav();renderView();});if($('#reloadOrganization'))$('#reloadOrganization').onclick=refresh;
}
function renderView(){
  rememberSession();
  if(state.view==='evaluate')renderEvaluation();else if(state.view==='results')renderResults();else if(state.view==='participants')renderParticipants();else renderHistory();
}
function selectedParticipant(){return state.participants.find(p=>p._id===state.selected);}
function listMarkup(){
  const found=state.participants.filter(p=>(state.category==='all'||p.category===state.category)&&(`${p.name} ${p.course||''} ${p.empire} ${p.number}`).toLocaleLowerCase().includes(state.search.toLocaleLowerCase()));
  return found.map(p=>{const saved=latestScores(state.records).some(s=>s.participantId===p._id&&s.rubricId===state.user.rubricId);return `<button class="participant-button ${p._id===state.selected?'selected':''}" data-participant="${esc(p._id)}"><b>${p.number.toString().padStart(2,'0')}</b>${esc(p.name)}<small>${esc(p.category)} · ${esc(p.course||'Sin curso')} · ${esc(p.empire)} ${saved?'· Publicado':''}</small></button>`;}).join('')||'<p class="note">No hay participantes para esta búsqueda.</p>';
}
function wireParticipantList(){document.querySelectorAll('[data-participant]').forEach(button=>button.onclick=()=>{state.selected=button.dataset.participant;loadDraft();renderEvaluation();});}
function renderEvaluation(){
  const rubric=RUBRICS.find(r=>r.id===state.user.rubricId),p=selectedParticipant();
  $('#view').innerHTML=`<div class="evaluation-layout"><aside class="side"><div class="panel"><p class="eyebrow">PARTICIPANTES</p><h2>Elige a quién evaluar</h2><label for="search">Buscar nombre, curso o imperio</label><input id="search" type="search" placeholder="Buscar participante…" value="${esc(state.search)}"><label for="category">Categoría</label><select id="category"><option value="all">Todas las categorías</option>${CATEGORIES.map(c=>`<option>${esc(c)}</option>`).join('')}</select><div class="participant-list" id="participantList">${listMarkup()}</div></div><div class="panel"><p class="eyebrow">TU ESPECIALIDAD</p><h3>${esc(rubric.short)}</h3><p>Tu evaluación es individual e independiente. Cada criterio empieza sin calificación.</p><button id="refresh" class="outline">Actualizar participantes</button></div></aside><div>${p?evaluationMarkup(p,rubric):'<div class="panel empty"><h2>Aún no hay participantes</h2><p>La organización puede registrar los candidatos desde su acceso personal.</p></div>'}</div></div>`;
  $('#category').value=state.category;$('#search').oninput=event=>{state.search=event.target.value;$('#participantList').innerHTML=listMarkup();wireParticipantList();};$('#category').onchange=event=>{state.category=event.target.value;$('#participantList').innerHTML=listMarkup();wireParticipantList();};wireParticipantList();$('#refresh').onclick=refresh;
  if(!p)return;
  document.querySelectorAll('[data-score]').forEach(button=>button.onclick=()=>{const id=button.dataset.criterion;draft.scores[id]=Number(button.dataset.score);saveDraft();updateScore();});
  document.querySelectorAll('[data-custom]').forEach(input=>input.oninput=()=>{draft.scores[input.dataset.custom]=input.value===''?null:Number(input.value);saveDraft();updateScore(false);});
  $('#comment').oninput=event=>{draft.comment=event.target.value;saveDraft();};$('#date').onchange=event=>{draft.evaluationDate=event.target.value;saveDraft();};$('#publish').onclick=publish;
  updateScore();
}
function evaluationMarkup(p,rubric){return `<div class="score-card"><div><p class="eyebrow">${esc(p.category)} · ${esc(p.course||'Sin curso')} · ${esc(p.empire)}</p><strong id="scoreTotal">— / 10</strong><small id="scoreProgress"></small></div><div class="ring" id="scoreRing">0/${rubric.criteria.length}</div></div><div class="panel"><div class="rubric-head"><div><p class="eyebrow">PARTICIPANTE ${p.number.toString().padStart(2,'0')}</p><h2>${esc(p.name)}</h2></div><span class="badge">Máximo 10 puntos</span></div><div class="form-grid"><div><label for="date">Fecha de evaluación</label><input id="date" type="date" value="${esc(draft.evaluationDate)}" required></div><div><label>Jurado conectado</label><p>${esc(state.user.title)}</p></div></div>${rubric.question?`<div class="guide"><p class="eyebrow">PREGUNTA GENERAL</p><p class="question">${esc(rubric.question)}</p></div>`:''}<details><summary>Orientación para el jurado</summary><p>${esc(rubric.guide)}</p></details>${rubric.criteria.map((c,i)=>`<section class="criterion"><div class="criterion-title"><h3>${i+1}. ${esc(c.title)}</h3><span class="max">${c.max} puntos</span></div><p>${esc(c.description)}</p><div class="score-options" role="group" aria-label="${esc(c.title)}">${Array.from({length:c.max*2+1},(_,n)=>n/2).map(value=>`<button data-score="${value}" data-criterion="${c.id}" aria-label="${esc(c.title)}: ${value} puntos" aria-pressed="false">${value.toLocaleString('es-EC')}</button>`).join('')}</div><div class="custom-score"><label for="custom-${c.id}">Puntaje exacto (0 a ${c.max})</label><input id="custom-${c.id}" data-custom="${c.id}" type="number" min="0" max="${c.max}" step="0.01" inputmode="decimal" value="${draft.scores[c.id]??''}"></div></section>`).join('')}<label for="comment">Observaciones (opcional)</label><textarea id="comment" rows="3" maxlength="2000" placeholder="Comentarios sobre esta presentación…">${esc(draft.comment)}</textarea><div class="actions"><button id="publish" class="primary">Publicar mi evaluación →</button></div><p id="draftStatus" class="status-line">${storageWarning?'No se puede guardar localmente. Mantén esta página abierta.':draft.dirty?'Borrador guardado en este dispositivo.':draft.published?'Evaluación publicada. Puedes crear una nueva versión si necesitas corregirla.':'Completa todos los criterios antes de publicar.'}</p><p class="note">Los valores de 0,5 son accesos rápidos; también puedes ingresar cualquier puntaje con hasta dos decimales.</p></div>`;}
function updateScore(updateInputs=true){
  const rubric=RUBRICS.find(r=>r.id===state.user.rubricId),valid=c=>typeof draft.scores[c.id]==='number'&&Number.isFinite(draft.scores[c.id])&&draft.scores[c.id]>=0&&draft.scores[c.id]<=c.max&&Math.abs(draft.scores[c.id]*100-Math.round(draft.scores[c.id]*100))<1e-7;
  const count=rubric.criteria.filter(valid).length,total=rubric.criteria.reduce((sum,c)=>sum+(valid(c)?draft.scores[c.id]:0),0);
  $('#scoreTotal').textContent=(count?fmt(total):'—')+' / 10';$('#scoreProgress').textContent=count===rubric.criteria.length?'Rúbrica completa · lista para publicar':`${count} de ${rubric.criteria.length} criterios completos`;$('#scoreRing').textContent=`${count}/${rubric.criteria.length}`;
  document.querySelectorAll('[data-score]').forEach(button=>{const selected=draft.scores[button.dataset.criterion]===Number(button.dataset.score);button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  if(updateInputs)document.querySelectorAll('[data-custom]').forEach(input=>input.value=draft.scores[input.dataset.custom]??'');
}
async function confirmPublish(total){$('#confirmTitle').textContent='Publicar evaluación';$('#acceptConfirm').textContent='Confirmar publicación';$('#acceptConfirm').className='primary';return new Promise(resolve=>{
  $('#confirmText').textContent=`${selectedParticipant().name} · ${fmt(total)} / 10. Se guardará tu evaluación en Wix. Si ya publicaste una evaluación, esta será la vigente y se conservará la anterior en el historial.`;
  $('#confirm').showModal();const finish=value=>{$('#confirm').close();resolve(value);};$('#cancelConfirm').onclick=()=>finish(false);$('#acceptConfirm').onclick=()=>finish(true);$('#confirm').oncancel=event=>{event.preventDefault();finish(false);};
});}
async function publish(){
  if(busy)return;let total;
  try{total=validateScores(state.user.rubricId,draft.scores);if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.evaluationDate))throw new Error('Selecciona la fecha de evaluación.');}catch(error){toast(error.message);return;}
  if(!await confirmPublish(total))return;
  busy=true;$('#publish').disabled=true;
  // Reuse the same submission ID after an uncertain network result. Any edit creates a new revision.
  const fingerprint=JSON.stringify([draft.scores,draft.comment,draft.evaluationDate]);
  if(draft.fingerprint!==fingerprint){draft.submissionId=crypto.randomUUID();draft.fingerprint=fingerprint;storage.set(draftKey(),draft);}
  const record={_id:draft.submissionId,participantId:state.selected,rubricId:state.user.rubricId,scores:{...draft.scores},comment:draft.comment,evaluationDate:draft.evaluationDate};
  try{
    let saved;
    const data=await api('submit',{record});saved=data.record;state.records=state.records.filter(r=>r._id!==saved._id);state.records.push(saved);
    draft.dirty=false;draft.published=true;storage.set(draftKey(),draft);toast('Evaluación publicada en Wix.');renderEvaluation();
  }catch(error){toast(error.message);$('#draftStatus').textContent=error.message;$('#draftStatus').classList.add('error');}finally{busy=false;if($('#publish'))$('#publish').disabled=false;}
}
async function refresh(){
  const requestCode=state.code;const buttons=[$('#refresh'),$('#reloadOrganization')].filter(Boolean);buttons.forEach(b=>b.disabled=true);try{const data=await api('bootstrap');if(state.code!==requestCode||!state.user)return;applyBootstrap(data,{selected:state.selected,view:state.view,category:state.category,search:state.search});renderView();toast('Datos actualizados desde Wix.');}catch(error){toast(error.message);}finally{buttons.forEach(b=>b.disabled=false);}
}
function renderResults(){
  const rows=consolidate(state.participants,state.records),complete=rows.filter(r=>r.complete),evaluations=latestScores(state.records);
  $('#view').innerHTML=`<div class="stats"><div class="stat"><span>Participantes</span><strong>${rows.length}</strong></div><div class="stat"><span>Evaluaciones recibidas</span><strong>${evaluations.length} <small>/ ${rows.length*3}</small></strong></div><div class="stat"><span>Resultados completos</span><strong>${complete.length} <small>/ ${rows.length}</small></strong></div></div><div class="panel"><div class="toolbar"><div><p class="eyebrow">RESULTADOS</p><h2>Consolidado del evento</h2></div><select id="resultCategory" aria-label="Filtrar resultados"><option value="all">Todas las categorías</option>${CATEGORIES.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><p>Solo los participantes con las tres rúbricas completas reciben un total. Los empates conservan la misma posición.</p><div id="resultsTable"></div><div class="actions no-print"><button class="outline" id="refresh">Actualizar de Wix</button><button class="outline" id="exportCsv">Descargar CSV</button><button class="primary" id="print">Imprimir / guardar PDF</button></div><p class="note">Resultados de las evaluaciones publicadas en Wix. No se aplica ningún desempate automático.</p></div>`;
  $('#resultCategory').value=state.category;$('#resultCategory').onchange=event=>{state.category=event.target.value;renderResultsTable(rows);};renderResultsTable(rows);$('#refresh').onclick=refresh;$('#print').onclick=()=>window.print();$('#exportCsv').onclick=()=>exportCsv(rows);
}
function renderResultsTable(rows){$('#resultsTable').innerHTML=CATEGORIES.filter(c=>state.category==='all'||c===state.category).map(category=>`<h3>${category}</h3><div class="table-wrap"><table><thead><tr><th>Pos.</th><th>Participante</th><th>Curso</th>${RUBRICS.map(r=>`<th>${esc(r.short)}<br>/ 10</th>`).join('')}<th>Total / 30</th><th>Estado</th>${state.features.deleteScores?'<th class="no-print">Acciones</th>':''}</tr></thead><tbody>${rankedRows(rows,category).map(r=>`<tr><td>${r.rank}</td><td>${r.number}. ${esc(r.name)}<small>${esc(r.empire)}</small></td><td>${esc(r.course||'Sin curso')}</td>${r.evaluations.map(s=>`<td>${s?fmt(s.total):'—'}</td>`).join('')}<td class="score-total">${r.complete?fmt(r.total):'—'}</td><td>${r.complete?'Completo':r.count+'/3 · Pendiente'}</td>${state.features.deleteScores?`<td class="no-print"><button type="button" class="outline danger" data-delete-scores="${esc(r._id)}" ${r.count?'':'disabled'} aria-label="Eliminar puntuaciones de ${esc(r.name)}">Eliminar puntuaciones</button></td>`:''}</tr>`).join('')||'<tr><td colspan="9">Sin participantes en esta categoría.</td></tr>'}</tbody></table></div>`).join('');document.querySelectorAll('[data-delete-scores]').forEach(button=>button.onclick=()=>deleteParticipantScores(button.dataset.deleteScores));}
async function deleteParticipantScores(participantId){
  if(busy||state.user?.role!=='admin')return;
  const participant=state.participants.find(p=>p._id===participantId);
  if(!participant)return;
  const scoreIds=state.records.filter(r=>r.participantId===participantId).map(r=>r._id);
  if(!scoreIds.length){toast('Este concursante no tiene puntuaciones publicadas.');return;}
  $('#confirmTitle').textContent='Eliminar puntuaciones';
  $('#confirmText').textContent=`¿Eliminar todas las puntuaciones de ${participant.name} (${participant.category} · ${participant.empire})? Se eliminarán las evaluaciones de los tres jurados y sus versiones anteriores (${scoreIds.length} registros). El concursante seguirá inscrito y quedará pendiente de evaluación. Esta acción no se puede deshacer.`;
  $('#acceptConfirm').textContent='Sí, eliminar puntuaciones';$('#acceptConfirm').className='primary danger';
  const confirmed=await new Promise(resolve=>{
    const finish=value=>{$('#confirm').close();resolve(value);};
    $('#cancelConfirm').onclick=()=>finish(false);$('#acceptConfirm').onclick=()=>finish(true);
    $('#confirm').oncancel=event=>{event.preventDefault();finish(false);};
    $('#confirm').showModal();$('#cancelConfirm').focus();
  });
  if(!confirmed)return;
  busy=true;document.querySelectorAll('[data-delete-scores]').forEach(button=>button.disabled=true);
  try{
    const result=await api('deleteScores',{participantId,scoreIds,confirmed:true});
    // Update only the records acknowledged as removed; leave every other participant unchanged.
    const removedIds=new Set(scoreIds);state.records=state.records.filter(r=>!removedIds.has(r._id));
    renderView();
    toast(result.remaining?'Puntuaciones eliminadas. Hay nuevas evaluaciones; actualiza el consolidado.':'Puntuaciones eliminadas. El concursante queda pendiente.');
  }catch(error){toast(error.message);}finally{busy=false;if(state.user?.role==='admin'&&state.view==='results')renderResults();}
}
function download(filename,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportCsv(rows){const safe=value=>{let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};const lines=[['Categoría','Posición','Número','Nombre','Curso','Imperio',...RUBRICS.map(r=>r.short),'Total / 30','Estado']];for(const category of CATEGORIES.filter(c=>state.category==='all'||c===state.category))for(const r of rankedRows(rows,category))lines.push([r.category,r.rank,r.number,r.name,r.course||'',r.empire,...r.evaluations.map(s=>s?.total??''),r.total??'',r.complete?'Completo':`${r.count}/3 pendiente`]);download(`EmpireFest2026-consolidado.csv`,'\uFEFF'+lines.map(line=>line.map(safe).join(';')).join('\r\n'),'text/csv;charset=utf-8');}
function renderParticipants(){
  $('#view').innerHTML=`<div class="panel"><p class="eyebrow">ORGANIZACIÓN</p><h2>Registrar participante</h2><p>Asigna el número, la categoría y el imperio que utilizarán los tres jurados.</p><form id="participantForm"><div class="form-grid"><div><label for="number">Número de participante</label><input id="number" type="number" min="1" max="9999" step="1" value="${Math.max(0,...state.participants.map(p=>p.number))+1}" required></div><div><label for="newCategory">Categoría</label><select id="newCategory">${CATEGORIES.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div><label for="name">Nombre completo</label><input id="name" maxlength="160" required placeholder="Nombre del participante"></div><div><label for="course">Curso</label><input id="course" maxlength="120" placeholder="Ej. 8vo Justos"></div><div><label for="empire">Imperio asignado</label><input id="empire" maxlength="120" required placeholder="Ej. Imperio romano"></div></div><div class="actions"><button type="submit" class="primary">Agregar participante</button></div><p id="participantStatus" class="status-line" role="status"></p></form></div><div class="panel"><div class="toolbar"><h2>Participantes registrados</h2><button class="outline" id="refresh">Actualizar</button></div><div class="table-wrap"><table><thead><tr><th>Número</th><th>Nombre</th><th>Curso</th><th>Categoría</th><th>Imperio</th></tr></thead><tbody>${state.participants.map(p=>`<tr><td>${p.number}</td><td>${esc(p.name)}</td><td>${esc(p.course||'Sin curso')}</td><td>${esc(p.category)}</td><td>${esc(p.empire)}</td></tr>`).join('')||'<tr><td colspan="5">Registra al primer participante para comenzar.</td></tr>'}</tbody></table></div></div>`;
  $('#refresh').onclick=refresh;$('#participantForm').onsubmit=async event=>{
    event.preventDefault();const participant={_id:crypto.randomUUID(),number:Number($('#number').value),category:$('#newCategory').value,name:$('#name').value.trim(),course:$('#course').value.trim(),empire:$('#empire').value.trim()};
    if(!participant.name||!participant.empire)return toast('Completa el nombre y el imperio.');if(state.participants.some(p=>p.number===participant.number))return toast('Ese número ya está registrado.');const button=event.submitter;button.disabled=true;
    try{const data=await api('addParticipant',{participant});state.participants.push(data.participant);toast('Participante registrado.');renderParticipants();}catch(error){$('#participantStatus').textContent=error.message;$('#participantStatus').classList.add('error');}finally{button.disabled=false;}
  };
}
function renderHistory(){
  const latest=latestScores(state.records).filter(r=>r.rubricId===state.user.rubricId);
  $('#view').innerHTML=`<div class="panel"><div class="toolbar"><div><p class="eyebrow">EVALUACIONES PUBLICADAS</p><h2>Mi historial</h2></div><button class="outline" id="refresh">Actualizar</button></div><p>Solo tú puedes modificar tu rúbrica. Las nuevas publicaciones conservan las versiones anteriores.</p><div class="table-wrap"><table><thead><tr><th>Participante</th><th>Fecha</th><th>Puntaje / 10</th><th>Versiones</th><th></th></tr></thead><tbody>${latest.map(r=>{const p=state.participants.find(p=>p._id===r.participantId);return `<tr><td>${esc(p?.name||r.participantId)}<small>${esc(p?.course||'Sin curso')} · ${esc(p?.empire)}</small></td><td>${esc(r.evaluationDate)}</td><td class="score-total">${fmt(r.total)}</td><td>${state.records.filter(s=>s.participantId===r.participantId&&s.rubricId===r.rubricId).length}</td><td><button class="outline" data-edit="${esc(r.participantId)}">Revisar</button></td></tr>`;}).join('')||'<tr><td colspan="5">Todavía no has publicado evaluaciones.</td></tr>'}</tbody></table></div></div>`;
  $('#refresh').onclick=refresh;document.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>{state.selected=button.dataset.edit;state.view='evaluate';loadDraft();renderNav();renderView();});
}

void restoreSession();
