import {racingLine,plannedSpeed} from './ai-line.js';
import {newCar,step,vehicles,keyboardSteeringRange,bodyToWorld} from './physics.js';
import {sample,clamp} from './tracks.js';
import {resolveCarContact} from './car-contact.js';
const teams=['redbull','mercedes','audi'];
export function gridCar(track,index,surface){const s=track.length-16-index*9,p=sample(track,s),side=index%2?1:-1,c=newCar({...p,x:p.x+p.nx*1.8*side,z:p.z+p.nz*1.8*side});c.y=surface(c).y;return c;}
export class AIRace {
 constructor(track,surface,{count=2,difficulty='standard',laps=3,aggression=50,team='ferrari'}={}){this.aggression=clamp(Number(aggression)||0,0,100)/100;this.track=track;this.surface=surface;this.laps=laps;this.difficulty=difficulty;this.skill=clamp(Number.isFinite(Number(difficulty))?Number(difficulty):({club:0,standard:35,quick:55})[difficulty]??35,0,100);this.line=racingLine(track,surface);this.player={id:'you',name:'You',team,progress:-16,previousS:track.length-16,finish:null};this.bots=Array.from({length:clamp(count,0,3)},(_,i)=>({id:'ai-'+i,name:['Alex','Morgan','Casey'][i],team:teams[i],car:gridCar(track,i+1,surface),progress:-16-(i+1)*9,previousS:track.length-16-(i+1)*9,finish:null,gate:0,completed:0,offset:0,reaction:.25+i*.13,control:{steer:0,throttle:0,brake:0},think:0,stuck:0,recoveries:0,ghost:0}));}
 controls(bot,road,traffic,dt){const c=bot.car,t=this.track,aggression=this.aggression;let speed=plannedSpeed(this.line,road.s+Math.max(3,c.u*.18),this.skill);
  let lane=0;const nearby=traffic.map(p=>{const dx=p.car.x-c.x,dz=p.car.z-c.z;return {p,a:dx*Math.sin(c.yaw)+dz*Math.cos(c.yaw),l:dx*Math.cos(c.yaw)-dz*Math.sin(c.yaw)};}).filter(p=>p.a>-35&&p.a<35&&Math.abs(p.l)<5);
  const ahead=nearby.filter(p=>p.a>0&&Math.abs(p.l)<2.3).sort((a,b)=>a.a-b.a)[0];if(nearby.some(p=>Math.abs(p.a)<8&&Math.abs(p.l)>1.5))lane=bot.offset;
  const alongside=nearby.some(p=>Math.abs(p.a)<9);
  bot.defendTime=Math.max(0,(bot.defendTime||0)-dt);
  bot.defendCooldown=Math.max(0,(bot.defendCooldown||0)-dt);
  const challenger=nearby.find(p=>p.a<-10&&p.a>-(12+23*aggression)&&p.p.car.u>c.u+1);
  if(!ahead&&!alongside&&challenger&&aggression>.35&&!bot.defendCooldown){
   const bend=sample(t,road.s+70).curve,side=Math.abs(bend)>.001?Math.sign(bend):Math.sign(this.surface(challenger.p.car).offset)||1;
   bot.defendLane=side*(1+1.7*aggression)-sample(this.line,road.s).offset;
   bot.defendTime=3;bot.defendCooldown=8;
  }
  if(!ahead&&!alongside&&bot.defendTime>0)lane=bot.defendLane;
  if(ahead){const straight=Math.abs(sample(t,road.s+30).curve)<.003+.003*aggression&&Math.abs(sample(t,road.s+70).curve)<.003+.003*aggression;const passSide=bot.id==='ai-1'?-1:1;const free=traffic.every(p=>Math.hypot(p.car.x-c.x,p.car.z-c.z)>14-4*aggression||((p.car.x-c.x)*road.nx+(p.car.z-c.z)*road.nz)*passSide<.5);if(straight&&road.width>9&&free)lane=passSide*2.7;else speed=Math.min(speed,Math.max(0,ahead.p.car.u+(ahead.a-(12-5*aggression))*.6));if(ahead.a<7)speed=Math.min(speed,Math.max(0,ahead.p.car.u-4));}
  if(alongside)lane=bot.offset;
  bot.offset+=clamp(lane-bot.offset,-dt*2,dt*2);const look=7+Math.max(0,c.u)*.3,target=sample(this.line,road.s+look);const corridor=sample(t,road.s+look);if(bot.progress<30){target.x=corridor.x;target.z=corridor.z;target.nx=corridor.nx;target.nz=corridor.nz;}const base=(target.x-corridor.x)*corridor.nx+(target.z-corridor.z)*corridor.nz,limits=this.line.bounds[Math.floor(((road.s+look)%t.length)/t.ds)],extra=clamp(base+bot.offset,-limits[0],limits[1])-base;let angle=Math.atan2(target.x+target.nx*extra-c.x,target.z+target.nz*extra-c.z)-c.yaw;angle=Math.atan2(Math.sin(angle),Math.cos(angle));const here=sample(this.line,road.s),cross=bot.progress<60?0:(c.x-here.x)*here.nx+(c.z-here.z)*here.nz-bot.offset;const delta=.025*cross/(1+Math.max(0,c.u)*.08)+Math.atan2(7.2*Math.sin(angle),look)*(1+.00005*c.u*c.u),wanted=clamp(-delta/keyboardSteeringRange(c.u,vehicles.formula),-1,1);
  return {analog:true,steer:wanted,throttle:clamp((speed-c.u)*.8+(plannedSpeed(this.line,road.s+8,this.skill)>speed+.3&&speed>c.u+.3?1:0),0,1),brake:clamp((c.u-speed-.4)*.3,0,1)};
 }
 tick(dt,elapsed,player){this.player.car=player;const t=this.track,entries=[this.player,...this.bots];this.advance(this.player,this.surface(player),dt);
  for(const b of this.bots){if(b.finish!==null)continue;b.ghost=Math.max(0,b.ghost-dt);let road=this.surface(b.car);if(elapsed<b.reaction)continue;b.think-=dt;if(b.think<=0){b.control=this.controls(b,road,entries.filter(p=>p!==b&&p.finish===null),.05);b.think=.05;}step(b.car,b.control,road,'formula',dt,{assists:'none',gears:'auto'});road=this.surface(b.car);
   if(road.hit){const h=road.hit;b.car.x+=h.nx*(1.05-h.d);b.car.z+=h.nz*(1.05-h.d);const v=bodyToWorld(b.car.yaw,b.car.u,b.car.v),dot=v.x*h.nx+v.z*h.nz;if(dot<0){v.x-=dot*h.nx;v.z-=dot*h.nz;b.car.u=(v.x*Math.sin(b.car.yaw)+v.z*Math.cos(b.car.yaw))*.85;b.car.v=(v.x*Math.cos(b.car.yaw)-v.z*Math.sin(b.car.yaw))*.5;}}
   const old=b.previousS;this.advance(b,road,dt);if(b.gate<2&&old<t.length*(b.gate+1)/3&&road.s>=t.length*(b.gate+1)/3)b.gate++;if(old>t.length*.75&&road.s<t.length*.25&&b.gate===2){b.completed++;b.gate=0;if(b.completed>=this.laps){b.finish=elapsed;b.car.u=b.car.v=b.car.r=0;}}
   b.stuck=(b.car.u<1||road.distance>road.width)?b.stuck+dt:0;if(b.stuck>8){const q=sample(t,road.s);if(entries.every(p=>p===b||Math.hypot(p.car.x-q.x,p.car.z-q.z)>10)){b.car=newCar(q);b.car.y=this.surface(b.car).y;b.stuck=0;b.ghost=3;b.recoveries++;}}
  }
  const live=entries.filter(p=>p.finish===null&&!p.ghost);for(let pass=0;pass<2;pass++)for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++)resolveCarContact(live[i].car,live[j].car,live[i].team,live[j].team);
 }
 advance(p,road,dt){let ds=road.s-p.previousS;if(ds<-this.track.length/2)ds+=this.track.length;if(ds>this.track.length/2)ds-=this.track.length;if(Math.abs(ds)<Math.max(3,Math.abs(p.car.u)*dt*3)&&road.distance<road.width+5)p.progress+=ds;p.previousS=road.s;}
 standings(){return [this.player,...this.bots].sort((a,b)=>a.finish!==null&&b.finish!==null?a.finish-b.finish:a.finish!==null?-1:b.finish!==null?1:b.progress-a.progress);}
}
