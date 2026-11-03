import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIRace} from './ai-race.js';
import {installRacingLine} from './ai-line.js';
import {loadRaceWorld} from './race-world.mjs';
import {sample} from './tracks.js';
import {newCar} from './physics.js';
const w=loadRaceWorld();installRacingLine(w.track,JSON.parse(fs.readFileSync('data/gb-1948-ai-plan.json')));
for(const gap of [8,12,18]){
 const r=new AIRace(w.track,w.surface,{count:1,difficulty:100,aggression:100}),b=r.bots[0],s=40;
 b.car=newCar(sample(w.track,s));b.car.y=w.surface(b.car).y;b.previousS=s;b.progress=s;
 const player=newCar(sample(w.track,s+gap));player.y=w.surface(player).y;
 r.player.previousS=s+gap;r.player.progress=s+gap;const start={x:player.x,z:player.z};
 let contacts=0,passed=false,firstMove=null,stoppedAfterLaunch=0;
 for(let i=0;i<120*20;i++){
  r.tick(1/120,1+i/120,player);
  if(b.car.u>.5&&firstMove===null)firstMove=i/120;
  if(firstMove!==null&&b.car.u<.5)stoppedAfterLaunch+=1/120;
  if(Math.hypot(player.x-start.x,player.z-start.z)>.001)contacts++;
  if(b.progress>r.player.progress+14){passed=true;break;}
 }
 console.log({gap,passed,contacts,firstMove,stoppedAfterLaunch,progress:b.progress});
 assert.ok(passed,'AI must pull out from rest behind a parked car');assert.equal(contacts,0);assert.equal(b.recoveries,0);
 assert.ok(firstMove<.5,'pull out promptly rather than waiting behind the parked car');assert.ok(stoppedAfterLaunch<.25,'do not stop during an available pass');
}
