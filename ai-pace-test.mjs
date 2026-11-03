import assert from 'node:assert/strict';
import {AIRace,gridCar} from './ai-race.js';
import {loadRaceWorld} from './race-world.mjs';
import {sample} from './tracks.js';
const w=loadRaceWorld(),r=new AIRace(w.track,w.surface,{count:1,difficulty:100,performance:process.env.AI_ENHANCED==='1'?'enhanced':'equal',laps:3}),p=gridCar(w.track,0,w.surface);p.x+=100;r.player.finish=999;
let previousFlying=null;
let last=0,completed=0,worst={error:0},off=0;
for(let i=0;i<120*400&&r.bots[0].finish===null;i++){r.tick(1/120,i/120,p);const b=r.bots[0],q=w.surface(b.car),line=sample(r.line,q.s),error=Math.abs((b.car.x-line.x)*line.nx+(b.car.z-line.z)*line.nz);if(b.progress>60&&error>worst.error)worst={error,s:q.s,speed:b.car.u*3.6,steer:b.control.steer,curve:line.curve};if(q.wheelsOff===4)off++;if(b.completed>completed){const lapTime=i/120-last; assert.equal(off,0); assert.equal(b.recoveries,0); assert.ok(worst.error<4); if(b.completed>1) { if(process.env.AI_ENHANCED!=='1') assert.ok(lapTime<104,'equal-car expert pace must retain the measured improvement'); if(previousFlying!==null) assert.ok(Math.abs(lapTime-previousFlying)<1,"repeatable clean-air flying laps"); previousFlying=lapTime; } console.log({lap:b.completed,time:lapTime,worst,off});last=i/120;completed=b.completed;worst={error:0};off=0;}}


assert.equal(completed,3,"complete all three laps");
