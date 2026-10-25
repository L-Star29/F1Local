// Session timing advances only while the local simulation is running.
export class SoloSession {
 constructor(kind='practice',laps=3){this.reset(kind,laps);}
 reset(kind=this.kind,laps=this.laps){this.kind=kind;this.laps=Number(laps);this.phase=kind==='race'?'countdown':'running';this.remaining=3;this.elapsed=0;this.completed=0;this.invalid=0;}
 tick(dt){if(this.phase==='countdown'){this.remaining=Math.max(0,this.remaining-dt);if(this.remaining<1e-8)this.phase='running';return false;}if(this.phase!=='running')return false;this.elapsed+=dt;return true;}
 completeLap(valid){if(this.phase!=='running')return;this.completed++;if(!valid)this.invalid++;if(this.kind==='race'&&this.completed>=this.laps)this.phase='finished';}
}
