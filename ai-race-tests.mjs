import assert from 'node:assert/strict';
import {AIRace,gridCar} from './ai-race.js';
import {loadRaceWorld} from './race-world.mjs';
const w=loadRaceWorld();
for(const difficulty of ['club','standard','quick',100]){
 const race=new AIRace(w.track,w.surface,{count:3,difficulty,aggression:100,laps:1});const player=gridCar(w.track,0,w.surface);player.x+=100;race.player.finish=999;
 for(let i=0;i<120*400&&race.bots.some(b=>b.finish===null);i++)race.tick(1/120,i/120,player);
 console.log(difficulty,race.bots.map(b=>({finish:b.finish,recoveries:b.recoveries,progress:b.progress})));
 assert.ok(race.bots.every(b=>b.finish>70&&b.finish<400),'every AI must complete a full lap');assert.ok(race.bots.every(b=>b.recoveries===0),'no teleport recovery in an unobstructed race');
}
const r=new AIRace(w.track,w.surface,{count:1}),p=gridCar(w.track,0,w.surface),before={...r.bots[0].car};r.tick(1/120,.1,p);assert.equal(r.bots[0].car.x,before.x,'AI waits for reaction delay');
console.log('PASS: four difficulty levels, three-car races, lap completion and launch reaction.');
