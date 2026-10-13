// A scored round must traverse the song normally. Embedded-player seeking
// cannot skip notes or score the same phrase twice.
export class PlaybackGuard {
 reset(time,wall){this.time=time;this.wall=wall}
 observe(time,wall){
  if(this.wall===undefined){this.reset(time,wall);return true}
  const delta=time-this.time,elapsed=Math.max(0,(wall-this.wall)/1000);
  this.reset(time,wall);return delta>=-.5&&delta<=elapsed+1.5;
 }
}
