import assert from 'node:assert/strict';
import {AIRace,gridCar} from './ai-race.js';
import {loadRaceWorld} from './race-world.mjs';
const w=loadRaceWorld(),r=new AIRace(w.track,w.surface,{count:3,difficulty:100}),p=gridCar(w.track,0,w.surface);
for(let i=0;i<120*25;i++)r.tick(1/120,i/120,p);
console.log(r.bots.map(b=>({progress:b.progress,recoveries:b.recoveries,speed:b.car.u})));assert.ok(r.bots.every(b=>b.progress>100),'bots get past a stationary player at the start');
console.log('PASS: traffic around a stationary player.');
