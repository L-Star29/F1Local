import {racingLine,plannedSpeed} from './ai-line.js';
import {newCar,step,vehicles,keyboardSteeringRange,bodyToWorld} from './physics.js';
import {sample,clamp} from '../../tracks.js';
import {resolveCarContact} from '../../car-contact.js';
const teams=['redbull','mercedes','audi'];
export function gridCar(track,index,surface){const s=track.length-16-index*9,p=sample(track,s),side=index%2?1:-1,c=newCar({...p,x:p.x+p.nx*1.8*side,z:p.z+p.nz*1.8*side});c.y=surface(c).y;return c;}
export class AIRace {
 constructor(track,surface,{count=2,difficulty='standard',laps=3,aggression=50,team='ferrari'}={}){this.passDistance=24+32*clamp(aggression,0,100)/100;this.track=track;this.surface=surface;this.laps=laps;this.difficulty=difficulty;this.enhancement=clamp((Number(difficulty)-100)/10||0,0,1);this.skill=clamp(Number.isFinite(Number(difficulty))?Number(difficulty):({club:0,standard:35,quick:55})[difficulty]??35,0,100);this.line=racingLine(track,surface);
  this.profileSkill=this.skill;
  if(this.enhancement>0 && this.line.profiles.has(110)){
   this.profileSkill=100+10*this.enhancement;
   if(!this.line.profiles.has(this.profileSkill)){
    const standard=this.line.profiles.get(100), enhanced=this.line.profiles.get(110);
    const speeds=standard.speeds.map((speed,i)=>speed+(enhanced.speeds[i]-speed)*this.enhancement);
    this.line.profiles.set(this.profileSkill,{speeds});
   }
  }
  this.player={id:'you',name:'You',team,progress:-16,previousS:track.length-16,finish:null};this.bots=Array.from({length:clamp(count,0,3)},(_,i)=>({id:'ai-'+i,name:['Alex','Morgan','Casey'][i],team:teams[i],car:gridCar(track,i+1,surface),progress:-16-(i+1)*9,previousS:track.length-16-(i+1)*9,finish:null,gate:0,completed:0,offset:0,reaction:.25+i*.13,control:{steer:0,throttle:0,brake:0},think:0,stuck:0,recoveries:0,ghost:0}));}
 controls(bot,road,traffic,dt){const c=bot.car,t=this.track;const expertise=(this.skill/100)**3;const planned=plannedSpeed(this.line,road.s+Math.max(3,c.u*(.18-.04*expertise)),this.profileSkill);
  const slowCorner=clamp((60-planned)/30,0,1);
  const expertScale=1.1236*(1.025+.015*slowCorner);
  const speed=planned*(1+(expertScale-1)*expertise)*(1+.055*this.enhancement);
  let lane=0,overlap=null;
  const player=traffic.find(entry=>entry.id==='you'&&entry.finish==null&&!entry.ghost);
  if(player){
   const r=this.surface(player.car);
   const distance=(r.s-road.s+t.length*1.5)%t.length-t.length*.5;
   const separation=road.offset-r.offset;
   if(Math.abs(distance)<7 && Math.abs(separation)>1 && Math.abs(separation)<6 && Math.abs((player.car.y||0)-(c.y||0))<2){
    overlap={offset:r.offset,side:Math.sign(separation)};
   }
   const grid=bot.progress<30;
   const base=grid?0:sample(this.line,r.s).offset;
   const clearance=3.2;
   if(distance>=-5 && distance<this.passDistance && Math.abs((player.car.y||0)-(c.y||0))<2 &&
      (Math.abs(r.offset-base)<clearance || (bot.passSide&&Math.abs(r.offset-road.offset)<6))){
    const [left,right]=this.line.bounds[Math.floor(r.s/t.ds)%t.n];
    const preferred=overlap?.side||bot.passSide||Math.sign(road.offset-r.offset)||Math.sign(base-r.offset)||1;
    for(const side of overlap?[preferred]:[preferred,-preferred]){
     const destination=r.offset+side*clearance;
     if(destination < -left || destination > right)continue;
     bot.passSide=side;
     lane=destination-base;
     break;
    }
   }else bot.passSide=0;
  }else bot.passSide=0;
  bot.offset+=clamp(lane-bot.offset,-dt*2,dt*2);const look=7-2*expertise+Math.max(0,c.u)*(.3-.03*expertise),target=sample(this.line,road.s+look);const corridor=sample(t,road.s+look);if(bot.progress<30){target.x=corridor.x;target.z=corridor.z;target.nx=corridor.nx;target.nz=corridor.nz;}const base=(target.x-corridor.x)*corridor.nx+(target.z-corridor.z)*corridor.nz,limits=this.line.bounds[Math.floor(((road.s+look)%t.length)/t.ds)];
  let aimOffset=base+bot.offset;
  if(overlap){
   const edge=overlap.offset+overlap.side*3.2;
   aimOffset=overlap.side>0?Math.max(aimOffset,edge):Math.min(aimOffset,edge);
  }
  const extra=clamp(aimOffset,-limits[0],limits[1])-base;let angle=Math.atan2(target.x+target.nx*extra-c.x,target.z+target.nz*extra-c.z)-c.yaw;angle=Math.atan2(Math.sin(angle),Math.cos(angle));const here=sample(this.line,road.s),cross=bot.progress<60?0:(c.x-here.x)*here.nx+(c.z-here.z)*here.nz-bot.offset;const delta=.025*cross/(1+Math.max(0,c.u)*.08)+Math.atan2(7.2*Math.sin(angle),look)*(1+(.00005+.000025*expertise)*c.u*c.u),wanted=clamp(-delta/keyboardSteeringRange(c.u,vehicles.formula),-1,1);
  const vehicle=vehicles.formula;
  const drive=vehicle.power/Math.hypot(c.u,vehicle.power/vehicle.drive);
  const holdingThrottle=Math.pow(clamp((vehicle.drag*c.u*c.u+105)/drive,0,1),1/1.15);
  return {analog:true,steer:wanted,throttle:clamp(holdingThrottle+(speed-c.u)*.8+(plannedSpeed(this.line,road.s+8,this.profileSkill)>speed+.3&&speed>c.u+.3?1:0),0,1),brake:clamp((c.u-speed-.4)*(.3-.12*expertise),0,1)};
 }
 tick(dt,elapsed,player){this.player.car=player;const t=this.track,entries=[this.player,...this.bots];this.advance(this.player,this.surface(player),dt);
  for(const b of this.bots){if(b.finish!==null)continue;b.ghost=Math.max(0,b.ghost-dt);let road=this.surface(b.car);if(elapsed<b.reaction)continue;b.think-=dt;if(b.think<=0){b.control=this.controls(b,road,entries.filter(p=>p!==b&&p.finish===null),.05);b.think=.05;}step(b.car,b.control,road,'formula',dt,{assists:'none',gears:'auto',enhancement:this.enhancement,aeroFlow:b.car.aeroFlow});road=this.surface(b.car);
   if(road.hit){const h=road.hit;b.car.x+=h.nx*(1.05-h.d);b.car.z+=h.nz*(1.05-h.d);const v=bodyToWorld(b.car.yaw,b.car.u,b.car.v),dot=v.x*h.nx+v.z*h.nz;if(dot<0){v.x-=dot*h.nx;v.z-=dot*h.nz;b.car.u=(v.x*Math.sin(b.car.yaw)+v.z*Math.cos(b.car.yaw))*.85;b.car.v=(v.x*Math.cos(b.car.yaw)-v.z*Math.sin(b.car.yaw))*.5;}}
   const old=b.previousS;this.advance(b,road,dt);if(b.gate<2&&old<t.length*(b.gate+1)/3&&road.s>=t.length*(b.gate+1)/3)b.gate++;if(old>t.length*.75&&road.s<t.length*.25&&b.gate===2){b.completed++;b.gate=0;if(b.completed>=this.laps){b.finish=elapsed;b.car.u=b.car.v=b.car.r=0;}}
   b.stuck=(b.car.u<1||road.distance>road.width)?b.stuck+dt:0;if(b.stuck>8){const q=sample(t,road.s);if(entries.every(p=>p===b||Math.hypot(p.car.x-q.x,p.car.z-q.z)>10)){b.car=newCar(q);b.car.y=this.surface(b.car).y;b.stuck=0;b.ghost=3;b.recoveries++;}}
  }
  const live=entries.filter(p=>p.finish===null&&!p.ghost);for(let pass=0;pass<2;pass++)for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++)resolveCarContact(live[i].car,live[j].car,live[i].team,live[j].team);
 }
 advance(p,road,dt){let ds=road.s-p.previousS;if(ds<-this.track.length/2)ds+=this.track.length;if(ds>this.track.length/2)ds-=this.track.length;if(Math.abs(ds)<Math.max(3,Math.abs(p.car.u)*dt*3)&&road.distance<road.width+5)p.progress+=ds;p.previousS=road.s;}
 standings(){return [this.player,...this.bots].sort((a,b)=>a.finish!==null&&b.finish!==null?(a.finish+(a.penalty||0))-(b.finish+(b.penalty||0)):a.finish!==null?-1:b.finish!==null?1:b.progress-a.progress);}
}
