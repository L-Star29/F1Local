import assert from 'node:assert/strict';
import {teams,loadTeam,disposeModel} from './model-assets.js';
import * as T from './vendor/three.module.js';
T.DefaultLoadingManager.setURLModifier(url=>url.startsWith('./')?new URL(url,'http://127.0.0.1:4173/').href:url);
globalThis.self=globalThis;
const fetchOriginal=globalThis.fetch;
globalThis.fetch=(url,opts)=>fetchOriginal(typeof url==='string'&&url.startsWith('./')?new URL(url,'http://127.0.0.1:4173/'):url,opts);
globalThis.ProgressEvent=class{constructor(type,props){Object.assign(this,props);this.type=type;}};
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
for(let team of teams){const car=await loadTeam(team.id);assert.equal(car.wheels.length,4);for(let w of car.wheels){assert.ok(Math.abs(w.pivot.position.x)>.5);assert.ok(Math.abs(w.pivot.position.z)>1);for(let child of w.spin.children){let box=new T.Box3().setFromObject(child);assert.ok(box.getSize(new T.Vector3()).length()<2,'wheel geometry must stay local to its hub');}let start=w.pivot.position.clone();w.spin.rotation.x=7;w.pivot.rotation.y=w.front?.15:0;car.root.updateMatrixWorld(true);assert.ok(w.pivot.position.distanceTo(start)<1e-8);}console.log(team.name,'four independent wheel pivots passed');disposeModel(car.root);}
