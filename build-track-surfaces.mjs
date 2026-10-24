import fs from 'node:fs';
import {readModel} from './inspect-models.mjs';
import {makeTrack} from './tracks.js';
import {modelCircuits} from './track-catalog.js';
import {SurfaceGrid,refreshTrack} from './surface.js';
const features=JSON.parse(fs.readFileSync('data/circuits.geojson')).features;
for(const spec of modelCircuits){const {id}=spec,pattern=new RegExp(spec.road);
 const align=JSON.parse(fs.readFileSync('data/'+id+'-alignment.json')),{meshes}=readModel('Race Track Models/'+align.file),surface=new SurfaceGrid(meshes.filter(m=>pattern.test(m.material))),t=makeTrack(features.find(f=>f.properties.id===id),spec);
 const c=Math.cos(align.angle),s=Math.sin(align.angle);let misses=0,maxSnap=0;
 for(let p of t.pts){let x=(p.x-align.cx)*align.scale,z=(p.z-align.cz)*align.scale,nx=c*p.nx-s*p.nz,nz=s*p.nx+c*p.nz;p.x=c*x-s*z+align.x;p.z=s*x+c*z+align.z;
  const ranges=[];let start=null;for(let o=-35;o<=35;o+=.5){let h=surface.height(p.x+nx*o,p.z+nz*o);if(h!==null&&start===null)start=o;if((h===null||o===35)&&start!==null){ranges.push([start,o-.5]);start=null;}}
  ranges.sort((a,b)=>Math.max(a[0],-a[1],0)-Math.max(b[0],-b[1],0));let range=ranges.find(r=>r[1]-r[0]>5);if(!range){misses++;let h=surface.height(p.x,p.z);if(h!==null)p.y=h;continue;}
  let offset=range[0]>-2?range[0]+2:range[1]<2?range[1]-2:0;maxSnap=Math.max(maxSnap,Math.abs(offset));p.x+=nx*offset;p.z+=nz*offset;p.y=surface.height(p.x,p.z);p.width=Math.min(24,range[1]-range[0]);
 }
 // Reproject after a short symmetric smoothing pass to remove mesh seam noise.
 for(let pass=0;pass<2;pass++){const pts=t.pts.map((p,i)=>{let a=t.pts[(i+t.n-1)%t.n],b=t.pts[(i+1)%t.n];return {...p,x:(a.x+2*p.x+b.x)/4,z:(a.z+2*p.z+b.z)/4};});for(let p of pts){let h=surface.height(p.x,p.z);if(h!==null)p.y=h;}t.pts=pts;}
 let result=refreshTrack(t);
 // Close sub-metre seams and reproject every final sample onto the actual road.
 for(let pass=0;pass<3;pass++){
  for(let p of result.pts){let h=surface.height(p.x,p.z);if(h===null){outer:for(let r=.25;r<=12;r+=.25)for(let a=0;a<32;a++){let x=p.x+Math.cos(a*Math.PI/16)*r,z=p.z+Math.sin(a*Math.PI/16)*r,y=surface.height(x,z);if(y!==null){p.x=x;p.z=z;h=y;break outer;}}}if(h!==null)p.y=h;}
  if(pass<2)result=refreshTrack(result);
 }
 for(let p of result.pts){let h=surface.height(p.x,p.z);if(h!==null)p.y=h;}
 let covered=result.pts.filter(p=>surface.height(p.x,p.z)!==null).length/result.n;
 console.log(id,{misses,maxSnap,covered,length:result.length});
 if(covered<.999){console.error(id+' road alignment insufficient');continue;}
 const modelScale=t.length/result.length;
 for(let p of result.pts){p.x*=modelScale;p.y*=modelScale;p.z*=modelScale;p.width*=modelScale;p.s*=modelScale;}result.length*=modelScale;result.ds*=modelScale;for(let key of Object.keys(result.bounds))result.bounds[key]*=modelScale;for(let i=0;i<result.n;i++){let a=result.pts[(i+result.n-1)%result.n],b=result.pts[(i+1)%result.n];result.pts[i].slope=(b.y-a.y)/Math.hypot(b.x-a.x,b.z-a.z);}
 if(['be-1925','hu-1986','cn-2004','my-1999'].includes(id)){
  const raw=features.find(f=>f.properties.id===id).geometry.coordinates,origin=raw.reduce((a,b)=>Math.hypot((a[0]-spec.start[0])*Math.cos(a[1]*Math.PI/180),a[1]-spec.start[1])<Math.hypot((b[0]-spec.start[0])*Math.cos(b[1]*Math.PI/180),b[1]-spec.start[1])?a:b),target=raw[0];
  let x=((target[0]-origin[0])*111320*Math.cos(origin[1]*Math.PI/180)*t.scale-align.cx)*align.scale,z=(-(target[1]-origin[1])*111320*t.scale-align.cz)*align.scale,xx=(c*x-s*z+align.x)*modelScale,zz=(s*x+c*z+align.z)*modelScale;
  let best=0;for(let i=1;i<result.n;i++)if(Math.hypot(result.pts[i].x-xx,result.pts[i].z-zz)<Math.hypot(result.pts[best].x-xx,result.pts[best].z-zz))best=i;
  if(id==='cn-2004')best=(best+result.n-Math.round(450/result.ds))%result.n;
  result.pts=[...result.pts.slice(best),...result.pts.slice(0,best)];result.pts.forEach((p,i)=>p.s=i*result.ds);
 }
 fs.writeFileSync('data/'+id+'-model-track.json',JSON.stringify({...result,modelScale,modelFile:align.file,roadPattern:pattern.source,groundPattern:spec.ground,barrierPattern:spec.barrier,coverage:covered}));
}

