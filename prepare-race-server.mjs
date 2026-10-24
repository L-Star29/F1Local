// Some cloud hosts check out LFS pointers. Fetch only the server's Silverstone
// collision model from the already-deployed game if the real file is absent.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const file='Race Track Models/silverstone_circuit_2024_layout.glb';
const current=await fs.readFile(file);
if(current.toString('ascii',0,4)==='glTF'&&current.readUInt32LE(8)===current.length){console.log('Silverstone server model is ready.');process.exit(0);}
const pointer=current.toString('utf8');const hash=pointer.match(/^oid sha256:([a-f0-9]{64})$/m)?.[1],size=Number(pointer.match(/^size (\d+)$/m)?.[1]);
if(!hash||!size)throw Error('Silverstone is neither a valid GLB nor a Git LFS pointer.');
const response=await fetch('https://l-star29.github.io/F1Local/'+encodeURI(file),{signal:AbortSignal.timeout(180000)});
if(!response.ok)throw Error('Could not download the server model: HTTP '+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
if(bytes.length!==size||createHash('sha256').update(bytes).digest('hex')!==hash||bytes.toString('ascii',0,4)!=='glTF')throw Error('Downloaded model does not match the repository LFS object. Redeploy Pages or fetch Git LFS before building the server.');
await fs.writeFile(file,bytes);console.log('Verified and downloaded Silverstone server model.');
