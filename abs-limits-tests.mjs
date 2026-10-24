import assert from 'node:assert/strict';
import {newCar,step} from './physics.js';
import {trackLimitStep} from './track-limits.js';
import {chasePose} from './camera-rig.js';
const road={y:0,width:14,offset:0},dt=1/120;
function corner(abs){let c={...newCar({x:0,y:0,z:0,tx:0,tz:1}),u:40},interventions=0;
 for(let i=0;i<96;i++){step(c,{steer:1,throttle:0,brake:1},road,'formula',dt,{assists:'none',gears:'auto',abs});interventions+=c.abs?1:0;assert.equal(c.locked,false);for(const t of c.tyres)assert.ok(Math.hypot(t.fx,t.fy)<=t.capacity*1.001);}
 return {yaw:Math.abs(c.yaw),speed:c.u,interventions};}
const off=corner(false),on=corner(true);assert.ok(on.interventions>0);assert.ok(on.yaw>off.yaw*1.03,'ABS must retain more turn under held braking');assert.ok(on.speed<40,'ABS still decelerates');
assert.equal(trackLimitStep(0,true,dt,'strict').invalid,true);
for(const [level,grace] of [['standard',.5],['relaxed',1.5]]){assert.equal(trackLimitStep(0,true,.2,level).invalid,false);assert.equal(trackLimitStep(grace,true,dt,level).invalid,true);assert.equal(trackLimitStep(grace,false,dt,level).seconds,0);}
assert.equal(trackLimitStep(100,true,dt,'practice').invalid,false);
let state={yaw:0};chasePose({x:0,z:0,yaw:.4},0,state,dt);assert.equal(state.yaw,.4);
console.log('ABS combined braking/turning, tyre budgets, track-limit grace/rejoin, and immediate chase heading passed.',{off,on});
