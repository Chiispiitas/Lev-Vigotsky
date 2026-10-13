import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import {PitchDetector,PitchGate,PitchSmoother,PitchRegister} from '../pitch-detector.js';
import {pitchCredit} from '../scoring.js';
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
function settledGate(midi=60){const gate=new PitchGate();for(let i=0;i<=5;i++)gate.push(midi,i*.01,.95,.01,.0025);return gate}
test('isolated high and low spikes never enter the display or scoring',()=>{
 const gate=settledGate(),smooth=new PitchSmoother();smooth.push(60,.05);
 for(const [time,midi] of [[.06,84],[.07,60],[.08,36],[.09,60],[.10,85],[.11,35],[.12,60]]){
  const filtered=gate.push(midi,time,.99,.02,.0025);
  assert.equal(filtered,midi===60?60:null);assert.equal(smooth.push(filtered,time),60);
 }
});
test('a two-frame static burst is rejected and normal singing recovers immediately',()=>{
 const gate=settledGate();assert.equal(gate.push(83,.06),null);assert.equal(gate.push(83,.07),null);assert.equal(gate.push(60,.08),60);
});
test('real upward and downward octave changes settle within 60 ms',()=>{
 const gate=settledGate();let first;
 for(let i=6;i<=12;i++){const pitch=gate.push(72,i*.01);if(pitch!==null&&first===undefined)first=i*.01;}
 assert.ok(first>=.10&&first<=.12);assert.equal(gate.value,72);
 first=undefined;for(let i=13;i<=19;i++){const pitch=gate.push(48,i*.01);if(pitch!==null&&first===undefined)first=i*.01;}
 assert.ok(first>=.17&&first<=.19);assert.equal(gate.value,48);
});
test('normal note changes, vibrato, and quiet confident singing remain responsive',()=>{
 const gate=settledGate();for(let i=6;i<=15;i++){const raw=60+.4*Math.sin(i);const filtered=gate.push(raw,i*.01,.95,.003,.0025);assert.ok(filtered>=59.6&&filtered<=60.4)}
 let first;for(let i=16;i<=22;i++){const filtered=gate.push(65,i*.01,.95,.003,.0025);if(filtered!==null&&first===undefined)first=i*.01}
 assert.ok(first>=.18&&first<=.20);assert.equal(gate.value,65);
});
test('low confidence and below-threshold noise stay unvoiced even during a note',()=>{
 const gate=settledGate();assert.equal(gate.push(60,.06,.6,.1,.0025),null);assert.equal(gate.push(60,.07,.99,.001,.0025),null);
 assert.equal(gate.push(60,.08,.95,.003,.0025),60);
});
test('new phrases require a consistent onset and silence never earns held-note credit',()=>{
 const gate=settledGate();assert.equal(gate.push(null,.2),null);
 for(let i=21;i<=23;i++)assert.equal(gate.push(72,i*.01),null);
 assert.equal(gate.push(72,.24),72);assert.equal(gate.push(null,.25),null);
 const other=settledGate(64);const rejected=other.push(60,.06);
 assert.equal(pitchCredit(rejected,60),0);assert.equal(other.value,64);
});
test('out-of-order packets and inconsistent onset noise cannot confirm a pitch',()=>{
 const gate=settledGate();assert.equal(gate.push(84,.04),null);assert.equal(gate.push(60,.06),60);
 const noise=new PitchGate();for(let i=0;i<30;i++)assert.equal(noise.push(i%2?84:36,i*.01,.99,.1,.0025),null);
});
test('a loud 20 ms interference burst cannot turn a sustained voice into a high note',()=>{
 const detector=new PitchDetector(),gate=new PitchGate();let rawSpikes=0,accepted=0;
 for(let step=9;step<=60;step++){
  const end=step*.01,samples=new Float32Array(4096);
  for(let i=0;i<samples.length;i++){const time=end-(samples.length-i)/48000;samples[i]=.08*Math.sin(2*Math.PI*196*time)+(time>=.2&&time<.22?.4*Math.sin(2*Math.PI*880*time):0)}
  const result=detector.detect(samples,48000,end),midi=result.hz?69+12*Math.log2(result.hz/440):null;
  if(midi!==null&&Math.abs(midi-55)>3)rawSpikes++;
  const filtered=gate.push(midi,result.captureTime,result.confidence,result.rms,.0025);
  if(filtered!==null){accepted++;assert.ok(Math.abs(filtered-55)<.5)}
 }
 assert.ok(rawSpikes>=3,'exercise detector outliers across overlapping analysis windows');
 assert.ok(accepted>35,'keep the sustained voice before and after the burst');
});
