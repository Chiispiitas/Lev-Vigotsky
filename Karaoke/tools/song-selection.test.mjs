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
