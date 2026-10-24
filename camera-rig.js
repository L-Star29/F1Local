// Chase camera follows position and heading directly, matching T-cam response.
export function chasePose(car,groundY,state,dt){
 // Match the immediate heading response of T-cam; no trailing yaw.
 state.yaw=car.yaw;
 const x=Math.sin(state.yaw),z=Math.cos(state.yaw);
 return {position:{x:car.x-x*8.2,y:groundY+3.2,z:car.z-z*8.2},look:{x:car.x+x*16,y:groundY+1,z:car.z+z*16}};
}
