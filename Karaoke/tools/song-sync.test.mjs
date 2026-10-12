import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const song=JSON.parse(fs.readFileSync(new URL('../assets/song.json',import.meta.url),'utf8'));
test('river phrase finishes before its instrumental break',()=>{const line=song.lyrics.find(l=>l.text.includes('end of the river'));assert.ok(line);const end=line.end+song.timing.lyricsOffset;assert.ok(end>=28.3&&end<=28.6);assert.ok(end<song.lyrics[song.lyrics.indexOf(line)+1].start+song.timing.lyricsOffset)});
test('instrumental break has no false pitch targets',()=>{for(const key of ['frames','contour'])assert.equal(song.reference[key].filter(p=>p.t>=28.6&&p.t<30.15).length,0)});
test('all trimmed lyric intervals remain valid',()=>{for(const line of song.lyrics){assert.ok(line.end>line.start);assert.ok(line.end+song.timing.lyricsOffset<=song.duration)}});
