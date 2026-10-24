import assert from 'node:assert/strict';
import fs from 'node:fs';
import {specs,makeTrack,nearest,sample} from './tracks.js';
import {newCar,step} from './physics.js';
const dt=1/120,flat={offset:0,width:14,y:0,slope:0};
const input=(throttle=0,brake=0,steer=0)=>({throttle,brake,steer,analog:false,handbrake:false});
function run(mode,seconds,control,c=newCar({x:0,z:0,y:0,tx:0,tz:1}),settings={}){for(let i=0;i<seconds/dt;i++)step(c,control,flat,mode,dt,settings);assert.ok(Object.values(c).filter(x=>typeof x==='number').every(Number.isFinite));return c;}
let f=run('formula',10,input(1));let r=run('rally',10,input(1));assert.ok(f.u>r.u&&f.u>55);console.log('10 second acceleration km/h:',Math.round(f.u*3.6),Math.round(r.u*3.6));
let stop=newCar({x:0,z:0,y:0,tx:0,tz:1});stop.u=83.333;let s0=stop.z,time=0;while(stop.u>.1&&time<10){step(stop,input(0,1),flat,'formula',dt,{});time+=dt;}assert.ok(stop.z-s0>70&&stop.z-s0<220);console.log('300 km/h stop:',(stop.z-s0).toFixed(1),'m,',time.toFixed(2),'s');
let parked=run('formula',10,input(0,1));assert.equal(parked.u,0);assert.equal(parked.z,0);
let turn=newCar({x:0,z:0,y:0,tx:0,tz:1});turn.u=35;run('formula',2,input(.2,0,.15),turn);assert.ok(turn.x<0&&turn.yaw<0);console.log('Right steering produces driver-relative right turn (-X when facing +Z)');
let raw=run('formula',1,input(0,1),{...newCar({x:0,z:0,y:0,tx:0,tz:1}),u:25},{assists:'raw'});assert.ok(raw.locked);console.log('Unassisted braking can lock tyres');
let data=JSON.parse(fs.readFileSync('data/circuits.geojson','utf8'));
for(let spec of specs){let t=makeTrack(data.features.find(f=>f.properties.id===spec.id),spec);assert.ok(t.pts.every(p=>Object.values(p).every(Number.isFinite)));let length=t.pts.reduce((sum,a,i)=>{let b=t.pts[(i+1)%t.n];return sum+Math.hypot(a.x-b.x,a.z-b.z)},0);assert.ok(Math.abs(length-t.length)<20);let p=sample(t,100),near=nearest(t,p.x,p.z);assert.ok(near.distance<.01);assert.ok(Math.abs(near.s-100)<.01);assert.ok(Math.min(...t.pts.map(p=>p.width))>7);console.log(t.name,'closed length',length.toFixed(1),'m / scale',t.scale.toFixed(3));}
console.log('All physics and circuit checks passed.');
