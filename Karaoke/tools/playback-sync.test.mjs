import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {AudioTimeline} from '../timeline.js';
import {lyricAtTime} from '../lyric-sync.js';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('YouTube display and captured voice use the same output-compensated clock',()=>{
 const audio={currentTime:10,paused:false,playbackRate:1};
 const context={audio,youtube:audio,audience:false,context:{currentTime:20},audibleDelay:()=>.2,timeline:new AudioTimeline(),state:{paused:false,song:{id:'song',duration:100,timing:{lyricsOffset:.1,melodyOffset:.1}},settings:{playbackDelay:.4}}};
 vm.createContext(context);
 for(const name of ['songTiming','updateTimeline','displayTime'])vm.runInContext(source.split('\n').find(line=>line.startsWith(`function ${name}(`)),context);
 context.updateTimeline();
 assert.ok(Math.abs(context.displayTime()-9.8)<1e-8);
 assert.ok(Math.abs(context.timeline.captureAt(20,0)-context.displayTime())<1e-8);
 assert.equal(context.songTiming().lyrics,.5);assert.equal(context.songTiming().melody,.5);
 const lines=[{start:9.5,end:11,text:'Sing'}];
 assert.equal(lyricAtTime(lines,context.displayTime()-context.songTiming().lyrics).active,false);
 audio.currentTime=10.3;context.updateTimeline();
 assert.equal(lyricAtTime(lines,context.displayTime()-context.songTiming().lyrics).active,true);
 const pausedAt=context.displayTime();context.state.paused=true;context.state.time=pausedAt;
 context.context.currentTime=50;assert.equal(context.displayTime(),pausedAt);
});

test('longer reported output delays are preserved instead of capped at half a second',()=>{
 const timeline=new AudioTimeline();timeline.anchor({currentTime:10,paused:false,playbackRate:1},20,.8);
 assert.ok(Math.abs(timeline.atContext(20)-9.2)<1e-8);
});
