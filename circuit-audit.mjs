import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readModel} from './inspect-models.mjs';
import {SurfaceGrid,BarrierGrid} from './surface.js';
const report=[];
for(const id of ['gb-1948','at-1969','it-1953']){
 const t=JSON.parse(fs.readFileSync('data/'+id+'-model-track.json'));
 const meshes=readModel('Race Track Models/'+t.modelFile).meshes.map(m=>({...m,positions:m.positions.map(v=>v*t.modelScale)}));
 const surface=new SurfaceGrid(meshes.filter(m=>new RegExp(t.roadPattern).test(m.material)));
 const walls=meshes.filter(m=>new RegExp(t.barrierPattern,'i').test(m.material));
 const hits=[];for(const m of walls){const b=new BarrierGrid([m]);for(let i=0;i<t.n;i+=3){const p=t.pts[i];for(const offset of [-3,0,3]){const x=p.x+p.nx*offset,z=p.z+p.nz*offset,y=surface.height(x,z);if(y!==null&&b.contact(x,y,z))hits.push({s:Math.round(p.s),offset,material:m.material,x,y,z});}}}
 let widths=[],missing=0;for(let i=0;i<t.n;i+=3){const p=t.pts[i];if(surface.height(p.x,p.z)===null)missing++;let sides=[];for(const sign of [-1,1]){let d=0;while(d<30&&surface.height(p.x+p.nx*d*sign,p.z+p.nz*d*sign)!==null)d+=.25;sides.push(d);}widths.push(sides[0]+sides[1]);}
 const r={id,name:t.name,modelScale:t.modelScale,length:t.length,missing,roadWidthRange:[Math.min(...widths),Math.max(...widths)],elevationRange:[Math.min(...t.pts.map(p=>p.y)),Math.max(...t.pts.map(p=>p.y))],hits};report.push(r);console.log(JSON.stringify({...r,hits:hits.slice(0,12),hitCount:hits.length}));
}
fs.writeFileSync('analysis/circuit-audit.json',JSON.stringify(report,null,2));
for(const r of report){assert.equal(r.missing,0,r.name+' road coverage');assert.equal(r.hits.length,0,r.name+' barriers intersect sampled road lanes');}
