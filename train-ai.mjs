// Offline elitist evolution. No training runs in the browser or changes car forces.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {AIRace,gridCar} from './ai-race.js';
import {AI_DRIVER} from './ai-driver.js';
import {installRacingLine} from './ai-line.js';
import {loadRaceWorld} from './race-world.mjs';
import {sample,clamp} from './tracks.js';

const world=loadRaceWorld();
installRacingLine(world.track,JSON.parse(fs.readFileSync('data/gb-1948-ai-plan.json')));
const bounds={slow:[.95,1.2,.025],medium:[.95,1.22,.03],fast:[.95,1.18,.025],lookBase:[3,14,1.5],lookTime:[.15,.5,.04],yawGain:[.00001,.00015,.00002],crossGain:[.008,.09,.012],preview:[.03,.25,.035],tightPreview:[.06,.3,.035],brakeGain:[.2,.8,.10],throttleGain:[.5,1.8,.2],steering:[1.1,2.8,.25]};
let seed=Number(process.env.AI_SEED||29102026)>>>0;
const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const generations=Number(process.env.AI_GENERATIONS||12),population=Number(process.env.AI_POPULATION||8);
if(!Number.isInteger(generations)||generations<1||generations>100||!Number.isInteger(population)||population<2||population>64)throw Error('Invalid training budget');
const hash=createHash('sha256');for(const p of ['physics.js','tracks.js','ai-driver.js','ai-race.js','ai-racecraft.js','ai-line.js','race-world.mjs','data/gb-1948-ai-plan.json'])hash.update(fs.readFileSync(p));
const fingerprint=hash.digest('hex'),history=[];
function evaluate(driver){
 const race=new AIRace(world.track,world.surface,{count:1,difficulty:100,laps:2,driver});
 const player=gridCar(world.track,0,world.surface);player.x+=100;race.player.finish=999;
 const bot=race.bots[0];let last=0,offTime=0,grassTime=0,maxError=0;
 for(let i=0;i<120*280;i++){
  race.tick(1/120,i/120,player);const road=world.surface(bot.car),line=sample(race.line,road.s);
  const error=Math.abs((bot.car.x-line.x)*line.nx+(bot.car.z-line.z)*line.nz);if(bot.progress>60)maxError=Math.max(maxError,error);
  offTime=road.wheelsOff===4?offTime+1/120:0;
  grassTime=road.unsafeWheels>0?grassTime+1/120:0;
  const reason=offTime>0?'four wheels outside':grassTime>.15?'unsafe surface':maxError>3.2?'missed racing line':road.hit?'barrier':bot.recoveries?'recovery':null;
  if(reason)return {valid:false,reason,progress:bot.progress,maxError,time:null};
  if(bot.completed===1&&!last)last=i/120;
  if(bot.finish!==null)return {valid:true,time:bot.finish-last,standing:last,maxError,progress:bot.progress};
 }
 return {valid:false,reason:'timeout',progress:bot.progress,maxError,time:null};
}
function mutate(parent,generation){
 const child={...parent},keys=Object.keys(bounds),count=1+Math.floor(random()*3);
 for(let i=0;i<count;i++){const key=keys[Math.floor(random()*keys.length)],[lo,hi,step]=bounds[key];child[key]=clamp(child[key]+(random()*2-1)*step*(generation%4===0?2:1),lo,hi);}
 return child;
}
const compare=(a,b)=>a.result.valid!==b.result.valid?(a.result.valid?-1:1):a.result.valid?a.result.time-b.result.time:b.result.progress-a.result.progress;
let elites=[{driver:{...AI_DRIVER},result:evaluate(AI_DRIVER)}];
console.log('Baseline',JSON.stringify(elites[0].result));
if(process.env.AI_RESUME){const saved=JSON.parse(fs.readFileSync(process.env.AI_RESUME));const candidate={driver:saved.champion.driver,result:evaluate(saved.champion.driver)};elites.push(candidate);elites.sort(compare);}
for(let generation=1;generation<=generations;generation++){
 const candidates=[...elites];
 for(let i=0;i<population;i++){
  const parent=elites[Math.floor(random()*elites.length)].driver,driver=mutate(parent,generation),result=evaluate(driver);
  candidates.push({driver,result});console.log(JSON.stringify({generation,candidate:i,...result}));
 }
 candidates.sort(compare);elites=candidates.slice(0,3);
 const champion=elites[0];history.push({generation,result:champion.result});
 fs.writeFileSync('analysis/ai-training.json',JSON.stringify({version:1,method:'elitist evolutionary driver-policy search',target:95,track:world.track.id,fingerprint,seed,champion,history},null,2));
 console.log('Generation',generation,'champion',JSON.stringify(champion.result));
 if(champion.result.valid&&champion.result.time<=95)break;
}
console.log('Candidate saved to analysis/ai-training.json. Validate traffic, multiple laps and grid starts before promotion.');
