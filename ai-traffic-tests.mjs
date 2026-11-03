import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIRace,gridCar} from './ai-race.js';
import {installRacingLine} from './ai-line.js';
import {loadRaceWorld} from './race-world.mjs';
const w=loadRaceWorld();installRacingLine(w.track,JSON.parse(fs.readFileSync('data/gb-1948-ai-plan.json')));
for(const performance of ['equal','challenge']){
 const r=new AIRace(w.track,w.surface,{count:3,difficulty:100,performance}),p=gridCar(w.track,0,w.surface),start={x:p.x,z:p.z};
 for(let i=0;i<120*25;i++)r.tick(1/120,i/120,p);
 console.log({performance,bots:r.bots.map(b=>({progress:b.progress,recoveries:b.recoveries,speed:b.car.u}))});
 assert.ok(r.bots.every(b=>b.progress>100),'all bots get past a stationary player at the start');
 assert.ok(Math.hypot(p.x-start.x,p.z-start.z)<.001,'grid queue must not push the parked player');
 assert.notEqual(p.contactAge,0,'no contact with parked player');
}
console.log('PASS: stationary grid queue clears without player contact.');
