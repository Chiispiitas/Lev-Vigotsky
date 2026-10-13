const fraction=(time,start,end)=>end>start?Math.max(0,Math.min(1,(time-start)/(end-start))):0;
// Use the chart's syllable intervals, including rests and held notes. Local LRC
// lines remain line-timed; inventing word timestamps would imply false precision.
export function lyricSegments(line,time){
 if(!line)return [];
 const segments=line.syllables?.length?line.syllables:[line];
 return segments.map(s=>({text:s.text,fill:100*fraction(time,s.start,s.end)}));
}
export function lyricAtTime(lines,time,leadSeconds=2){
 let lo=0,hi=lines.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(lines[mid].start<=time)lo=mid+1;else hi=mid}
 const current=lo-1;
 if(current>=0&&time<lines[current].end)return {line:lines[current],index:current,active:true};
 if(lo<lines.length&&lines[lo].start-time<=leadSeconds)return {line:lines[lo],index:lo,active:false};
 return {line:null,index:current,active:false};
}
