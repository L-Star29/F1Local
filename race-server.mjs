import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {RaceRoom} from './race-core.js';
import {loadRaceWorld} from './race-world.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
export function createGameServer(worldFactory=loadRaceWorld){
 const rooms=new Map(),tokens=new Map(),streams=new Map();
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://'+req.headers.host),parts=url.pathname.split('/').filter(Boolean);
  if(parts[0]==='api'){
   const origin=req.headers.origin,allowed=new Set((process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean));
   const sameOrigin=origin===url.origin||origin==='https://'+req.headers.host;
   if(origin&&!sameOrigin&&!allowed.has(origin))return json(res,403,{error:'This game website is not allowed by the race server.'});
   if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
   if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'}).end();return;}
   if(req.method==='GET'&&url.pathname==='/api/health')return json(res,200,{ok:true,service:'f1local-racing'});
   const room=rooms.get(parts[2]);
   if(req.method==='GET'&&parts[3]==='events'){
    const auth=tokens.get(url.searchParams.get('token'));if(!auth||!room||auth.room!==room)return json(res,403,{error:'Invalid room session.'});
    const p=auth.player;streams.get(p.id)?.end();streams.set(p.id,res);p.connected=true;
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write('retry: 1500\n\n');res.write('data: '+JSON.stringify(room.snapshot())+'\n\n');
    req.on('close',()=>{if(streams.get(p.id)===res){streams.delete(p.id);p.connected=false;p.disconnectedAt=room.time;}});return;
   }
   if(req.method!=='POST')return json(res,404,{error:'Unknown endpoint.'});
   let body='';for await(const chunk of req){body+=chunk;if(body.length>2048)return json(res,413,{error:'Request too large.'});}const data=JSON.parse(body||'{}');
   const identity=()=>{const name=String(data.name||'Driver').trim().slice(0,20)||'Driver';if(!['ferrari','redbull','mercedes','audi','cadillac'].includes(data.team))throw Error('Choose a team.');return {name,team:data.team};};
   let target=room;
   if(parts.length===2&&parts[1]==='rooms'){
    if(rooms.size>=8)throw Error('Server is full. Try again later.');const {track,surface}=worldFactory();let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));identity();target=new RaceRoom(code,track,surface,[1,3,5].includes(data.laps)?data.laps:3);rooms.set(code,target);
   }else if(parts[3]!=='join'){
    const auth=tokens.get(req.headers.authorization?.replace(/^Bearer /,''));if(!auth||!room||auth.room!==room)return json(res,403,{error:'Invalid room session.'});const p=auth.player;
    if(parts[3]==='input')room.setInput(p,data);
    else if(parts[3]==='ready'){if(!['lobby','finished'].includes(room.phase))throw Error('Race already started.');p.ready=!!data.ready;}
    else if(parts[3]==='start')room.start(p.id);
    else if(parts[3]==='leave'){streams.get(p.id)?.end();streams.delete(p.id);p.connected=false;p.disconnectedAt=room.time-11;p.dnf=true;p.ready=false;if(['lobby','finished'].includes(room.phase)){room.players=room.players.filter(q=>q!==p);room.host=room.players[0]?.id;if(room.players.length)room.phase='lobby';}for(const [token,a]of tokens)if(a.player===p)tokens.delete(token);}
    else return json(res,404,{error:'Unknown endpoint.'});return json(res,200,{ok:true});
   }
   if(!target)throw Error('Room not found. Check the code and server address.');const who=identity(),id=randomBytes(8).toString('hex'),token=randomBytes(24).toString('hex'),player=target.add(id,who.name,who.team);tokens.set(token,{room:target,player});return json(res,200,{code:target.code,id,token});
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
  const allowed=/^(index\.html|credits\.html|style\.css|game\.js|world\.js|physics\.js|tracks\.js|surface\.js|model-assets\.js|track-catalog\.js|controls\.js|camera-rig\.js|driving-feedback\.js|track-limits\.js|network-motion\.js|setup-flow\.js|solo-session\.js|multiplayer\.js|multiplayer-config\.json)$/.test(relative)||/^(vendor|data|Car Models|Race Track Models)\//.test(relative);
  const file=path.resolve(root,relative);if(!allowed||!file.startsWith(root+path.sep)||relative.split(/[\\/]/).some(p=>p.startsWith('.'))){res.writeHead(404).end('Not found');return;}
  fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);});
 }catch(error){if(!res.headersSent)json(res,400,{error:error.message});else res.end();}});
 let last=performance.now(),accumulator=0,broadcast=0;
 const timer=setInterval(()=>{const now=performance.now();accumulator+=Math.min((now-last)/1000,.1);last=now;while(accumulator>=1/120){for(const room of rooms.values())room.tick(1/120);accumulator-=1/120;}if(++broadcast%6===0)for(const room of rooms.values()){const event='data: '+JSON.stringify(room.snapshot())+'\n\n';for(const p of room.players){const s=streams.get(p.id);if(s&&!s.writableNeedDrain)s.write(event);}if(room.players.some(p=>p.connected))room.lastConnected=Date.now();if(!room.players.some(p=>p.connected)&&Date.now()-(room.lastConnected??room.created)>120000){rooms.delete(room.code);for(const [token,a]of tokens)if(a.room===room)tokens.delete(token);}}},8);
 timer.unref();server.shutdown=()=>{clearInterval(timer);for(const stream of streams.values())stream.end();server.close();};server.on('close',()=>clearInterval(timer));return server;
}
