// Timers measure each continuous excursion. Rejoining resets the allowance.
export const limitGrace={strict:0,standard:.5,relaxed:1.5,practice:Infinity};
export const boundaryModes=['normal','kerbs','extended','none'];
export const boundaryMode=value=>boundaryModes.includes(value)?value:'normal';
export function outsideBoundary(road,mode='normal'){
 if(mode==='none')return false;
 return (mode==='kerbs'?(road.kerbWheelsOff??road.wheelsOff):mode==='extended'?(road.extendedWheelsOff??road.wheelsOff):road.wheelsOff)===4;
}
// Keep surface legality separate from tyre grip. Extended mode allows approximately
// one metre beyond road/kerb edges, sampled in eight directions at wheel positions.
export function wheelBoundary(road,kerbs,x,z,y){
 const h=road.height(x,z),k=kerbs?.height(x,z),onRoad=h!==null,onKerb=k!=null&&Math.abs(k-y)<.25;
 if(onRoad||onKerb)return {normal:onRoad,kerbs:true,extended:true};
 for(let i=0;i<8;i++){const angle=i*Math.PI/4,dx=Math.cos(angle),dz=Math.sin(angle);const rh=road.height(x+dx,z+dz),kh=kerbs?.height(x+dx,z+dz);
  if(rh!=null&&Math.abs(rh-y)<.25||kh!=null&&Math.abs(kh-y)<.25)return {normal:false,kerbs:false,extended:true};
 }
 return {normal:false,kerbs:false,extended:false};
}
export function trackLimitStep(elapsed,off,dt,level='strict'){
 const seconds=off?elapsed+dt:0;
 return {seconds,invalid:off&&seconds>(limitGrace[level]??0)};
}
