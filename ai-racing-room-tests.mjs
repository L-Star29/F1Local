import assert from 'node:assert/strict';
import {AIRace} from './ai-race.js';
import {loadRaceWorld} from './race-world.mjs';
import {sample} from './tracks.js';
import {newCar} from './physics.js';
const w=loadRaceWorld();
for(const performance of ['equal','challenge','enhanced'])for(const [s,speed] of [[1700,25],[2800,55],[3500,40]]){
 const r=new AIRace(w.track,w.surface,{count:1,difficulty:100,aggression:100,performance}),bot=r.bots[0];
 const point=sample(w.track,s),inside=Math.sign(point.curve)||1,make=(distance,offset)=>{const p=sample(w.track,distance);return {...newCar({...p,x:p.x+p.nx*offset,z:p.z+p.nz*offset}),u:speed};};
 bot.car=make(s,inside*.5);bot.previousS=s;bot.progress=s;let contacts=0,maxDisplacement=0;
 const player=make(s,-inside*3.5);r.player.previousS=s;r.player.progress=s;
 for(let i=0;i<480;i++){const expected=make(s+speed*i/120,-inside*3.5);Object.assign(player,expected);r.tick(1/120,1+i/120,player);const d=Math.hypot(player.x-expected.x,player.z-expected.z);if(d>.001)contacts++;maxDisplacement=Math.max(maxDisplacement,d);}
 console.log({performance,s,contacts,maxDisplacement});assert.ok(maxDisplacement<.05,'aggressive enhanced AI must not push an overlapped outside car beyond contact-solver padding');
}
