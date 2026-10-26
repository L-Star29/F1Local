import {startDuration,newLaunch,launchInput} from './race-start.js';
// Session timing advances only while the local simulation is running.
export class SoloSession {
 constructor(kind='practice',laps=3){this.reset(kind,laps);}
 reset(kind=this.kind,laps=this.laps){this.kind=kind;this.laps=Number(laps);this.phase=kind==='race'?'countdown':'running';this.duration=startDuration();this.remaining=this.duration;this.launch=newLaunch();this.elapsed=0;this.completed=0;this.invalid=0;}
 tick(dt,input={throttle:0}){if(this.phase==='countdown'){launchInput(this.launch,input,-this.remaining);this.remaining=Math.max(0,this.remaining-dt);if(this.remaining<1e-8){this.remaining=0;this.phase='running';}return false;}if(this.phase!=='running')return false;this.elapsed+=dt;return true;}
 controls(input){return this.kind==='race'?launchInput(this.launch,input,this.elapsed):input;}
 completeLap(valid){if(this.phase!=='running')return;this.completed++;if(!valid)this.invalid++;if(this.kind==='race'&&this.completed>=this.laps)this.phase='finished';}
}
