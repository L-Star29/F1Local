import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIRace,gridCar} from './data/render-driver/ai-race.js';
import {installRacingLine} from './data/render-driver/ai-line.js';
import {loadRaceWorld} from './race-world.mjs';
const {track,surface}=loadRaceWorld();
installRacingLine(track,JSON.parse(fs.readFileSync('data/gb-1948-render-ai-plan.json')));
const race=new AIRace(track,surface,{count:1,difficulty:100}),bot=race.bots[0],player=gridCar(track,0,surface);
for(const u of [0,30,80]){
 const fresh=structuredClone(bot);fresh.car.u=u;
 const road=surface(fresh.car),clear=race.controls(structuredClone(fresh),road,[],.05);
 const near=race.controls(fresh,road,[{id:'you',car:player}],.05);
 assert.equal(near.throttle,clear.throttle);assert.equal(near.brake,clear.brake);
 assert.notEqual(near.steer,clear.steer);
}
for(let i=0;i<120*12;i++)race.tick(1/120,i/120,player);
assert.ok(bot.progress>race.player.progress+15);assert.equal(bot.recoveries,0);
console.log('PASS: player proximity changes steering only; restored driver passes parked grid car.');

// An outside player is still alongside even with its nose 6 m behind. The
// approaching racing line bends toward it before the braking point.
for(const side of [-1,1]){
 const pts=Array.from({length:80},(_,i)=>({x:0,y:0,z:i*4,nx:-1,nz:0,tx:0,tz:1,offset:0}));
 const t={ds:4,n:pts.length,length:320,pts};
 const line={...t,pts:pts.map((p,i)=>({...p,x:i>26?-4*side:0,offset:i>26?4*side:0})),bounds:pts.map(()=>[7,7]),profiles:new Map([[100,{speeds:pts.map(()=>50)}]])};
 const context={track:t,line,skill:100,passDistance:40,surface:c=>({s:c.z,offset:-c.x})};
 const b={car:{x:0,y:0,z:100,yaw:0,u:40},offset:0,progress:100};
 const beside={id:'you',car:{x:-3*side,y:0,z:94}};
 const clear=AIRace.prototype.controls.call(context,structuredClone(b),context.surface(b.car),[],.05);
 const guarded=AIRace.prototype.controls.call(context,b,context.surface(b.car),[beside],.05);
 assert.ok(clear.steer*side>0 && guarded.steer*side<=0,'avoid turning across the occupied side');
 assert.equal(clear.throttle,guarded.throttle);assert.equal(clear.brake,guarded.brake);
}
