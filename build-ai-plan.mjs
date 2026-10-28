import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {racingLine} from './ai-line.js';
import {loadRaceWorld} from './race-world.mjs';
const sources=['ai-line.js','physics.js','race-world.mjs','surface.js','data/gb-1948-model-track.json'];
const fingerprint=createHash('sha256');for(const f of sources)fingerprint.update(fs.readFileSync(f));
const {track,surface}=loadRaceWorld(),line=racingLine(track,surface);
fs.writeFileSync('data/gb-1948-ai-plan.json',JSON.stringify({version:1,trackId:track.id,length:track.length,fingerprint:fingerprint.digest('hex'),pts:line.pts,bounds:line.bounds,seedTime:line.seedTime,plannedTime:line.plannedTime,profiles:[...line.profiles].map(([k,p])=>[k,{...p,speeds:[...p.speeds]}])}));
console.log('Built reusable Silverstone AI plan.');
