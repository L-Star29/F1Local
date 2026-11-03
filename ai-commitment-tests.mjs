import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIRace} from './ai-race.js';
import {installRacingLine} from './ai-line.js';
import {loadRaceWorld} from './race-world.mjs';
import {newCar} from './physics.js';
import {sample} from './tracks.js';
import {racecraft} from './ai-racecraft.js';
const w=loadRaceWorld();installRacingLine(w.track,JSON.parse(fs.readFileSync('data/gb-1948-ai-plan.json')));
const race=new AIRace(w.track,w.surface,{count:1,difficulty:100,aggression:100});
for(const s of [550,1600,2800,3400,4600,5200]){
 const bot={id:'ai',car:{...newCar(sample(race.line,s)),u:50},progress:s,offset:0};
 const other={id:'you',car:{...newCar(sample(race.line,s-45)),u:52},finish:null};
 const road=w.surface(bot.car),clear=race.controls(structuredClone(bot),road,[],.05),behind=race.controls(structuredClone(bot),road,[other],.05);
 assert.equal(behind.steer,clear.steer,'distant follower must not change entry line');assert.equal(behind.throttle,clear.throttle);assert.equal(behind.brake,clear.brake);
}
// Isolate commitment from changing track normals: a straight braking zone.
const pts=Array.from({length:500},(_,i)=>({x:0,z:i*3,y:0,tx:0,tz:1,nx:-1,nz:0,curve:0,offset:0,width:14}));
const track={pts,n:500,ds:3,length:1500},line={...track,bounds:pts.map(()=>[6,6])};
const scenario={track,line,aggression:1,surface:c=>({s:c.z,offset:-c.x})};
const bot={id:'ai',car:{x:0,z:300,yaw:0,u:50,brake:1,ax:-12},tactics:{lane:2,hold:2,braking:false},offset:0};
let other={id:'you',car:{x:-4,z:299,yaw:0,u:50},finish:null};
const initial=racecraft(scenario,bot,{s:300,offset:0},[other],35,.05);
assert.equal(initial.lane,0,'overlap must not override braking commitment');
other.car.z=290;bot.car.z=303;
assert.equal(racecraft(scenario,bot,{s:303,offset:0},[other],34,.05).lane,0,'momentarily losing overlap must not cause a blocking move');
console.log('PASS: distant followers preserve six corner entries; braking commitment survives overlap changes.');
// A linked-corner direction change must not trigger a second passing-side choice.
const attacker={id:'attacker',car:{x:0,z:500,yaw:0,u:40,brake:0,ax:1},offset:0};
const rival={id:'rival',car:{x:0,z:520,yaw:0,u:35},finish:null};
for(const p of pts)p.curve=.003;
const first=racecraft(scenario,attacker,{s:500,offset:0},[rival],45,.05);
assert.ok(first.lane>0,'commit to available inside passing side');
for(const p of pts)p.curve=-.003;
assert.equal(racecraft(scenario,attacker,{s:500,offset:0},[rival],45,.05).lane,first.lane,'next bend must not reverse an ongoing pass');
attacker.car.x=-first.lane;attacker.car.z=524;rival.car.z=520;
racecraft(scenario,attacker,{s:524,offset:first.lane},[rival],45,.05);
attacker.car.z=532;
assert.equal(racecraft(scenario,attacker,{s:532,offset:first.lane},[rival],45,.05).lane,first.lane,'do not abandon side just beyond immediate overlap');
attacker.car.z=540;
assert.equal(racecraft(scenario,attacker,{s:540,offset:first.lane},[rival],45,.05).lane,0,'return to racing line after completing pass');
console.log('PASS: passing-side commitment survives linked corners and releases after clearance.');
const stale={id:'ai',car:{x:0,z:700,yaw:0,u:40,brake:1,ax:-8},offset:0,tactics:{lane:3,hold:0,braking:true,brakeLane:3}};
assert.equal(racecraft(scenario,stale,{s:700,offset:0},[],30,.05).lane,0,'expired traffic commitment must not override later clear-air corners');
