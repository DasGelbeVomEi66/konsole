// Horror-Kanal "FOSSIL": Ego-Perspektive, keine Waffen. Ein Gang im Lindholm-Institut wiederholt sich
// und wird mit jeder Runde unheimlicher. Am Ende führt der Weg durch den Wintergarten, in dem etwas Großes wohnt.
import * as THREE from '../../lib/three.module.min.js';
import { materials, buildCorridor, buildAtrium, makeRain, makeDust, AT, W2, BX, WIN, H } from './world.js';
import { makeDino } from './dino.js';
import { makeAudio } from './audio.js';
import { paperCanvas } from './tex.js';

const V3 = THREE.Vector3, TAU = Math.PI * 2, clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const R = (a, b) => a + Math.random() * (b - a);

// ---------- Texte ----------
const NOTES = {
  dienst: { title: 'Dienstplan Nachtwache', lines: ['Rundgang jede volle Stunde.', '', 'Gang Ost: Türen geschlossen halten.', 'Wintergarten NICHT betreten.', '', 'Bei Stromausfall startet der', 'Notstrom automatisch.', '', 'Funkgerät liegt auf dem Tisch.', '', '               Haustechnik'] },
  albers1: { title: 'Labornotiz 14.03.', lines: ['K-7 hat heute die Futterklappe', 'geöffnet. Von innen.', '', 'Sie beobachtet uns, wenn wir', 'das Licht ausschalten.', 'Sie lernt schneller als wir', 'Schlösser einbauen können.', '', '                    Dr. Albers'] },
  albers2: { title: 'Labornotiz 19.03.', lines: ['K-7 reagiert auf Licht.', 'Direktes Licht in die Augen:', 'sofortiger Rückzug.', '', '!Im Dunkeln wird sie mutig.', '', 'Die Große (K-2) sieht schlecht,', 'hört aber jeden Schritt.'] },
  albers3: { title: 'Labornotiz 22.03.', lines: ['Sie ahmt Stimmen nach.', '', 'Heute rief jemand meinen Namen', 'aus dem Lüftungsschacht.', 'Es war niemand im Gebäude.', '', 'Ich habe geantwortet.', '!Das hätte ich nicht tun sollen.'] },
  karte: { title: 'Zettel in der Schublade', lines: ['Ersatzkarte Wintergarten.', '', 'Der Notausgang ist auf der', 'Ostseite, hinter dem Skelett.', '', '!Nicht rennen.', '!Nicht mit Licht in ihre Richtung.'] },
  letzte: { title: '(zerknittert, Flecken)', lines: ['Wenn du Schritte hinter dir hörst,', 'die aufhören, sobald du stehst:', '', 'NICHT einfach weitergehen.', '', 'Lampe an. Umdrehen.', 'In die Augen leuchten.', '', '!Sie kommt immer wieder.'], blood: true },
};
const RADIO = {
  1: '... Unwetterwarnung für den Landkreis. Anwohner rund um das Lindholm-Institut werden gebeten, Fenster und Türen geschlossen zu halten ...',
  2: '... Fenster und Türen ... geschlossen ... zwei Tiere ... bisher nicht eingefangen ...',
  3: 'Hallo? ... Ist da jemand? ... Hallo?',
  5: 'Hier ist Albers. Wenn du das hörst: Die Ersatzkarte für den Wintergarten liegt in meinem Schreibtisch. Obere Schublade. Der einzige Weg nach draußen führt durch den Wintergarten. Und mach das Licht nicht aus.',
  7: 'Albers hier. Sie ist im Wintergarten. Die Große. Sie sieht schlecht, aber sie hört alles. Lampe aus. Geduckt. Langsam. Der Ausgang ist auf der anderen Seite.',
};

const CSS = `.hr{position:absolute;top:0;right:0;bottom:0;left:0;background:#000;overflow:hidden;font-family:Georgia,'Times New Roman',serif;color:#d8d2c4}
.hr canvas{position:absolute;top:0;left:0;width:100%;height:100%;display:block}
.hr-sub{position:absolute;left:10%;right:10%;bottom:9%;text-align:center;font-size:clamp(18px,2.1vw,28px);text-shadow:0 2px 6px #000,0 0 2px #000;opacity:0;transition:opacity .6s;font-style:italic}
.hr-hint{position:absolute;left:50%;top:50%;transform:translate(-50%,24px);font-size:clamp(14px,1.4vw,19px);font-family:Arial,sans-serif;letter-spacing:.06em;opacity:0;transition:opacity .25s;text-shadow:0 1px 4px #000;color:#cfc8b8}
.hr-dot{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:rgba(220,210,190,.5);opacity:0;transition:opacity .25s}
.hr-help{position:absolute;left:3%;top:4%;font-family:Arial,sans-serif;font-size:clamp(13px,1.2vw,16px);line-height:1.6;color:#a8a294;opacity:0;transition:opacity 1s;text-shadow:0 1px 3px #000}
.hr-fade{position:absolute;top:0;right:0;bottom:0;left:0;background:#000;pointer-events:none;opacity:1}
.hr-note{position:absolute;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;flex-direction:column}
.hr-note img{height:78vh;box-shadow:0 20px 60px #000;transform:rotate(-1.5deg)}
.hr-note small,.hr-menu small{margin-top:14px;font-family:Arial,sans-serif;color:#8a8478;font-size:15px}
.hr-menu{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(ellipse at center,rgba(0,0,0,.1),rgba(0,0,0,.75))}
.hr-menu h1{font-size:clamp(60px,10vw,150px);letter-spacing:.35em;margin:0 0 0 .35em;font-weight:normal;color:#cfc6b0;text-shadow:0 0 30px rgba(0,0,0,.9),0 0 3px #000}
.hr-menu h2{font-weight:normal;font-style:italic;font-size:clamp(16px,1.8vw,24px);color:#8f887a;margin:4px 0 40px}
.hr-menu .b{display:block;min-width:300px;margin:8px;padding:12px 30px;background:rgba(20,18,14,.6);border:1px solid #5a5446;color:#d8d2c4;font-family:Georgia,serif;font-size:22px;letter-spacing:.08em;transition:background .2s,border-color .2s}
.hr-menu .b.hover{background:rgba(90,20,14,.65);border-color:#c8a080}
.hr-menu p{max-width:640px;color:#8a8478;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin-top:30px}
.hr-load{position:absolute;bottom:6%;right:5%;font-style:italic;color:#6a6458}`;

export function openHorror(box, K) {
  if (!document.getElementById('hr-css')) { const st = document.createElement('style'); st.id = 'hr-css'; st.textContent = CSS; document.head.appendChild(st); }
  box.innerHTML = `<div class="hr"><canvas></canvas><div class="hr-dot"></div><div class="hr-hint"></div><div class="hr-sub"></div><div class="hr-help"></div>
    <div class="hr-note"><img alt="Notiz"><small>A oder B: weglegen</small></div><div class="hr-menu"></div><div class="hr-fade"></div></div>`;
  const root = box.firstChild, q = s => root.querySelector(s), canvas = q('canvas');
  const cursorEl = document.getElementById('cursor');
  let closed = false, paused = false;

  // ---------- Renderer ----------
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { q('.hr-menu').innerHTML = '<h2>Dieser Browser kann kein 3D (WebGL 2). Bitte am Laptop in Edge spielen.</h2>'; q('.hr-fade').style.opacity = 0; return { close() {} }; }
  const DPR = Math.min(devicePixelRatio || 1, 1.25);
  renderer.setPixelRatio(DPR); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#000');
  scene.fog = new THREE.FogExp2('#020304', 0.09);
  const cam = new THREE.PerspectiveCamera(68, 16 / 9, 0.05, 120); cam.rotation.order = 'YXZ'; scene.add(cam);

  // ---------- Nachbearbeitung: Bloom, Farbstimmung, Körnung, Vignette, Farbsäume ----------
  const post = (() => {
    const hf = THREE.HalfFloatType;
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: hf, samples: 4 });
    const rA = new THREE.WebGLRenderTarget(4, 4, { type: hf }), rB = new THREE.WebGLRenderTarget(4, 4, { type: hf });
    const qs = new THREE.Scene(), qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; qs.add(quad);
    const vs = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
    const bright = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: vs, fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb; float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*smoothstep(.7,2.2,l),1.); }' });
    const blur = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: vs,
      fragmentShader: 'uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb*.227; c+=(texture2D(t,vUv+d*1.38).rgb+texture2D(t,vUv-d*1.38).rgb)*.316; c+=(texture2D(t,vUv+d*3.23).rgb+texture2D(t,vUv-d*3.23).rgb)*.07; gl_FragColor=vec4(c,1.); }' });
    const comp = new THREE.ShaderMaterial({
      uniforms: { tS: { value: null }, tB: { value: null }, time: { value: 0 }, fear: { value: 0 }, flash: { value: 0 }, red: { value: 0 }, fade: { value: 1 }, exposure: { value: 1.4 }, res: { value: new THREE.Vector2(1, 1) }, shake: { value: 0 } },
      vertexShader: vs,
      fragmentShader: `uniform sampler2D tS,tB; uniform float time,fear,flash,red,fade,exposure,shake; uniform vec2 res; varying vec2 vUv;
        vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
        float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          vec2 c0 = vUv-.5; float r2 = dot(c0,c0);
          vec2 uv = .5 + c0*(1. - .05*r2 - fear*.04*r2);
          uv += vec2(sin(uv.y*24.+time*2.7), cos(uv.x*19.+time*2.1))*.0018*fear*fear;
          uv += (vec2(hash(vec2(time,1.)),hash(vec2(1.,time)))-.5)*shake*.02;
          vec2 c = uv-.5; float ca = (.0015 + fear*.007)*(.3+r2*4.);
          vec3 col = vec3(texture2D(tS,uv+c*ca).r, texture2D(tS,uv).g, texture2D(tS,uv-c*ca).b);
          col += texture2D(tB,uv).rgb*.8;
          col *= exposure;
          col = aces(col);
          float l = dot(col,vec3(.299,.587,.114));
          col = mix(vec3(l), col, .78 - fear*.3);
          col *= mix(vec3(.86,.98,.95), vec3(1.05,.99,.9), smoothstep(.0,.5,l));
          col = pow(col, vec3(1./2.2));
          float v = smoothstep(.95, .18 - fear*.12, length(c0*vec2(1.25,1.)));
          col *= mix(.18, 1., v);
          float g = hash(vUv*res + fract(time*7.31)*91.7) - .5;
          col += g*(.055 + fear*.05) * (1.2 - l);
          col += (hash(vec2(floor(vUv.y*res.y*.5), floor(time*24.))) - .5)*.008;
          col = mix(col, vec3(1.), flash);
          col = mix(col, vec3(.45,0.,0.), red*(1.-v*.4));
          col *= 1. - fade;
          gl_FragColor = vec4(col,1.);
        }` });
    let W = 4, Hh = 4;
    return {
      comp,
      setSize(w, h) { W = w; Hh = h; rt.setSize(w, h); rA.setSize(w >> 2, h >> 2); rB.setSize(w >> 2, h >> 2); comp.uniforms.res.value.set(w, h); },
      render() {
        renderer.setRenderTarget(rt); renderer.render(scene, cam);
        quad.material = bright; bright.uniforms.t.value = rt.texture; renderer.setRenderTarget(rA); renderer.render(qs, qc);
        quad.material = blur;
        for (let i = 0; i < 2; i++) {
          blur.uniforms.t.value = rA.texture; blur.uniforms.d.value.set(4 / W * (i + 1), 0); renderer.setRenderTarget(rB); renderer.render(qs, qc);
          blur.uniforms.t.value = rB.texture; blur.uniforms.d.value.set(0, 4 / Hh * (i + 1)); renderer.setRenderTarget(rA); renderer.render(qs, qc);
        }
        quad.material = comp; comp.uniforms.tS.value = rt.texture; comp.uniforms.tB.value = rA.texture; renderer.setRenderTarget(null); renderer.render(qs, qc);
      },
      dispose() { rt.dispose(); rA.dispose(); rB.dispose(); },
    };
  })();
  function resize() { const w = box.clientWidth || innerWidth, h = box.clientHeight || innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); post.setSize(Math.round(w * DPR), Math.round(h * DPR)); }
  addEventListener('resize', resize);

  // ---------- Lichter (feste Anzahl, damit nichts neu kompiliert werden muss) ----------
  const hemi = new THREE.HemisphereLight('#3a4450', '#0a0806', 0.03); scene.add(hemi);
  const flash = new THREE.SpotLight('#fff0d8', 0, 26, 0.5, 0.75, 1.7);
  flash.castShadow = true; flash.shadow.mapSize.set(1024, 1024); flash.shadow.bias = -0.0004; flash.shadow.normalBias = 0.02; flash.shadow.camera.near = 0.1;
  scene.add(flash); scene.add(flash.target);
  const lampLights = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight('#ffb36a', 0, 10, 1.7); scene.add(l); lampLights.push(l); }
  const emergency = new THREE.PointLight('#ff2a14', 0, 9, 1.6); scene.add(emergency);
  const exitGlow = new THREE.PointLight('#2bff60', 0, 8, 1.8); exitGlow.position.set(AT.x1 - 0.5, 2.6, AT.exit.z); scene.add(exitGlow);
  const bolt = new THREE.DirectionalLight('#b9c8ff', 0); bolt.position.set(26, 24, -2); bolt.target.position.set(4, 0, -12); scene.add(bolt); scene.add(bolt.target);
  bolt.castShadow = true; bolt.shadow.mapSize.set(2048, 2048); Object.assign(bolt.shadow.camera, { left: -26, right: 26, top: 22, bottom: -22, near: 1, far: 80 }); bolt.shadow.bias = -0.0006; bolt.shadow.normalBias = 0.03;
  const moon = new THREE.DirectionalLight('#5a7090', 0); moon.position.set(10, 30, -5); moon.target.position.set(18, 0, -16); scene.add(moon); scene.add(moon.target);

  // ---------- Welt ----------
  q('.hr-menu').innerHTML = '<div class="hr-load">Lädt …</div>'; q('.hr-fade').style.opacity = 0.0;
  let M, atrium, rain, dust, corr = null, A = null;
  const dinos = { raptor: null, rex: null };

  // ---------- Zustand ----------
  const P = { pos: new V3(0, 0, -0.9), yaw: 0, pitch: 0, vel: new V3(), eyeK: 0, crouch: false, run: false, stamina: 1, bob: 0, lastStep: 0, lamp: false, lampDir: new V3(0, 0, -1), moving: 0, inAtrium: false };
  const IN = { mx: 0, my: 0, mvT: 0, keys: {}, lookX: 0, lookY: 0 };
  let mode = 'load', loopN = 1, gen = 0, gtime = 0, waits = [], cols = [], items = [], note = null, deathCause = null;
  const S = { tension: 0, fear: 0, fade: 1, fadeTarget: 0, fadeSpeed: 1.2, red: 0, flashFx: 0, shake: 0, lampsOn: [], power: true, flicker: 0, boltK: 0, nextBolt: 8, boltRate: [12, 22], stalker: null, rex: null, emergency: 0, help: 0, lampBattery: 1 };

  const sub = (txt, dur = 4) => { const e = q('.hr-sub'); e.textContent = txt; e.style.opacity = 1; clearTimeout(sub.t); sub.t = setTimeout(() => e.style.opacity = 0, dur * 1000); };
  const sleep = s => new Promise(res => waits.push({ end: gtime + s, res, g: gen }));
  const until = fn => new Promise(res => waits.push({ fn, res, g: gen }));
  const fadeTo = (v, speed = 1.2) => { S.fadeTarget = v; S.fadeSpeed = speed; return until(() => Math.abs(S.fade - v) < 0.02); };
  const store = { get: (k, d) => K.store.get(k, d), set: (k, v) => K.store.set(k, v) };

  function phones(m) {
    if (m === 'play') K.send({ t: 'mode', m: 'pad', cfg: { title: 'FOSSIL', dark: true, stick: true, look: true, hint: 'Handy wie eine Taschenlampe halten. Drehen = umsehen.', buttons: [{ b: 'USE', label: 'Benutzen', color: '#3d4145' }, { b: 'LAMP', label: 'Lampe', color: '#5a4a1a' }, { b: 'RUN', label: 'Rennen', color: '#3d4145' }, { b: 'CROUCH', label: 'Ducken', color: '#3d4145' }] } });
    else K.send({ t: 'mode', m: 'pointer' });
    if (cursorEl) cursorEl.style.visibility = m === 'play' ? 'hidden' : '';
  }

  // ---------- Gang aufbauen ----------
  const LOOPS = {
    1: { len: 14, lamps: [1, 1, 1, 1], notes: ['dienst'], rain: 1, clock: true, bolt: [10, 18] },
    2: { len: 14, lamps: [1, 1, 1, 1], notes: ['dienst', 'albers1'], skullTurned: true, clockStopped: true, bolt: [9, 16] },
    3: { len: 14, lamps: [1, 0.6, 1, 1], notes: ['albers1', 'albers2'], skullTurned: true, footprints: true, scratches: true, clockStopped: true, flicker: 0.5, bolt: [8, 14] },
    4: { len: 14, lamps: [1, 1, 0.5, 0], notes: ['albers2'], decay: true, caseBroken: true, skullGone: true, footprints: true, scratches: true, flicker: 0.8, floorNote: 'albers3', bolt: [8, 14] },
    5: { len: 14, lamps: [0, 0, 0, 0.3], notes: ['albers2', 'albers3'], decay: true, caseBroken: true, skullGone: true, scratches: true, paintingChanged: true, dark: true, emergency: 1, bolt: [7, 12] },
    6: { len: 22, lamps: [0, 0, 0, 0, 0, 0.25], notes: [], decay: true, caseBroken: true, skullGone: true, scratches: true, blood: true, paintingChanged: true, paintingFallen: true, dark: true, floorNote: 'letzte', bolt: [7, 12] },
    7: { len: 14, lamps: [0, 0, 0, 0], notes: [], decay: true, caseBroken: true, skullGone: true, scratches: true, blood: true, paintingChanged: true, dark: true, emergency: 1, bolt: [5, 9], endOpen: true },
  };

  function noteTex(id) { const n = NOTES[id]; const c = paperCanvas(n.lines, { title: n.title, blood: n.blood }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  function showNote(id) { const n = NOTES[id]; note = id; q('.hr-note img').src = paperCanvas(n.lines, { title: n.title, blood: n.blood }).toDataURL(); q('.hr-note').style.display = 'flex'; A.paper(); }
  function hideNote() { note = null; q('.hr-note').style.display = 'none'; A.paper(); }

  function clearCorridor() { if (corr) { scene.remove(corr.group); corr.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); for (const l of corr.loops || []) l.stop(); corr = null; } }
  function buildLoop(n) {
    clearCorridor(); const cfg = LOOPS[n]; loopN = n;
    const v = Object.assign({}, cfg, { boardNotes: cfg.notes.length ? cfg.notes.map(noteTex) : null });
    corr = buildCorridor(v); corr.loops = []; scene.add(corr.group);
    cols = corr.cols.slice(); items = [];
    const L = corr.L, r = corr.refs;
    // Lampen zuordnen
    S.lampsOn = r.lamps.map((l, i) => ({ ref: l, level: cfg.lamps[i] == null ? 0 : cfg.lamps[i], cur: 0, light: lampLights[i] }));
    lampLights.forEach((l, i) => { const lp = S.lampsOn[i]; if (lp) l.position.copy(lp.ref.pos); l.intensity = 0; });
    S.power = !cfg.dark; S.flicker = cfg.flicker || 0; S.boltRate = cfg.bolt; S.nextBolt = R(3, 6);
    S.emergency = cfg.emergency || 0; emergency.position.set(BX - 0.3, 2.6, -L - 1.25);
    if (S.emergency) { const em = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.3), M.red); em.position.set(BX - 0.04, 2.5, -L - 1.25); corr.group.add(em); }
    // Dauergeräusche
    if (cfg.clock) corr.loops.push(A.loop('clock', r.clock.getWorldPosition(new V3())));
    S.stalker = null; S.rex = null; for (const k in dinos) if (dinos[k]) { dinos[k].root.visible = false; dinos[k].rear = 0; dinos[k].jawOpen = 0; dinos[k].lunge = 0; dinos[k].agitation = 0; }
    // Uhr stellen
    const ck = r.clock.userData; const setClock = (h, m, s) => { ck.hour.rotation.z = -(h + m / 60) / 12 * TAU; ck.min.rotation.z = -m / 60 * TAU; ck.sec.rotation.z = -s / 60 * TAU; };
    corr.setClock = setClock; setClock(3, 33, 0);
    // Interaktionen
    const doors = r.doors;
    items.push({ pos: new V3(0, 1.1, -0.05), label: 'Tür öffnen', use() { A.door(this.pos, 'locked'); sub('Abgeschlossen.', 2); } });
    items.push({ pos: new V3(-W2 + 0.05, 1.1, -2.2), label: 'Tür öffnen', use() { A.door(this.pos, 'locked'); sub(loopN >= 4 ? 'Etwas hält von innen dagegen.' : 'Abgeschlossen. Büro Dr. Albers.', 2.5); } });
    items.push({ pos: new V3(-W2 + 0.05, 1.1, -L + 3), label: 'Tür öffnen', use() { A.door(this.pos, 'locked'); sub('Lager. Abgeschlossen.', 2); } });
    corr.endItem = { pos: new V3(BX - 0.05, 1.1, -L - 1.25), label: 'Tür öffnen', use: () => endDoor() }; items.push(corr.endItem);
    corr.radioItem = { pos: r.radio.getWorldPosition(new V3()).add(new V3(0, 0.15, 0)), label: 'Funkgerät', use() { radioTalk(true); } }; items.push(corr.radioItem);
    if (r.board) items.push({ pos: r.board.getWorldPosition(new V3()), r: 1.8, label: 'Lesen', use() { showNote(cfg.notes[cfg.notes.length - 1]); } });
    if (cfg.floorNote) {
      const fn = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshStandardMaterial({ map: noteTex(cfg.floorNote), roughness: 1 }));
      fn.rotation.x = -Math.PI / 2; fn.rotation.z = 0.5; fn.position.set(0.3, 0.006, n === 6 ? -9.5 : -6.8); fn.receiveShadow = true; corr.group.add(fn);
      items.push({ pos: fn.position.clone(), r: 1.8, label: 'Lesen', use() { showNote(cfg.floorNote); } });
    }
    if (cfg.skullTurned && r.skull) { /* schon gedreht */ }
    if (cfg.endOpen) {
      doors.end.target = doors.end.angle = 1.9; doors.end.update(0);
      const vd = r.void76; if (vd) corr.group.remove(vd);
      const e = cols.find(c => c.id === 'end'); e.on = false;
      cols.push({ a: { x: BX, z: -L - 2.5 }, b: { x: BX, z: -L - 1.75 }, on: true }, { a: { x: BX, z: -L - 0.75 }, b: { x: BX, z: -L }, on: true });
      items.splice(items.indexOf(corr.endItem), 1);
    }
    cols = cols.concat(atrium.cols);
    if (r.glass) r.glass.material.map.offset.set(0, 0);
  }

  // ---------- Funkgerät ----------
  let radioStatic = null, radioDone = {};
  function radioTalk(force) {
    const txt = RADIO[loopN]; if (!txt || !S.power && loopN < 5) { if (force) { A.click(corr.radioItem.pos); sub('Nur Rauschen.', 2); } return; }
    if (radioDone[loopN] && !force) return; radioDone[loopN] = true;
    A.click(corr.radioItem.pos);
    const pitch = loopN === 3 ? 0.35 : loopN >= 5 ? 0.85 : 0.7;
    A.say(txt, { pitch, rate: loopN === 3 ? 0.7 : 0.9, vol: 0.8 }); sub(txt, Math.max(5, txt.length / 14));
  }

  // ---------- Tür am Ende ----------
  let endLocked = null;
  function endDoor() {
    if (mode !== 'play') return;
    if (endLocked) { A.door(corr.endItem.pos, 'locked'); A.beep(false); sub(endLocked, 2.5); return; }
    nextLoop();
  }
  async function nextLoop() {
    mode = 'trans'; const g0 = gen; const d = corr.refs.doors.end; d.target = 1.2; A.door(corr.endItem.pos, 'open');
    await fadeTo(1, 1.4); if (g0 !== gen) return;
    A.hush();
    for (let i = 0; i < 6; i++) setTimeout(() => !closed && A.step('wood', 0.7), 300 + i * 420);
    await sleep(2.9);
    const n = Math.min(7, loopN + 1); startLoop(n);
  }

  // ---------- Runden-Skripte ----------
  async function startLoop(n) {
    gen++; waits = waits.filter(w => w.g === gen); const g = gen;
    buildLoop(n); if (n >= 2) store.set('hr-loop', n);
    P.pos.set(0, 0, -0.9); P.yaw = 0; P.pitch = 0; P.vel.set(0, 0, 0); P.crouch = false; P.stamina = 1; P.inAtrium = false;
    P.lamp = n >= 5 ? P.lamp : false; endLocked = null; radioDone = {}; deathCause = null; S.red = 0; S.flashFx = 0;
    mode = 'play'; phones('play'); S.fade = 1; fadeTo(0, 0.7);
    A.door(new V3(0, 1, 0), 'slam');
    if (n === 1) { S.help = 9; }
    try { await SCRIPTS[n](g); } catch (e) { if (e !== 'gen') console.error(e); }
  }
  const alive = g => { if (g !== gen || closed) throw 'gen'; };
  const looking = (p, cos = 0.9) => { const f = cam.getWorldDirection(new V3()); const d = p.clone().sub(cam.position).normalize(); return f.dot(d) > cos; };

  const SCRIPTS = {
    1: async g => {
      await sleep(2); alive(g); sub('Lindholm-Institut. Nachtwache. Erster Rundgang.', 4);
      await until(() => P.pos.z < -2.4); alive(g); radioTalk();
    },
    2: async g => {
      await until(() => P.pos.z < -2.6); alive(g); radioTalk();
      await until(() => P.pos.z < -6.5); alive(g);
      const od = corr.refs.doors.office; od.speed = 0.6; od.target = -0.35; A.door(new V3(-W2, 1, -2.2), 'creak');
      await sleep(4); alive(g); A.claws(new V3(-2.2, 0.3, -11), 3, 0.6);
    },
    3: async g => {
      await until(() => P.pos.z < -2.6); alive(g); radioTalk();
      await until(() => P.pos.z < WIN[0] + 0.5 && P.pos.z > WIN[1] - 1 && looking(new V3(3, 1.6, -9), 0.75)); alive(g);
      // Blitz: draußen steht etwas Großes
      const rex = dinos.rex; rex.root.visible = true; rex.root.position.set(4.2, 0, -9); rex.root.rotation.y = -Math.PI / 2; rex.lookAt = cam.position; rex.speed = 0; rex.crouch = 0.35;
      S.nextBolt = 99; lightning(1.3); A.sting(1.2, true);
      await sleep(0.9); alive(g); A.breath(new V3(3, 3, -9), 1, true);
      await sleep(3.5); alive(g); lightning(0.9); rex.root.visible = false; S.nextBolt = R(4, 8);
      await until(() => P.pos.x > 3); alive(g); A.door(corr.endItem.pos, 'bang'); S.tension = Math.max(S.tension, 0.5);
    },
    4: async g => {
      await until(() => P.pos.z < -2.6); alive(g); radioTalk();
      await until(() => P.pos.z < -4.4); alive(g);
      // Stromausfall
      S.flicker = 2; await sleep(1.2); alive(g);
      S.power = false; A.powerDown(); A.hush(); S.flicker = 0; S.tension = Math.max(S.tension, 0.45);
      await sleep(1.5); alive(g); if (!P.lamp) sub('Taschenlampe: LAMPE auf dem Handy (Taste F).', 5);
      await until(() => P.pos.x > 2.2); alive(g);
      A.metal(new V3(0.8, 0.3, -1.2)); A.whoosh();
      const rp = dinos.raptor; rp.root.visible = true; rp.root.position.set(0, 0, -1.8); rp.root.rotation.y = Math.PI; rp.lookAt = cam.position; rp.speed = 0; rp.crouch = 0.25;
      await sleep(0.6); alive(g); A.breath(new V3(0, 1, -1.8), 1);
      const t0 = gtime; let seen = false;
      await until(() => { const head = rp.head.getWorldPosition(new V3()); if (P.lamp && looking(head, 0.94) && cam.position.distanceTo(head) < 16) seen = true; return seen || gtime - t0 > 9; }); alive(g);
      if (seen) { A.hiss(rp.root.position); A.sting(1); S.tension = 0.8; }
      // weg ins Büro
      const od = corr.refs.doors.office; od.speed = 4; od.target = -1.4; A.door(new V3(-W2, 1, -2.2), 'open');
      rp.crouch = 0; rp.agitation = 1; rp.lookAt = null; let tt = 0;
      await until(() => { tt += 1 / 60; const p = rp.root.position, tgt = new V3(-2.4, 0, -2.2), d = tgt.clone().sub(p); rp.speed = 5; if (d.length() < 0.3) return true; d.normalize(); p.addScaledVector(d, 0.09); rp.root.rotation.y = Math.atan2(d.x, d.z); if (Math.random() < 0.1) A.claws(p, 2, 0.8); return tt > 3; }); alive(g);
      rp.root.visible = false; rp.speed = 0; od.speed = 3; od.target = 0; A.door(new V3(-W2, 1, -2.2), 'slam'); S.tension = 0.6;
    },
    5: async g => {
      endLocked = 'Kartenleser. Ohne Karte geht hier nichts auf.';
      const rd = new THREE.Group(); rd.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.1), M.metal)); const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), M.red); led.position.set(-0.025, 0.05, 0); rd.add(led); rd.position.set(BX - 0.03, 1.25, -corr.L - 0.45); corr.group.add(rd);
      await until(() => P.pos.z < -2.6); alive(g); radioTalk();
      // Lüftung über dem Kopf
      let ventOn = true; (async () => { while (ventOn && g === gen) { await sleep(R(5, 9)); if (g !== gen) return; const v = corr.refs.vents.reduce((b, v) => Math.abs(v.position.z - P.pos.z) < Math.abs(b.position.z - P.pos.z) ? v : b); A.vent(v.position); } })();
      // Schublade
      const drawer = corr.refs.desk.userData.drawer;
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.003, 0.054), new THREE.MeshStandardMaterial({ color: '#ddd', roughness: 0.4 })); card.position.set(0, 0.065, 0.1); drawer.add(card);
      let got = false;
      const it = { pos: corr.refs.desk.localToWorld(new V3(-0.42, 0.62, 0.3)), label: 'Schublade öffnen', use() { if (this.open) return; this.open = true; A.door(this.pos, 'latch'); this.label = 'Karte nehmen'; this.use = () => { got = true; card.visible = false; A.pickup(); items.splice(items.indexOf(it), 1); showNote('karte'); }; } };
      items.push(it);
      await until(() => got && !note); alive(g);
      // Hinter dir fällt das Gitter
      ventOn = false; endLocked = null;
      const vg = corr.refs.vents[0]; await sleep(1.2); alive(g);
      A.metal(vg.position); A.growl(vg.position.clone().add(new V3(0, 0.4, 0)), 2, 1); A.sting(0.8); S.tension = 0.75; S.shake = 0.4;
      let vy = 0; await until(() => { vy -= 9.8 / 60; vg.position.y = Math.max(0.02, vg.position.y + vy / 60); vg.rotation.x += 0.12; if (vg.position.y <= 0.02) { vg.rotation.x = 0.03; return true; } return false; });
      led.material = M.green;
    },
    6: async g => {
      await until(() => P.pos.z < -3.2); alive(g);
      // Die Eingangstür hinter dir öffnet sich
      const fd = corr.refs.doors.front; fd.speed = 0.5; fd.target = 1.0; A.door(new V3(0, 1, 0), 'creak'); S.tension = 0.6;
      await sleep(2); alive(g);
      S.stalker = { d: 9, retreat: 0, cool: 0, stepT: 0, breathT: 2, called: false };
      dinos.raptor.root.visible = true; dinos.raptor.crouch = 0.45; dinos.raptor.agitation = 0.4;
    },
    7: async g => {
      await sleep(1.5); alive(g); radioTalk(true);
      await until(() => P.pos.x > BX + 0.6); alive(g);
      P.inAtrium = true; S.rex = { wp: 0, m: 0, state: 'patrol', t: 0, lost: 0, last: new V3(), stepT: 0, breathT: 4, warned: false, pause: 0 };
      const rex = dinos.rex; rex.root.visible = true; rex.root.position.set(22, 0, -9); rex.speed = 0; rex.crouch = 0; rex.lookAt = null;
      A.roar(new V3(24, 4, -12), 0.7); S.tension = 0.7; await sleep(4); alive(g);
      await until(() => P.pos.x > AT.x1 - 1.2 && Math.abs(P.pos.z - AT.exit.z) < 1.2); alive(g);
      ending();
    },
  };

  // ---------- Blitz ----------
  function lightning(power = 1) {
    S.boltK = power; S.boltSeq = [0, 0.08, 0.16, 0.3, 0.42].map(t => gtime + t + Math.random() * 0.05);
    A.thunder(0.6 + Math.random() * 1.5, 0.6 + power * 0.4);
  }

  // ---------- Tod ----------
  async function die(who) {
    if (mode !== 'play') return; mode = 'dying'; deathCause = who; const g = gen;
    const d = who === 'rex' ? dinos.rex : dinos.raptor;
    const dir = d.head.getWorldPosition(new V3()).sub(cam.position); const tYaw = Math.atan2(-dir.x, -dir.z);
    let dy = tYaw - P.yaw; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU; P.yawTarget = P.yaw + dy;
        // Tier direkt vor die Kamera
    const f = new V3(-Math.sin(P.yawTarget), 0, -Math.cos(P.yawTarget));
    d.root.visible = true; d.lookAt = cam.position; d.jawOpen = 1; d.agitation = 1; d.speed = 0; d.crouch = 0; d.rear = 1;
    d.root.position.copy(P.pos).addScaledVector(f, who === 'rex' ? 6.6 : 2.0); d.root.rotation.y = Math.atan2(-f.x, -f.z);
    // Kopf genau vor die Kamera bringen
    const camY = 1.62 - P.eyeK * 0.68, hp = new V3();
    d.lookAt = null; d.rear = 0;
    if (who !== 'rex') for (let i = 0; i < 14; i++) { d.update(0); d.head.getWorldPosition(hp); d.rear = clamp(d.rear + (camY - 0.12 - hp.y) * 0.8, -0.5, 1.2); }
    d.update(0); d.head.getWorldPosition(hp);
    const hd = Math.hypot(hp.x - P.pos.x, hp.z - P.pos.z), want = who === 'rex' ? 2.6 : 1.0;
    d.root.position.addScaledVector(f, -(hd - want));
    d.update(0); d.head.getWorldPosition(hp);
    P.pitchTarget = Math.atan2(hp.y + (who === 'rex' ? 0.3 : 0.05) - camY, Math.max(0.3, Math.hypot(hp.x - P.pos.x, hp.z - P.pos.z)));
    d.lookAt = cam.position;
    d.lunge = 0.5;
    A.screech(null, 1.2); if (who === 'rex') A.roar(d.root.position, 1);
    S.shake = 1; S.red = 0.5; S.tension = 1; P.lamp = true;
    await sleep(0.85); if (g !== gen) return;
    S.fade = 1; S.fadeTarget = 1; A.duck(0, 0.02); A.hush();
    await sleep(1.6); if (g !== gen) return;
    A.duck(1, 1); S.red = 0; S.shake = 0;
    mode = 'dead'; phones('menu');
    menu(`<h1 style="font-size:clamp(40px,6vw,90px);letter-spacing:.2em">GEFUNDEN</h1><h2>${who === 'rex' ? 'Sie hat dich gehört.' : 'Du hast dich zu spät umgedreht.'}</h2>
      <button class="b hv" data-a="retry">Noch einmal</button><button class="b hv" data-a="title">Hauptmenü</button>`);
  }

  async function ending() {
    mode = 'end'; const g = gen; store.set('hr-done', 1); store.set('hr-loop', 1);
    A.door(new V3(AT.x1, 1.2, AT.exit.z), 'open'); atrium.exitDoor.target = -1.4;
    S.fadeTarget = 1; S.fadeSpeed = 0.5; await sleep(3); if (g !== gen) return;
    phones('menu');
    menu('<h2 style="font-size:28px;max-width:760px;line-height:1.7">Du bist draußen. Der Regen lässt nach.<br>Hinter dir, im Glashaus, ruft eine Stimme:</h2>');
    q('.hr-menu').style.opacity = 1;
    await sleep(4); if (g !== gen) return;
    A.say('Hallo?', { pitch: 0.3, rate: 0.6, vol: 1 }); sub('„Hallo?“', 3);
    await sleep(4); if (g !== gen) return;
    menu(`<h1>FOSSIL</h1><h2>Ende</h2><p>Ein Spiel für die Konsole. Alles in diesem Kanal ist zur Laufzeit erzeugt: Räume, Texturen, Tiere und Klänge.</p><button class="b hv" data-a="title">Hauptmenü</button>`);
  }

  // ---------- Menüs ----------
  function menu(html) { const m = q('.hr-menu'); m.innerHTML = html; m.style.display = 'flex'; m.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act(b.dataset.a))); }
  function hideMenu() { q('.hr-menu').style.display = 'none'; }
  function act(a) {
    if (a === 'new') { store.set('hr-loop', 1); hideMenu(); startLoop(1); }
    else if (a === 'cont') { hideMenu(); startLoop(store.get('hr-loop', 1)); }
    else if (a === 'retry') { hideMenu(); startLoop(loopN); }
    else if (a === 'title') title();
    else if (a === 'back') K.closeChannel();
  }
  function title() {
    gen++; mode = 'title'; phones('menu'); A.hush(); buildLoop(1); S.power = true; S.fade = 1; S.fadeTarget = 0; S.fadeSpeed = 0.5; S.help = 0;
    P.pos.set(0, 0, -6); P.yaw = 0.3; P.pitch = -0.05; P.lamp = false; S.tension = 0.15;
    const sv = store.get('hr-loop', 1);
    menu(`<h1>FOSSIL</h1><h2>Die Nachtwache im Lindholm-Institut</h2>
      <button class="b hv" data-a="new">Neues Spiel</button>${sv > 1 ? `<button class="b hv" data-a="cont">Fortsetzen (Runde ${sv})</button>` : ''}<button class="b hv" data-a="back">Zurück zum Menü</button>
      <p>Kopfhörer und ein dunkles Zimmer machen es schlimmer. Keine Waffen. Wenn etwas kommt, hilft nur Licht, Stille oder Weglaufen.<br><br>
      Handy: wie eine Taschenlampe halten und drehen zum Umsehen, Kreis zum Laufen. Laptop: W A S D, Maus (Klick zum Festhalten), F Lampe, E Benutzen, Umschalt Rennen, C Ducken.</p>`);
  }

  // ---------- Eingabe ----------
  const keyMap = { KeyW: 'f', KeyS: 'b', KeyA: 'l', KeyD: 'r', ShiftLeft: 'run', ShiftRight: 'run' };
  const kd = e => {
    if (closed || paused) return;
    if (keyMap[e.code]) IN.keys[keyMap[e.code]] = true;
    if (e.repeat) return;
    if (e.code === 'KeyF') button('LAMP', true); if (e.code === 'KeyE') button('USE', true); if (e.code === 'KeyC' || e.code === 'ControlLeft') button('CROUCH', true);
  };
  const ku = e => { if (keyMap[e.code]) IN.keys[keyMap[e.code]] = false; };
  const mm = e => { if (document.pointerLockElement === canvas && mode === 'play') { P.yaw -= e.movementX * 0.0022; P.pitch = clamp(P.pitch - e.movementY * 0.0022, -1.3, 1.3); } };
  canvas.addEventListener('click', () => { if (mode === 'play' && canvas.requestPointerLock) try { canvas.requestPointerLock(); } catch (e) {} });
  addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('mousemove', mm);

  function button(name, down) {
    if (mode !== 'play') return false;
    if (name === 'RUN') { P.run = down; return true; }
    if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(name)) { IN.keys[{ UP: 'f', DOWN: 'b', LEFT: 'l', RIGHT: 'r' }[name]] = down; return true; }
    if (!down) return true;
    if (note) { if (name === 'A' || name === 'B' || name === 'USE') hideNote(); return true; }
    if (name === 'LAMP') { P.lamp = !P.lamp; A.lampClick(); return true; }
    if (name === 'CROUCH') { P.crouch = !P.crouch; return true; }
    if (name === 'USE' || name === 'A') { const it = aimItem(); if (it) it.use(); return true; }
    if (name === 'B') return true;
    return false;
  }
  function aimItem() {
    const f = cam.getWorldDirection(new V3()); let best = null, bs = 0;
    for (const it of items) { const d = it.pos.clone().sub(cam.position), dist = d.length(); if (dist > (it.r || 1.6)) continue; const c = f.dot(d.normalize()); if (c > 0.82 && c > bs) { bs = c; best = it; } }
    return best;
  }

  // ---------- Kollision ----------
  function collide(p, r = 0.28) {
    for (let it = 0; it < 2; it++) for (const s of cols) {
      if (!s.on) continue;
      const ax = s.a.x, az = s.a.z, dx = s.b.x - ax, dz = s.b.z - az, l2 = dx * dx + dz * dz;
      let t = ((p.x - ax) * dx + (p.z - az) * dz) / l2; t = clamp(t, 0, 1);
      const cx = ax + dx * t, cz = az + dz * t, ox = p.x - cx, oz = p.z - cz, d = Math.hypot(ox, oz);
      if (d < r && d > 1e-6) { p.x = cx + ox / d * r; p.z = cz + oz / d * r; }
    }
  }

  // ---------- Pfad im Gang (für das Tier, das folgt) ----------
  function pathPts() { const L = corr.L; return [new V3(0, 0, -0.4), new V3(0, 0, -L - 1.25), new V3(BX - 0.5, 0, -L - 1.25)]; }
  function pathS(p) { const pts = pathPts(); let best = 1e9, bs = 0, acc = 0; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], ab = b.clone().sub(a), l = ab.length(); let t = clamp(p.clone().sub(a).dot(ab) / (l * l), 0, 1); const c = a.clone().addScaledVector(ab, t), d = c.distanceTo(new V3(p.x, 0, p.z)); if (d < best) { best = d; bs = acc + t * l; } acc += l; } return bs; }
  function pathPos(s) { const pts = pathPts(); for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], l = a.distanceTo(b); if (s <= l || i === pts.length - 2) return { p: a.clone().lerp(b, clamp(s / l, 0, 1)), dir: b.clone().sub(a).normalize() }; s -= l; } }

  // ---------- Sichtlinie im Wintergarten ----------
  function segBox(ax, az, bx, bz, c) {
    let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
    for (const [p, d, lo, hi] of [[ax, dx, c.x0, c.x1], [az, dz, c.z0, c.z1]]) {
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; continue; }
      let u0 = (lo - p) / d, u1 = (hi - p) / d; if (u0 > u1) [u0, u1] = [u1, u0]; t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); if (t0 > t1) return false;
    }
    return true;
  }
  function rexSees(rex) {
    const h = rex.head.getWorldPosition(new V3()), p = P.pos, d = new V3(p.x - h.x, 0, p.z - h.z), dist = d.length();
    if (dist > 24) return 0;
    const f = new V3(Math.sin(rex.root.rotation.y), 0, Math.cos(rex.root.rotation.y));
    if (f.dot(d.normalize()) < 0.35 && dist > 4) return 0;
    for (const c of atrium.covers) { if ((c.tall || P.crouch) && segBox(h.x, h.z, p.x, p.z, c)) { const inside = p.x > c.x0 && p.x < c.x1 && p.z > c.z0 && p.z < c.z1; if (!inside) return 0; } }
    return 1 - dist / 26;
  }

  // ---------- Tick ----------
  const tmp = new V3(), fwd = new V3(), right = new V3(), up = new V3(0, 1, 0);
  let lastFrame = 0;
  function update(dt) {
    gtime += dt;
    // Warten
    for (let i = waits.length - 1; i >= 0; i--) { const w = waits[i]; if (w.g !== gen) { waits.splice(i, 1); continue; } if ((w.end != null && gtime >= w.end) || (w.fn && w.fn())) { waits.splice(i, 1); w.res(); } }

    const playing = mode === 'play' && !note;
    // Bewegung
    if (performance.now() - IN.mvT > 260) { IN.mx = 0; IN.my = 0; }
    let mx = IN.mx + (IN.keys.r ? 1 : 0) - (IN.keys.l ? 1 : 0), my = IN.my + (IN.keys.b ? 1 : 0) - (IN.keys.f ? 1 : 0);
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    if (!playing) { mx = my = 0; }
    const running = (P.run || IN.keys.run) && P.stamina > 0.05 && my < -0.3 && !P.crouch;
    if (running) P.stamina = Math.max(0, P.stamina - dt / 5); else P.stamina = Math.min(1, P.stamina + dt / (ml > 0.1 ? 9 : 5));
    const speed = P.crouch ? 0.75 : running ? 3.9 : 1.45;
    fwd.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); right.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
    tmp.set(0, 0, 0).addScaledVector(fwd, -my * speed).addScaledVector(right, mx * speed);
    P.vel.lerp(tmp, Math.min(1, dt * 6));
    P.pos.addScaledVector(P.vel, dt); collide(P.pos);
    const sp = Math.hypot(P.vel.x, P.vel.z); P.moving = sp;
    // Kopf
    P.eyeK += ((P.crouch ? 1 : 0) - P.eyeK) * Math.min(1, dt * 7);
    P.bob += dt * sp * (running ? 2.1 : 2.6);
    const eye = 1.62 - P.eyeK * 0.68 + Math.sin(P.bob * 2) * 0.035 * Math.min(1, sp);
    if (mode === 'dying' && P.yawTarget != null) { P.yaw += (P.yawTarget - P.yaw) * Math.min(1, dt * 26); P.pitch += (P.pitchTarget - P.pitch) * Math.min(1, dt * 10); }
    if (mode === 'title') { P.yaw = 0.25 + Math.sin(gtime * 0.08) * 0.35; P.pitch = -0.05 + Math.sin(gtime * 0.11) * 0.04; P.pos.z = -5.5 + Math.sin(gtime * 0.05) * 0.8; }
    const breathe = Math.sin(gtime * (1.3 + S.fear * 2)) * (0.004 + S.fear * 0.006);
    cam.position.set(P.pos.x, eye + breathe, P.pos.z);
    cam.rotation.set(P.pitch + breathe * 0.5, P.yaw, Math.sin(P.bob) * 0.006 * Math.min(1, sp) + (S.shake ? (Math.random() - 0.5) * S.shake * 0.04 : 0));
    // Schritte
    const stepPh = Math.floor(P.bob / Math.PI);
    if (stepPh !== P.lastStep && sp > 0.3) { P.lastStep = stepPh; A.step(P.inAtrium || P.pos.x > BX ? (Math.random() < 0.4 ? 'wet' : 'tile') : 'wood', P.crouch ? 0.35 : running ? 1.3 : 0.75); }

    // Taschenlampe
    cam.getWorldDirection(fwd);
    P.lampDir.lerp(fwd, Math.min(1, dt * 11)).normalize();
    const camRight = new V3(1, 0, 0).applyQuaternion(cam.quaternion), camUp = new V3(0, 1, 0).applyQuaternion(cam.quaternion);
    flash.position.copy(cam.position).addScaledVector(camRight, 0.16).addScaledVector(camUp, -0.17).addScaledVector(fwd, 0.1);
    flash.target.position.copy(flash.position).addScaledVector(P.lampDir, 6); flash.target.updateMatrixWorld();
    let lampI = P.lamp ? 26 : 0;
    if (P.lamp && (S.flicker > 1.5 || (S.stalker && S.stalker.d < 4) || S.lampBad > 0)) { if (Math.random() < 0.12) lampI *= Math.random() * 0.3; }
    flash.intensity += (lampI - flash.intensity) * Math.min(1, dt * 30);
    flash.map = M.tex.cookie;

    // Deckenlampen
    for (const l of S.lampsOn) {
      let target = S.power ? l.level : (l === S.lampsOn[S.lampsOn.length - 1] ? l.level * 0.6 : 0);
      if (target > 0 && (S.flicker > 0 || l.level < 1)) { const fl = S.flicker + (1 - l.level); if (Math.random() < 0.04 * fl) l.dip = R(0.03, 0.25); }
      if (l.dip > 0) { l.dip -= dt; target *= 0.05; }
      if (S.flicker > 1.5 && Math.random() < 0.3) target *= Math.random();
      l.cur += (target - l.cur) * Math.min(1, dt * 25);
      l.light.intensity = l.cur * 9;
      const b = l.ref.obj.userData.bulb; b.material.emissiveIntensity = 0.05 + l.cur * 4; b.material.color.setScalar(0.2 + l.cur * 0.8);
    }
    emergency.intensity = S.emergency ? 2.2 * (0.85 + Math.sin(gtime * 2) * 0.15) : 0;
    exitGlow.intensity = loopN === 7 ? 2.5 : 0.6;
    moon.intensity = 0.05 + (loopN === 7 ? 0.08 : 0);
    hemi.intensity = 0.02 + (S.power ? 0.012 : 0);

    // Blitze
    if (mode === 'play' || mode === 'title') { S.nextBolt -= dt; if (S.nextBolt <= 0) { lightning(R(0.5, 1)); S.nextBolt = R(S.boltRate[0], S.boltRate[1]); } }
    let bk = 0; if (S.boltSeq) for (const t of S.boltSeq) { const d = gtime - t; if (d > 0 && d < 0.25) bk = Math.max(bk, Math.exp(-d * 14)); }
    bolt.intensity = bk * 7 * S.boltK; atrium.skyMat.uniforms.flash.value = bk * S.boltK; atrium.skyMat.uniforms.t.value = gtime;
    rain.material.uniforms.flash.value = bk * S.boltK; rain.material.uniforms.t.value = gtime;
    rain.material.uniforms.lp.value.copy(flash.position); rain.material.uniforms.ld.value.copy(P.lampDir); rain.material.uniforms.lon.value = P.lamp ? 1 : 0;
    if (corr && corr.refs.glass) corr.refs.glass.material.map.offset.y = (gtime * 0.03) % 1;
    // Staub
    const du = dust.material.uniforms; du.t.value = gtime; du.cen.value.copy(cam.position); du.lp.value.copy(flash.position); du.ld.value.copy(P.lampDir); du.lon.value = flash.intensity / 26; du.size.value = 7 * renderer.domElement.height / 900;

    // Uhr
    if (corr && LOOPS[loopN].clock) { const t = 3 * 3600 + 12 * 60 + gtime; corr.setClock(Math.floor(t / 3600) % 12, Math.floor(t / 60) % 60, Math.floor(t) % 60); }
    // Türen
    if (corr) for (const k in corr.refs.doors) corr.refs.doors[k].update(dt);
    atrium.exitDoor.update(dt);

    // ---------- Das Tier im Gang (Runde 6) ----------
    const st = S.stalker, rp = dinos.raptor;
    if (st && mode === 'play') {
      const sP = pathS(P.pos);
      const head = rp.head.getWorldPosition(new V3()), toR = head.clone().sub(cam.position), dist = toR.length();
      const seen = P.lamp && flash.intensity > 14 && fwd.dot(toR.normalize()) > 0.93 && dist < 14;
      if (st.retreat > 0) { st.retreat -= dt; st.d += dt * 8; rp.speed = 7; }
      else if (seen && st.cool <= 0) { st.retreat = 0.9; st.cool = 2.5; A.hiss(head, 1); A.sting(0.7); S.tension = 0.9; rp.agitation = 1; }
      else { st.d -= dt * (P.moving > 0.3 ? 0.5 : 0.32); rp.speed = Math.max(0, P.moving) + 0.4; }
      st.cool -= dt; st.d = Math.min(st.d, 12);
      const sR = Math.max(0, sP - st.d), pp = pathPos(sR);
      rp.root.position.lerp(pp.p, Math.min(1, dt * 8));
      const look = new V3(P.pos.x - rp.root.position.x, 0, P.pos.z - rp.root.position.z);
      let ty = st.retreat > 0 ? Math.atan2(-look.x, -look.z) : Math.atan2(look.x, look.z);
      let dy = ty - rp.root.rotation.y; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU; rp.root.rotation.y += dy * Math.min(1, dt * 6);
      rp.lookAt = st.retreat > 0 ? null : cam.position; rp.crouch = st.retreat > 0 ? 0 : 0.45; rp.agitation = Math.max(0.3, rp.agitation - dt * 0.3);
      st.stepT -= dt; if (rp.speed > 0.6 && st.stepT <= 0) { st.stepT = st.retreat > 0 ? 0.16 : 0.42; A.claws(rp.root.position.clone().setY(0.1), 2, st.retreat > 0 ? 1 : 0.7); }
      st.breathT -= dt; if (st.d < 6 && st.breathT <= 0) { st.breathT = R(2.2, 3.2); A.breath(head, clamp(1.4 - st.d / 6, 0.3, 1.2)); }
      if (!st.called && st.d < 6.5 && st.retreat <= 0) { st.called = true; A.say('Hallo?', { pitch: 0.25, rate: 0.6, vol: 0.9 }); }
      S.tension = Math.max(S.tension, clamp(1.1 - st.d / 10, 0.5, 1));
      if (st.d < 1.25) die('raptor');
      if (P.pos.x > BX - 1.5) { st.d = Math.max(st.d, 5); }
    }

    // ---------- Die Große im Wintergarten (Runde 7) ----------
    const rs = S.rex, rex = dinos.rex;
    if (rs && mode === 'play') {
      const WP = [[13, -8], [20, -7.5], [26, -9.5], [28, -15], [24, -20], [19.5, -24], [12, -26.5], [9, -21], [13.5, -15.5], [22, -14]];
      const rp2 = rex.root.position, toP = new V3(P.pos.x - rp2.x, 0, P.pos.z - rp2.z), dist = toP.length();
      const vis = rexSees(rex);
      let rate = 0;
      if (vis > 0) rate = 0.38 * vis * (P.lamp ? 3.2 : 1) * (P.moving > 2 ? 2 : 1) * (P.crouch ? 0.4 : 1) * (P.moving < 0.2 ? 0.5 : 1);
      if (P.moving > 2.5 && dist < 16) rate += 0.35; else if (P.moving > 0.6 && !P.crouch && dist < 7) rate += 0.12;
      if (rs.state !== 'chase') rs.m = clamp(rs.m + (rate > 0 ? rate : -0.1) * dt, 0, 1);
      let target = null, spd = 1.5;
      if (rs.state === 'patrol') {
        const w = WP[rs.wp]; target = new V3(w[0], 0, w[1]);
        if (rs.pause > 0) { rs.pause -= dt; target = null; rex.lookAt = rex.head.getWorldPosition(new V3()).add(new V3(Math.sin(gtime) * 3, -4, 3)); }
        else if (rp2.distanceTo(target) < 1.2) { rs.wp = (rs.wp + 1) % WP.length; if (Math.random() < 0.45) { rs.pause = R(2, 4.5); A.breath(rex.head.getWorldPosition(new V3()), 1, true); } }
        else rex.lookAt = null;
        if (rs.m > 0.5) { rs.state = 'search'; rs.last.copy(P.pos); A.growl(rex.head.getWorldPosition(new V3()), 2.4, 1, true); S.tension = 0.95; }
      } else if (rs.state === 'search') {
        if (vis > 0 || rate > 0.2) rs.last.copy(P.pos);
        target = rs.last.clone(); spd = 2.2; rex.lookAt = new V3(rs.last.x, 1, rs.last.z);
        if (rp2.distanceTo(target) < 3) { rs.t += dt; target = null; if (rs.t > 4) { rs.state = 'patrol'; rs.t = 0; rs.m = 0.3; } }
        if (rs.m >= 1) { rs.state = 'roar'; rs.t = 0; A.roar(rex.head.getWorldPosition(new V3()), 1.1); S.shake = 0.6; rex.jawOpen = 1; }
        if (rs.m < 0.25) { rs.state = 'patrol'; }
      } else if (rs.state === 'roar') {
        rs.t += dt; rex.lookAt = cam.position; target = null; if (rs.t > 1.8) { rs.state = 'chase'; rex.jawOpen = 0.4; rs.lost = 0; }
      } else if (rs.state === 'chase') {
        const hidden = vis === 0 && P.crouch && !P.lamp;
        rs.lost = hidden ? rs.lost + dt : 0;
        if (!hidden) rs.last.copy(P.pos);
        target = rs.last.clone(); spd = 5.6; rex.lookAt = cam.position;
        if (rs.lost > 3) { rs.state = 'search'; rs.m = 0.7; rs.t = 0; rex.jawOpen = 0; }
        if (dist < 3.4) die('rex');
      }
      rex.jawOpen = rs.state === 'roar' ? 1 : Math.max(0, rex.jawOpen - dt * 0.5);
      if (target) {
        const d = target.clone().sub(rp2); d.y = 0; const l = d.length();
        if (l > 0.3) { d.normalize(); const ty = Math.atan2(d.x, d.z); let dy = ty - rex.root.rotation.y; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU; rex.root.rotation.y += clamp(dy, -dt * 1.4, dt * 1.4); const fw = new V3(Math.sin(rex.root.rotation.y), 0, Math.cos(rex.root.rotation.y)); const s2 = spd * Math.max(0.2, Math.cos(dy)); rp2.addScaledVector(fw, s2 * dt); rex.speed = s2; }
        else rex.speed = 0;
      } else rex.speed = Math.max(0, rex.speed - dt * 3);
      rs.stepT -= dt;
      if (rex.speed > 0.3 && rs.stepT <= 0) { rs.stepT = clamp(1.1 / (rex.speed * 0.6 + 0.4), 0.35, 1.2); A.step('tile', 3.5, rp2.clone().setY(0.2)); S.shake = Math.max(S.shake, clamp(0.5 - dist / 30, 0, 0.4)); }
      rs.breathT -= dt; if (rs.breathT <= 0 && dist < 18) { rs.breathT = R(4, 7); A.breath(rex.head.getWorldPosition(new V3()), 1, true); }
      S.tension = Math.max(S.tension, clamp(0.6 + rs.m * 0.4 + (1 - dist / 25) * 0.3, 0.55, 1));
    }

    // Dinos animieren
    for (const k in dinos) { const d = dinos[k]; if (d && d.root.visible) { if (d.lunge > 0) { d.lunge -= dt; const f = new V3(Math.sin(d.root.rotation.y), 0, Math.cos(d.root.rotation.y)); d.root.position.addScaledVector(f, dt * (d.rex ? 3 : 0.8)); } d.update(dt); d.eyeshine(cam.position, fwd, flash.intensity > 15, k === 'rex' ? bk * 2 : 0); } }

    // Stimmung
    if (!S.stalker && !S.rex && mode === 'play') S.tension = Math.max(0.12 + loopN * 0.06, S.tension - dt * 0.05);
    S.fear += (S.tension * (mode === 'play' || mode === 'dying' ? 1 : 0.3) - S.fear) * Math.min(1, dt * 1.5);
    S.shake = Math.max(0, S.shake - dt * 1.4);
    const nearWin = P.pos.x > -1.3 && P.pos.x < 2 && P.pos.z < 0 ? clamp(1 - Math.abs(P.pos.z - (WIN[0] + WIN[1]) / 2) / 7, 0.15, 1) : 0.2;
    const inAt = P.pos.x > BX;
    A.mood(S.fear, inAt ? 1 : nearWin * (loopN === 7 && P.pos.x > 2 ? 1 : 1), S.power && !inAt, !inAt);
    A.heartbeat(60 + S.fear * 70, S.fear > 0.5 ? (S.fear - 0.5) * 1.6 : 0);
    A.listener(cam.position, fwd, camUp);
    A.tick(dt);
    // Bildschirm
    S.fade += clamp(S.fadeTarget - S.fade, -dt * S.fadeSpeed, dt * S.fadeSpeed);
    const u = post.comp.uniforms; u.time.value = gtime; u.fear.value = S.fear; u.fade.value = S.fade; u.red.value = S.red; u.shake.value = S.shake;
    u.exposure.value = P.inAtrium || inAt ? 1.8 : 1.45;
    scene.fog.density = inAt ? 0.045 : 0.085;
    // Hinweise
    const it = playing ? aimItem() : null;
    q('.hr-hint').textContent = it ? 'A  ' + it.label : ''; q('.hr-hint').style.opacity = it ? 0.9 : 0; q('.hr-dot').style.opacity = playing ? (it ? 0.8 : 0.25) : 0;
    if (S.help > 0) { S.help -= dt; q('.hr-help').innerHTML = 'Laufen: Kreis auf dem Handy · Umsehen: Handy drehen<br>A / Benutzen: Türen, Notizen · Lampe: Taschenlampe<br>Laptop: W A S D, Maus, E, F, Umschalt, C'; q('.hr-help').style.opacity = S.help > 1 ? 1 : S.help; } else q('.hr-help').style.opacity = 0;
  }

  // ---------- Start ----------
  setTimeout(() => {
    if (closed) return;
    try {
      M = materials();
      atrium = buildAtrium(); scene.add(atrium.group);
      rain = makeRain(5000, { x0: AT.bx0, x1: AT.x1, z0: AT.z0, z1: AT.z1, h: AT.h }); scene.add(rain);
      dust = makeDust(700); scene.add(dust);
      dinos.raptor = makeDino('raptor'); scene.add(dinos.raptor.root); dinos.raptor.root.visible = false;
      dinos.rex = makeDino('rex'); scene.add(dinos.rex.root); dinos.rex.root.visible = false;
      A = makeAudio();
      resize(); title();
      // Shader vorab kompilieren, damit der erste Schreck nicht ruckelt
      dinos.raptor.root.visible = dinos.rex.root.visible = true; renderer.compile(scene, cam); dinos.raptor.root.visible = dinos.rex.root.visible = false;
      window.__hr = { get t() { return gtime; }, get loop() { return loopN; }, get endLocked() { return endLocked; }, get note() { return note; }, lightning, P, S, dinos, startLoop, die, get mode() { return mode; }, cam, scene, renderer, items: () => items, button, aim: () => { const a = aimItem(); return a ? a.label : null; } };
    } catch (e) { console.error(e); q('.hr-menu').innerHTML = '<h2>Fehler beim Laden: ' + e.message + '</h2>'; }
  }, 50);

  return {
    onFrame(dt) {
      if (closed || !A) return;
      if (paused) return;
      dt = Math.min(dt, 0.05);
      update(dt); post.render();
    },
    onButton(name, down) {
      if (mode === 'play') return button(name, down);
      if (name === 'B' && (mode === 'trans' || mode === 'dying' || mode === 'load')) return true;
      return false;
    },
    onData(d) {
      if (d.t === 'mv') { IN.mx = d.x; IN.my = d.y; IN.mvT = performance.now(); return true; }
      if (d.t === 'lk') { if (mode === 'play' && !note) { P.yaw -= d.x * Math.PI / 180 * 1.25; P.pitch = clamp(P.pitch - d.y * Math.PI / 180 * 1.25, -1.3, 1.3); } return true; }
      if (d.t === 'm' && mode === 'play') return true;
      return false;
    },
    onPause(p) { paused = p; if (A) { if (p) { A.hush(); A.duck(0.15); } else A.duck(1); } if (p && document.exitPointerLock) try { document.exitPointerLock(); } catch (e) {} },
    onRemotes() { if (mode === 'play') phones('play'); },
    close() {
      closed = true; gen++;
      removeEventListener('resize', resize); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('mousemove', mm);
      if (document.exitPointerLock) try { document.exitPointerLock(); } catch (e) {}
      if (A) A.stop(); if (cursorEl) cursorEl.style.visibility = '';
      K.send({ t: 'mode', m: 'pointer' });
      post.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {}
    },
  };
}
