// React to recent singing rather than the cumulative score, with a calm dwell
// time so a single missed note does not make the mascot flicker between poses.
export class OwlMood {
 constructor(){this.reset()}
 reset(){this.mood='waiting';this.lastTime=null;this.average=null;this.candidate=null;this.since=0}
 update(time,{active=false,paused=false,credit=0,voiced=false}={}){
  if(!Number.isFinite(time))return this.mood;
  if(this.lastTime!==null&&time<this.lastTime)this.reset();
  const dt=this.lastTime===null?0:Math.min(.1,Math.max(0,time-this.lastTime));this.lastTime=time;
  if(paused||!active){this.average=null;this.candidate=null;this.mood='waiting';return this.mood}
  const value=voiced&&Number.isFinite(credit)?Math.max(0,Math.min(1,credit)):0;
  this.average=this.average===null?value:this.average+(value-this.average)*(1-Math.exp(-dt/.35));
  if(this.mood==='waiting')this.mood='singing';
  const desired=this.average>=.8?'cheering':this.average<.4?'encouraging':'singing';
  if(desired===this.mood){this.candidate=null;return this.mood}
  if(this.candidate!==desired){this.candidate=desired;this.since=time}
  if(time-this.since>=.6){this.mood=desired;this.candidate=null}
  return this.mood;
 }
}
