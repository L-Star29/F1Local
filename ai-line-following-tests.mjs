import fs from 'node:fs';
import assert from 'node:assert/strict';
import {AIRace,gridCar} from './ai-race.js';
import {loadRaceWorld} from './race-world.mjs';
import {sample} from './tracks.js';
const w=loadRaceWorld(),r=new AIRace(w.track,w.surface,{count:1,difficulty:100,laps:1}),player=gridCar(w.track,0,w.surface);
player.x+=100;r.player.finish=999;
const rows=[];let total=0,max=0;
for(let i=0;i<24000&&r.bots[0].finish===null;i++){
 r.tick(1/120,i/120,player);
 const b=r.bots[0];
 if(i%12||b.progress<60)continue;
 const c=b.car,road=w.surface(c),q=sample(r.line,road.s),error=Math.abs((c.x-q.x)*q.nx+(c.z-q.z)*q.nz);
 total+=error;max=Math.max(max,error);
 rows.push([road.s,c.x,c.z,q.x,q.z,c.u*3.6,error,road.wheelsOff]);
}
assert.ok(r.bots[0].finish!==null);
const mean=total/rows.length;
assert.ok(mean<1,'mean lateral tracking error must stay below one metre');
fs.writeFileSync('analysis/ai-line-following.csv','distance,actual_x,actual_z,planned_x,planned_z,speed_kmh,lateral_error,wheels_off\n'+rows.map(r=>r.join(',')).join('\n'));
console.log({lap:r.bots[0].finish,meanLateralError:mean,maxLateralError:max,samples:rows.length});
