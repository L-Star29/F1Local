import {chasePose} from './camera-rig.js';
import * as T from './vendor/three.module.js';
import {sample} from './tracks.js';
import {loadTeam,loadModel,disposeModel} from './model-assets.js';
import {SurfaceGrid,BarrierGrid} from './surface.js';
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.86,...extra});
export function createWorld(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new T.Scene();scene.background=new T.Color('#aecbd8');scene.fog=new T.Fog('#aecbd8',250,1800);const camera=new T.PerspectiveCamera(64,innerWidth/innerHeight,.08,5000);
 const envScene=new T.Scene();envScene.background=new T.Color('#c2d2dc');const envGround=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshBasicMaterial({color:'#696d65'}));envGround.rotation.x=-Math.PI/2;envGround.position.y=-5;envScene.add(envGround);const envLight=new T.Mesh(new T.PlaneGeometry(12,12),new T.MeshBasicMaterial({color:'#ffffff'}));envLight.position.set(-8,12,-8);envLight.lookAt(0,0,0);envScene.add(envLight);const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(envScene,.08).texture;pmrem.dispose();envGround.geometry.dispose();envGround.material.dispose();envLight.geometry.dispose();envLight.material.dispose();
 scene.add(new T.HemisphereLight('#d4e9ff','#75805e',2.5));const sun=new T.DirectionalLight('#fff0d1',3);sun.position.set(-180,260,120);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:600});sun.shadow.bias=-.0003;scene.add(sun,sun.target);
 let chaseState={yaw:0},wasChase=false,lastChaseCar;
 let group=new T.Group();scene.add(group);let carGroup,frontWheels=[],steeringWheel,guideGroup=new T.Group(),importedWheels=[],roadSurface,groundSurface,barriers,generation=0;
 function box(parent,w,h,d,color,x,y,z){const m=new T.Mesh(new T.BoxGeometry(w,h,d),typeof color==='object'?color:mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function ribbon(track,left,right,height,material){const pos=[],indices=[];for(let i=0;i<=track.n;i++){const p=track.pts[i%track.n];for(let side of [left,right]){let o=typeof side==='function'?side(p,i):side;pos.push(p.x+p.nx*o,p.y+height,p.z+p.nz*o);}if(i<track.n){let j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new T.Mesh(geo,material);mesh.receiveShadow=true;group.add(mesh);return mesh;}
 function sign(text,w=3,h=1,bg='#101f2c',fg='#e6f3db'){let c=document.createElement('canvas');c.width=512;c.height=128;let ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=fg;ctx.font='bold 58px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,67);let tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}));}
 async function build(track,mode,team='ferrari',progress=()=>{}){
 const token=++generation;carGroup=null;roadSurface=null;groundSurface=null;barriers=null;importedWheels=[];
 scene.remove(group);disposeModel(group);group=new T.Group();scene.add(group);guideGroup=new T.Group();group.add(guideGroup);
 if(track.modelFile){
  progress('Loading '+track.name+' scenery…');let model=await loadModel('./Race Track Models/'+track.modelFile);if(token!==generation){disposeModel(model);return false;}model.scale.setScalar(track.modelScale||1);model.updateMatrixWorld(true);group.add(model);
  const roadMeshes=[],groundMeshes=[],barrierMeshes=[],roadPattern=new RegExp(track.roadPattern);
  model.traverse(o=>{if(!o.isMesh)return;o.receiveShadow=true;o.castShadow=false;const materials=Array.isArray(o.material)?o.material:[o.material];for(let m of materials){if(m.map)m.map.anisotropy=4;}
   const name=materials[0].name,isRoad=roadPattern.test(name),isBarrier=new RegExp(track.barrierPattern||'(?!)','i').test(name),isGround=isRoad||new RegExp(track.groundPattern||'(?!)','i').test(name);if(!isGround&&!isBarrier)return;
   const positions=[],v=new T.Vector3(),a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);positions.push(v.x,v.y,v.z);}const mesh={positions,indices:o.geometry.index?Array.from(o.geometry.index.array):Array.from({length:a.count},(_,i)=>i)};if(isGround)groundMeshes.push(mesh);if(isRoad)roadMeshes.push(mesh);if(isBarrier)barrierMeshes.push(mesh);
  });roadSurface=new SurfaceGrid(roadMeshes);groundSurface=new SurfaceGrid(groundMeshes);barriers=new BarrierGrid(barrierMeshes);
  await buildSelectedCar(mode,team,token,progress);return token===generation;
 }
 const street=track.theme==='city',grass=track.theme==='texas'?'#82836a':street?'#788a7d':'#71835c';
 const ground=new T.Mesh(new T.PlaneGeometry(12000,12000),mat(grass));ground.rotation.x=-Math.PI/2;ground.position.y=-13;ground.receiveShadow=true;group.add(ground);
 const double=T.DoubleSide;
 // A low terrain surface instead of broad elevated ribbons, which can cross
 // above neighbouring streets at different heights on compact circuits.
 const bounds=track.bounds,terrainPos=[],terrainIdx=[],cell=35;
 const x0=bounds.minX-250,z0=bounds.minZ-250,nx=Math.ceil((bounds.maxX-bounds.minX+500)/cell),nz=Math.ceil((bounds.maxZ-bounds.minZ+500)/cell);
 for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){let x=x0+ix*cell,z=z0+iz*cell,bestD=Infinity,nearY=0,low=Infinity;for(let j=0;j<track.n;j+=5){let p=track.pts[j],d=(p.x-x)**2+(p.z-z)**2;if(d<bestD){bestD=d;nearY=p.y;}if(d<10000)low=Math.min(low,p.y);}terrainPos.push(x,(Number.isFinite(low)?low:nearY)-4,z);if(ix<nx&&iz<nz){let a=iz*(nx+1)+ix;terrainIdx.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}}
 let terrainGeo=new T.BufferGeometry();terrainGeo.setAttribute('position',new T.Float32BufferAttribute(terrainPos,3));terrainGeo.setIndex(terrainIdx);terrainGeo.computeVertexNormals();let terrain=new T.Mesh(terrainGeo,mat(grass,{side:double}));terrain.receiveShadow=true;group.add(terrain);
 ribbon(track,p=>-p.width/2-(street?1.3:13),p=>p.width/2+(street?1.3:13),-.11,mat(grass,{side:double}));
 for(let side of [-1,1]){const vertices=[],faces=[];for(let i=0;i<=track.n;i++){let p=track.pts[i%track.n],o=side*(p.width/2+(street?1.3:13));vertices.push(p.x+p.nx*o,p.y-.12,p.z+p.nz*o,p.x+p.nx*o,-13,p.z+p.nz*o);if(i<track.n){let j=i*2;faces.push(j,j+1,j+2,j+1,j+3,j+2);}}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(faces);g.computeVertexNormals();group.add(new T.Mesh(g,mat(street?'#89918a':grass,{side:double})));}
 if(!street){ribbon(track,p=>-p.width/2-5,p=>p.width/2+5,-.035,mat('#9b9b89',{side:double}));ribbon(track,p=>-p.width/2-1.8,p=>p.width/2+1.8,-.015,mat('#52685a',{side:double}));}
 // Procedural fine asphalt texture, generated locally.
 let texCanvas=document.createElement('canvas');texCanvas.width=128;texCanvas.height=128;let tc=texCanvas.getContext('2d'),im=tc.createImageData(128,128);let seed=27;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}for(let i=0;i<im.data.length;i+=4){let v=75+rnd()*19;im.data[i]=v;im.data[i+1]=v+2;im.data[i+2]=v+3;im.data[i+3]=255;}tc.putImageData(im,0,0);let asphalt=new T.CanvasTexture(texCanvas);asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(1,1);asphalt.colorSpace=T.SRGBColorSpace;
 let road=ribbon(track,p=>-p.width/2,p=>p.width/2,.005,mat('#b2b4b4',{map:asphalt,side:double}));let uv=[];for(let i=0;i<=track.n;i++)uv.push(0,i*track.ds/5,3,i*track.ds/5);road.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 const white=mat('#eee9db',{side:double});for(let side of [-1,1]){ribbon(track,p=>side*(p.width/2-.14),p=>side*(p.width/2-.27),.022,white);}
 const kerbGeo=new T.BoxGeometry(1.0,.09,track.ds+0.08),red=mat('#bd443b'),cream=mat('#eee9da');
 const kerbs=[new T.InstancedMesh(kerbGeo,red,track.n*2),new T.InstancedMesh(kerbGeo,cream,track.n*2)];let ki=[0,0],dummy=new T.Object3D();
 for(let i=0;i<track.n;i++){let p=track.pts[i];if(Math.abs(p.curve)>.0017){for(let side of [-1,1]){let k=Math.floor(i/2)%2;dummy.position.set(p.x+p.nx*(p.width/2+.45)*side,p.y+.04,p.z+p.nz*(p.width/2+.45)*side);dummy.rotation.set(0,Math.atan2(p.tx,p.tz),0);dummy.updateMatrix();kerbs[k].setMatrixAt(ki[k]++,dummy.matrix);}}}
 kerbs.forEach((m,i)=>{m.count=ki[i];m.receiveShadow=true;group.add(m)});
 // Barriers follow the same boundary as collision detection.
 const wallGeo=new T.BoxGeometry(.35,street?1.15:.7,track.ds+.12),walls=new T.InstancedMesh(wallGeo,mat('#c7d0ce'),track.n*2);
 for(let i=0;i<track.n;i++)for(let side of [-1,1]){let p=track.pts[i],offset=p.width/2+(street?.9:12);dummy.position.set(p.x+p.nx*offset*side,p.y+(street?.58:.35),p.z+p.nz*offset*side);dummy.rotation.set(0,Math.atan2(p.tx,p.tz),0);dummy.updateMatrix();walls.setMatrixAt(i*2+(side===1?1:0),dummy.matrix);}walls.receiveShadow=true;group.add(walls);

 // Trackside reference boards before significant braking events.
 let last=-300;for(let i=0;i<track.n;i++){if(track.speeds[i]<36&&i*track.ds-last>220){let before=sample(track,i*track.ds-90);if(track.speeds[(i+track.n-30)%track.n]>track.speeds[i]+8){for(let dist of [150,100,50]){let p=sample(track,i*track.ds-dist);let b=sign(String(dist),1.3,1.0,'#e3e8dc','#14252c');b.position.set(p.x+p.nx*(p.width/2+1.8),p.y+1.2,p.z+p.nz*(p.width/2+1.8));b.rotation.y=Math.atan2(p.tx,p.tz)+Math.PI;group.add(b);}last=i*track.ds;}}}
 let p=track.pts[0],heading=Math.atan2(p.tx,p.tz),start=new T.Group();start.position.set(p.x,p.y,p.z);start.rotation.y=heading;group.add(start);
 for(let i=0;i<Math.floor(p.width);i++)for(let j=0;j<2;j++)box(start,1,.025,.65,(i+j)%2?'#263038':'#eeeedd',i-p.width/2+.5,.04,j*.65);
 box(start,.3,6,.3,'#8d9b9c',-p.width/2-1,3,0);box(start,.3,6,.3,'#8d9b9c',p.width/2+1,3,0);box(start,p.width+2.5,1.0,.35,'#13232d',0,5.5,0);let banner=sign('FORMULA / LOCAL',p.width*.8,.65);banner.position.set(0,5.5,-.2);banner.rotation.y=Math.PI;start.add(banner);
 const buildings=new T.InstancedMesh(new T.BoxGeometry(1,1,1),mat(street?'#c2b4a3':'#c4c9c6'),180),treeTrunks=new T.InstancedMesh(new T.CylinderGeometry(.4,.6,5,5),mat('#645b46'),400),treeCrowns=new T.InstancedMesh(new T.ConeGeometry(3.6,11,6),mat('#3b5c49'),400);let bi=0,ti=0;
 for(let i=0;i<track.n;i+=street?15:23){let p=track.pts[i];for(let side of [-1,1]){let offset=p.width/2+(street?10:26)+rnd()*15,x=p.x+p.nx*offset*side,z=p.z+p.nz*offset*side;
 // Do not put scenery on a nearby section of track.
 let safe=true;for(let j=0;j<track.n;j+=5)if(Math.hypot(track.pts[j].x-x,track.pts[j].z-z)<track.pts[j].width/2+9){safe=false;break;}if(!safe)continue;
 if(street&&bi<180){let h=9+rnd()*23;dummy.position.set(x,(p.y+h-13)/2,z);dummy.rotation.set(0,Math.atan2(p.tx,p.tz),0);dummy.scale.set(8+rnd()*6,p.y+h+13,10+rnd()*7);dummy.updateMatrix();buildings.setMatrixAt(bi,dummy.matrix);buildings.setColorAt(bi,new T.Color().setHSL(.08+rnd()*.08,.12,.53+rnd()*.2));bi++;}
 else if(ti<400){dummy.scale.set(1,1,1);dummy.position.set(x,p.y+2,z);dummy.rotation.set(0,0,0);dummy.updateMatrix();treeTrunks.setMatrixAt(ti,dummy.matrix);dummy.position.y=p.y+8;dummy.updateMatrix();treeCrowns.setMatrixAt(ti,dummy.matrix);ti++;}}}
 buildings.count=bi;treeTrunks.count=treeCrowns.count=ti;group.add(buildings,treeTrunks,treeCrowns);buildings.castShadow=true;treeCrowns.castShadow=true;
 // Pit architecture and stands provide readable speed and scale cues.
 for(let i=0;i<12;i++){let p=sample(track,35+i*14),g=new T.Group();g.position.set(p.x+p.nx*(p.width/2+(street?13:21)),p.y,p.z+p.nz*(p.width/2+(street?13:21)));g.rotation.y=Math.atan2(p.tx,p.tz);group.add(g);box(g,9,4.6,12,'#b6bcb9',0,2.3,0);box(g,9.4,.25,12.4,'#263843',0,4.7,0);box(g,.1,2.3,10,'#31434a',-4.55,2.3,0);}
 if(!street)for(let j=0;j<7;j++){let p=sample(track,200+j*track.length/7),g=new T.Group();g.position.set(p.x-p.nx*35,p.y,p.z-p.nz*35);g.rotation.y=Math.atan2(p.tx,p.tz);group.add(g);for(let k=0;k<6;k++)box(g,1.8,.7,45,k%2?'#536f84':'#98acb4',k*1.8,k*.7,0);box(g,14,.35,49,'#c4c8c1',5,7,0);}
 // Broad background landscape, deliberately stylised rather than false landmarks.
 if(track.theme==='alpine')for(let i=0;i<16;i++){let h=150+rnd()*260,m=new T.Mesh(new T.ConeGeometry(400,h,6),mat('#7b8f81'));m.position.set(Math.cos(i)*2200,h/2-30,Math.sin(i)*2200);group.add(m);}
 await buildSelectedCar(mode,team,token,progress);return token===generation;
 }
 async function buildSelectedCar(mode,team,token,progress){if(mode==='rally'){buildCar(mode);return;}progress('Loading team car…');let model=await loadTeam(team);if(token!==generation){disposeModel(model.root);return;}carGroup=model.root;group.add(carGroup);importedWheels=model.wheels;frontWheels=[];steeringWheel=model.steering;}
 async function changeTeam(team,progress){const token=++generation;if(carGroup){group.remove(carGroup);disposeModel(carGroup);carGroup=null;}importedWheels=[];await buildSelectedCar('formula',team,token,progress);return token===generation;}
 function surfaceAt(x,z,road,car,vehicle){if(!roadSurface)return road;const h=roadSurface.height(x,z),ground=groundSurface.height(x,z);let wheelGrip=[],wheelsOff=0;if(car&&vehicle)for(let long of [vehicle.a,-vehicle.b])for(let side of [-1,1]){let lat=side*vehicle.track/2,wx=x+Math.sin(car.yaw)*long+Math.cos(car.yaw)*lat,wz=z+Math.cos(car.yaw)*long-Math.sin(car.yaw)*lat;let off=roadSurface.height(wx,wz)===null;wheelsOff+=Number(off);wheelGrip.push(off?.90:1);}return {...road,y:h??ground??road.y,surfaceOff:h===null,wheelGrip,wheelsOff};}
 function buildCar(mode){carGroup=new T.Group();group.add(carGroup);frontWheels=[];const body=mat('#c3f36d',{metalness:.3,roughness:.38}),carbon=mat('#17242b',{roughness:.55}),tyre=mat('#151a1e');
 if(mode==='formula'){
 box(carGroup,1.1,.36,3.5,body,0,.48,-.3);box(carGroup,.48,.22,2.5,body,0,.40,1.65);box(carGroup,1.8,.12,3.0,carbon,0,.2,-.5);box(carGroup,1.8,.42,1.4,body,0,.55,-.75);box(carGroup,1.95,.11,.65,carbon,0,.26,2.75);box(carGroup,1.85,.12,.55,body,0,1.05,-2.05);for(let s of [-1,1]){box(carGroup,.08,.5,.65,carbon,s*.9,.78,-2.05);box(carGroup,.06,.07,3.8,carbon,s*.61,.4,.1);}
 box(carGroup,.65,.16,.8,carbon,0,.78,.05);let helmet=new T.Mesh(new T.SphereGeometry(.22,16,12),mat('#f3f0e7'));helmet.position.set(0,.92,-.24);carGroup.add(helmet);let visor=box(carGroup,.35,.08,.15,'#253b44',0,.95,-.04);
 let halo=new T.Mesh(new T.TorusGeometry(.48,.045,6,24,Math.PI),carbon);halo.rotation.x=Math.PI/2;halo.position.set(0,1.06,.22);carGroup.add(halo);box(carGroup,.055,.36,.06,carbon,0,.9,.69);
 }else{box(carGroup,1.7,.65,3.8,body,0,.65,0);box(carGroup,1.5,.65,1.95,carbon,0,1.27,-.2);box(carGroup,1.55,.08,2.0,body,0,1.63,-.2);box(carGroup,1.8,.12,.4,carbon,0,1.45,-1.8);for(let s of [-1,1])box(carGroup,.4,.18,.08,'#fff2cd',s*.56,.78,1.94);}
 for(let z of [mode==='formula'?1.75:1.25,mode==='formula'?-1.65:-1.35])for(let x of [-.91,.91]){let pivot=new T.Group();pivot.position.set(x,.36,z);carGroup.add(pivot);let wheel=new T.Mesh(new T.CylinderGeometry(.36,.36,mode==='formula'?.4:.28,20),tyre);wheel.rotation.z=Math.PI/2;wheel.castShadow=true;pivot.add(wheel);let ring=new T.Mesh(new T.TorusGeometry(.29,.018,4,24),mat('#d6bb55'));ring.rotation.y=Math.PI/2;ring.position.x=x>0?.21:-.21;pivot.add(ring);if(z>0)frontWheels.push(pivot);}
 steeringWheel=box(carGroup,.46,.13,.08,carbon,0,.83,.47);
 }
 const opponents=new Map();
 function raceOpponents(players,dt=0){
  const ids=new Set(players.map(p=>p.id));for(const [id,entry]of opponents)if(!ids.has(id)){if(entry.model){scene.remove(entry.model.root);disposeModel(entry.model.root);}opponents.delete(id);}
  for(const p of players){let entry=opponents.get(p.id);if(!entry){entry={};opponents.set(p.id,entry);loadTeam(p.team).then(model=>{if(opponents.get(p.id)!==entry){disposeModel(model.root);return;}entry.model=model;scene.add(model.root);}).catch(console.error);}if(!entry.model)continue;
   const root=entry.model.root,c=p.car,blend=1;root.position.lerp(new T.Vector3(c.x,c.y+.035,c.z),blend);root.rotation.y+=Math.atan2(Math.sin(c.yaw-root.rotation.y),Math.cos(c.yaw-root.rotation.y))*blend;root.visible=!p.dnf;for(const w of entry.model.wheels){w.pivot.rotation.y=w.front?c.steer:0;w.spin.rotation.x=c.distance/.36;}entry.placed=true;
  }
 }
 function render(car,road,track,view,menu,time,dt,guide){
 if(!carGroup)return;guideGroup.visible=false;carGroup.position.set(car.x,road.y+.035,car.z);carGroup.rotation.set(-Math.atan(road.slope||0),car.yaw,-car.ay*.0004);frontWheels.forEach(w=>w.rotation.y=car.steer);if(steeringWheel)steeringWheel.rotation.z=-car.steer*3;for(let w of importedWheels){w.pivot.rotation.y=w.front?car.steer:0;w.spin.rotation.x=car.distance/.36;}
 let f=new T.Vector3(Math.sin(car.yaw),0,Math.cos(car.yaw)),pos=new T.Vector3(car.x,road.y,car.z),target,look;
 if(menu){let t=time*.035;target=pos.clone().add(new T.Vector3(Math.sin(t)*19,9,Math.cos(t)*19));look=pos.clone().add(new T.Vector3(0,.6,0));carGroup.visible=true;}
 else if(view==='chase'){if(!wasChase||lastChaseCar!==car||Math.hypot(camera.position.x-car.x,camera.position.z-car.z)>30)chaseState.yaw=car.yaw;const rig=chasePose(car,road.y,chaseState,dt);target=new T.Vector3(rig.position.x,rig.position.y,rig.position.z);look=new T.Vector3(rig.look.x,rig.look.y,rig.look.z);carGroup.visible=true;}
 else{let cockpit=view==='cockpit';target=pos.clone().addScaledVector(f,cockpit?.10:-.85).add(new T.Vector3(0,cockpit?1.03:1.65,0));look=target.clone().addScaledVector(f,55).add(new T.Vector3(0,(road.slope||0)*55-(cockpit?.7:6.5),0));carGroup.visible=true;}
 lastChaseCar=car;wasChase=!menu&&view==='chase';camera.position.lerp(target,menu?1-Math.exp(-dt*6):1);camera.lookAt(look);sun.position.set(car.x-140,road.y+220,car.z+120);sun.target.position.set(car.x,road.y,car.z);sun.target.updateMatrixWorld();renderer.render(scene,camera);
 }
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
 return {build,changeTeam,render,raceOpponents,renderer,surfaceAt,contact:(x,y,z)=>barriers?.contact(x,y,z)};
}

