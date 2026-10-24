// Offline path-following diagnostic. This is not player steering assistance.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {specs,makeTrack,sample,nearest,clamp} from './tracks.js';
import {newCar,step,steeringLimit,vehicles} from './physics.js';
const data=JSON.parse(fs.readFileSync('data/circuits.geojson','utf8')),results=[];
for(let spec of specs){
 const track=makeTrack(data.features.find(f=>f.properties.id===spec.id),spec);
 let c=newCar(sample(track,8)),road=nearest(track,c.x,c.z),previous=road.s,progress=0,maxOffset=0,time=0,offTime=0;
 while(progress<track.length&&time<600){
  let look=7+c.u*.32,target=sample(track,road.s+look),angle=Math.atan2(target.x-c.x,target.z-c.z)-c.yaw;
  angle=Math.atan2(Math.sin(angle),Math.cos(angle));
  let delta=Math.atan2(2*3.6*Math.sin(angle),look);
  let steer=clamp(-delta/steeringLimit(c.u,vehicles.formula),-1,1);
  let wanted=75;for(let dist=0;dist<180;dist+=6){let i=Math.floor(((road.s+dist)%track.length)/track.ds);wanted=Math.min(wanted,Math.sqrt((track.speeds[i]*.65)**2+2*12*dist));}
  const error=wanted-c.u;
  step(c,{steer,throttle:clamp(error*.25,0,1),brake:clamp(-error*.12,0,1),analog:true},road,'formula',1/60,{});
  road=nearest(track,c.x,c.z);let ds=road.s-previous;if(ds<-track.length/2)ds+=track.length;if(ds>track.length/2)ds-=track.length;progress+=ds;previous=road.s;
  maxOffset=Math.max(maxOffset,Math.abs(road.offset));if(Math.abs(road.offset)>road.width/2-1)offTime+=1/60;time+=1/60;
 }
 let result={circuit:spec.name,completed:progress>=track.length,seconds:+time.toFixed(2),maxCentreOffset:+maxOffset.toFixed(2),secondsOutsideSafeWidth:+offTime.toFixed(2)};results.push(result);console.log(result);
 assert.ok(result.completed,spec.name+' must be traversable');assert.ok(offTime<1,spec.name+' path follower left the road');
}
fs.writeFileSync('circuit-drive-report.json',JSON.stringify(results,null,2));
