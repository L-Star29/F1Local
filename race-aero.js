import {clamp} from './tracks.js';
import {routeGap} from './race-steward.js';
// FIA British GP 2025 circuit map V2, fitted to the imported Silverstone centreline.
export const drsZones={'gb-1948':[
 {name:'Wellington Straight',detect:606-25,start:951+30,end:1595},
 {name:'Hangar Straight',detect:3428,start:3911,end:4740}
]};
// Sample the leader's actual path so the wake follows a bend or lane change.
function recordWake(state,car){
 const trail=state.trail, last=trail[0];
 const distance=last?Math.hypot(car.x-last.x,car.z-last.z):Infinity;
 if(distance<5)return;
 if(distance>32)trail.length=0;
 trail.unshift({x:car.x,z:car.z,y:car.y||0});
 if(trail.length>25)trail.pop();
}
export function slipstream(car,traffic,states){
 let tow=0;
 for(const p of traffic){
  const c=p.car;
  if(c===car||p.finish!=null||p.ghost||Math.min(c.u,car.u)<15)continue;
  const sx=Math.sin(c.yaw),sz=Math.cos(c.yaw);
  const dx=c.x-car.x,dz=c.z-car.z;
  if(dx*dx+dz*dz>125**2)continue;
  const trail=states?.get(p.id)?.trail;
  let head=c,along=0;
  const points=trail?.length>1?trail:[{x:c.x-120*sx,z:c.z-120*sz,y:c.y||0}];
  for(const tail of points){
   const ex=head.x-tail.x,ez=head.z-tail.z,len=Math.hypot(ex,ez);
   if(len<.01){head=tail;continue;}
   const x=head.x-car.x,z=head.z-car.z,projection=(x*ex+z*ez)/len;
   const distance=along+projection;
   if(projection>=0&&projection<=len&&distance>=5&&distance<120){
    const alignment=(ex*Math.sin(car.yaw)+ez*Math.cos(car.yaw))/len;
    const lateral=Math.abs(x*ez-z*ex)/len;
    const height=(head.y||0)+((tail.y||0)-(head.y||0))*projection/len;
    const width=1.35+.013*distance,edge=clamp(1-(lateral/width)**2,0,1);
    const strength=edge*edge*(1-distance/120)**1.25*clamp((alignment-.88)/.12,0,1)*clamp((c.u-15)/30,0,1)*clamp(1-Math.abs((car.y||0)-height)/2,0,1);
    tow=Math.max(tow,strength);
   }
   along+=len;head=tail;
  }
 }
 return tow;
}
export class RaceAero {
 constructor(track){this.track=track;this.states=new Map();this.passages=(drsZones[track.id]||[]).map(()=>new Map());}
 state(id){if(!this.states.has(id))this.states.set(id,{trail:[],previousS:null,eligible:[],closed:[],wasPressed:false,lastPress:0,open:false,turnTime:0});return this.states.get(id);}
 update(entries,dt,time,racing=true){
  const zones=drsZones[this.track.id]||[];
  for(const p of entries){
   const s=this.state(p.id);s.crossed=[];recordWake(s,p.car);
   if(s.previousS===null)continue;
   const ds=routeGap(s.previousS,p.road.s,this.track.length);
   if(ds<=0||ds>=Math.max(5,p.car.u*dt*4))continue;
   zones.forEach((z,i)=>{
    const d=routeGap(s.previousS,z.detect,this.track.length);
    if(d>0&&d<=ds){this.passages[i].set(p.id,time-dt+dt*d/ds);s.crossed.push(i);}
   });
  }
  for(const p of entries){
   const s=this.state(p.id),c=p.car,control=p.input||{},off=p.road.wheelsOff===4;
   for(const i of s.crossed){
    const at=this.passages[i].get(p.id);
    s.eligible[i]=entries.some(q=>q!==p&&q.finish==null&&at-this.passages[i].get(q.id)>0&&at-this.passages[i].get(q.id)<=1);
    s.closed[i]=false;
   }
   const zone=zones.findIndex(z=>p.road.s>=z.start&&p.road.s<z.end);
   const pressed=Number.isSafeInteger(control.drsPress)?control.drsPress>s.lastPress:!!control.drs&&!s.wasPressed;
   if(Number.isSafeInteger(control.drsPress))s.lastPress=control.drsPress;
   s.wasPressed=!!control.drs;
   // A keyboard tap is full input even when the car barely changes heading.
   const loadedTurn=Math.abs(c.r||0)>.18 && Math.abs(c.r*c.u)>6;
   s.turnTime=loadedTurn?s.turnTime+dt:0;
   const turning=s.turnTime>=.15;
   if(zone>=0&&s.open&&(control.brake>.05||turning||off))s.open=false;
   let reason='';
   if(zone<0)reason='OUTSIDE ZONE';
   else if(racing&&!s.eligible[zone])reason='NEED ≤1s AT DETECTION';
   else if(off)reason='OFF TRACK';
   else if(control.brake>.05)reason='RELEASE BRAKE';
   else if(turning)reason='STRAIGHTEN TO OPEN';
   else if(c.u<=20)reason='ABOVE 72 KM/H';
   c.drsAvailable=!reason;
   c.drsReason=reason?'DRS · '+reason:'';
   if(!c.drsAvailable)s.open=false;
   else if(pressed)s.open=!s.open;
   else if(control.autoDrs)s.open=true;
   c.drsOpen=s.open;
   c.tow=off?0:slipstream(c,entries,this.states);
   c.aeroFlow={drag:1-.12*c.tow-(c.drsOpen?.18:0),load:1-.05*c.tow-(c.drsOpen?.12:0)};
   s.previousS=p.road.s;
  }
 }
 resetDriver(id){this.states.delete(id);for(const p of this.passages)p.delete(id);}
}
