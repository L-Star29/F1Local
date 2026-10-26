import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SoloSession} from './solo-session.js';
import {newCar,step} from './physics.js';
const race=new SoloSession('race',1);
for(let i=0;i<Math.ceil(race.duration*120);i++)assert.equal(race.tick(1/120),false);
assert.equal(race.phase,'running');assert.equal(race.elapsed,0);
for(let i=0;i<1200;i++)assert.equal(race.tick(1/120),true);
race.completeLap(false);assert.equal(race.phase,'finished');assert.equal(race.invalid,1);
const finish=race.elapsed;assert.equal(race.tick(1),false);assert.equal(race.elapsed,finish);
race.reset('race',3);assert.equal(race.phase,'countdown');assert.equal(race.elapsed,0);
for(let i=0;i<Math.ceil(race.duration*120);i++)race.tick(1/120);
race.completeLap(true);race.completeLap(true);assert.equal(race.phase,'running');race.completeLap(true);assert.equal(race.phase,'finished');
race.reset('practice');for(let i=0;i<10;i++){assert.equal(race.tick(1),true);race.completeLap(true);}assert.equal(race.phase,'running');
// Constant-speed test bench isolates transient yaw from braking/coasting.
// The speed constraint is only in the test, never in the game's physics.
const results=[];
for(const speed of [30,50,70]){
 const c=newCar({x:0,y:0,z:0,tx:0,tz:1});let peakYaw=0;
 for(let i=0;i<240;i++){c.u=speed;step(c,{steer:1,throttle:0,brake:0},{y:0,width:15,offset:0},'formula',1/120,{assists:'none'});peakYaw=Math.max(peakYaw,Math.abs(c.r));}
 const overshoot=peakYaw/Math.abs(c.r)-1;
 assert.ok(overshoot<.24,'steering impulse should settle without a large yaw overshoot');
 assert.ok(Math.abs(c.ay)>[18,24,33][results.length],'preserve sustained cornering force');
 assert.ok(Math.abs(Math.atan2(c.v,c.u))<.065,'retain stable rear grip');
 results.push({kmh:speed*3.6,yawOvershootPercent:overshoot*100,lateralG:Math.abs(c.ay)/9.81,frontSlipDegrees:c.frontSlip*180/Math.PI});
}
fs.writeFileSync('analysis/build11-handling.json',JSON.stringify(results,null,2));
console.log('Solo countdown, finish, rematch, open practice and turn-in stability passed.',results);
