export function pitchCredit(singerMidi,targetMidi,octave=true){
 if(!Number.isFinite(singerMidi)||!Number.isFinite(targetMidi))return 0;
 let difference=Math.abs(singerMidi-targetMidi);
 if(octave)difference=Math.abs(((difference+6)%12)-6);
 const cents=Math.round(difference*100*1e8)/1e8;
 return cents<=75?1:cents>=200?0:1-(cents-75)/125;
}
export function closestFrameIndex(frames,time){
 let lo=0,hi=frames.length;
 while(lo<hi){let mid=(lo+hi)>>1;if(frames[mid].t<time)lo=mid+1;else hi=mid}
 if(lo===0)return 0;if(lo===frames.length)return lo-1;
 return time-frames[lo-1].t<frames[lo].t-time?lo-1:lo;
}
export function scoreFrame(frames,time,midi,{octave=true,tolerance=.18}={}){
 if(!frames.length)return {eligible:false,credit:0,target:null};
 const i=closestFrameIndex(frames,time),target=frames[i];
 if(Math.abs(target.t-time)>.025)return {eligible:false,credit:0,target:null};
 let credit=pitchCredit(midi,target.midi,octave);
 if(Number.isFinite(midi)){let first=closestFrameIndex(frames,time-tolerance);for(let j=Math.max(0,first-1);j<frames.length&&frames[j].t<=time+tolerance;j++)if(Math.abs(frames[j].t-time)<=tolerance)credit=Math.max(credit,pitchCredit(midi,frames[j].midi,octave))}
 return {eligible:true,credit,target:target.midi};
}
export function finalScore(creditSeconds,totalSeconds){return totalSeconds>0?Math.min(10000,Math.round(10000*Math.max(0,creditSeconds)/totalSeconds)):0}
export function parseLrc(text,duration){
 const lines=[];let offset=0;const o=text.match(/\[offset:([+-]?\d+)\]/i);if(o)offset=+o[1]/1000;
 for(const row of text.split(/\r?\n/)){const stamps=[...row.matchAll(/\[(\d+):(\d{2}(?:\.\d+)?)\]/g)],line=row.replace(/\[[^\]]+\]/g,'').trim();if(!line)continue;for(const stamp of stamps)lines.push({start:Math.max(0,+stamp[1]*60+ +stamp[2]+offset),text:line})}
 lines.sort((a,b)=>a.start-b.start);return lines.map((line,i)=>({...line,end:Math.min(lines[i+1]?.start??duration,line.start+7)}));
}
