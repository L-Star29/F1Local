import {sample} from './tracks.js';
import {outsideBoundary,boundaryMode} from './track-limits.js';

// Original game adjudication, informed by FIA 2025 guidance. Evidence, not mind-reading.
export class RaceSteward {
 constructor(track,limits='normal',strictness='balanced'){this.strictness=['lenient','balanced','strict'].includes(strictness)?strictness:'balanced';this.track=track;this.limits=boundaryMode(limits);this.drivers=new Map();}
 state(id){if(!this.drivers.has(id))this.drivers.set(id,{penalty:0,warnings:0,incident:null,pending:null,message:'',serial:0,previous:null});return this.drivers.get(id);}
 say(s,message){s.message=message;s.serial++;}
 penalty(s,seconds,reason){s.penalty+=seconds;this.say(s,`+${seconds}s · ${reason}`);}
 strike(s){s.warnings++;if(s.warnings>=4)this.penalty(s,5,'Repeated track limits');else this.say(s,s.warnings===3?'Final track-limits warning':`Track limits · warning ${s.warnings}/3`);}
 update(id,car,road,input,dt,time,traffic=[]){
  const s=this.state(id),off=outsideBoundary(road,this.limits),prev=s.previous;
  if(this.limits==='none')return s;
  let ds=prev?road.s-prev.s:0;if(ds<-this.track.length/2)ds+=this.track.length;if(ds>this.track.length/2)ds-=this.track.length;
  const distance=prev?Math.hypot(car.x-prev.x,car.z-prev.z):0;
  // Recovery/teleport must not create a fictitious shortcut or erase an existing sanction.
  const discontinuity=distance>Math.max(8,Math.abs(car.u)*dt*4);
  if(discontinuity){if(s.incident)this.settle(s,car,time,traffic);s.previous=null;}
  if(off&&!s.incident&&!discontinuity){
   if(s.pending)this.resolvePending(s,false);
   s.incident={time,duration:0,offDuration:0,onTime:0,route:0,distance:0,reference:0,braking:0,throttle:0,entrySpeed:Math.max(0,car.u),loss:false,contact:false,passedIds:[],
    rivals:traffic.filter(p=>p.id!==id&&p.finish==null).map(p=>({id:p.id,gap:routeGap(road.s,p.s,this.track.length)}))};
  }
  const e=s.incident;
  if(e&&!discontinuity){
   e.duration+=dt;if(off)e.offDuration+=dt;e.onTime=off?0:e.onTime+dt;e.route+=Math.max(0,ds);e.distance+=distance;
   e.reference+=Math.max(0,ds)/this.referenceSpeed(road.s);
   e.braking+=Math.max(0,input.brake||0)*dt;e.throttle+=Math.max(0,input.throttle||0)*dt;
   e.loss ||= Math.abs(car.v)>Math.max(6,Math.abs(car.u)*.28)||Math.abs(car.r)>1.4;
   e.contact ||= (car.contactAge??Infinity)<.8;
   if(off)for(const before of e.rivals){const q=traffic.find(p=>p.id===before.id&&p.finish==null);if(before.gap>0&&before.gap<80&&q&&routeGap(road.s,q.s,this.track.length)<-2&&!e.passedIds.includes(q.id))e.passedIds.push(q.id);}
   if(e.onTime>.5)this.settle(s,car,time,traffic,road);
  }
  if(s.pending&&!s.incident&&!discontinuity){
   const p=s.pending,ref=this.referenceSpeed(road.s);
   // Give back only while on track, deliberately lifting; elapsed menu time never counts.
   if(!off&&(input.throttle||0)<.25)p.debt=Math.max(0,p.debt+Math.max(0,ds)/ref-dt);
   const returned=p.returnIds.every(id=>{const q=traffic.find(t=>t.id===id);return q&&routeGap(road.s,q.s,this.track.length)>3;});
   if(p.debt<.08&&returned)this.resolvePending(s,true);
   else if(time>=p.deadline)this.resolvePending(s,false);
  }
  s.previous={s:road.s,x:car.x,z:car.z};return s;
 }
 referenceSpeed(s){const curve=Math.abs(sample(this.track,s).curve||0);return Math.min(95,Math.sqrt(32/Math.max(.0001,curve*.55)));}
 settle(s,car,time,traffic,road={s:s.previous?.s??0}){
  const e=s.incident;if(!e)return;s.incident=null;
  if(e.offDuration<.1&&!e.passedIds.length)return;
  // Demand geometric shortcut evidence before estimating time gain from a generic line.
  const shortcut=Math.max(0,e.route-e.distance-3),geometric=shortcut/Math.max(25,e.entrySpeed);
  const timeEstimate=e.offDuration>.4&&e.route>30?Math.max(0,e.reference-e.duration):0;
  const timed=shortcut>5||timeEstimate>.6?timeEstimate:0;
  // A shorter route is only advantageous if the driver kept the time.
  // Compare elapsed time with covering that route at the entry pace, allowing
  // a lower reference pace where the legal route bends sharply.
  const paceGain=Math.max(0,Math.max(e.reference,e.route/Math.max(25,e.entrySpeed))-e.duration);
  const gain=Math.max(Math.min(geometric,paceGain),timed);
  const threshold={lenient:.65,balanced:.4,strict:.25}[this.strictness];
  const returnIds=e.rivals.filter(p=>{const q=traffic.find(t=>t.id===p.id&&t.finish==null&&!t.dnf);if(!q)return false;const now=routeGap(road.s,q.s,this.track.length);return e.passedIds.includes(p.id)&&now<-2;}).map(p=>p.id);
  if(gain>threshold||returnIds.length){s.pending={debt:gain,initialGain:gain,returnIds,deadline:time+10,mitigated:e.braking/e.duration>.35||e.loss||e.contact};this.say(s,returnIds.length?'Give the position back':`Give back ${gain.toFixed(1)}s · lift safely within 10s`);return;}
  if(e.loss||e.contact||(e.braking/e.duration>.35&&car.u<e.entrySpeed*.7)){this.say(s,'Excursion reviewed · no advantage, no penalty');return;}
  if(this.strictness==='strict'||gain>threshold*.4)this.strike(s);
 }
 resolvePending(s,returned){const p=s.pending;if(!p)return;s.pending=null;if(returned){this.say(s,'Advantage returned · no time penalty');return;}const serious=p.returnIds.length>0||p.initialGain>=2;const minimum=serious?(p.mitigated?5:10):(p.mitigated?2:3);const seconds=Math.max(minimum,Math.ceil(p.debt+1));this.penalty(s,seconds,p.returnIds.length?'Position not returned':'Lasting advantage');}
 finish(id,car,time,traffic=[],road){const s=this.state(id);this.settle(s,car,time,traffic,road);this.resolvePending(s,false);return s;}
 recover(id,car,time){const s=this.state(id);this.settle(s,car,time,[]);this.resolvePending(s,false);s.previous=null;this.penalty(s,5,'Reset to track');}
}
export function routeGap(from,to,length){let d=to-from;if(d>length/2)d-=length;if(d<-length/2)d+=length;return d;}
