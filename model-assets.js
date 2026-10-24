import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
export const teams=[
 {id:'ferrari',name:'Ferrari',file:'Ferrari SF26.glb',color:'#ed353b'},
 {id:'redbull',name:'Red Bull',file:'Red Bull RB26.glb',color:'#4387ef'},
 {id:'mercedes',name:'Mercedes',file:'Mercedes W17 26.glb',color:'#34d5c4'},
 {id:'audi',name:'Audi',file:'Audi 26.glb',color:'#f65b42'},
 {id:'cadillac',name:'Cadillac',file:'Cadillac 26.glb',color:'#c3cad3'}
];
const loader=new GLTFLoader();
export async function loadModel(url,onProgress){return (await loader.loadAsync(url,onProgress)).scene;}
export function disposeModel(root){const textures=new Set(),materials=new Set(),geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});textures.forEach(t=>{t.source?.data?.close?.();t.dispose()});materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}
export async function loadTeam(id,onProgress){
 const team=teams.find(t=>t.id===id)||teams[0],root=await loadModel('./Car Models/'+team.file,onProgress);
 root.updateMatrixWorld(true);
 // Use the revised authored tyre pivots; split any remaining batched hubs/discs.
 const body=new T.Group(),wheels=[],wheelParts=[[],[],[],[]],steeringParts=[];
 const authored=[];root.traverse(o=>{if(/^Object_(?:10|13|17|18|19)\.?00[1-4]$/.test(o.name))authored.push(o);});
 const authoredSet=new Set();for(let node of authored)node.traverse(o=>authoredSet.add(o));
 const centers=new Map();
 for(let node of authored){const center=node.getWorldPosition(new T.Vector3()),k=(center.z>0?0:2)+(center.x>0?1:0);centers.set(k,center);}
 root.traverse(o=>{if(!o.isMesh||authoredSet.has(o))return;if(/steeringwheel|(?:^|_)sw(?:_|\.|$)|lcd/i.test(o.material.name))steeringParts.push(o);const wheel=/tyre|sidewall|wheel_hub|discs/i.test(o.material.name)&&!/steering/i.test(o.material.name);if(!wheel)return;
 const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);const pos=geometry.attributes.position,parts=[[],[],[],[]];
 for(let i=0;i<pos.count;i+=3){let x=(pos.getX(i)+pos.getX(i+1)+pos.getX(i+2))/3,z=(pos.getZ(i)+pos.getZ(i+1)+pos.getZ(i+2))/3;parts[(z>0?0:2)+(x>0?1:0)].push(i,i+1,i+2);}
 for(let k=0;k<4;k++)if(parts[k].length){const g=new T.BufferGeometry();for(let [name,a] of Object.entries(geometry.attributes)){let values=[];for(let i of parts[k])for(let j=0;j<a.itemSize;j++)values.push(a.array[i*a.itemSize+j]);g.setAttribute(name,new T.Float32BufferAttribute(values,a.itemSize));}wheelParts[k].push(new T.Mesh(g,o.material));}geometry.dispose();o.visible=false;
 });
 body.add(root);body.updateMatrixWorld(true);
 for(let node of authored){const center=node.getWorldPosition(new T.Vector3()),k=(center.z>0?0:2)+(center.x>0?1:0);body.attach(node);wheelParts[k].push(node);}
 const steering=new T.Group();body.add(steering);if(steeringParts.length){let bounds=new T.Box3();for(let o of steeringParts)bounds.union(new T.Box3().setFromObject(o));steering.position.copy(bounds.getCenter(new T.Vector3()));body.updateMatrixWorld(true);for(let o of steeringParts)steering.attach(o);}
 for(let k=0;k<4;k++){let pieces=wheelParts[k];if(!pieces.length)continue;let b=new T.Box3();pieces.forEach(m=>b.union(new T.Box3().setFromObject(m)));let center=centers.get(k)||b.getCenter(new T.Vector3()),pivot=new T.Group(),spin=new T.Group();pivot.position.copy(center);pivot.add(spin);body.add(pivot);body.updateMatrixWorld(true);pieces.forEach(m=>{if(authored.includes(m))spin.attach(m);else{m.geometry.translate(-center.x,-center.y,-center.z);spin.add(m);}});wheels.push({pivot,spin,front:k<2});}
 // Front axle is positive Z in all five supplied exports; centre wheelbase.
 let box=new T.Box3().setFromObject(body),offset=-(box.min.z+box.max.z)/2;
 body.position.set(0,-box.min.y,offset);const container=new T.Group();container.add(body);
 container.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;for(let m of Array.isArray(o.material)?o.material:[o.material]){m.envMapIntensity=.65;if(m.map)m.map.anisotropy=4;}}});
 return {root:container,wheels,team,steering};
}
