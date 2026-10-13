// One opaque stroke: hold each note, connect pitch changes, bridge short articulation gaps, lift for longer rests.
export function drawMelodyGuide(context,notes,x,y) {
 context.save();
 context.globalAlpha=1;
 context.shadowBlur=0;
 context.strokeStyle='#ffd447';
 context.lineWidth=16;
 context.lineJoin='round';
 context.lineCap='round';
 context.beginPath();
 let previous=null;
 for(const note of notes){
  if(previous&&note.start-previous.end<=.24)context.lineTo(x(note.start),y(note.midi));
  else context.moveTo(x(note.start),y(note.midi));
  context.lineTo(x(note.end),y(note.midi));
  previous=note;
 }
 context.stroke();
 context.restore();
}
