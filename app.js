/* =====================================================================
   Trang gồm bảy phần, đọc từ trên xuống:
   1 Tiện ích và mô hình dữ liệu   2 Bố cục 3D   3 Vẽ thẻ nút   4 Cảnh 3D
   5 Trạng thái và hành động       6 Giao diện   7 Nguồn tin trực tiếp
   Dữ liệu đồ thị ở data.js, lớp biên tập (lời dẫn, tin, cổ phiếu) ở content.js.
   ===================================================================== */

/* ---------- 1. TIỆN ÍCH VÀ MÔ HÌNH DỮ LIỆU ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad2=v=>String(v).padStart(2,'0');
const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
const coarse=matchMedia('(pointer:coarse)').matches;
const prefs=(()=>{try{return JSON.parse(localStorage.getItem('bbn-prefs'))||{}}catch(e){return {}}})();
const savePrefs=()=>{try{localStorage.setItem('bbn-prefs',JSON.stringify(prefs))}catch(e){}};

const nodes=N.map(([id,label,type,desc])=>({id,label,type,desc,deg:0,camp:campOf[id]||'mid',since:SINCE[id]||0}));
const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
const edges=E.map(([s,t,label,tier,src],i)=>({s:byId[s],t:byId[t],label,tier,src,off:(i*.137)%1}));
edges.forEach(e=>{e.s.deg++;e.t.deg++;e.since=Math.max(e.s.since,e.t.since)});
const TOUR=PATHS.slice(1);
const neighbours=n=>{const m=new Map();edges.forEach(e=>{if(e.s!==n&&e.t!==n)return;const o=e.s===n?e.t:e.s;if(!m.has(o.id))m.set(o.id,{o,e})});return [...m.values()]};
const monogram=n=>{const w=n.label.split(' ').filter(Boolean);return (w[0][0]+(w.length>1?w[w.length-1][0]:'')).toUpperCase()};
/* tin và cổ phiếu: bản dự phòng đóng sẵn trong trang, được thay bằng dữ liệu trực tiếp khi có */
let news=NEWS.map(([d,src,sid,title,sum,why,ns])=>({d,src,url:S[sid][1],direct:!!S[sid][2],title,sum,why,nodes:ns}));
let stocks=STOCKS.map(([sym,name,pct,note,node])=>({sym,name,pct,note,node}));
let feed={live:false,label:'12/11',updated:''};

/* ---------- 2. BỐ CỤC 3D: mô phỏng lực với hạt giống cố định, lần nào mở cũng ra cùng một hình ---------- */
(function layout(){
  let a=20261112;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  nodes.forEach(n=>{n.x=(rnd()-.5)*200;n.y=(rnd()-.5)*200;n.z=(rnd()-.5)*200;n.vx=n.vy=n.vz=0});
  for(let it=0;it<560;it++){const k=1-it/560;
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const p=nodes[i],q=nodes[j];let dx=p.x-q.x,dy=p.y-q.y,dz=p.z-q.z;const d2=dx*dx+dy*dy+dz*dz+.01,d=Math.sqrt(d2),f=3200/d2;
      dx/=d;dy/=d;dz/=d;p.vx+=dx*f;p.vy+=dy*f;p.vz+=dz*f;q.vx-=dx*f;q.vy-=dy*f;q.vz-=dz*f}
    edges.forEach(e=>{const p=e.s,q=e.t;let dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z;const d=Math.sqrt(dx*dx+dy*dy+dz*dz)+.01,f=(d-48)*.03;
      dx/=d;dy/=d;dz/=d;p.vx+=dx*f;p.vy+=dy*f;p.vz+=dz*f;q.vx-=dx*f;q.vy-=dy*f;q.vz-=dz*f});
    nodes.forEach(n=>{n.vx-=n.x*.005;n.vy-=n.y*.008;n.vz-=n.z*.005;const m=Math.min(1,7*k/(Math.hypot(n.vx,n.vy,n.vz)+.001)+.15*k);
      n.x+=n.vx*m;n.y+=n.vy*m;n.z+=n.vz*m;n.vx*=.6;n.vy*=.6;n.vz*=.6})}
})();

/* ---------- 3. VẼ THẺ NÚT lên canvas 2D. SC là tỷ lệ độ phân giải, hạ xuống trên máy yếu ---------- */
let SC=1;
const PERSON=[512,672,58],TILE=[760,236,54];
function rr(x,X,Y,W,H,R){x.beginPath();x.moveTo(X+R,Y);x.arcTo(X+W,Y,X+W,Y+H,R);x.arcTo(X+W,Y+H,X,Y+H,R);x.arcTo(X,Y+H,X,Y,R);x.arcTo(X,Y,X+W,Y,R);x.closePath()}
function fit(x,text,max,size,weight,fam,min){for(;;){x.font=`${weight} ${size}px ${fam}`;if(x.measureText(text).width<=max||size<=min)return;size-=2}}
function wrap2(x,text,max){let a='',b='';for(const t of text.split(' ')){if(!b&&x.measureText((a+' '+t).trim()).width<=max)a=(a+' '+t).trim();else b=(b+' '+t).trim()}return [a,b]}
function rgba(hex,a){const v=parseInt(hex.slice(1),16);return `rgba(${v>>16},${v>>8&255},${v&255},${a})`}
function glyphPath(x,type,gx,gy,r){
  if(type==='event'){x.beginPath();x.arc(gx,gy,r*.75,0,7);x.stroke()}
  else if(type==='company'){rr(x,gx-r*.75,gy-r*.75,r*1.5,r*1.5,r*.28);x.fill()}
  else if(type==='gov'){x.beginPath();x.moveTo(gx,gy-r);x.lineTo(gx+r,gy);x.lineTo(gx,gy+r);x.lineTo(gx-r,gy);x.closePath();x.fill()}
  else if(type==='tech'){x.beginPath();x.moveTo(gx,gy-r*.94);x.lineTo(gx+r*.94,gy+r*.72);x.lineTo(gx-r*.94,gy+r*.72);x.closePath();x.fill()}
  else if(type==='policy'){x.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i;x.lineTo(gx+r*.92*Math.cos(a),gy+r*.92*Math.sin(a))}x.closePath();x.fill()}
  else{x.setLineDash([r*.3,r*.28]);x.beginPath();x.arc(gx,gy,r*.75,0,7);x.stroke();x.setLineDash([])}
}
function card(n,img){
  const col=CAMP[n.camp].c,c=document.createElement('canvas'),x=c.getContext('2d'),SANS='Inter, system-ui, sans-serif';let g;
  const [W,H,R]=n.type==='person'?PERSON:TILE;c.width=W*SC;c.height=H*SC;x.scale(SC,SC);
  const frame=()=>{rr(x,6,6,W-12,H-12,R)};
  frame();g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1B242D');g.addColorStop(.5,'#0E1319');g.addColorStop(1,'#06080B');x.fillStyle=g;x.fill();
  if(n.type==='person'){
    x.save();frame();x.clip();
    if(img){const s=Math.max(W/img.width,438/img.height),iw=img.width*s,ih=img.height*s;x.save();x.beginPath();x.rect(0,0,W,438);x.clip();x.drawImage(img,(W-iw)/2,(438-ih)/2,iw,ih);x.restore()}
    else{g=x.createRadialGradient(W/2,236,10,W/2,236,330);g.addColorStop(0,rgba(col,.62));g.addColorStop(.55,rgba(col,.14));g.addColorStop(1,rgba(col,0));x.fillStyle=g;x.fillRect(0,0,W,440);
      x.strokeStyle='rgba(255,255,255,.07)';x.lineWidth=2;[132,188,244].forEach(r=>{x.beginPath();x.arc(W/2,236,r,0,7);x.stroke()})}
    x.fillStyle='rgba(5,7,10,.78)';x.fillRect(0,440,W,H-440);x.fillStyle=col;x.fillRect(0,438,W,3);x.restore();
    if(!img){x.textBaseline='alphabetic';x.textAlign='left';x.font=`600 22px ${SANS}`;x.fillStyle=rgba(col,.95);x.fillText(CAMP[n.camp].tag,40,62);
      x.textAlign='right';x.fillStyle='rgba(255,255,255,.42)';x.fillText(pad2(n.deg),W-40,62);
      x.textAlign='center';x.textBaseline='middle';x.font='600 204px "Noto Serif", Georgia, serif';x.shadowColor=rgba(col,.9);x.shadowBlur=46;x.fillStyle='#FFFFFF';x.fillText(monogram(n),W/2,248);x.shadowBlur=0}
    x.textAlign='center';x.textBaseline='alphabetic';fit(x,n.label,W-76,52,600,SANS,30);x.fillStyle='#FFFFFF';x.fillText(n.label,W/2,532);
    fit(x,ROLE[n.id]||'',W-76,34,400,SANS,24);x.fillStyle='#BAC4CE';x.fillText(ROLE[n.id]||'',W/2,592);
  }else{
    const gx=104,gy=H/2;
    x.save();frame();x.clip();g=x.createRadialGradient(gx,gy,4,gx,gy,230);g.addColorStop(0,rgba(col,.42));g.addColorStop(1,rgba(col,0));x.fillStyle=g;x.fillRect(0,0,420,H);x.restore();
    if(img){x.save();rr(x,40,54,128,128,26);x.clip();x.fillStyle='#0D1114';x.fillRect(40,54,128,128);const s=Math.min(128/img.width,128/img.height),iw=img.width*s,ih=img.height*s;x.drawImage(img,gx-iw/2,gy-ih/2,iw,ih);x.restore()}
    else{x.fillStyle=col;x.strokeStyle=col;x.lineWidth=9;x.shadowColor=rgba(col,.9);x.shadowBlur=26;glyphPath(x,n.type,gx,gy,36);x.shadowBlur=0}
    x.textAlign='left';x.textBaseline='alphabetic';const TX=178,MAX=W-TX-44;x.font=`600 56px ${SANS}`;
    if(x.measureText(n.label).width<=MAX*1.32){x.font=`600 21px ${SANS}`;x.fillStyle=rgba(col,.9);x.fillText(KIND[n.type],TX,84);fit(x,n.label,MAX,56,600,SANS,42);x.fillStyle='#FFFFFF';x.fillText(n.label,TX,154)}
    else{x.font=`600 42px ${SANS}`;const l=wrap2(x,n.label,MAX);x.fillStyle='#FFFFFF';x.fillText(l[0],TX,104);x.fillText(l[1],TX,158,MAX)}
  }
  x.save();frame();x.clip();g=x.createLinearGradient(0,0,0,H*.5);g.addColorStop(0,'rgba(255,255,255,.13)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,W,H*.5);
  g=x.createLinearGradient(0,H*.72,0,H);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.42)');x.fillStyle=g;x.fillRect(0,H*.72,W,H*.28);x.restore();
  frame();x.lineWidth=5;x.strokeStyle=rgba(col,.96);if(n.type==='idea')x.setLineDash([18,14]);x.stroke();x.setLineDash([]);
  rr(x,13,13,W-26,H-26,R-7);x.lineWidth=2;x.strokeStyle='rgba(255,255,255,.14)';x.stroke();
  const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=8;return t;
}
function softTex(w,h,sx,stops){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.translate(w/2,h/2);x.scale(sx,1);const r=h/2,g=x.createRadialGradient(0,0,0,0,0,r);
  stops.forEach(([o,a])=>g.addColorStop(o,`rgba(255,255,255,${a})`));x.fillStyle=g;x.fillRect(-r,-r,2*r,2*r);return new THREE.CanvasTexture(c)}
function ringTex([W,H,R]){const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');rr(x,10,10,W-20,H-20,R);x.lineWidth=6;x.strokeStyle='#fff';x.shadowColor='#fff';x.shadowBlur=10;x.stroke();return new THREE.CanvasTexture(c)}

/* ---------- 5a. TRẠNG THÁI (khai báo trước vì cảnh 3D đọc nó) ---------- */
const state={path:PATHS[0],active:null,sel:null,spot:null,hover:null,time:11,tab:'main',tiers:{A:true,B:true,C:true,D:true}};
const hot=()=>state.sel||state.spot;
const visited=new Set();

/* ---------- 4. CẢNH 3D ---------- */
const DASH={A:[0,1],B:[9,.78],C:[4.6,.5],D:[2.8,.3]};
function initScene(){
  const view=$('#view'),canvas=$('#gl');
  /* q là mức chất lượng: 2 đầy đủ, 1 vừa, 0 nhẹ. Khởi đầu theo cấu hình máy, tự hạ khi khung hình chậm. */
  const q0=((navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4)?1:2;
  let q=prefs.q>=0?prefs.q:q0,qAuto=!(prefs.q>=0),fps=60,renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:q>1,powerPreference:'high-performance'})}
  catch(err){canvas.remove();const d=document.createElement('div');d.className='nogl';d.textContent='Trình duyệt này không bật được WebGL nên không vẽ được đồ thị 3D. Nội dung vẫn đọc được ở cột thông tin.';view.prepend(d);return null}
  renderer.setClearColor(0x020306);canvas.addEventListener('webglcontextlost',e=>e.preventDefault());
  const uPx={value:1},uT={value:0};
  function applyQuality(){const area=Math.max(1,view.clientWidth*view.clientHeight),px=Math.max(.6,Math.min(devicePixelRatio,[.8,1.25,2][q],Math.sqrt([1.2e6,2.6e6,6e6][q]/area)));
    SC=Math.min([.5,.75,1][q],innerWidth<700?.75:1);renderer.setPixelRatio(px);uPx.value=px;document.body.classList.toggle('lite',q<2)}
  applyQuality();

  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x020306,440,1100);
  const cam=new THREE.PerspectiveCamera(44,1,1,4000);cam.position.set(0,90,still?480:1050);
  const ctl=new THREE.OrbitControls(cam,canvas);ctl.enableDamping=true;ctl.dampingFactor=.07;ctl.rotateSpeed=.7;ctl.minDistance=70;ctl.maxDistance=1100;
  ctl.autoRotate=!still;ctl.autoRotateSpeed=.28;canvas.addEventListener('pointerdown',()=>{ctl.autoRotate=false},{once:true});
  if(coarse)canvas.style.touchAction='pan-y'; /* cảm ứng: vuốt dọc cuộn trang, vuốt ngang xoay, chụm để phóng */
  const C=k=>new THREE.Color(CAMP[k].c),V=n=>new THREE.Vector3(n.x,n.y,n.z),F=(a,n)=>new THREE.Float32BufferAttribute(a,n);
  const additive={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending};
  const GLOW=softTex(256,256,1,[[0,1],[.25,.42],[.6,.1],[1,0]]),STREAK=softTex(512,64,8,[[0,1],[.2,.35],[1,0]]);
  const glowSprite=(opts)=>new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({map:GLOW,opacity:0},additive,opts)));

  /* --- nền vũ trụ: sao, dải ngân hà, tia sáng theo màu phe, sao băng --- */
  {const p=[],a=[];let s=7;const r=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<1400;i++){const R=620+r()*1500,th=r()*6.283,ph=Math.acos(2*r()-1);p.push(R*Math.sin(ph)*Math.cos(th),R*Math.cos(ph),R*Math.sin(ph)*Math.sin(th));a.push(r(),.6+r()*1.6)}
   const g=new THREE.BufferGeometry();g.setAttribute('position',F(p,3));g.setAttribute('aS',F(a,2));
   scene.add(new THREE.Points(g,new THREE.ShaderMaterial({uniforms:{uT,uPx},transparent:true,depthWrite:false,
    vertexShader:'attribute vec2 aS;uniform float uT,uPx;varying float vA;void main(){vA=.35+.3*sin(uT*.8+aS.x*40.);gl_PointSize=aS.y*uPx*1.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vec3(.62,.7,.8)*(1.+1.4*vA*vA),smoothstep(.5,.1,d)*vA);}'})))}
  const gal=new THREE.Group();gal.rotation.set(.95,0,.5);scene.add(gal);const galGlow=new THREE.Group();gal.add(galGlow);
  const galPts=(()=>{const p=[],c=[],a=[];let s=31;const r=()=>(s=(s*16807)%2147483647)/2147483647,gs=()=>(r()+r()+r()-1.5)*.9;
    for(let i=0;i<2800;i++){const core=i%4===0,an=core?1.1+gs()*.55:r()*6.283,R=1500+r()*950,h=gs()*R*(core?.15:.085),w=r();p.push(R*Math.cos(an),h,R*Math.sin(an));c.push(.62+.38*w,.72+.14*w,1-.3*w);a.push(r(),(core?.8:.5)+r()*1.2)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',F(p,3));g.setAttribute('color',F(c,3));g.setAttribute('aS',F(a,2));
    const m=new THREE.Points(g,new THREE.ShaderMaterial(Object.assign({uniforms:{uT,uPx},
      vertexShader:'attribute vec3 color;attribute vec2 aS;uniform float uT,uPx;varying vec3 vC;varying float vA;void main(){vC=color;vA=.4+.18*sin(uT*.6+aS.x*50.);gl_PointSize=aS.y*uPx*1.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vC,smoothstep(.5,.05,d)*vA);}'},additive)));m.frustumCulled=false;m.renderOrder=-1;gal.add(m);return m})();
  [[1.1,0x3A4E9A,1150],[.6,0x55367A,900],[1.7,0x7A5440,820],[2.6,0x2E4680,760],[4.2,0x3A3470,700],[5.3,0x2A4070,640]].forEach(([an,col,sz])=>{
    const sp=glowSprite({color:col,opacity:.085,fog:false});sp.position.set(1750*Math.cos(an),0,1750*Math.sin(an));sp.scale.set(sz,sz*.55,1);sp.renderOrder=-1;galGlow.add(sp)});
  const rays=[[-.5,'us',-460,180],[.38,'nv',320,-140],[1.12,'cn',120,300]].map(([rot,k,x,y])=>{const s=new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({map:STREAK,color:C(k),opacity:.06,depthTest:false,fog:false,rotation:rot},additive)));
    s.scale.set(2800,460,1);s.position.set(x,y,-760);s.renderOrder=0;scene.add(s);return s});
  const neb=['nv','us','cn'].map(k=>{const c=new THREE.Vector3();let m=0;nodes.forEach(n=>{if(n.camp===k){c.add(V(n));m++}});const sp=glowSprite({color:C(k),depthTest:false,fog:false});
    sp.scale.set(520,520,1);sp.position.copy(c.divideScalar(m));sp.renderOrder=0;scene.add(sp);return sp});
  const met=new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({map:STREAK,color:0xCFE0FF,opacity:0,fog:false},additive)));met.renderOrder=0;scene.add(met);
  let mNext=3.5,mT0=-1,mA=[0,0,0,0];
  function meteor(t){if(mT0<0){if(t<mNext)return;mT0=t;const s=Math.random()<.5?-1:1;mA=[(Math.random()-.3)*-s*480,220+Math.random()*190,s*(420+Math.random()*260),-(150+Math.random()*210)];met.material.rotation=Math.atan2(mA[3],mA[2])}
    const u=(t-mT0)/1.05;if(u>=1){mT0=-1;mNext=t+5+Math.random()*10;met.material.opacity=0;return}
    const e=u*u*(3-2*u);met.position.set(mA[0]+mA[2]*e,mA[1]+mA[3]*e,-950);cam.localToWorld(met.position);met.scale.set(140+130*Math.sin(Math.PI*u),4.5,1);met.material.opacity=Math.sin(Math.PI*u)*.85}

  /* --- quan hệ: đường cong mờ cho mọi quan hệ, ống sáng cho quan hệ đang chọn, hạt sáng trượt trên đường cong --- */
  edges.forEach(e=>{const a=V(e.s),b=V(e.t),mid=a.clone().add(b).multiplyScalar(.5),L=a.distanceTo(b),out=mid.clone();if(out.length()<1)out.set(0,1,0);
    e.c=mid.add(out.normalize().multiplyScalar(L*.16));e.curve=new THREE.QuadraticBezierCurve3(a,e.c,b);e.len=L*1.04});
  function lines(list){const g=new THREE.Group();Object.keys(TIERS).forEach(t=>{const pos=[],col=[];list.filter(e=>e.tier===t).forEach(e=>{const pts=e.curve.getPoints(22),a=C(e.s.camp),b=C(e.t.camp);
      for(let i=0;i<22;i++){const p=pts[i],q=pts[i+1],u=i/22,v=(i+1)/22;pos.push(p.x,p.y,p.z,q.x,q.y,q.z);col.push(a.r+(b.r-a.r)*u,a.g+(b.g-a.g)*u,a.b+(b.b-a.b)*u,a.r+(b.r-a.r)*v,a.g+(b.g-a.g)*v,a.b+(b.b-a.b)*v)}});
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',F(pos,3));geo.setAttribute('color',F(col,3));
    const d=TIERS[t].dash,o={vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending};
    const l=new THREE.LineSegments(geo,d?new THREE.LineDashedMaterial(Object.assign(o,{dashSize:d[0]*1.3,gapSize:d[1]*1.3})):new THREE.LineBasicMaterial(o));
    if(d)l.computeLineDistances();l.userData.tier=t;l.renderOrder=1;g.add(l)});return g}
  let base=lines(edges),baseTime=11;scene.add(base);
  const uF={value:0};
  const tube=(r,a)=>{const m=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.ShaderMaterial(Object.assign({uniforms:{uT,uF,uR:{value:r},uA:{value:a}},side:THREE.DoubleSide,
    vertexShader:'attribute vec3 cA,cB;attribute vec2 aD;attribute float aL,aO;uniform float uR;varying vec3 vA,vB;varying vec2 vD;varying float vU,vL,vO;void main(){vA=cA;vB=cB;vD=aD;vU=uv.x;vL=aL;vO=aO;gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*uR,1.);}',
    fragmentShader:'uniform float uT,uA,uF;varying vec3 vA,vB;varying vec2 vD;varying float vU,vL,vO;void main(){float d=vD.x<=0.?1.:step(fract(vU*vL/vD.x),vD.y);float s=fract(uT*.22+vO-vU);float sh=pow(1.-s,7.);float ends=smoothstep(0.,.05,vU)*smoothstep(1.,.95,vU);vec3 c=mix(vA,vB,smoothstep(.15,.85,vU));gl_FragColor=vec4(c*(1.15+3.2*sh),uA*uF*d*ends*(.55+.45*sh));}'},additive)));
    m.frustumCulled=false;m.renderOrder=2;scene.add(m);return m};
  const core=tube(.36,1),halo=tube(1.9,.16);
  function tubes(list){const P=[],Nn=[],U=[],CA=[],CB=[],D=[],L=[],O=[],I=[];let b=0;
    list.forEach(e=>{const g=new THREE.TubeGeometry(e.curve,q>1?30:18,1,q>1?6:4,false),p=g.attributes.position.array,n=g.attributes.normal.array,u=g.attributes.uv.array,k=p.length/3,a=C(e.s.camp),c=C(e.t.camp),d=DASH[e.tier];
      for(let i=0;i<k;i++){P.push(p[i*3]-n[i*3],p[i*3+1]-n[i*3+1],p[i*3+2]-n[i*3+2]);Nn.push(n[i*3],n[i*3+1],n[i*3+2]);U.push(u[i*2],u[i*2+1]);CA.push(a.r,a.g,a.b);CB.push(c.r,c.g,c.b);D.push(d[0],d[1]);L.push(e.len);O.push(e.off)}
      const ix=g.index.array;for(let i=0;i<ix.length;i++)I.push(ix[i]+b);b+=k;g.dispose()});
    const geo=new THREE.BufferGeometry();[['position',P,3],['normal',Nn,3],['uv',U,2],['cA',CA,3],['cB',CB,3],['aD',D,2],['aL',L,1],['aO',O,1]].forEach(([k,a,n])=>geo.setAttribute(k,F(a,n)));geo.setIndex(I);
    core.geometry.dispose();core.geometry=halo.geometry=geo}
  const pg=new THREE.BufferGeometry();{const p0=[],p1=[],p2=[],o=[],col=[];edges.forEach(e=>{const c=C(e.s.camp==='idea'?e.t.camp:e.s.camp);p0.push(e.s.x,e.s.y,e.s.z);p1.push(e.c.x,e.c.y,e.c.z);p2.push(e.t.x,e.t.y,e.t.z);o.push(e.off);col.push(c.r,c.g,c.b)});
    pg.setAttribute('position',F(p0,3));pg.setAttribute('p1',F(p1,3));pg.setAttribute('p2',F(p2,3));pg.setAttribute('aO',F(o,1));pg.setAttribute('color',F(col,3));pg.setAttribute('aA',F(new Float32Array(edges.length),1))}
  const parts=new THREE.Points(pg,new THREE.ShaderMaterial(Object.assign({uniforms:{uT,uPx,uG:{value:0}},
    vertexShader:'attribute vec3 p1,p2,color;attribute float aO,aA;uniform float uT,uPx;varying vec3 vC;varying float vA;void main(){float u=fract(uT*.22+aO);vec3 p=mix(mix(position,p1,u),mix(p1,p2,u),u);vec4 mv=modelViewMatrix*vec4(p,1.);vC=color;vA=aA*sin(u*3.1416)*clamp(1.6+mv.z/700.,0.,1.);gl_PointSize=uPx*(4.+aA*5.)*(320./-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform float uG;varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-d),2.2);gl_FragColor=vec4(mix(vC,vec3(1.),a*.7)*1.9,a*vA*uG);}'},additive)));
  parts.frustumCulled=false;parts.renderOrder=2;scene.add(parts);

  /* --- nút: thẻ (vẽ khi lần đầu cần hiện), quầng sáng, chấm thay thẻ khi nút nằm ngoài vùng chọn --- */
  const sprites=[],ring={person:ringTex(PERSON),tile:ringTex(TILE)};
  const ping=new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({map:ring.person,opacity:0},additive)));ping.renderOrder=2;scene.add(ping);
  const flare=new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({map:STREAK,opacity:0},additive)));flare.renderOrder=2;scene.add(flare);
  const dg=new THREE.BufferGeometry();{const p=[],c=[],s=[];nodes.forEach(n=>{const k=C(n.camp);p.push(n.x,n.y,n.z);c.push(k.r,k.g,k.b);s.push(9+Math.sqrt(n.deg)*3.2)});
    dg.setAttribute('position',F(p,3));dg.setAttribute('color',F(c,3));dg.setAttribute('aS',F(s,1));dg.setAttribute('aA',F(new Float32Array(nodes.length),1))}
  const dA=dg.attributes.aA,dots=new THREE.Points(dg,new THREE.ShaderMaterial(Object.assign({uniforms:{uPx},
    vertexShader:'attribute vec3 color;attribute float aA,aS;uniform float uPx;varying vec3 vC;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vC=color;vA=aA*clamp(1.9+mv.z/520.,.12,1.);gl_PointSize=uPx*aS*(330./-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-d),1.8);gl_FragColor=vec4(mix(vC,vec3(1.),a*.55)*1.7,a*vA);}'},additive)));
  dots.frustumCulled=false;dots.renderOrder=2;scene.add(dots);
  function paint(n){n.tex=true;n.sp.material.map=card(n);n.sp.material.needsUpdate=true;
    if(typeof IMG!=='undefined'&&IMG[n.id]){const im=new Image();im.onload=()=>{const o=n.sp.material.map;n.sp.material.map=card(n,im);o.dispose()};im.src=IMG[n.id]}}
  let ready=false;
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>{
    nodes.forEach(n=>{const person=n.type==='person',dim=person?PERSON:TILE;n.ar=dim[0]/dim[1];n.h=person?21+Math.sqrt(n.deg)*3.3:10.5+Math.sqrt(n.deg)*2.1;n.o=0;n.k=1;n.g=0;n.da=0;
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,opacity:0,alphaTest:.02}));sp.visible=false;sp.position.set(n.x,n.y,n.z);sp.userData.n=n;sp.renderOrder=3;n.sp=sp;scene.add(sp);sprites.push(sp);
      const gl=glowSprite({color:C(n.camp)});gl.position.copy(sp.position);const gs=n.h*(person?3.4:n.ar*1.25);gl.scale.set(gs,gs*(person?1:.5),1);gl.renderOrder=1;n.gl=gl;scene.add(gl)});
    ready=true;applyFx();refresh();frame(state.active)});
  function applyFx(){post.setup();floor.visible=q>0;halo.visible=q>0;galGlow.visible=q>0;rays.forEach(r=>r.visible=q>1);neb.forEach(s=>s.visible=q>0);galPts.geometry.setDrawRange(0,[1300,2000,2800][q])}

  /* --- chiều sâu: sàn lưới cực mờ dưới đồ thị, mỗi nút thả một cọc dọi xuống sàn để mắt đọc được độ cao và độ xa --- */
  const floorY=Math.min.apply(null,nodes.map(n=>n.y))-52,floor=new THREE.Group();scene.add(floor);
  {const p=[],c=[],K=new THREE.Color(0x3E63A8),R=620,seg=(x1,z1,x2,z2)=>{[[x1,z1],[x2,z2]].forEach(([x,z])=>{const f=Math.pow(Math.max(0,1-Math.hypot(x,z)/R),1.6);p.push(x,floorY,z);c.push(K.r*f,K.g*f,K.b*f)})};
    for(let r=70;r<R;r+=70)for(let i=0;i<72;i++){const a=i/72*6.2832,b=(i+1)/72*6.2832;seg(r*Math.cos(a),r*Math.sin(a),r*Math.cos(b),r*Math.sin(b))}
    for(let i=0;i<24;i++){const a=i/24*6.2832;for(let r=0;r<R;r+=70)seg(r*Math.cos(a),r*Math.sin(a),(r+70)*Math.cos(a),(r+70)*Math.sin(a))}
    const g=new THREE.BufferGeometry();g.setAttribute('position',F(p,3));g.setAttribute('color',F(c,3));
    const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial(Object.assign({vertexColors:true,opacity:.55},additive)));l.renderOrder=0;floor.add(l)}
  const sg=new THREE.BufferGeometry(),fg=new THREE.BufferGeometry();{const p=[],f=[];nodes.forEach(n=>{p.push(n.x,n.y,n.z,n.x,floorY,n.z);f.push(n.x,floorY,n.z)});
    sg.setAttribute('position',F(p,3));sg.setAttribute('color',F(new Float32Array(nodes.length*6),3));fg.setAttribute('position',F(f,3));fg.setAttribute('color',F(new Float32Array(nodes.length*3),3))}
  {const l=new THREE.LineSegments(sg,new THREE.LineBasicMaterial(Object.assign({vertexColors:true},additive)));l.renderOrder=0;floor.add(l);
   const m=new THREE.Points(fg,new THREE.ShaderMaterial(Object.assign({uniforms:{uPx},
    vertexShader:'attribute vec3 color;uniform float uPx;varying vec3 vC;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vC=color*clamp(1.9+mv.z/520.,.1,1.);gl_PointSize=uPx*7.*(330./-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(vC*1.6,pow(max(0.,1.-d),2.));}'},additive)));m.frustumCulled=false;m.renderOrder=0;floor.add(m)}
  function stems(act,t){const sc=sg.attributes.color,fc=fg.attributes.color;nodes.forEach((n,i)=>{const k=C(n.camp),w=n.since>t?0:act?(act.has(n.id)?.8:.05):.2,a=w*.06,b=w*.5;
      sc.setXYZ(i*2,k.r*b,k.g*b,k.b*b);sc.setXYZ(i*2+1,k.r*a,k.g*a,k.b*a);fc.setXYZ(i,k.r*w,k.g*w,k.b*w)});sc.needsUpdate=fc.needsUpdate=true}

  /* --- hậu kỳ HDR: cảnh vẽ vào bộ đệm 16 bit nên chỗ cộng sáng vượt quá 1 không bị cắt cụt. Phần vượt ngưỡng được làm nhòe qua nhiều tầng
         thành quầng sáng, rồi cả khung hình đi qua đường cong tương phản và vai nén vùng sáng. Mức nhẹ tắt hẳn phần này. --- */
  const post=(()=>{const P={on:false},gl2=renderer.capabilities.isWebGL2,hdr=gl2&&!!renderer.extensions.get('EXT_color_buffer_float'),type=hdr?THREE.HalfFloatType:THREE.UnsignedByteType;
    const fcam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),fsc=new THREE.Scene(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));quad.frustumCulled=false;fsc.add(quad);
    const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',M=(u,fs)=>new THREE.ShaderMaterial({uniforms:u,vertexShader:VS,fragmentShader:fs,depthTest:false,depthWrite:false});
    const bright=M({tD:{value:null},uX:{value:new THREE.Vector2()}},'uniform sampler2D tD;uniform vec2 uX;varying vec2 vUv;void main(){vec3 c=(texture2D(tD,vUv+uX*vec2(.5,.5)).rgb+texture2D(tD,vUv+uX*vec2(-.5,.5)).rgb+texture2D(tD,vUv+uX*vec2(.5,-.5)).rgb+texture2D(tD,vUv+uX*vec2(-.5,-.5)).rgb)*.25;c=min(c,vec3(6.));float L=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.62,1.3,L),1.);}');
    const blur=M({tD:{value:null},uD:{value:new THREE.Vector2()}},'uniform sampler2D tD;uniform vec2 uD;varying vec2 vUv;void main(){vec3 c=texture2D(tD,vUv).rgb*.227;c+=(texture2D(tD,vUv+uD*1.3846).rgb+texture2D(tD,vUv-uD*1.3846).rgb)*.3162;c+=(texture2D(tD,vUv+uD*3.2308).rgb+texture2D(tD,vUv-uD*3.2308).rgb)*.0703;gl_FragColor=vec4(c,1.);}');
    const W5=[.36,.27,.2,.16,.14],cu={tS:{value:null},uW:{value:[0,0,0,0,0]},uB:{value:1},uT:{value:0}};for(let i=0;i<5;i++)cu['t'+i]={value:null};
    const comp=M(cu,'uniform sampler2D tS,t0,t1,t2,t3,t4;uniform float uW[5];uniform float uB,uT;varying vec2 vUv;'+
      'float sh(float x){return x<.7?x:.7+.3*(1.-exp(-(x-.7)/.3));}'+
      'void main(){vec3 c=texture2D(tS,vUv).rgb;vec3 b=texture2D(t0,vUv).rgb*uW[0]+texture2D(t1,vUv).rgb*uW[1]+texture2D(t2,vUv).rgb*uW[2]+texture2D(t3,vUv).rgb*uW[3]+texture2D(t4,vUv).rgb*uW[4];'+
      'c=max(c+b*uB,0.)*1.1;c=.2*pow(c/.2,vec3(1.12));float L=max(c.r,max(c.g,c.b));if(L>.0001){float m=sh(L);c*=m/L;c=mix(c,vec3(m),smoothstep(1.,4.,L)*.7);}'+
      'vec2 p=vUv-.5;c*=1.-dot(p,p)*.35;c+=(fract(sin(dot(gl_FragCoord.xy+uT,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;gl_FragColor=vec4(c,1.);}');
    let main=null,mips=[],w=0,h=0,lv=0,key='';const sz=new THREE.Vector2();
    const opt=d=>({type,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:d,stencilBuffer:false});
    const kill=()=>{if(main)main.dispose();mips.forEach(m=>{m.a.dispose();m.b.dispose()});main=null;mips=[]};
    P.setup=()=>{renderer.getDrawingBufferSize(sz);const k=q+'/'+sz.x+'/'+sz.y;if(k===key)return;key=k;kill();P.on=q>0&&sz.x>8&&sz.y>8;if(!P.on)return;w=sz.x;h=sz.y;lv=q>1?5:3;
      if(q>1&&gl2){main=new THREE.WebGLMultisampleRenderTarget(w,h,opt(true));main.samples=4}else main=new THREE.WebGLRenderTarget(w,h,opt(true));
      for(let i=0;i<lv;i++){const mw=Math.max(2,w>>(i+1)),mh=Math.max(2,h>>(i+1));mips.push({a:new THREE.WebGLRenderTarget(mw,mh,opt(false)),b:new THREE.WebGLRenderTarget(mw,mh,opt(false)),w:mw,h:mh})}
      for(let i=0;i<5;i++){cu['t'+i].value=mips[Math.min(i,lv-1)].a.texture;cu.uW.value[i]=i<lv?W5[i]*(lv<5?1.3:1):0}cu.tS.value=main.texture};
    const pass=(mat,rt)=>{quad.material=mat;renderer.setRenderTarget(rt);renderer.render(fsc,fcam)};
    P.render=t=>{P.setup();if(!P.on){renderer.render(scene,cam);return}
      renderer.setRenderTarget(main);renderer.render(scene,cam);
      bright.uniforms.tD.value=main.texture;bright.uniforms.uX.value.set(1/w,1/h);pass(bright,mips[0].b);
      for(let i=0;i<lv;i++){const m=mips[i],src=i?mips[i-1].a:m.b,dst=i?m.b:m.a;
        if(i){blur.uniforms.tD.value=src.texture;blur.uniforms.uD.value.set(1/m.w,0);pass(blur,m.b);blur.uniforms.tD.value=m.b.texture;blur.uniforms.uD.value.set(0,1/m.h);pass(blur,m.a)}
        else{blur.uniforms.tD.value=m.b.texture;blur.uniforms.uD.value.set(1/m.w,0);pass(blur,m.a);blur.uniforms.tD.value=m.a.texture;blur.uniforms.uD.value.set(0,1/m.h);pass(blur,m.b);const x=m.a;m.a=m.b;m.b=x;cu.t0.value=m.a.texture;if(lv===1)for(let j=1;j<5;j++)cu['t'+j].value=m.a.texture}}
      cu.uT.value=still?0:t%10;pass(comp,null)};
    P.hdr=hdr;return P})();

  /* --- đồng bộ cảnh với trạng thái: nút nào hiện thẻ, quan hệ nào sáng --- */
  let baseT=.26,nebT=.08;
  function refresh(){if(!ready)return;const act=state.active,H=hot(),t=state.time;
    if(baseTime!==t){baseTime=t;const o=base.children[0].material.opacity;scene.remove(base);base.children.forEach(l=>{l.geometry.dispose();l.material.dispose()});
      base=lines(edges.filter(e=>e.since<=t));base.children.forEach(l=>l.material.opacity=o);scene.add(base)}
    nodes.forEach(n=>{const vis=n.since<=t,fresh=!act&&t>0&&t<11&&n.since===t;n.on=vis&&(!act||act.has(n.id));
      n.tg=n===H?1:fresh?.7:act?(n.on?.5:0):(n.deg>=6?.2:0);n.td=vis&&!n.on?.3:0});
    let list=state.sel?edges.filter(e=>e.s===state.sel||e.t===state.sel):act?edges.filter(e=>act.has(e.s.id)&&act.has(e.t.id)):[];
    list=list.filter(e=>state.tiers[e.tier]&&e.since<=t);const lit=new Set(list);
    base.children.forEach(l=>l.visible=state.tiers[l.userData.tier]);baseT=act?.06:.26;nebT=act?.03:.08;stems(act,t);tubes(list);uF.value=0;
    const a=pg.attributes.aA;edges.forEach((e,i)=>a.setX(i,!state.tiers[e.tier]||e.since>t?0:act?(lit.has(e)?1:0):(q>0?.3:0)));a.needsUpdate=true;
    if(H){ping.material.map=ring[H.type==='person'?'person':'tile'];ping.material.color=C(H.camp);ping.position.set(H.x,H.y,H.z);flare.position.copy(ping.position);flare.material.color=C(H.camp);flare.scale.set(H.h*11,H.h*.9,1)}}

  /* --- máy quay --- */
  const goal={t:new THREE.Vector3(),d:480,on:false};let shift=0;
  function fly(t,d){goal.t.copy(t);goal.d=d;goal.on=true}
  function frame(set){const c=new THREE.Vector3();let k=0,r=0;nodes.forEach(n=>{if(!set||set.has(n.id)){c.x+=n.x;c.y+=n.y;c.z+=n.z;k++}});c.divideScalar(k||1);
    nodes.forEach(n=>{if(!set||set.has(n.id))r=Math.max(r,Math.hypot(n.x-c.x,n.y-c.y,n.z-c.z))});fly(c,Math.max(180,r*2.3*Math.max(1,1/cam.aspect)))}
  function resize(){const w=view.clientWidth,h=view.clientHeight;applyQuality();renderer.setSize(w,h,false);cam.aspect=w/h;
    /* dịch tâm nhìn sang trái nửa bề rộng cột thông tin để đồ thị nằm giữa phần trống */
    shift=innerWidth>900?(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pw'))+24)/2:0;
    if(shift)cam.setViewOffset(w,h,shift,0,w,h);else cam.clearViewOffset();cam.updateProjectionMatrix()}
  new ResizeObserver(resize).observe(view);resize();

  /* --- con trỏ: bấm để chọn, rê để mở thẻ của một chấm --- */
  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=null,pm=null;
  function pick(ev){const r=canvas.getBoundingClientRect();mouse.set((ev.clientX-r.left)/r.width*2-1,-(ev.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,cam);
    const hit=ray.intersectObjects(sprites.filter(s=>s.visible&&s.userData.n.o>.5))[0];if(hit)return hit.object.userData.n;
    let best=null,bd=18*18;const v=new THREE.Vector3();nodes.forEach(n=>{if(n.on||n.since>state.time)return;v.set(n.x,n.y,n.z).applyMatrix4(scene.matrixWorld).project(cam);if(v.z>1)return;
      const dx=(v.x-mouse.x)*r.width/2,dy=(v.y-mouse.y)*r.height/2,d=dx*dx+dy*dy;if(d<bd){bd=d;best=n}});return best}
  canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
  canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const n=pick(e);if(n)openNode(n.id);else if(state.sel)goPath(state.path.id)});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')pm=e});
  canvas.addEventListener('pointerleave',()=>{state.hover=null;pm=null});
  canvas.addEventListener('wheel',()=>{goal.on=false},{passive:true});

  /* --- vòng lặp: tối đa 60 khung hình (30 ở mức nhẹ), ngừng khi đồ thị khuất màn hình --- */
  let last=0,acc=0,fc=-90,lm=-99,seen=true;
  new IntersectionObserver(e=>{seen=e[0].isIntersecting}).observe(view);
  (function loop(ms){requestAnimationFrame(loop);ms=ms||0;if(!seen||ms-lm<(q>0?15:31))return;lm=ms;
    const t=ms/1000,dt=Math.min(.05,t-last);last=t;const k=still?1:1-Math.pow(.0015,dt),k2=still?1:1-Math.pow(.02,dt);
    if(!still)uT.value=t;
    if(goal.on){ctl.target.lerp(goal.t,k2*.9);const dir=cam.position.clone().sub(ctl.target),d=dir.length();dir.setLength(d+(goal.d-d)*k2*.9);cam.position.copy(ctl.target).add(dir);
      if(ctl.target.distanceTo(goal.t)<.4&&Math.abs(d-goal.d)<1)goal.on=false}
    const camD=cam.position.distanceTo(ctl.target);scene.fog.near=Math.max(60,camD-40);scene.fog.far=camD+820;
    if(ready){const H=hot();
      if(pm){state.hover=pick(pm);canvas.style.cursor=state.hover?'pointer':'';pm=null}
      let budget=4;
      nodes.forEach((n,i)=>{const want=n.on||n===state.hover;if(want&&!n.tex&&budget>0){budget--;paint(n)}
        n.o+=((want&&n.tex?1:0)-n.o)*k;n.k+=((n===H?1.2:n===state.hover?1.09:1)-n.k)*k;n.g+=(n.tg-n.g)*k;n.da+=((n===state.hover?0:n.td)-n.da)*k;dA.setX(i,n.da);
        n.sp.visible=n.o>.02;n.sp.material.opacity=n.o;{const dz=camD-Math.hypot(n.x-cam.position.x,n.y-cam.position.y,n.z-cam.position.z),b=1.12+.3*Math.max(-.6,Math.min(1,dz/200))+(n===H?.16:n===state.hover?.1:0);n.sp.material.color.setScalar(b)}n.sp.scale.set(n.h*n.ar*n.k,n.h*n.k,1);n.gl.visible=n.g>.01;n.gl.material.opacity=n.g*(n===state.sel&&!still?.8+.2*Math.sin(t*2.4):1)});
      dA.needsUpdate=true;
      base.children.forEach(l=>{l.material.opacity+=(baseT-l.material.opacity)*k});neb.forEach(s=>{s.material.opacity+=(nebT-s.material.opacity)*k});
      uF.value+=(1-uF.value)*k2;parts.material.uniforms.uG.value+=(1-parts.material.uniforms.uG.value)*k2*.5;
      flare.material.opacity+=((H?.5:0)-flare.material.opacity)*k;
      if(H){const u=still?.3:(t*.55)%1,s=1.04+u*.42;ping.scale.set(H.h*H.ar*s*1.2,H.h*1.2*(1+(s-1)*(H.type==='person'?1:H.ar*.8)),1);ping.material.opacity=(1-u)*(1-u)*.6}else ping.material.opacity=0;
      if(!still){gal.rotation.y+=dt*.0025;meteor(t);rays.forEach((r,i)=>{r.material.rotation+=dt*.004*(i%2?1:-1)});
        if(!coarse&&!goal.on){scene.rotation.y+=(mouse.x*.02-scene.rotation.y)*k*.35;scene.rotation.x+=(-mouse.y*.012-scene.rotation.x)*k*.35}}
      fps+=(1/Math.max(dt,.004)-fps)*.06;
      if(qAuto&&q>0){if(fc>=0)acc+=dt;if(++fc===90){if(acc/90>.03){q--;applyQuality();applyFx();refresh()}acc=0;fc=0}}}
    ctl.update();if(post.on)post.render(t);else renderer.render(scene,cam)})();
  return {refresh,frame,fly:(n,d)=>fly(V(n),d),info:()=>({q,fps,auto:qAuto}),setQuality(m){qAuto=m<0;q=m<0?q0:m;applyQuality();applyFx();refresh();acc=0;fc=-60}};
}

/* ---------- 5b. HÀNH ĐỘNG: mọi thay đổi trạng thái đi qua bốn hàm này ---------- */
let scene3d=null;
function goPath(id,fromStory){            // chọn một nhánh, hoặc 'all' để về toàn cảnh
  if(!fromStory)story.stop();if(id!=='all'&&state.time<11)timeline.set(11);
  const p=PATHS.find(p=>p.id===id);state.path=p;state.sel=state.spot=null;state.active=p.nodes?new Set(p.nodes):null;state.tab='main';
  if(scene3d){scene3d.refresh();scene3d.frame(state.active)}render()}
function openNode(id){                     // mở chi tiết một nút
  story.stop();if(state.time<11)timeline.set(11);
  const n=byId[id];state.sel=n;state.spot=null;state.active=new Set([id,...neighbours(n).map(x=>x.o.id)]);visited.add(id);
  if(scene3d){scene3d.refresh();scene3d.fly(n,230)}render()}
function back(){if(state.sel)goPath(state.path.id);else if(state.path.nodes)goPath('all')}   // lùi một bước
const timeline={timer:0,
  set(v){state.time=v;scene3d&&scene3d.refresh();renderTime();if(story.on)return;
    if(v<11||this.timer)caption(`Mốc ${pad2(v)} / 11 · ${TL[v]}`,TD[v]);else caption()},
  stop(){if(this.timer){clearInterval(this.timer);this.timer=0;renderTime()}},
  play(){if(this.timer)return this.stop();goPath('all');let v=0;this.timer=setInterval(()=>{if(++v>11)return this.stop();this.set(v)},1900);this.set(0)}};
const story={on:false,paused:false,b:0,s:0,el:0,dur:0,last:0,iv:0,
  start(){timeline.stop();if(state.time<11)timeline.set(11);this.on=true;this.paused=false;this.b=Math.max(0,TOUR.indexOf(state.path));this.s=0;clearInterval(this.iv);this.iv=setInterval(()=>this.tick(),100);this.show()},
  stop(){if(!this.on)return;this.on=false;clearInterval(this.iv);state.spot=null;caption();scene3d&&scene3d.refresh()},
  show(){const p=TOUR[this.b];if(this.s===0)goPath(p.id,true);const [text,nid]=SCRIPT[p.id][this.s];state.spot=nid?byId[nid]:null;if(nid)state.active.add(nid);
    if(scene3d){scene3d.refresh();if(state.spot)scene3d.fly(state.spot,280);else scene3d.frame(state.active)}
    this.el=0;this.dur=Math.max(4200,Math.min(7200,2400+text.length*52));caption(`Chặng ${pad2(this.b+1)} / ${pad2(TOUR.length)} · ${p.name}`,text,true)},
  next(){if(++this.s>=SCRIPT[TOUR[this.b].id].length){this.s=0;this.b++}if(this.b>=TOUR.length){this.stop();goPath('all');return}this.show()},
  pause(){this.paused=!this.paused;const b=$('#cap [data-sc="pause"]');if(b)b.textContent=this.paused?'▶':'❚❚'},
  tick(){const now=performance.now(),dt=Math.min(1000,now-(this.last||now));this.last=now;if(!this.on||this.paused||document.hidden)return;
    this.el+=dt;const b=$('#capb');if(b)b.style.transform=`scaleX(${Math.min(1,this.el/this.dur)})`;if(this.el>=this.dur)this.next()}};

/* ---------- 6. GIAO DIỆN ---------- */
const tierSvg=t=>{const d=TIERS[t].dash;return `<svg width="26" height="8" aria-hidden="true"><line x1="1" y1="4" x2="25" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"${d?` stroke-dasharray="${d[0]*1.2} ${d[1]*1.2}"`:''}/></svg>`};
const dot=k=>`<i class="dot" style="background:${CAMP[k].c};box-shadow:0 0 8px ${CAMP[k].c}66"></i>`;
const chip=n=>`<button class="chip${visited.has(n.id)?' seen':''}" data-n="${n.id}">${dot(n.camp)}${esc(n.label)}</button>`;
const nextCard=(n,sub)=>`<button class="next" data-n="${n.id}">${dot(n.camp)}<span><b>${esc(n.label)}</b><small>${esc(sub)}</small></span><em>→</em></button>`;
const campBar=list=>{const c={};list.forEach(n=>c[n.camp]=(c[n.camp]||0)+1);const cc=Object.keys(CAMP).filter(k=>c[k]);
  return `<div class="cbar">${cc.map(k=>`<i style="flex:${c[k]};color:${CAMP[k].c}"></i>`).join('')}</div>${cc.map(k=>`<div class="crow">${dot(k)}${CAMP[k].name}<b>${pad2(c[k])}</b></div>`).join('')}`};
const glyphSvg=t=>`<svg width="34" height="34" viewBox="-17 -17 34 34" aria-hidden="true" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round">${
  t==='event'?'<circle r="11" fill="none"/>':t==='company'?'<rect x="-11" y="-11" width="22" height="22" rx="4" stroke="none"/>':t==='gov'?'<path d="M0-14 14 0 0 14-14 0Z" stroke="none"/>':
  t==='tech'?'<path d="M0-13 13 10-13 10Z" stroke="none"/>':t==='policy'?'<path d="M13 0 6.5 11.3-6.5 11.3-13 0-6.5-11.3 6.5-11.3Z" stroke="none"/>':'<circle r="11" fill="none" stroke-dasharray="4 4"/>'}</svg>`;
/* gập một khối "div > h3" thành mục đóng mở: phần quan trọng luôn hiện, phần chi tiết gập lại */
const FOLD={'Phe':true,'Bậc chứng cứ':false,'Trọng tâm mạng lưới':false,'Nút trên nhánh':false,'Quan hệ và chứng cứ':false};
function fold(root){root.querySelectorAll(':scope>div>h3:first-child').forEach(h=>{const k=h.textContent;if(!(k in FOLD))return;const box=h.parentNode,d=document.createElement('details'),s=document.createElement('summary');
  d.open=FOLD[k];h.remove();s.textContent=k;s.insertAdjacentHTML('beforeend',`<b>${pad2(box.querySelectorAll('.rank,.chip,.rel,.crow').length)}</b>`);d.append(s,...box.childNodes);box.replaceWith(d)})}
function caption(label,text,controls){const c=$('#cap');if(!label){c.hidden=true;return}c.hidden=false;
  c.innerHTML=`<div class="lbl">${esc(label)}</div><p>${esc(text)}</p>`+(controls?`<div class="capc blur"><button data-sc="pause" aria-label="Tạm dừng hoặc chạy tiếp">${story.paused?'▶':'❚❚'}</button><button data-sc="next" aria-label="Bước sau">→</button><i><b id="capb"></b></i><button data-sc="stop" aria-label="Thoát trình chiếu">×</button></div>`:'')}

function render(){renderNav();renderGuide();renderDetail();renderPanel();
  document.body.style.setProperty('--acc',state.sel?CAMP[state.sel.camp].c:'#76B900')}
function renderNav(){const nav=$('#nav');if(!nav.children.length)nav.innerHTML=PATHS.map(p=>`<button class="pill blur" data-p="${p.id}">${p.name}</button>`).join('');
  [...nav.children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===state.path.id))}
function renderGuide(){const i=TOUR.indexOf(state.path),g=$('#guide');
  if(i<0){g.innerHTML=`<button class="go" data-p="${TOUR[0].id}">Bắt đầu hành trình<em>${TOUR.length} chặng</em> →</button><button data-story>▶ Trình chiếu<em>3 phút</em></button>`;return}
  const nx=TOUR[i+1];g.innerHTML=`<button data-p="all" title="Về toàn cảnh" aria-label="Về toàn cảnh">⌂</button><button data-p="${(TOUR[i-1]||PATHS[0]).id}" title="Chặng trước" aria-label="Chặng trước">←</button><span><b>${pad2(i+1)}</b> / ${pad2(TOUR.length)} · ${esc(state.path.name)}</span><button class="go" data-p="${nx?nx.id:'all'}">${nx?'Tiếp<em>'+esc(nx.name)+'</em>':'Về toàn cảnh'} →</button>`}
function renderTime(){$('#time').innerHTML=`<button class="play" data-play aria-label="Dựng lại đồ thị theo thời gian"><b>${timeline.timer?'❚❚':'▶'} Dựng lại</b><span>theo thời gian</span></button>`+
  TL.map((l,i)=>`<button data-t="${i}" class="${i===state.time?'cur':i<state.time?'past':''}" title="${esc(TD[i])}"><b>${l}</b><span>${esc(TD[i])}</span></button>`).join('')}

function renderPanel(){const body=$('#body');
  [...$('#tabs').children].forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===state.tab));
  const key=state.tab+'/'+state.path.id+'/'+Object.values(state.tiers).join('');if(state.sel&&body.dataset.key===key)return;body.dataset.key=key;body.scrollTop=0;
  if(state.tab==='verify'){const cls={'Khớp':'ok','Lệch':'bad','Thiếu':'miss','Thiếu vế':'miss'};
    body.innerHTML=`<div class="eyebrow lbl">Đối chiếu bản ChatGPT</div><h2>Bảy khớp, ba lệch, năm thiếu</h2>`+VERIFY.map(([st,claim,res,id])=>`<div class="vf"><div><span class="st ${cls[st]||''}">${st}</span></div><b>${esc(claim)}</b><span>${esc(res)}</span><div>${chip(byId[id])}</div></div>`).join('');return}
  if(state.tab==='src'){body.innerHTML=`<div class="eyebrow lbl">Sổ nguồn</div><h2>${Object.keys(S).length} nguồn, chốt 12/11/2026</h2><p class="desc">Nguồn ghi "tiêu đề" là trang chặn truy cập tự động. Nội dung của chúng được lấy qua báo khác thuật lại.</p>`+
    Object.values(S).map(s=>`<div class="src"><a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>${s[2]?'':' <span class="st">tiêu đề</span>'}</div>`).join('');return}
  const p=state.path,[thesis,pts,test]=BR[p.id];
  if(!p.nodes){const top=[...nodes].sort((a,b)=>b.deg-a.deg).slice(0,8),mx=top[0].deg;
    body.innerHTML=`<div class="eyebrow lbl">Toàn cảnh · 12.11.2026</div><h2>Ba trung tâm quyền lực, một điểm chạm</h2>
    <div class="stats"><div><b data-count="${nodes.length}">0</b><span>nút</span></div><div><b data-count="${edges.length}">0</b><span>quan hệ</span></div><div><b data-count="${Object.keys(S).length}">0</b><span>nguồn</span></div></div>
    <p class="thesis">${esc(thesis)}</p>
    <div><button class="cta" data-p="${TOUR[0].id}"><span>Bắt đầu hành trình</span><em>${TOUR.length} chặng →</em></button><button class="cta ghost" data-story><span>Xem trình chiếu có lời dẫn</span><em>3 phút ▶</em></button>
    <p class="hint">Hoặc tự đi: bấm vào một thẻ để mở chi tiết, Esc để lùi một bước.</p></div>
    <div><h3>Phe</h3>${campBar(nodes)}</div>
    <div><h3>Bậc chứng cứ</h3>${Object.keys(TIERS).map(t=>`<div class="crow">${tierSvg(t)}${TIERS[t].name}<b>${pad2(edges.filter(e=>e.tier===t).length)}</b></div>`).join('')}</div>
    <div><h3>Trọng tâm mạng lưới</h3>${top.map((n,k)=>`<button class="rank" data-n="${n.id}"><em>${pad2(k+1)}</em><span>${esc(n.label)}</span><i style="width:${Math.round(n.deg/mx*70)}px;color:${CAMP[n.camp].c}"></i><b>${n.deg}</b></button>`).join('')}</div>`}
  else{const list=p.nodes.map(id=>byId[id]),entry=[...list].sort((a,b)=>b.deg-a.deg)[0];
    body.innerHTML=`<div class="eyebrow lbl">Nhánh ${pad2(TOUR.indexOf(p)+1)} / ${pad2(TOUR.length)} · ${list.length} nút</div><h2>${esc(p.name)}</h2><p class="thesis">${esc(thesis)}</p><div>${campBar(list)}</div>
    <ul class="pts">${pts.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><div class="test"><span class="lbl">Phép thử</span>${esc(test)}</div>
    <div><h3>Lối vào</h3>${nextCard(entry,'Nút nhiều quan hệ nhất trên nhánh')}</div>
    <div><h3>Nút trên nhánh</h3><div class="chips">${list.map(chip).join('')}</div></div>`}
  fold(body);
  body.querySelectorAll('[data-count]').forEach(el=>{const to=+el.dataset.count;if(still){el.textContent=to;return}const t0=performance.now();(function f(t){const u=Math.min(1,(t-t0)/800);el.textContent=Math.round(to*(1-Math.pow(1-u,3)));if(u<1)requestAnimationFrame(f)})(t0)})}

function egoSvg(n,nb){const arr=[...nb].sort((a,b)=>a.o.camp.localeCompare(b.o.camp)),m=arr.length;if(!m)return '';
  const lab=m<=9,W=328,H=lab?224:200,cx=W/2,cy=H/2,r=lab?66:84;
  return `<svg class="ego" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sơ đồ ${m} nút kề"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,.07)"/><circle cx="${cx}" cy="${cy}" r="${r/2}" fill="none" stroke="rgba(255,255,255,.04)"/>`+
  arr.map(({o,e},i)=>{const a=-Math.PI/2+i/m*2*Math.PI,ca=Math.cos(a),sa=Math.sin(a),x=(cx+r*ca).toFixed(1),y=(cy+r*sa).toFixed(1),d=TIERS[e.tier].dash,c=CAMP[o.camp].c,mid=Math.abs(ca)<.25;
    const tx=mid?x:(+x+(ca>0?11:-11)).toFixed(1),ty=(mid?+y+(sa>0?19:-12):+y+3.5).toFixed(1),s=o.label.length>15?o.label.slice(0,14)+'…':o.label;
    return `<g data-n="${o.id}" style="animation-delay:${i*28}ms"><title>${esc(o.label)}</title><line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${c}" stroke-width="1.2" stroke-opacity=".7"${d?` stroke-dasharray="${d[0]} ${d[1]}"`:''}/><circle cx="${x}" cy="${y}" r="5.5" fill="${c}" style="filter:drop-shadow(0 0 6px ${c})"/>${lab?`<text x="${tx}" y="${ty}" text-anchor="${mid?'middle':ca>0?'start':'end'}">${esc(s)}</text>`:''}</g>`}).join('')+
  `<rect x="${cx-9}" y="${cy-9}" width="18" height="18" rx="5" fill="var(--acc)" style="filter:drop-shadow(0 0 12px var(--acc))"/></svg>`}
function renderDetail(){const D=$('#detail'),n=state.sel;if(!n){D.hidden=true;D.dataset.cur='';return}
  const rel=edges.filter(e=>(e.s===n||e.t===n)&&state.tiers[e.tier]),nb=neighbours(n);
  const sug=[...nb].sort((a,b)=>(visited.has(a.o.id)-visited.has(b.o.id))||b.o.deg-a.o.deg).slice(0,3);
  D.innerHTML=`<button class="x" data-back aria-label="Đóng">×</button>
   <nav class="crumb" aria-label="Lối ra"><button data-p="all">Toàn cảnh</button>${state.path.nodes?`›<button data-p="${state.path.id}">${esc(state.path.name)}</button>`:''}›<span>${esc(n.label)}</span></nav>
   <div class="id">${n.type==='person'?`<div class="tile">${monogram(n)}</div>`:`<div class="tile sq">${glyphSvg(n.type)}</div>`}<div><div class="eyebrow lbl">${dot(n.camp)}${CAMP[n.camp].tag}</div><h2>${esc(n.label)}</h2><small>${esc(ROLE[n.id]||TYPES[n.type].name)} · ${pad2(n.deg)} quan hệ</small></div></div>
   <p class="desc">${esc(n.desc)}</p>${egoSvg(n,nb)}
   ${sug.length?`<div><h3>Đi tiếp</h3>${sug.map(({o,e})=>nextCard(o,e.label)).join('')}</div>`:''}
   <div><h3>Quan hệ và chứng cứ</h3>${rel.map(e=>{const out=e.s===n,o=out?e.t:e.s,s=e.src[0];return `<div class="rel" title="${TIERS[e.tier].name}">${tierSvg(e.tier)}<button data-n="${o.id}"><em>${out?'→':'←'}</em>${dot(o.camp)}${esc(o.label)}</button><span>${esc(e.label)}${s?` · <a href="${S[s][1]}" target="_blank" rel="noopener">${esc(S[s][0].split(/[ :]/)[0])}${e.src.length>1?' +'+(e.src.length-1):''}</a>`:''}</span></div>`}).join('')}</div>`;
  fold(D);D.hidden=false;D.scrollTop=0;if(D.dataset.cur!==n.id){D.dataset.cur=n.id;D.style.animation='none';D.offsetWidth;D.style.animation=''}}

/* --- hai dải chạy và hộp đọc tin --- */
const twice=s=>s+s.replace(/<button /g,'<button tabindex="-1" aria-hidden="true" ');
const safeUrl=u=>/^https:\/\//.test(u)?u:'#';
function renderBars(){
  $('#tick').innerHTML=`<button data-min="tick" title="${feed.live?'Cập nhật '+esc(feed.updated):'Tin chốt ngày 12/11/2026'}. Bấm để thu gọn hoặc mở lại.">Tin nóng${feed.live&&feed.updated?' · '+esc(feed.updated):''}</button><div class="run"><div>${twice(news.map((n,i)=>`<button data-i="${i}"><em>${esc(n.d)} · ${esc(n.src)}</em>${esc(n.title)}</button>`).join(''))}</div></div>`;
  const f=v=>(v>0?'+':'−')+Math.abs(v).toLocaleString('vi-VN',{maximumFractionDigits:2})+'%';
  $('#stk').innerHTML=`<button data-min="stk" title="${feed.quotes?'Biến động so với phiên trước, nguồn Yahoo Finance, có thể trễ. Mã không có giá trực tiếp giữ số theo các hãng tin.':'Biến động theo các hãng tin, không phải giá trực tiếp.'} Bấm để thu gọn hoặc mở lại.">Cổ phiếu · ${esc(feed.label)}</button><div class="run"><div>${twice(stocks.map(s=>`<button ${byId[s.node]?`data-n="${s.node}"`:''} title="${esc(s.name)}: ${s.pct>0?'tăng':'giảm'} ${Math.abs(s.pct)}%${s.note?', '+esc(s.note):''}"><b>${esc(s.sym)}</b><i>${esc(s.name)}</i><span class="${s.pct>0?'up':'dn'}">${s.pct>0?'▲':'▼'} ${f(s.pct)}</span>${s.note?`<span>${esc(s.note)}</span>`:''}</button>`).join(''))}</div></div>`;
  applyBars()}
function applyBars(){['tick','stk'].forEach(k=>{const off=prefs[k]===false;$('#'+k).classList.toggle('min',off);document.body.classList.toggle('no-'+k,off)})}
let ni=0;
function openNews(i){if(!news.length)return;ni=(i+news.length)%news.length;const n=news[ni],N=$('#news');if(story.on&&!story.paused)story.pause();N.hidden=false;
  N.innerHTML=`<div class="newsc"><button class="x" data-close aria-label="Đóng">×</button><div class="lbl">${esc(n.d)} · ${esc(n.src)}<span>Tin ${pad2(ni+1)} / ${pad2(news.length)}</span></div><h2>${esc(n.title)}</h2><p>${esc(n.sum)}</p>
   ${n.why?`<h3>Vì sao đáng chú ý</h3><p class="why">${esc(n.why)}</p>`:''}${n.nodes.length?`<h3>Xem trên đồ thị</h3><div class="chips">${n.nodes.map(id=>chip(byId[id])).join('')}</div>`:''}
   <div class="newsf"><a href="${safeUrl(n.url)}" target="_blank" rel="noopener">Đọc bài gốc ↗</a><small>Tóm tắt viết lại từ bài gốc${n.direct?'':', nội dung lấy qua báo khác thuật lại'}.</small><div><button data-nd="-1" aria-label="Tin trước">←</button><button data-nd="1" aria-label="Tin sau">→</button></div></div></div>`;
  N.querySelector('.x').focus()}
const closeNews=()=>{$('#news').hidden=true};

/* --- cài đặt: bộ lọc bậc chứng cứ, mức đồ họa, bật tắt hai dải --- */
function renderSet(){const i=scene3d?scene3d.info():{q:1,fps:0,auto:true},mode=i.auto?-1:i.q;
  $('#set').innerHTML=`<h3>Bậc chứng cứ</h3>${Object.keys(TIERS).map(t=>`<button class="trow" data-tier="${t}" aria-pressed="${state.tiers[t]}">${tierSvg(t)}${TIERS[t].name}</button>`).join('')}
   <h3>Đồ họa</h3><div class="seg">${[[-1,'Tự động'],[2,'Cao'],[0,'Nhẹ']].map(([v,l])=>`<button data-q="${v}" aria-pressed="${mode===v}">${l}</button>`).join('')}</div><small id="fps"></small>
   <h3>Dải thông tin</h3><button class="trow" data-bar="tick" aria-pressed="${prefs.tick!==false}">Thanh tin nóng</button><button class="trow" data-bar="stk" aria-pressed="${prefs.stk!==false}">Dải cổ phiếu</button>`;fpsLine()}
function fpsLine(){const el=$('#fps');if(!el||!scene3d)return;const i=scene3d.info();el.textContent=`Đang chạy mức ${['nhẹ','vừa','cao'][i.q]} · ${Math.round(i.fps)} khung hình mỗi giây`}
setInterval(()=>{if(!$('#set').hidden)fpsLine()},1000);
function toggleSet(open){const s=$('#set');s.hidden=open===undefined?!s.hidden:!open;$('#gear').setAttribute('aria-expanded',!s.hidden);if(!s.hidden)renderSet()}

/* --- sự kiện: một bộ lắng nghe chung cho mọi nút có data-* --- */
document.addEventListener('click',e=>{const t=e.target,c=s=>t.closest(s);let b;
  if(!c('#set')&&!c('#gear'))toggleSet(false);
  if((b=c('[data-story]')))return story.start();
  if((b=c('[data-sc]')))return b.dataset.sc==='pause'?story.pause():b.dataset.sc==='next'?story.next():story.stop();
  if((b=c('[data-play]')))return timeline.play();
  if((b=c('[data-t]'))){timeline.stop();if(state.path.nodes||state.sel)goPath('all');return timeline.set(+b.dataset.t)}
  if((b=c('[data-min]'))){const k=b.dataset.min;prefs[k]=prefs[k]===false;savePrefs();return applyBars()}
  if((b=c('[data-i]')))return openNews(+b.dataset.i);
  if((b=c('[data-nd]')))return openNews(ni+ +b.dataset.nd);
  if(c('[data-close]')||t.id==='news')return closeNews();
  if(c('[data-back]'))return back();
  if((b=c('[data-tab]'))){state.tab=b.dataset.tab;return renderPanel()}
  if((b=c('[data-tier]'))){const k=b.dataset.tier;state.tiers[k]=!state.tiers[k];scene3d&&scene3d.refresh();renderSet();return render()}
  if((b=c('[data-q]'))){prefs.q=+b.dataset.q;savePrefs();scene3d&&scene3d.setQuality(prefs.q);return renderSet()}
  if((b=c('[data-bar]'))){const k=b.dataset.bar;prefs[k]=prefs[k]===false;savePrefs();applyBars();return renderSet()}
  if((b=c('[data-p]'))){goPath(b.dataset.p);if(c('#nav'))b.scrollIntoView({inline:'center',block:'nearest',behavior:still?'auto':'smooth'});return}
  if((b=c('[data-n]'))){closeNews();return openNode(b.dataset.n)}
  if(c('#gear'))toggleSet()});
$('#q').addEventListener('change',e=>{const v=e.target.value.trim().toLowerCase();if(!v)return;const n=nodes.find(n=>n.label.toLowerCase()===v)||nodes.find(n=>n.label.toLowerCase().includes(v));if(n){openNode(n.id);e.target.value=''}});
addEventListener('keydown',e=>{if(e.target.matches('input'))return;const i=PATHS.indexOf(state.path);
  if(!$('#news').hidden){if(e.key==='Escape')closeNews();else if(e.key==='ArrowRight')openNews(ni+1);else if(e.key==='ArrowLeft')openNews(ni-1);return}
  if(e.key==='/'){e.preventDefault();$('#q').focus()}
  else if(e.key===' '&&story.on){e.preventDefault();story.pause()}
  else if(e.key==='Escape'){if(!$('#set').hidden)toggleSet(false);else if(story.on)story.stop();else back()}
  else if(e.key==='ArrowRight'&&!state.sel)goPath(PATHS[(i+1)%PATHS.length].id)
  else if(e.key==='ArrowLeft'&&!state.sel)goPath(PATHS[(i+PATHS.length-1)%PATHS.length].id)});

/* ---------- 7. NGUỒN TIN TRỰC TIẾP: đọc từ kho dữ liệu của trang, do một tác vụ định kỳ ghi vào. Không có thì dùng bản đóng sẵn. ---------- */
(async function liveFeed(){
  const QUOTES_URL='https://nvidia-monitor.vercel.app/api/fork-quotes';
  const db=window.claude&&claude.use?await claude.use('db').catch(()=>null):null;
  const str=(v,max)=>typeof v==='string'?v.slice(0,max):'';
  const arr=v=>Array.isArray(v)?v:[];
  /* một tài liệu duy nhất {updated, stockLabel, news:[...], stocks:[...]}. Mọi trường đều được kiểm lại trước khi hiện. */
  const apply=m=>{if(!m)return;
    const ns=arr(m.news).filter(r=>r&&str(r.title,10)&&/^https:\/\//.test(r.url||'')).slice(0,24).map(r=>({d:str(r.d,12),src:str(r.src,40),url:r.url,direct:r.direct!==false,title:str(r.title,160),sum:str(r.sum,900),why:str(r.why,300),nodes:arr(r.nodes).filter(id=>byId[id]).slice(0,5)}));
    const ss=arr(m.stocks).filter(r=>r&&str(r.sym,1)&&typeof r.pct==='number').slice(0,30).map(r=>({sym:str(r.sym,10),name:str(r.name,30),pct:r.pct,note:str(r.note,30),node:str(r.node,20)}));
    if(ns.length){news=ns;feed.live=true}if(ss.length)stocks=ss;feed.updated=str(m.updated,40);if(str(m.stockLabel,20))feed.label=str(m.stockLabel,20);
    if(!$('#news').hidden)closeNews();renderBars()};
  /* trong artifact: nghe kho dữ liệu. Chạy độc lập (Vercel): đọc feed.json nằm cạnh trang. */
  if(db)db.doc('feed/current').onSnapshot(s=>apply(s.exists&&s.data()),()=>{});
  else{
    /* bản đóng sẵn trước (cùng yêu cầu với thẻ preload trong index.html), rồi phủ giá trực tiếp lên dải cổ phiếu. */
    await fetch('feed.json').then(r=>r.ok?r.json():null).then(apply).catch(()=>{});
    liveQuotes();setInterval(()=>{if(!document.hidden)liveQuotes()},60000)}
  /* Giá trực tiếp cho bản chạy độc lập: lấy từ dịch vụ giá của trang AI Chip Monitor (Yahoo Finance). Chỉ ghi đè mã đã có trong dải; lỗi thì giữ số đang hiện. */
  function liveQuotes(){
    fetch(QUOTES_URL).then(r=>r.ok?r.json():null).then(m=>{
      const by={};arr(m&&m.quotes).forEach(q=>{if(q&&typeof q.symbol==='string'&&Number.isFinite(q.changePct))by[q.symbol]=q.changePct});
      let hit=0;stocks=stocks.map(s=>s.sym in by?(hit++,{...s,pct:Math.round(by[s.sym]*100)/100,note:''}):s);
      if(hit){feed.label='trực tiếp';feed.quotes=true;renderBars()}}).catch(()=>{})}
})();

/* ---------- KHỞI ĐỘNG ---------- */
$('#ql').innerHTML=nodes.map(n=>`<option value="${esc(n.label)}">`).join('');
scene3d=window.THREE&&THREE.OrbitControls?initScene():null;
if(!scene3d&&!$('.nogl')){const d=document.createElement('div');d.className='nogl';d.textContent='Không tải được thư viện 3D. Nội dung vẫn đọc được ở cột thông tin.';$('#gl').replaceWith(d)}
renderBars();renderTime();render();
