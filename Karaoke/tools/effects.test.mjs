import test from 'node:test';
import assert from 'node:assert/strict';
import {MatchSparkles} from '../pitch-effects.js';

test('only matched notes create stars and emissions are rate limited',()=>{
 const fx=new MatchSparkles(()=>.5);
 fx.update({matched:false,time:1,x:100,y:50});
 assert.equal(fx.particles.length,0);
 fx.update({matched:true,time:1.01,x:100,y:50});
 assert.equal(fx.particles.length,4);
 fx.update({matched:true,time:1.1,x:100,y:50});
 assert.equal(fx.particles.length,4);
 fx.update({matched:true,time:1.2,x:100,y:50});
 assert.equal(fx.particles.length,8);
});
test('pausing and reduced motion do not leave particles on screen',()=>{
 const fx=new MatchSparkles(()=>.5);
 fx.update({matched:true,time:1,x:20,y:20});
 fx.update({matched:false,time:1.7,x:20,y:20});
 assert.equal(fx.particles.length,0);
 fx.update({matched:true,time:2,x:20,y:20,reducedMotion:true});
 assert.equal(fx.particles.length,0);
 fx.update({matched:true,time:2.2,x:20,y:20});
 assert.equal(fx.particles.length,4);
 fx.reset();
 assert.equal(fx.particles.length,0);
});
