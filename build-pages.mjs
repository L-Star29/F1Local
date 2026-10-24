import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {modelCircuits} from './track-catalog.js';
import {teams} from './model-assets.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const output=path.join(root,'dist-pages');
const files=['multiplayer-config.json','index.html','credits.html','style.css','game.js','world.js','physics.js','tracks.js','surface.js','model-assets.js','track-catalog.js','controls.js','camera-rig.js','driving-feedback.js','track-limits.js','multiplayer.js','data/LICENSE.md'];
async function collect(folder){for(const entry of await fs.readdir(path.join(root,folder),{withFileTypes:true})){const relative=folder+'/'+entry.name;if(entry.isDirectory())await collect(relative);else files.push(relative);}}
await collect('vendor');
for(const team of teams)files.push('Car Models/'+team.file);
for(const circuit of modelCircuits){const relative='data/'+circuit.id+'-model-track.json';files.push(relative);const track=JSON.parse(await fs.readFile(path.join(root,relative),'utf8'));files.push('Race Track Models/'+track.modelFile);}
let bytes=0;
for(const relative of files){const source=path.join(root,relative),stat=await fs.stat(source);bytes+=stat.size;
 if(relative.endsWith('.glb')){const file=await fs.open(source,'r');try{const header=Buffer.alloc(12);await file.read(header,0,12,0);if(header.toString('ascii',0,4)!=='glTF'||header.readUInt32LE(4)!==2||header.readUInt32LE(8)!==stat.size)throw Error(relative+': not a complete GLB. Download the actual Git LFS object before deploying (git lfs pull).');}finally{await file.close();}}
}
// Stay below Pages' 1 GB published-site limit, including artifact overhead.
if(bytes>950_000_000)throw Error('Site exceeds the 950 MB safety budget. Move assets to separate hosting before deploying.');
if(process.argv.includes('--check')){console.log(`Validated ${files.length} files, ${(bytes/1e6).toFixed(1)} MB, ${teams.length} cars and ${modelCircuits.length} circuits.`);process.exit(0);}
// This dedicated generated directory is the only directory this script removes.
await fs.rm(output,{recursive:true,force:true});await fs.mkdir(output,{recursive:true});
for(const relative of files){const destination=path.join(output,relative);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(path.join(root,relative),destination);}
await fs.writeFile(path.join(output,'.nojekyll'),'');
console.log(`Built dist-pages: ${files.length} files, ${(bytes/1e6).toFixed(1)} MB. All GLBs contain real model data.`);
