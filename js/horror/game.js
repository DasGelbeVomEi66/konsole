// Horror-Kanal "FOSSIL – Ebene -3": Ego-Perspektive, keine Waffen. Ein unterirdisches Labor, in dem
// Raubsaurier ausgebrochen sind. Verstecken in Spinden, Luft anhalten, Strom wiederherstellen, raus.
import * as THREE from '../../lib/three.module.min.js';
import { MAP, GW, GH, CELL, ROOMS, at, isFloor, cx, cz, cellOf, buildLab, labMaterials } from './lab.js';
import { makeDino } from './dino.js';
import { makeAudio } from './audio.js';
import { paperCanvas, mapCanvas } from './tex.js';
import { makeDust } from './world.js';

const V3 = THREE.Vector3, TAU = Math.PI * 2, clamp = THREE.MathUtils.clamp;
const R = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

// ---------- Texte ----------
const NOTES = {
  lobby: { title: 'Besucherhinweis Ebene -3', lines: ['Willkommen im Lindholm-Institut.', '', 'Bei Stromausfall bleibt der', 'Notausgang (Treppenhaus West)', 'verriegelt, bis der Generator', 'wieder läuft.', '', 'Generatorraum: Ostflügel.', 'Zutritt nur mit Sicherheitskarte.'] },
  sec: { title: 'Schichtbuch Sicherheit', lines: ['03:12  Alarm Gehege B.', '03:14  Kamera 4 ausgefallen.', '03:20  Müller geht nachsehen.', '03:41  Müller meldet sich nicht.', '', 'Ersatzsicherung für den Generator', 'liegt im Lager (Ostflügel).', '', '!Ich gehe jetzt. Karte bleibt hier.'] },
  lab: { title: 'Labornotiz Dr. Albers', lines: ['K-7 und K-9 jagen zu zweit.', 'Eine lenkt ab, die andere kommt', 'von der Seite.', '', 'Licht macht dich für sie sichtbar.', 'Direkt in die Augen geleuchtet:', 'kurze Schreckstarre.', '', '!Sie hören jeden Atemzug.'] },
  kantine: { title: '(auf einer Serviette)', lines: ['Wir haben uns im Spind versteckt.', 'Es stand direkt davor.', 'Ich habe die Luft angehalten,', 'bis es weg war.', '', 'Sie hat es nicht geschafft.', '', '!Nicht atmen. Nicht atmen.'], blood: true },
  arzt: { title: 'Befund K-2', lines: ['Das Tier im Biodom wächst', 'schneller als berechnet.', 'Das Panzerglas ist für', 'zwölf Tonnen ausgelegt.', '', 'Gestern hat sie dagegen', 'gedrückt. Absichtlich.', '', 'Wir sollten es dicker machen.'] },
};
const PA = {
  start: 'DURCHSAGE: Eindämmung Sektor B fehlgeschlagen. Notstrombetrieb. Notausgang verriegelt bis zur Wiederherstellung der Hauptversorgung.',
  card: 'DURCHSAGE: Unbefugter Zugriff Sicherheitskarte. Gehege C entriegelt.',
  power: 'DURCHSAGE: Hauptversorgung wiederhergestellt. Notausgang West entriegelt. Alle Personen sofort evakuieren.',
};
const GOALS = ['Strom wiederherstellen: Generatorraum im Ostflügel', 'Sicherheitskarte holen: Sicherheitsbüro im Westflügel', 'Ersatzsicherung holen: Lager im Ostflügel', 'Sicherung einsetzen und Generator starten', 'Raus: Notausgang im Treppenhaus West (über die Umkleide)'];

const CSS = `.hr{position:absolute;top:0;right:0;bottom:0;left:0;background:#000;overflow:hidden;font-family:Georgia,'Times New Roman',serif;color:#d8d2c4}
.hr canvas{position:absolute;top:0;left:0;width:100%;height:100%;display:block}
.hr-sub{position:absolute;left:10%;right:10%;bottom:9%;text-align:center;font-size:clamp(17px,1.9vw,26px);text-shadow:0 2px 6px #000,0 0 2px #000;opacity:0;transition:opacity .6s}
.hr-sub.pa{font-family:'Courier New',monospace;color:#d8e8d0;font-size:clamp(15px,1.6vw,22px);letter-spacing:.03em}
.hr-hint{position:absolute;left:50%;top:50%;transform:translate(-50%,26px);font-size:clamp(14px,1.4vw,19px);font-family:Arial,sans-serif;letter-spacing:.06em;opacity:0;transition:opacity .25s;text-shadow:0 1px 4px #000;color:#cfc8b8;white-space:nowrap}
.hr-dot{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:rgba(220,210,190,.5);opacity:0;transition:opacity .25s}
.hr-goal{position:absolute;left:3%;top:4%;font-family:Arial,sans-serif;font-size:clamp(13px,1.25vw,17px);color:#b8b2a2;opacity:0;transition:opacity 1.2s;text-shadow:0 1px 3px #000;max-width:40%}
.hr-goal b{display:block;font-size:11px;letter-spacing:.2em;color:#8a8478;margin-bottom:4px;font-weight:normal}
.hr-inv{position:absolute;right:3%;bottom:5%;font-family:Arial,sans-serif;font-size:14px;color:#a8a294;text-align:right;text-shadow:0 1px 3px #000}
.hr-fade{position:absolute;top:0;right:0;bottom:0;left:0;background:#000;pointer-events:none;opacity:1}
.hr-slats{position:absolute;top:0;right:0;bottom:0;left:0;pointer-events:none;display:none;background:repeating-linear-gradient(180deg,#000 0,#000 4.2vh,rgba(0,0,0,0) 4.2vh,rgba(0,0,0,0) 7.2vh),radial-gradient(ellipse at center,rgba(0,0,0,0) 20%,#000 75%)}
.hr-breath{position:absolute;left:50%;bottom:24%;width:220px;height:6px;margin-left:-110px;background:rgba(255,255,255,.12);display:none}
.hr-breath i{display:block;height:100%;background:#c8d0d8;width:100%}
.hr-note{position:absolute;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;flex-direction:column}
.hr-note img{max-height:80vh;max-width:90vw;box-shadow:0 20px 60px #000}
.hr-note small,.hr-menu small{margin-top:14px;font-family:Arial,sans-serif;color:#8a8478;font-size:15px}
.hr-menu{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(ellipse at center,rgba(0,0,0,.1),rgba(0,0,0,.78))}
.hr-menu h1{font-size:clamp(60px,10vw,150px);letter-spacing:.35em;margin:0 0 0 .35em;font-weight:normal;color:#cfc6b0;text-shadow:0 0 30px rgba(0,0,0,.9),0 0 3px #000}
.hr-menu h2{font-weight:normal;font-style:italic;font-size:clamp(16px,1.8vw,24px);color:#8f887a;margin:4px 0 36px}
.hr-menu .b{display:block;min-width:300px;margin:8px;padding:12px 30px;background:rgba(20,18,14,.6);border:1px solid #5a5446;color:#d8d2c4;font-family:Georgia,serif;font-size:22px;letter-spacing:.08em;transition:background .2s,border-color .2s}
.hr-menu .b.hover{background:rgba(90,20,14,.65);border-color:#c8a080}
.hr-menu p{max-width:680px;color:#8a8478;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin-top:26px}
.hr-load{position:absolute;bottom:6%;right:5%;font-style:italic;color:#6a6458}`;

export function openHorror(box, K) {
  if (!document.getElementById('hr-css')) { const st = document.createElement('style'); st.id = 'hr-css'; document.head.appendChild(st); }
  document.getElementById('hr-css').textContent = CSS;
  box.innerHTML = `<div class="hr"><canvas></canvas><div class="hr-slats"></div><div class="hr-dot"></div><div class="hr-hint"></div><div class="hr-sub"></div><div class="hr-goal"></div><div class="hr-inv"></div><div class="hr-breath"><i></i></div>
    <div class="hr-note"><img alt="Notiz"><small>A oder B: weglegen</small></div><div class="hr-menu"></div><div class="hr-fade"></div></div>`;
  const root = box.firstChild, q = s => root.querySelector(s), canvas = q('canvas');
  const cursorEl = document.getElementById('cursor');
  let closed = false, paused = false;

  // ---------- Renderer ----------
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); if (!renderer.capabilities.isWebGL2) throw new Error('webgl1'); }
  catch (e) { q('.hr-menu').innerHTML = '<h2>Dieser Browser kann kein 3D (WebGL 2). Bitte am Laptop in Edge spielen.</h2>'; q('.hr-fade').style.opacity = 0; return { close() {} }; }
  const DPR = Math.min(devicePixelRatio || 1, 1.25);
  renderer.setPixelRatio(DPR); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#000');
  scene.fog = new THREE.FogExp2('#030405', 0.07);
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.08, 90); cam.rotation.order = 'YXZ'; scene.add(cam);

  // ---------- Nachbearbeitung: Umgebungsverdeckung (SSAO), Bloom, Kantenglättung, Farbe, Körnung ----------
  const post = (() => {
    const hf = THREE.HalfFloatType;
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: hf }); rt.depthTexture = new THREE.DepthTexture(4, 4); rt.depthTexture.type = THREE.UnsignedIntType;
    const rAO = new THREE.WebGLRenderTarget(4, 4), rAO2 = new THREE.WebGLRenderTarget(4, 4);
    const rA = new THREE.WebGLRenderTarget(4, 4, { type: hf }), rB = new THREE.WebGLRenderTarget(4, 4, { type: hf });
    const qs = new THREE.Scene(), qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; qs.add(quad);
    const vs = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
    const ao = new THREE.ShaderMaterial({ uniforms: { tD: { value: null }, pInv: { value: new THREE.Matrix4() }, proj: { value: new THREE.Matrix4() }, res: { value: new THREE.Vector2() }, rad: { value: 0.55 } }, vertexShader: vs,
      fragmentShader: `uniform sampler2D tD; uniform mat4 pInv, proj; uniform vec2 res; uniform float rad; varying vec2 vUv;
        vec3 vp(vec2 uv){ float d=texture2D(tD,uv).x; vec4 c=vec4(uv*2.-1., d*2.-1., 1.); vec4 v=pInv*c; return v.xyz/v.w; }
        void main(){ float d=texture2D(tD,vUv).x; if(d>=.9999){ gl_FragColor=vec4(1.); return; }
          vec3 P=vp(vUv); vec2 px=1./res; vec3 N=normalize(cross(vp(vUv+vec2(px.x,0.))-P, vp(vUv+vec2(0.,px.y))-P));
          float rn=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453), o=0.;
          for(int i=0;i<12;i++){ float a=(float(i)+rn)*2.39996, r=(float(i)+.5)/12.;
            vec3 S=P+vec3(cos(a),sin(a),0.)*r*rad+N*rad*.35*r; vec4 sp=proj*vec4(S,1.); vec2 su=sp.xy/sp.w*.5+.5;
            vec3 Q=vp(su), v=Q-P; float l=length(v); o+=max(0.,dot(N,v/max(l,1e-4))-.12)*smoothstep(rad*2.2,0.,l); }
          gl_FragColor=vec4(vec3(clamp(1.-o/12.*2.,0.,1.)),1.); }` });
    const bright = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: vs, fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb; float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*smoothstep(.6,2.,l),1.); }' });
    const blur = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: vs,
      fragmentShader: 'uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb*.227; c+=(texture2D(t,vUv+d*1.38).rgb+texture2D(t,vUv-d*1.38).rgb)*.316; c+=(texture2D(t,vUv+d*3.23).rgb+texture2D(t,vUv-d*3.23).rgb)*.07; gl_FragColor=vec4(c,1.); }' });
    const comp = new THREE.ShaderMaterial({
      uniforms: { tS: { value: null }, tB: { value: null }, tAO: { value: null }, time: { value: 0 }, fear: { value: 0 }, red: { value: 0 }, fade: { value: 1 }, exposure: { value: 1.5 }, res: { value: new THREE.Vector2(1, 1) }, shake: { value: 0 }, aoK: { value: 0.9 } },
      vertexShader: vs,
      fragmentShader: `uniform sampler2D tS,tB,tAO; uniform float time,fear,red,fade,exposure,shake,aoK; uniform vec2 res; varying vec2 vUv;
        vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
        float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
        float lum(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
        vec3 fxaa(vec2 uv){ vec2 px=1./res; vec3 c=texture2D(tS,uv).rgb; float lc=lum(c), ln=lum(texture2D(tS,uv+vec2(0.,px.y)).rgb), ls=lum(texture2D(tS,uv-vec2(0.,px.y)).rgb), le=lum(texture2D(tS,uv+vec2(px.x,0.)).rgb), lw=lum(texture2D(tS,uv-vec2(px.x,0.)).rgb);
          float mx=max(lc,max(max(ln,ls),max(le,lw))), mn=min(lc,min(min(ln,ls),min(le,lw))); if(mx-mn<max(.04,mx*.12)) return c;
          vec2 dir=vec2(-((ln+ls)-(le+lw)), (lw+le)-(ln+ls)); dir=normalize(dir+1e-5)*px*1.2;
          return .5*(texture2D(tS,uv+dir*.5).rgb+texture2D(tS,uv-dir*.5).rgb)*.6+c*.4; }
        void main(){
          vec2 c0=vUv-.5; float r2=dot(c0,c0);
          vec2 uv=.5+c0*(1.-.04*r2-fear*.04*r2);
          uv+=vec2(sin(uv.y*24.+time*2.7),cos(uv.x*19.+time*2.1))*.0016*fear*fear;
          uv+=(vec2(hash(vec2(time,1.)),hash(vec2(1.,time)))-.5)*shake*.02;
          vec2 c=uv-.5; float ca=(.0012+fear*.006)*(.3+r2*4.);
          vec3 col=fxaa(uv); col.r=mix(col.r,texture2D(tS,uv+c*ca).r,.8); col.b=mix(col.b,texture2D(tS,uv-c*ca).b,.8);
          float a=texture2D(tAO,uv).r; col*=mix(1.,a,aoK);
          col+=texture2D(tB,uv).rgb*.9;
          col*=exposure; col=aces(col);
          float l=lum(col); col=mix(vec3(l),col,.82-fear*.3);
          col*=mix(vec3(.84,.97,.98),vec3(1.04,1.,.92),smoothstep(0.,.55,l));
          col=pow(col,vec3(1./2.2));
          float v=smoothstep(.95,.16-fear*.12,length(c0*vec2(1.25,1.)));
          col*=mix(.16,1.,v);
          col+=(hash(vUv*res+fract(time*7.31)*91.7)-.5)*(.05+fear*.05)*(1.2-l);
          col+=(hash(vec2(floor(vUv.y*res.y*.5),floor(time*24.)))-.5)*.007;
          col=mix(col,vec3(.4,0.,0.),red*(1.-v*.4));
          col*=1.-fade;
          gl_FragColor=vec4(col,1.);
        }` });
    let W = 4, Hh = 4;
    return {
      comp,
      setSize(w, h) { W = w; Hh = h; rt.setSize(w, h); rAO.setSize(w >> 1, h >> 1); rAO2.setSize(w >> 1, h >> 1); rA.setSize(w >> 2, h >> 2); rB.setSize(w >> 2, h >> 2); comp.uniforms.res.value.set(w, h); ao.uniforms.res.value.set(w, h); },
      render() {
        renderer.setRenderTarget(rt); renderer.render(scene, cam);
        ao.uniforms.tD.value = rt.depthTexture; ao.uniforms.proj.value.copy(cam.projectionMatrix); ao.uniforms.pInv.value.copy(cam.projectionMatrixInverse);
        quad.material = ao; renderer.setRenderTarget(rAO); renderer.render(qs, qc);
        quad.material = blur; blur.uniforms.t.value = rAO.texture; blur.uniforms.d.value.set(1.5 / (W >> 1), 0); renderer.setRenderTarget(rAO2); renderer.render(qs, qc);
        blur.uniforms.t.value = rAO2.texture; blur.uniforms.d.value.set(0, 1.5 / (Hh >> 1)); renderer.setRenderTarget(rAO); renderer.render(qs, qc);
        quad.material = bright; bright.uniforms.t.value = rt.texture; renderer.setRenderTarget(rA); renderer.render(qs, qc);
        quad.material = blur;
        for (let i = 0; i < 2; i++) {
          blur.uniforms.t.value = rA.texture; blur.uniforms.d.value.set(4 / W * (i + 1), 0); renderer.setRenderTarget(rB); renderer.render(qs, qc);
          blur.uniforms.t.value = rB.texture; blur.uniforms.d.value.set(0, 4 / Hh * (i + 1)); renderer.setRenderTarget(rA); renderer.render(qs, qc);
        }
        quad.material = comp; comp.uniforms.tS.value = rt.texture; comp.uniforms.tB.value = rA.texture; comp.uniforms.tAO.value = rAO.texture; renderer.setRenderTarget(null); renderer.render(qs, qc);
      },
      dispose() { for (const r of [rt, rAO, rAO2, rA, rB]) r.dispose(); },
    };
  })();
  function resize() { const w = box.clientWidth || innerWidth, h = box.clientHeight || innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); post.setSize(Math.round(w * DPR), Math.round(h * DPR)); }
  addEventListener('resize', resize);

  // ---------- Lichter: Taschenlampe mit Schatten und ein Pool von Punktlichtern ----------
  const hemi = new THREE.HemisphereLight('#5a6878', '#141010', 0.03); scene.add(hemi);
  const flash = new THREE.SpotLight('#fff0dc', 0, 28, 0.5, 0.7, 1.6);
  flash.castShadow = true; flash.shadow.mapSize.set(1024, 1024); flash.shadow.bias = -0.0004; flash.shadow.normalBias = 0.02; flash.shadow.camera.near = 0.1;
  scene.add(flash); scene.add(flash.target);
  const POOL = 12, pool = []; for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight('#dfe8ff', 0, 11, 1.6); scene.add(l); pool.push(l); }
  const domeLight = new THREE.DirectionalLight('#8affb0', 0); domeLight.position.set(cx(21), 30, cz(12)); domeLight.target.position.set(cx(21), 0, cz(12)); scene.add(domeLight); scene.add(domeLight.target);

  // ---------- Zustand ----------
  q('.hr-menu').innerHTML = '<div class="hr-load">Lädt …</div>'; q('.hr-fade').style.opacity = 0;
  let L = null, A = null, steamPts = null, sparkPts = null, dust = null;
  const P = { pos: new V3(), yaw: 0, pitch: 0, vel: new V3(), eyeK: 0, crouch: false, run: false, stamina: 1, bob: 0, lastStep: 0, lamp: true, lampWas: true, lampDir: new V3(0, 0, -1), moving: 0, hidden: null, breath: 1, holding: false, heavy: 0, yawTarget: null, pitchTarget: null };
  const IN = { mx: 0, my: 0, mvT: 0, lx: 0, ly: 0, lkT: 0, keys: {} };
  let mode = 'load', gen = 0, gtime = 0, waits = [], items = [], note = null;
  const S = { tension: 0, fear: 0, fade: 1, fadeTarget: 0, fadeSpeed: 1.2, red: 0, shake: 0, power: false, stage: 0, card: false, fuse: false, fuseIn: false, goal: 0, rexSlam: false, noise: [], lit: 0 };
  const raptors = [];
  let rex = null;
  const fwdV = new V3(0, 0, -1);

  const sub = (txt, dur = 4, isPa) => { const e = q('.hr-sub'); e.textContent = txt; e.classList.toggle('pa', !!isPa); e.style.opacity = 1; clearTimeout(sub.t); sub.t = setTimeout(() => e.style.opacity = 0, dur * 1000); };
  const sleep = s => new Promise(res => waits.push({ end: gtime + s, res, g: gen }));
  const store = { get: (k, d) => K.store.get(k, d), set: (k, v) => K.store.set(k, v) };
  function setGoal(i) { S.goal = i; const e = q('.hr-goal'); e.innerHTML = '<b>ZIEL</b>' + GOALS[i]; e.style.opacity = 1; clearTimeout(setGoal.t); setGoal.t = setTimeout(() => e.style.opacity = 0, 9000); }
  function inv() { q('.hr-inv').innerHTML = [S.card ? 'Sicherheitskarte' : '', S.fuse && !S.fuseIn ? 'Ersatzsicherung' : ''].filter(Boolean).join('<br>'); }
  function pa(key) { A.chime(); setTimeout(() => !closed && sub(PA[key], 9, true), 1200); }

  function phones(m) {
    if (m === 'play') K.send({ t: 'mode', m: 'pad', cfg: { title: 'FOSSIL', dark: true, twin: true, buttons: [{ b: 'USE', label: 'Benutzen', color: '#3d4145' }, { b: 'LAMP', label: 'Lampe', color: '#5a4a1a' }, { b: 'RUN', label: 'Rennen', color: '#3d4145' }, { b: 'CROUCH', label: 'Ducken', color: '#3d4145' }] } });
    else if (m === 'hide') K.send({ t: 'mode', m: 'pad', cfg: { title: 'Im Spind', dark: true, twin: true, buttons: [{ b: 'USE', label: 'Luft anhalten', color: '#2a3a4a' }, { b: 'EXIT', label: 'Raus', color: '#3d4145' }] } });
    else K.send({ t: 'mode', m: 'pointer' });
    if (cursorEl) cursorEl.style.visibility = (m === 'play' || m === 'hide') ? 'hidden' : '';
  }
  function noteTex(id) { const n = NOTES[id]; const t = new THREE.CanvasTexture(paperCanvas(n.lines, { title: n.title, blood: n.blood })); t.colorSpace = THREE.SRGBColorSpace; return t; }
  function showImg(canvasEl) { note = true; q('.hr-note img').src = canvasEl.toDataURL(); q('.hr-note').style.display = 'flex'; A.paper(); }
  function showNote(id) { const n = NOTES[id]; showImg(paperCanvas(n.lines, { title: n.title, blood: n.blood })); }
  function hideNote() { note = null; q('.hr-note').style.display = 'none'; A.paper(); }

  // ---------- Raster-Hilfen ----------
  const doorAt = (c, r) => L.doorMap[r * GW + c];
  function blocked(c, r, forDino) {
    const ch = at(c, r); if (!isFloor(ch) || ch === 'w') return true;
    if (ch === 'b' || (forDino && (ch === 'x' || ch === 'e'))) return true;
    const d = doorAt(c, r); if (d) { if (forDino) return d.kind !== 'd' && d.open < 0.9; return d.open < 0.8; }
    return false;
  }
  function pushOut(p, x0, x1, z0, z1, r) {
    const qx = clamp(p.x, x0, x1), qz = clamp(p.z, z0, z1), dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz);
    if (d < r) { if (d > 1e-5) { p.x = qx + dx / d * r; p.z = qz + dz / d * r; } else { const l = p.x - x0, rr = x1 - p.x, t = p.z - z0, b = z1 - p.z, m = Math.min(l, rr, t, b); if (m === l) p.x = x0 - r; else if (m === rr) p.x = x1 + r; else if (m === t) p.z = z0 - r; else p.z = z1 + r; } }
  }
  function collide(p, r = 0.3) {
    for (let it = 0; it < 2; it++) {
      const [c0, r0] = cellOf(p.x, p.z);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const c = c0 + dc, rr = r0 + dr; if (!blocked(c, rr, false)) continue;
        const d = doorAt(c, rr); let x0 = c * CELL, x1 = x0 + CELL, z0 = rr * CELL, z1 = z0 + CELL;
        if (d) { if (d.passX) { x0 = d.x - 0.12; x1 = d.x + 0.12; } else { z0 = d.z - 0.12; z1 = d.z + 0.12; } }
        pushOut(p, x0, x1, z0, z1, r);
      }
      for (const s of L.solids) if (p.x > s.x0 - 1 && p.x < s.x1 + 1 && p.z > s.z0 - 1 && p.z < s.z1 + 1) pushOut(p, s.x0, s.x1, s.z0, s.z1, r);
    }
  }
  // Sichtlinie über das Raster (Glas lässt Blicke durch)
  function los(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, n = Math.ceil(Math.hypot(dx, dz) / 0.3);
    for (let i = 1; i < n; i++) { const x = a.x + dx * i / n, z = a.z + dz * i / n, [c, r] = cellOf(x, z), ch = at(c, r); if (!isFloor(ch)) return false; const d = doorAt(c, r); if (d && d.open < 0.5) return false; }
    return true;
  }
  function bfs(from, to) {
    const N = GW * GH, prev = new Int32Array(N).fill(-1), s = from[1] * GW + from[0], t = to[1] * GW + to[0];
    if (s === t) return [to]; const qq = [s]; prev[s] = s; let h = 0;
    while (h < qq.length) { const u = qq[h++]; if (u === t) break; const uc = u % GW, ur = (u / GW) | 0;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c = uc + dc, r = ur + dr; if (c < 0 || r < 0 || c >= GW || r >= GH) continue; const v = r * GW + c; if (prev[v] !== -1) continue; if (blocked(c, r, true)) continue; prev[v] = u; qq.push(v); } }
    if (prev[t] === -1) return null; const path = []; let u = t; while (u !== s) { path.push([u % GW, (u / GW) | 0]); u = prev[u]; } return path.reverse();
  }
  const navCells = []; for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) { const ch = at(c, r); if ('clvoghksm'.includes(ch)) navCells.push([c, r]); }

  // ---------- Leuchten ----------
  function lampLevel(f) {
    if (f.fate <= 1) return 0; // kaputt, sprüht Funken
    if (!S.power) return f.fate === 2 || f.fate === 5 ? 0.55 : 0; // Notbetrieb: nur einzelne
    return f.fate <= 3 ? 0.8 : 1;
  }
  function updateLights(dt) {
    const pp = P.pos; let litSum = 0;
    for (const f of L.fixtures) {
      let target = lampLevel(f);
      const flick = f.fate === 2 || f.fate === 3 || (!S.power && target > 0);
      if (target > 0 && flick && Math.random() < 0.05) f.dip = R(0.04, 0.35);
      for (const rp of raptors) if (rp.active && Math.abs(rp.d.root.position.x - f.x) < 7 && Math.abs(rp.d.root.position.z - f.z) < 7 && Math.random() < 0.06) f.dip = R(0.05, 0.2);
      if (f.dip > 0) { f.dip -= dt; target *= 0.04; }
      if (f.flashT > 0) { f.flashT -= dt; target = 1.4; }
      f.cur += (target - f.cur) * Math.min(1, dt * 22);
      f.em.material.emissiveIntensity = f.cur * 3.2;
      f.d2 = (f.x - pp.x) ** 2 + (f.z - pp.z) ** 2;
      if (f.cur > 0.05 && f.d2 < 49) litSum = Math.max(litSum, f.cur * (1 - Math.sqrt(f.d2) / 7));
    }
    S.lit = litSum;
    const cand = [];
    for (const f of L.fixtures) if (f.cur > 0.02 && f.d2 < 420) cand.push({ x: f.x, y: f.y, z: f.z, i: f.cur * (f.kind === 'grow' ? 4 : f.kind === 'cage' ? 5 : 7), col: f.kind === 'cage' ? 0xffc890 : f.kind === 'grow' ? 0x9affb8 : 0xdfe8ff, d2: f.d2, dist: f.kind === 'grow' ? 20 : 11 });
    for (const e of L.emerg) { const d2 = (e.x - pp.x) ** 2 + (e.z - pp.z) ** 2; const pulse = S.power ? (0.5 + 0.5 * Math.sin(gtime * 6 + e.x)) : 0.8 + 0.2 * Math.sin(gtime * 2 + e.z); e.m.material.emissiveIntensity = 2.5 * pulse; if (d2 < 300) cand.push({ x: e.x, y: e.y, z: e.z, i: 1.8 * pulse, col: 0xff2010, d2: d2 * 1.4, dist: 6 }); }
    { const v = L.vendLight, d2 = (v.x - pp.x) ** 2 + (v.z - pp.z) ** 2; if (d2 < 300) cand.push({ x: v.x, y: v.y, z: v.z, i: 1.2, col: 0xa8d8ff, d2, dist: 5 }); }
    for (const t of L.tanks) { const d2 = (t.x - pp.x) ** 2 + (t.z - pp.z) ** 2; if (d2 < 300) cand.push({ x: t.x, y: 1.4, z: t.z, i: 1.6, col: 0x3aff8a, d2, dist: 5 }); }
    cand.sort((a, b) => a.d2 - b.d2);
    for (let i = 0; i < POOL; i++) {
      const l = pool[i], c = cand[i];
      if (!c) { l.intensity = 0; continue; }
      const fadeK = clamp((20 - Math.sqrt(c.d2)) / 6, 0, 1);
      l.position.set(c.x, c.y, c.z); l.color.setHex(c.col); l.distance = c.dist; l.intensity = c.i * fadeK;
    }
    domeLight.intensity = S.power ? 1.1 : 0.7; L.mistMat.uniforms.t.value = gtime; L.mistMat.uniforms.k.value = S.power ? 1.2 : 0.8;
  }

  // ---------- Türen ----------
  function updateDoors(dt) {
    for (const d of L.doors) {
      let want = false;
      const near = (p, r) => Math.abs(p.x - d.x) < r && Math.abs(p.z - d.z) < r;
      if (!P.hidden && near(P.pos, 2.2)) { if (d.kind === 'd') want = true; else if (d.kind === 'r' && S.card) want = true; else if (d.kind === 'X' && S.power) want = true; }
      if (d.kind === 'd') for (const rp of raptors) if (rp.active && near(rp.d.root.position, 2.4)) want = true;
      const prev = d.target; d.target = want ? 1 : 0;
      if (prev !== d.target && Math.hypot(d.x - P.pos.x, d.z - P.pos.z) < 25) A.slide(new V3(d.x, 1.2, d.z), want);
      d.open += clamp(d.target - d.open, -dt * 1.8, dt * 1.8);
      for (const h of d.halves) h.h.position.x = h.s * d.open * 0.86;
      if (d.led) d.led.material = (d.kind === 'r' && S.card) || (d.kind === 'X' && S.power) ? L.M.green : L.M.red;
    }
  }

  // ---------- Saurier ----------
  function makeRaptor(c, r, name) {
    const d = makeDino('raptor'); scene.add(d.root); d.root.position.set(cx(c), 0, cz(r));
    return { d, name, active: false, state: 'patrol', path: null, pathT: 0, meter: 0, last: new V3(), lostT: 0, t: 0, stepT: 0, breathT: R(2, 5), stunCool: 0, sawHide: false, sniff: 0, goal: null, speed: 0, callT: R(20, 40) };
  }
  function placeRaptorsAway() {
    const far = navCells.filter(([c, r]) => Math.hypot(cx(c) - P.pos.x, cz(r) - P.pos.z) > 28);
    for (const rp of raptors) { const [c, r] = far[Math.floor(Math.random() * far.length)]; rp.d.root.position.set(cx(c), 0, cz(r)); rp.state = 'patrol'; rp.path = null; rp.meter = 0; rp.sniff = 0; Object.assign(rp.d, { jawOpen: 0, rear: 0, lunge: 0, agitation: 0 }); }
  }
  function noise(pos, radius) { S.noise.push({ x: pos.x, z: pos.z, r: radius, t: gtime }); }
  function goTo(rp, x, z) { const p = rp.d.root.position, path = bfs(cellOf(p.x, p.z), cellOf(x, z)); rp.path = path; rp.goal = new V3(x, 0, z); }
  function randomGoal(rp) { const [c, r] = navCells[Math.floor(Math.random() * navCells.length)]; goTo(rp, cx(c), cz(r)); }

  function updateRaptor(rp, dt) {
    const d = rp.d, p = d.root.position;
    rp.t += dt; rp.stunCool -= dt;
    const head = d.head.getWorldPosition(new V3());
    const toP = new V3(P.pos.x - p.x, 0, P.pos.z - p.z), dist = toP.length();
    // Wahrnehmung
    let vis = 0;
    if (!P.hidden && mode === 'play') {
      const range = P.lamp ? 24 : S.lit > 0.25 ? 15 : 7;
      const fw = new V3(Math.sin(d.root.rotation.y), 0, Math.cos(d.root.rotation.y));
      if (dist < range && (fw.dot(toP.clone().normalize()) > 0.45 || dist < 2.5) && los(p, P.pos)) vis = 1 - dist / (range + 2);
      // angeleuchtet werden spürt sie auch von hinten
      if (P.lamp && dist < 15 && head.clone().sub(cam.position).normalize().dot(fwdV) > 0.93 && los(p, P.pos)) vis = Math.max(vis, 0.55);
    }
    const aggressive = S.power ? 1.5 : S.card ? 1.2 : 1;
    if (vis > 0) { rp.meter = Math.min(1.2, rp.meter + dt * (0.45 + vis * 1.5) * (P.crouch ? 0.5 : 1) * (P.lamp ? 1.5 : 1) * aggressive); rp.last.copy(P.pos); }
    else rp.meter = Math.max(0, rp.meter - dt * 0.15);
    if (!['hunt', 'sniff', 'stun', 'alert'].includes(rp.state)) for (const n of S.noise) { if (n.done && n.done.includes(rp)) continue; const nd = Math.hypot(n.x - p.x, n.z - p.z); if (nd < n.r) { (n.done = n.done || []).push(rp); rp.state = 'investigate'; goTo(rp, n.x, n.z); rp.t = 0; rp.meter = Math.max(rp.meter, 0.3); } }
    // Zustände
    let spd = 1.3 * (S.power ? 1.25 : 1), look = null;
    if (rp.meter >= 1 && !['hunt', 'sniff', 'alert', 'stun'].includes(rp.state)) { rp.state = 'alert'; rp.t = 0; A.screech(head, 1); S.tension = 1; d.jawOpen = 1; }
    if (rp.state === 'stun') { spd = 0; if (rp.t > 1.3) { rp.state = 'hunt'; rp.t = 0; } }
    else if (rp.state === 'alert') { spd = 0; look = cam.position; if (rp.t > 0.7) { rp.state = 'hunt'; rp.t = 0; rp.lostT = 0; d.jawOpen = 0.3; } }
    else if (rp.state === 'patrol') { if (!rp.path || !rp.path.length) { randomGoal(rp); if (Math.random() < 0.35) { rp.state = 'idle'; rp.t = 0; rp.idleT = R(2, 5); } } }
    else if (rp.state === 'idle') { spd = 0; if (rp.t > rp.idleT) rp.state = 'patrol'; look = head.clone().add(new V3(Math.sin(rp.t) * 3, -1.5, Math.cos(rp.t * 0.7) * 3)); }
    else if (rp.state === 'investigate') { spd = 2.2; if (!rp.path || !rp.path.length) { spd = 0; look = head.clone().add(new V3(Math.sin(rp.t * 1.3) * 3, -0.5, Math.cos(rp.t) * 3)); if (rp.t > 6) rp.state = 'patrol'; } }
    else if (rp.state === 'hunt') {
      spd = 4.7 * (S.power ? 1.08 : 1); look = cam.position;
      if (vis > 0) rp.lostT = 0; else rp.lostT += dt;
      rp.pathT -= dt; if (rp.pathT <= 0) { rp.pathT = 0.4; goTo(rp, rp.last.x, rp.last.z); }
      if (P.hidden && rp.sawHide) { rp.state = 'sniff'; rp.t = 0; rp.sniff = 0; goTo(rp, P.hidden.outX, P.hidden.outZ); }
      else if (rp.lostT > 4) { rp.state = 'investigate'; rp.t = 0; rp.meter = 0.6; goTo(rp, rp.last.x, rp.last.z); }
      if (dist < 1.35 && !P.hidden && mode === 'play') { die(rp); return; }
      // Lampe direkt in die Augen: kurze Schreckstarre
      if (P.lamp && rp.stunCool <= 0 && dist < 9 && dist > 1.6) { const toH = head.clone().sub(cam.position).normalize(); if (toH.dot(fwdV) > 0.965) { rp.state = 'stun'; rp.t = 0; rp.stunCool = 6; A.hiss(head, 1); d.agitation = 1; } }
    } else if (rp.state === 'sniff') {
      spd = 1.2; const lk = P.hidden;
      if (!lk) { rp.state = 'hunt'; rp.t = 0; rp.lostT = 0; }
      else {
        const there = Math.hypot(p.x - lk.outX, p.z - lk.outZ) < 0.7 || (!rp.path || !rp.path.length);
        look = new V3(lk.x, 1.2, lk.z);
        if (there) {
          spd = 0; rp.sniff += dt; if (Math.random() < dt * 1.2) A.breath(head, 1.1);
          if (rp.sniff > 1.4 && !P.holding) { found(rp); return; }
          if (rp.sniff > 5.5) { rp.state = 'investigate'; rp.t = 2; rp.meter = 0.4; rp.sawHide = false; randomGoal(rp); }
        }
      }
    }
    // zufälliges Schnüffeln an einem besetzten Spind
    if (P.hidden && rp.state === 'patrol' && Math.hypot(p.x - P.hidden.outX, p.z - P.hidden.outZ) < 2.5 && Math.random() < dt * 0.5) { rp.state = 'sniff'; rp.t = 0; rp.sniff = 0; goTo(rp, P.hidden.outX, P.hidden.outZ); }
    // Bewegung entlang des Pfads
    let moved = 0;
    if (spd > 0 && rp.path && rp.path.length) {
      const [c, r] = rp.path[0], last = rp.path.length === 1 && rp.goal; const tx = last ? rp.goal.x : cx(c), tz = last ? rp.goal.z : cz(r);
      const dx = tx - p.x, dz = tz - p.z, l = Math.hypot(dx, dz);
      if (l < 0.35) rp.path.shift();
      else {
        const ty = Math.atan2(dx, dz), da = angDiff(ty, d.root.rotation.y); d.root.rotation.y += clamp(da, -dt * 6, dt * 6);
        const s = spd * Math.max(0.25, Math.cos(da)); p.x += Math.sin(d.root.rotation.y) * s * dt; p.z += Math.cos(d.root.rotation.y) * s * dt; moved = s;
      }
    }
    if (look && moved === 0) { const ty = Math.atan2(look.x - p.x, look.z - p.z); d.root.rotation.y += clamp(angDiff(ty, d.root.rotation.y), -dt * 4, dt * 4); }
    rp.speed += (moved - rp.speed) * Math.min(1, dt * 8); d.speed = rp.speed;
    d.lookAt = look; d.crouch = rp.state === 'hunt' ? 0.15 : rp.state === 'sniff' ? 0.5 : 0.3; d.agitation = Math.max(rp.state === 'hunt' ? 0.8 : 0.2, d.agitation - dt * 0.4);
    d.jawOpen = Math.max(0, d.jawOpen - dt * 0.6);
    // Geräusche
    rp.stepT -= dt; if (rp.speed > 0.4 && rp.stepT <= 0) { rp.stepT = clamp(0.9 / (rp.speed + 0.5), 0.13, 0.5); A.claws(new V3(p.x, 0.1, p.z), 2, rp.speed > 3 ? 1.1 : 0.6); }
    rp.breathT -= dt; if (rp.breathT <= 0 && dist < 9) { rp.breathT = R(2.5, 4.5); A.breath(head, clamp(1.2 - dist / 9, 0.2, 1)); }
    rp.callT -= dt; if (rp.callT <= 0) { rp.callT = R(25, 50); if (dist > 10) { if (Math.random() < 0.4) A.mimic(head, 0.8); else A.screamFar(head); } }
    if (dist < 12) S.tension = Math.max(S.tension, rp.state === 'hunt' ? 1 : clamp(1 - dist / 14, 0.3, 0.85));
    d.update(dt); d.eyeshine(cam.position, fwdV, flash.intensity > 10, 0.2);
  }
  function found(rp) {
    if (mode !== 'play') return; const lk = P.hidden;
    lk.target = 1.6; A.locker(new V3(lk.x, 1, lk.z), true); A.metal(new V3(lk.x, 1, lk.z));
    P.hidden = null; q('.hr-slats').style.display = 'none'; q('.hr-breath').style.display = 'none';
    P.pos.set(lk.outX * 0.4 + lk.inX * 0.6, 0, lk.outZ * 0.4 + lk.inZ * 0.6); die(rp);
  }

  function updateRex(dt) {
    if (!rex) return; const d = rex.d, p = d.root.position;
    rex.t += dt;
    if (rex.mode === 'wander') {
      if (!rex.target || Math.hypot(rex.target.x - p.x, rex.target.z - p.z) < 1.5) { rex.target = new V3(R(cx(14.5), cx(27)), 0, R(cz(9.5), cz(15))); rex.pause = R(1, 5); }
      if (rex.pause > 0) { rex.pause -= dt; d.speed = Math.max(0, d.speed - dt); }
      else { const dx = rex.target.x - p.x, dz = rex.target.z - p.z, ty = Math.atan2(dx, dz), da = angDiff(ty, d.root.rotation.y); d.root.rotation.y += clamp(da, -dt * 0.8, dt * 0.8); const s = 1.4 * Math.max(0.2, Math.cos(da)); p.x += Math.sin(d.root.rotation.y) * s * dt; p.z += Math.cos(d.root.rotation.y) * s * dt; d.speed = s; }
      d.lookAt = null;
    } else if (rex.mode === 'charge') {
      const tgt = rex.glassPt, dx = tgt.x - p.x, dz = tgt.z - p.z, l = Math.hypot(dx, dz), ty = Math.atan2(dx, dz);
      d.root.rotation.y += clamp(angDiff(ty, d.root.rotation.y), -dt * 2.5, dt * 2.5); d.lookAt = cam.position;
      if (l > 4.6) { const s = 6; p.x += Math.sin(d.root.rotation.y) * s * dt; p.z += Math.cos(d.root.rotation.y) * s * dt; d.speed = s; }
      else { rex.mode = 'slam'; rex.t = 0; d.speed = 0; A.glass(new V3(tgt.x, 2, tgt.z)); A.roar(new V3(tgt.x, 3, tgt.z), 1.2); A.rumble(1); S.shake = 1.2; S.tension = 1; d.jawOpen = 1; crackGlass(tgt); }
    } else if (rex.mode === 'slam') { d.lookAt = cam.position; d.jawOpen = Math.max(0, 1 - rex.t / 3); if (rex.t > 3.5) { rex.mode = 'wander'; d.jawOpen = 0; rex.target = null; } }
    rex.stepT -= dt; if (d.speed > 0.3 && rex.stepT <= 0) { rex.stepT = 1.0 / (d.speed * 0.5 + 0.5); A.step('tile', 4, new V3(p.x, 0.2, p.z)); const dd = Math.hypot(p.x - P.pos.x, p.z - P.pos.z); S.shake = Math.max(S.shake, clamp(0.4 - dd / 40, 0, 0.3)); }
    d.update(dt); d.eyeshine(cam.position, fwdV, flash.intensity > 10, 0.3);
  }
  function crackGlass(pt) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.6), L.M.scratch); m.position.set(pt.x, 1.85, pt.z); m.rotation.y = pt.ry; L.group.add(m);
    const cr = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12), L.M.glassCrack); cr.position.set(pt.x, 1.85, pt.z); cr.rotation.y = pt.ry; L.group.add(cr);
  }
  const galleries = [{ x: cx(11), z: cz(12), glass: { x: cx(12), z: cz(12), ry: Math.PI / 2 } }, { x: cx(20.5), z: cz(18), glass: { x: cx(20.5), z: cz(17), ry: 0 } }, { x: cx(20.5), z: cz(6), glass: { x: cx(20.5), z: cz(7), ry: 0 } }];

  // ---------- Interaktionen ----------
  function setupItems() {
    items = [];
    for (const lk of L.lockers) items.push({ pos: new V3(lk.x - lk.wx * 0.3, 1.2, lk.z - lk.wz * 0.3), r: 1.7, label: 'Verstecken', use: () => hide(lk) });
    for (const pl of L.plans) items.push({ pos: new V3(pl.x, pl.y, pl.z), r: 1.8, label: 'Fluchtplan', use: () => showImg(mapCanvas(MAP, ROOMS, { c: pl.c + 0.5, r: pl.r + 0.5 }, 'Ziel: ' + GOALS[S.goal])) });
    for (const d of L.doors) if (d.kind !== 'd') items.push({ pos: new V3(d.x, 1.3, d.z), r: 2.2, label: 'Tür', use() {
      if (d.kind === 'r' && !S.card) { A.beep(false); sub('Gesperrt. Sicherheitskarte nötig.', 2.5); if (S.goal === 0) setGoal(1); }
      else if (d.kind === 'X' && !S.power) { A.beep(false); sub('Notausgang verriegelt. Kein Hauptstrom.', 2.5); }
    }, hideWhen: () => (d.kind === 'r' && S.card) || (d.kind === 'X' && S.power) });
    const noteAt = (id, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshStandardMaterial({ map: noteTex(id), roughness: 1 })); m.position.set(x, y, z); m.rotation.x = -Math.PI / 2; m.rotation.z = ry; L.group.add(m); items.push({ pos: m.position.clone(), r: 1.8, label: 'Lesen', use: () => showNote(id) }); };
    noteAt('lobby', cx(5.5) + 0.6, 1.15, cz(22.5), 0.3);
    noteAt('sec', cx(4.5) - 0.6, 0.79, cz(13) + 0.3, -0.2);
    noteAt('lab', cx(15.5) + 0.3, 0.95, cz(2) + 0.1, 0.5);
    noteAt('kantine', cx(24.7), 0.77, cz(22.3) + 0.1, 1);
    noteAt('arzt', cx(15.5) + 0.4, 0.79, cz(22) + 0.2, -0.4);
    if (!S.card) {
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.004, 0.054), new THREE.MeshStandardMaterial({ color: '#d8dce0', roughness: 0.4, emissive: new THREE.Color('#203040'), emissiveIntensity: 0.4 })); card.position.set(cx(4.5) + 0.5, 0.785, cz(13) + 0.35); card.rotation.y = 0.4; L.group.add(card);
      const it = { pos: card.position.clone(), r: 1.6, label: 'Sicherheitskarte nehmen', use() { card.visible = false; S.card = true; A.pickup(); inv(); items.splice(items.indexOf(it), 1); setGoal(S.fuse ? 3 : 2); checkpoint(1); pa('card'); releaseSecond(); } };
      items.push(it);
    }
    if (!S.fuse) {
      const fu = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.1), L.M.amber); fu.position.set(cx(37.5), 0.99, cz(16.6)); L.group.add(fu);
      const it = { pos: fu.position.clone(), r: 1.7, label: 'Ersatzsicherung nehmen', use() { fu.visible = false; S.fuse = true; A.pickup(); inv(); items.splice(items.indexOf(it), 1); setGoal(3); checkpoint(2); } };
      items.push(it);
    }
    const g = L.gen;
    items.push({ pos: g.slot.clone(), r: 1.7, label: 'Sicherungsfach', use() { if (S.fuseIn) return; if (!S.fuse) { A.click(g.slot); sub('Das Fach ist leer. Hier fehlt eine Sicherung.', 3); if (S.goal < 2) setGoal(S.card ? 2 : 1); return; } S.fuseIn = true; g.fuseIn.visible = true; A.click(g.slot); A.pickup(); inv(); sub('Die Sicherung sitzt. Jetzt den Hebel.', 2.5); }, hideWhen: () => S.fuseIn });
    items.push({ pos: new V3(g.slot.x, 1.2, g.slot.z + 0.65), r: 1.7, label: 'Hebel ziehen', use() { if (S.power) return; if (!S.fuseIn) { A.click(this.pos); sub('Nichts passiert. Keine Sicherung.', 2); return; } powerOn(); }, hideWhen: () => S.power });
  }
  function aimItem() {
    let best = null, bs = 0;
    for (const it of items) { if (it.hideWhen && it.hideWhen()) continue; const d = it.pos.clone().sub(cam.position), dist = d.length(); if (dist > (it.r || 1.6)) continue; const c = fwdV.dot(d.normalize()); if (c > 0.85 && c > bs) { bs = c; best = it; } }
    return best;
  }

  // ---------- Verstecken ----------
  async function hide(lk) {
    if (P.hidden || mode !== 'play') return;
    mode = 'hiding'; const g = gen;
    lk.target = 1.7; A.locker(new V3(lk.x, 1, lk.z), true);
    for (const rp of raptors) rp.sawHide = rp.active && (rp.state === 'hunt' || rp.state === 'alert' || (rp.meter > 0.5 && los(rp.d.root.position, P.pos)));
    noise(P.pos, 4);
    const from = P.pos.clone(), y0 = P.yaw, y1 = Math.atan2(lk.wx, lk.wz);
    for (let t = 0; t <= 1.001; t += 0.07) { await sleep(0.016); if (g !== gen) return; P.pos.lerpVectors(from, new V3(lk.inX, 0, lk.inZ), t); P.yaw = y0 + angDiff(y1, y0) * t; P.pitch *= 0.85; }
    P.hidden = lk; P.yaw = y1; P.pitch = 0; P.vel.set(0, 0, 0); lk.target = 0; A.locker(new V3(lk.x, 1, lk.z), false); P.crouch = false;
    q('.hr-slats').style.display = 'block'; q('.hr-breath').style.display = 'block'; P.lampWas = P.lamp; P.lamp = false;
    mode = 'play'; phones('hide');
  }
  async function unhide() {
    const lk = P.hidden; if (!lk || mode !== 'play') return;
    mode = 'hiding'; const g = gen; P.holding = false;
    lk.target = 1.7; A.locker(new V3(lk.x, 1, lk.z), true); noise(P.pos, 5);
    q('.hr-slats').style.display = 'none'; q('.hr-breath').style.display = 'none';
    for (let t = 0; t <= 1.001; t += 0.08) { await sleep(0.016); if (g !== gen) return; P.pos.lerpVectors(new V3(lk.inX, 0, lk.inZ), new V3(lk.outX, 0, lk.outZ), t); }
    P.hidden = null; lk.target = 0; P.lamp = P.lampWas; A.locker(new V3(lk.x, 1, lk.z), false);
    mode = 'play'; phones('play');
  }

  // ---------- Fortschritt ----------
  function checkpoint(stage) { S.stage = Math.max(S.stage, stage); store.set('hr2-stage', S.stage); }
  function releaseSecond() { const rp = raptors[1]; if (rp && !rp.active) { rp.active = true; rp.d.root.visible = true; A.screamFar(rp.d.root.position.clone().setY(1)); } }
  async function powerOn() {
    S.power = true; const g = L.gen; g.lever.rotation.x = -0.7; g.led.material = L.M.green; A.click(g.slot); A.powerDown();
    A.rumble(1.2); S.shake = 0.6; await sleep(1.2); A.alarm(true); pa('power'); setGoal(4); checkpoint(3);
    loops.gen && loops.gen.set(0.06);
    for (const rp of raptors) { rp.active = true; rp.d.root.visible = true; rp.state = 'investigate'; goTo(rp, g.x, g.z); rp.meter = 0.5; }
  }
  async function ending() {
    mode = 'end'; const g = gen; store.set('hr2-stage', 0); store.set('hr2-done', 1);
    S.fadeTarget = 1; S.fadeSpeed = 0.5; A.alarm(false);
    await sleep(2.5); if (g !== gen) return;
    phones('menu');
    menu('<h2 style="font-size:28px;max-width:760px;line-height:1.7">Die Treppe nimmt kein Ende. Dann kalte Luft, Regen, Morgengrauen.<br>Unter dir fällt die Stahltür ins Schloss. Von drinnen ruft eine Stimme nach dir.</h2>');
    A.mimic(null, 0.7);
    await sleep(6); if (g !== gen) return;
    menu(`<h1>FOSSIL</h1><h2>Ebene -3 · Ende</h2><p>Alles in diesem Kanal entsteht zur Laufzeit: Räume, Texturen, Tiere und Klänge.</p><button class="b hv" data-a="title">Hauptmenü</button>`);
  }

  // ---------- Tod ----------
  async function die(rp) {
    if (mode !== 'play') return; mode = 'dying'; const g = gen; const d = rp.d;
    if (P.hidden) { P.hidden = null; q('.hr-slats').style.display = 'none'; q('.hr-breath').style.display = 'none'; }
    const f = d.root.position.clone().sub(P.pos); f.y = 0; if (f.length() < 0.01) f.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); f.normalize();
    P.yawTarget = P.yaw + angDiff(Math.atan2(-f.x, -f.z), P.yaw); P.yaw += angDiff(P.yawTarget, P.yaw) * 0.6;
    d.root.position.copy(P.pos).addScaledVector(f, 2.0); d.root.rotation.y = Math.atan2(-f.x, -f.z);
    const camY = 1.62 - P.eyeK * 0.68, hp = new V3(); d.lookAt = null; d.rear = 0; d.jawOpen = 0.8; d.agitation = 1; d.speed = 0; d.crouch = 0;
    d.rear = 0.15;
    d.update(0); d.head.getWorldPosition(hp); const hd = Math.hypot(hp.x - P.pos.x, hp.z - P.pos.z); d.root.position.addScaledVector(f, -(hd - 1.45));
    d.update(0); d.head.getWorldPosition(hp);
    P.pitchTarget = Math.atan2(hp.y + 0.05 - camY, Math.max(0.3, Math.hypot(hp.x - P.pos.x, hp.z - P.pos.z)));
    d.lookAt = cam.position; d.lunge = 0.5;
    A.screech(null, 1.2); S.shake = 1; S.red = 0.5; S.tension = 1; P.lamp = true;
    await sleep(0.85); if (g !== gen) return;
    S.fade = 1; S.fadeTarget = 1; A.duck(0, 0.02); A.alarm(false);
    await sleep(1.6); if (g !== gen) return;
    A.duck(1, 1); S.red = 0; S.shake = 0; P.yawTarget = P.pitchTarget = null;
    mode = 'dead'; phones('menu');
    menu(`<h1 style="font-size:clamp(40px,6vw,90px);letter-spacing:.2em">GEFUNDEN</h1><h2>${['Sie hat deinen Atem gehört.', 'Zu laut, zu nah, zu langsam.', 'Im Dunkeln ist sie schneller als du.'][Math.floor(Math.random() * 3)]}</h2>
      <button class="b hv" data-a="retry">Vom letzten Fortschritt</button><button class="b hv" data-a="title">Hauptmenü</button>`);
  }

  // ---------- Spielstart ----------
  const loops = {};
  function resetWorld(stage) {
    gen++; waits = [];
    if (L) scene.remove(L.group);
    for (const rp of raptors) scene.remove(rp.d.root); raptors.length = 0; if (rex) scene.remove(rex.d.root);
    for (const k in loops) { loops[k].stop(); delete loops[k]; }
    A.alarm(false);
    L = buildLab(); L.M = labMaterials(); scene.add(L.group);
    L.doorMap = {}; for (const d of L.doors) L.doorMap[d.r * GW + d.c] = d;
    S.card = stage >= 1; S.fuse = stage >= 2; S.fuseIn = stage >= 3; S.power = stage >= 3; S.stage = stage; S.noise = []; S.tension = 0.2; S.red = 0; S.rexSlam = false;
    for (const f of L.fixtures) { f.cur = 0; f.spark = f.fate <= 1; }
    if (S.fuseIn) { L.gen.fuseIn.visible = true; L.gen.lever.rotation.x = -0.7; L.gen.led.material = L.M.green; }
    setupItems(); inv();
    raptors.push(makeRaptor(23, 2, 'K-7'), makeRaptor(25, 23, 'K-9'));
    raptors[0].active = true; raptors[1].active = stage >= 1;
    rex = { d: makeDino('rex'), mode: 'wander', t: 0, stepT: 0, target: null, pause: 0 }; scene.add(rex.d.root); rex.d.root.position.set(cx(22), 0, cz(12));
    L.steam.forEach((s, i) => loops['steam' + i] = A.loop('steam', new V3(s.x, s.y, s.z)));
    loops.hum = A.loop('hum', new V3(cx(29.5), 1.2, cz(2)));
    loops.gen = A.loop('gen', new V3(cx(36.5), 1.2, cz(8.5))); loops.gen.set(S.power ? 0.06 : 0);
    if (S.power) A.alarm(true);
    const spawn = [[cx(2) + 1, cz(25) + 0.6, 0], [cx(4.5), cz(14.5), -Math.PI / 2], [cx(36), cz(15), Math.PI / 2], [cx(35), cz(9.5), Math.PI / 2]][stage] || [cx(2) + 1, cz(25) + 0.6, 0];
    P.pos.set(spawn[0], 0, spawn[1]); P.yaw = spawn[2]; P.pitch = 0; P.vel.set(0, 0, 0); P.hidden = null; P.holding = false; P.breath = 1; P.crouch = false; P.lamp = true; P.heavy = 0;
    q('.hr-slats').style.display = 'none'; q('.hr-breath').style.display = 'none'; q('.hr-note').style.display = 'none'; note = null;
    placeRaptorsAway(); if (stage === 0) raptors[0].d.root.position.set(cx(23), 0, cz(2));
    for (const rp of raptors) rp.d.root.visible = rp.active;
  }
  async function start(stage) {
    resetWorld(stage); hideMenu(); mode = 'play'; phones('play'); S.fade = 1; S.fadeTarget = 0; S.fadeSpeed = 0.5;
    const g = gen;
    if (stage === 0) {
      A.rumble(1); S.shake = 0.5;
      await sleep(3); if (g !== gen) return; pa('start');
      await sleep(10); if (g !== gen) return; setGoal(0);
    } else setGoal([0, 2, 3, 4][stage]);
    if (!Sound.running) sub('Kein Ton? Einmal auf den Bildschirm tippen.', 5);
  }

  // ---------- Menüs ----------
  function menu(html) { const m = q('.hr-menu'); m.innerHTML = html; m.style.display = 'flex'; m.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act(b.dataset.a))); }
  function hideMenu() { q('.hr-menu').style.display = 'none'; }
  function act(a) {
    if (a === 'new') { store.set('hr2-stage', 0); start(0); }
    else if (a === 'cont') start(store.get('hr2-stage', 0));
    else if (a === 'retry') start(S.stage);
    else if (a === 'title') title();
    else if (a === 'back') K.closeChannel();
  }
  function title() {
    resetWorld(0); mode = 'title'; phones('menu'); S.fade = 1; S.fadeTarget = 0; S.fadeSpeed = 0.4;
    for (const rp of raptors) rp.d.root.visible = false;
    P.pos.set(cx(20.5), 0, cz(18.3)); P.yaw = 0; P.pitch = 0.12; P.lamp = true;
    const sv = store.get('hr2-stage', 0);
    menu(`<h1>FOSSIL</h1><h2>Ebene -3</h2>
      <button class="b hv" data-a="new">Neues Spiel</button>${sv > 0 ? `<button class="b hv" data-a="cont">Fortsetzen</button>` : ''}<button class="b hv" data-a="back">Zurück zum Menü</button>
      <p>Ein Forschungslabor tief unter der Erde. Die Tiere sind draußen. Keine Waffen: Licht, Verstecke und Stille sind alles, was du hast.<br><br>
      Handy quer halten: linker Stick laufen, rechter Stick umsehen. Laptop: W A S D, Maus (Klick zum Festhalten), E Benutzen (im Spind halten: Luft anhalten), F Lampe, Umschalt Rennen, C Ducken, Q Spind verlassen.<br>Kopfhörer empfohlen.</p>`);
    if (!Sound.running) sub('Kein Ton? Einmal auf den Bildschirm tippen.', 6);
  }

  // ---------- Eingabe ----------
  const keyMap = { KeyW: 'f', KeyS: 'b', KeyA: 'l', KeyD: 'r', ShiftLeft: 'run', ShiftRight: 'run' };
  const kd = e => {
    if (closed || paused) return;
    if (keyMap[e.code]) IN.keys[keyMap[e.code]] = true;
    if (e.repeat) return;
    if (e.code === 'KeyE') button('USE', true);
    if (e.code === 'KeyF') button('LAMP', true); if (e.code === 'KeyC' || e.code === 'ControlLeft') button('CROUCH', true); if (e.code === 'KeyQ') button('EXIT', true);
  };
  const ku = e => { if (keyMap[e.code]) IN.keys[keyMap[e.code]] = false; if (e.code === 'KeyE') button('USE', false); };
  const mm = e => { if (document.pointerLockElement === canvas && mode === 'play') look(e.movementX * 0.0022, e.movementY * 0.0022); };
  canvas.addEventListener('click', () => { if (mode === 'play' && canvas.requestPointerLock) try { canvas.requestPointerLock(); } catch (e) {} });
  addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('mousemove', mm);
  function look(dx, dy) {
    if (note) return;
    P.yaw -= dx; P.pitch = clamp(P.pitch - dy, -1.3, 1.3);
    if (P.hidden) { const base = Math.atan2(P.hidden.wx, P.hidden.wz); const d = angDiff(P.yaw, base); P.yaw = base + clamp(d, -0.6, 0.6); P.pitch = clamp(P.pitch, -0.4, 0.3); }
  }
  function button(name, down) {
    if (mode !== 'play') return false;
    if (P.hidden) {
      if (name === 'USE' || name === 'A') { P.holding = down && P.breath > 0.02; return true; }
      if (down && (name === 'EXIT' || name === 'B' || name === 'CROUCH')) { unhide(); return true; }
      return true;
    }
    if (name === 'RUN') { P.run = down; return true; }
    if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(name)) { IN.keys[{ UP: 'f', DOWN: 'b', LEFT: 'l', RIGHT: 'r' }[name]] = down; return true; }
    if (!down) return true;
    if (note) { if (name === 'A' || name === 'B' || name === 'USE') hideNote(); return true; }
    if (name === 'LAMP') { P.lamp = !P.lamp; A.lampClick(); return true; }
    if (name === 'CROUCH') { P.crouch = !P.crouch; return true; }
    if (name === 'USE' || name === 'A') { const it = aimItem(); if (it) it.use(); return true; }
    if (name === 'B' || name === 'EXIT') return true;
    return false;
  }

  // ---------- Partikel: Dampf und Funken ----------
  function makeParticles(n, color, size, additive) {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), life = new Float32Array(n), vel = new Float32Array(n * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('life', new THREE.BufferAttribute(life, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { col: { value: new THREE.Color(color) }, size: { value: size } },
      vertexShader: `attribute float life; varying float vL; uniform float size; void main(){ vL=life; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=size*${additive ? '1.' : '(1.6-life)'}*300./max(-mv.z,.1); }`,
      fragmentShader: `uniform vec3 col; varying float vL; void main(){ float d=length(gl_PointCoord-.5); if(d>.5||vL<=0.) discard; float a=${additive ? '(1.-d*2.)*vL' : '(1.-d*2.)*vL*.14'}; gl_FragColor=vec4(col*${additive ? '3.' : '1.'},a); }` });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; return { pts, pos, life, vel, n, i: 0, g };
  }
  function emit(ps, x, y, z, vx, vy, vz, l) { const i = ps.i; ps.i = (ps.i + 1) % ps.n; ps.pos[i * 3] = x; ps.pos[i * 3 + 1] = y; ps.pos[i * 3 + 2] = z; ps.vel[i * 3] = vx; ps.vel[i * 3 + 1] = vy; ps.vel[i * 3 + 2] = vz; ps.life[i] = l; }
  function stepParticles(ps, dt, grav, decay) { for (let i = 0; i < ps.n; i++) { if (ps.life[i] <= 0) continue; ps.life[i] -= dt * decay; ps.vel[i * 3 + 1] += grav * dt; for (let k = 0; k < 3; k++) ps.pos[i * 3 + k] += ps.vel[i * 3 + k] * dt; if (grav < 0 && ps.pos[i * 3 + 1] < 0.02) { ps.pos[i * 3 + 1] = 0.02; ps.vel[i * 3 + 1] *= -0.3; ps.vel[i * 3] *= 0.5; ps.vel[i * 3 + 2] *= 0.5; } } ps.g.attributes.position.needsUpdate = true; ps.g.attributes.life.needsUpdate = true; }

  // ---------- Tick ----------
  const tmp = new V3(), right = new V3();
  function update(dt) {
    gtime += dt;
    for (let i = waits.length - 1; i >= 0; i--) { const w = waits[i]; if (w.g !== gen) { waits.splice(i, 1); continue; } if ((w.end != null && gtime >= w.end) || (w.fn && w.fn())) { waits.splice(i, 1); w.res(); } }
    S.noise = S.noise.filter(n => gtime - n.t < 0.25);
    const playing = mode === 'play' && !note && !P.hidden;
    // Bewegung
    if (performance.now() - IN.mvT > 260) { IN.mx = 0; IN.my = 0; }
    if (performance.now() - IN.lkT > 260) { IN.lx = 0; IN.ly = 0; }
    if ((IN.lx || IN.ly) && mode === 'play') { const cv = v => Math.sign(v) * Math.pow(Math.abs(v), 1.6); look(cv(IN.lx) * 2.6 * dt, cv(IN.ly) * 1.7 * dt); }
    let mx = IN.mx + (IN.keys.r ? 1 : 0) - (IN.keys.l ? 1 : 0), my = IN.my + (IN.keys.b ? 1 : 0) - (IN.keys.f ? 1 : 0);
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    if (!playing) mx = my = 0;
    const running = (P.run || IN.keys.run) && P.stamina > 0.05 && my < -0.3 && !P.crouch;
    if (running) { P.stamina = Math.max(0, P.stamina - dt / 6); P.heavy = Math.min(1, P.heavy + dt / 4); } else { P.stamina = Math.min(1, P.stamina + dt / (ml > 0.1 ? 10 : 5)); P.heavy = Math.max(0, P.heavy - dt / 8); }
    const speed = P.crouch ? 0.8 : running ? 4.3 : 1.55;
    const fw = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); right.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
    tmp.set(0, 0, 0).addScaledVector(fw, -my * speed).addScaledVector(right, mx * speed);
    P.vel.lerp(tmp, Math.min(1, dt * 7));
    if (!P.hidden && mode !== 'hiding' && mode !== 'dying') { P.pos.addScaledVector(P.vel, dt); collide(P.pos); }
    const sp = playing ? Math.hypot(P.vel.x, P.vel.z) : 0; P.moving = sp;
    P.eyeK += ((P.crouch ? 1 : 0) - P.eyeK) * Math.min(1, dt * 7);
    P.bob += dt * sp * (running ? 2.0 : 2.6);
    const eye = 1.62 - P.eyeK * 0.68 + Math.sin(P.bob * 2) * 0.035 * Math.min(1, sp);
    if (mode === 'dying' && P.yawTarget != null) { P.yaw += angDiff(P.yawTarget, P.yaw) * Math.min(1, dt * 26); P.pitch += (P.pitchTarget - P.pitch) * Math.min(1, dt * 10); }
    if (mode === 'title') { P.yaw = Math.sin(gtime * 0.07) * 0.35; P.pitch = 0.12 + Math.sin(gtime * 0.1) * 0.04; }
    const breathe = Math.sin(gtime * (1.3 + S.fear * 2 + P.heavy * 2)) * (0.004 + S.fear * 0.006 + P.heavy * 0.008) * (P.holding ? 0.1 : 1);
    cam.position.set(P.pos.x, eye + breathe, P.pos.z);
    cam.rotation.set(P.pitch + breathe * 0.5, P.yaw, Math.sin(P.bob) * 0.006 * Math.min(1, sp) + (S.shake ? (Math.random() - 0.5) * S.shake * 0.04 : 0));
    cam.updateMatrixWorld(); cam.getWorldDirection(fwdV);
    // Schritte und Lärm
    const stepPh = Math.floor(P.bob / Math.PI);
    if (stepPh !== P.lastStep && sp > 0.3) {
      P.lastStep = stepPh; const [c, r] = cellOf(P.pos.x, P.pos.z), ch = at(c, r);
      const surf = ch === 'g' || ch === 'e' ? 'tile' : ch === 'o' ? 'wood' : ch === 's' || ch === 'x' || ch === 'm' ? 'wet' : 'tile';
      A.step(surf, P.crouch ? 0.3 : running ? 1.3 : 0.7);
      noise(P.pos, P.crouch ? 1.5 : running ? 15 : 5.5);
    }
    // Atem im Spind
    if (P.hidden) {
      if (P.holding) { P.breath -= dt / 7; if (P.breath <= 0) { P.breath = 0; P.holding = false; A.gasp(); noise(P.pos, 6); } }
      else { P.breath = Math.min(1, P.breath + dt / 4); if (Math.random() < dt * 0.5) A.breathe(0.6 + P.heavy); }
      q('.hr-breath i').style.width = (P.breath * 100) + '%';
    }
    // Taschenlampe
    P.lampDir.lerp(fwdV, Math.min(1, dt * 11)).normalize();
    const camRight = new V3(1, 0, 0).applyQuaternion(cam.quaternion), camUp = new V3(0, 1, 0).applyQuaternion(cam.quaternion);
    flash.position.copy(cam.position).addScaledVector(camRight, 0.16).addScaledVector(camUp, -0.17).addScaledVector(fwdV, 0.1);
    flash.target.position.copy(flash.position).addScaledVector(P.lampDir, 6); flash.target.updateMatrixWorld();
    let lampI = P.lamp ? 20 : 0; if (P.lamp && S.tension > 0.85 && Math.random() < 0.06) lampI *= Math.random() * 0.3;
    flash.intensity += (lampI - flash.intensity) * Math.min(1, dt * 30); flash.map = L.M.cookie;

    updateLights(dt); updateDoors(dt);
    for (const lk of L.lockers) { lk.open += (lk.target - lk.open) * Math.min(1, dt * 10); lk.hinge.rotation.y = -lk.open; }
    for (const b of L.blinks) if (Math.random() < 0.02) b.visible = !b.visible;
    for (const t of L.tanks) { t.em.position.y = 1.45 + Math.sin(gtime * 0.5 + t.x) * 0.03; t.em.rotation.y += dt * 0.1; }
    for (const s of L.steam) if (Math.hypot(s.x - P.pos.x, s.z - P.pos.z) < 20 && Math.random() < 0.6) emit(steamPts, s.x, s.y, s.z, s.dir[0] + R(-0.15, 0.15), s.dir[1] + R(-0.1, 0.1) + 0.25, s.dir[2] + R(-0.15, 0.15), 1);
    stepParticles(steamPts, dt, 0.25, 0.45);
    for (const s of L.sparks) if (Math.hypot(s.x - P.pos.x, s.z - P.pos.z) < 16 && Math.random() < dt * 0.35) { for (let i = 0; i < 18; i++) emit(sparkPts, s.x, s.y, s.z, R(-1.5, 1.5), R(-0.5, 2), R(-1.5, 1.5), 1); A.spark(new V3(s.x, s.y, s.z)); }
    for (const f of L.fixtures) if (f.spark && f.d2 < 100 && Math.random() < dt * 0.06) { for (let i = 0; i < 12; i++) emit(sparkPts, f.x, f.y, f.z, R(-1, 1), R(-0.5, 1), R(-1, 1), 1); A.spark(new V3(f.x, f.y, f.z)); f.flashT = 0.08; }
    stepParticles(sparkPts, dt, -9.8, 1.6);
    for (const dr of L.drips) if (Math.random() < dt * 0.7 && Math.hypot(dr.x - P.pos.x, dr.z - P.pos.z) < 10) A.drip(new V3(dr.x, 0.1, dr.z));
    const du = dust.material.uniforms; du.t.value = gtime; du.cen.value.copy(cam.position); du.lp.value.copy(flash.position); du.ld.value.copy(P.lampDir); du.lon.value = flash.intensity / 20; du.size.value = 7 * renderer.domElement.height / 900;

    // Tiere
    if (mode === 'play' || mode === 'hiding') { for (const rp of raptors) if (rp.active && mode !== 'dying') updateRaptor(rp, dt); }
    else if (mode === 'dying') for (const rp of raptors) { const d = rp.d; if (d.lunge > 0) { d.lunge -= dt; d.root.position.addScaledVector(new V3(Math.sin(d.root.rotation.y), 0, Math.cos(d.root.rotation.y)), dt * 0.8); } d.update(dt); d.eyeshine(cam.position, fwdV, true, 0.3); }
    updateRex(dt);
    if (mode === 'play' && !S.rexSlam && rex.mode === 'wander') for (const gl of galleries) if (Math.hypot(P.pos.x - gl.x, P.pos.z - gl.z) < 2.6) { S.rexSlam = true; rex.mode = 'charge'; rex.glassPt = gl.glass; const dx = gl.glass.x - gl.x, dz = gl.glass.z - gl.z, l = Math.hypot(dx, dz); rex.d.root.position.set(gl.glass.x + dx / l * 14, 0, gl.glass.z + dz / l * 14); A.growl(rex.d.root.position.clone().setY(3), 2, 1, true); }
    if (mode === 'play' && S.power && !P.hidden && P.pos.z < cz(2.3) && P.pos.x < cx(4.5)) ending();

    // Stimmung
    if (mode === 'play') S.tension = Math.max(0.15 + S.stage * 0.08, S.tension - dt * 0.06);
    S.fear += ((mode === 'play' || mode === 'dying' || mode === 'hiding' ? S.tension : 0.2) - S.fear) * Math.min(1, dt * 1.5);
    S.shake = Math.max(0, S.shake - dt * 1.4);
    A.mood(S.fear, 0, S.power, 1);
    A.heartbeat(60 + S.fear * 70 + (P.holding ? 20 : 0), (S.fear > 0.5 ? (S.fear - 0.5) * 1.6 : 0) + (P.holding ? 0.4 : 0));
    A.listener(cam.position, fwdV, camUp);
    A.tick(dt);
    S.fade += clamp(S.fadeTarget - S.fade, -dt * S.fadeSpeed, dt * S.fadeSpeed);
    const u = post.comp.uniforms; u.time.value = gtime; u.fear.value = S.fear; u.fade.value = S.fade; u.red.value = S.red; u.shake.value = S.shake;
    // Hinweise
    const it = playing ? aimItem() : null;
    const hint = P.hidden && mode === 'play' ? (raptors.some(r => r.state === 'sniff') ? 'Benutzen halten: Luft anhalten!' : 'Benutzen halten: Luft anhalten · Raus: Taste „Raus“ (Q)') : it ? 'A  ' + it.label : '';
    q('.hr-hint').textContent = hint; q('.hr-hint').style.opacity = hint ? 0.9 : 0; q('.hr-dot').style.opacity = playing ? (it ? 0.8 : 0.25) : 0;
  }

  // ---------- Laden ----------
  setTimeout(() => {
    if (closed) return;
    try {
      A = makeAudio();
      dust = makeDust(700); scene.add(dust);
      steamPts = makeParticles(400, '#9aa4a8', 1.2, false); scene.add(steamPts.pts);
      sparkPts = makeParticles(300, '#ffc070', 0.05, true); scene.add(sparkPts.pts);
      resize(); title();
      window.__hr = { get t() { return gtime; }, P, S, raptors, get rex() { return rex; }, start, die, get mode() { return mode; }, cam, scene, renderer, items: () => items, button, get L() { return L; }, aim: () => { const a = aimItem(); return a ? a.label : null; }, hide, unhide, powerOn };
    } catch (e) { console.error(e); q('.hr-menu').innerHTML = '<h2>Fehler beim Laden: ' + e.message + '</h2>'; }
  }, 50);

  return {
    onFrame(dt) { if (closed || !A || !L || paused) return; dt = Math.min(dt, 0.05); update(dt); post.render(); },
    onButton(name, down) {
      if (mode === 'play') return button(name, down);
      if (name === 'B' && (mode === 'hiding' || mode === 'dying' || mode === 'load')) return true;
      return false;
    },
    onData(d) {
      if (d.t === 'mv') { IN.mx = d.x; IN.my = d.y; IN.mvT = performance.now(); return true; }
      if (d.t === 'lk2') { IN.lx = d.x; IN.ly = d.y; IN.lkT = performance.now(); return true; }
      if (d.t === 'lk') { if (mode === 'play') look(d.x * Math.PI / 180 * 1.25, d.y * Math.PI / 180 * 1.25); return true; }
      if (d.t === 'm' && mode === 'play') return true;
      return false;
    },
    onPause(p) { paused = p; if (A) A.duck(p ? 0.1 : 1); if (p && document.exitPointerLock) try { document.exitPointerLock(); } catch (e) {} },
    onRemotes() { if (mode === 'play') phones(P.hidden ? 'hide' : 'play'); },
    close() {
      closed = true; gen++;
      removeEventListener('resize', resize); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('mousemove', mm);
      if (document.exitPointerLock) try { document.exitPointerLock(); } catch (e) {}
      if (A) { A.alarm(false); A.stop(); } if (cursorEl) cursorEl.style.visibility = '';
      K.send({ t: 'mode', m: 'pointer' });
      post.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {}
    },
  };
}
