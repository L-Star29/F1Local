import fs from 'node:fs';
import {AIRace,gridCar} from './ai-race.js';
import {installRacingLine} from './ai-line.js';
import {loadRaceWorld} from './race-world.mjs';
import {sample} from './tracks.js';
const w=loadRaceWorld();installRacingLine(w.track,JSON.parse(fs.readFileSync('data/gb-1948-ai-plan.json')));
const race=new AIRace(w.track,w.surface,{count:1,difficulty:100,laps:3}),player=gridCar(w.track,0,w.surface);race.player.finish=999;
const telemetry=Array.from({length:w.track.n},()=>[]),laps=[];let last=0,completed=0;
for(let i=0;i<120*350&&race.bots[0].finish===null;i++){
 race.tick(1/120,i/120,player);const b=race.bots[0],c=b.car,q=w.surface(c),p=sample(race.line,q.s);
 if(b.completed===1)telemetry[Math.floor(q.s/w.track.ds)%w.track.n].push({speed:c.u*3.6,brake:c.brake,throttle:c.throttle,tc:Number(c.tc),abs:Number(c.abs),error:Math.abs((c.x-p.x)*p.nx+(c.z-p.z)*p.nz),off:Number(q.wheelsOff===4)});
 if(b.completed>completed){laps.push(i/120-last);last=i/120;completed=b.completed;}
}
const groups=[];let current;
for(let i=0;i<race.line.n;i++){
 const p=race.line.pts[i];if(Math.abs(p.curve)<.003)continue;
 if(!current||i-current.end>12||Math.sign(p.curve)!==current.sign){current={start:i,end:i,sign:Math.sign(p.curve)};groups.push(current);}else current.end=i;
}
const mean=(rows,key)=>rows.reduce((sum,p)=>sum+p[key],0)/Math.max(1,rows.length);
const corners=groups.map((g,index)=>{
 const points=race.line.pts.slice(g.start,g.end+1),rows=telemetry.slice(g.start,g.end+1).flat();let straight=0;
 for(let i=g.end+1;i<g.end+501;i++){if(Math.abs(race.line.pts[i%race.line.n].curve)>.002)break;straight+=w.track.ds;}
 return {section:index+1,startMetres:g.start*w.track.ds,endMetres:g.end*w.track.ds,direction:g.sign>0?'right':'left',minimumLineRadiusMetres:1/Math.max(...points.map(p=>Math.abs(p.curve))),minimumRoadWidthMetres:Math.min(...points.map(p=>p.width)),maximumRoadWidthMetres:Math.max(...points.map(p=>p.width)),elevationChangeMetres:points.at(-1).y-points[0].y,followingStraightMetres:straight,entryKmh:rows[0]?.speed,minimumKmh:Math.min(...rows.map(p=>p.speed)),exitKmh:rows.at(-1)?.speed,averageThrottle:mean(rows,'throttle'),averageBrake:mean(rows,'brake'),tcFraction:mean(rows,'tc'),absFraction:mean(rows,'abs'),maximumLineErrorMetres:Math.max(...rows.map(p=>p.error)),fourWheelOffSamples:rows.reduce((sum,p)=>sum+p.off,0)};
});
fs.writeFileSync('analysis/ai-corner-audit.json',JSON.stringify({mode:'equal',skill:100,laps,note:'Curvature-derived sections, not official corner numbering. Radius/width/elevation come from the imported route. No banking/suspension model is inferred.',corners},null,2));
console.log({laps,sections:corners.length,report:'analysis/ai-corner-audit.json'});
