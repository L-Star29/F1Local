import assert from 'node:assert/strict';
import {makeTrack,nearest} from './tracks.js';
import {racingLine,plannedSpeed} from './ai-line.js';

// Unnamed generated circuits: no Silverstone data or corner-specific rules.
for(const lobes of [0,3,5]){
 const coordinates=Array.from({length:120},(_,i)=>{const a=i/120*Math.PI*2,r=100+(lobes?28*Math.sin(lobes*a):0);return [r*Math.cos(a)/111320,r*Math.sin(a)/111320];});
 const track=makeTrack({geometry:{coordinates}},{id:'generated-'+lobes,length:900,turns:0,cw:true,start:coordinates[0],width:14,theme:'test',heights:[[0,0],[1,0]]});
 const surface=c=>{const r=nearest(track,c.x,c.z);return {...r,wheelsOff:Math.abs(r.offset)>r.width/2-1.2?4:0,hit:null};};
 const line=racingLine(track,surface);
 assert.ok(line.plannedTime<=line.seedTime,'optimization never worsens its seed');
 for(let i=0;i<line.n;i++){
  const p=line.pts[i];assert.ok(Number.isFinite(p.curve)&&p.segment>0);
  assert.ok(p.offset>=-line.bounds[i][0]-1e-9&&p.offset<=line.bounds[i][1]+1e-9,'line remains in road corridor');
  assert.ok(plannedSpeed(line,p.s,100)>0);
 }
 assert.equal(plannedSpeed(line,0,100),plannedSpeed(line,track.length,100),'closed-loop speed continuity');
 assert.ok(plannedSpeed(line,-.001,100)>0,'negative progress wraps');
 assert.equal(racingLine(track,surface),line,'reuse cached plan');
 console.log({shape:lobes,seed:line.seedTime,optimized:line.plannedTime});
}
console.log('PASS: generated round and linked-corner circuits, corridor bounds, finite plans and lap seam.');
