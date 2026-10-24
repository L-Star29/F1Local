from pathlib import Path
p=Path('surface.js');s=p.read_text(encoding='utf-8')
s=s.replace('if(high-low<.25)continue;let pairs=', '''if(high-low<.25)continue;
 const u=vs[1].map((v,k)=>v-vs[0][k]),v=vs[2].map((v,k)=>v-vs[0][k]);
 const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 // Only steep faces obstruct the car. Sloped tarmac is not a wall.
 if(Math.abs(normal[1])>Math.hypot(...normal)*.5)continue;
 let pairs=''')
p.write_text(s,encoding='utf-8')
p=Path('digital-lap-test.mjs');s=p.read_text(encoding='utf-8')
s=s.replace("const t=JSON.parse(fs.readFileSync('data/gb-1948-model-track.json')),dt=1/120;", "const reports=[];\nfor(const id of ['gb-1948','at-1969','it-1953']){\nconst t=JSON.parse(fs.readFileSync('data/'+id+'-model-track.json')),dt=1/120;")
s=s.replace('const report={completed:', 'const report={circuit:t.name,completed:')
s=s.replace("fs.writeFileSync('analysis/digital-lap-report.json',JSON.stringify(report,null,2));", 'reports.push(report);')
s+='\n}\nfs.writeFileSync(\'analysis/digital-lap-report.json\',JSON.stringify(reports,null,2));\n'
p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('HANDLING BUILD 07.1','CIRCUIT BUILD 08');s=s.replace('<span id="grip">', '<span id="assistState" aria-live="off"></span><span id="grip">');p.write_text(s,encoding='utf-8')
