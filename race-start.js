export const startDuration=()=>5.6+Math.random()*1.2;
export const newLaunch=()=>({released:false,reaction:null,held:false});
// Release must be observed AFTER lights-out; holding throttle cannot launch.
export function launchInput(state,input,elapsed){
 if(elapsed<0){state.released=false;state.held=input.throttle>.1;return {...input,throttle:0};}
 if(!state.released&&input.throttle<=.05){state.released=true;state.held=false;}
 if(state.reaction===null&&state.released&&input.throttle>.1)state.reaction=elapsed;
 return state.reaction===null?{...input,throttle:0}:input;
}
export function lightCount(remaining,duration){return remaining>0?Math.min(5,Math.floor(duration-remaining)):0;}
export function showStart(element,remaining,duration,launch,elapsed,server=false){
 const running=remaining<=0,count=lightCount(remaining,duration);
 const label=!running?'Wait for lights out':launch?.reaction!==null&&launch?.reaction!==undefined?(server?'SERVER REACTION ':'REACTION ')+Math.round(launch.reaction*1000)+' ms':launch?.held?'Release throttle, then press to launch':'GO — PRESS THROTTLE';
 const visible=!running||launch?.reaction==null||elapsed-launch.reaction<4;
 element.hidden=!visible;if(!visible)return;
 const signature=count+'|'+label;
 if(element.dataset.startState===signature)return;element.dataset.startState=signature;
 element.innerHTML='<div class="start-lights" aria-label="'+(running?'Lights out':count+' red lights')+'">'+Array.from({length:5},(_,i)=>'<span class="'+(i<count?'lit':'')+'"><i></i><i></i></span>').join('')+'</div><small>'+label+'</small>';
}
