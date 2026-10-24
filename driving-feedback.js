export function feedbackLevels(car){
 const speed=Math.abs(car.u),slip=Math.max(0,(car.frontSlip||0)-.035,(car.rearSlip||0)-.035);
 return {tyre:Math.min(.025,slip*.12)*Math.min(1,speed/18),abs:car.abs?'ABS ACTIVE':car.tc?'TC ACTIVE':''};
}
export function createTyreAudio(context){
 const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),samples=buffer.getChannelData(0);
 for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
 const noise=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
 noise.buffer=buffer;noise.loop=true;filter.type='bandpass';filter.frequency.value=1100;filter.Q.value=.8;gain.gain.value=0;
 noise.connect(filter).connect(gain).connect(context.destination);noise.start();
 return {update(car,audible){gain.gain.setTargetAtTime(audible?feedbackLevels(car).tyre:0,context.currentTime,.045);filter.frequency.setTargetAtTime(650+Math.min(1000,Math.abs(car.u)*12),context.currentTime,.08);},mute(){gain.gain.setTargetAtTime(0,context.currentTime,.02);}};
}
