// Driver-relative positions, independent of chase/T-cam camera offsets.
export function proximityTargets(self,entries){
 const result=[];
 for(const [index,entry] of entries.entries()){
  const c=entry.car;if(!c||entry.ghost||entry.dnf||entry.finish!=null||Math.abs((c.y||0)-(self.y||0))>3)continue;
  const dx=c.x-self.x,dz=c.z-self.z,left=dx*Math.cos(self.yaw)-dz*Math.sin(self.yaw),forward=dx*Math.sin(self.yaw)+dz*Math.cos(self.yaw),distance=Math.hypot(dx,dz);
  if(distance>45||Math.abs(left)>12||forward>7)continue;
  const alongside=Math.abs(forward)<7&&Math.abs(left)>1.2;
  const side=alongside?(left>0?'left':'right'):forward<0?'rear':null;if(!side)continue;
  const closing=(c.u||0)*Math.cos(c.yaw-self.yaw)-(self.u||0),urgent=alongside||forward<0&&closing>2&&-forward/closing<1.5;
  result.push({id:entry.id??index,distance,urgent,alongside,left,forward,side,bearing:Math.atan2(-left,-forward)});
 }
 return result;
}
export function nearbyCars(self,entries){const result={left:null,right:null,rear:null};for(const v of proximityTargets(self,entries))if(!result[v.side]||v.distance<result[v.side].distance)result[v.side]=v;return result;}
export function createProximityHud(parent){
 const element=document.createElement('div');element.id='proximityHud';element.setAttribute('aria-label','Nearby cars');
 const nodes=new Map();parent.append(element);
 return (car,entries)=>{const data=proximityTargets(car,entries),live=new Set(data.map(v=>v.id)),rx=Math.min(290,innerWidth*.20),ry=Math.min(120,innerHeight*.12);
  for(const [id,n] of nodes)if(!live.has(id)){n.remove();nodes.delete(id);}
  for(const v of data){let n=nodes.get(v.id);if(!n){n=document.createElement('div');n.className='proximity-chevron';n.innerHTML='<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 5 L14 13 L24 5 M4 14 L14 22 L24 14"/></svg>';element.append(n);nodes.set(v.id,n);}n.dataset.urgent=String(v.urgent);n.style.transform=`translate(calc(-50% + ${Math.sin(v.bearing)*rx}px), ${Math.cos(v.bearing)*ry}px) rotate(${-v.bearing}rad)`;n.style.opacity=String(v.urgent?1:Math.max(.35,1-v.distance/65));n.setAttribute('aria-label',`${v.side}: ${v.alongside?'alongside':Math.round(v.distance)+' metres away'}`);}
 };
}
