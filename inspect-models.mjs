import fs from 'node:fs';
import * as T from './vendor/three.module.js';
export function readModel(file){
 const b=fs.readFileSync(file),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len)),bin=28+len;
 function accessor(id){let a=j.accessors[id],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],bytes={5126:4,5125:4,5123:2,5121:1}[a.componentType],fn={5126:'readFloatLE',5125:'readUInt32LE',5123:'readUInt16LE',5121:'readUInt8'}[a.componentType],out=[];for(let i=0;i<a.count;i++)for(let k=0;k<n;k++)out.push(b[fn](bin+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*bytes)+k*bytes));return out;}
 const meshes=[];
 function walk(id,parent){let node=j.nodes[id],local=node.matrix?new T.Matrix4().fromArray(node.matrix):new T.Matrix4().compose(new T.Vector3(...(node.translation||[0,0,0])),new T.Quaternion(...(node.rotation||[0,0,0,1])),new T.Vector3(...(node.scale||[1,1,1]))),matrix=parent.clone().multiply(local);if(node.mesh!==undefined)for(let p of j.meshes[node.mesh].primitives){let raw=accessor(p.attributes.POSITION),pos=[];for(let i=0;i<raw.length;i+=3){let v=new T.Vector3(...raw.slice(i,i+3)).applyMatrix4(matrix);pos.push(v.x,v.y,v.z);}meshes.push({name:node.name,material:j.materials[p.material]?.name||'',positions:pos,indices:p.indices!==undefined?accessor(p.indices):Array.from({length:pos.length/3},(_,i)=>i)});}for(let child of node.children||[])walk(child,matrix);}
 for(let n of j.scenes[j.scene||0].nodes)walk(n,new T.Matrix4());return {j,meshes};
}
if(process.argv[2]){const {j,meshes}=readModel(process.argv[2]);console.log(j.asset);for(let m of meshes){let b=new T.Box3().setFromBufferAttribute(new T.Float32BufferAttribute(m.positions,3));console.log(m.name,m.material,m.indices.length/3,JSON.stringify({min:b.min,max:b.max}));}}
