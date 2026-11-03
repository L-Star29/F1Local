import fs from 'node:fs';
import {AIRace} from '../ai-race.js';
import {installRacingLine} from '../ai-line.js';
import {loadRaceWorld} from '../race-world.mjs';
import {sample} from '../tracks.js';
import {newCar} from '../physics.js';
const w=loadRaceWorld();installRacingLine(w.track,JSON.parse(fs.readFileSync('data/gb-1948-ai-plan.json')));
for(const side of [null,-3,3]){
 const r=new AIRace(w.track,w.surface,{count:1,difficulty:100,aggression:100});const b=r.bots[0];
 for(let i=0;i<120*10;i++){
  const t=i/120,u=Math.min(78,t*11),s=-16+(t<78/11?5.5*t*t:5.5*(78/11)**2+78*(t-78/11));
  const p=sample(w.track,s),player={...newCar({...p,x:p.x+p.nx*(side||0),z:p.z+p.nz*(side||0)}),u};
  if(side===null)r.player.finish=999;
  r.tick(1/120,t,player);
  if(i%60===0&&t>=3){const road=w.surface(b.car);console.log(JSON.stringify({side,t,s:road.s,u:b.car.u,offset:road.offset,target:r.speedAt(road.s),brake:b.control.brake,intent:b.intent,lane:b.raceLane,tactics:b.tactics}));}
 }
}
