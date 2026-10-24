import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './vendor/three.module.js';
import {newCar,step,vehicles,tyreCapacity,lateralForce} from './physics.js';
import {keyboardInput} from './controls.js';
const flat={offset:0,width:14,y:0,slope:0},dt=1/120;
const input=(steer=0,throttle=0,brake=0)=>({steer,throttle,brake,analog:false,handbrake:false});
const carAt=(speed=0,yaw=0)=>({...newCar({x:0,z:0,y:0,tx:Math.sin(yaw),tz:Math.cos(yaw)}),u:speed});
function simulate(c,seconds,control,mode='formula',settings={}){for(let i=0;i<Math.round(seconds/dt);i++){step(c,control,flat,mode,dt,settings);assert.ok([c.x,c.z,c.u,c.v,c.r,c.yaw].every(Number.isFinite));for(let tyre of c.tyres)assert.ok(Math.hypot(tyre.fx,tyre.fy)<=tyre.capacity*1.001,'combined force exceeds tyre capacity');}return c;}
const report={};
// Test against the actual rendering library's camera projection, not guessed axes.
for(let heading of [0,Math.PI/2,Math.PI,-Math.PI/2])for(let key of ['KeyA','KeyD','ArrowLeft','ArrowRight']){
 const control=keyboardInput(new Set([key])),steer=key==='KeyD'||key==='ArrowRight'?1:-1;
 const c=carAt(20,heading),f=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading));
 const camera=new THREE.PerspectiveCamera(64,16/9,.1,5000);camera.position.copy(f).multiplyScalar(-8);camera.position.y=3;camera.lookAt(f.clone().multiplyScalar(30));camera.updateMatrixWorld();
 simulate(c,.8,{...control,throttle:.15});let projection=new THREE.Vector3(c.x,0,c.z).project(camera);
 assert.ok(projection.x*steer>0,'input must match screen direction at every heading');
}
report.screenDirection='A/left and D/right pass at four headings using Three.js projection';
// Gear/shift state must have absolutely no effect on Automatic propulsion.
let autoA=carAt(45),autoB=carAt(45);autoB.gear=8;autoB.shift=.5;
simulate(autoA,1,input(0,.7));simulate(autoB,1,input(0,.7));
assert.equal(autoA.u,autoB.u);assert.equal(autoA.x,autoB.x);assert.equal(autoB.shift,0);
let smoothCar=carAt(),maxAccelStep=0,previousAccel=0;
for(let i=0;i<3600;i++){let oldSpeed=smoothCar.u;step(smoothCar,input(0,1),flat,'formula',dt,{});if(oldSpeed>30)maxAccelStep=Math.max(maxAccelStep,Math.abs(smoothCar.ax-previousAccel));previousAccel=smoothCar.ax;assert.equal(smoothCar.shift,0);assert.equal(smoothCar.gear,1);}
assert.ok(maxAccelStep<.15,'automatic acceleration has no gear-change jolts');
report.automatic={gearIndependent:true,shiftEvents:0,maxAccelerationStepAbove108Kmh:maxAccelStep};
report.sustainedCorner=[];
for(let speed of [10,20,40,60,80]){let c=carAt(speed),maxBeta=0;for(let i=0;i<600;i++){step(c,input(1,1),flat,'formula',dt,{});maxBeta=Math.max(maxBeta,Math.abs(Math.atan2(c.v,c.u)));}assert.ok(maxBeta<.15,'Sport sustained steering and full throttle must not spin the car');report.sustainedCorner.push({initialKmh:speed*3.6,maxBodySlipDegrees:maxBeta*180/Math.PI});}
let l=simulate(carAt(30),2,input(-.35,.3)),r=simulate(carAt(30),2,input(.35,.3));assert.ok(Math.abs(l.x+r.x)<1e-7&&Math.abs(l.z-r.z)<1e-7,'left/right symmetry');
let release=simulate(carAt(35),.6,input(.3,.2));simulate(release,2,input(0,.2));assert.ok(Math.abs(release.r)<.025&&Math.abs(release.v)<.15,'straighten after releasing steering');report.releaseYawRate=release.r;
for(let v of [0,.2,1.9,2.1,3,4,6.9,7.1,15,40,80]){let c=simulate(carAt(v),1,input(.4,.2));assert.ok(Math.abs(c.r)<2&&Math.abs(c.v)<10,'no low-speed discontinuity');}
let a=carAt(),times={};for(let i=0;i<120*45;i++){step(a,input(0,1),flat,'formula',dt,{});for(let speed of [100,200,300])if(a.u*3.6>=speed&&!times[speed])times[speed]=(i+1)*dt;}report.acceleration=times;report.speedAfter45s=a.u*3.6;assert.ok(times[100]>2&&times[100]<4);assert.ok(times[200]<8);assert.ok(a.u*3.6>300&&a.u*3.6<370);
function brakeTest(from,to){let c=carAt(from/3.6),t=0,peak=0;while(c.u>to/3.6&&t<10){step(c,input(0,0,1),flat,'formula',dt,{});peak=Math.max(peak,-c.ax/9.81);t+=dt;}return {seconds:t,metres:c.z,peakG:peak};}
report.braking329to119=brakeTest(329,119);report.braking100to0=brakeTest(100,0);
assert.ok(report.braking329to119.metres>90&&report.braking329to119.metres<160);assert.ok(report.braking329to119.peakG>4&&report.braking329to119.peakG<6.5);
const p=vehicles.formula;assert.ok(tyreCapacity(6000,p)/6000<tyreCapacity(2000,p)/2000,'load sensitivity');assert.ok(lateralForce(.3,1000,p.peak,p.slide)<lateralForce(p.peak,1000,p.peak,p.slide),'sliding loses grip');
let coast=simulate(carAt(60),.4,input(0,0)),brake=simulate(carAt(60),.4,input(0,0,1));assert.ok(brake.tyres[0].load+brake.tyres[1].load>coast.tyres[0].load+coast.tyres[1].load,'braking loads front axle');
let corner=simulate(carAt(40),.7,input(.35,.2));assert.ok(corner.tyres[0].load<corner.tyres[1].load,'right turn loads outside left tyre');
let brakes=simulate(carAt(30),.5,input(0,0,1),'formula',{assists:'raw'});assert.ok(brakes.locked);let abs=simulate(carAt(30),.5,input(0,0,1));assert.ok(!abs.locked&&abs.abs);
// Same scenario at 60 / 120 / 240 Hz should stay near-identical.
let states=[];for(let hz of [60,120,240]){let c=carAt(35);for(let i=0;i<hz*3;i++)step(c,input(.15,.35),flat,'formula',1/hz,{});states.push(c);}assert.ok(Math.hypot(states[0].x-states[2].x,states[0].z-states[2].z)<2,'integration convergence');
report.tests='Actual keyboard mapping and Three.js camera-relative steering, symmetry, release stability, sustained-corner stability, speed transitions, grip budget, load transfer, slip peak, assists, acceleration, braking, integration convergence';
fs.writeFileSync('handling-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
