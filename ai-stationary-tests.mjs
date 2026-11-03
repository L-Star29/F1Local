import assert from 'node:assert/strict';
import {AIRace} from './ai-race.js';import {installRacingLine} from './ai-line.js';import {loadRaceWorld} from './race-world.mjs';import {newCar} from './physics.js';import {sample} from './tracks.js';import fs from 'node:fs';
const w=loadRaceWorld();installRacingLine(w.track,JSON.parse(fs.readFileSync('data/gb-1948-ai-plan.json')));
for(const aggression of [90,100])for(const performance of ['equal','challenge'])for(const [s,offset] of [[20,0],[20,-3],[20,3],[4250,0]]){
 const r=new AIRace(w.track,w.surface,{count:1,difficulty:100,aggression,laps:3,performance});const q=sample(w.track,s),p=newCar({...q,x:q.x+q.nx*offset,z:q.z+q.nz*offset});p.y=w.surface(p).y;r.player.previousS=s;r.player.progress=s;
 const b=r.bots[0],start=s-230;b.car={...newCar(sample(r.line,start)),u:80};b.previousS=(start+w.track.length)%w.track.length;b.progress=start;
 let contact=0,moved=0;for(let i=0;i<120*12;i++){r.tick(1/120,2+i/120,p);moved=Math.max(moved,Math.hypot(p.x-q.x-q.nx*offset,p.z-q.z-q.nz*offset));if(p.contactAge===0)contact++;}
 // User-requested full aggression accepts contact instead of stop-first driving.
 // Keep the collision-free contract for the conservative policy, and require
 // both policies to make progress without resetting to escape a blockage.
 console.log({aggression,performance,s,offset,contact,moved,progress:b.progress});if(aggression<95){assert.equal(contact,0,'conservative arrival must not hit a parked car');assert.ok(moved<.001);}assert.ok(b.progress>s+15,'pass a parked car when the adjacent lane is clear');assert.equal(b.recoveries,0);
}
