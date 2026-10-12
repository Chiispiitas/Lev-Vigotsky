import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import {PitchDetector,PitchSmoother,PitchRegister} from '../pitch-detector.js';
const source=fs.readFileSync(new URL('../pitch-worklet.js',import.meta.url),'utf8');
function capture(hz,rate=48000){let Processor,outputs=[];class Base{constructor(){this.port={postMessage:m=>outputs.push(m)}}}const scope={AudioWorkletProcessor:Base,sampleRate:rate,currentFrame:0,Float32Array,Math,registerProcessor:(name,c)=>Processor=c};vm.runInNewContext(source,scope);const processor=new Processor();for(let block=0;block<120;block++){scope.currentFrame=block*128;const input=new Float32Array(128);if(hz)for(let i=0;i<128;i++)input[i]=.12*Math.sin(2*Math.PI*hz*(block*128+i)/rate);processor.process([[input]])}const packet=outputs.at(-1);return {...new PitchDetector().detect(packet.samples,packet.rate,packet.endTime),packets:outputs,scope}}
for(const hz of [110,440,880])test(`AudioWorklet detects ${hz} Hz sine`,()=>{const result=capture(hz);assert.ok(result.confidence>.8);assert.ok(Math.abs(result.hz-hz)<3,JSON.stringify(result))});
test('AudioWorklet emits no pitch for silence',()=>{assert.equal(capture(0).hz,null)});
test('capture packets maintain 10 ms cadence with sample timestamps',()=>{const {packets}=capture(440);for(let i=1;i<packets.length;i++){const interval=packets[i].endTime-packets[i-1].endTime;assert.ok(interval>=.007&&interval<=.014)}assert.ok(packets.length>20)});
test('44.1 kHz microphones keep accurate timestamps and pitch',()=>{const result=capture(220,44100);assert.ok(Math.abs(result.hz-220)<2);assert.ok(Math.abs(result.captureTime-(result.packets.at(-1).endTime-.032))<1e-8)});
test('quiet harmonic singing remains detectable',()=>{const samples=new Float32Array(4096);for(let i=0;i<samples.length;i++){const x=2*Math.PI*196*i/48000;samples[i]=.005*Math.sin(x)+.003*Math.sin(2*x)+.002*Math.sin(3*x)}const result=new PitchDetector().detect(samples,48000);assert.ok(Math.abs(result.hz-196)<3)});
test('smoothing bridges a brief dropout but releases silence',()=>{const s=new PitchSmoother();s.push(60,0);assert.equal(s.push(null,.04),60);assert.equal(s.push(null,.12),null)});
test('visual smoothing does not lag a new phrase',()=>{const s=new PitchSmoother();s.push(60,0);s.push(null,.2);assert.equal(s.push(72,.21),72)});
test('a continuous voice cannot jump octaves when the target changes',()=>{const r=new PitchRegister();assert.equal(r.map(69,65,0),69);assert.equal(r.map(69,61,.01),69);assert.equal(r.map(69,65,.02),69)});
test('a continuous singer can switch octaves without misleading the display',()=>{
 const r=new PitchRegister();
 assert.equal(r.map(53,65,0),65);
 assert.equal(r.map(65,65,.02),65);
 assert.equal(r.map(53,65,.04),65);
 assert.equal(r.map(77,65,.06),65);
});
test('a new phrase can use a different register',()=>{const r=new PitchRegister();assert.equal(r.map(53,65,0),65);assert.equal(r.map(77,65,.5),65)});
