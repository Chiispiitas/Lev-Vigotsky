import test from 'node:test';
import assert from 'node:assert/strict';
import {lyricSegments,lyricAtTime} from '../lyric-sync.js';
import {parseChart} from '../song-catalog.js';
test('lyric highlight follows uneven syllables and pauses instead of sweeping the whole line',()=>{
 const line={start:1,end:5,text:'Hello world',syllables:[{start:1,end:1.2,text:'Hel'},{start:1.2,end:2,text:'lo '},{start:4,end:5,text:'world'}]};
 assert.deepEqual(lyricSegments(line,3).map(s=>s.fill),[100,100,0]);
 assert.deepEqual(lyricSegments(line,4.5).map(s=>s.fill),[100,100,50]);
 assert.ok(Math.abs(lyricSegments(line,1.1)[0].fill-50)<1e-8);
});
test('UltraStar millisecond gap and beat conversion preserve syllable and held-note timing',()=>{
 const song=parseChart('#BPM:120\n#GAP:1000\n: 0 4 0 Hel\n: 4 4 0 lo \n: 8 4 0 ~\nF 16 4 0 world\n- 20',{duration:5});
 assert.equal(song.lyricPrecision,'syllable');assert.equal(song.lyrics[0].text,'Hello world');
 assert.equal(song.lyrics[0].syllables[0].start,1);assert.equal(song.lyrics[0].syllables[0].end,1.5);
 assert.equal(song.lyrics[0].syllables[1].end,2.5);
 assert.deepEqual(lyricSegments(song.lyrics[0],2.75).map(s=>s.fill),[100,100,0]);
});
test('preview appears before the first word, stays unfilled, and re-enters repeated choruses at the correct time',()=>{
 const lines=[{start:4,end:6,text:'Hello'},{start:10,end:12,text:'Hello'}];
 assert.equal(lyricAtTime(lines,1).line,null);
 const preview=lyricAtTime(lines,2,2);assert.equal(preview.index,0);assert.equal(preview.active,false);assert.equal(lyricSegments(preview.line,2)[0].fill,0);
 assert.equal(lyricAtTime(lines,4).active,true);assert.equal(lyricAtTime(lines,6).line,null);
 assert.equal(lyricAtTime(lines,8,2).index,1);assert.equal(lyricAtTime(lines,10.5).index,1);
 assert.equal(lyricSegments(lyricAtTime(lines,10.5).line,10.5)[0].fill,25);
});
test('local line-timed lyrics retain their actual precision and seek or pause recomputes highlight without drift',()=>{
 const line={start:1,end:3,text:'Local LRC'};
 assert.equal(lyricSegments(line,2)[0].fill,50);assert.equal(lyricSegments(line,2)[0].fill,50);
 assert.equal(lyricSegments(line,.5)[0].fill,0);assert.equal(lyricSegments(line,5)[0].fill,100);
});

test('main lyrics never become current ahead of the first syllable by default',()=>{
 const lines=[{start:4,end:6,text:'First'},{start:10,end:12,text:'Next'}];
 assert.equal(lyricAtTime(lines,2).line,null);assert.equal(lyricAtTime(lines,3.99).active,false);
 assert.equal(lyricAtTime(lines,4).line.text,'First');assert.equal(lyricAtTime(lines,8).line,null);
 assert.equal(lyricAtTime(lines,10).line.text,'Next');
});
