import test from 'node:test';
import assert from 'node:assert/strict';
import {YouTubeTransport} from '../youtube-transport.js';
import {AudioTimeline} from '../timeline.js';
function setup(){
 const transport=new YouTubeTransport();transport.load=async()=>{};let time=12,volume=0;
 transport.player={getCurrentTime:()=>time,getDuration:()=>100,pauseVideo:()=>transport.onState(2),playVideo:()=>queueMicrotask(()=>transport.onState(1)),seekTo:t=>{time=t},setVolume:v=>{volume=v},destroy:()=>{}};
 return {transport,setTime:t=>{time=t},volume:()=>volume};
}
test('YouTube clock and timeline freeze during buffering and pause, then resume',async()=>{
 const {transport,setTime}=setup(),timeline=new AudioTimeline();await transport.play();
 timeline.anchor(transport,20);assert.ok(Math.abs(timeline.atContext(20.1)-12.1)<1e-8);
 transport.onState(3);assert.equal(transport.buffering,true);timeline.anchor(transport,21);assert.equal(timeline.atContext(23),12);
 setTime(12.2);await transport.play();timeline.anchor(transport,24);assert.ok(Math.abs(timeline.atContext(24.1)-12.3)<1e-8);
 transport.pause();timeline.anchor(transport,25);assert.equal(timeline.atContext(30),12.2);
});
test('only natural completion emits ended; restart seeks and volume uses YouTube units',async()=>{
 const {transport,volume}=setup();let ended=0;transport.addEventListener('ended',()=>ended++);
 await transport.play();transport.pause();assert.equal(ended,0);transport.currentTime=0;assert.equal(transport.currentTime,0);
 transport.volume=.4;assert.equal(volume(),40);transport.onState(0);assert.equal(ended,1);assert.equal(transport.ended,true);
});
test('a blocked video rejects playback instead of silently starting a scored round',async()=>{
 const {transport}=setup();transport.player.playVideo=()=>queueMicrotask(()=>{transport.error=new Error('blocked');transport.dispatchEvent(new Event('blocked'))});
 await assert.rejects(transport.play(),/blocked/);assert.equal(transport.paused,true);assert.equal(transport.error,null);
});
test('retrying the same failed video clears the old error and creates a fresh player',()=>{
 const {transport}=setup();transport._src='video-id';transport.error=new Error('network');transport.loadPromise=Promise.resolve();
 transport.src='video-id';assert.equal(transport.error,null);assert.equal(transport.player,null);assert.equal(transport.loadPromise,null);
});
test('zero from the YouTube clock never falls back to an old seek position',()=>{
 const {transport,setTime}=setup();transport.offset=30;setTime(0);assert.equal(transport.currentTime,0);
 setTime(undefined);assert.equal(transport.currentTime,30);setTime(NaN);assert.equal(transport.currentTime,30);
});
test('player embeds on the privacy domain with origin and manual playback controls',async t=>{
 const host={hidden:true,replaceChildren(){},append(slot){this.slot=slot}};
 const oldDoc=Object.getOwnPropertyDescriptor(globalThis,'document'),oldLocation=Object.getOwnPropertyDescriptor(globalThis,'location');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{querySelector:()=>host,createElement:tag=>({tag})}});
 Object.defineProperty(globalThis,'location',{configurable:true,value:{origin:'https://chiispiitas.github.io'}});
 t.after(()=>{if(oldDoc)Object.defineProperty(globalThis,'document',oldDoc);else delete globalThis.document;if(oldLocation)Object.defineProperty(globalThis,'location',oldLocation);else delete globalThis.location});
 let config;
 const transport=new YouTubeTransport(async()=>({Player:class{constructor(slot,options){config=options;queueMicrotask(()=>options.events.onReady())}setVolume(){}destroy(){}}}));
 transport.src='video-id';await transport.load();
 const url=new URL(host.slot.src);
 assert.equal(host.slot.tag,'iframe');assert.equal(url.origin,'https://www.youtube-nocookie.com');
 assert.equal(url.pathname,'/embed/video-id');assert.equal(url.searchParams.get('origin'),'https://chiispiitas.github.io');
 assert.equal(url.searchParams.get('enablejsapi'),'1');assert.equal(url.searchParams.get('controls'),'1');
 assert.ok(host.slot.allow.includes('autoplay'));assert.equal(transport.readyState,4);
 assert.equal(typeof config.events.onAutoplayBlocked,'function');
 config.events.onPlaybackRateChange({data:1.5});assert.equal(transport.playbackRate,1.5);
});
