import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {introTarget} from '../intro-skip.js';
import {PlaybackGuard} from '../playback-guard.js';
test('intro skip leaves lead-in before both lyrics and scored notes, honoring sync offsets',()=>{
 const song={lyrics:[{start:30}],reference:{frames:[{t:28}]}};
 assert.equal(introTarget(song),25);
 assert.equal(introTarget(song,{lyrics:-8,melody:2}),19);
 assert.equal(introTarget({lyrics:[{start:1}]}),0);
 assert.equal(introTarget({}),0);
});
test('skip seeks only within the intro and clears stale microphone frames without changing score',()=>{
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const context={state:{screen:'performance',song:{lyrics:[{start:30}],reference:{frames:[{t:30}]}},score:123},introSeek:null,introTarget,songTiming:()=>({}),displayTime:()=>0,performance:{now:()=>10},micHistory:[1],trace:[1],context:{currentTime:10},audio:{currentTime:0},PitchGate:class{},PitchSmoother:class{},PitchRegister:class{},sparkles:{reset(){}},owlMood:{reset(){}},updateTimeline(){},snapshot(){}};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function skipIntro()'),source.indexOf('function pauseRound()')),context);
 context.skipIntro();assert.equal(context.audio.currentTime,27);assert.equal(context.state.score,123);assert.equal(context.micHistory.length,0);assert.equal(context.introSeek.target,27);
 context.introSeek=null;context.displayTime=()=>29;context.audio.currentTime=29;context.skipIntro();assert.equal(context.audio.currentTime,29);
 const guard=new PlaybackGuard();guard.reset(0,0);guard.reset(27,10);assert.equal(guard.observe(27.1,110),true);assert.equal(guard.observe(40,120),false);
});
