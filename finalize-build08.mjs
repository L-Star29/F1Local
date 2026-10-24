import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('package.json'));p.scripts.test+=' && node surface-feedback-tests.mjs && node circuit-audit.mjs';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
let game=fs.readFileSync('game.js','utf8').replace("engine.type='sawtooth';","engine.setPeriodicWave(audio.createPeriodicWave(new Float32Array(6),new Float32Array([0,1,.38,.22,.12,.06])));");fs.writeFileSync('game.js',game);
