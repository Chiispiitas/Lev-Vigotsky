const RATE=16000,N=1024;
export class PitchDetector {
 constructor(){this.frame=new Float32Array(N);this.diff=new Float32Array(256)}
 detect(samples,rate,endTime=0){
  const step=rate/RATE,start=samples.length-N*step,frame=this.frame;let mean=0;
  for(let i=0;i<N;i++){const position=Math.max(0,start+i*step),j=Math.floor(position),fraction=position-j;frame[i]=(samples[j]||0)*(1-fraction)+(samples[Math.min(j+1,samples.length-1)]||0)*fraction;mean+=frame[i]}
  mean/=N;let energy=0;for(let i=0;i<N;i++){frame[i]-=mean;energy+=frame[i]*frame[i]}const rms=Math.sqrt(energy/N),captureTime=endTime-N/(2*RATE);
  if(rms<.0015)return {hz:null,rms,confidence:0,captureTime};
  const min=Math.floor(RATE/1100),max=Math.ceil(RATE/70),length=N-max;let sum=0,best=1,lag=-1;this.diff[0]=1;
  for(let tau=1;tau<=max;tau++){let d=0;for(let i=0;i<length;i++){const delta=frame[i]-frame[i+tau];d+=delta*delta}sum+=d;const value=sum?d*tau/sum:1;this.diff[tau]=value;if(tau>=min&&value<best){best=value;lag=tau}}
  for(let tau=min+1;tau<max;tau++)if(this.diff[tau]<.22&&this.diff[tau]<=this.diff[tau-1]&&this.diff[tau]<this.diff[tau+1]){lag=tau;break}
  if(lag<min||this.diff[lag]>.4)return {hz:null,rms,confidence:0,captureTime};
  const a=this.diff[lag-1],b=this.diff[lag],c=this.diff[lag+1]??b,denominator=a+c-2*b;
  const correction=denominator?Math.max(-.5,Math.min(.5,(a-c)/(2*denominator))):0;
  return {hz:RATE/(lag+correction),rms,confidence:Math.max(0,1-b),captureTime};
 }
}
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]};
// Confirm a short run of consistent pitch before admitting an onset or leap.
// Rejected frames stay unvoiced for scoring; only the display bridges dropouts.
export class PitchGate {
 constructor(){this.value=null;this.lastGood=-Infinity;this.lastTime=-Infinity;this.candidate=null;this.samples=[]}
 push(midi,time,confidence=1,rms=1,noiseFloor=0){
  if(!Number.isFinite(time)||time<=this.lastTime)return null;
  this.lastTime=time;
  if(time-this.lastGood>.12){this.value=null;this.samples=[]}
  const threshold=this.value===null?.78:.72;
  if(!Number.isFinite(midi)||!Number.isFinite(confidence)||confidence<threshold||!Number.isFinite(rms)||rms<noiseFloor){
   this.candidate=null;if(time-this.lastGood>.09){this.value=null;this.samples=[]}return null;
  }
  const jump=this.value===null?0:Math.abs(midi-this.value);
  if(this.value===null||jump>3){
   let pending=this.candidate;
   if(!pending||time-pending.last>.03||Math.abs(midi-median(pending.samples))>1){pending={start:time,last:time,samples:[]};this.candidate=pending}
   pending.last=time;pending.samples.push(midi);if(pending.samples.length>7)pending.samples.shift();
   const confirmation=jump>=7?.045:.025;
   if(pending.samples.length<3||time-pending.start<confirmation)return null;
   this.value=median(pending.samples);this.samples=[this.value,this.value,this.value];this.candidate=null;
  }else{
   this.candidate=null;this.samples.push(midi);if(this.samples.length>3)this.samples.shift();this.value=median(this.samples);
  }
  this.lastGood=time;return this.value;
 }
}
export class PitchSmoother {
 constructor(){this.value=null;this.lastGood=-Infinity;this.lastTime=null}
 push(midi,time){const dt=this.lastTime===null?.01:Math.max(0,time-this.lastTime);this.lastTime=time;
  if(!Number.isFinite(midi)){if(time-this.lastGood>.09)this.value=null;return this.value}
  if(this.value===null||time-this.lastGood>.12||Math.abs(midi-this.value)>7)this.value=midi;
  else this.value+=(midi-this.value)*(1-Math.exp(-dt/.04));
  this.lastGood=time;return this.value;
 }
}
export class PitchRegister {
 constructor(){this.shift=0;this.last=-Infinity}
 map(midi,target,time,octave=true){
  if(!Number.isFinite(midi))return null;
  if(!octave||!Number.isFinite(target)){this.shift=0;this.last=time;return midi}
  const desired=12*Math.round((target-midi)/12);
  const previousError=Math.abs(midi+this.shift-target);
  const correctedError=Math.abs(midi+desired-target);
  // Re-align a full octave jump even while the singer is sustaining a phrase.
  // Ignore smaller target changes to avoid visual hopping near octave boundaries.
  if(time-this.last>.25||previousError-correctedError>=7)this.shift=desired;
  this.last=time;
  return midi+this.shift;
 }
}
