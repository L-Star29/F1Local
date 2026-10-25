import assert from 'node:assert/strict';
import {SnapshotBuffer,MotionCorrection} from './network-motion.js';
import {Multiplayer} from './multiplayer.js';
const car=(z,yaw=0)=>({x:0,y:0,z,yaw,u:50,v:0,r:0,steer:0,distance:z});
const buffer=new SnapshotBuffer();let previous=-Infinity,maxStep=0,seq=0;
// A 50 m/s car, 20 Hz snapshots, alternating 10–70 ms packet delay.
const packets=Array.from({length:100},(_,i)=>({at:i*50+(i%3===0?70:10),time:i*.05})).sort((a,b)=>a.at-b.at);let lastServerTime=-1;
for(let now=0;now<4800;now+=1000/60){while(seq<packets.length&&packets[seq].at<=now){const p=packets[seq++];if(p.time>lastServerTime){buffer.push({round:1,time:p.time,players:[{id:'a',car:car(p.time*50)}]},p.at);lastServerTime=p.time;}}const sampled=buffer.sample(now)[0];if(!sampled)continue;assert.ok(Number.isFinite(sampled.car.z));assert.ok(sampled.car.z>=previous-1e-6,'playout must not move backwards under jitter');if(Number.isFinite(previous))maxStep=Math.max(maxStep,sampled.car.z-previous);previous=sampled.car.z;}
assert.ok(maxStep<2,'remote motion should not jump a whole snapshot distance');
const local=car(10),smooth=new MotionCorrection();smooth.receive(local,car(12),0);assert.equal(local.z,10,'packet reception must not jerk the camera');smooth.apply(local,1/60);assert.ok(local.z>10&&local.z<10.3);for(let i=0;i<120;i++)smooth.apply(local,1/60);assert.ok(Math.abs(local.z-12)<.001);smooth.receive(local,car(100));assert.equal(local.z,100,'recovery teleports must not glide across the circuit');
buffer.push({round:2,time:10,players:[{id:'a',car:car(0)}]},5000);assert.equal(buffer.frames.length,1);
const net=new Multiplayer(()=>{},()=>{});clearInterval(net.timer);net.session={code:'test'};net.connected=true;net.received=performance.now();const complete=[];net.action=()=>new Promise(resolve=>complete.push(resolve));const sends=[net.send(),net.send(),net.send(),net.send()];assert.equal(complete.length,3,'controls can pipeline, but requests stay bounded');complete.forEach(r=>r({ok:true}));await Promise.all(sends);assert.equal(net.pending,0);
console.log('PASS: jittered playout is monotonic; max step',maxStep.toFixed(3),'m at 50 m/s, smooth local corrections, recovery, rematch reset, bounded pipelined controls.');
