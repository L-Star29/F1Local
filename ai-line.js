// Circuit-wide approximate minimum-time planning. See AI-RACING.md for sources and limits.
import {clamp} from './tracks.js';
import {vehicles,tyreCapacity} from './physics.js';
const cache=new WeakMap();
export function installRacingLine(track,data){
 if(data.version!==1||data.trackId!==track.id||data.length!==track.length||data.pts.length!==track.n||data.bounds.length!==track.n)throw Error('AI plan does not match circuit; rebuild the AI plan.');
 const result={...track,pts:data.pts,bounds:data.bounds,seedTime:data.seedTime,plannedTime:data.plannedTime,profiles:new Map(data.profiles.map(([skill,p])=>[skill,{...p,speeds:Float64Array.from(p.speeds)}]))};
 cache.set(track,result);return result;
}
export function racingLine(track,surface){if(cache.has(track))return cache.get(track);if(typeof window!=='undefined')throw Error('AI plan is not loaded. Reload the page.');const n=track.n,offset=new Float64Array(n),points=track.pts;const bounds=points.map(p=>{const max=Math.min(10,p.width/2-1),limits=[];for(const sign of [-1,1]){let edge=0;for(let d=.25;d<=max;d+=.25){const r=surface({x:p.x+p.nx*d*sign,z:p.z+p.nz*d*sign,y:p.y,yaw:Math.atan2(p.tx,p.tz),u:30});if(r.wheelsOff>2||(r.unsafeWheels??r.wheelsOff)>0||r.hit)break;edge=d;}limits.push(Math.max(0,edge-.3));}return limits;});
 // Minimize bending, not path length: neighbour averaging pulls every
 // corner toward its inside and is not a minimum-curvature seed.
 const xx=Float64Array.from(points,p=>p.x),zz=Float64Array.from(points,p=>p.z);
 for(let pass=0;pass<30000;pass++)for(let i=0;i<n;i++){
  const a=(i+n-1)%n,b=(i+1)%n,c=(i+n-2)%n,d=(i+2)%n,p=points[i];
  const gx=6*xx[i]-4*(xx[a]+xx[b])+xx[c]+xx[d],gz=6*zz[i]-4*(zz[a]+zz[b])+zz[c]+zz[d];
  offset[i]=clamp(offset[i]-.07*(gx*p.nx+gz*p.nz),-bounds[i][0],bounds[i][1]);
  xx[i]=p.x+p.nx*offset[i];zz[i]=p.z+p.nz*offset[i];
 }

 // Improve total predicted lap time with smooth, bounded lateral moves.
 // Whole-lap scoring propagates each exit's benefit into the following straight.
 let best=geometry(points,offset),profile=speedProfile(best,100),seedTime=profile.time;
 for(const span of [144,72,36,18].map(m=>Math.max(3,Math.round(m/track.ds))))for(const amount of [2,-2,1,-1,.4,-.4]){
  for(let center=0;center<n;center+=span){
   const candidate=Float64Array.from(offset);
   for(let j=-span;j<=span;j++){const i=(center+j+n)%n;
    candidate[i]=clamp(candidate[i]+amount*.5*(1+Math.cos(Math.PI*j/span)),-bounds[i][0],bounds[i][1]);
   }
   const trial=geometry(points,candidate),v=speedProfile(trial,100);
   if(v.time<profile.time-.0001){offset.set(candidate);best=trial;profile=v;}
  }
 }
 const result={...track,pts:best,bounds,seedTime,plannedTime:profile.time,profiles:new Map([[100,profile]])};
 cache.set(track,result);return result;
}
function geometry(points,offset){
 const n=points.length,pts=points.map((p,i)=>({...p,x:p.x+p.nx*offset[i],z:p.z+p.nz*offset[i],offset:offset[i]}));
 for(let i=0;i<n;i++){
  const a=pts[(i+n-2)%n],p=pts[i],b=pts[(i+2)%n],ax=p.x-a.x,az=p.z-a.z,bx=b.x-p.x,bz=b.z-p.z;
  const la=Math.hypot(ax,az),lb=Math.hypot(bx,bz),chord=Math.hypot(b.x-a.x,b.z-a.z);
  p.curve=2*(ax*bz-az*bx)/Math.max(.001,la*lb*chord);
  p.segment=Math.hypot(pts[(i+1)%n].x-p.x,pts[(i+1)%n].z-p.z);p.tx=(b.x-a.x)/chord;p.tz=(b.z-a.z)/chord;p.nx=-p.tz;p.nz=p.tx;
 }
 return pts;
}
// Approximate vehicle envelope calibrated against full-physics laps, not a
// tyre-force oracle. The skill factor adjusts planning only, never physical grip.
// A forward/backward cyclic sweep accounts for acceleration, braking, lateral
// grip already consumed in turns, and the corner beyond the start/finish line.
export function speedProfile(pts,skill=100){
 const p=vehicles.formula,n=pts.length,k=clamp(skill,0,100)/100,v=new Float64Array(n),top=65+30*k;
 const lateral=speed=>4*tyreCapacity((p.mass*9.81+p.aero*speed*speed)/4,p)/p.mass*(.55+.25*k);
 for(let i=0;i<n;i++){
  let lo=5,hi=top;
  for(let j=0;j<12;j++){const mid=(lo+hi)/2;if(mid*mid*Math.abs(pts[i].curve)<=lateral(mid))lo=mid;else hi=mid;}
  v[i]=lo;
 }
 for(let pass=0;pass<5;pass++){
  for(let i=n-1;i>=0;i--){
   const next=(i+1)%n,speed=v[next],lat=speed*speed*Math.abs(pts[next].curve),cap=lateral(speed);
   const available=Math.sqrt(Math.max(0,1-(lat/cap)**2));
   const brake=Math.min(p.brakes/p.mass,cap)*available+p.drag*speed*speed/p.mass;
   v[i]=Math.min(v[i],Math.sqrt(speed*speed+2*Math.max(1,brake)*pts[i].segment));
  }
  for(let i=0;i<n;i++){
   const next=(i+1)%n,speed=v[i],lat=speed*speed*Math.abs(pts[i].curve),cap=lateral(speed);
   const available=Math.sqrt(Math.max(0,1-(lat/cap)**2));
   const drive=Math.min(p.drive,p.power/Math.max(10,speed))/p.mass;
   const accel=Math.max(.2,Math.min(drive,cap*available)-p.drag*speed*speed/p.mass);
   v[next]=Math.min(v[next],Math.sqrt(speed*speed+2*accel*pts[i].segment));
  }
 }
 let time=0;for(let i=0;i<n;i++)time+=2*pts[i].segment/(v[i]+v[(i+1)%n]);
 return {speeds:v,time};
}
export function plannedSpeed(line,s,skill){
 if(!line.profiles.has(skill))line.profiles.set(skill,speedProfile(line.pts,skill));
 const v=line.profiles.get(skill).speeds,u=((s%line.length)+line.length)%line.length/line.ds,i=Math.floor(u),f=u-i;
 return v[i]*(1-f)+v[(i+1)%line.n]*f;
}
