import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newLaunch,launchInput,lightCount,startDuration} from './race-start.js';
import {RaceRoom} from './race-core.js';
import {loadRaceWorld} from './race-world.mjs';
import {pitStarts} from './practice-starts.js';
import {readModel} from './inspect-models.mjs';
import {SurfaceGrid,BarrierGrid} from './surface.js';
const held={steer:0,throttle:1,brake:0},released={...held,throttle:0},launch=newLaunch();
for(let t=-6;t<1;t+=.01)assert.equal(launchInput(launch,held,t).throttle,0);
assert.equal(launch.reaction,null);launchInput(launch,released,1);assert.equal(launchInput(launch,held,1.23).throttle,1);assert.equal(launch.reaction,1.23);
for(let i=0;i<100;i++){const d=startDuration();assert.ok(d>=5.6&&d<6.8);assert.equal(lightCount(.1,d),5);assert.equal(lightCount(0,d),0);}
const w=loadRaceWorld(),room=new RaceRoom('START1',w.track,w.surface,1),a=room.add('a','A','ferrari'),b=room.add('b','B','audi');a.ready=b.ready=a.connected=b.connected=true;room.start('a');let seq=0;
while(room.time<room.startAt+.5){room.setInput(a,{...held,seq:seq++});room.tick(1/120);}assert.equal(a.car.u,0);assert.equal(a.launch.reaction,null);
room.setInput(a,{...released,seq:seq++});room.tick(1/120);room.setInput(a,{...held,seq:seq++});room.tick(1/120);assert.ok(a.launch.reaction>=.5);assert.ok(a.car.u>0);
const t=JSON.parse(fs.readFileSync('data/gb-1948-model-track.json')),meshes=readModel('Race Track Models/'+t.modelFile).meshes.map(m=>({...m,positions:m.positions.map(v=>v*t.modelScale)}));
const pit=new SurfaceGrid(meshes.filter(m=>/^asphalt/i.test(m.material))),walls=new BarrierGrid(meshes.filter(m=>new RegExp(t.barrierPattern,'i').test(m.material))),p=pitStarts[t.id];
for(const long of [-1.7,0,1.94]){const x=p.x+p.tx*long,z=p.z+p.tz*long,y=pit.height(x,z);assert.notEqual(y,null,'spawn is on authored pit asphalt');assert.equal(walls.contact(x,y,z),null,'car body clears pit wall');for(const lat of [-.81,.81])assert.notEqual(pit.height(x-p.tz*lat,z+p.tx*lat),null,'all tyres fit on pit asphalt');}
console.log('PASS: held throttle cannot launch solo/server; release-and-press reaction; random lights; Silverstone pit asphalt, wheel footprint and wall clearance.');
