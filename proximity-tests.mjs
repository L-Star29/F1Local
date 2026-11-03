import assert from 'node:assert/strict';
import {nearbyCars,proximityTargets} from './proximity.js';
for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
 const self={x:0,z:0,y:0,yaw,u:40};
 const entry=(left,forward,extra={})=>({car:{x:Math.cos(yaw)*left+Math.sin(yaw)*forward,z:-Math.sin(yaw)*left+Math.cos(yaw)*forward,y:0,yaw,u:45},...extra});
 assert.ok(nearbyCars(self,[entry(3,0)]).left?.alongside);
 assert.ok(nearbyCars(self,[entry(-3,0)]).right?.urgent);
 assert.ok(nearbyCars(self,[entry(0,-20)]).rear);
 assert.equal(nearbyCars(self,[entry(0,20)]).rear,null);
 assert.equal(nearbyCars(self,[entry(0,-60)]).rear,null);
 assert.equal(nearbyCars(self,[entry(0,-20,{finish:20})]).rear,null);
 assert.equal(nearbyCars(self,[entry(3,0,{ghost:1})]).left,null);
 const two=proximityTargets(self,[entry(2,-15),entry(-2,-25)]);assert.equal(two.length,2,'retain multiple trailing cars');assert.ok(two[0].bearing<0&&two[1].bearing>0,'indicators move toward the actual side');
}
console.log('PASS: proximity sides at all headings, rear distance, urgency and inactive-car filtering.');
