import fs from 'node:fs';
import * as old from './analysis/physics-build05.js';
import * as current from './physics.js';
const dt=1/120,road={y:0,width:14,offset:0},settings={assists:'none',gears:'auto'};
export function measure(api){const fresh=u=>({...api.newCar({x:0,y:0,z:0,tx:0,tz:1}),u});const tick=(c,steer,throttle,brake)=>api.step(c,{steer,throttle,brake},road,'formula',dt,settings);let output={transitions:[],acceleration:{},braking:{},turning:[]};
for(let speed of [40,60,80,90])for(let steer of [.5,1])for(let kind of ['coast','brake','release']){let c=fresh(speed),maxBeta=0,maxR=0,trace=[];for(let i=0;i<480;i++){let t=i*dt;tick(c,kind==='release'&&t>1?0:steer,t<.5?1:0,kind==='brake'&&t>.5?1:0);if(c.u>12)maxBeta=Math.max(maxBeta,Math.abs(Math.atan2(c.v,c.u))*180/Math.PI);maxR=Math.max(maxR,Math.abs(c.r));if(i%12===0)trace.push({t,u:c.u,steer:c.steer,beta:Math.atan2(c.v,c.u),r:c.r});}output.transitions.push({speed:speed*3.6,steer,kind,maxBeta,maxR,finalSpeed:c.u*3.6});}
let c=fresh(0);for(let i=0;i<2400;i++){tick(c,0,1,0);for(let target of [100,200,300])if(c.u*3.6>=target&&!output.acceleration[target])output.acceleration[target]=(i+1)*dt;}
for(let speed of [100,200,300]){let c=fresh(speed/3.6),d=0,t=0;while(c.u>.1&&t<10){tick(c,0,0,1);d+=c.u*dt;t+=dt;}output.braking[speed]={seconds:t,metres:d};}
for(let speed of [40,80,120,200,280]){let c=fresh(speed/3.6);for(let i=0;i<120;i++)tick(c,1,0,0);output.turning.push({speed,headingDegrees:c.yaw*180/Math.PI,slipDegrees:Math.atan2(c.v,c.u)*180/Math.PI,g:c.ay/9.81});}
return output;}
if(process.argv[1]?.endsWith('transition-analysis.mjs')){
const before=measure(old),after=measure(current);fs.writeFileSync('analysis/handling-comparison.json',JSON.stringify({before,after},null,2));for(let [name,r] of Object.entries({before,after}))console.log(name,JSON.stringify({worstSlip:Math.max(...r.transitions.map(t=>t.maxBeta)),bad:r.transitions.filter(t=>t.maxBeta>12),acceleration:r.acceleration,braking:r.braking,turning:r.turning},null,2));

}
