import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseChart,loadCatalog} from '../song-catalog.js';
import {scoreFrame} from '../scoring.js';
const root=new URL('../',import.meta.url);
const entries=JSON.parse(fs.readFileSync(new URL('assets/catalog.json',root),'utf8').replace(/^\uFEFF/,''));
test('catalog contains 35 unique songs with valid Spanish and English charts',()=>{
 assert.equal(entries.length,35);assert.equal(new Set(entries.map(e=>e.id)).size,35);
 assert.equal(entries.filter(e=>e.language==='Spanish').length,18);assert.equal(entries.filter(e=>e.language==='English').length,17);
 for(const entry of entries){
  const song=parseChart(fs.readFileSync(new URL(entry.chart,root),'utf8'),entry);
  assert.match(song.video,/^[\w-]{11}$/);assert.ok(song.lyrics.length>20);assert.ok(song.reference.frames.length>1000);
  const frames=song.reference.frames;
  for(let i=0;i<frames.length;i++){assert.ok(frames[i].t>=0&&frames[i].t<song.duration);if(i)assert.ok(frames[i].t>frames[i-1].t)}
  for(const line of song.lyrics)assert.ok(line.end>line.start&&line.end<=song.duration&&line.text.trim());
  const frame=frames[100];assert.equal(scoreFrame(frames,frame.t,frame.midi).credit,1);
  assert.equal(scoreFrame(frames,frame.t,null).credit,0);
 }
});
test('decimal BPM, millisecond gap, syllables and freestyle convert correctly',()=>{
 const song=parseChart('#BPM:120,0\n#GAP:1000\n: 0 4 0 Hel\n* 4 4 2 lo \n- 8\nF 8 4 0 speak\n- 12',{duration:3});
 assert.equal(song.reference.notes[0].start,1);assert.equal(song.reference.notes[0].end,1.5);
 assert.equal(song.lyrics[0].text,'Hello');assert.equal(song.lyrics[1].text,'speak');
 assert.ok(song.reference.frames.every(f=>f.t<2));assert.equal(song.reference.notes[0].midi,60);
});
test('one failed chart does not remove the rest of the catalog',async()=>{
 const result=await loadCatalog(async path=>path.startsWith('assets/catalog')?{ok:true,json:async()=>entries}:path===entries[0].chart?{ok:false}:{ok:true,text:async()=>fs.readFileSync(new URL(path,root),'utf8')});
 assert.equal(result.songs.length,34);assert.deepEqual(result.failed,[entries[0].title]);
});
