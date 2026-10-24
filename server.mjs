import {createGameServer} from './race-server.mjs';
const port=Number(process.env.PORT)||4173,host=process.env.HOST||'127.0.0.1';
createGameServer().listen(port,host,()=>console.log(`Game: http://${host}:${port} (private rooms enabled)`));
