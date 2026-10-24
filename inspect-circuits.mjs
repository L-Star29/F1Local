import fs from 'node:fs';
import {readModel} from './inspect-models.mjs';
import {modelCircuits} from './track-catalog.js';
for(let s of modelCircuits.slice(2)){let {meshes,j}=readModel('Race Track Models/'+s.file);const out=meshes.filter(m=>{let x=m.positions.filter((_,i)=>i%3===0),z=m.positions.filter((_,i)=>i%3===2);return Math.max(...x)-Math.min(...x)>200&&Math.max(...z)-Math.min(...z)>200;});fs.writeFileSync('data/'+s.id+'-inspect.json',JSON.stringify(out));console.log(s.id,j.materials.map((m,i)=>i+':'+m.name).join(', '));}
