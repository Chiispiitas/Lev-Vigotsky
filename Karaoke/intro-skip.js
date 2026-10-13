// Leave three seconds before the earliest lyric or scored note, including saved sync offsets.
export function introTarget(song,timing={}) {
 const starts=[...(song.lyrics||[]).map(line=>line.start+(timing.lyrics||0)),
  ...(song.reference?.frames||[]).map(frame=>frame.t+(timing.melody||0))].filter(Number.isFinite);
 return starts.length?Math.max(0,Math.min(...starts)-3):0;
}
