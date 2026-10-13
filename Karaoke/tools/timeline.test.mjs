import test from 'node:test';import assert from 'node:assert/strict';import {AudioTimeline,projectedTime,currentCapture} from '../timeline.js';
test('display and capture share the audible audio timeline',()=>{const t=new AudioTimeline();t.anchor({currentTime:10,paused:false,ended:false,playbackRate:1},20,.06);assert.ok(Math.abs(t.atContext(20.08)-10.02)<1e-8);assert.ok(Math.abs(t.captureAt(19.97,30)-9.88)<1e-8)});
test('late Worker delivery does not shift a captured note',()=>{const t=new AudioTimeline();t.anchor({currentTime:10.5,paused:false,ended:false},20.5,.05);assert.ok(Math.abs(t.captureAt(20)-9.95)<1e-8)});
test('pause freezes projected and operator clocks',()=>{const t=new AudioTimeline();t.anchor({currentTime:12,paused:true},25,.1);assert.equal(t.atContext(29),12);assert.equal(projectedTime(12,1000,2000,false),12)});
test('audience interpolates between snapshots without running away on loss',()=>{assert.equal(projectedTime(10,1000,1050,true),10.05);assert.equal(projectedTime(10,1000,3000,true),10.2)});
test('video clock rate changes, buffering, and resumed capture use one timeline',()=>{
 const timeline=new AudioTimeline();timeline.anchor({currentTime:10,paused:false,playbackRate:1.5},20);
 assert.ok(Math.abs(timeline.captureAt(20.2,0)-10.3)<1e-8);
 timeline.anchor({currentTime:11,paused:true,playbackRate:1.5},21);assert.equal(timeline.atContext(22),11);
 timeline.anchor({currentTime:11,paused:false,playbackRate:1},23);assert.ok(Math.abs(timeline.captureAt(23.1,20)-11.08)<1e-8);
});
test('late packets from before a restart or buffering recovery cannot be scored in the new timeline',()=>{
 assert.equal(currentCapture(19.9,20,20.1),false);assert.equal(currentCapture(20.05,20,20.1),true);
 assert.equal(currentCapture(NaN,20,20.1),false);assert.equal(currentCapture(21,20,20.1),false);
});
