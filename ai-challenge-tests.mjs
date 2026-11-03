import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIRace,gridCar} from './ai-race.js';
import {installRacingLine} from './ai-line.js';
import {loadRaceWorld} from './race-world.mjs';
import {vehicles} from './physics.js';
import {sample} from './tracks.js';

const w=loadRaceWorld(),vehicleBefore=JSON.stringify(vehicles);
installRacingLine(w.track,JSON.parse(fs.readFileSync('data/gb-1948-ai-plan.json')));
const results=[];
for(const displacement of [0,-.3,.3]){
 const race=new AIRace(w.track,w.surface,{count:1,difficulty:100,performance:'challenge',laps:5});
 const player=gridCar(w.track,0,w.surface);race.player.finish=999;
 const bot=race.bots[0],start=sample(w.track,bot.previousS);
 bot.car.x+=start.nx*displacement;bot.car.z+=start.nz*displacement;
 let previous=0,completed=0,off=0,unsafe=0,maxError=0;const laps=[];
 for(let i=0;i<120*520&&bot.finish===null;i++){
  race.tick(1/120,i/120,player);
  const road=w.surface(bot.car),line=sample(race.line,road.s);
  off+=Number(road.wheelsOff===4);unsafe+=Number(road.unsafeWheels>0);
  if(bot.progress>60)maxError=Math.max(maxError,Math.abs((bot.car.x-line.x)*line.nx+(bot.car.z-line.z)*line.nz));
  if(bot.completed>completed){const lap=i/120-previous;laps.push(lap);previous=i/120;completed=bot.completed;
   if(completed>1)assert.ok(lap<=95,`Challenge flying lap ${completed}: ${lap}s exceeds 1:35`);
  }
 }
 assert.equal(completed,5);assert.equal(off,0,'no four-wheel excursions');assert.equal(unsafe,0,'no grass/runoff shortcuts');
 assert.equal(bot.recoveries,0);assert.equal(bot.penalty,0);assert.ok(maxError<4);
 results.push({displacement,laps,off,unsafe,maxError});
 console.log(results.at(-1));
}
assert.equal(JSON.stringify(vehicles),vehicleBefore,'challenge must not modify shared/player vehicle definitions');
fs.writeFileSync('analysis/ai-challenge-validation.json',JSON.stringify({mode:'challenge',skill:100,aiDownforceMultiplier:1.35,aiPowerMultiplier:1.025,results},null,2));
