export const specs=[
 {id:'gb-1948',name:'Silverstone',country:'GREAT BRITAIN',length:5891,turns:18,cw:true,start:[-1.0218,52.0704],width:14,theme:'park',heights:[[0,0],[.2,3],[.5,-3],[.8,2],[1,0]]},
 {id:'mc-1929',name:'Monaco',country:'MONTE CARLO',length:3337,turns:19,cw:true,start:[7.4246,43.7347],width:9,theme:'city',heights:[[0,0],[.1,13],[.23,40],[.31,30],[.43,4],[.61,0],[1,0]]},
 {id:'az-2016',name:'Baku',country:'AZERBAIJAN',length:6003,turns:20,cw:false,start:[49.8533,40.3727],width:12,theme:'city',heights:[[0,0],[.32,0],[.43,18],[.51,26],[.65,0],[1,0]]},
 {id:'at-1969',name:'Austria',country:'RED BULL RING',length:4318,turns:10,cw:true,start:[14.7648,47.2197],width:13,theme:'alpine',heights:[[0,0],[.16,22],[.38,63],[.57,30],[.75,20],[1,0]]},
 {id:'us-2012',name:'COTA',country:'AUSTIN, TEXAS',length:5513,turns:20,cw:false,start:[-97.6396,30.132],width:15,theme:'texas',heights:[[0,0],[.075,30],[.24,4],[.4,-8],[.62,-4],[.8,8],[1,0]]}
];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
export function makeTrack(feature,spec){
 let raw=feature.geometry.coordinates.map(p=>p.slice(0,2));
 if(Math.hypot(raw[0][0]-raw.at(-1)[0],raw[0][1]-raw.at(-1)[1])<1e-6)raw.pop();
 let area=raw.reduce((a,p,i)=>{let q=raw[(i+1)%raw.length];return a+p[0]*q[1]-q[0]*p[1]},0);
 if((area<0)!==spec.cw)raw.reverse();
 let start=raw.reduce((best,p,i)=>Math.hypot((p[0]-spec.start[0])*Math.cos(p[1]*Math.PI/180),p[1]-spec.start[1])<Math.hypot((raw[best][0]-spec.start[0])*Math.cos(p[1]*Math.PI/180),raw[best][1]-spec.start[1])?i:best,0);
 raw=[...raw.slice(start),...raw.slice(0,start)];
 const origin=raw[0],cos=Math.cos(origin[1]*Math.PI/180);
 raw=raw.map(p=>({x:(p[0]-origin[0])*111320*cos,z:-(p[1]-origin[1])*111320}));
 // Local quadratic corner fillets, capped at 8 metres: preserve street chicanes.
 const shaped=[];
 for(let i=0;i<raw.length;i++){const a=raw[(i+raw.length-1)%raw.length],b=raw[i],c=raw[(i+1)%raw.length];const l1=Math.hypot(b.x-a.x,b.z-a.z),l2=Math.hypot(c.x-b.x,c.z-b.z),cut=Math.min(8,l1*.22,l2*.22);const u={x:b.x+(a.x-b.x)*cut/l1,z:b.z+(a.z-b.z)*cut/l1},v={x:b.x+(c.x-b.x)*cut/l2,z:b.z+(c.z-b.z)*cut/l2};for(let j=0;j<=4;j++){let t=j/4;shaped.push({x:(1-t)**2*u.x+2*t*(1-t)*b.x+t*t*v.x,z:(1-t)**2*u.z+2*t*(1-t)*b.z+t*t*v.z});}}
 let lengths=[0];for(let i=1;i<=shaped.length;i++){let a=shaped[i-1],b=shaped[i%shaped.length];lengths.push(lengths.at(-1)+Math.hypot(b.x-a.x,b.z-a.z));}const scale=spec.length/lengths.at(-1),n=Math.ceil(spec.length/3),ds=spec.length/n,pts=[];let k=0;
 function elevation(t){let h=spec.heights;for(let i=1;i<h.length;i++)if(t<=h[i][0]){let f=(t-h[i-1][0])/(h[i][0]-h[i-1][0]);return mix(h[i-1][1],h[i][1],f*f*(3-2*f));}return 0;}
 for(let i=0;i<n;i++){let d=i*ds/scale;while(lengths[k+1]<d)k++;let t=(d-lengths[k])/(lengths[k+1]-lengths[k]),a=shaped[k],b=shaped[(k+1)%shaped.length];pts.push({x:mix(a.x,b.x,t)*scale,z:mix(a.z,b.z,t)*scale,y:elevation(i/n),s:i*ds});}
 for(let i=0;i<n;i++){let p=pts[i],a=pts[(i+n-1)%n],b=pts[(i+1)%n];let l=Math.hypot(b.x-a.x,b.z-a.z);p.tx=(b.x-a.x)/l;p.tz=(b.z-a.z)/l;p.nx=-p.tz;p.nz=p.tx;let cross=(p.x-a.x)*(b.z-p.z)-(p.z-a.z)*(b.x-p.x),dot=(p.x-a.x)*(b.x-p.x)+(p.z-a.z)*(b.z-p.z);p.curve=Math.atan2(cross,dot)/ds;p.width=spec.width;
 if(spec.id==='mc-1929')p.width=8.5+1.8*Math.pow(Math.cos(i/n*6),2);
 if(spec.id==='az-2016')p.width=i/n>.35&&i/n<.49?7.6:12+2*Math.pow(Math.cos(i/n*9),2);
 if(spec.theme!=='city')p.width=spec.width+2*Math.pow(Math.sin(i/n*11),2);
 p.slope=(b.y-a.y)/(2*ds);}
 // Conservative centre-line speed envelope with backward braking propagation.
 let speeds=pts.map(p=>Math.min(91,Math.sqrt(15/Math.max(Math.abs(p.curve)-.0014,.0018))));
 for(let pass=0;pass<3;pass++)for(let i=n-1;i>=0;i--)speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[(i+1)%n]**2+2*22*ds));
 const bounds={minX:Math.min(...pts.map(p=>p.x)),maxX:Math.max(...pts.map(p=>p.x)),minZ:Math.min(...pts.map(p=>p.z)),maxZ:Math.max(...pts.map(p=>p.z))};
 return {...spec,pts,n,ds,bounds,speeds,scale};
}
export function sample(t,s){let u=((s%t.length)+t.length)%t.length/t.ds,i=Math.floor(u),f=u-i,a=t.pts[i],b=t.pts[(i+1)%t.n];return {...a,x:mix(a.x,b.x,f),y:mix(a.y,b.y,f),z:mix(a.z,b.z,f)};}
export function nearest(t,x,z){let best=Infinity,out;for(let i=0;i<t.n;i++){const a=t.pts[i],b=t.pts[(i+1)%t.n],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),px=a.x+u*dx,pz=a.z+u*dz,d=(x-px)**2+(z-pz)**2;if(d<best){best=d;out={...a,x:px,z:pz,y:mix(a.y,b.y,u),index:i,s:(i+u)*t.ds,offset:(x-px)*a.nx+(z-pz)*a.nz,distance:Math.sqrt(d)}}}return out;}
