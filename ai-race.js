import {AI_DRIVER,AI_BOOSTED_DRIVER} from './ai-driver.js';
import {racecraft} from './ai-racecraft.js';
import {RaceSteward} from './race-steward.js';
import {RaceAero} from './race-aero.js';
import {racingLine,plannedSpeed,performanceLine} from './ai-line.js';
import {newCar,step,vehicles,steeringLimit,bodyToWorld} from './physics.js';
import {sample,clamp} from './tracks.js';
import {resolveCarContact} from './car-contact.js';
const teams=['redbull','mercedes','audi'];
// Analog AI can request more steering than a held keyboard key, within mechanical lock.
export const aiSteeringRange=(speed,vehicle,multiplier=AI_DRIVER.steering)=>Math.min(vehicle.steerLock,multiplier*steeringLimit(speed,vehicle,false));
export function gridCar(track,index,surface){const s=track.length-16-index*9,p=sample(track,s),side=index%2?1:-1,c=newCar({...p,x:p.x+p.nx*1.8*side,z:p.z+p.nz*1.8*side});c.y=surface(c).y;return c;}
export class AIRace {
 constructor(track,surface,{count=2,difficulty='standard',laps=3,aggression=50,performance='equal',limits='normal',team='ferrari',driver={} }={}){this.driver={...(performance==='equal'?AI_DRIVER:AI_BOOSTED_DRIVER),...driver};this.aggression=clamp(Number(aggression)||0,0,100)/100;this.track=track;this.surface=surface;this.laps=laps;this.difficulty=difficulty;this.skill=clamp(Number.isFinite(Number(difficulty))?Number(difficulty):({club:0,standard:35,quick:55})[difficulty]??35,0,100);this.performance=(performance==='challenge'?.5:performance==='enhanced'?1:0)*Math.pow(this.skill/100,3);this.line=performanceLine(racingLine(track,surface),this.performance);this.steward=new RaceSteward(track,limits);this.aero=new RaceAero(track);this.player={id:'you',name:'You',team,progress:-16,previousS:track.length-16,finish:null};this.bots=Array.from({length:clamp(count,0,3)},(_,i)=>({id:'ai-'+i,name:['Alex','Morgan','Casey'][i],team:teams[i],car:gridCar(track,i+1,surface),progress:-16-(i+1)*9,previousS:track.length-16-(i+1)*9,finish:null,gate:0,completed:0,offset:0,launchLane:(i+1)%2?1.8:-1.8,reaction:.25+i*.13,control:{steer:0,throttle:0,brake:0},think:0,stuck:0,recoveries:0,ghost:0}));}
 speedAt(s){const v=plannedSpeed(this.line,s,this.skill),d=this.driver,scale=v<45?d.slow+(d.medium-d.slow)*clamp((v-25)/20,0,1):d.medium+(d.fast-d.medium)*clamp((v-45)/30,0,1);return v*(1+(scale-1)*(this.skill/100)**3);}
 controls(bot,road,traffic,dt){const c=bot.car,t=this.track,aggression=this.aggression;let speed=this.speedAt(road.s+Math.max(2,c.u*(Math.abs(sample(this.line,road.s+25).curve)>.006?this.driver.tightPreview:this.driver.preview)));
  if(Math.abs(sample(this.line,road.s+35).curve)<.0015&&Math.abs(sample(this.line,road.s+100).curve)<.0015&&speed>65)speed+=c.drsOpen?6:3*(c.tow||0);
  const decision=racecraft(this,bot,road,traffic,speed,dt);let lane=decision.offset;speed=decision.speed;
  const pending=this.steward.state(bot.id).pending;if(pending){speed=Math.min(speed,Math.max(12,c.u-8));bot.intent='RETURNING ADVANTAGE';}
  const laneRate=decision.attack?4:2;
  if(decision.inBattle){bot.raceLane??=road.offset;bot.raceLane+=clamp(decision.lane-bot.raceLane,-dt*laneRate,dt*laneRate);bot.offset=bot.raceLane-(sample(this.line,road.s).offset||0);}else{bot.raceLane=null;bot.offset+=clamp(lane-bot.offset,-dt*2,dt*2);}
 const look=(decision.avoiding&&c.u<8?2:this.driver.lookBase)+Math.max(0,c.u)*this.driver.lookTime,target=sample(this.line,road.s+look);const corridor=sample(t,road.s+look);const launchBlend=bot.completed===0&&!decision.inBattle?clamp((bot.progress+25)/110,0,1):1,blend=launchBlend*launchBlend*(3-2*launchBlend);if(blend<1){const launch=bot.launchLane??0;target.x=(corridor.x+corridor.nx*launch)*(1-blend)+target.x*blend;target.z=(corridor.z+corridor.nz*launch)*(1-blend)+target.z*blend;}const base=(target.x-corridor.x)*corridor.nx+(target.z-corridor.z)*corridor.nz,limits=this.line.bounds[Math.floor(((road.s+look)%t.length)/t.ds)],extra=clamp(base+bot.offset,-limits[0],limits[1])-base;const aim=decision.inBattle?{x:corridor.x+corridor.nx*clamp(bot.raceLane,-limits[0],limits[1]),z:corridor.z+corridor.nz*clamp(bot.raceLane,-limits[0],limits[1])}:{x:target.x+target.nx*extra,z:target.z+target.nz*extra};let angle=Math.atan2(aim.x-c.x,aim.z-c.z)-c.yaw;angle=Math.atan2(Math.sin(angle),Math.cos(angle));const here=sample(this.line,road.s),cross=blend<1?0:(c.x-here.x)*here.nx+(c.z-here.z)*here.nz-bot.offset;const delta=this.driver.crossGain*cross/(1+Math.max(0,c.u)*.08)+Math.atan2(7.2*Math.sin(angle),look)*(1+this.driver.yawGain*c.u*c.u),wanted=clamp(-delta/(aiSteeringRange(c.u,this.line.vehicle||vehicles.formula,this.driver.steering)),-1,1);
  const vehicle=this.line.vehicle||vehicles.formula,plannedAccel=(this.speedAt(road.s+3)**2-this.speedAt(road.s-3)**2)/12,brake=clamp((c.u-speed-.4)*this.driver.brakeGain+(this.driver.brakeFeed||0)*Math.max(0,-plannedAccel-vehicle.drag*c.u*c.u/vehicle.mass)/(vehicle.brakes/vehicle.mass),0,1);
  // Supply the torque needed to hold speed instead of coasting whenever the target is reached.
  const engine=vehicle.power/Math.hypot(Math.max(0,c.u),vehicle.power/vehicle.drive),resistance=vehicle.drag*(c.aeroFlow?.drag??1)*c.u*c.u+105;
  const holdingThrottle=Math.pow(clamp(resistance/engine,0,1),1/1.15);
  return {analog:true,autoDrs:true,steer:wanted,throttle:brake>0?0:clamp(holdingThrottle+(speed-c.u)*this.driver.throttleGain+(this.speedAt(road.s+8)>speed+.3&&speed>c.u+.3?1:0),0,1),brake};
 }
 tick(dt,elapsed,player){this.player.car=player;const t=this.track,entries=[this.player,...this.bots];this.advance(this.player,this.surface(player),dt);
  this.aero.update(entries.filter(p=>p.finish===null).map(p=>({...p,road:this.surface(p.car),input:p===this.player?this.player.input:p.control})),dt,elapsed,true);
  for(const b of this.bots){if(b.finish!==null)continue;b.ghost=Math.max(0,b.ghost-dt);let road=this.surface(b.car);if(elapsed<b.reaction)continue;b.think-=dt;if(b.think<=0){b.control=this.controls(b,road,entries.filter(p=>p!==b&&p.finish===null),.05);b.think=.05;}step(b.car,b.control,road,'formula',dt,{assists:'none',gears:'auto',aiPerformance:this.performance,steeringRange:aiSteeringRange(b.car.u,this.line.vehicle||vehicles.formula,this.driver.steering),aeroFlow:b.car.aeroFlow});road=this.surface(b.car);
   if(road.hit){const h=road.hit;b.car.x+=h.nx*(1.05-h.d);b.car.z+=h.nz*(1.05-h.d);const v=bodyToWorld(b.car.yaw,b.car.u,b.car.v),dot=v.x*h.nx+v.z*h.nz;if(dot<0){v.x-=dot*h.nx;v.z-=dot*h.nz;b.car.u=(v.x*Math.sin(b.car.yaw)+v.z*Math.cos(b.car.yaw))*.85;b.car.v=(v.x*Math.cos(b.car.yaw)-v.z*Math.sin(b.car.yaw))*.5;}}
   const evidence=entries.filter(p=>p!==b).map(p=>({...p,s:this.surface(p.car).s}));this.steward.update(b.id,b.car,road,b.control,dt,elapsed,evidence);b.penalty=this.steward.state(b.id).penalty;
   const old=b.previousS;this.advance(b,road,dt);if(b.gate<2&&old<t.length*(b.gate+1)/3&&road.s>=t.length*(b.gate+1)/3)b.gate++;if(old>t.length*.75&&road.s<t.length*.25&&b.gate===2){b.completed++;b.gate=0;if(b.completed>=this.laps){this.steward.finish(b.id,b.car,elapsed,evidence,road);b.penalty=this.steward.state(b.id).penalty;b.finish=elapsed;b.car.u=b.car.v=b.car.r=0;}}
   b.stuck=(b.car.u<1||road.distance>road.width)?b.stuck+dt:0;if(b.stuck>8){const q=sample(t,road.s);if(entries.every(p=>p===b||Math.hypot(p.car.x-q.x,p.car.z-q.z)>10)){this.steward.recover(b.id,b.car,elapsed);this.aero.resetDriver(b.id);b.car=newCar(q);b.car.y=this.surface(b.car).y;b.stuck=0;b.ghost=3;b.recoveries++;}}
  }
  const live=entries.filter(p=>p.finish===null&&!p.ghost);for(let pass=0;pass<2;pass++)for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++)resolveCarContact(live[i].car,live[j].car,live[i].team,live[j].team);
 }
 advance(p,road,dt){let ds=road.s-p.previousS;if(ds<-this.track.length/2)ds+=this.track.length;if(ds>this.track.length/2)ds-=this.track.length;if(Math.abs(ds)<Math.max(3,Math.abs(p.car.u)*dt*3)&&road.distance<road.width+5)p.progress+=ds;p.previousS=road.s;}
 standings(){return [this.player,...this.bots].sort((a,b)=>a.finish!==null&&b.finish!==null?(a.finish+(a.penalty||0))-(b.finish+(b.penalty||0)):a.finish!==null?-1:b.finish!==null?1:b.progress-a.progress);}
}



