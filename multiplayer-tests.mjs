import assert from 'node:assert/strict';
import {RaceRoom} from './race-core.js';
import {loadRaceWorld} from './race-world.mjs';
import {createGameServer} from './race-server.mjs';
import {sample,clamp} from './tracks.js';
import {vehicles,keyboardSteeringRange} from './physics.js';
const world=loadRaceWorld(),room=new RaceRoom('TEST00',world.track,world.surface,1);
const a=room.add('a','One','ferrari'),b=room.add('b','Two','redbull');
assert.throws(()=>room.add('c','Three','audi'));assert.throws(()=>room.start('b'));assert.throws(()=>room.start('a'));
a.ready=b.ready=a.connected=b.connected=true;room.start('a');const x=a.car.x;room.tick(1);assert.equal(a.car.x,x);room.tick(4);assert.equal(room.phase,'racing');
assert.throws(()=>room.setInput(a,{seq:1,steer:NaN,throttle:1,brake:0}));
for(let i=0;i<240;i++){room.setInput(a,{seq:i+2,steer:0,throttle:1,brake:0});room.tick(1/120);}assert.ok(a.car.u>15);assert.ok(a.progress>0);assert.ok(Number.isFinite(a.car.y));
const speed=a.car.u;for(let i=0;i<180;i++)room.tick(1/120);assert.ok(a.car.u<speed);const seq=a.seq;room.setInput(a,{seq:0,steer:1,throttle:1,brake:0});assert.equal(a.seq,seq);
room.setInput(a,{seq:seq+1,steer:0,throttle:0,brake:0,recover:true});assert.equal(a.penalty,5);
a.progress=world.track.length+.1;room.tick(1/120);assert.notEqual(a.finish,null);b.connected=false;b.disconnectedAt=room.time-11;room.tick(1/120);assert.equal(b.dnf,true);assert.equal(room.phase,'finished');assert.equal(room.snapshot().players[0].id,'a');
a.ready=b.ready=b.connected=true;room.start('a');assert.equal(a.penalty,0);assert.equal(a.finish,null);assert.equal(b.dnf,false);
// Complete a real Silverstone lap through the server with digital inputs only.
const full=new RaceRoom('LAP000',world.track,world.surface,1),driver=full.add('driver','Lap test','ferrari'),other=full.add('other','Other','audi');
driver.ready=other.ready=driver.connected=other.connected=true;full.start('driver');full.tick(5);other.connected=false;other.disconnectedAt=-20;
let controls={steer:0,throttle:0,brake:0};
for(let i=0;i<120*400&&full.phase!=='finished';i++){
 const c=driver.car,t=world.track,road=world.surface(c);
 if(i%6===0){const look=8+c.u*.4,target=sample(t,road.s+look);let angle=Math.atan2(target.x-c.x,target.z-c.z)-c.yaw;angle=Math.atan2(Math.sin(angle),Math.cos(angle));const delta=Math.atan2(7.2*Math.sin(angle),look)*(1+.00015*c.u*c.u),wanted=clamp(-delta/keyboardSteeringRange(c.u,vehicles.formula),-1,1);controls.steer=Math.abs(wanted)>.04&&Math.abs(c.steerInput)<Math.abs(wanted)+.03?Math.sign(wanted):0;if(wanted*c.steerInput<0)controls.steer=Math.sign(wanted);let speed=80;for(let d=0;d<200;d+=6){const p=sample(t,road.s+d),corner=Math.min(80,Math.sqrt(14/Math.max(.002,Math.abs(p.curve))));speed=Math.min(speed,Math.sqrt(corner*corner+28*d));}controls.throttle=Number(c.u<speed);controls.brake=Number(c.u>speed+1.8);}
 full.setInput(driver,{...controls,seq:i});full.tick(1/120);
}
assert.equal(full.phase,'finished');assert.ok(driver.finish>60&&driver.finish<400);assert.equal(driver.penalty,0);console.log('PASS: complete server-simulated Silverstone lap in',driver.finish.toFixed(2),'seconds (offline diagnostic driver).');
const server=createGameServer(()=>world);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const post=async(p,body={},token)=>{const res=await fetch(base+'/api/rooms'+p,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:res.status,...await res.json()};};
let stream;
try{
 const host=await post('',{name:'Host',team:'ferrari',laps:1});assert.equal(host.status,200);const guest=await post('/'+host.code+'/join',{name:'Guest',team:'audi'});assert.equal(guest.status,200);assert.equal((await post('/'+host.code+'/join',{team:'audi'})).status,400);
 assert.equal((await post('/'+host.code+'/start',{},'wrong')).status,403);
 const abort=new AbortController();stream=abort;const events=await fetch(base+'/api/rooms/'+host.code+'/events?token='+host.token,{signal:abort.signal});const reader=events.body.getReader();const initial=new TextDecoder().decode((await reader.read()).value);assert.ok(initial.includes('Host'));assert.ok(!initial.includes(host.token));abort.abort();
 assert.equal((await fetch(base+'/race-server.mjs')).status,404);assert.equal((await fetch(base+'/package.json')).status,404);assert.equal((await fetch(base+'/vendor/three.module.js')).status,200);
 assert.equal((await post('/'+host.code+'/leave',{},host.token)).status,200);assert.equal((await post('/'+host.code+'/ready',{ready:true},host.token)).status,403);
 console.log('PASS: shared Silverstone physics, countdown, input validation, stale-input braking, recovery, finish, disconnect DNF, rematch, rooms, authentication, SSE, private-file protection.');
}finally{stream?.abort();server.shutdown();}
