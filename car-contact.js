import {bodyToWorld} from './physics.js';
import {carFootprints} from './car-footprints.js';
export function convexHull(points){
 const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=arr=>{const h=[];for(const p of arr){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};
 const lower=half(sorted),upper=half(sorted.reverse());lower.pop();upper.pop();return lower.concat(upper);
}
export function footprint(car,team='ferrari'){
 const shape=carFootprints[team]||carFootprints.ferrari,points=shape.body.slice();
 for(const w of shape.wheels){const d=w.front?car.steer||0:0,c=Math.cos(d),s=Math.sin(d);for(const x of [-w.halfWidth,w.halfWidth])for(const z of [-w.halfLength,w.halfLength])points.push([w.x+x*c+z*s,w.z-x*s+z*c]);}
 return convexHull(points).map(([x,z])=>{const p=bodyToWorld(car.yaw,z,x);return [car.x+p.x,car.z+p.z];});
}
export function carContact(a,b,teamA,teamB){
 if(Math.hypot(a.x-b.x,a.z-b.z)>6.5||Math.abs((a.y||0)-(b.y||0))>1.5)return null;
 const A=footprint(a,teamA),B=footprint(b,teamB);let best=null;
 for(const poly of [A,B])for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],length=Math.hypot(q[0]-p[0],q[1]-p[1]);if(length<1e-8)continue;
  const nx=-(q[1]-p[1])/length,nz=(q[0]-p[0])/length;
  const pa=A.map(p=>p[0]*nx+p[1]*nz),pb=B.map(p=>p[0]*nx+p[1]*nz);
  // Two centimetres per car keep numerical noise from showing mesh overlap.
  const plus=Math.max(...pb)-Math.min(...pa)+.04,minus=Math.max(...pa)-Math.min(...pb)+.04;
  if(plus<=0||minus<=0)return null;
  const depth=Math.min(plus,minus),sign=plus<minus?1:-1;
  if(!best||depth<best.depth)best={depth,nx:nx*sign,nz:nz*sign};
 }
 return best;
}
export function resolveCarContact(a,b,teamA,teamB){
 const hit=carContact(a,b,teamA,teamB);if(!hit)return false;
 const {nx,nz,depth}=hit;
 a.x+=nx*(depth+.001)*.5;a.z+=nz*(depth+.001)*.5;b.x-=nx*(depth+.001)*.5;b.z-=nz*(depth+.001)*.5;
 const va=bodyToWorld(a.yaw,a.u,a.v),vb=bodyToWorld(b.yaw,b.u,b.v),closing=(va.x-vb.x)*nx+(va.z-vb.z)*nz;
 if(closing<0){
  // Equal masses, no bounce. Preserve tangential speed for clean side-by-side
  // racing: contact must not apply an arbitrary overall speed or yaw penalty.
  const impulse=-closing*.5;
  for(const [car,v,sign]of [[a,va,1],[b,vb,-1]]){v.x+=nx*impulse*sign;v.z+=nz*impulse*sign;car.u=v.x*Math.sin(car.yaw)+v.z*Math.cos(car.yaw);car.v=v.x*Math.cos(car.yaw)-v.z*Math.sin(car.yaw);}
 }
 return true;
}
