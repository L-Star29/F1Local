import assert from 'node:assert/strict';
import fs from 'node:fs';
import {measure} from './transition-analysis.mjs';
import * as api from './physics.js';
import {chasePose} from './camera-rig.js';
const report=measure(api),road={y:0,width:14,offset:0},settings={assists:'none',gears:'auto'};
for(let t of report.transitions)assert.ok(t.maxBeta<6,JSON.stringify(t));
assert.ok(report.acceleration[100]>2.2&&report.acceleration[100]<3.1);
assert.ok(report.acceleration[200]>4&&report.acceleration[200]<6);
for(let speed of [0,30,80,95])for(let hz of [30,60,120]){let state={yaw:0};for(let i=0;i<hz*3;i++){let t=i/hz,c={x:0,z:t*speed,yaw:t*.3},r=chasePose(c,0,state,1/hz);assert.ok(Math.abs(Math.hypot(r.position.x-c.x,r.position.z-c.z)-8.2)<1e-8);}}
function scenario(dt){let c={...api.newCar({x:0,y:0,z:0,tx:0,tz:1}),u:60};for(let i=0;i<2/dt;i++)api.step(c,{steer:.6,throttle:i*dt<1?.4:0,brake:i*dt>1?.4:0},road,'formula',dt,settings);return c;}
let a=scenario(1/120),b=scenario(1/240);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.7);assert.ok(Math.abs(a.yaw-b.yaw)<.025);
let seed=731,worst=0;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
for(let run=0;run<80;run++){let c={...api.newCar({x:0,y:0,z:0,tx:0,tz:1}),u:20+random()*72},input;let r={...road,wheelGrip:run%2?[.9,1,.9,1]:[1,1,1,1]};for(let i=0;i<720;i++){if(i%60===0)input={steer:Math.sign(random()-.5),throttle:random()>.4?1:0,brake:random()>.75?1:0};api.step(c,input,r,'formula',1/120,settings);assert.ok([c.x,c.z,c.u,c.v,c.r].every(Number.isFinite));if(c.u>15)worst=Math.max(worst,Math.abs(Math.atan2(c.v,c.u))*180/Math.PI);}}
assert.ok(worst<12,'repeated key transitions should remain recoverable: '+worst);
report.randomTransitionWorstSlip=worst;report.cameraDistanceMetres=8.2;report.integrationPositionDifference=Math.hypot(a.x-b.x,a.z-b.z);fs.writeFileSync('analysis/transition-test-report.json',JSON.stringify(report,null,2));console.log('Transition, acceleration, chase-camera distance, split-grip and convergence tests passed. Worst repeated-input slip:',worst.toFixed(2),'degrees');
