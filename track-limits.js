// Timers measure each continuous excursion. Rejoining resets the allowance.
export const limitGrace={strict:0,standard:.5,relaxed:1.5,practice:Infinity};
export function trackLimitStep(elapsed,off,dt,level='strict'){
 const seconds=off?elapsed+dt:0;
 return {seconds,invalid:off&&seconds>(limitGrace[level]??0)};
}
