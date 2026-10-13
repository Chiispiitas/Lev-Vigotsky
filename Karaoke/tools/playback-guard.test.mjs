import test from 'node:test';
import assert from 'node:assert/strict';
import {PlaybackGuard} from '../playback-guard.js';
test('normal playback, pauses, buffering and small clock jitter remain valid',()=>{
 const guard=new PlaybackGuard();guard.reset(10,1000);
 assert.equal(guard.observe(10.1,1100),true);assert.equal(guard.observe(10.1,5000),true);
 assert.equal(guard.observe(10.05,5010),true);assert.equal(guard.observe(10.2,5110),true);
});
test('forward and backward seeks invalidate a scored round',()=>{
 const guard=new PlaybackGuard();guard.reset(10,1000);assert.equal(guard.observe(20,1100),false);
 guard.reset(20,1000);assert.equal(guard.observe(10,1100),false);
});
