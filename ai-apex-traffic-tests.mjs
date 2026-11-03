import assert from 'node:assert/strict';
import {AIRace} from './ai-race.js';
import {loadRaceWorld} from './race-world.mjs';
import {newCar} from './physics.js';
import {sample} from './tracks.js';
import {racecraft} from './ai-racecraft.js';

const w=loadRaceWorld(),race=new AIRace(w.track,w.surface,{count:1,difficulty:100,aggression:100});
let cases=0;
// A same-speed rival several car lengths ahead is not alongside and must not
// turn a normal corner approach into a constant-offset middle-of-road arc.
for(const s of [550,610,1650,2800,3450,3600,4700,5500]){
 for(const braking of [false,true]){
  const point=sample(race.line,s),car={...newCar(point),u:35,brake:braking?1:0,ax:braking?-5:0};
  const bot={id:'test',car,progress:s,offset:0},road=w.surface(car);
  const clear=race.controls(structuredClone(bot),road,[],.05);
  const ahead={id:'rival',car:{...newCar(sample(race.line,s+80)),u:35},finish:null};
  const traffic=race.controls(structuredClone(bot),road,[ahead],.05);
  assert.equal(traffic.steer,clear.steer,`preserve racing-line steering at ${s}, braking=${braking}`);
  assert.equal(traffic.throttle,clear.throttle,'do not sacrifice acceleration for distant traffic');
  assert.equal(traffic.brake,clear.brake,'do not add speculative braking');
  cases++;
 }
}
console.log(`PASS: ${cases} corner approaches retain clear-track steering and pace with non-overlapping traffic.`);

// An outside opponent must not pin the inside car away from an unoccupied apex.
const track={length:1000,ds:10,n:100,pts:Array.from({length:100},(_,i)=>({x:0,z:i*10,y:0,tx:0,tz:1,nx:-1,nz:0,curve:.005,offset:4}))};
const scenario={track,line:{...track,bounds:track.pts.map(()=>[6,6])},aggression:1,surface:c=>({s:c.z,offset:c.x})};
const bot={id:'ai',car:{x:0,z:100,u:30,yaw:0,brake:0,ax:0},offset:-4};
const outside={id:'you',car:{x:-4,z:100,u:30,yaw:0},finish:null};
const decision=racecraft(scenario,bot,{s:100,offset:0},[outside],30,.05);
assert.equal(decision.lane,4,'inside AI can aim for the unoccupied apex');
assert.equal(decision.speed,30,'outside overlap alone does not require slowing');
console.log('PASS: an outside rival leaves the inside apex and target speed available.');
