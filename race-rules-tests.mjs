import assert from 'node:assert/strict';
import {RaceSteward} from './race-steward.js';
import {RaceAero,slipstream,drsZones} from './race-aero.js';
import {racecraft} from './ai-racecraft.js';
import {newCar,step,vehicles} from './physics.js';
import {wheelBoundary,outsideBoundary} from './track-limits.js';
const track={id:'gb-1948',length:6000,n:600,ds:10,pts:Array.from({length:600},(_,i)=>({s:i*10,x:0,z:i*10,tx:0,tz:1,nx:-1,nz:0,curve:0,offset:0,width:14,y:0}))};
function driver(){return {x:0,z:0,u:40,v:0,r:0,yaw:0,brake:0,ax:0};}
function runExcursion({brake=0,throttle=1,cut=false,loss=false,contact=false}={},steward=new RaceSteward(track)){
 const c=driver();c.v=loss?15:0;c.contactAge=contact?0:999;let time=0;
 for(let i=0;i<36;i++){time+=.1;c.z+=cut?2:4;c.u=brake?10:40;steward.update('p',c,{s:i*(cut?10:4),wheelsOff:i<29?4:0},{brake,throttle},.1,time,[]);}
 return {steward,c,time,state:steward.state('p')};
}
assert.equal(runExcursion({brake:1,throttle:0}).state.penalty,0,'a slow missed brake point is not automatically a time penalty');
assert.equal(runExcursion({loss:true}).state.warnings,0,'obvious loss of control is reviewed without a strike');
assert.equal(runExcursion({contact:true}).state.warnings,0,'contact without advantage is mitigated');
assert.equal(runExcursion().state.warnings,0,'balanced ignores wide running without a measurable gain');
assert.equal(runExcursion({},new RaceSteward(track,'normal','lenient')).state.warnings,0);
const repeat=new RaceSteward(track,'normal','strict');for(let i=0;i<4;i++){repeat.state('p').previous=null;runExcursion({},repeat);}assert.equal(repeat.state('p').warnings,4);assert.equal(repeat.state('p').penalty,5,'fourth distinct violation earns five seconds');
let cut=runExcursion({cut:true});assert.ok(cut.state.pending?.debt>.4);assert.equal(cut.state.warnings,0,'no duplicate strike for lasting advantage');cut.steward.finish('p',cut.c,cut.time,[]);assert.ok(cut.state.penalty>=10,'finish cannot erase a pending shortcut penalty');
cut=runExcursion({cut:true,brake:1,throttle:0});cut.steward.finish('p',cut.c,cut.time,[]);assert.ok(cut.state.penalty>=5,'braking does not excuse keeping a shortcut advantage');
cut=runExcursion({cut:true});for(let i=0;i<70;i++)cut.steward.update('p',cut.c,{s:350,wheelsOff:0},{throttle:0,brake:1},.1,cut.time+(i+1)*.1,[]);assert.equal(cut.state.pending,null);assert.equal(cut.state.penalty,0,'safely giving all time back clears the sanction');
const tiny=new RaceSteward(track),car=driver();for(let i=0;i<10;i++)tiny.update('p',car,{s:0,wheelsOff:2},{},.1,i*.1);assert.equal(tiny.state('p').warnings,0,'two wheels outside remains legal');
const positions=new RaceSteward(track),overtaker=driver(),rival={id:'rival',s:20,finish:null};
for(let i=0;i<36;i++){overtaker.z=i*4;positions.update('p',overtaker,{s:i*4,wheelsOff:i<29?4:0},{throttle:1},.1,i*.1,[rival]);}
assert.deepEqual(positions.state('p').pending.returnIds,['rival'],'off-track overtake requires returning the place even without a geometric shortcut');
const retained=new RaceSteward(track),aheadCar=driver();
for(let i=0;i<36;i++){aheadCar.z=i*2;retained.update('p',aheadCar,{s:i*10,wheelsOff:i<29?4:0},{throttle:1},.1,i*.1,[{id:'already-behind',s:i*10-5,finish:null}]);}
assert.ok(retained.state('p').pending?.debt>.4,'shortcut still owes time');assert.deepEqual(retained.state('p').pending.returnIds,[],'a car already behind does not acquire a position-return entitlement');
rival.s=180;positions.update('p',overtaker,{s:140,wheelsOff:0},{throttle:0},.1,3.6,[rival]);assert.equal(positions.state('p').pending,null);assert.equal(positions.state('p').penalty,0);
const continuous=new RaceSteward(track,'normal','strict'),wide=driver();for(let i=0;i<120;i++){wide.z=i*4;continuous.update('p',wide,{s:i*4,wheelsOff:i<110?(i%15<2?0:4):0},{throttle:1},.1,i*.1);}
assert.equal(continuous.state('p').warnings,1,'brief edge bounces must not multiply penalties for one excursion');
const flicker=new RaceSteward(track);for(let i=0;i<80;i++)flicker.update('p',car,{s:0,wheelsOff:i===1?4:0},{},1/120,i/120);assert.equal(flicker.state('p').warnings,0,'ignore a one-tick boundary ambiguity');
// DRS entitlement comes from a timed detection crossing, not distance at activation.
const detection=drsZones[track.id][0].detect;
const aero=new RaceAero(track),lead={id:'a',car:driver(),road:{s:detection-9,wheelsOff:0},progress:600,input:{}},follow={id:'b',car:driver(),road:{s:detection-29,wheelsOff:0},progress:580,input:{drsPress:0}};
aero.update([lead,follow],.1,0,true);lead.road.s=detection+1;follow.road.s=detection-19;aero.update([lead,follow],.1,.1,true);follow.road.s=detection+1;aero.update([follow,lead],.5,.6,true);
follow.road.s=1030;follow.input.drsPress=1;aero.update([lead,follow],.1,6,true);assert.equal(follow.car.drsOpen,true);aero.update([lead,follow],.1,6.05,true);assert.equal(follow.car.drsOpen,true,'DRS remains open after a single press');
follow.input.brake=1;aero.update([lead,follow],.1,6.1,true);assert.equal(follow.car.drsOpen,false);follow.input.brake=0;aero.update([lead,follow],.1,6.2,true);assert.equal(follow.car.drsOpen,false,'held button cannot reopen after braking');
const firstLap=new RaceAero(track);follow.progress=100;firstLap.update([follow],.1,1,true);assert.equal(follow.car.drsOpen,false);
const practice=new RaceAero(track);practice.update([follow],.1,1,false);assert.equal(follow.car.drsOpen,true,'practice DRS does not require another car');
follow.input.steer=1;practice.update([follow],.1,1.1,false);assert.equal(follow.car.drsOpen,true,'lane correction keeps DRS open');follow.car.r=.3;practice.update([follow],.16,1.26,false);assert.equal(follow.car.drsOpen,false,'sustained cornering closes DRS');follow.car.r=0;follow.input.steer=0;
const asphalt={height:(x,z)=>Math.abs(x)<=5?0:null},kerb={height:(x,z)=>Math.abs(x)>5&&Math.abs(x)<=6?.05:null};
assert.deepEqual(wheelBoundary(asphalt,kerb,5.5,0,0),{normal:false,kerbs:true,extended:true});
assert.deepEqual(wheelBoundary(asphalt,kerb,6.7,0,0),{normal:false,kerbs:false,extended:true});
assert.equal(wheelBoundary(asphalt,kerb,7.2,0,0).extended,false);
const edge={wheelsOff:4,kerbWheelsOff:2,extendedWheelsOff:0};assert.equal(outsideBoundary(edge,'normal'),true);assert.equal(outsideBoundary(edge,'kerbs'),false);assert.equal(outsideBoundary(edge,'extended'),false);assert.equal(outsideBoundary(edge,'none'),false);
const unrestricted=new RaceSteward(track,'none');unrestricted.update('p',driver(),{s:0,wheelsOff:4},{throttle:1},10,10);assert.equal(unrestricted.state('p').incident,null);
const c=driver(),front={car:{...driver(),z:40}};assert.ok(slipstream(c,[front])>0);front.car.x=12;assert.equal(slipstream(c,[front]),0);front.car.x=0;front.car.yaw=Math.PI;assert.equal(slipstream(c,[front]),0);
front.car.yaw=0;front.car.z=15;const closeTow=slipstream(c,[front]);front.car.z=80;assert.ok(slipstream(c,[front])<closeTow,'aligned tow fades with distance');
front.car.x=3;c.yaw=Math.atan2(3,80);assert.equal(slipstream(c,[front]),0,'aiming at an offset car must not fabricate alignment with its wake');c.yaw=0;
const race={track,aggression:1,line:{...track,bounds:track.pts.map(()=>[6,6])},surface:c=>({s:c.z,offset:c.x})};
const bot={car:{...driver(),z:100,brake:1,ax:-5},offset:0},road={s:100,offset:0};
let d=racecraft(race,bot,road,[{id:'behind',car:{...driver(),z:80,u:60}}],30,.05);assert.equal(d.offset,0,'no defensive lane change during braking');
bot.car.brake=0;bot.car.ax=0;d=racecraft(race,bot,road,[{car:{...driver(),z:80,u:60}}],50,.05);assert.ok(bot.tactics.defended);
const committed=bot.tactics.lane;racecraft(race,bot,road,[{car:{...driver(),x:-4,z:80,u:60}}],50,.05);assert.equal(bot.tactics.lane,committed,'no second reaction block');
d=racecraft(race,bot,road,[{car:{...driver(),x:3,z:101}}],50,.05);assert.ok(d.offset<=.350001,'leave room to an overlapped opponent');
const p=newCar({x:0,z:0,tx:0,tz:1}),b=structuredClone(p),flat={offset:0,width:14,y:0,slope:0};p.u=b.u=65;
step(p,{steer:0,throttle:1,brake:0},flat,'formula',1/120,{assists:'none'});step(b,{steer:0,throttle:1,brake:0},flat,'formula',1/120,{assists:'none',aiPerformance:1});assert.ok(b.tyres.reduce((n,t)=>n+t.load,0)>p.tyres.reduce((n,t)=>n+t.load,0));assert.equal(vehicles.formula.aero,2.8,'AI challenge must not mutate player car');
console.log('PASS: incident-level penalties, mitigation, repeat warnings, shortcut repayment, finalization, DRS detection/braking/lap rules, slipstream alignment, defensive commitment and AI-only performance.');


// Chapel activation starts at the bend. Steering on entry should postpone the
// button prompt until straightened rather than disabling the whole straight.
const chapel=new RaceAero(track),zone=drsZones[track.id][1];
const testCar={id:'solo',car:driver(),road:{s:zone.start,wheelsOff:0},progress:0,input:{steer:1,drsPress:0}};
testCar.car.r=.3;chapel.update([testCar],.16,0,false);assert.equal(testCar.car.drsAvailable,false);
testCar.input.steer=0;testCar.car.r=0;testCar.road.s+=10;chapel.update([testCar],.1,.1,false);assert.equal(testCar.car.drsAvailable,true);
testCar.input.drsPress++;chapel.update([testCar],.1,.2,false);assert.equal(testCar.car.drsOpen,true);
testCar.road.s=zone.end;chapel.update([testCar],.1,.3,false);assert.equal(testCar.car.drsOpen,false);

const wakeLeader={id:'leader',car:{...driver(),x:25,z:40,yaw:Math.PI/2}};
const wakeHistory=new Map([['leader',{trail:[{x:20,z:40,y:0},{x:0,z:40,y:0},{x:0,z:0,y:0}]}]]);
const tuckedIn={...driver(),z:20};
assert.ok(slipstream(tuckedIn,[wakeLeader],wakeHistory)>0,'wake follows the route through a bend');
assert.equal(slipstream({...tuckedIn,x:8},[wakeLeader],wakeHistory),0,'opposite lane outside the wake');
