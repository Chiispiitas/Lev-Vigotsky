import test from 'node:test';
import assert from 'node:assert/strict';
import {readTabSession,writeTabSession,clearTabSession} from './session.js';
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
test('tab session survives reload and is removed on logout',()=>{const storage=memory(),value={code:'a'.repeat(24),selected:'participant-21',view:'participants',category:'Mini Miss',search:'Primero'};assert.equal(writeTabSession(value,storage),true);assert.deepEqual(readTabSession(storage),value);clearTabSession(storage);assert.equal(readTabSession(storage),null);});
test('invalid stored sessions are ignored and storage failures do not break login',()=>{const storage=memory();writeTabSession({code:'invalid'},storage);assert.equal(readTabSession(storage),null);const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};assert.equal(readTabSession(blocked),null);assert.equal(writeTabSession({code:'a'.repeat(24)},blocked),false);assert.doesNotThrow(()=>clearTabSession(blocked));});
