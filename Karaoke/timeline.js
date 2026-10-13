export class AudioTimeline {
 constructor(){this.mediaTime=0;this.contextTime=0;this.outputDelay=0;this.rate=1;this.running=false}
 anchor(media,contextTime,outputDelay=0){this.mediaTime=media.currentTime;this.contextTime=contextTime;this.outputDelay=Math.max(0,Math.min(.5,outputDelay));this.rate=media.playbackRate||1;this.running=!media.paused&&!media.ended&&!media.seeking}
 atContext(time){return Math.max(0,this.mediaTime+(this.running?(time-this.contextTime-this.outputDelay)*this.rate:0))}
 captureAt(time,inputDelay=0){return this.atContext(time)-inputDelay/1000}
}
export function projectedTime(time,sentAt,now,running){return time+(running?Math.min(.2,Math.max(0,(now-sentAt)/1000)):0)}
export function currentCapture(time,notBefore,now){return Number.isFinite(time)&&time>=notBefore&&time<=now+.01}
