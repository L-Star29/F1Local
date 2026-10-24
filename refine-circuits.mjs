import fs from 'node:fs';
import {readModel} from './inspect-models.mjs';
import {SurfaceGrid} from './surface.js';
let catalog=fs.readFileSync('track-catalog.js','utf8').replace("road:'_3$'",()=>"road:'_3$|_29$'").replace("barrier:'_24$|_29$|_45$'",()=>"barrier:'_24$|_45$'");fs.writeFileSync('track-catalog.js',catalog);
const file='data/at-1969-model-track.json',t=JSON.parse(fs.readFileSync(file));t.roadPattern='_3$|_29$';t.barrierPattern='_24$|_45$';
const meshes=readModel('Race Track Models/'+t.modelFile).meshes.filter(m=>new RegExp(t.roadPattern).test(m.material)).map(m=>({...m,positions:m.positions.map(v=>v*t.modelScale)})),surface=new SurfaceGrid(meshes);
for(const p of t.pts){let sides=[];for(const sign of [-1,1]){let d=0;while(d<30&&surface.height(p.x+p.nx*d*sign,p.z+p.nz*d*sign)!==null)d+=.25;sides.push(d);}p.width=Math.min(24,2*Math.min(...sides));}
fs.writeFileSync(file,JSON.stringify(t));
