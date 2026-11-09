const C={grey:[91,100,114],blue:[61,165,255],vio:[139,124,246],amber:[245,179,66],green:[74,222,128],silver:[203,213,225],red:[242,109,109]};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const rgba=(c,a=1)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
const STATES={
 ready:{name:'Ready',feel:'Sleeping breath. Alive, but quiet.',col:'grey',rr:22,rw:8,glow:0,dr:4.6,ra:.75,so:.5,sa:0},
 listen:{name:'Listening',feel:'Leans in. The ring follows your voice.',col:'blue',rr:31,rw:5.5,glow:16,dr:4.6,ra:1,so:.75,sa:14},
 work:{name:'Working',feel:'Thinking. Violet grows from the front of the arc, blue stays behind.',col:'blue',rr:27,rw:6.5,glow:10,dr:3.8,ra:1,so:.65,sa:null},
 need:{name:'Needs you',feel:'Knock, knock. A gentle tap on your shoulder.',col:'amber',rr:33,rw:5.5,glow:20,dr:6.6,ra:1,so:.4,sa:0},
 done:{name:'Completed',feel:'Shutter click, a pop, and a ripple. Reward.',col:'green',rr:34,rw:4.5,glow:16,dr:4.2,ra:1,so:.6,sa:0},
 stop:{name:'Stopped',feel:'The shutter closes. Calm and final, no bounce.',col:'silver',rr:12.5,rw:9.5,glow:0,dr:1.8,ra:.95,so:.25,sa:-30},
 prob:{name:'Problem',feel:'A small "no" head-shake, then a slow red glow.',col:'red',rr:26,rw:7,glow:18,dr:5.2,ra:1,so:.45,sa:0}
};
class S{constructor(v){this.v=v;this.t=v;this.vel=0}step(dt,k,c){const a=-k*(this.v-this.t)-c*this.vel;this.vel+=a*dt;this.v+=this.vel*dt}}
// 1. respect Windows/browser 'reduce motion'. Idle times: preview uses short times; the app uses 10 s and 10 min.
const MOTION={reduce:matchMedia('(prefers-reduced-motion: reduce)').matches,idleStill:10,deepSleep:25};
class Lens{
 constructor(cv,state,mini){this.cv=cv;this.ctx=cv.getContext('2d');this.mini=mini;this.time=0;this.st=0;
  const s=STATES.ready;
  this.p={rr:new S(s.rr),rw:new S(s.rw),glow:new S(0),dr:new S(s.dr),ra:new S(s.ra),so:new S(s.so),sa:new S(0),arc:new S(360),scale:new S(1),dpop:new S(1),spin:new S(0)};
  this.tail=C.grey.map(v=>new S(v));this.head=C.grey.map(v=>new S(v));this.dotc=C.grey.map(v=>new S(v));
  this.rot=-90;this.ripples=[];this.lvl=new S(0);this.lvlT=0;this.knock=0;this.beat=0;this.shake=0;this.set(state||'ready');this.resize()}
 resize(){const r=this.cv.getBoundingClientRect(),d=devicePixelRatio||1;this.rect=r;this.drawnOnce=false;this.cv.width=r.width*d;this.cv.height=r.height*d;this.W=r.width*d}
 set(name){const s=STATES[name];this.prev=this.state;this.state=name;this.st=0;this.boost=.28;const p=this.p,R=MOTION.reduce;
  p.rr.t=s.rr;p.rw.t=s.rw;p.glow.t=s.glow;p.dr.t=s.dr;p.ra.t=s.ra;p.so.t=s.so;if(s.sa!==null)p.sa.t=s.sa;
  if(!R&&name==='listen'){p.scale.v=Math.min(p.scale.v,.88);p.scale.vel=0}            // 5. quick, small open
  if(!R&&name==='done'){p.scale.v=.8;p.sa.v-=28;p.dpop.v=.3;this.ripples.push({r:0,a:1})} // the one big bouncy moment
  if(name==='need'){this.knock=.25;this.knocks=0}
  if(name==='prob'){this.shake=0}
  if(name==='work'){this.beat=.6;if(this.prev==='listen'||this.prev==='ready'||this.wp===undefined)this.wp=0}
 }
 update(dt){this.time+=dt;this.st+=dt;this.boost=Math.max(0,(this.boost||0)-dt);const p=this.p,s=this.state,base=C[STATES[s].col],R=MOTION.reduce;
  let tail=base,head=base,arc=360,spin=0,scaleT=1;if(s!=='work')this.f=this.f===undefined?0:Math.max(0,this.f);
  // 2 + 10. still after 10 s of no use, deep sleep (dim) later
  this.idle=s==='ready'&&this.st>MOTION.idleStill;this.deep=s==='ready'&&this.st>MOTION.deepSleep;
  this.dimT=this.deep?.45:1;this.dimv=(this.dimv??1)+(this.dimT-(this.dimv??1))*Math.min(1,dt*1.2);
  if(s==='ready'&&!R&&!this.idle){scaleT=1+.035*Math.sin(this.time*Math.PI*2/6)}
  if(s==='listen'){this.lvlT-=dt;if(this.lvlT<=0){this.lvlT=.07+Math.random()*.12;this.lvl.t=Math.random()<.22?0:.25+Math.random()*.75}
   this.lvl.step(dt,90,14);const L=Math.max(0,this.lvl.v);p.rw.t=5.5+L*3.2;p.glow.t=14+L*26;p.dr.t=4.6+L*2.6;scaleT=R?1:1+L*.045}
  else{this.lvl.v=0;this.lvl.t=0}
  if(s==='work'){let q;
   if(this.prog!=null){this.fp=this.fp==null?this.prog:this.fp+(this.prog-this.fp)*Math.min(1,dt*2.5);q=this.fp}   // 9. real progress
   else{this.wp+=dt;const e=Math.min(1,this.wp/8);q=e*e*(3-2*e)}
   this.f=.04+.96*q;tail=C.blue;head=C.vio;
   arc=R?220:185+70*Math.sin(this.time*Math.PI*2/1.9);spin=R?0:250;if(!R)p.sa.t-=32*dt;
   if(!R){this.beat-=dt;if(this.beat<=0){this.beat=1.8;p.dpop.vel+=4.5}}}
  else this.fp=null;
  if(s==='need'&&!R){this.knock-=dt;if(this.knock<=0){p.scale.vel+=2.4;this.knock2=.34;this.knocks++;this.knock=this.knocks<3?2.6:15}   // 3. knock 3 times, then rest
   if(this.knock2!==undefined){this.knock2-=dt;if(this.knock2<=0){p.scale.vel+=1.7;this.knock2=undefined}}}
  if(s==='prob'){p.glow.t=this.st<3&&!R?8+20*(.5+.5*Math.cos(this.st*Math.PI*2/2.4)):16;this.shake=!R&&this.st<1.1?11*Math.exp(-this.st*3.5)*Math.sin(this.st*40):0}else this.shake=0;
  p.arc.t=arc;p.spin.t=spin;p.scale.t=scaleT;
  const soft=s==='stop'||R,bst=this.boost>0?1.8:1;let k=(soft?95:190)*bst,c=soft?20*Math.sqrt(bst):11;   // 6. leave the old state fast
  ['rr','rw','dr','ra','so','sa'].forEach(n=>p[n].step(dt,k,c));p.glow.step(dt,60,14);
  if(s==='listen'&&!R)p.scale.step(dt,340,24);else p.scale.step(dt,soft?120:210,soft?22:9);
  p.dpop.step(dt,240,R?31:10);p.arc.step(dt,70,13);p.spin.step(dt,8,5);
  const dc=s==='work'?mix(C.blue,C.vio,this.f):base,ck=22*bst,cc=9*Math.sqrt(bst);for(let i=0;i<3;i++){this.tail[i].t=tail[i];this.head[i].t=head[i];this.dotc[i].t=dc[i];
   this.tail[i].step(dt,ck,cc);this.head[i].step(dt,ck,cc);this.dotc[i].step(dt,ck,cc)}
  this.rot+=p.spin.v*dt;
  this.ripples.forEach(r=>{r.r+=dt*1.25;r.a=Math.max(0,1-r.r)});this.ripples=this.ripples.filter(r=>r.a>0);
 }
 // 4. only redraw when something is actually moving
 moving(){let e=0;for(const k in this.p)e+=Math.abs(this.p[k].vel)+Math.abs(this.p[k].v-this.p[k].t)*.2;[...this.tail,...this.head,...this.dotc].forEach(q=>e+=Math.abs(q.vel)*.01);
  return e>.02||this.ripples.length>0||Math.abs((this.dimv??1)-(this.dimT??1))>.005||(this.extraMoving?this.extraMoving():false)}
 needsDraw(){if(!this.drawnOnce)return this.drawnOnce=true;if(!(this.idle||MOTION.reduce&&this.state!=='listen'))return true;return this.moving()}
 arcPath(x,R,a0,span,full){x.beginPath();if(full)x.arc(0,0,R,0,Math.PI*2);else x.arc(0,0,R,a0,a0+span)}
 draw(){const x=this.ctx,W=this.W,u=W/100,cx=W/2,cy=W/2,p=this.p,B=47*u;let g;x.clearRect(0,0,W,W);
  if(!this.oc||this.oc.width!==W){this.oc=document.createElement('canvas');this.oc.width=W;this.oc.height=W;this.ox=this.oc.getContext('2d')}
  const tail=this.tail.map(s=>s.v),head=this.head.map(s=>s.v),dot=this.dotc.map(s=>s.v),mid=mix(tail,head,this.state==='work'?this.f:1);
  // ---- lens body, drawn once and reused (4)
  if(!this.bodyC||this.bodyC.width!==W){this.bodyC=document.createElement('canvas');this.bodyC.width=W;this.bodyC.height=W;const keep=this.ctx;{const x=this.bodyC.getContext('2d');
  x.save();x.shadowColor='rgba(0,6,15,.5)';x.shadowBlur=6*u;x.shadowOffsetY=2*u;
  g=x.createRadialGradient(cx,cy-9*u,0,cx,cy-9*u,B*1.6);g.addColorStop(0,'#080C13');g.addColorStop(.62*.62,'#0E141D');g.addColorStop(.62,'#1E2633');
  x.beginPath();x.arc(cx,cy,B,0,7);x.fillStyle=g;x.fill();x.restore();
  x.save();x.beginPath();x.arc(cx,cy,B,0,7);x.clip();
  x.translate(cx-8*u,cy-27*u);x.rotate(-14*Math.PI/180);x.scale(1,.46);g=x.createRadialGradient(0,0,0,0,0,39*u);g.addColorStop(0,'rgba(228,240,255,.13)');g.addColorStop(1,'rgba(228,240,255,0)');
  x.fillStyle=g;x.beginPath();x.arc(0,0,39*u,0,7);x.fill();x.restore();
  }}
  x.drawImage(this.bodyC,0,0);
  // ---- spokes: straight to the center, shadow + light like the logo
  x.save();x.translate(cx,cy);x.rotate(p.sa.v*Math.PI/180);x.lineCap='butt';
  for(const [col,dy,wd] of [[`rgba(0,0,0,${.38*p.so.v/.6})`,.45*u,.85*u],[`rgba(207,224,242,${.22*p.so.v/.6})`,0,.75*u]]){x.strokeStyle=col;x.lineWidth=wd;
   for(let i=0;i<6;i++){const a=i*Math.PI/3;x.beginPath();x.moveTo(Math.cos(a)*13*u,Math.sin(a)*13*u+dy);x.lineTo(Math.cos(a)*39*u,Math.sin(a)*39*u+dy);x.stroke()}}
  x.restore();
  // ripples
  this.ripples.forEach(r=>{x.beginPath();x.arc(cx,cy,(p.rr.v+r.r*16)*u,0,7);x.lineWidth=1.2*u;x.strokeStyle=rgba(head,r.a*.8);x.stroke()});
  // ---- glass ring
  const R=p.rr.v*u*p.scale.v,w=Math.max(.5,p.rw.v)*u*p.scale.v,arc=Math.min(360,p.arc.v),full=arc>=357,a0=this.rot*Math.PI/180,span=arc*Math.PI/180;
  const ox=cx+this.shake*u;
  x.save();x.translate(ox,cy);
  if(!full){x.beginPath();x.arc(0,0,R,0,7);x.lineWidth=w;x.strokeStyle='rgba(255,255,255,.045)';x.stroke()}
  // depth shadow under the glass
  x.filter=`blur(${1.2*u}px)`;this.arcPath(x,R,a0,span,full);x.lineWidth=w+1.8*u;x.lineCap=full?'butt':'round';x.strokeStyle='rgba(0,0,0,.38)';x.stroke();
  // soft halo light
  x.filter=`blur(${(4+p.glow.v*.42)*u}px)`;this.arcPath(x,R,a0,span,full);x.lineWidth=w*1.45;x.strokeStyle=rgba(mid,.18+p.glow.v/40*.32);x.stroke();
  x.filter='none';x.restore();
  // ring body on its own layer, then glass shading on top of it
  const o=this.ox;o.setTransform(1,0,0,1,0,0);o.clearRect(0,0,W,W);o.globalCompositeOperation='source-over';o.translate(ox,cy);o.lineWidth=w;o.lineCap=full?'butt':'round';
  if(full){o.beginPath();o.arc(0,0,R,0,7);o.strokeStyle=rgba(mid);o.stroke()}
  else{const N=70,f=this.state==='work'?this.f:1,edge=1-f;for(let i=0;i<N;i++){const t=i/(N-1),z=Math.min(1,Math.max(0,(t-(edge-.12))/.24)),v=z*z*(3-2*z);
   o.beginPath();o.arc(0,0,R,a0+span*i/N,a0+span*(i+1)/N+.02);o.strokeStyle=rgba(mix(tail,head,f>=.999?1:v),.7+.3*t);o.stroke()}}
  const Ro=R+w/2;o.globalCompositeOperation='source-atop';
  g=o.createLinearGradient(-.4*Ro,-Ro,.4*Ro,Ro);g.addColorStop(0,'rgba(255,255,255,.42)');g.addColorStop(.34,'rgba(255,255,255,.03)');g.addColorStop(.72,'rgba(0,0,0,.30)');g.addColorStop(1,'rgba(255,255,255,.16)');
  o.fillStyle=g;o.fillRect(-Ro-2,-Ro-2,2*Ro+4,2*Ro+4);
  g=o.createLinearGradient(-.4*Ro,-Ro,.4*Ro,Ro);g.addColorStop(0,'rgba(244,251,255,.9)');g.addColorStop(.4,'rgba(191,228,255,.16)');g.addColorStop(.66,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(166,218,255,.45)');
  o.beginPath();o.arc(0,0,R+w/2-.45*u,0,7);o.lineWidth=.9*u;o.strokeStyle=g;o.stroke();
  g=o.createLinearGradient(.4*Ro,Ro,-.4*Ro,-Ro);g.addColorStop(0,'rgba(234,247,255,.55)');g.addColorStop(.55,'rgba(255,255,255,0)');
  o.beginPath();o.arc(0,0,R-w/2+.4*u,0,7);o.lineWidth=.8*u;o.strokeStyle=g;o.stroke();
  x.save();x.globalAlpha=.86*p.ra.v;x.drawImage(this.oc,0,0);x.restore();
  // ---- glass dot
  const dr=Math.max(.6,p.dr.v*p.dpop.v*p.scale.v)*u,da=this.state==='stop'?.5:1;
  x.save();x.translate(ox,cy);
  x.filter=`blur(${(2.5+p.glow.v*.2)*u}px)`;x.beginPath();x.arc(0,0,dr*1.15,0,7);x.fillStyle=rgba(dot,.22+p.glow.v/40*.3);x.fill();x.filter='none';
  g=x.createLinearGradient(-.4*dr,-dr,.4*dr,dr);g.addColorStop(0,rgba(mix(dot,[255,255,255],.5),.95*da));g.addColorStop(.34,rgba(dot,.92*da));g.addColorStop(.72,rgba(dot.map(v=>v*.62),.9*da));g.addColorStop(1,rgba(mix(dot,[255,255,255],.25),.9*da));
  x.beginPath();x.arc(0,0,dr,0,7);x.fillStyle=g;x.fill();
  g=x.createLinearGradient(-.4*dr,-dr,.4*dr,dr);g.addColorStop(0,'rgba(244,251,255,.9)');g.addColorStop(.4,'rgba(191,228,255,.15)');g.addColorStop(.66,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(166,218,255,.4)');
  x.beginPath();x.arc(0,0,Math.max(.3,dr-.3*u),0,7);x.lineWidth=.55*u;x.strokeStyle=g;x.stroke();x.restore();
  if(!this.rimC||this.rimC.width!==W){this.rimC=document.createElement('canvas');this.rimC.width=W;this.rimC.height=W;{const x=this.rimC.getContext('2d');let g;
  x.save();x.beginPath();x.arc(cx,cy,B-1.1*u,0,7);g=x.createLinearGradient(cx-.72*B,cy-.96*B,cx+.72*B,cy+.96*B);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(.46,'rgba(0,0,0,.08)');g.addColorStop(1,'rgba(185,212,238,.08)');
  x.filter=`blur(${.9*u}px)`;x.lineWidth=1.9*u;x.strokeStyle=g;x.stroke();x.filter='none';
  x.beginPath();x.arc(cx,cy,B,0,7);g=x.createLinearGradient(cx-.72*B,cy-.96*B,cx+.72*B,cy+.96*B);
  [[0,'rgba(233,243,255,.92)'],[.18,'rgba(175,200,226,.48)'],[.42,'rgba(127,151,178,.12)'],[.62,'rgba(127,151,178,.14)'],[.84,'rgba(167,193,220,.42)'],[1,'rgba(222,237,255,.74)']].forEach(([o2,c])=>g.addColorStop(o2,c));
  x.lineWidth=.5*u;x.strokeStyle=g;x.stroke();x.restore();
  }}
  x.drawImage(this.rimC,0,0);
 }
}

// ===== Shared helpers for the other two looks =====
const smooth=(e0,e1,x)=>{const z=Math.min(1,Math.max(0,(x-e0)/(e1-e0)));return z*z*(3-2*z)};
function glassBead(x,cx,cy,r,col,a,u,glow){ // the logo's glass dot recipe
  if(r<=.2)return;
  x.save();x.filter=`blur(${(2.5+glow*.2)*u}px)`;x.beginPath();x.arc(cx,cy,r*1.15,0,7);x.fillStyle=rgba(col,(.22+glow/40*.3)*a);x.fill();x.filter='none';
  let g=x.createLinearGradient(cx-.4*r,cy-r,cx+.4*r,cy+r);g.addColorStop(0,rgba(mix(col,[255,255,255],.5),.95*a));g.addColorStop(.34,rgba(col,.92*a));g.addColorStop(.72,rgba(col.map(v=>v*.62),.9*a));g.addColorStop(1,rgba(mix(col,[255,255,255],.25),.9*a));
  x.beginPath();x.arc(cx,cy,r,0,7);x.fillStyle=g;x.fill();
  g=x.createLinearGradient(cx-.4*r,cy-r,cx+.4*r,cy+r);g.addColorStop(0,`rgba(244,251,255,${.9*a})`);g.addColorStop(.4,`rgba(191,228,255,${.15*a})`);g.addColorStop(.66,'rgba(255,255,255,0)');g.addColorStop(1,`rgba(166,218,255,${.4*a})`);
  x.beginPath();x.arc(cx,cy,Math.max(.3,r-.3*u),0,7);x.lineWidth=.55*u;x.strokeStyle=g;x.stroke();x.restore();
}
function glassShade(o,x0,y0,x1,y1,u){ // top light, bottom dark, like the logo glass (source-atop on a layer)
  o.globalCompositeOperation='source-atop';
  let g=o.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,'rgba(255,255,255,.42)');g.addColorStop(.34,'rgba(255,255,255,.03)');g.addColorStop(.72,'rgba(0,0,0,.30)');g.addColorStop(1,'rgba(255,255,255,.16)');
  o.fillStyle=g;o.fillRect(-9999,-9999,19999,19999);o.globalCompositeOperation='source-over';
}
function layer(self,W){if(!self.oc||self.oc.width!==W){self.oc=document.createElement('canvas');self.oc.width=W;self.oc.height=W;self.ox=self.oc.getContext('2d')}const o=self.ox;o.setTransform(1,0,0,1,0,0);o.clearRect(0,0,W,W);return o}
function capsule(x,cx,cy,w,h,sag=0,gap=0,noBegin){if(gap>.5){const hw=Math.max(h,(w-gap)/2);x.beginPath();capsule(x,cx-gap/2-hw/2,cy,hw,h,0,0,1);capsule(x,cx+gap/2+hw/2,cy,hw,h,0,0,1);return}
  const r=h/2,l=cx-w/2+r,q=cx+w/2-r;if(!noBegin)x.beginPath();x.moveTo(l,cy-r);x.quadraticCurveTo(cx,cy-r+2*sag,q,cy-r);x.arc(q,cy,r,-Math.PI/2,Math.PI/2);x.quadraticCurveTo(cx,cy+r+2*sag,l,cy+r);x.arc(l,cy,r,Math.PI/2,Math.PI*1.5);x.closePath()}

// ===== BREATH: one glass capsule =====
const BREATH={ready:[30,10,.62],listen:[34,12,1],work:[38,11,1],need:[42,13,1],done:[38,12,1],stop:[17,10,.9],prob:[34,12,1]};
class Breath extends Lens{
  constructor(cv,state,mini){super(cv,state,mini);this.bw=new S(30);this.bh=new S(9);this.ba=new S(.62);this.sweep=0;this.rock=new S(0);this.sag=new S(0);this.lift=new S(0);this.gap=new S(0);this.rockSide=1;this.seenKnocks=0;this.needV=this.needV||'hop';this.tq=[];this.tt=0;this.cyc=0;this.cycT=0}
  extraMoving(){return Math.abs(this.bw.vel)+Math.abs(this.bh.vel)+Math.abs(this.rock.vel)+Math.abs(this.sag.vel)+Math.abs(this.lift.vel)+Math.abs(this.gap.vel)>.02}
  set(n){super.set(n);if(!this.bw)return;const [w,h,a]=BREATH[n];this.bw.t=w;this.bh.t=h;this.ba.t=a;if(n==='listen'){this.bw.v=Math.min(this.bw.v,w*.6)}if(n==='done'){this.bw.v=w*.7;this.bh.v=h*1.5}
    if(n==='need'&&this.needV!=='rock'){this.knock=1e9;this.cyc=0;this.cycT=.25}}   // Breath makes its own Needs-you movement
  update(dt){super.update(dt);const s=this.state,soft=s==='stop';
    if(s==='listen'){const L=Math.max(0,this.lvl.v);this.bw.t=BREATH.listen[0]+L*9;this.bh.t=BREATH.listen[1]+L*3.5}
    const R=MOTION.reduce;
    const V=this.needV;
    if(s==='need'&&!R&&V==='rock'){if(this.knocks!==this.seenKnocks){this.seenKnocks=this.knocks;this.rockSide*=-1}this.rock.t=.1*this.rockSide}else{this.rock.t=0;this.seenKnocks=0}
    if(s==='need'&&!R&&V!=='rock'){this.cycT-=dt;if(this.cycT<=0){this.cyc++;this.cycT=this.cyc<3?2.6:15;this.tq=[0,.33];this.tt=0}   // two taps, 3 times, then rest
      this.tt+=dt;while(this.tq.length&&this.tt>=this.tq[0]){this.tq.shift();
        if(V==='tap'){this.bh.vel+=55;this.bw.vel-=40}        // B: squash like a knuckle tap
        if(V==='reach'){this.bw.vel+=110}                      // C: stretches out towards you
        if(V==='hop'){this.lift.vel-=85}                       // D: hops up, like raising a hand
        if(V==='split'){this.gap.vel+=95}}}                    // E: splits in two and snaps back
    else{this.tq=[]}
    this.sag.t=s==='prob'?2.6:0;   // 7. Problem: the bar sags in the middle
    const sf=soft||R;this.bw.step(dt,sf?95:200,sf?20:10);this.bh.step(dt,sf?95:220,sf?20:9);this.ba.step(dt,60,14);this.rock.step(dt,170,12);this.sag.step(dt,120,16);this.lift.step(dt,170,11);this.gap.step(dt,190,13);if(!R)this.sweep=(this.sweep+dt/1.6)%1}
  draw(){const x=this.ctx,W=this.W,u=W/100,p=this.p,cx=W/2+this.shake*u;let cy=W/2;x.clearRect(0,0,W,W);
    const tail=this.tail.map(s=>s.v),head=this.head.map(s=>s.v),f=this.state==='work'?this.f:1,mid=mix(tail,head,f);
    const sc=p.scale.v,w=this.bw.v*2*u*sc,h=Math.max(1,this.bh.v*u*sc),sg=this.sag.v*u*sc,gp=Math.max(0,this.gap.v)*u*sc;cy+=this.lift.v*u;x.save();x.translate(cx,cy);x.rotate(this.rock.v);x.translate(-cx,-cy);
    // ripple (Completed)
    this.ripples.forEach(r=>{x.save();x.globalAlpha=r.a*.8;capsule(x,cx,cy,w+r.r*26*u,h+r.r*14*u);x.lineWidth=1.1*u;x.strokeStyle=rgba(head);x.stroke();x.restore()});
    // depth shadow + halo
    x.save();x.filter=`blur(${1.2*u}px)`;capsule(x,cx,cy+.6*u,w+1.6*u,h+1.6*u,sg,gp);x.fillStyle='rgba(0,0,0,.4)';x.fill();
    x.filter=`blur(${(3+p.glow.v*.3)*u}px)`;capsule(x,cx,cy,w*1.02,h*1.3,sg,gp);x.fillStyle=rgba(mid,(.14+p.glow.v/40*.3)*this.ba.v);x.fill();x.restore();
    // body on its own layer
    const o=layer(this,W);o.translate(cx,cy);o.rotate(this.rock.v);o.translate(-cx,-cy);capsule(o,cx,cy,w,h,sg,gp);
    if(this.state==='work'||f<.999){const g=o.createLinearGradient(cx-w/2,0,cx+w/2,0),edge=1-f;
      for(let i=0;i<=20;i++){const t=i/20;g.addColorStop(t,rgba(mix(tail,head,f>=.999?1:smooth(edge-.12,edge+.12,t)),.75+.25*t))}o.fillStyle=g}
    else o.fillStyle=rgba(mid);
    o.fill();
    if(this.state==='work'&&!MOTION.reduce){const sx=cx-w/2+(this.sweep*1.6-.3)*w,g=o.createLinearGradient(sx-w*.25,0,sx+w*.25,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.32)');g.addColorStop(1,'rgba(255,255,255,0)');
      o.globalCompositeOperation='source-atop';o.fillStyle=g;o.fillRect(cx-w,cy-h,2*w,2*h);o.globalCompositeOperation='source-over'}
    glassShade(o,0,cy-h/2,0,cy+h/2,u);
    o.globalCompositeOperation='source-atop';let g=o.createLinearGradient(0,cy-h/2,0,cy+h/2);g.addColorStop(0,'rgba(244,251,255,.85)');g.addColorStop(.3,'rgba(255,255,255,0)');g.addColorStop(.85,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(166,218,255,.45)');
    capsule(o,cx,cy,w-.9*u,h-.9*u,sg,gp);o.lineWidth=.8*u;o.strokeStyle=g;o.stroke();o.globalCompositeOperation='source-over';
    x.restore();x.save();x.globalAlpha=.88*this.ba.v;x.drawImage(this.oc,0,0);x.restore();
  }
}

// ===== EYES: two cute glass ovals with a real gaze =====
// [width, height, pupil size] per state. The oval itself changes shape; there are no eyelids.
const EYES={ready:[1,1,7.4],listen:[1,1.08,8.4],work:[1.12,.56,6.4],need:[1,1.18,9.2],done:[1,1,7],stop:[1.1,.16,5],prob:[1.05,.84,6.8]};
const MOUSE={x:-1,y:-1,on:false,t:0};addEventListener('mousemove',e=>{MOUSE.x=e.clientX;MOUSE.y=e.clientY;MOUSE.on=true;MOUSE.t=performance.now()});document.addEventListener('mouseleave',()=>MOUSE.on=false);
function eyePath(x,ex,ey,rx,ry,droop,side){ // an oval; 'droop' tips the outer corners down for a sorry, puppy-eyed look
  x.beginPath();x.ellipse(ex,ey,rx,ry,side*droop,0,Math.PI*2)}
class Eyes extends Lens{
  constructor(cv,state,mini){super(cv,state,mini);this.sx=new S(1);this.sy=new S(1);this.pr=new S(7.4);this.happy=new S(0);this.lx=new S(0);this.ly=new S(0);this.bl=new S(1);
    this.tilt=new S(0);this.droop=new S(0);this.hop=new S(0);this.sl=new S(0);this.pz=new S(0);this.stopV=this.stopV||'sleep';this.tiltT=0;this.tiltSide=-1;this.tilts=0;this.blinkT=2+Math.random()*2;this.blinkHold=0;this.trail=[];this.gazeT=0;this.gx=0;this.gy=0;this.sampleT=0;this.speak=0;this.nodCd=0}
  extraMoving(){let e=0;for(const k of ['sx','sy','pr','happy','lx','ly','bl','tilt','droop','hop','sl','pz'])e+=Math.abs(this[k].vel);return e>.02||(MOUSE.on&&performance.now()-MOUSE.t<2200)}
  set(n){super.set(n);if(!this.sx)return;const [w,h,r]=EYES[n];this.sx.t=w;this.sy.t=h;this.pr.t=r;this.happy.t=n==='done'?1:0;
    this.tilt.t=n==='need'?-.17:0;this.tiltT=2.6;this.tiltSide=-1;this.tilts=0;this.kq=n==='need'&&!MOTION.reduce?[.45,.78]:[];this.kt=0;if(n==='need')this.knock=1e9;this.sl.t=0;this.pz.t=0;
    if(n==='stop'){const v=this.stopV;if(v==='sleep'){this.sx.t=1;this.sy.t=1;this.sl.t=1}if(v==='pause'){this.sx.t=1;this.sy.t=1;this.pz.t=1}if(v==='calm'){this.sx.t=1.05;this.sy.t=.42;this.pr.t=5.6}if(v==='dots'){this.sx.t=.36;this.sy.t=.36;this.pr.t=5.4}}this.droop.t=n==='prob'?.3:0;
    if(n==='listen'){this.sy.v=.7;this.pr.v=r*.7} if(n==='need'){this.sy.v=.85}
    if(n==='done'&&!MOTION.reduce){this.hop.vel=-105} this.gazeT=0}
  update(dt){super.update(dt);const s=this.state,R=MOTION.reduce,soft=s==='stop'||R,t=this.time;
    // 3. Listening: pupils grow with your voice, and a tiny "mm-hm" nod when you pause
    if(s==='listen'){const L=Math.max(0,this.lvl.v);this.pr.t=EYES.listen[2]+L*2.6;
      if(this.lvl.t>0)this.speak+=dt;this.nodCd-=dt;
      if(!R&&this.lvl.t===0&&this.speak>.9&&this.nodCd<=0){this.sy.vel-=3.2;this.ly.vel+=3;this.speak=0;this.nodCd=1.4}}
    // 1 + 2. Gaze: look at the cursor only while it moves, then look away; move in quick little jumps
    const recent=MOUSE.on&&performance.now()-MOUSE.t<2200,follow=['ready','listen','need','prob'].includes(s);
    this.gazeT-=dt;this.sampleT-=dt;
    if(s==='work'){this.gx=R?0:Math.sin(t*Math.PI*2/1.9);this.gy=0}
    else if(follow&&recent&&!R){if(this.sampleT<=0){this.sampleT=.12+Math.random()*.1;const r=this.rect||this.cv.getBoundingClientRect(),dx=MOUSE.x-(r.left+r.width/2),dy=MOUSE.y-(r.top+r.height/2),d=Math.hypot(dx,dy)||1,k=Math.min(1,d/(r.width*1.6));this.gx=dx/d*k;this.gy=dy/d*k}}
    else if(s==='need'){this.gx=0;this.gy=-.15}
    else if(s==='prob'){this.gx=0;this.gy=.4}
    else if(R||this.idle){this.gx=0;this.gy=0}
    else if(s==='ready'||s==='listen'){if(this.gazeT<=0){this.gazeT=s==='ready'?1.1+Math.random()*2.2:.6+Math.random()*.9;const wide=s==='ready'?1:.25;
        if(Math.random()<.3){this.gx=0;this.gy=0}else{this.gx=(Math.random()*2-1)*.75*wide;this.gy=(Math.random()*2-1)*.45*wide}}}
    else{this.gx=0;this.gy=0}
    if(s==='stop'){this.gx=0;this.gy=this.stopV==='calm'?.6:0}
    if(s==='need'){if(!R){this.tiltT-=dt;if(this.tiltT<=0){this.tilts++;this.tiltT=this.tilts<2?2.6:15;this.tiltSide*=-1;this.kq=[.45,.78];this.kt=0}}this.tilt.t=.17*this.tiltSide;
      this.kt+=dt;while(this.kq.length&&this.kt>=this.kq[0]){this.kq.shift();this.hop.vel-=48;this.p.scale.vel+=1.8}}
    this.lx.t=this.gx;this.ly.t=this.gy;
    // cute blinks: the whole oval squashes for a moment, sometimes twice
    this.blinkT-=dt;if(this.blinkT<=0){this.blinkT=2.8+Math.random()*2.6;if(['ready','listen','need'].includes(s)&&!R&&!this.idle){this.blinkHold=.11;if(Math.random()<.25)this.blinkT=.32}}
    this.blinkHold=Math.max(0,this.blinkHold-dt);if(s==='ready')this.sl.t=this.deep?1:0;   // 10. deep sleep: the eyes close
    this.bl.t=this.blinkHold>0?.08:1;
    this.sx.step(dt,soft?95:190,soft?20:10);this.sy.step(dt,soft?95:190,soft?20:9);this.pr.step(dt,220,11);this.happy.step(dt,170,24);
    const jumpy=s!=='work';this.lx.step(dt,jumpy?650:400,jumpy?46:40);this.ly.step(dt,jumpy?650:300,jumpy?46:30);this.bl.step(dt,900,40);
    this.tilt.step(dt,150,10);this.sl.step(dt,150,24);this.pz.step(dt,90,18);this.droop.step(dt,120,14);this.hop.step(dt,150,7);
    this.trail.unshift(this.lx.v);this.trail.length=Math.min(this.trail.length,90);
  }
  draw(){const x=this.ctx,W=this.W,u=W/100,p=this.p,sc=p.scale.v;x.clearRect(0,0,W,W);
    const tail=this.tail.map(s=>s.v),head=this.head.map(s=>s.v),dot=this.dotc.map(s=>s.v),isW=this.state==='work',f=isW?this.f:1;
    const R=17*u*sc,gap=19.6*u*sc,cy=W/2+this.hop.v*u*.35,close=Math.max(0,Math.min(1,Math.max(this.happy.v,this.sl.v))),pzz=Math.max(0,Math.min(1,this.pz.v)),hap=Math.max(smooth(.55,.7,close),pzz),shut=smooth(0,.6,close),mode=this.sl.v>=this.happy.v?1:-1,dr=Math.max(0,this.droop.v);
    const rx=R*Math.max(.2,this.sx.v),ry=Math.max(.6*u,R*this.sy.v*Math.max(.05,this.bl.v)*(1-.94*shut));   // eyes close into the Sleeping / happy shape
    this.ripples.forEach(r=>{x.beginPath();x.ellipse(W/2,cy,(gap+R)*(1+r.r*.6),R*(1+r.r*.9),0,0,7);x.lineWidth=1.1*u;x.strokeStyle=rgba(head,r.a*.7);x.stroke()});
    x.save();x.translate(W/2,cy);x.rotate(this.tilt.v);x.translate(-W/2,-cy);   // 4. head tilt when asking
    for(const side of [-1,1]){const ex=W/2+side*gap+this.shake*u,y0=cy+mode*.12*R,ey=cy+(y0-cy)*shut;
      x.save();x.globalAlpha=1-hap;
      x.filter=`blur(${(3+p.glow.v*.35)*u}px)`;eyePath(x,ex,ey,rx*.9,ry*.9,dr,side);x.fillStyle=rgba(dot,.10+p.glow.v/40*.22);x.fill();x.filter='none';
      x.shadowColor='rgba(0,6,15,.5)';x.shadowBlur=3*u;x.shadowOffsetY=1*u;
      let g=x.createRadialGradient(ex,ey-ry*.25,0,ex,ey-ry*.25,Math.max(rx,ry)*1.6);g.addColorStop(0,'#080C13');g.addColorStop(.38,'#0E141D');g.addColorStop(.62,'#1E2633');
      eyePath(x,ex,ey,rx,ry,dr,side);x.fillStyle=g;x.fill();x.shadowColor='transparent';
      x.save();eyePath(x,ex,ey,rx,ry,dr,side);x.clip();
      const pr=Math.max(.5,this.pr.v*p.dpop.v)*u*sc*Math.min(1,.35+this.sy.v*.75);
      const mx=Math.max(0,rx-pr*1.05),my=Math.max(0,ry-pr*1.05),px=ex+this.lx.v*mx*.85,py=ey+this.ly.v*my*.85;
      if(isW){const n=Math.min(this.trail.length,34),edge=1-f;
        for(let k=n-1;k>=1;k--){const t=1-k/n,c=mix(tail,head,f>=.999?1:smooth(edge-.12,edge+.12,t));x.beginPath();x.arc(ex+this.trail[k]*mx*.85,py,pr*(.45+.55*t),0,7);x.fillStyle=rgba(c,.05+.35*t*t);x.fill()}}
      glassBead(x,px,py,pr,dot,this.state==='stop'?.55:1,u,p.glow.v);
      if(pr>1.5*u&&this.state!=='stop'){x.fillStyle='rgba(255,255,255,.92)';x.beginPath();x.arc(px-pr*.34,py-pr*.38,pr*.3,0,7);x.fill();
        x.fillStyle='rgba(255,255,255,.65)';x.beginPath();x.arc(px+pr*.34,py+pr*.32,pr*.13,0,7);x.fill()}
      g=x.createLinearGradient(ex-.7*rx,ey-ry,ex+.7*rx,ey+ry);g.addColorStop(0,'rgba(0,0,0,.45)');g.addColorStop(.46,'rgba(0,0,0,.06)');g.addColorStop(1,'rgba(185,212,238,.08)');
      x.filter=`blur(${.7*u}px)`;eyePath(x,ex,ey,Math.max(.5,rx-.8*u),Math.max(.5,ry-.8*u),dr,side);x.lineWidth=1.5*u;x.strokeStyle=g;x.stroke();x.filter='none';
      g=x.createLinearGradient(0,ey-ry,0,ey);g.addColorStop(0,'rgba(228,240,255,.10)');g.addColorStop(1,'rgba(228,240,255,0)');x.beginPath();x.ellipse(ex-rx*.15,ey-ry*.45,rx*.62,ry*.38,-.2,0,7);x.fillStyle=g;x.fill();
      x.restore();
      g=x.createLinearGradient(ex-.7*rx,ey-ry,ex+.7*rx,ey+ry);
      [[0,'rgba(233,243,255,.9)'],[.2,'rgba(175,200,226,.45)'],[.45,'rgba(127,151,178,.12)'],[.85,'rgba(167,193,220,.42)'],[1,'rgba(222,237,255,.7)']].forEach(([a,c])=>g.addColorStop(a,c));
      eyePath(x,ex,ey,rx,ry,dr,side);x.lineWidth=.45*u;x.strokeStyle=g;x.stroke();x.restore();
      if(pzz>.01){const w=6.5*u*sc,h=22*u*sc*(.4+.6*pzz);x.save();x.globalAlpha=pzz;   // Stopped B: the eyes become a pause sign
        x.filter=`blur(${3*u}px)`;x.beginPath();x.roundRect(ex*.5+W/4-w/2,ey-h/2,w,h,w/2);x.fillStyle=rgba(head,.25);x.fill();x.filter='none';
        const lo=layer(this,W);lo.beginPath();lo.roundRect(ex*.5+W/4-w/2,ey-h/2,w,h,w/2);lo.fillStyle=rgba(head);lo.fill();glassShade(lo,ex-w,ey-h/2,ex+w,ey+h/2,u);x.drawImage(this.oc,0,0);x.restore()}
      if(close>.45){const al=smooth(.45,.62,close),sag=smooth(.55,1,close),hw=R*.8,cyy=y0+mode*sag*R*.8;   // the closed eye bends into ◡ (Sleeping) or ◠ (Completed)
        const path=c=>{c.beginPath();c.moveTo(ex-hw,y0);c.quadraticCurveTo(ex,cyy,ex+hw,y0)};
        x.save();x.globalAlpha=al;x.filter=`blur(${(3+p.glow.v*.3)*u}px)`;path(x);x.lineWidth=5*u;x.lineCap='round';x.strokeStyle=rgba(head,.4);x.stroke();x.filter='none';
        const lo=layer(this,W);path(lo);lo.lineWidth=3.5*u;lo.lineCap='round';lo.strokeStyle=rgba(head);lo.stroke();
        glassShade(lo,0,Math.min(y0,cyy)-2*u,0,Math.max(y0,cyy)+2*u,u);x.drawImage(this.oc,0,0);x.restore()}
    }
    x.restore();
  }
}
STATES.work.feel='Thinking. Violet grows from the front, blue stays behind.';
STATES.listen.feel='Opens fast. It follows your voice.';
STATES.ready.feel='Resting. Goes still when unused, then falls asleep.';
STATES.need.feel='Knock, knock (3 times), then waits quietly.';
STATES.prob.feel='One small "no" shake, a short glow, then calm red.';

