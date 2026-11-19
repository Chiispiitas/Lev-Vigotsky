import {rankings} from './wix-backend/src/competition.mjs';
import {endpoint} from './endpoint.mjs';
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const fmt = value => value == null ? '—' : Number(value).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2});
const sessionKey = 'royal-garden-session-v1';
let code = '', data = null, tab = '', selected = '', pending = false;
const drafts = new Map();
const statuses = {mini:'Mini Reinado',first:'Primera fase',final:'Segunda fase'};
const key = () => tab+'/'+selected;
const staff = () => data.user.panel==='admin';
function saveSession() {
  try { sessionStorage.setItem(sessionKey,JSON.stringify({code,tab,selected})); } catch {}
}
async function api(action,payload={},credential=code) {
  let response;
  try {
    response=await fetch(endpoint,{
      method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},
      body:JSON.stringify({action,code:credential,...payload}),signal:AbortSignal.timeout(18000)
    });
  } catch { throw new Error('No se pudo conectar. Comprueba tu conexión e intenta de nuevo.'); }
  const result=await response.json().catch(()=>({}));
  if (!response.ok || result.error) {
    const error=new Error(result.error || 'El servicio no está disponible. Intenta de nuevo.');
    error.status=response.status;
    throw error;
  }
  return result;
}
function showLogin(message='') {
  code=''; data=null; tab=''; selected=''; drafts.clear();
  try { sessionStorage.removeItem(sessionKey); } catch {}
  $('#workspace').hidden=true;
  $('#logout').hidden=true;
  $('#login').hidden=false;
  $('#loginStatus').textContent=message;
  $('#code').value='';
}
function availableTabs() {
  if (data.user.panel==='mini') return ['mini'];
  if (data.user.panel==='main') return ['first','final'];
  return ['mini','first','final'];
}
function adopt(result) {
  data=result;
  if (!availableTabs().includes(tab)) tab=availableTabs()[0];
  $('#login').hidden=true;
  $('#workspace').hidden=false;
  $('#logout').hidden=false;
  $('#panel').textContent=staff()?'Organización':data.user.panel==='mini'?'Jurado · Mini Reinado':'Jurado · Reinado';
  $('#welcome').textContent=data.user.name;
  render();
}
function render() {
  $('#tabs').innerHTML=availableTabs().map(phase=>`<button class="secondary" data-phase="${phase}" aria-pressed="${tab===phase}">${statuses[phase]}</button>`).join('');
  $('#tabs').querySelectorAll('button').forEach(button=>button.onclick=()=>{
    if(pending) return;
    tab=button.dataset.phase;
    selected='';
    $('#notice').textContent='';
    render();
  });
  if(staff()) renderResults();
  else renderJudge();
  saveSession();
}
function activeCandidates() {
  return data.candidates.filter(c=>tab==='mini'?c.group==='mini':c.group==='main'&&(tab!=='final'||data.finalists.includes(c.id)));
}
const candidateMeta = c => `${escapeHtml(c.course)} · ${escapeHtml(c.queen || 'Reina histórica pendiente')}`;
function savedRevision(data,phase,candidate) {
  return data.scoreRevisions?.find(r=>r.phase===phase&&r.candidate===candidate)?.revision
    ?? data.scores.find(r=>r.phase===phase&&r.candidate===candidate)?.revision ?? 0;
}
function renderJudge() {
  const candidates=activeCandidates();
  if (!candidates.some(c=>c.id===selected)) selected=candidates[0]?.id || '';
  const current=candidates.find(c=>c.id===selected);
  if (!current) {
    $('#view').innerHTML='<section class="card results"><h2>Pregunta final</h2><p>Organización todavía no ha confirmado las finalistas.</p></section>';
    return;
  }
  const {criteria,title}=data.phases[tab];
  const old=data.scores.find(s=>s.phase===tab&&s.candidate===current.id);
  const draft=drafts.get(key());
  const revision=savedRevision(data,tab,current.id);
  $('#view').innerHTML=`<div class="split">
    <aside class="card"><h2>Candidatas</h2><div class="roster">${candidates.map(c=>{
      const scored=data.scores.some(s=>s.phase===tab&&s.candidate===c.id);
      return `<button data-candidate="${escapeHtml(c.id)}" aria-pressed="${c.id===selected}">${String(c.number).padStart(2,'0')} · ${escapeHtml(c.name)}<small>${candidateMeta(c)}${scored?' · Evaluada':''}</small></button>`;
    }).join('')}</div></aside>
    <article class="card">
      <p class="kicker">${escapeHtml(title)}</p><h2>${escapeHtml(current.name)}</h2>
      <p class="meta">${candidateMeta(current)} <span class="hint">Tutoría · ${escapeHtml(current.tutor)}</span></p>
      <form id="scoreForm">
      ${criteria.map(c=>{
        const selectedMark=String(draft?.marks[c.id] ?? old?.marks[c.id] ?? '');
        const marks=Array.from({length:c.max*2+1},(_,i)=>String(i/2));
        // Keep previously saved decimal scores available when reviewing an evaluation.
        if(selectedMark!==''&&!marks.includes(selectedMark)) marks.push(selectedMark);
        return `<fieldset class="criterion"><legend>${escapeHtml(c.title)} <span class="span-note">/ ${c.max}</span></legend>
          <div class="mark-options">${marks.map(mark=>`<label class="mark-choice">
            <input type="radio" name="${c.id}" value="${escapeHtml(mark)}" required ${mark===selectedMark?'checked':''}>
            <span>${Number(mark).toLocaleString('es-EC',{maximumFractionDigits:2})}</span>
          </label>`).join('')}</div></fieldset>`;
      }).join('')}
      <label for="comment">Observaciones (opcional)</label>
      <textarea id="comment" rows="3" maxlength="1000">${escapeHtml(draft?.comment ?? old?.comment ?? '')}</textarea>
      <div class="actions"><output class="score" id="sum"></output>
      <button type="submit">${old?'Guardar corrección':'Publicar evaluación'}</button></div>
      </form>
    </article>
  </div>`;
  $('#view').querySelectorAll('[data-candidate]').forEach(button=>button.onclick=()=>{
    if(pending) return;
    selected=button.dataset.candidate;
    $('#notice').textContent='';
    render();
  });
  const form=$('#scoreForm');
  const read=()=>({marks:Object.fromEntries(criteria.map(c=>[c.id,form.elements[c.id].value])),
    comment:$('#comment').value});
  const sum=()=>{
    const values=Object.values(read().marks);
    $('#sum').textContent=(values.every(v=>v!=='')?fmt(values.reduce((t,v)=>t+Number(v),0)):'—')+' / 10';
  };
  sum();
  form.oninput=()=>{ drafts.set(key(),{...read(),revision:draft?.revision ?? revision}); sum(); };
  form.onsubmit=async event=>{
    event.preventDefault();
    if(pending) return;
    const previous=drafts.get(key());
    const fields=read();
    const payload={candidate:current.id,phase:tab,
      marks:Object.fromEntries(Object.entries(fields.marks).map(([id,value])=>[id,Number(value)])),
      comment:fields.comment,revision:previous?.revision ?? revision};
    const signature=JSON.stringify(payload);
    const requestId=previous?.signature===signature?previous.requestId:crypto.randomUUID();
    const draftKey=key();
    drafts.set(draftKey,{...fields,revision:payload.revision,requestId,signature});
    await withPending(async()=>{
      const {score}=await api('score',{...payload,requestId});
      data.scores=data.scores.filter(s=>s.phase!==score.phase||s.candidate!==score.candidate);
      data.scores.push(score);
      data.scoreRevisions=(data.scoreRevisions ?? []).filter(r=>r.phase!==score.phase||r.candidate!==score.candidate);
      drafts.delete(draftKey);
      render();
      $('#notice').textContent='Evaluación guardada.';
    });
  };
}
function renderResults() {
  const judges=data.judges.filter(j=>j.panel===(tab==='mini'?'mini':'main'));
  const rows=rankings(activeCandidates(),data.scores,judges,tab);
  const openSelection=tab==='first';
  const complete=rows.filter(r=>r.average!==null).length;
  const canManage=Array.isArray(data.scoreHistory);
  const phaseScores=data.scores.filter(s=>s.phase===tab&&rows.some(r=>r.candidate.id===s.candidate));
  const history=(data.scoreHistory ?? []).slice().reverse().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  $('#view').innerHTML=`<section class="card results">
    <div class="results-head"><div><p class="kicker">Consolidado</p><h2>${statuses[tab]}</h2></div>
    <span class="score">${complete} de ${rows.length} con 3 notas</span></div>
    ${tab==='final'&&!rows.length?'<p>La pregunta final se habilita al confirmar las finalistas.</p>':`
    <p class="span-note">El promedio se muestra cuando han calificado los tres jurados. Los empates comparten posición.</p>
    <div class="table-scroll"><table><thead><tr><th>Pos.</th><th>Candidata</th>
    ${judges.map(j=>`<th>${escapeHtml(j.name)} / 10</th>`).join('')}<th>Promedio / 10</th>${canManage?'<th class="screen-only">Acciones</th>':''}</tr></thead><tbody>
    ${rows.map(r=>`<tr><td>${r.rank??'—'}</td><td>${escapeHtml(r.candidate.name)}<small>${candidateMeta(r.candidate)}</small>
      <small>Tutoría · ${escapeHtml(r.candidate.tutor)}</small>
      ${openSelection?`<label class="pick"><input type="checkbox" value="${escapeHtml(r.candidate.id)}" ${data.finalists.includes(r.candidate.id)?'checked':''}>Seleccionar como finalista</label>`:''}
      ${tab==='first'&&data.finalists.includes(r.candidate.id)?'<strong class="hint">Finalista</strong>':''}</td>
      ${r.scores.map(value=>`<td class="num">${fmt(value)}</td>`).join('')}
      <td class="num"><strong>${fmt(r.average)}</strong><small>${r.count}/3 notas</small></td>
      ${canManage?`<td class="screen-only"><button class="secondary danger" type="button" data-delete-score="${escapeHtml(r.candidate.id)}" ${r.count?'':'disabled'}>Borrar notas</button></td>`:''}</tr>`).join('')}
    </tbody></table></div>
    <div class="actions">
    ${openSelection?`<button id="confirmFinalists">${data.finalists.length?'Guardar cambios':'Confirmar finalistas'}</button>`:''}
    ${openSelection&&data.finalists.length?'<button class="secondary" id="clearFinalists">Borrar selección de finalistas</button>':''}
    ${canManage?`<button class="secondary danger" id="deletePhase" ${phaseScores.length?'':'disabled'}>Borrar puntuaciones de la fase</button>`: ''}
    <button class="secondary" id="csv">Descargar CSV</button><button class="secondary" id="print">Imprimir</button></div>`}
  </section>
  ${canManage?`<details class="card results screen-only" id="scoreHistory">
    <summary>Historial de borrados (${history.length})</summary>
    ${history.length?`<ul class="score-history">${history.map(event=>{
      const subject=event.candidate===null?'Toda la fase':data.candidates.find(c=>c.id===event.candidate)?.name ?? 'Candidata';
      const date=event.date?.$date ?? event.date;
      return `<li><span><strong>${escapeHtml(subject)}</strong><small>${escapeHtml(statuses[event.phase])} · ${event.count} notas${date?' · '+escapeHtml(new Date(date).toLocaleString('es-EC',{timeZone:'America/Guayaquil'})):''}</small></span>
        ${event.undone?'<span>Deshecho</span>':`<button class="secondary" data-undo-score="${escapeHtml(event.id)}">Deshacer</button>`}</li>`;
    }).join('')}</ul>`:'<p>Todavía no hay borrados.</p>'}
  </details>`:''}`;
  const updateScores=async(action,payload,message)=>withPending(async()=>{
    await api(action,{...payload,confirmed:true,requestId:crypto.randomUUID()});
    adopt(await api('state'));
    $('#scoreHistory').open=true;
    $('#notice').textContent=message;
  });
  const removeScores=async candidate=>{
    const scores=phaseScores.filter(s=>candidate===null||s.candidate===candidate);
    const subject=candidate===null?statuses[tab]:data.candidates.find(c=>c.id===candidate)?.name;
    if (!scores.length || !window.confirm(`¿Borrar ${scores.length} notas de ${subject}? Puedes deshacerlo desde el historial.`)) return;
    await updateScores('deleteScores',{phase:tab,candidate,scoreIds:scores.map(s=>s.id)},'Puntuaciones borradas. Puedes deshacer el borrado.');
  };
  $('#view').querySelectorAll('[data-delete-score]').forEach(button=>button.onclick=()=>removeScores(button.dataset.deleteScore));
  if($('#deletePhase')) $('#deletePhase').onclick=()=>removeScores(null);
  $('#view').querySelectorAll('[data-undo-score]').forEach(button=>button.onclick=()=>{
    if (window.confirm('¿Deshacer este borrado? Si ya existe una nota nueva, se conserva.'))
      return updateScores('undoScores',{deletionId:button.dataset.undoScore},'Borrado deshecho.');
  });
  if($('#confirmFinalists')) $('#confirmFinalists').onclick=async()=>{
    const checked=[...$('#view').querySelectorAll('input:checked')].map(input=>input.value);
    if(!checked.length){$('#notice').textContent='Selecciona al menos una finalista.';return;}
    const names=rows.filter(r=>checked.includes(r.candidate.id)).map(r=>r.candidate.name).join('\n');
    if(!window.confirm('¿Confirmar estas finalistas y habilitar la pregunta final? Puedes cambiar la lista desde Organización.\n\n'+names))return;
    await withPending(async()=>{await api('finalists',{candidates:checked,confirmed:true,revision:data.finalistRevision}); adopt(await api('state')); $('#notice').textContent='Finalistas confirmadas.';});
  };
  if($('#clearFinalists')) $('#clearFinalists').onclick=async()=>{
    if(!window.confirm('¿Borrar toda la selección? Se cerrará la segunda fase hasta que confirmes otra lista. Las notas guardadas se conservan.'))return;
    await withPending(async()=>{
      await api('finalists',{candidates:[],confirmed:true,revision:data.finalistRevision});
      adopt(await api('state'));
      $('#notice').textContent='Selección de finalistas borrada.';
    });
  };
  if($('#csv')) $('#csv').onclick=()=>exportCsv(rows,judges);
  if($('#print')) $('#print').onclick=()=>window.print();
}
function exportCsv(rows,judges) {
  const cell=value=>{
    const text=String(value??'');
    return '"'+(/^[=+\-@\t\r]/.test(text)?"'":"")+text.replaceAll('"','""')+'"';
  };
  const matrix=[['Posición','Candidata','Curso','Reina histórica','Tutoría',...judges.map(j=>j.name),'Promedio / 10'],
  ...rows.map(r=>[r.rank,r.candidate.name,r.candidate.course,r.candidate.queen,r.candidate.tutor,...r.scores.map(s=>s==null?'':fmt(s)),r.average==null?'':fmt(r.average)])];
  const url=URL.createObjectURL(new Blob(['\uFEFF'+matrix.map(row=>row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='The-Royal-Garden-'+tab+'.csv';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function withPending(task) {
  if(pending)return;
  pending=true;
  $('#notice').textContent='';
  const controls=[...$('#workspace').querySelectorAll('button, input, textarea'),$('#logout')].filter(c=>!c.disabled);
  controls.forEach(c=>{c.disabled=true;});
  try { await task(); }
  catch(error) {
    if(error.status===401) showLogin(error.message);
    else $('#notice').textContent=error.message;
  } finally { controls.forEach(c=>{c.disabled=false;}); pending=false; }
}
async function login(credential,restoring=false) {
  const button=$('#loginForm button');
  button.disabled=true;
  $('#loginStatus').textContent=restoring?'Restableciendo sesión…':'Conectando…';
  try {
    const result=await api('state',{},credential);
    code=credential;
    adopt(result);
    $('#code').value='';
  } catch(error) {
    if(error.status===401) showLogin(error.message);
    else $('#loginStatus').textContent=error.message;
  } finally {button.disabled=false;}
}
$('#loginForm').onsubmit=event=>{event.preventDefault();login($('#code').value.trim().toLowerCase());};
$('#refresh').onclick=()=>withPending(async()=>{
  const result=await api('state');
  for(const [id,draft] of drafts){
    const [phase,candidate]=id.split('/');
    if(savedRevision(result,phase,candidate)!==draft.revision) drafts.delete(id);
  }
  adopt(result);
  $('#notice').textContent='Datos actualizados.';
});
$('#logout').onclick=()=>showLogin();
try {
  const saved=JSON.parse(sessionStorage.getItem(sessionKey));
  if(/^(?:[a-f0-9]{32}|[a-z]{3,20}[0-9]{6})$/.test(saved?.code)){tab=saved.tab;selected=saved.selected;login(saved.code,true);}
} catch {}
