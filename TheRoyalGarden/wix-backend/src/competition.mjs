const criterion = (id, title, max) => ({id, title, max});
const presentation = [
  criterion('opening','Presentación y opening',2),
  criterion('character','Personificación de la reina',2),
  criterion('presence','Presencia y actitud',2),
  criterion('runway','Pasarela',2),
  criterion('answer','Primera pregunta',2)
];
export const phases = {
  mini: {title:'Mini Reinado', criteria:presentation},
  first: {title:'Primera fase', criteria:presentation},
  final: {title:'Segunda fase', criteria:[
    criterion('impact','Impacto del proyecto',5),
    criterion('eloquence','Elocuencia y expresión',5)
  ]}
};

export function validateMarks(phase, marks) {
  if (!Object.hasOwn(phases,phase) || !marks || typeof marks !== 'object') return null;
  const criteria = phases[phase].criteria;
  if (criteria.length !== Object.keys(marks).length) return null;
  let cents = 0;
  const normalized = {};
  for (const {id,max} of criteria) {
    const score = marks[id];
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > max) return null;
    const rounded = Math.round(score * 100);
    if (Math.abs(rounded - score * 100) > 1e-8) return null;
    cents += rounded;
    normalized[id] = rounded / 100;
  }
  return {marks:normalized, total:cents/100};
}

export const canScore = (panel, phase, candidate, finalists) =>
  !!candidate && (phase === 'mini'
    ? panel === 'mini' && candidate.group === 'mini'
    : panel === 'main' && candidate.group === 'main' &&
      (phase === 'first' || (phase === 'final' && finalists.includes(candidate.id))));

export function latestScores(records) {
  const latest = new Map();
  for (const record of records) {
    const key = [record.phase,record.candidate,record.judge].join('/');
    if (!latest.has(key) || latest.get(key).revision < record.revision) latest.set(key,record);
  }
  return [...latest.values()];
}

export function rankings(candidates, records, judges, phase) {
  const rows = candidates.map(candidate => {
    const scores = judges.map(judge => records.find(r => r.phase===phase && r.candidate===candidate.id && r.judge===judge.id)?.total ?? null);
    const count = scores.filter(s => s !== null).length;
    const cents = count === 3 ? scores.reduce((sum, score) => sum + Math.round(score*100), 0) : null;
    return {candidate,scores,count,cents,average:cents === null ? null : Math.round(cents/3)/100};
  }).sort((a,b)=>(b.average ?? -1)-(a.average ?? -1) || a.candidate.number-b.candidate.number);
  return rows.map((r,i)=>({...r,rank:r.average===null?null:rows.findIndex(x=>x.average===r.average)+1}));
}
