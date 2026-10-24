from pathlib import Path
p=Path('game.js');s=p.read_text(encoding='utf-8')
s="import {feedbackLevels,createTyreAudio} from './driving-feedback.js';\n"+s
s=s.replace('let busy=false,offTrackSeconds=0;', 'let busy=false,offTrackSeconds=0,tyreAudio,assistLabelUntil=0,assistLabel=\'\';')
s=s.replace('audio=new AudioContext();engine=', 'audio=new AudioContext();tyreAudio=createTyreAudio(audio);engine=')
s=s.replace('if(gain)gain.gain.value=0;', 'if(gain)gain.gain.value=0;tyreAudio?.mute();')
s=s.replace("function hud(){", "function hud(){const feedback=feedbackLevels(car);if(feedback.abs){assistLabel=feedback.abs;assistLabelUntil=performance.now()+160;}$('assistState').textContent=performance.now()<assistLabelUntil?assistLabel:'';")
s=s.replace('if(audio){gain.gain.setTargetAtTime', 'if(audio){tyreAudio?.update(car,active&&!muted);gain.gain.setTargetAtTime')
p.write_text(s,encoding='utf-8')
p=Path('digital-lap-test.mjs');s=p.read_text(encoding='utf-8')
s="import {readModel} from './inspect-models.mjs';\nimport {SurfaceGrid} from './surface.js';\n"+s
s=s.replace('let c=newCar', "const surface=new SurfaceGrid(readModel('Race Track Models/'+t.modelFile).meshes.filter(m=>new RegExp(t.roadPattern).test(m.material)).map(m=>({...m,positions:m.positions.map(v=>v*t.modelScale)})));\nlet allWheelsOff=0;\nlet c=newCar")
s=s.replace("step(c,keys,road,'formula'", "const wheelGrip=[];for(const long of [vehicles.formula.a,-vehicles.formula.b])for(const lat of [-.81,.81])wheelGrip.push(surface.height(c.x+Math.sin(c.yaw)*long+Math.cos(c.yaw)*lat,c.z+Math.cos(c.yaw)*long-Math.sin(c.yaw)*lat)===null?.9:1);road.wheelGrip=wheelGrip;if(wheelGrip.every(g=>g<1))allWheelsOff+=dt;\n step(c,keys,road,'formula'")
s=s.replace('secondsOutsideConservativeWidth:outside,','secondsOutsideConservativeWidth:outside,secondsAllWheelsOff:allWheelsOff,')
s=s.replace('assert.ok(outside<1);','assert.ok(allWheelsOff<.1,t.name+\' left the imported road\');')
p.write_text(s,encoding='utf-8')
