import assert from 'node:assert/strict';
import {newCar,bodyToWorld} from './physics.js';
import {carContact,resolveCarContact,footprint} from './car-contact.js';
import {carFootprints} from './car-footprints.js';
const car=(x=0,z=0,yaw=0)=>({...newCar({x,y:0,z,tx:Math.sin(yaw),tz:Math.cos(yaw)}),u:50});
for(const team of Object.keys(carFootprints)){
 const shape=footprint(car(),team);assert.ok(shape.length>=4);assert.ok(Math.max(...shape.map(p=>p[1]))>2.65);
 const a=car(),b=car(1.85);assert.ok(carContact(a,b,team,team),'tyres overlap beyond the old 1.8m circle width');resolveCarContact(a,b,team,team);assert.equal(carContact(a,b,team,team),null);assert.equal(a.u,50);assert.equal(b.u,50);
 assert.equal(carContact(car(),car(2.3),team,team),null,'clean parallel gap remains untouched');
 const nose=car(),tail=car(0,5.2);assert.ok(carContact(nose,tail,team,team),'front/rear wings covered');nose.u=60;tail.u=40;resolveCarContact(nose,tail,team,team);assert.ok(Math.abs(nose.u-tail.u)<.01);assert.ok(Math.abs(nose.u+tail.u-100)<1e-7);
 for(const heading of [0,.5,1.57,2.6]){const a=car(0,0,heading),p=bodyToWorld(heading,0,1.85),b=car(p.x,p.z,heading);a.steer=.35;b.steer=-.2;assert.ok(resolveCarContact(a,b,team,team));assert.equal(carContact(a,b,team,team),null,'rotated footprints separate');assert.ok([a.x,a.z,a.u,a.v].every(Number.isFinite));}
}
const a=car(),b=car(1.7,0,.2);a.v=3;b.v=-2;const energy=c=>c.u*c.u+c.v*c.v,before=energy(a)+energy(b);resolveCarContact(a,b,'ferrari','audi');assert.ok(energy(a)+energy(b)<=before+1e-7,'contact adds no kinetic energy');
assert.equal(carContact(car(),{...car(),y:4}),null,'different road elevations do not collide');
console.log('PASS: all five model footprints, tyre and wing coverage, steered wheels, rotated contacts, clean gaps, no side-contact speed loss, momentum and no added energy.');
