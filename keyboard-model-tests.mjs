import assert from 'node:assert/strict';
import fs from 'node:fs';
import {modelCircuits} from './track-catalog.js';
import {newCar,step} from './physics.js';
import {readModel} from './inspect-models.mjs';
import {SurfaceGrid,BarrierGrid} from './surface.js';
const dt=1/120,settings={assists:'none',gears:'auto'},road={y:0,width:14,offset:0,slope:0};
const fresh=(speed=0)=>({...newCar({x:0,y:0,z:0,tx:0,tz:1}),u:speed});
function tick(c,steer=0,throttle=0,brake=0,analog=false,r=road){step(c,{steer,throttle,brake,analog},r,'formula',dt,settings);assert.ok([c.x,c.z,c.u,c.v,c.r].every(Number.isFinite));for(let t of c.tyres)assert.ok(Math.hypot(t.fx,t.fy)<=t.capacity*1.001);assert.equal(c.locked,false);}
const report={corners:[],tracks:[]};
for(let speed of [10,20,40,60,80,92]){let c=fresh(speed),maxBeta=0;for(let i=0;i<1200;i++){tick(c,1,1);maxBeta=Math.max(maxBeta,Math.abs(Math.atan2(c.v,c.u))*180/Math.PI);}assert.ok(maxBeta<8);report.corners.push({initialKmh:speed*3.6,maxSlipDegrees:maxBeta});}
for(let speed of [20,40,60,80]){let c=fresh(speed);for(let i=0;i<1200;i++)tick(c,Math.floor(i/60)%2?1:-1,1);assert.ok(Math.abs(Math.atan2(c.v,c.u))<.15,'rapid alternating keyboard inputs remain recoverable');}
// Inputs never use route geometry to steer or apply the brake.
let a=fresh(40),b=fresh(40);for(let i=0;i<240;i++){tick(a);tick(b,0,0,0,false,{...road,curve:.5,tx:1,tz:0});}assert.equal(a.x,b.x);assert.equal(a.brake,0);assert.equal(a.steer,0);
let tap=fresh(30);for(let i=0;i<6;i++)tick(tap,1,1,1);assert.ok(tap.steerInput<.3&&tap.throttle<.2&&tap.brake<.3,'50ms tap must not command full input');for(let i=0;i<60;i++)tick(tap);assert.equal(tap.steerInput,0);assert.equal(tap.throttle,0);assert.equal(tap.brake,0);
let pad=fresh(30);for(let i=0;i<120;i++)tick(pad,.25,.4,.2,true);assert.ok(Math.abs(pad.steerInput-.25)<.001&&Math.abs(pad.throttle-.4)<.001&&Math.abs(pad.brake-.2)<.001);
for(let speed of [20,40,60,80]){let c=fresh(speed);for(let i=0;i<120;i++)tick(c,.5,0,1);assert.ok(Math.abs(Math.atan2(c.v,c.u))<.5,'braking and turning cannot cause immediate snap spin');}
// Hold S to stop, then reverse; W brakes reverse before forward acceleration.
let rev=fresh(25);for(let i=0;i<600;i++)tick(rev,0,0,1);assert.ok(rev.u< -3&&rev.u>=-8.01);for(let i=0;i<480;i++)tick(rev,0,1);assert.ok(rev.u>5);report.reverse=true;
for(let mask of [[.9,1,.9,1],[1,.9,1,.9],[.9,.9,.9,.9]])for(let speed of [20,40,60,80]){let c=fresh(speed),maxBeta=0;for(let i=0;i<600;i++){tick(c,1,1,0,false,{...road,wheelGrip:mask,surfaceOff:true});maxBeta=Math.max(maxBeta,Math.abs(Math.atan2(c.v,c.u)));}assert.ok(maxBeta<.15,'edge grip must not trigger an immediate spin');}report.edgeGrip=true;
for(let id of modelCircuits.map(s=>s.id)){const t=JSON.parse(fs.readFileSync('data/'+id+'-model-track.json')),{meshes}=readModel('Race Track Models/'+t.modelFile);for(let m of meshes)m.positions=m.positions.map(v=>v*t.modelScale);const surface=new SurfaceGrid(meshes.filter(m=>new RegExp(t.roadPattern).test(m.material)));let misses=0,maxError=0;for(let p of t.pts){let h=surface.height(p.x,p.z);if(h===null)misses++;else maxError=Math.max(maxError,Math.abs(h-p.y));}assert.equal(misses,0);assert.ok(maxError<.15,'physics elevation follows imported road');report.tracks.push({name:t.name,points:t.n,misses,maxHeightError:maxError,length:t.length});}
const wall=new BarrierGrid([{positions:[0,0,0,0,2,0,0,0,10],indices:[0,1,2]}]);assert.ok(wall.contact(.5,0,5));assert.equal(wall.contact(3,0,5),null);
report.passed='keyboard ramps, release, analogue fidelity, no autonomous steering/braking, corner stability, brake/turn stability, tyre force budget, exact imported road coverage/elevation, barrier contact';fs.writeFileSync('keyboard-model-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
