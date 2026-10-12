import test from 'node:test';import assert from 'node:assert/strict';
import {pitchCredit,scoreFrame,finalScore,parseLrc} from '../scoring.js';
test('octave equivalence is optional',()=>{assert.equal(pitchCredit(72,60),1);assert.equal(pitchCredit(72,60,false),0)});
test('silence and off-key audio earn no credit',()=>{assert.equal(pitchCredit(null,60),0);assert.equal(pitchCredit(65,60),0)});
test('school tolerance offers partial credit',()=>{assert.equal(pitchCredit(60.5,60),1);assert.ok(pitchCredit(61,60)>0);assert.equal(pitchCredit(61.8,60),0)});
test('timing allowance helps near a transition but excludes gaps',()=>{const frames=[{t:1,midi:60},{t:1.02,midi:62},{t:1.04,midi:62}];assert.equal(scoreFrame(frames,1,62).credit,1);assert.equal(scoreFrame(frames,2,62).eligible,false)});
test('score denominator prevents short perfect phrases winning',()=>{assert.equal(finalScore(1,10),1000);assert.equal(finalScore(10,10),10000);assert.equal(finalScore(0,10),0)});
test('LRC multiple stamps, offsets, Unicode and line endings',()=>{const lines=parseLrc('[offset:100]\r\n[00:01.00][00:03.00]Hello owl 🦉\r\n[ar:Artist]',6);assert.equal(lines.length,2);assert.equal(lines[0].start,1.1);assert.equal(lines[1].end,6)});
