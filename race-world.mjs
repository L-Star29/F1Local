import fs from 'node:fs';
import {readModel} from './inspect-models.mjs';
import {SurfaceGrid,BarrierGrid} from './surface.js';
import {nearest} from './tracks.js';
import {vehicles} from './physics.js';
let cached;
export function loadRaceWorld(){if(cached)return cached;const track=JSON.parse(fs.readFileSync('data/gb-1948-model-track.json'));
 const meshes=readModel('Race Track Models/'+track.modelFile).meshes.map(m=>({...m,positions:m.positions.map(v=>v*track.modelScale)}));
 const road=new SurfaceGrid(meshes.filter(m=>new RegExp(track.roadPattern).test(m.material))),ground=new SurfaceGrid(meshes.filter(m=>new RegExp(track.roadPattern+'|'+track.groundPattern,'i').test(m.material))),walls=new BarrierGrid(meshes.filter(m=>new RegExp(track.barrierPattern,'i').test(m.material)));
 const kerbs=new SurfaceGrid(meshes.filter(m=>/curb|kerb/i.test(m.material)));
 const surface=c=>{const near=nearest(track,c.x,c.z),h=road.height(c.x,c.z),y=h??ground.height(c.x,c.z)??near.y,wheelGrip=[];let unsafeWheels=0;for(const long of [vehicles.formula.a,-vehicles.formula.b])for(const lat of [-.81,.81]){const wx=c.x+Math.sin(c.yaw)*long+Math.cos(c.yaw)*lat,wz=c.z+Math.cos(c.yaw)*long-Math.sin(c.yaw)*lat,off=road.height(wx,wz)===null,kh=kerbs.height(wx,wz);unsafeWheels+=Number(off&&!(kh!=null&&Math.abs(kh-y)<.08));wheelGrip.push(off?.9:1);}return {...near,y,surfaceOff:h===null,wheelGrip,unsafeWheels,wheelsOff:wheelGrip.filter(g=>g<1).length,hit:walls.contact(c.x,y,c.z)};};
 return cached={track,surface};
}
