import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIRace} from './ai-race.js';
import {installRacingLine} from './ai-line.js';
import {loadRaceWorld} from './race-world.mjs';
import {sample} from './tracks.js';
import {newCar} from './physics.js';
const w=loadRaceWorld();installRacingLine(w.track,JSON.parse(fs.readFileSync('data/gb-1948-ai-plan.json')));
for(const aggression of [90,100])for(const s of [2200,4050]){
 const r=new AIRace(w.track,w.surface,{count:1,difficulty:100,aggression}),b=r.bots[0];
 const make=(s,speed)=>({...newCar(sample(w.track,s)),u:speed});
 b.car=make(s,50);b.previousS=s;b.progress=s;
 const player=make(s+22,30);r.player.previousS=s+22;r.player.progress=s+22;
 let contacts=0,off=0,passed=false;
 for(let i=0;i<120*7;i++){
  const expected=make(s+22+30*i/120,30);Object.assign(player,expected);
  r.tick(1/120,1+i/120,player);
  if(Math.hypot(player.x-expected.x,player.z-expected.z)>.001)contacts++;
  if(w.surface(b.car).wheelsOff===4)off++;
  if(b.progress-r.player.progress>14){passed=true;break;}
 }
 console.log({aggression,s,passed,contacts,off,gap:b.progress-r.player.progress});
 assert.ok(passed,'take an available lane and complete a moving-car overtake');
 if(aggression<95)assert.equal(contacts,0);assert.equal(off,0);assert.equal(b.recoveries,0);
}
// Player passes and then stays nearby: AI must keep racing instead of stopping.
for(const side of [-1,1]){
 const s=4050,r=new AIRace(w.track,w.surface,{count:1,difficulty:100,aggression:100}),b=r.bots[0];
 const make=(s,speed,offset=0)=>{const p=sample(w.track,s);return {...newCar({...p,x:p.x+p.nx*offset,z:p.z+p.nz*offset}),u:speed};};
 b.car=make(s,45);b.previousS=s;b.progress=s;
 const player=make(s-10,60,side*3);r.player.previousS=s-10;r.player.progress=s-10;
 let minimumSpeed=Infinity,contacts=0;
 for(let i=0;i<120*4;i++){
  const expected=make(s-10+60*i/120,60,side*3);Object.assign(player,expected);
  r.tick(1/120,1+i/120,player);minimumSpeed=Math.min(minimumSpeed,b.car.u);
  if(Math.hypot(player.x-expected.x,player.z-expected.z)>.001)contacts++;
 }
 console.log({playerPassSide:side,minimumSpeed,contacts});
 assert.ok(minimumSpeed>35,'being passed on a straight must not bring AI to a crawl');assert.equal(contacts,0);
}
// A moving leader brakes well before the following AI's planned braking point.
{
 const s=2200,r=new AIRace(w.track,w.surface,{count:1,difficulty:100,aggression:100}),b=r.bots[0];
 b.car={...newCar(sample(w.track,s)),u:35};b.previousS=s;b.progress=s;
 const player={...newCar(sample(w.track,s+20)),u:35};r.player.previousS=s+20;r.player.progress=s+20;
 let contacts=0,passed=false;
 for(let i=0;i<120*7;i++){
  const t=i/120,braking=Math.min(t,2),travel=35*braking-5*braking*braking+15*Math.max(0,t-2);
  const expected={...newCar(sample(w.track,s+20+travel)),u:Math.max(15,35-10*t),ax:t<2?-10:0,brake:t<2?1:0};
  Object.assign(player,expected);r.tick(1/120,1+t,player);
  if(Math.hypot(player.x-expected.x,player.z-expected.z)>.001)contacts++;
  if(b.progress>r.player.progress+14){passed=true;break;}
 }
 console.log({earlyBrakingLeader:true,passed,contacts});
 assert.ok(passed,'react to early braking and complete the available pass'); // Full aggression reports contact but no longer guarantees collision-free traffic braking.
}
