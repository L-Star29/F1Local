import assert from 'node:assert/strict';
import {racecraft} from './ai-racecraft.js';
const pts=Array.from({length:500},(_,i)=>({x:0,z:i*3,y:0,tx:0,tz:1,nx:-1,nz:0,curve:0,offset:0,width:16}));
const track={pts,n:500,ds:3,length:1500};
const race={track,line:{...track,bounds:pts.map(()=>[7,7])},aggression:1,surface:c=>({s:c.z,offset:-c.x})};
const car=(x,z,u)=>({x,z,y:0,yaw:0,u,v:0,r:0,brake:0,ax:0});
// Within tactical room padding, but physically clear and travelling in parallel.
for(const gap of [-5,0,5,11]){
 const bot={id:'ai',car:car(0,300,30),offset:0};
 const rival={id:'you',car:car(-2.9,300+gap,30)};
 const d=racecraft(race,bot,{s:300,offset:0},[rival],45,.05);
 assert.ok(d.speed>=30,`parallel car at gap ${gap} must not induce deceleration: ${d.speed}`);
}
// A forbidden merge should cancel lateral movement, not ratchet speed down forever.
const bot={id:'ai',car:car(0,300,20),offset:0,tactics:{lane:3,hold:3,braking:false}};
const rival={id:'you',car:car(-3,296,24)};
const d=racecraft(race,bot,{s:300,offset:0},[rival],40,.05);
assert.ok(d.speed>=20,'blocked merge must not cause unnecessary braking');
console.log('PASS: close parallel racing and blocked merges preserve forward pace.');
