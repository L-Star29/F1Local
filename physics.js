import {clamp} from './tracks.js';

// Original tunable 2025-style model; these are not EA/Pirelli coefficients.
export const vehicles={
 formula:{mass:800,inertia:1320,a:1.94,b:1.66,track:1.62,cg:.30,mu:1.72,loadSensitivity:.10,
  aero:2.6,aeroFront:.45,drag:.91,power:735000,drive:26000,brakes:32000,bias:.57,
  peak:.075,slide:.73,rollFront:.55,frontDrive:0,steerLock:.57,
  gears:[0,14.7,11.6,9.5,8.0,6.95,6.15,5.55,5.0],redline:13000,idle:3800},
 rally:{mass:1250,inertia:1850,a:1.20,b:1.40,track:1.55,cg:.52,mu:1.10,loadSensitivity:.08,
  aero:.22,aeroFront:.48,drag:.65,power:235000,drive:11000,brakes:18500,bias:.61,
  peak:.14,slide:.88,rollFront:.53,frontDrive:.43,steerLock:.62,
  gears:[0,14,10,7.8,6.3,5.3,4.5],redline:7600,idle:1800}
};

// Body axes: u=forward, v=LEFT, r/yaw=LEFT positive (Three.js +Y).
// With nose along +Z, the driver's right is -X. Input +1 means RIGHT.
export function bodyToWorld(yaw,u,v=0){return {x:Math.sin(yaw)*u+Math.cos(yaw)*v,z:Math.cos(yaw)*u-Math.sin(yaw)*v};}
export function newCar(p){return {x:p.x,z:p.z,y:p.y,yaw:Math.atan2(p.tx,p.tz),u:0,v:0,r:0,
 steer:0,steerInput:0,throttle:0,brake:0,gear:1,rpm:3800,temp:85,wear:0,
 ax:0,ay:0,loadAx:0,loadAy:0,slip:0,frontSlip:0,rearSlip:0,shift:0,distance:0,
 locked:false,wheelspin:false,off:false,tc:false,abs:false,tyres:[]};}
const approach=(value,target,rate,dt)=>value+(target-value)*(1-Math.exp(-rate*dt));
const smooth=(a,b,x)=>{let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function tyreCapacity(load,p,grip=1){return p.mu*grip*load*Math.pow(Math.max(load,100)/2000,-p.loadSensitivity);}
export function lateralForce(alpha,capacity,peak,slide){
 let t=Math.abs(alpha)/peak;
 let f=t<=1?Math.sin(t*Math.PI/2):slide+(1-slide)*Math.exp(-(t-1)*.7);
 return Math.sign(alpha)*capacity*f;
}
export function steeringLimit(speed,p,assisted=true){
 const load=(p.mass*9.81+p.aero*speed*speed)/4;
 const accel=4*tyreCapacity(load,p)/p.mass;
 return Math.min(p.steerLock,Math.atan((p.a+p.b)*accel*(assisted?.86:1.05)/Math.max(speed*speed,1))+p.peak*(assisted?.025:.20));
}
// Fixed input gearing, not a grip-seeking steering aid. It never reads the
// track, slip, yaw or tyre forces and never countersteers for the player.
export function keyboardSteeringRange(speed,p){return Math.min(p.steerLock,p===vehicles.formula?.032+.66/(1+(speed/11)**2):.012+.55/(1+(speed/10.5)**2));}
// A broad, monotonic road-tyre plateau avoids falling off a narrow artificial
// peak on lift-off. Rally retains the separate sliding-force curve.
export const roadLateralForce=(alpha,capacity,peak)=>capacity*Math.tanh(alpha*1.6/peak);
const ramp=(v,target,rate,dt)=>v+clamp(target-v,-rate*dt,rate*dt);
export function step(c,input,road,mode,dt,settings={}){
 const p=vehicles[mode],speed=Math.max(0,c.u),assist=settings.assists!=='raw'&&settings.assists!=='none',wb=p.a+p.b;
 const direct=settings.assists==='none',roadFormula=direct&&mode==='formula';
 const tyreForce=roadFormula?roadLateralForce:lateralForce,brakeBias=roadFormula?.62:p.bias;
 if(direct){
 c.throttle=input.analog?approach(c.throttle,clamp(input.throttle,0,1),30,dt):ramp(c.throttle,clamp(input.throttle,0,1),input.throttle>c.throttle?(roadFormula?3.5:2.6):(roadFormula?12:7),dt);
 c.brake=input.analog?approach(c.brake,clamp(input.brake,0,1),30,dt):ramp(c.brake,clamp(input.brake,0,1),input.brake>c.brake?(roadFormula?4.5:5):(roadFormula?6:10),dt);
 // Give a held key time to build steering load. A fast yaw impulse followed
 // by saturated front tyres feels sharp initially but then runs wide.
 const demand=clamp(input.steer,-1,1);c.steerInput=input.analog?approach(c.steerInput,demand,30,dt):ramp(c.steerInput,demand,demand===0?(roadFormula?10:5.5):demand*c.steerInput<0?(roadFormula?8:7):(roadFormula?3.6:3.8),dt);
 c.steer=approach(c.steer,-c.steerInput*keyboardSteeringRange(speed,p),30,dt);
 }else{
 c.throttle=approach(c.throttle,clamp(input.throttle,0,1),input.analog?30:11,dt);
 c.brake=approach(c.brake,clamp(input.brake,0,1),input.brake>c.brake?20:32,dt);
 const demand=clamp(input.steer,-1,1),reversing=demand*c.steerInput<0;
 c.steerInput=approach(c.steerInput,demand,input.analog?24:demand===0?14:reversing?12:8,dt);
 c.steer=approach(c.steer,-c.steerInput*steeringLimit(speed,p,assist),28,dt);
 }
 if(direct){
  c.reverseHold=input.brake>.5&&c.u<.3?(c.reverseHold||0)+dt:0;
  if(c.u<-.02||c.reverseHold>.35){
   const target=input.throttle>.05?0:-8*c.brake;
   c.u=ramp(c.u,target,input.throttle>.05?12:c.brake>.05?4:1.2,dt);
   c.r=c.u*Math.tan(c.steer)/wb;c.v=c.r*p.b;c.yaw+=c.r*dt;
   const v=bodyToWorld(c.yaw,c.u,c.v);c.x+=v.x*dt;c.z+=v.z*dt;c.y=road.y;c.ax=0;c.ay=0;c.distance+=c.u*dt;c.rpm=p.idle+Math.abs(c.u)*180;c.tyres=[];c.locked=false;c.abs=false;c.off=false;
   return;
  }
 }
 const off=road.surfaceOff??(Math.abs(road.offset)>road.width/2+.2);
 const thermal=clamp(1-Math.max(0,c.temp-105)*.003-Math.max(0,65-c.temp)*.003,.75,1);
 const grip=(direct?1:off?(mode==='formula'?.42:.70):1)*thermal*(1-c.wear*.2);
 c.wheelGrips??=[1,1,1,1];for(let i=0;i<4;i++)c.wheelGrips[i]=approach(c.wheelGrips[i],direct?(road.wheelGrip?.[i]??(off?.88:1)):1,8,dt);
 const beta=Math.atan2(c.v,Math.max(speed,2));
 const aero=p.aero*speed*speed*clamp(1-Math.abs(beta)*1.2,.60,1);
 c.loadAx=approach(c.loadAx,c.ax,18,dt);c.loadAy=approach(c.loadAy,c.ay,16,dt);
 const transfer=clamp(c.loadAx*p.mass*p.cg/wb,-p.mass*9.81*.3,p.mass*9.81*.3);
 const frontLoad=p.mass*9.81*p.b/wb+aero*p.aeroFront-transfer;
 const rearLoad=p.mass*9.81*p.a/wb+aero*(1-p.aeroFront)+transfer;
 const lateralTransfer=c.loadAy*p.mass*p.cg/p.track;
 const manual=settings.gears==='manual';
 let engine,engineBrake;
 if(manual){
  c.shift=Math.max(0,c.shift-dt);
  c.rpm=clamp(speed/.34*p.gears[c.gear]*60/(2*Math.PI),p.idle,p.redline+400);
  const torqueForce=p.drive*p.gears[c.gear]/p.gears[1];
  engine=Math.min(torqueForce,p.power/Math.max(speed,10))*Math.pow(c.throttle,1.15)*(c.shift>0?.3:1);
  if(c.rpm>=p.redline)engine*=.2;
  engineBrake=(1-c.throttle)*(mode==='formula'?380:230)*p.gears[c.gear]/p.gears[1]*Math.tanh(speed/3);
 }else{
  // Automatic is deliberately gearless: a smooth force/power envelope.
  // No ratios, shifts, rev-limiter cuts, or gear-dependent engine braking.
  c.gear=1;c.shift=0;
  engine=p.power/Math.hypot(speed,p.power/p.drive)*Math.pow(c.throttle,1.15);
  engineBrake=(1-c.throttle)*(mode==='formula'?180:140)*Math.tanh(speed/3);
  // Continuous audio pitch only; this value does not affect propulsion.
  c.rpm=p.idle+(p.redline-p.idle)*(1-Math.exp(-speed/48));
 }
 let fx=0,fy=0,moment=0,frontSlip=0,rearSlip=0;
 c.locked=false;c.wheelspin=false;c.tc=false;c.abs=false;c.tyres=[];
 // TC reduces engine torque equally at driven wheels. Independently clipping
 // each wheel's drive force would accidentally introduce torque vectoring.
 let tcScale=1;
 if((assist||direct)&&engine>0)for(let axle=0;axle<2;axle++)for(let side of [-1,1]){
  const front=axle===0,share=front?p.frontDrive:1-p.frontDrive;if(!share)continue;
  const axleLoad=front?frontLoad:rearLoad,long=front?p.a:-p.b,lat=side*p.track/2;
  const transferY=clamp(lateralTransfer*(front?p.rollFront:1-p.rollFront),-axleLoad*.45,axleLoad*.45);
  const cap=tyreCapacity(Math.max(80,axleLoad/2-side*transferY),p,grip*c.wheelGrips[axle*2+(side===1?1:0)]*(roadFormula?(front?.98:1.10):1));
  const alpha=(front?c.steer:0)-Math.atan2(c.v+c.r*long,Math.max(Math.abs(c.u-c.r*lat),3));
  const lateral=tyreForce(alpha,cap,p.peak*(roadFormula?(front?1.02:.85):(front?1.02:.96)),p.slide);
  tcScale=Math.min(tcScale,Math.sqrt(Math.max(0,cap*cap-lateral*lateral))*.96/(engine*share/2));
 }
 c.tc=tcScale<.98;engine*=tcScale;c.driveForce=engine;
 for(let axle=0;axle<2;axle++)for(let side of [-1,1]){
  const front=axle===0,long=front?p.a:-p.b,lat=side*p.track/2;
  const axleLoad=front?frontLoad:rearLoad,rollShare=front?p.rollFront:1-p.rollFront;
  const transferY=clamp(lateralTransfer*rollShare,-axleLoad*.45,axleLoad*.45);
  const load=Math.max(80,axleLoad/2-side*transferY),cap=tyreCapacity(load,p,grip*c.wheelGrips[axle*2+(side===1?1:0)]*(roadFormula?(front?.98:1.10):1));
  let delta=front?c.steer:0;
  if(front&&Math.abs(delta)>.001){const radius=wb/Math.tan(delta);delta=Math.atan(wb/(radius-lat*(1-smooth(8,25,speed))));}
  const wheelU=c.u-c.r*lat,wheelV=c.v+c.r*long;
  const alpha=delta-Math.atan2(wheelV,Math.max(Math.abs(wheelU),3));
  let lateral=tyreForce(alpha,cap,p.peak*(roadFormula?(front?1.02:.85):(front?1.02:.96)),p.slide);
  const drive=engine*(front?p.frontDrive:1-p.frontDrive)/2;
  let brake=c.brake*p.brakes*(front?brakeBias:1-brakeBias)/2;
  // ABS only reduces requested pressure; it never applies brakes itself.
  // Preserve lateral force within the same friction circle during corner entry.
  if(roadFormula&&settings.abs!==false&&brake>0){
   const reserve=Math.min(Math.abs(lateral),cap*.90);
   const available=Math.max(0,Math.sqrt(cap*cap-reserve*reserve)*.98-(!front?engineBrake/2:0));
   if(brake>available){brake=available;c.abs=true;}
  }
  const handbrake=!front&&mode==='rally'&&input.handbrake;
  if(handbrake)brake+=cap*1.5;
  let tractive=drive,remaining=Math.sqrt(Math.max(0,cap*cap-lateral*lateral));
  if(assist&&drive>remaining*.97){tractive=remaining*.97;c.tc=true;}
  const locked=(!assist||handbrake)&&brake>cap&&speed>2&&!direct;
  if(assist&&!handbrake&&brake>cap*.94){brake=cap*.94;c.abs=true;}
  let longitudinal=tractive-brake-(!front?engineBrake/2:0);
  const spinning=!assist&&drive>remaining+cap*.08&&speed>2;
  if(direct&&!handbrake){
   // Engine torque already respects the friction ellipse through TC. Keep
   // sub-limit longitudinal forces linear instead of attenuating them twice.
   // Combined slip saturates continuously after optional ABS modulation,
   // no automatic brake application, and no discontinuous 'spinning tyre' grip penalty.
   longitudinal=roadFormula?clamp(longitudinal,-cap,cap):cap*Math.tanh(longitudinal/cap);
   const total=Math.hypot(longitudinal,lateral),scale=Math.min(1,cap/Math.max(total,1));
   longitudinal*=scale;lateral*=scale;
  }else if(locked){longitudinal=-cap*.78;lateral*=.12;}
  else{
   longitudinal=clamp(longitudinal,-cap,cap);
   const lateralAvailable=Math.sqrt(Math.max(0,cap*cap-longitudinal*longitudinal));
   lateral=clamp(lateral,-lateralAvailable,lateralAvailable);
   if(spinning)lateral*=.82;
  }
  const bodyFx=longitudinal*Math.cos(delta)-lateral*Math.sin(delta);
  const bodyFy=lateral*Math.cos(delta)+longitudinal*Math.sin(delta);
  fx+=bodyFx;fy+=bodyFy;moment+=long*bodyFy-lat*bodyFx;
  c.locked||=locked;c.wheelspin||=spinning;
  if(front)frontSlip=Math.max(frontSlip,Math.abs(alpha));else rearSlip=Math.max(rearSlip,Math.abs(alpha));
  c.tyres.push({load,capacity:cap,fx:longitudinal,fy:lateral,slip:alpha});
 }
 const resistance=p.drag*speed*speed+(direct?105+c.wheelGrips.reduce((a,g)=>a+(1-g)*150,0):off?650:105)*Math.tanh(speed/2);
 fx-=resistance+p.mass*9.81*(road.slope||0);
 c.ax=fx/p.mass;c.ay=fy/p.mass;
 const dynamic=smooth(2,7,speed);
 const kinematicR=speed*Math.tan(c.steer)/wb,kinematicV=kinematicR*p.b;
 const dynamicV=c.v+(c.ay-c.u*c.r)*dt,dynamicR=c.r+moment/p.inertia*dt;
 c.u=Math.max(0,c.u+(c.ax+c.v*c.r*dynamic)*dt);
 c.v=dynamic*dynamicV+(1-dynamic)*approach(c.v,kinematicV,20,dt);
 c.r=dynamic*dynamicR+(1-dynamic)*approach(c.r,kinematicR,20,dt);
 if(c.u<.08&&c.throttle<.01){c.u=0;c.v=0;c.r=0;}
 c.yaw+=c.r*dt;const velocity=bodyToWorld(c.yaw,c.u,c.v);
 c.x+=velocity.x*dt;c.z+=velocity.z*dt;c.y=road.y;
 c.frontSlip=frontSlip;c.rearSlip=rearSlip;c.slip=Math.max(frontSlip,rearSlip);
 const excessSlip=Math.max(0,c.slip-p.peak*.65);
 const heat=83+Math.min(55,excessSlip*speed*9)+c.brake*8;
 c.temp=approach(c.temp,heat,.035,dt);
 c.wear=clamp(c.wear+(speed*.00000012+excessSlip*speed*.0000015)*dt,0,1);
 c.distance+=speed*dt;c.off=off;
}

