// Positive steering always means the driver's right, independent of world axes.
export function keyboardInput(keys){
 const down=(...codes)=>codes.some(code=>keys.has(code));
 return {
  steer:Number(down('KeyD','ArrowRight'))-Number(down('KeyA','ArrowLeft')),
  throttle:Number(down('KeyW','ArrowUp')),
  brake:Number(down('KeyS','ArrowDown')),
  handbrake:down('Space'),analog:false
 };
}
