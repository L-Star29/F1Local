const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
const lerp=(a,b,t)=>a+(b-a)*t;
// Remote cars use a short playout buffer instead of chasing each arriving packet.
export class SnapshotBuffer{
 constructor(delay=.1){this.delay=delay;this.frames=[];}
 clear(){this.frames=[];this.playTime=undefined;this.lastSample=undefined;}
 push(snapshot,received){if(this.frames.length&&snapshot.round!==this.frames.at(-1).snapshot.round)this.clear();this.frames.push({snapshot,received});if(this.frames.length>40)this.frames.shift();}
 sample(now){if(!this.frames.length)return[];const latest=this.frames.at(-1),target=latest.snapshot.time+Math.min(.15,(now-latest.received)/1000)-this.delay;
  if(this.playTime===undefined||Math.abs(target-this.playTime)>1)this.playTime=target;
  else{const dt=Math.max(0,Math.min(.1,(now-this.lastSample)/1000)),rate=Math.max(.9,Math.min(1.1,1+(target-this.playTime)*2));this.playTime+=dt*rate;}
  this.lastSample=now;const time=this.playTime;
  let left=this.frames[0],right=left;for(const frame of this.frames){if(frame.snapshot.time<=time)left=frame;if(frame.snapshot.time>=time){right=frame;break;}right=frame;}
  const span=right.snapshot.time-left.snapshot.time,t=span>0?Math.max(0,Math.min(1,(time-left.snapshot.time)/span)):1;
  return right.snapshot.players.map(p=>{const a=left.snapshot.players.find(q=>q.id===p.id)?.car,b=p.car;if(!a||Math.hypot(a.x-b.x,a.z-b.z)>12)return p;const car={...b};for(const k of ['x','y','z','u','v','steer','distance'])car[k]=lerp(a[k],b[k],t);car.yaw=a.yaw+angle(b.yaw-a.yaw)*t;if(time>latest.snapshot.time){const dt=Math.min(.1,time-latest.snapshot.time);car.x+=(Math.sin(car.yaw)*car.u+Math.cos(car.yaw)*car.v)*dt;car.z+=(Math.cos(car.yaw)*car.u-Math.sin(car.yaw)*car.v)*dt;}return {...p,car};});
 }
}
// Distribute routine local corrections over rendered frames, never in the
// snapshot callback. Large recovery/respawn changes remain immediate.
export class MotionCorrection{
 constructor(){this.clear();}
 clear(){this.error=null;}
 receive(local,remote,latency=0){const ahead=Math.min(.12,Math.max(0,latency)/2000),x=remote.x+(Math.sin(remote.yaw)*remote.u+Math.cos(remote.yaw)*remote.v)*ahead,z=remote.z+(Math.cos(remote.yaw)*remote.u-Math.sin(remote.yaw)*remote.v)*ahead;
  if(Math.hypot(local.x-x,local.z-z)>12){Object.assign(local,structuredClone(remote));this.clear();return;}
  this.error={x:x-local.x,z:z-local.z,yaw:angle(remote.yaw+remote.r*ahead-local.yaw),u:remote.u-local.u,v:remote.v-local.v,r:remote.r-local.r};
 }
 apply(car,dt){if(!this.error)return;const blend=1-Math.exp(-dt*7);for(const k of ['x','z','yaw','u','v','r']){const delta=this.error[k]*blend;car[k]+=delta;this.error[k]-=delta;}}
}
