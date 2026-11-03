import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIRace} from './ai-race.js';
import {installRacingLine} from './ai-line.js';
import {loadRaceWorld} from './race-world.mjs';
import {sample} from './tracks.js';
import {newCar} from './physics.js';
const w=loadRaceWorld();installRacingLine(w.track,JSON.parse(fs.readFileSync('data/gb-1948-ai-plan.json')));
for(const aggression of [90,100])for(const gap of [10,20])for(const offset of [0,1.5,-1.5]){
 const s=4050,r=new AIRace(w.track,w.surface,{count:1,difficulty:100,aggression}),b=r.bots[0];
 const make=(s,u,o=0)=>{const p=sample(w.track,s);return {...newCar({...p,x:p.x+p.nx*o,z:p.z+p.nz*o}),u};};
 b.car=make(s,30);b.previousS=s;b.progress=s;
 const player=make(s+gap,30,offset);r.player.previousS=s+gap;r.player.progress=s+gap;
 let ps=s+gap,contacts=0,stopped=0,passed=false;
 for(let i=0;i<120*12;i++){
  const t=i/120,u=t<2?30-15*t:t<6?0:Math.min(40,(t-6)*10);ps+=u/120;
  const expected=make(ps,u,offset);expected.ax=t<2?-15:t<6?0:10;
  Object.assign(player,expected);r.player.input={brake:t<6?1:0,throttle:t>=6?1:0,steer:0};
  r.tick(1/120,1+t,player);
  if(Math.hypot(player.x-expected.x,player.z-expected.z)>.001)contacts++;
  if(t>2&&b.car.u<1)stopped+=1/120;
  if(b.progress>r.player.progress+14){passed=true;break;}
 }
 console.log({aggression,gap,offset,passed,contacts,stopped});
 assert.ok(passed,'braking leader must be passed when a lane is free');if(aggression<95)assert.equal(contacts,0);assert.ok(stopped<1,'must not wait for the leader to restart');
}
