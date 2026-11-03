import {sample,clamp} from './tracks.js';
import {routeGap} from './race-steward.js';
import {vehicles,tyreCapacity,step,bodyToWorld} from './physics.js';
import {carContact} from './car-contact.js';

// Aggression changes attack timing, never physical clearance.
export function racecraft(race,bot,road,traffic,targetSpeed,dt){
 const t=race.track,c=bot.car,a=race.aggression,base=sample(race.line,road.s).offset||0;
 const bounds=race.line.bounds[Math.floor(road.s/t.ds)%t.n],low=-bounds[0],high=bounds[1];
 const sight=Math.max(120,c.u*c.u/40+c.u*.5+15);
 const others=traffic.filter(p=>p.finish==null&&!p.ghost).map(p=>{const r=race.surface(p.car);return {p,road:r,ds:routeGap(road.s,r.s,t.length)};}).filter(p=>Math.abs(p.ds)<sight);
 const ahead=others.filter(p=>p.ds>0&&Math.abs(p.road.offset-road.offset)<2.5).sort((x,y)=>x.ds-y.ds)[0];
 // Reserve space before physical overlap, including nose/wing sweep through a turn.
 const overlap=others.filter(p=>Math.abs(p.road.offset-road.offset)>1.3&&(Math.abs(p.ds)<8.5||Math.abs(p.ds+(p.p.car.u-c.u)*.45)<7));
 const braking=c.brake>.08||c.ax<-3||targetSpeed<c.u-1;
 const state=bot.tactics??={lane:road.offset,defended:false,clear:0,braking:false,hold:0};
 state.roomSides??={};
 for(const p of others){
  const id=p.p.id;if(!id)continue;
  if(state.roomSides[id]&&Math.abs(p.ds)<14&&!overlap.includes(p))overlap.push(p);
  if(overlap.includes(p)&&!state.roomSides[id])state.roomSides[id]=Math.sign(p.road.offset-road.offset)||1;
 }
 for(const id of Object.keys(state.roomSides))if(!others.some(p=>p.p.id===id&&Math.abs(p.ds)<14))delete state.roomSides[id];
 const passRival=others.find(p=>p.p.id===state.passId);
 if(state.passId&&(!passRival||passRival.ds<-14||passRival.ds>70)){state.passId=null;state.hold=0;}
 if(state.passId)state.hold=Math.max(state.hold,.2);
 // Defend a credible closing attack, not somebody following far behind.
 const challenger=others.find(p=>p.ds<-8&&p.ds>-35&&p.p.car.u>c.u+1&&(-p.ds-7)/(p.p.car.u-c.u)<2.2);
 state.clear=challenger||overlap.length?0:state.clear+dt;
 if(state.clear>2)state.defended=false;
 state.hold=Math.max(0,state.hold-dt);
 let lane=base,speed=targetSpeed;
 let bend=0;for(let d=25;d<=160;d+=15){const curve=sample(t,road.s+d).curve;if(Math.abs(curve)>.002){bend=curve;break;}}
 if(!braking&&!overlap.length){
  if(ahead){
   // Pull out while there is still distance to establish overlap, rather than
   // waiting until following-distance braking has already removed the run.
   const closing=c.u-ahead.p.car.u,attack=closing>-.5&&ahead.ds<12+32*a||closing>.5&&ahead.ds/closing<2+3*a;
   const pass=state.passId?null:attack?chooseRaceLane(race,bot,road,ahead,others,bend):null;
   if(pass!==null){state.lane=pass;state.passId=ahead.p.id;state.hold=1.5;bot.intent='OVERTAKING';}
   else if(Math.abs(bend)<.002&&ahead.ds>15){lane=ahead.road.offset;bot.intent='SLIPSTREAM';}
   if(!(a>=.95&&state.passId===ahead.p.id)&&ahead.ds<Math.max(10,c.u*.32)&&Math.abs(road.offset-ahead.road.offset)<2.4)speed=Math.min(speed,Math.max(0,ahead.p.car.u+(ahead.ds-9)*.45));
  }else if(challenger&&a>.35&&!state.defended){
   // One early commitment per encounter, not a reactive second block.
   state.lane=clamp((Math.sign(bend)||Math.sign(road.offset)||1)*(1+2*a),low+1.3,high-1.3);
   state.defended=true;state.hold=3;bot.intent='DEFENDING';bot.defendTime=3;bot.defendCooldown=8;
  }
 }
 if(state.hold>0)lane=state.lane;
 // A stopped/slow car is an obstacle even when it sits on the FUTURE racing
 // line rather than our current lateral offset. Plan beyond stopping distance.
 if(state.obstacle&&!others.some(p=>p.p.id===state.obstacle&&p.ds>-8)){state.obstacle=null;state.avoidLane=null;state.hold=0;}
 const obstacle=others.filter(p=>p.ds>-8&&(p.ds>0&&(state.passId===p.p.id||c.u-p.p.car.u>8||p.p.car.u<2&&p.ds<40||(p.p.car.ax<-3||p.p.input?.brake>.2)&&targetSpeed>p.p.car.u+3&&c.u>=p.p.car.u-2&&p.ds<Math.max(20,c.u*1.2))||state.obstacle===p.p.id)&&p.ds<sight&&
  (Math.abs(p.road.offset-road.offset)<3.2||Math.abs(p.road.offset-(sample(race.line,p.road.s).offset||0))<3.2)).sort((a,b)=>a.ds-b.ds)[0];
 let avoiding=false;
 if(obstacle){
  let pass=(state.passId&&state.passId===obstacle.p.id?state.lane:state.obstacle===obstacle.p.id?state.avoidLane:null)??chooseRaceLane(race,bot,road,obstacle,others,bend);
  // A rival can move into a previously clear route. Reconsider it while still
  // behind, not after overlap when switching sides would sweep into them.
  if(pass!=null&&obstacle.ds>8&&Math.abs(pass-obstacle.road.offset)<2.6){pass=chooseRaceLane(race,bot,road,obstacle,others,bend);if(pass==null){state.passId=null;state.avoidLane=null;state.hold=0;}}
  if(pass!=null){lane=clamp(pass,low,high);state.obstacle=obstacle.p.id;state.avoidLane=lane;state.lane=lane;state.hold=1.5;avoiding=true;bot.intent='AVOIDING SLOW CAR';}else{lane=road.offset;}
  // Until lateral clearance actually exists, retain enough braking distance.
  const blockingWidth=c.u<8||obstacle.p.car.u>8?2.6:3.2;
  if(obstacle.ds>0&&Math.abs(road.offset-obstacle.road.offset)<blockingWidth){
   const committedAttack=a>=.95&&pass!=null;
   if(!committedAttack&&pass!=null&&obstacle.p.car.u<2&&obstacle.ds<25)speed=Math.min(speed,4);
   const free=Math.max(0,obstacle.ds-(pass==null?16:c.u<8?6.5:9)-Math.max(0,c.u-obstacle.p.car.u)*.25);
   const accelerating=obstacle.p.input?.throttle>.5&&!(obstacle.p.input?.brake>.05);
   const leaderSpeed=Math.max(0,obstacle.p.car.u+(accelerating?0:Math.min(0,obstacle.p.car.ax||0))*.35);
   if(committedAttack){
    // Full aggression assumes the rival holds its occupied lane. Preserve the
    // run if we can pull alongside before catching it; do not slow to its speed
    // merely because we have not completed the lateral move yet.
    const clearTime=.35+Math.max(0,blockingWidth-Math.abs(road.offset-obstacle.road.offset))/4;
    speed=Math.min(speed,Math.max(6,leaderSpeed+Math.max(0,obstacle.ds-6.5)/clearTime));
   }else speed=Math.min(speed,Math.sqrt(leaderSpeed**2+2*18*free));
  }
 }
 // Nearby traffic alone must not replace the apex path with a fixed corridor lane.
 const battling=overlap.length>0||state.hold>0;
 // A braking commitment belongs to an encounter, not every later corner.
 // Otherwise an old brakeLane can survive repeated braking and replace the
 // racing line long after the opponent has disappeared.
 if(!battling&&!others.some(p=>Math.abs(p.ds)<20)){state.braking=false;state.brakeLane=null;}
 if(braking&&battling&&!state.braking)state.brakeLane=road.offset;
 if(braking&&(battling||state.braking)&&!avoiding){lane=state.brakeLane??road.offset;bot.intent='BRAKING · HOLD LINE';}
 // Keep room whenever overlapped, conservatively even before apex entitlement is resolved.
 // This prevents an uncertain entitlement estimate from becoming a deliberate collision.
 if(overlap.length&&!avoiding&&!braking&&!state.passId)lane=base; // A committed pass keeps its side through a linked corner.
 let lo=low,hi=high;
 for(const p of overlap){const separation=racingSeparation(c,p.p.car,sample(t,road.s),a),side=state.roomSides[p.p.id]||Math.sign(p.road.offset-road.offset)||1;if(side>0)hi=Math.min(hi,p.road.offset-separation);else lo=Math.max(lo,p.road.offset+separation);}
 if(lo<=hi)lane=clamp(lane,lo,hi);else {lane=clamp(road.offset,low,high);speed=Math.min(speed,Math.max(3,c.u-8));}
 // If the safe lane is not reachable yet, yield speed before making contact.
 for(const p of overlap){const space=Math.abs(p.road.offset-road.offset),required=racingSeparation(c,p.p.car,sample(t,road.s),a);const yields=p.ds>3||(Math.abs(p.ds)<=3&&String(bot.id)<String(p.p.id));if(space<required-.15&&yields&&collisionThreat(bot,p.p))speed=Math.min(speed,avoiding&&p.p.car.u<2&&p.ds>6.5?4:Math.max(0,p.p.car.u-5));}
 // Reject a move into the predicted path of a closing car before overlap occurs.
 for(const p of others){const predicted=p.ds+(p.p.car.u-c.u)*.6;if(Math.abs(predicted)<7&&Math.abs(p.road.offset-lane)<2.65&&Math.abs(p.road.offset-road.offset)>2.3&&Math.abs(p.road.offset-lane)<Math.abs(p.road.offset-road.offset)){lane=road.offset;}}
 if(overlap.length)bot.intent='SIDE BY SIDE';
 state.braking=braking&&(battling||state.braking);
 // Explicit maximum-aggression policy: traffic chooses the path, never a
 // following/yield/stopping speed. Corner feasibility is still enforced below.
 // A sudden stop or a fully blocked road may therefore result in contact.
 if(a>=.95)speed=targetSpeed;
 const offset=lane-base;
 // Do not assume racing-line corner speeds on a much tighter passing line.
 if(Math.abs(offset)>1)speed*=Math.sqrt(Math.max(.75,1-Math.abs(bend)*Math.abs(offset)));
 if((c.contactAge??Infinity)<.25)state.contactGrace=2;
 else state.contactGrace=Math.max(0,(state.contactGrace||0)-dt);
 if(road.wheelsOff===4){speed=Math.min(speed,20);const conflict=others.find(p=>p.ds>-25&&p.ds<12&&Math.abs(p.road.offset-lane)<3&&Math.abs(p.road.offset-lane)<Math.abs(p.road.offset-road.offset)-.25);if(conflict){if(state.contactGrace>0&&!collisionThreat(bot,conflict.p))speed=Math.min(speed,Math.max(3,conflict.p.car.u-2));else speed=0;}bot.intent=state.contactGrace>0?'RECOVERING FROM CONTACT':'SAFE REJOIN';}
 const inBattle=overlap.length>0||Math.abs(offset)>.05;
 if(inBattle)speed=Math.min(speed,tacticalSpeed(race,road.s,lane));
 // A coarse lateral clearance reservation can deadlock a stopped queue even
 // after the actual car bodies are clear. Permit a slow manoeuvre only when
 // a full-physics, full-footprint rollout confirms the next second is clear.
 if(avoiding&&obstacle.p.car.u<2&&c.u<4&&speed<2&&clearCrawl(race,bot,others))speed=3;
 return {offset,speed,lane,inBattle,avoiding,attack:a>=.95&&avoiding};
}
// Lane reservations include comfortable room, not a command to slow down.
// Yield only when the actual swept car footprints threaten contact.
function collisionThreat(a,b){
 const advance=(c,time)=>{const yaw=c.yaw+(c.r||0)*time*.5,v=bodyToWorld(yaw,c.u,c.v||0);return {...c,x:c.x+v.x*time,z:c.z+v.z*time,yaw:c.yaw+(c.r||0)*time};};
 for(let i=0;i<=12;i++)if(carContact(advance(a.car,i*.05),advance(b.car,i*.05),a.team,b.team))return true;
 return false;
}
function clearCrawl(race,bot,others){
 const car=structuredClone(bot.car),p=race.line.vehicle||vehicles.formula;
 for(let i=1;i<=20;i++){
  const road=race.surface(car);
  step(car,{analog:true,steer:bot.car.steerInput||0,throttle:clamp((3-car.u)*.5+.05,0,.5),brake:car.u>3?.3:0},road,'formula',.05,{assists:'none',gears:'auto',aiPerformance:race.performance,steeringRange:p.steerLock});
  const next=race.surface(car);if(next.wheelsOff===4||next.hit)return false;
  for(const other of others){const c=other.p.car,v=bodyToWorld(c.yaw,c.u,c.v),future={...c,x:c.x+v.x*i*.05,z:c.z+v.z*i*.05};if(carContact(car,future,bot.team,other.p.team))return false;}
 }
 return true;
}
// A passing/defending lane has different radii from the optimized racing line.
// Never reuse a flat-out racing-line speed for a much tighter side-by-side arc.
export function tacticalSpeed(race,s,lane){
 const p=race.line.vehicle||vehicles.formula,t=race.track;
 const point=d=>{const q=sample(t,s+d),b=race.line.bounds[Math.floor((((s+d)%t.length+t.length)%t.length)/t.ds)],o=clamp(lane,-b[0],b[1]);return {x:q.x+q.nx*o,z:q.z+q.nz*o};};
 let limit=100;
 for(let d=5;d<=125;d+=10){const a=point(d-8),b=point(d),c=point(d+8),ax=b.x-a.x,az=b.z-a.z,bx=c.x-b.x,bz=c.z-b.z;
  const curve=Math.abs(2*(ax*bz-az*bx)/Math.max(.001,Math.hypot(ax,az)*Math.hypot(bx,bz)*Math.hypot(c.x-a.x,c.z-a.z)));
  let lo=3,hi=100;for(let i=0;i<10;i++){const v=(lo+hi)/2,cap=4*tyreCapacity((p.mass*9.81+p.aero*v*v)/4,p)/p.mass;if(v*v*curve<cap*.78)lo=v;else hi=v;}
  limit=Math.min(limit,Math.sqrt(lo*lo+2*18*Math.max(0,d-10)));
 }
 return limit;
}
export function racingSeparation(a,b,road){const heading=Math.atan2(road.tx,road.tz);return 2.4+2.8*(Math.abs(Math.sin((a.yaw||0)-heading))+Math.abs(Math.sin((b.yaw||0)-heading)))+1;}
export function chooseRaceLane(race,bot,road,ahead,others,bend){
 if(bot.car.u+2<ahead.p.car.u)return null;
 const t=race.track,side=Math.sign(bend)||(ahead.road.offset>0?-1:1);
 for(const sign of [side,-side]){const lane=ahead.road.offset+sign*Math.max(3.4,racingSeparation(bot.car,ahead.p.car,sample(t,road.s),race.aggression));let safe=true;
  const horizon=Math.max(50,bot.car.u*.8);
  for(let d=0;d<=horizon;d+=6){const limits=race.line.bounds[Math.floor(((road.s+d)%t.length)/t.ds)];if(lane<-limits[0]||lane>limits[1]){safe=false;break;}}
  if(others.some(p=>p!==ahead&&(p.ds>-8||p.ds+(p.p.car.u-bot.car.u)*.8>-8)&&p.ds<horizon&&Math.abs(p.road.offset-lane)<2.65))safe=false;
  if(safe)return lane;
 }return null;
}
