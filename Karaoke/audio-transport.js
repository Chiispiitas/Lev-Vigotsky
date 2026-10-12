// Predecode the instrumental and schedule playback on the same sample clock
// used by microphone capture. Network buffering cannot shift a running round.
export class AudioTransport extends EventTarget {
 constructor(getContext){super();this.getContext=getContext;this.cache=new Map();this.buffer=null;this._src='';this._offset=0;this._rate=1;this._volume=.8;this.paused=true;this.ended=false;this.seeking=false;this.readyState=0;this.startAt=0;this.loadPromise=null}
 set src(value){this.pause();this._src=value;this.buffer=this.cache.get(value)||null;this.readyState=this.buffer?4:0;this._offset=0;this.ended=false;this.loadPromise=null}
 get src(){return this._src}
 get duration(){return this.buffer?.duration||0}
 get currentTime(){return Math.min(this.duration,this._offset+(!this.paused?Math.max(0,this.ctx.currentTime-this.startAt)*this._rate:0))}
 set currentTime(value){const running=!this.paused;this.pause();this._offset=Math.max(0,Math.min(this.duration,Number(value)||0));this.ended=false;if(running)this.play().catch(()=>this.fail())}
 set volume(value){this._volume=value;if(this.gain)this.gain.gain.setValueAtTime(value,this.ctx.currentTime)}
 get volume(){return this._volume}
 get playbackRate(){return this._rate}
 set playbackRate(value){const running=!this.paused;this.pause();this._rate=Math.max(.25,Math.min(4,value));if(running)this.play().catch(()=>this.fail())}
 fail(){this.dispatchEvent(new Event('error'));this.onerror?.(new Event('error'))}
 load(){if(this.buffer){queueMicrotask(()=>this.oncanplay?.());return Promise.resolve()}if(this.loadPromise)return this.loadPromise;
  const url=this.src;this.loadPromise=(async()=>{this.ctx=await this.getContext();const response=await fetch(url);if(!response.ok)throw new Error('Instrumental failed to load');const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());this.cache.set(url,buffer);if(url!==this.src)return;this.buffer=buffer;this.readyState=4;this.oncanplay?.();this.dispatchEvent(new Event('canplay'))})().catch(error=>{this.loadPromise=null;this.fail();throw error});
  // Legacy event-style callers handle onerror; retain the promise for play().
  this.loadPromise.catch(()=>{});return this.loadPromise;
 }
 async play(){await this.load();this.ctx=await this.getContext();if(!this.paused)return;this.source=this.ctx.createBufferSource();this.source.buffer=this.buffer;this.source.playbackRate.value=this._rate;if(!this.gain){this.gain=this.ctx.createGain();this.gain.connect(this.ctx.destination)}this.gain.gain.value=this.volume;this.source.connect(this.gain);this.startAt=this.ctx.currentTime+.025;this.paused=false;this.ended=false;this.source.onended=()=>{if(this.paused)return;this._offset=this.duration;this.paused=true;this.ended=true;this.dispatchEvent(new Event('ended'))};this.source.start(this.startAt,this._offset)}
 pause(){if(this.paused)return;this._offset=this.currentTime;this.paused=true;if(this.source){this.source.onended=null;try{this.source.stop()}catch{}this.source.disconnect();this.source=null}}
}
