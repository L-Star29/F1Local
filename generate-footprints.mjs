import fs from 'node:fs';
import {readModel} from './inspect-models.mjs';
import {teams} from './model-assets.js';
// Keep this helper independent of runtime footprint data for regeneration.
function hull(points){const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=arr=>{const h=[];for(const p of arr){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};const sorted=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]),a=half(sorted),b=half(sorted.reverse());a.pop();b.pop();return a.concat(b);}
const result={};
for(const team of teams){const {meshes}=readModel('Car Models/'+team.file);let minZ=Infinity,maxZ=-Infinity;for(const m of meshes)for(let i=2;i<m.positions.length;i+=3){minZ=Math.min(minZ,m.positions[i]);maxZ=Math.max(maxZ,m.positions[i]);}const offset=-(minZ+maxZ)/2,body=[],wheels=Array.from({length:4},()=>({minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity}));
 for(const m of meshes){const tyre=/tyre|sidewall|wheel_hub|discs/i.test(m.material)&&!/steering/i.test(m.material);for(let i=0;i<m.positions.length;i+=3){const x=m.positions[i],z=m.positions[i+2];if(tyre){const w=wheels[(z>0?0:2)+(x>0?1:0)];w.minX=Math.min(w.minX,x);w.maxX=Math.max(w.maxX,x);w.minZ=Math.min(w.minZ,z);w.maxZ=Math.max(w.maxZ,z);}else body.push([x,z+offset]);}}
 result[team.id]={body:hull(body).map(p=>p.map(v=>Math.round(v*10000)/10000)),wheels:wheels.filter(w=>Number.isFinite(w.minX)).map(w=>({x:(w.minX+w.maxX)/2,z:(w.minZ+w.maxZ)/2+offset,halfWidth:(w.maxX-w.minX)/2,halfLength:(w.maxZ-w.minZ)/2,front:w.minZ>0}))};
}
fs.writeFileSync('car-footprints.js','// Generated from the supplied GLBs with the same centering as loadTeam.\nexport const carFootprints='+JSON.stringify(result)+';\n');console.log(Object.entries(result).map(([team,s])=>({team,hull:s.body.length,wheels:s.wheels.length})));
