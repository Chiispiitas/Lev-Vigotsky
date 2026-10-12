// Lightweight canvas particles for accurately matched notes.
export class MatchSparkles {
 constructor(random=Math.random){this.random=random;this.reset()}
 reset(){this.particles=[];this.lastEmit=-Infinity;this.lastTime=null}
 update({matched=false,time,x,y,reducedMotion=false}={}){
  if(!Number.isFinite(time))return;
  if(this.lastTime!==null&&(time<this.lastTime-.05||time-this.lastTime>.75))this.reset();
  this.lastTime=time;
  this.particles=this.particles.filter(p=>time-p.born<p.life);
  if(reducedMotion){this.particles=[];return}
  if(!matched||!Number.isFinite(x)||!Number.isFinite(y)||time-this.lastEmit<.14)return;
  this.lastEmit=time;
  for(let i=0;i<4;i++){
   const r=this.random;
   this.particles.push({
    born:time,life:.42+r()*.25,
    x:x+(r()-.5)*20,y:y+(r()-.5)*11,
    vx:(r()-.5)*100,vy:-18-r()*68,
    size:2.5+r()*3.5,spin:(r()-.5)*5,angle:r()*Math.PI,
    color:['#fff4b8','#fff','#8dc6ff'][Math.floor(r()*3)]
   });
  }
  if(this.particles.length>36)this.particles.splice(0,this.particles.length-36);
 }
 draw(ctx,time){
  if(!this.particles.length)return;
  ctx.save();
  for(const p of this.particles){
   const elapsed=Math.max(0,time-p.born),progress=Math.min(1,elapsed/p.life);
   if(progress>=1)continue;
   ctx.save();
   ctx.translate(p.x+p.vx*elapsed,p.y+p.vy*elapsed+25*elapsed*elapsed);
   ctx.rotate(p.angle+p.spin*elapsed);
   const radius=p.size*(1-.35*progress);
   ctx.globalAlpha=(1-progress)**1.5;
   ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=9;
   ctx.beginPath();
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4-Math.PI/2,dist=i%2?radius*.24:radius;
    if(i===0)ctx.moveTo(Math.cos(a)*dist,Math.sin(a)*dist);
    else ctx.lineTo(Math.cos(a)*dist,Math.sin(a)*dist);
   }
   ctx.closePath();ctx.fill();ctx.restore();
  }
  ctx.restore();
 }
}
