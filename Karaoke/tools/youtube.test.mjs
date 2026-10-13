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
