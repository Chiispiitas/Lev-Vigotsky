// UltraStar timing: GAP is milliseconds; each chart beat is 60 / BPM / 4 seconds.
// Imported charts retain their author/source headers. Recordings stay on YouTube.
export function parseChart(text, entry) {
 const headers = Object.fromEntries([...text.matchAll(/^#([^:]+):(.*)$/gm)].map(m=>[m[1],m[2].trim()]));
 const number = key => Number((headers[key]||'0').replace(',', '.'));
 const bpm=number('BPM'), gap=number('GAP')/1000;
 if(!(bpm>0)||!Number.isFinite(gap)||headers.RELATIVE==='YES')throw new Error('Formato de canción no compatible.');
 const beat=60/bpm/4, notes=[], lyrics=[]; let phrase=[];
 const flush=()=>{if(!phrase.length)return;lyrics.push({start:phrase[0].start,end:phrase.at(-1).end,text:phrase.map(n=>n.text).join('').replace(/\s*-\s*/g,'').replace(/~/g,'').trim()});phrase=[]};
 for(const row of text.replace(/^\uFEFF/,'').split(/\r?\n/)){
  if(row.startsWith('-')){flush();continue}
  if(/^P\d/.test(row))throw new Error('Esta canción requiere varias voces.');
  const match=/^([:*FRG])\s+(-?\d+)\s+(\d+)\s+(-?\d+) (.*)$/.exec(row);
  if(!match)continue;
  const start=gap+Number(match[2])*beat,end=start+Number(match[3])*beat;
  if(end<=start)continue;
  const note={start:Math.max(0,start),end,midi:Number(match[4])+60,text:match[5],type:match[1]};
  phrase.push(note);if(match[1]===':'||match[1]==='*')notes.push(note);
 }
 flush();if(!notes.length||!lyrics.length)throw new Error('La canción no contiene una melodía válida.');
 // Charts often use arbitrary octaves; keep a comfortable display register.
 const pitches=notes.map(n=>n.midi).sort((a,b)=>a-b),shift=12*Math.round((pitches[Math.floor(pitches.length/2)]-66)/12);
 notes.sort((a,b)=>a.start-b.start);for(const n of notes)n.midi-=shift;
 const duration=Math.max(entry.duration||number('ALLKARAOKE_DURATION'),...lyrics.map(l=>l.end));
 // A shared 20 ms grid avoids double-counting overlaps and matches school scoring.
 const frames=[];let i=0;
 for(let tick=Math.ceil(notes[0].start/.02);tick*.02<duration;tick++){
  const t=Number((tick*.02).toFixed(6));while(i<notes.length&&notes[i].end<=t)i++;
  if(i<notes.length&&notes[i].start<=t&&t<notes[i].end)frames.push({t,midi:notes[i].midi});
 }
 return {...entry,duration,playback:'youtube',lyrics,reference:{frames,notes,hopSeconds:.02,reviewed:false,version:1},timing:{lyricsOffset:0,melodyOffset:0,revision:1},lyricPrecision:'line',credits:{author:headers.CREATOR||entry.author||'',source:headers.ALLKARAOKE_SOURCEURL||entry.sourceUrl||'',chart:entry.source}};
}
export async function loadCatalog(fetcher=fetch){
 const response=await fetcher('assets/catalog.json?v=4');if(!response.ok)throw new Error('No se pudo cargar el catálogo.');
 const entries=await response.json();
 const loaded=await Promise.allSettled(entries.map(async entry=>{const r=await fetcher(entry.chart);if(!r.ok)throw new Error(entry.title);return parseChart(await r.text(),entry)}));
 return {songs:loaded.filter(r=>r.status==='fulfilled').map(r=>r.value),failed:entries.filter((_,i)=>loaded[i].status==='rejected').map(e=>e.title)};
}
