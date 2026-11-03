import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIRace,gridCar} from './ai-race.js';
import {installRacingLine} from './ai-line.js';
import {loadRaceWorld} from './race-world.mjs';
const w=loadRaceWorld();installRacingLine(w.track,JSON.parse(fs.readFileSync('data/gb-1948-ai-plan.json')));
const r=new AIRace(w.track,w.surface,{count:1,difficulty:100,aggression:100}),b=r.bots[0],p=gridCar(w.track,0,w.surface);
r.player.finish=999;let atFour=0,off=0;
for(let i=0;i<120*10;i++){r.tick(1/120,i/120,p);if(i===480)atFour=b.car.u;if(w.surface(b.car).wheelsOff===4)off++;}
console.log({speedAtFourKmh:atFour*3.6,off,recoveries:b.recoveries});
assert.ok(atFour>40,'launch-to-line transition must not scrub acceleration below 144 km/h at four seconds');
assert.equal(off,0);assert.equal(b.recoveries,0);
