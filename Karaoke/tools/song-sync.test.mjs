import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const song=JSON.parse(fs.readFileSync(new URL('../assets/song.json',import.meta.url),'utf8'));
test('river phrase finishes before its instrumental break',()=>{const line=song.lyrics.find(l=>l.text.includes('end of the river'));assert.ok(line);const end=line.end+song.timing.lyricsOffset;assert.ok(end>=28.3&&end<=28.6);assert.ok(end<song.lyrics[song.lyrics.indexOf(line)+1].start+song.timing.lyricsOffset)});
test('instrumental break has no false pitch targets',()=>{for(const key of ['frames','contour'])assert.equal(song.reference[key].filter(p=>p.t>=28.6&&p.t<30.15).length,0)});
test('all trimmed lyric intervals remain valid',()=>{for(const line of song.lyrics){assert.ok(line.end>line.start);assert.ok(line.end+song.timing.lyricsOffset<=song.duration)}});

const alignment=JSON.parse(fs.readFileSync(new URL('./contest-youtube-alignment.json',import.meta.url),'utf8'));
test('contest uses the measured official YouTube recording and consistent vocal alignment',()=>{
 assert.equal(song.playback,'youtube');assert.equal(song.video,alignment.video);assert.equal(song.video,'qt2Ht_Tl9Ic');
 assert.ok(Math.abs(song.duration-alignment.youtubeDuration)<.001);
 assert.equal(song.timing.melodyOffset,alignment.selectedOffsetSeconds);
 assert.ok(Math.abs(song.timing.lyricsOffset-(.65+alignment.selectedOffsetSeconds))<1e-8);
 assert.equal(song.timing.revision,4);assert.equal(song.reference.version,4);
 const anchors=alignment.matches.filter(m=>m.stem==='Vocals'&&m.localTime>=15);
 assert.equal(anchors.length,5);assert.ok(anchors.some(m=>m.localTime===15));assert.ok(anchors.some(m=>m.localTime===145));
 for(const anchor of anchors)assert.ok(Math.abs(anchor.offset-song.timing.melodyOffset)<.001);
 assert.ok(anchors.filter(m=>m.correlation>.75).length>=2);
 for(const frame of song.reference.frames)assert.ok(frame.t+song.timing.melodyOffset>=0&&frame.t+song.timing.melodyOffset<song.duration);
});
