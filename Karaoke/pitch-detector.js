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
export class PitchSmoother {
 constructor(){this.value=null;this.lastGood=-Infinity;this.lastTime=null}
 push(midi,time){const dt=this.lastTime===null?.01:Math.max(0,time-this.lastTime);this.lastTime=time;
  if(!Number.isFinite(midi)){if(time-this.lastGood>.09)this.value=null;return this.value}
  if(this.value===null||time-this.lastGood>.12||Math.abs(midi-this.value)>7)this.value=midi;
  else this.value+=(midi-this.value)*(1-Math.exp(-dt/.025));
  this.lastGood=time;return this.value;
 }
}
export class PitchRegister {
 constructor(){this.shift=0;this.last=-Infinity}
 map(midi,target,time,octave=true){if(!Number.isFinite(midi))return null;if(!octave)this.shift=0;else if(time-this.last>.25)this.shift=12*Math.round((target-midi)/12);this.last=time;return midi+this.shift}
}
