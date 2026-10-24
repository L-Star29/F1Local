import {newCar,step,vehicles,bodyToWorld} from './physics.js';
import {sample,nearest,clamp} from './tracks.js';
export const raceSettings={assists:'none',gears:'auto'};
export class RaceRoom{
 constructor(code,track,surface,laps=3){Object.assign(this,{code,track,surface,laps,players:[],phase:'lobby',time:0,startAt:0,round:0,created:Date.now()});}
 add(id,name,team){if(this.phase!=='lobby'||this.players.length>=2)throw Error('Room is full or already racing.');const p={id,name,team,ready:false,connected:false,input:{steer:0,throttle:0,brake:0},lastInput:0,seq:-1};this.players.push(p);if(!this.host)this.host=id;this.grid(p,this.players.length-1);return p;}
 grid(p,index){const s=this.track.length-16-index*8,q=sample(this.track,s),side=index%2?1:-1;Object.assign(p,{car:newCar({...q,x:q.x+q.nx*2*side,z:q.z+q.nz*2*side}),previousS:s,progress:s-this.track.length,lap:1,penalty:0,offTime:0,offPenalized:false,finish:null,dnf:false,gate:0,recoverAt:-10,seq:-1});p.car.y=this.surface(p.car).y;}
 start(id){if(id!==this.host)throw Error('Only the host can start.');if(!['lobby','finished'].includes(this.phase))throw Error('Race already started.');if(this.players.length!==2||this.players.some(p=>!p.ready||!p.connected))throw Error('Both drivers must be connected and ready.');this.round++;this.finishDeadline=null;this.players.forEach((p,i)=>{this.grid(p,i);p.input={steer:0,throttle:0,brake:0};});this.phase='countdown';this.startAt=this.time+5;}
 setInput(p,data){if(!Number.isInteger(data.seq)||data.seq<=p.seq)return;for(const k of ['steer','throttle','brake'])if(!Number.isFinite(data[k]))throw Error('Invalid controls.');p.seq=data.seq;p.lastInput=this.time;p.input={steer:clamp(data.steer,-1,1),throttle:clamp(data.throttle,0,1),brake:clamp(data.brake,0,1),analog:!!data.analog};if(data.recover&&this.phase==='racing'&&this.time-p.recoverAt>3&&!p.finish&&!p.dnf){const q=sample(this.track,p.previousS);p.car=newCar(q);p.car.y=this.surface(p.car).y;p.penalty+=5;p.recoverAt=this.time;}}
 tick(dt){this.time+=dt;if(this.phase==='countdown'&&this.time>=this.startAt)this.phase='racing';if(this.phase!=='racing')return;
  for(const p of this.players){if(p.finish!==null||p.dnf)continue;if(!p.connected&&this.time-(p.disconnectedAt??this.time)>10){p.dnf=true;continue;}
   const input=this.time-p.lastInput>.5||!p.connected?{steer:0,throttle:0,brake:p.car.u>.5?1:0}:p.input;
   let road=this.surface(p.car);step(p.car,input,road,'formula',dt,raceSettings);road=this.surface(p.car);this.wall(p.car,road);
   const off=road.wheelsOff===4;p.offTime=off?p.offTime+dt:0;if(!off)p.offPenalized=false;if(p.offTime>.5&&!p.offPenalized){p.penalty+=5;p.offPenalized=true;}
   let ds=road.s-p.previousS;if(ds<-this.track.length/2)ds+=this.track.length;if(ds>this.track.length/2)ds-=this.track.length;
   // Reject discontinuities in projected route distance; inputs cannot set position.
   if(Math.abs(ds)<Math.max(3,Math.abs(p.car.u)*dt*3)&&road.distance<40)p.progress+=ds;
   p.previousS=road.s;p.lap=Math.min(this.laps,Math.max(1,Math.floor(p.progress/this.track.length)+1));
   if(p.progress>=this.track.length*this.laps){p.finish=this.time-this.startAt;this.finishDeadline??=this.time+90;p.car.u=0;p.car.v=0;p.car.r=0;}
   if(p.finish===null&&(this.time-this.startAt>1800||(this.finishDeadline&&this.time>this.finishDeadline)))p.dnf=true;
  }
  this.contacts();if(this.players.every(p=>p.finish!==null||p.dnf)){this.phase='finished';this.players.forEach(p=>p.ready=false);}
 }
 wall(c,road){const hit=road.hit;if(!hit)return;c.x+=hit.nx*(1.05-hit.d);c.z+=hit.nz*(1.05-hit.d);const v=bodyToWorld(c.yaw,c.u,c.v),dot=v.x*hit.nx+v.z*hit.nz;if(dot<0){v.x-=dot*hit.nx;v.z-=dot*hit.nz;c.u=Math.max(0,(v.x*Math.sin(c.yaw)+v.z*Math.cos(c.yaw))*.85);c.v=(v.x*Math.cos(c.yaw)-v.z*Math.sin(c.yaw))*.5;c.r*=.5;}}
 contacts(){const [a,b]=this.players;if(!a||!b||a.dnf||b.dnf||a.finish!==null||b.finish!==null)return;
  let best=null;for(const la of [-1.5,0,1.5])for(const lb of [-1.5,0,1.5]){const dx=a.car.x+Math.sin(a.car.yaw)*la-b.car.x-Math.sin(b.car.yaw)*lb,dz=a.car.z+Math.cos(a.car.yaw)*la-b.car.z-Math.cos(b.car.yaw)*lb,d=Math.hypot(dx,dz);if(d<1.8&&(!best||d<best.d))best={d,nx:d>.001?dx/d:1,nz:d>.001?dz/d:0};}
  if(!best)return;const {d,nx,nz}=best;for(const [p,sign] of [[a,1],[b,-1]]){p.car.x+=nx*(1.8-d)*.5*sign;p.car.z+=nz*(1.8-d)*.5*sign;}
  const va=bodyToWorld(a.car.yaw,a.car.u,a.car.v),vb=bodyToWorld(b.car.yaw,b.car.u,b.car.v),closing=(va.x-vb.x)*nx+(va.z-vb.z)*nz;if(closing>=0)return;const impulse=-closing*.52;
  for(const [p,v,sign] of [[a,va,1],[b,vb,-1]]){v.x+=nx*impulse*sign;v.z+=nz*impulse*sign;p.car.u=v.x*Math.sin(p.car.yaw)+v.z*Math.cos(p.car.yaw);p.car.v=v.x*Math.cos(p.car.yaw)-v.z*Math.sin(p.car.yaw);p.car.r*=.7;}
 }
 snapshot(){const ranked=[...this.players].sort((a,b)=>a.dnf-b.dnf||(a.finish!==null&&b.finish!==null?(a.finish+a.penalty)-(b.finish+b.penalty):a.finish!==null?-1:b.finish!==null?1:b.progress-a.progress));return {code:this.code,host:this.host,laps:this.laps,phase:this.phase,time:this.time,startAt:this.startAt,round:this.round,players:ranked.map((p,i)=>({id:p.id,name:p.name,team:p.team,ready:p.ready,connected:p.connected,position:i+1,lap:p.lap,progress:p.progress,penalty:p.penalty,finish:p.finish,dnf:p.dnf,car:p.car}))};}
}
