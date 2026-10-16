import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {RUBRICS,validateScores,consolidate} from './rubrics.js';
const code='a'.repeat(24),adminCode='b'.repeat(24);
function setup(){
  const db={EmpireFest2026Access:[{title:'Carlos Delgado',role:'judge',rubricId:'culture',codeHash:createHash('sha256').update(code).digest('hex')},{title:'Organización',role:'admin',rubricId:'',codeHash:createHash('sha256').update(adminCode).digest('hex')}],EmpireFest2026Participants:[{_id:'participant-1',number:1,name:'Prueba',empire:'Romano',category:'Miss'}],EmpireFest2026Scores:[]};
  const wixData={async bulkRemove(collection,ids){const removedItemIds=db[collection].filter(item=>ids.includes(item._id)).map(item=>item._id);db[collection]=db[collection].filter(item=>!ids.includes(item._id));return {removedItemIds,errors:[]};},query(collection){let filters=[],sort=null;const query={eq(k,v){filters.push([k,v]);return query;},ascending(k){sort=[k,1];return query;},descending(k){sort=[k,-1];return query;},limit(){return query;},async find(){let items=db[collection].filter(item=>filters.every(([k,v])=>item[k]===v));if(sort)items.sort((a,b)=>a[sort[0]]>b[sort[0]]?sort[1]:-sort[1]);return {items,hasNext:()=>false};}};return query;},async insert(collection,item){if(db[collection].some(old=>old._id===item._id))throw new Error('Duplicate');const saved={...item,_createdDate:new Date().toISOString()};if(saved.scores)saved.scores=Object.fromEntries(Object.entries(saved.scores).reverse());db[collection].push(saved);return saved;}};
  const source=readFileSync(new URL('./wix-empire-fest-2026.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
  const handler=new Function('response','wixData','createHash','RUBRICS','validateScores',source+'\nreturn post_empireFest2026;')(value=>value,wixData,createHash,RUBRICS,validateScores);
  const call=async body=>{const r=await handler({body:{text:async()=>JSON.stringify(body)}});return {status:r.status,...JSON.parse(r.body)};};
  return {db,call};
}
test('rubrics match the PDF weights and total 30',()=>{assert.deepEqual(RUBRICS.map(r=>r.criteria.map(c=>c.max)),[[3,2,2,2,1],[3,3,2,1,1],[3,3,2,2]]);assert.equal(RUBRICS.reduce((sum,r)=>sum+r.criteria.reduce((n,c)=>n+c.max,0),0),30);});
test('scores require every criterion, allow zero, and reject invalid values',()=>{for(const r of RUBRICS){const zeros=Object.fromEntries(r.criteria.map(c=>[c.id,0]));assert.equal(validateScores(r.id,zeros),0);assert.equal(validateScores(r.id,Object.fromEntries(r.criteria.map(c=>[c.id,c.max]))),10);for(const bad of [null,'1',-1,Infinity,NaN,4,0.001])assert.throws(()=>validateScores(r.id,{...zeros,[r.criteria[0].id]:bad}));assert.throws(()=>validateScores(r.id,{}));}});
test('incomplete participants have no total; newest revision replaces only its own rubric',()=>{const participants=[{_id:'p1'}],records=RUBRICS.map((r,i)=>({participantId:'p1',rubricId:r.id,total:8,_createdDate:`2026-10-12T10:00:0${i}Z`}));assert.equal(consolidate(participants,records.slice(0,2))[0].total,null);assert.equal(consolidate(participants,records)[0].total,24);records.push({participantId:'p1',rubricId:'culture',total:10,_createdDate:'2026-10-12T11:00:00Z'});assert.equal(consolidate(participants,records)[0].total,26);});
test('backend rejects invalid access and hides other judges scores',async()=>{const {db,call}=setup();assert.equal((await call({code:'wrong',action:'bootstrap'})).status,403);db.EmpireFest2026Scores.push({_id:'x',rubricId:'commerce',total:10});const result=await call({code,action:'bootstrap'});assert.equal(result.status,200);assert.equal(result.records.length,0);assert.equal(result.user.codeHash,undefined);assert.equal((await call({code:adminCode,action:'bootstrap'})).records.length,1);});
test('judge cannot register participants or submit another rubric',async()=>{const {call}=setup();assert.equal((await call({code,action:'addParticipant',participant:{}})).status,403);assert.equal((await call({code,action:'submit',record:{rubricId:'commerce'}})).status,403);assert.equal((await call({code:adminCode,action:'submit',record:{rubricId:'culture'}})).status,403);});
test('backend recomputes scores, rejects malformed dates and preserves idempotent history',async()=>{const {db,call}=setup();const record={_id:randomUUID(),participantId:'participant-1',rubricId:'culture',scores:Object.fromEntries(RUBRICS[0].criteria.map(c=>[c.id,c.max])),total:999,comment:'Prueba',evaluationDate:'2026-10-12'};
  const first=await call({code,action:'submit',record});assert.equal(first.status,200);assert.equal(first.record.total,10);assert.equal((await call({code,action:'submit',record})).status,200);assert.equal(db.EmpireFest2026Scores.length,1);
  assert.equal((await call({code,action:'submit',record:{...record,comment:'Different'}})).status,409);
  assert.equal((await call({code,action:'submit',record:{...record,_id:randomUUID(),evaluationDate:'2026-02-30'}})).status,400);
  assert.equal((await call({code,action:'submit',record:{...record,_id:randomUUID(),scores:{...record.scores,history:9}}})).status,400);
  const second=await call({code,action:'submit',record:{...record,_id:randomUUID(),scores:{...record.scores,history:0}}});assert.equal(second.record.total,7);assert.equal(db.EmpireFest2026Scores.length,2);
});
test('organizer registration validates category and prevents duplicate numbers',async()=>{const {db,call}=setup();const participant={number:2,name:'Otra persona',empire:'Egipto',category:'Míster'};
  const first=await call({code:adminCode,action:'addParticipant',participant});assert.equal(first.status,200);assert.equal(first.participant._id,'participant-2');assert.equal((await call({code:adminCode,action:'addParticipant',participant})).status,400);assert.equal(db.EmpireFest2026Participants.length,2);assert.equal((await call({code:adminCode,action:'addParticipant',participant:{...participant,number:3,category:'Invalid'}})).status,400);
});

test('score deletion requires organizer and explicit confirmation',async()=>{
  const {db,call}=setup();db.EmpireFest2026Scores.push({_id:'s1',participantId:'participant-1',rubricId:'culture',total:8});
  assert.equal((await call({code,action:'deleteScores',participantId:'participant-1',scoreIds:['s1'],confirmed:true})).status,403);
  assert.equal((await call({code:adminCode,action:'deleteScores',participantId:'participant-1',scoreIds:['s1']})).status,400);
  assert.equal(db.EmpireFest2026Scores.length,1);
});
test('deletion removes all selected history and preserves other contestants and roster',async()=>{
  const {db,call}=setup();db.EmpireFest2026Scores.push({_id:'s1',participantId:'participant-1',rubricId:'culture',total:8},{_id:'s2',participantId:'participant-1',rubricId:'culture',total:9},{_id:'s3',participantId:'participant-1',rubricId:'commerce',total:10},{_id:'other',participantId:'participant-2',rubricId:'culture',total:7});
  const result=await call({code:adminCode,action:'deleteScores',participantId:'participant-1',scoreIds:['s3','s1','s2'],confirmed:true});
  assert.equal(result.status,200);assert.equal(result.removed,3);assert.equal(result.remaining,0);assert.deepEqual(db.EmpireFest2026Scores.map(r=>r._id),['other']);assert.equal(db.EmpireFest2026Participants.length,1);
});
test('changed or foreign score IDs cannot be deleted by a stale confirmation',async()=>{
  const {db,call}=setup();db.EmpireFest2026Scores.push({_id:'s1',participantId:'participant-1'},{_id:'new',participantId:'participant-1'},{_id:'other',participantId:'participant-2'});
  for(const scoreIds of [['s1'],['s1','new','other']])assert.equal((await call({code:adminCode,action:'deleteScores',participantId:'participant-1',scoreIds,confirmed:true})).status,409);
  assert.equal(db.EmpireFest2026Scores.length,3);
});
