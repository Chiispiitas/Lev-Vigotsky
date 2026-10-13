import test from 'node:test';
import assert from 'node:assert/strict';
import {OwlMood} from '../owl-mood.js';
test('owl cheers sustained good singing and encourages sustained misses',()=>{
 const owl=new OwlMood();
 for(let i=0;i<=20;i++)owl.update(i*.05,{active:true,voiced:true,credit:1});
 assert.equal(owl.mood,'cheering');
 for(let i=21;i<=60;i++)owl.update(i*.05,{active:true,voiced:true,credit:0});
 assert.equal(owl.mood,'encouraging');
});
test('one missed note does not flicker the owl, and instrumental breaks or pause stay neutral',()=>{
 const owl=new OwlMood();for(let i=0;i<=20;i++)owl.update(i*.05,{active:true,voiced:true,credit:1});
 owl.update(1.05,{active:true,voiced:true,credit:0});assert.equal(owl.mood,'cheering');
 assert.equal(owl.update(1.1,{active:false}),'waiting');
 assert.equal(owl.update(1.2,{active:true,voiced:true,credit:1,paused:true}),'waiting');
});
test('restart clears the previous performance emotion and silence receives encouragement',()=>{
 const owl=new OwlMood();for(let i=0;i<=20;i++)owl.update(i*.05,{active:true,voiced:true,credit:1});
 assert.equal(owl.update(0,{active:true,voiced:true,credit:.6}),'singing');
 for(let i=1;i<=30;i++)owl.update(i*.05,{active:true,voiced:false,credit:1});
 assert.equal(owl.mood,'encouraging');
});
