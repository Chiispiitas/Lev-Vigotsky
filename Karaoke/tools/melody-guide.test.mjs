import test from 'node:test';
import assert from 'node:assert/strict';
import {drawMelodyGuide} from '../melody-guide.js';

test('guide uses one opaque constant-width stroke and connects large pitch jumps',()=>{
 const calls=[];
 const context={save(){calls.push(['save'])},restore(){calls.push(['restore'])},beginPath(){calls.push(['begin'])},moveTo(...xy){calls.push(['move',...xy])},lineTo(...xy){calls.push(['line',...xy])},stroke(){calls.push(['stroke',this.globalAlpha,this.lineWidth,this.strokeStyle,this.shadowBlur])}};
 drawMelodyGuide(context,[{start:0,end:1,midi:60},{start:1.1,end:2,midi:72},{start:3,end:4,midi:55}],t=>t*100,m=>m);
 assert.deepEqual(calls.filter(c=>c[0]==='stroke'),[['stroke',1,16,'#ffd447',0]]);
 assert.deepEqual(calls.filter(c=>c[0]==='move'),[['move',0,60],['move',300,55]]);
 assert.ok(calls.some(c=>c[0]==='line'&&Math.abs(c[1]-110)<1e-8&&c[2]===72));
 assert.equal(calls.filter(c=>c[0]==='begin').length,1);
 assert.equal(calls.at(-1)[0],'restore');
});
