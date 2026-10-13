import test from 'node:test';
import assert from 'node:assert/strict';
import {createYouTubeApiLoader} from '../youtube-api.js';
function setup(onAppend,timeoutMs=1000){
 const scope={},scripts=[];
 const doc={createElement:()=>({removed:false,remove(){this.removed=true}}),head:{append(script){scripts.push(script);onAppend?.(script,scripts.length,scope)}}};
 return {scope,scripts,load:createYouTubeApiLoader({scope,doc,timeoutMs})};
}
test('connection refusal falls back to the official privacy-domain player script',async()=>{
 const {scope,scripts,load}=setup((script,n,scope)=>queueMicrotask(()=>{if(n===1)script.onerror();else{scope.YT={Player:class{}};scope.onYouTubeIframeAPIReady()}}));
 assert.equal(await load(),scope.YT);assert.equal(scripts.length,2);
 assert.equal(new URL(scripts[0].src).hostname,'www.youtube.com');
 assert.equal(new URL(scripts[1].src).hostname,'www.youtube-nocookie.com');
 assert.ok(scripts.every(s=>s.removed&&s.onerror===null));
});
test('a loaded bootstrap whose nested widget script is blocked also falls back',async()=>{
 const {scope,scripts,load}=setup((script,n,scope)=>queueMicrotask(()=>{if(n===1)script.onload();else{scope.YT={Player:class{}};scope.onYouTubeIframeAPIReady()}}),5);
 assert.equal(await load(),scope.YT);assert.equal(scripts.length,2);
});
test('failure of both connections rejects and permits a fresh retry',async()=>{
 const {scripts,load}=setup(script=>queueMicrotask(()=>script.onerror()));
 await assert.rejects(load(),/dos conexiones/);await assert.rejects(load(),/dos conexiones/);
 assert.equal(scripts.length,4);assert.ok(scripts.every(s=>s.removed));
});
test('silent network failures time out instead of leaving the loader stuck',async()=>{
 const {scripts,load}=setup(undefined,5);
 await assert.rejects(load(),/dos conexiones/);assert.equal(scripts.length,2);
});
test('concurrent callers share one attempt and preserve an existing ready callback',async()=>{
 const {scope,scripts,load}=setup();let calls=0;const previous=()=>{calls++;throw new Error('unrelated callback')};scope.onYouTubeIframeAPIReady=previous;
 const first=load(),second=load();assert.equal(first,second);assert.equal(scripts.length,1);
 scope.YT={Player:class{}};scope.onYouTubeIframeAPIReady();await first;
 assert.equal(calls,1);assert.equal(scope.onYouTubeIframeAPIReady,previous);
 await load();assert.equal(scripts.length,1);
});
