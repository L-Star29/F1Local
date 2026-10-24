import {readModel} from './inspect-models.mjs';
import {SurfaceGrid} from './surface.js';
// Offline digital-key driver; no driving assistance is included in the game.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {sample,nearest,clamp} from './tracks.js';import {newCar,step,vehicles,keyboardSteeringRange} from './physics.js';
const reports=[];
for(const id of ['gb-1948','at-1969','it-1953']){
const t=JSON.parse(fs.readFileSync('data/'+id+'-model-track.json')),dt=1/120;
const surface=new SurfaceGrid(readModel('Race Track Models/'+t.modelFile).meshes.filter(m=>new RegExp(t.roadPattern).test(m.material)).map(m=>({...m,positions:m.positions.map(v=>v*t.modelScale)})));
let allWheelsOff=0;
let c=newCar(sample(t,8)),road=nearest(t,c.x,c.z),progress=0,previous=road.s,maxOffset=0,outside=0,time=0,keys={steer:0,throttle:0,brake:0};
for(let i=0;i<120*400&&progress<t.length;i++){
 if(i%6===0){let look=8+c.u*.4,target=sample(t,road.s+look),angle=Math.atan2(target.x-c.x,target.z-c.z)-c.yaw;angle=Math.atan2(Math.sin(angle),Math.cos(angle));let delta=Math.atan2(7.2*Math.sin(angle),look)*(1+.00015*c.u*c.u),wantedSteer=clamp(-delta/keyboardSteeringRange(c.u,vehicles.formula),-1,1);
 keys.steer=Math.abs(wantedSteer)>.04&&Math.abs(c.steerInput)<Math.abs(wantedSteer)+.03?Math.sign(wantedSteer):0;
 if(wantedSteer*c.steerInput<0)keys.steer=Math.sign(wantedSteer);
 let speed=80;for(let d=0;d<200;d+=6){let p=sample(t,road.s+d),corner=Math.min(80,Math.sqrt(14/Math.max(.002,Math.abs(p.curve))));speed=Math.min(speed,Math.sqrt(corner*corner+2*14*d));}
 keys.throttle=Number(c.u<speed);keys.brake=Number(c.u>speed+1.8);
 }
 const wheelGrip=[];for(const long of [vehicles.formula.a,-vehicles.formula.b])for(const lat of [-.81,.81])wheelGrip.push(surface.height(c.x+Math.sin(c.yaw)*long+Math.cos(c.yaw)*lat,c.z+Math.cos(c.yaw)*long-Math.sin(c.yaw)*lat)===null?.9:1);road.wheelGrip=wheelGrip;if(wheelGrip.every(g=>g<1))allWheelsOff+=dt;
 step(c,keys,road,'formula',dt,{assists:'none',gears:'auto'});road=nearest(t,c.x,c.z);let ds=road.s-previous;if(ds<-t.length/2)ds+=t.length;if(ds>t.length/2)ds-=t.length;progress+=ds;previous=road.s;maxOffset=Math.max(maxOffset,Math.abs(road.offset));if(Math.abs(road.offset)>road.width/2-1)outside+=dt;time+=dt;
}
const report={circuit:t.name,completed:progress>=t.length,seconds:time,maxOffset,secondsOutsideConservativeWidth:outside,secondsAllWheelsOff:allWheelsOff,digitalInputsOnly:true,note:'Conservative offline digital-key path-following diagnostic; not a representative human or F1 25 lap time.'};reports.push(report);console.log(report);assert.ok(report.completed);assert.ok(allWheelsOff<.1,t.name+' left the imported road');

}
fs.writeFileSync('analysis/digital-lap-report.json',JSON.stringify(reports,null,2));
