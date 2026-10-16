export const RUBRICS = [
  {id:'culture',short:'Cultura y traje',title:'Cultura, traje típico y puesta en escena',judge:'Carlos Delgado',specialty:'Cultura, representación histórica y puesta en escena',guide:'Se valorará la identidad del imperio asignado y la manera en que el candidato/a comunica su riqueza cultural mediante el vestuario y la puesta en escena.',criteria:[
    {id:'history',title:'Historia y cultural',max:3,description:'El traje representa adecuadamente la identidad, época, cultura y características del imperio asignado.'},
    {id:'creativity',title:'Creatividad y presentación del traje',max:2,description:'Originalidad, combinación de elementos, accesorios y calidad visual de la propuesta.'},
    {id:'costume',title:'Dominio y exhibición del traje',max:2,description:'Seguridad, naturalidad y capacidad para lucir el traje, destacando sus elementos representativos.'},
    {id:'opening',title:'Puesta en escena del opening',max:2,description:'Coordinación, expresión corporal, integración con el grupo y cumplimiento de la propuesta escénica.'},
    {id:'theme',title:'Coherencia temática',max:1,description:'Correspondencia entre la presentación, el imperio representado y la temática general EMPIRE FEST.'}
  ]},
  {id:'commerce',short:'Comercio e historia',title:'Comercio e historia comercial de los imperios',judge:'Karla Moreira',specialty:'Gerente Comercio Exterior ASISERVY',question:'¿Cuál fue el principal aporte de su imperio al desarrollo del comercio y de qué manera considera que ese legado se refleja en el comercio actual?',guide:'La respuesta no debe limitarse a memorizar datos históricos. Se valorará especialmente la capacidad del candidato/a para explicar cómo el imperio asignado contribuyó al desarrollo del comercio y qué relación tienen esos antecedentes con las prácticas comerciales actuales.',criteria:[
    {id:'knowledge',title:'Conocimiento histórico-comercial',max:3,description:'Identifica correctamente las principales actividades comerciales, productos, rutas o prácticas económicas del imperio asignado.'},
    {id:'legacy',title:'Relación entre el imperio y el comercio actual',max:3,description:'Explica de qué manera sus prácticas, intercambios o aportes históricos se relacionan con el comercio contemporáneo.'},
    {id:'analysis',title:'Argumentación y análisis',max:2,description:'Desarrolla ideas coherentes, establece relaciones entre pasado y presente y demuestra comprensión del tema.'},
    {id:'clarity',title:'Claridad y seguridad al responder',max:1,description:'Expresa sus ideas con claridad, seguridad, orden y lenguaje apropiado.'},
    {id:'reflection',title:'Originalidad y reflexión personal',max:1,description:'Presenta una conclusión propia o un ejemplo pertinente que enriquece su respuesta.'}
  ]},
  {id:'runway',short:'Pasarela y actitud',title:'Pasarela, actitud y expresión corporal',judge:'Cristhina Cedeño',specialty:'Queen Beauty Universe',guide:'Se evaluará el desenvolvimiento individual, sin comparar estilos personales ni exigir que todos los candidatos/tas proyecten la misma personalidad. Se priorizarán la técnica, la seguridad, la expresión corporal y la autenticidad.',criteria:[
    {id:'walk',title:'Dominio de pasarela',max:3,description:'Técnica de caminata, postura corporal, coordinación de movimientos y desplazamiento en el escenario.'},
    {id:'confidence',title:'Actitud y seguridad',max:3,description:'Confianza, desenvolvimiento, naturalidad y control del nerviosismo durante la presentación.'},
    {id:'expression',title:'Expresión corporal y proyección escénica',max:2,description:'Manejo de gestos, mirada, expresividad y conexión con el público.'},
    {id:'presence',title:'Presencia y personalidad',max:2,description:'Capacidad para transmitir carisma, autenticidad y una imagen acorde con la presentación.'}
  ]}
];
export function validateScores(rubricId,scores) {
  const rubric=RUBRICS.find(r=>r.id===rubricId);
  if(!rubric || !scores || typeof scores!=='object') throw new Error('Rúbrica inválida.');
  return Math.round(rubric.criteria.reduce((sum,c)=>{
    const value=scores[c.id];
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>c.max||Math.abs(value*100-Math.round(value*100))>1e-7) throw new Error(`Completa ${c.title} con un puntaje entre 0 y ${c.max}.`);
    return sum+value;
  },0)*100)/100;
}
export function latestScores(records) {
  const sorted=[...records].sort((a,b)=>new Date(b._createdDate||b.savedAt)-new Date(a._createdDate||a.savedAt));
  const found=new Map();
  for(const record of sorted){const key=record.participantId+':'+record.rubricId;if(!found.has(key))found.set(key,record);}
  return [...found.values()];
}
export function consolidate(participants,records){
  const latest=latestScores(records);
  return participants.map(p=>{
    const evaluations=RUBRICS.map(r=>latest.find(s=>s.participantId===p._id&&s.rubricId===r.id));
    const complete=evaluations.every(Boolean);
    return {...p,evaluations,complete,total:complete?Math.round(evaluations.reduce((sum,s)=>sum+s.total,0)*100)/100:null,count:evaluations.filter(Boolean).length};
  });
}

export const CATEGORIES=['Miss','Míster','Mini Miss','Mini Míster'];
export function rankedRows(rows,category){const sorted=rows.filter(r=>r.category===category).sort((a,b)=>(b.complete-a.complete)||(b.total??-1)-(a.total??-1)||a.number-b.number);let last=null,rank=0;return sorted.map((r,i)=>{if(r.complete&&r.total!==last){rank=i+1;last=r.total;}return {...r,rank:r.complete?rank:'—'};});}

export function organizerRows(rows,category='all'){return category==='all'?CATEGORIES.flatMap(c=>rankedRows(rows,c)).sort((a,b)=>a.number-b.number):rankedRows(rows,category);}
