// Spatial grid for exact vertical projection onto imported road triangles.
export class SurfaceGrid {
 constructor(meshes,cell=20){this.cell=cell;this.cells=new Map();for(const mesh of meshes){const p=mesh.positions,ids=mesh.indices;for(let i=0;i<ids.length;i+=3){const t=ids.slice(i,i+3).flatMap(k=>p.slice(k*3,k*3+3));const den=(t[5]-t[8])*(t[0]-t[6])+(t[6]-t[3])*(t[2]-t[8]);if(Math.abs(den)<.00001)continue;t.push(den);for(let x=Math.floor(Math.min(t[0],t[3],t[6])/cell);x<=Math.floor(Math.max(t[0],t[3],t[6])/cell);x++)for(let z=Math.floor(Math.min(t[2],t[5],t[8])/cell);z<=Math.floor(Math.max(t[2],t[5],t[8])/cell);z++){let key=x+','+z;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(t);}}}}
 height(x,z){let height=-Infinity;for(const t of this.cells.get(Math.floor(x/this.cell)+','+Math.floor(z/this.cell))||[]){const a=((t[5]-t[8])*(x-t[6])+(t[6]-t[3])*(z-t[8]))/t[9],b=((t[8]-t[2])*(x-t[6])+(t[0]-t[6])*(z-t[8]))/t[9];if(a>=-.0001&&b>=-.0001&&a+b<=1.0001)height=Math.max(height,a*t[1]+b*t[4]+(1-a-b)*t[7]);}return Number.isFinite(height)?height:null;}
}
export class BarrierGrid {
 constructor(meshes,cell=20){this.cell=cell;this.cells=new Map();for(const mesh of meshes){let p=mesh.positions;for(let i=0;i<mesh.indices.length;i+=3){let vs=mesh.indices.slice(i,i+3).map(k=>p.slice(k*3,k*3+3)),low=Math.min(...vs.map(v=>v[1])),high=Math.max(...vs.map(v=>v[1]));if(high-low<.25)continue;
 const u=vs[1].map((v,k)=>v-vs[0][k]),v=vs[2].map((v,k)=>v-vs[0][k]);
 const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 // Only steep faces obstruct the car. Sloped tarmac is not a wall.
 if(Math.abs(normal[1])>Math.hypot(...normal)*.5)continue;
 let pairs=[[vs[0],vs[1]],[vs[1],vs[2]],[vs[2],vs[0]]].sort((a,b)=>Math.hypot(b[0][0]-b[1][0],b[0][2]-b[1][2])-Math.hypot(a[0][0]-a[1][0],a[0][2]-a[1][2]));let [a,b]=pairs[0];if(Math.hypot(a[0]-b[0],a[2]-b[2])<.1)continue;let edge={a,b,low,high};for(let x=Math.floor((Math.min(a[0],b[0])-1.2)/cell);x<=Math.floor((Math.max(a[0],b[0])+1.2)/cell);x++)for(let z=Math.floor((Math.min(a[2],b[2])-1.2)/cell);z<=Math.floor((Math.max(a[2],b[2])+1.2)/cell);z++){let key=x+','+z;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(edge);}}}}
 contact(x,y,z){let best=null;for(let e of this.cells.get(Math.floor(x/this.cell)+','+Math.floor(z/this.cell))||[]){if(e.low>y+1||e.high<y+.15)continue;let dx=e.b[0]-e.a[0],dz=e.b[2]-e.a[2],f=Math.max(0,Math.min(1,((x-e.a[0])*dx+(z-e.a[2])*dz)/(dx*dx+dz*dz))),ox=x-e.a[0]-f*dx,oz=z-e.a[2]-f*dz,d=Math.hypot(ox,oz);if(d<1.05&&d>.0001&&(!best||d<best.d))best={d,nx:ox/d,nz:oz/d};}return best;}
}
export function refreshTrack(t){const p=t.pts,n=p.length;let length=0;for(let i=0;i<n;i++){p[i].s=length;let b=p[(i+1)%n];length+=Math.hypot(b.x-p[i].x,b.z-p[i].z);} // resample to uniform spacing for lap and minimap code
 const ds=length/n,pts=[];let k=0;for(let i=0;i<n;i++){const s=i*ds;while(k+1<n&&p[k+1].s<s)k++;let a=p[k],b=p[(k+1)%n],f=(s-a.s)/((k+1<n?b.s:length)-a.s);pts.push({...a,s,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f,width:a.width+(b.width-a.width)*f});}
 for(let i=0;i<n;i++){let a=pts[(i+n-1)%n],b=pts[(i+1)%n],v=pts[i],d=Math.hypot(b.x-a.x,b.z-a.z);v.tx=(b.x-a.x)/d;v.tz=(b.z-a.z)/d;v.nx=-v.tz;v.nz=v.tx;v.slope=(b.y-a.y)/d;v.curve=Math.atan2((v.x-a.x)*(b.z-v.z)-(v.z-a.z)*(b.x-v.x),(v.x-a.x)*(b.x-v.x)+(v.z-a.z)*(b.z-v.z))/ds;}
 return {...t,pts,n,ds,length,bounds:{minX:Math.min(...pts.map(p=>p.x)),maxX:Math.max(...pts.map(p=>p.x)),minZ:Math.min(...pts.map(p=>p.z)),maxZ:Math.max(...pts.map(p=>p.z))}};
}
