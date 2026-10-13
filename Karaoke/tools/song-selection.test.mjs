import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const song={id:'test-song',title:'Test song',artist:'Artist',duration:120,language:'English',playback:'youtube',reference:{frames:[{t:0,midi:60}]}};
function setup(participants=[{id:'singer',name:'Singer'}]){
 let click;
 const context={state:{song,songs:[song],participants,demo:true,screen:'songs',countdown:null},coverArtwork:{},icon:()=>'<svg></svg>',esc:s=>String(s??''),format:()=> '2:00',isContestSong:()=>false,contestBadge:()=>'',roundBusy:false,render(){},snapshot(){},toast(){},navigate(screen){context.state.screen=screen},app:{addEventListener(type,fn){if(type==='click')click=fn}}};
 vm.createContext(context);
 vm.runInContext(source.split('\n').find(l=>l.startsWith('function saveSongTiming(')),context);
 vm.runInContext(source.slice(source.indexOf('function songCover('),source.indexOf('// Image errors')),context);
 vm.runInContext(source.split('\n').find(l=>l.startsWith('function pickNext()')),context);
 vm.runInContext(source.slice(source.indexOf("app.addEventListener('click'"),source.indexOf("app.addEventListener('input'")),context);
 return {context,click};
}
test('album cover selects a real ranked turn rather than simulated practice',async()=>{
 const {context,click}=setup();const html=context.songCover(song);
 const action=html.match(/data-action="([^"]+)"/)[1];assert.equal(action,'song:test-song');
 await click({target:{closest:()=>({dataset:{action}})}});
 assert.equal(context.state.demo,false);assert.equal(context.state.singer.id,'singer');assert.equal(context.state.screen,'ready');
});
test('ranked cover selection requires a participant and explicit practice remains available',async()=>{
 const {context,click}=setup([]);
 await click({target:{closest:()=>({dataset:{action:'song:test-song'}})}});assert.equal(context.state.screen,'participants');
 await click({target:{closest:()=>({dataset:{action:'preview-song:test-song'}})}});assert.equal(context.state.demo,true);assert.equal(context.state.screen,'ready');
});
test('phrase sync saves aligned chart offsets in paused practice, but cannot recalibrate a ranked turn',async()=>{
 const {context,click}=setup();context.state.song={...song,lyrics:[{start:5,end:7,text:'Hello'}]};context.state.time=5.3;context.state.paused=true;context.state.settings={songTiming:{}};
 context.$=()=>({value:'0'});context.songTiming=()=>({lyrics:0,melody:0});context.persist=()=>{};
 await click({target:{closest:()=>({dataset:{action:'sync-phrase'}})}});
 const saved=context.state.settings.songTiming['test-song'];assert.ok(Math.abs(saved.lyrics-.3)<1e-8);assert.equal(saved.lyrics,saved.melody);
 context.state.demo=false;context.state.time=7;
 await click({target:{closest:()=>({dataset:{action:'sync-phrase'}})}});assert.equal(context.state.settings.songTiming['test-song'].lyrics,saved.lyrics);
});

test('shared phrase calibration delays every cue and does not overwrite per-song corrections',async()=>{
 const {context,click}=setup();context.state.song={...song,lyrics:[{start:5,end:7,text:'Hello'}]};context.state.time=6;context.state.paused=true;context.state.settings={playbackDelay:.2,songTiming:{'test-song':{lyrics:.1,melody:.4}}};
 context.$=()=>({value:'0'});context.songTiming=()=>({lyrics:context.state.settings.playbackDelay+.1,melody:context.state.settings.playbackDelay+.4});context.persist=()=>{};
 await click({target:{closest:()=>({dataset:{action:'sync-all'}})}});
 assert.ok(Math.abs(context.state.settings.playbackDelay-.9)<1e-8);
 assert.equal(context.state.settings.songTiming['test-song'].lyrics,.1);
 assert.ok(Math.abs(context.songTiming().lyrics-1)<1e-8);
 context.state.demo=false;context.state.time=8;
 await click({target:{closest:()=>({dataset:{action:'sync-all'}})}});assert.ok(Math.abs(context.state.settings.playbackDelay-.9)<1e-8);
});
test('saving a song correction does not count the shared delay twice',()=>{
 const {context}=setup();context.state.settings={playbackDelay:.5,songTiming:{}};
 context.saveSongTiming({lyrics:.8,melody:1});
 assert.ok(Math.abs(context.state.settings.songTiming['test-song'].lyrics-.3)<1e-8);
 assert.equal(context.state.settings.songTiming['test-song'].melody,.5);
});
