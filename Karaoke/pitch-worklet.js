// Keep the audio render thread lightweight. Pitch analysis runs in a Worker.
class PitchCapture extends AudioWorkletProcessor {
 constructor(){super();this.ring=new Float32Array(4096);this.at=0;this.filled=0;this.since=0;this.started=false;this.hop=Math.round(sampleRate*.01)}
 process(inputs){
  const input=inputs[0]?.[0];if(!input)return true;
  for(const value of input){this.ring[this.at]=value;this.at=(this.at+1)%this.ring.length}
  this.filled=Math.min(this.ring.length,this.filled+input.length);this.since+=input.length;
  if(this.filled<this.ring.length)return true;
  if(!this.started){this.started=true;this.since=0}else{if(this.since<this.hop)return true;this.since%=this.hop}
  const samples=new Float32Array(this.ring.length);for(let i=0;i<samples.length;i++)samples[i]=this.ring[(this.at+i)%samples.length];
  this.port.postMessage({samples,rate:sampleRate,endTime:(currentFrame+input.length)/sampleRate},[samples.buffer]);
  return true;
 }
}
registerProcessor('lev-pitch',PitchCapture);
