import fs from 'node:fs';
import {readModel} from './inspect-models.mjs';
import {makeTrack} from './tracks.js';
import {modelCircuits} from './track-catalog.js';
const data=JSON.parse(fs.readFileSync('data/circuits.geojson'));
for(const spec of modelCircuits){const {id,file}=spec,pattern=new RegExp(spec.fit);if(fs.existsSync('data/'+id+'-alignment.json'))continue;
 const {meshes}=readModel('Race Track Models/'+file),t=makeTrack(data.features.find(f=>f.properties.id===id),spec);
 const selected=meshes.filter(m=>pattern.test(m.material));
 const cloud=[],seen=new Set();for(let m of selected)for(let i=0;i<m.positions.length;i+=3){let x=m.positions[i],z=m.positions[i+2],key=Math.round(x/3)+','+Math.round(z/3);if(!seen.has(key)){seen.add(key);cloud.push([x,z]);}}
 if(!cloud.length){console.log(id,'no matching surfaces',meshes.map(m=>m.material));continue;}
 const bounds=cloud.reduce((b,p)=>[Math.min(b[0],p[0]),Math.max(b[1],p[0]),Math.min(b[2],p[1]),Math.max(b[3],p[1])],[Infinity,-Infinity,Infinity,-Infinity]);
 const target=cloud.filter((_,i)=>i%Math.max(1,Math.floor(cloud.length/2500))===0),source=t.pts.filter((_,i)=>i%20===0),cx=(t.bounds.minX+t.bounds.maxX)/2,cz=(t.bounds.minZ+t.bounds.maxZ)/2;
 function score(v){let [angle,x,z,s]=v,c=Math.cos(angle),sn=Math.sin(angle),total=0;for(let p of source){let px=(p.x-cx)*s,pz=(p.z-cz)*s,xx=c*px-sn*pz+x,zz=sn*px+c*pz+z,d=Infinity;for(let q of target)d=Math.min(d,(xx-q[0])**2+(zz-q[1])**2);total+=d;}return total/source.length;}
 let best,bestScore=Infinity;for(let deg=0;deg<360;deg+=15){let v=[deg*Math.PI/180,(bounds[0]+bounds[1])/2,(bounds[2]+bounds[3])/2,1];for(let size of [100,40,15,5,1,.25]){let improving=true,round=0;while(improving&&round++<40){improving=false;let sc=score(v);for(let axis=0;axis<4;axis++)for(let sign of [-1,1]){let n=v.slice();n[axis]+=sign*[size/1500,size,size,size/10000][axis];let ns=score(n);if(ns<sc){v=n;sc=ns;improving=true;}}}}let sc=score(v);if(sc<bestScore){best=v;bestScore=sc;}}
 fs.writeFileSync('data/'+id+'-alignment.json',JSON.stringify({file,angle:best[0],x:best[1],z:best[2],scale:best[3],cx,cz,rms:Math.sqrt(bestScore)}));console.log(id,best,'rms',Math.sqrt(bestScore),'bounds',bounds);
}


