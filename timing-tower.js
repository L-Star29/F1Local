export class TimingTower {
 constructor(){this.reset();}
 reset(){this.previous=new Map();this.splits=new Map();this.last=-Infinity;this.label='';}
 draw(el,rows,self,t,length,laps){
  if(!rows.length||t-this.last<.1)return;
  this.last=t;
  for(const p of rows){
   const d=p.progress,prev=this.previous.get(p.id),k=Math.floor(d/50);
   if(!this.splits.has(p.id))this.splits.set(p.id,new Map());
   const marks=this.splits.get(p.id);
   if(prev&&d>prev.d&&d-prev.d<100&&t>prev.t)for(let j=Math.floor(prev.d/50)+1;j<=k;j++)marks.set(j,prev.t+(t-prev.t)*(50*j-prev.d)/(d-prev.d));
   this.previous.set(p.id,{d,t});
  }
  const leader=rows[0],leadMarks=this.splits.get(leader.id);
  const lines=rows.map((p,i)=>{
   const k=Math.floor(p.progress/50),gap=this.splits.get(p.id).get(k)-leadMarks.get(k);
   let info=p.dnf?'DNF':p.ghost?'Recovering':p.finish!=null?(i===0?'Finished':'+'+Math.max(0,p.finish+(p.penalty||0)-leader.finish-(leader.penalty||0)).toFixed(2)+'s'):i===0?'Leader':leader.progress-p.progress>=length?'+'+Math.floor((leader.progress-p.progress)/length)+' lap':Number.isFinite(gap)?'+'+Math.max(0,gap).toFixed(2)+'s':'—';
   return [String(i+1),p.name+(p.id===self&&p.name!=='You'?' · You':''),info+(p.penalty&&p.finish==null?' · +'+p.penalty+'s pen':'')];
  });
  const title='LAP '+Math.max(1,Math.min(laps,1+Math.floor(leader.progress/length)))+'/'+laps+'   ·   GAP TO LEADER';
  const key=JSON.stringify([title,lines,self]);if(key===this.label)return;this.label=key;
  const head=document.createElement('small');head.textContent=title;
  el.replaceChildren(head,...lines.map((cells,i)=>{const row=document.createElement('div');row.className='towerRow'+(rows[i].id===self?' mine':'');for(const value of cells){const cell=document.createElement('span');cell.textContent=value;row.append(cell);}return row;}));
 }
}
