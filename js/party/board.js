// Insel-Party: Brettspiel für 1 bis 4 Spieler (Rest Computer). Würfeln durch Schütteln, Münzen, Trophäen, Minispiele.
import * as THREE from '../../lib/three.module.min.js';
import { CREATURES, makeCreature, creaturePortraits, toon, outline } from './creatures.js';
import { GAMES, runMinigame } from './minigames.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
export const PCOL = ['#1b9fd6', '#e5242f', '#2eaa4f', '#f0a500'];
const PNAME = ['Blau', 'Rot', 'Grün', 'Gelb'];
const TROPHY_PRICE = 20;
const ITEMS = {
  double: { name: 'Doppelwürfel', price: 10, desc: 'Zwei Würfel auf einmal' },
  triple: { name: 'Dreifachwürfel', price: 15, desc: 'Drei Würfel auf einmal' },
  steal: { name: 'Klauhand', price: 15, desc: 'Stibitzt einem Mitspieler Münzen' },
  compass: { name: 'Kompassmuschel', price: 20, desc: 'Bringt dich direkt vor die Trophäe' },
  swap: { name: 'Tauschmuschel', price: 10, desc: 'Tauscht den Platz mit einem Mitspieler' },
  trap: { name: 'Fallennetz', price: 10, desc: 'Wer hier landet, zahlt dir 10 Münzen' },
};
const SPACE = {
  blue: { col: '#2f8fe8', label: 'Plus' }, red: { col: '#e8434a', label: 'Minus' }, event: { col: '#36b85a', label: 'Ereignis' },
  shop: { col: '#9b59d0', label: 'Laden' }, duel: { col: '#f07c2a', label: 'Duell' }, lucky: { col: '#f4c430', label: 'Glück' },
  bad: { col: '#3a3350', label: 'Pech' }, start: { col: '#2f8fe8', label: 'Start' },
};

// ---------- Inselform und Gelände ----------
const BAY = 1.57;
function islandR(th) { const d = wrapA(th - BAY); return 60 + 5 * Math.sin(3 * th + 0.5) + 3.5 * Math.cos(5 * th) - 26 * Math.exp(-(((d / 0.36)) ** 2)); }
function noise2(x, z) { return Math.sin(x * 0.21 + Math.cos(z * 0.17) * 2) * 0.5 + Math.sin(z * 0.23 + x * 0.05) * 0.5; }
function heightAt(x, z) {
  const d = Math.hypot(x, z), th = Math.atan2(z, x), R = islandR(th), t = d - R;
  if (t > 0) return 0.25 - Math.min(t, 16) * 0.32;
  let h = t > -11 ? 0.25 + (-t) / 11 * 0.9 : 1.15 + clamp((-t - 11) / 8, 0, 1) * (0.35 + noise2(x, z) * 0.3);
  h += 13 * Math.exp(-(((d / 15)) ** 2)) - 3.5 * Math.exp(-(((d / 3.6)) ** 2));
  return h;
}

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function iconTex(type) {
  return canvasTex(128, 128, (c) => {
    const S = SPACE[type] || SPACE.blue; c.fillStyle = S.col; c.beginPath(); c.arc(64, 64, 62, 0, TAU); c.fill();
    const g = c.createRadialGradient(46, 40, 6, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 54, 0, TAU); c.stroke();
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
    const bar = (x, y, w, h) => { c.beginPath(); c.roundRect(x, y, w, h, 6); c.fill(); };
    if (type === 'blue' || type === 'start') { bar(52, 30, 24, 68); bar(30, 52, 68, 24); }
    else if (type === 'red') bar(30, 52, 68, 24);
    else if (type === 'event') { c.font = '900 84px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 64, 70); }
    else if (type === 'shop') { c.beginPath(); c.roundRect(34, 48, 60, 50, 10); c.fill(); c.lineWidth = 8; c.beginPath(); c.arc(64, 48, 16, Math.PI, 0); c.stroke(); }
    else if (type === 'duel') { c.lineWidth = 12; c.beginPath(); c.moveTo(34, 34); c.lineTo(94, 94); c.moveTo(94, 34); c.lineTo(34, 94); c.stroke(); }
    else if (type === 'lucky') { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; c.beginPath(); c.arc(64 + Math.cos(a) * 17, 64 + Math.sin(a) * 17, 17, 0, TAU); c.fill(); } }
    else if (type === 'bad') { c.beginPath(); c.arc(50, 60, 18, 0, TAU); c.arc(74, 56, 22, 0, TAU); c.arc(90, 66, 14, 0, TAU); c.fill(); c.fillStyle = '#ffd23d'; c.beginPath(); c.moveTo(66, 74); c.lineTo(56, 98); c.lineTo(68, 94); c.lineTo(62, 114); c.lineTo(80, 86); c.lineTo(68, 88); c.lineTo(74, 74); c.fill(); }
  });
}

// ---------- Welt ----------
function buildWorld(scene) {
  const W = { anim: [], nodes: [] };
  // Himmel
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: {},
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vp; void main(){ float h = clamp(vp.y*1.4,0.,1.); vec3 c = mix(vec3(1.,.9,.74), vec3(.28,.62,.98), pow(h,.6)); gl_FragColor = vec4(c,1.); }' });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), skyMat));
  const sun = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({ color: '#fff4c2', fog: false })); sun.position.set(-300, 260, -560); sun.lookAt(0, 0, 0); scene.add(sun);
  scene.fog = new THREE.Fog('#bfe3ff', 160, 700);
  // Licht
  scene.add(new THREE.HemisphereLight('#fff6e0', '#4c8a6a', 1.25));
  const dl = new THREE.DirectionalLight('#fff1d6', 2.0); dl.position.set(-60, 110, 50); dl.castShadow = true;
  dl.shadow.mapSize.set(2048, 2048); Object.assign(dl.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 300 }); dl.shadow.bias = -0.0008; dl.shadow.normalBias = 0.05;
  scene.add(dl);
  // Gelände
  const RINGS = 70, SEG = 160, pos = [], col = [], idx = [];
  const cGrass = new THREE.Color('#6fc24f'), cGrass2 = new THREE.Color('#4ea93e'), cSand = new THREE.Color('#f6dfa6'), cWet = new THREE.Color('#d9bf86'), cDeep = new THREE.Color('#7fd7d0'), cRock = new THREE.Color('#8a7d6e');
  for (let r = 0; r <= RINGS; r++) for (let s = 0; s < SEG; s++) {
    const th = s / SEG * TAU, R = islandR(th), rr = (r / RINGS) ** 1.25 * (R + 18);
    const x = Math.cos(th) * rr, z = Math.sin(th) * rr, h = heightAt(x, z), d = rr - R;
    pos.push(x, h, z);
    let c;
    if (d > 0.5) c = cWet.clone().lerp(cDeep, clamp(d / 10, 0, 1));
    else if (d > -1.2) c = cWet.clone();
    else if (d > -11) c = cSand.clone().lerp(new THREE.Color('#fbe9bb'), noise2(x * 3, z * 3) * 0.3 + 0.3);
    else c = cGrass.clone().lerp(cGrass2, clamp(noise2(x * 0.8, z * 0.8) * 0.5 + 0.5, 0, 1));
    if (h > 6) c.lerp(cRock, clamp((h - 6) / 4, 0, 1));
    col.push(c.r, c.g, c.b);
  }
  for (let r = 0; r < RINGS; r++) for (let s = 0; s < SEG; s++) { const a = r * SEG + s, b = r * SEG + (s + 1) % SEG, c2 = a + SEG, d2 = b + SEG; idx.push(a, b, c2, b, d2, c2); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); tg.setIndex(idx); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true })); terrain.receiveShadow = true; scene.add(terrain);
  // Meeresgrund
  const floor = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshLambertMaterial({ color: '#3fb7c8' })); floor.rotation.x = -Math.PI / 2; floor.position.y = -5; scene.add(floor);
  // Wasser mit Wellen
  const wg = new THREE.PlaneGeometry(700, 700, 110, 110); wg.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wg, new THREE.MeshPhongMaterial({ color: '#29b6d8', transparent: true, opacity: 0.78, shininess: 90, specular: '#e8fbff' }));
  water.position.y = 0.05; scene.add(water);
  const wpos = wg.attributes.position, base = Float32Array.from(wpos.array);
  W.anim.push(t => {
    for (let i = 0; i < wpos.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; wpos.array[i * 3 + 1] = Math.sin(x * 0.08 + t * 1.2) * 0.18 + Math.cos(z * 0.1 + t * 0.9) * 0.16; }
    wpos.needsUpdate = true; wg.computeVertexNormals();
  });
  // Schaumring an der Küste
  const foamPts = []; for (let s = 0; s <= 200; s++) { const th = s / 200 * TAU, R = islandR(th) + 0.6; foamPts.push(new THREE.Vector3(Math.cos(th) * R, 0.2, Math.sin(th) * R)); }
  const foam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(foamPts, true), 300, 0.35, 5, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 }));
  scene.add(foam); W.anim.push(t => { foam.material.opacity = 0.5 + Math.sin(t * 1.6) * 0.25; foam.scale.setScalar(1 + Math.sin(t * 1.6) * 0.006); });

  // Deko-Helfer
  const inst = (geo, mat, list, f, shadow = true) => { const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(); list.forEach((p, i) => { o.position.set(p[0], heightAt(p[0], p[1]), p[1]); o.rotation.set(0, Math.random() * TAU, 0); o.scale.setScalar(1); f && f(o, i, p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m; };
  W.inst = inst;
  return W;
}

// ---------- Spielbrett-Graph ----------
function buildBoard(scene, W) {
  const nodes = [];
  const pathR = th => islandR(th) - 8.5;
  // Hauptschleife
  const samples = []; for (let i = 0; i <= 2000; i++) { const th = i / 2000 * TAU, r = pathR(th); samples.push([Math.cos(th) * r, Math.sin(th) * r, th]); }
  let L = 0; const acc = [0]; for (let i = 1; i < samples.length; i++) { L += Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]); acc.push(L); }
  const M = 46;
  for (let k = 0; k < M; k++) { const target = k / M * L; let i = acc.findIndex(a => a >= target); if (i < 0) i = 0; const s = samples[i]; nodes.push({ id: k, x: s[0], z: s[1], th: s[2], next: [(k + 1) % M], prev: [], type: 'blue', main: true }); }
  const nearestMain = th => { let b = 0, bd = 9; nodes.forEach((n, i) => { const d = Math.abs(wrapA(n.th - th)); if (d < bd) { bd = d; b = i; } }); return b; };
  // Abzweig 1: Holzsteg über die Bucht (kurz, riskant)
  const a1 = nearestMain(BAY - 0.62), b1 = nearestMain(BAY + 0.62);
  const branch = (from, to, ctrl, types, kind) => {
    const A = nodes[from], B = nodes[to], len = Math.hypot(B.x - A.x, B.z - A.z) * (ctrl ? 1.25 : 1), n = types.length, ids = [];
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1); let x, z;
      if (ctrl) { x = (1 - t) ** 2 * A.x + 2 * (1 - t) * t * ctrl[0] + t * t * B.x; z = (1 - t) ** 2 * A.z + 2 * (1 - t) * t * ctrl[1] + t * t * B.z; }
      else { x = lerp(A.x, B.x, t); z = lerp(A.z, B.z, t); }
      const id = nodes.length; nodes.push({ id, x, z, next: [], prev: [], type: types[i - 1], kind }); ids.push(id);
    }
    void len;
    A.next.push(ids[0]); ids.forEach((id, i) => nodes[id].next.push(i < ids.length - 1 ? ids[i + 1] : to));
    return ids;
  };
  const bridgeIds = branch(a1, b1, null, ['red', 'event', 'blue', 'bad', 'red'], 'bridge');
  // Abzweig 2: Dschungelpfad ins Inselinnere
  const JT = BAY + Math.PI, a2 = nearestMain(JT - 0.5), b2 = nearestMain(JT + 0.5);
  const jc = [Math.cos(JT) * 26, Math.sin(JT) * 26];
  const jungleIds = branch(a2, b2, jc, ['event', 'blue', 'shop', 'lucky', 'event', 'blue', 'duel'], 'jungle');
  nodes.forEach(n => n.next.forEach(j => nodes[j].prev.push(n.id)));
  // Feldtypen auf der Hauptschleife
  const pattern = ['blue', 'blue', 'red', 'blue', 'event', 'blue', 'blue', 'lucky', 'blue', 'red', 'blue', 'event', 'blue', 'duel', 'blue', 'blue', 'red', 'event', 'blue', 'shop', 'blue', 'bad', 'blue', 'event'];
  for (let k = 1; k < M; k++) nodes[k].type = pattern[(k * 7) % pattern.length];
  nodes[0].type = 'start'; nodes[3].type = 'shop'; nodes[a1].type = 'blue'; nodes[b1].type = 'blue'; nodes[a2].type = 'blue'; nodes[b2].type = 'blue';
  nodes.forEach(n => { n.y = n.kind === 'bridge' ? 0.9 : heightAt(n.x, n.z) + 0.05; });
  // Trophäen-Plätze
  const tro = [Math.floor(M * 0.2), Math.floor(M * 0.42), Math.floor(M * 0.62), Math.floor(M * 0.85), jungleIds[3], Math.floor(M * 0.05) + 5].filter(i => nodes[i] && ![a1, b1, a2, b2].includes(i));
  tro.forEach(i => { nodes[i].type = 'blue'; nodes[i].trophySpot = true; });

  // Darstellung der Felder
  const discGeo = new THREE.CylinderGeometry(1.55, 1.7, 0.4, 28), topGeo = new THREE.CircleGeometry(1.4, 28);
  const texCache = {};
  nodes.forEach(n => {
    const g = new THREE.Group(); g.position.set(n.x, n.y, n.z);
    const S = SPACE[n.type];
    const body = new THREE.Mesh(discGeo, toon(new THREE.Color(S.col).multiplyScalar(0.75))); body.position.y = 0.15; body.castShadow = true; body.receiveShadow = true; g.add(body);
    texCache[n.type] = texCache[n.type] || iconTex(n.type);
    const top = new THREE.Mesh(topGeo, new THREE.MeshBasicMaterial({ map: texCache[n.type] })); top.rotation.x = -Math.PI / 2; top.position.y = 0.36; g.add(top);
    n.mesh = g; n.top = top; scene.add(g);
  });
  // Verbindungen: Trittsteine bzw. Holzplanken
  const stones = [], planks = [];
  nodes.forEach(n => n.next.forEach(j => {
    const m = nodes[j], dx = m.x - n.x, dz = m.z - n.z, d = Math.hypot(dx, dz), steps = Math.max(1, Math.round(d / 1.6) - 2);
    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1), x = n.x + dx * t, z = n.z + dz * t;
      if (n.kind === 'bridge' || m.kind === 'bridge') planks.push([x, z, Math.atan2(dx, dz)]); else stones.push([x, z, Math.atan2(dx, dz)]);
    }
  }));
  W.inst(new THREE.CylinderGeometry(0.45, 0.5, 0.18, 10), toon('#fff3d6'), stones, (o, i, p) => { o.position.y += 0.06; o.rotation.y = p[2]; o.scale.set(1, 1, 0.8); }, false);
  // Steg
  const bA = nodes[a1], bB = nodes[b1], blen = Math.hypot(bB.x - bA.x, bB.z - bA.z), bang = Math.atan2(bB.x - bA.x, bB.z - bA.z);
  const deck = new THREE.Group(); deck.position.set((bA.x + bB.x) / 2, 0, (bA.z + bB.z) / 2); deck.rotation.y = bang; scene.add(deck);
  const plankM = toon('#b07a45'), postM = toon('#7a4f2a');
  const nP = Math.floor(blen / 1.1);
  for (let i = 0; i < nP; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 0.95), i % 2 ? plankM : toon('#c48a52')); p.position.set(0, 0.62, -blen / 2 + i * 1.1 + 0.5); p.castShadow = p.receiveShadow = true; deck.add(p); }
  for (let i = 0; i <= nP; i += 4) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.4, 8), postM); p.position.set(s * 2.2, 0.2, -blen / 2 + i * 1.1); p.castShadow = true; deck.add(p); }
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, blen), postM); r.position.set(s * 2.2, 1.85, 0); deck.add(r); }
  void planks;
  return { nodes, M, trophySpots: tro, junctions: { [a1]: ['Strand', 'Holzsteg (kurz, gefährlich)'], [a2]: ['Strand', 'Dschungelpfad'] } };
}

function decorate(scene, W, B) {
  const nodes = B.nodes;
  const nearPath = (x, z, r) => nodes.some(n => (n.x - x) ** 2 + (n.z - z) ** 2 < r * r);
  const spots = (n, test) => { const out = []; let t = 0; while (out.length < n && t++ < n * 60) { const a = Math.random() * TAU, d = Math.random() * 75, x = Math.cos(a) * d, z = Math.sin(a) * d; if (test(x, z, heightAt(x, z), d, a)) out.push([x, z]); } return out; };
  // Palmen
  const palmSpots = spots(70, (x, z, h, d, a) => h > 0.4 && h < 5 && !nearPath(x, z, 3.2) && d > 12);
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 1.4, 7);
  const leafGeo = (() => { const g = new THREE.PlaneGeometry(1.2, 5.2, 1, 8); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 2.6; p.setZ(i, -((y / 5.2) ** 2) * 2.2); p.setX(i, p.getX(i) * Math.sin(Math.PI * clamp(y / 5.2, 0.05, 1))); p.setY(i, y); } g.rotateX(-Math.PI / 2 + 0.25); g.computeVertexNormals(); return g; })();
  const trunkM = toon('#9a6b3c'), leafM = toon('#3fae4a', { side: THREE.DoubleSide }), leafM2 = toon('#5cc957', { side: THREE.DoubleSide }), cocoM = toon('#6b4423');
  const palmGroup = new THREE.Group(); scene.add(palmGroup);
  palmSpots.forEach(([x, z], pi) => {
    const p = new THREE.Group(); p.position.set(x, heightAt(x, z) - 0.1, z); p.rotation.y = Math.random() * TAU; const lean = rnd(0.08, 0.22), sc = rnd(0.85, 1.25);
    let px = 0, py = 0; for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(trunkGeo, trunkM); s.position.set(px, py + 0.7, 0); s.rotation.z = -lean * (i / 6); s.scale.setScalar(1 - i * 0.05); s.castShadow = true; p.add(s); py += 1.3; px += lean * i * 0.35; }
    for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(leafGeo, i % 2 ? leafM : leafM2); l.position.set(px, py + 0.4, 0); l.rotation.y = i / 8 * TAU + rnd(-0.2, 0.2); l.castShadow = true; p.add(l); }
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), cocoM); c.position.set(px + Math.cos(i * 2.1) * 0.4, py + 0.1, Math.sin(i * 2.1) * 0.4); p.add(c); }
    p.scale.setScalar(sc); palmGroup.add(p);
    W.anim.push(t => { p.rotation.z = Math.sin(t * 0.9 + pi) * 0.02; });
  });
  // Laubbäume und Büsche im Inneren (Dschungel)
  const treeSpots = spots(80, (x, z, h, d) => h > 1.1 && h < 7 && !nearPath(x, z, 3.2) && d < 48);
  W.inst(new THREE.CylinderGeometry(0.35, 0.5, 3, 7).translate(0, 1.5, 0), toon('#7a5230'), treeSpots, (o) => o.scale.setScalar(rnd(0.9, 1.4)));
  W.inst(new THREE.IcosahedronGeometry(2.2, 1).translate(0, 4, 0), toon('#2f9a45'), treeSpots, (o) => o.scale.setScalar(rnd(0.9, 1.4)));
  const bushSpots = spots(140, (x, z, h) => h > 1 && h < 6 && !nearPath(x, z, 2.4));
  const bush = W.inst(new THREE.IcosahedronGeometry(0.9, 1).translate(0, 0.5, 0), toon('#ffffff'), bushSpots, (o) => o.scale.set(rnd(0.8, 1.6), rnd(0.6, 1), rnd(0.8, 1.6)));
  bushSpots.forEach((_, i) => bush.setColorAt(i, new THREE.Color(pick(['#3f9e3f', '#56b84a', '#2f8a3a']))));
  // Blumen
  const fl = spots(260, (x, z, h) => h > 1.1 && h < 5 && !nearPath(x, z, 1.8));
  const fm = W.inst(new THREE.SphereGeometry(0.22, 6, 4).translate(0, 0.25, 0), toon('#ffffff'), fl, null, false);
  fl.forEach((_, i) => fm.setColorAt(i, new THREE.Color(pick(['#ff6fa8', '#ffe14d', '#ffffff', '#b98bff', '#ff8a3d'])))); fm.instanceColor.needsUpdate = true;
  // Felsen
  const rockSpots = spots(40, (x, z, h, d) => !nearPath(x, z, 3) && h < 1.2 && h > -2);
  W.inst(new THREE.DodecahedronGeometry(1.2, 0), toon('#a59a8c'), rockSpots, (o) => { o.scale.set(rnd(0.7, 2), rnd(0.5, 1.2), rnd(0.7, 2)); o.rotation.x = Math.random(); });
  // Seesterne und Muscheln
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 0.18 : 0.45; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const sg = new THREE.ExtrudeGeometry(star, { depth: 0.08, bevelEnabled: false }).rotateX(-Math.PI / 2);
  const ss = spots(30, (x, z, h) => h > 0.2 && h < 0.9 && !nearPath(x, z, 1.8));
  const sm = W.inst(sg, toon('#ffffff'), ss, (o) => o.position.y += 0.05, false); ss.forEach((_, i) => sm.setColorAt(i, new THREE.Color(pick(['#ff7b54', '#ff5fa2', '#ffb347'])))); sm.instanceColor.needsUpdate = true;
  // Strandhütten
  const hutAt = (th, off) => { const R = islandR(th) - off; return [Math.cos(th) * R, Math.sin(th) * R]; };
  [[0.35, 15], [2.6, 16], [4.0, 15], [5.6, 14]].forEach(([th, off]) => {
    const [x, z] = hutAt(th, off); if (nearPath(x, z, 4)) return;
    const h = new THREE.Group(); h.position.set(x, heightAt(x, z), z); h.rotation.y = -th + Math.PI / 2;
    for (const [px, pz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6), toon('#7a4f2a')); p.position.set(px, 0.6, pz); h.add(p); }
    const box = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2, 3.4), toon('#e8c48a')); box.position.y = 2.2; box.castShadow = true; outline(box, 1.03); h.add(box);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.4, 4), toon('#c9a24a')); roof.position.y = 4.4; roof.rotation.y = Math.PI / 4; roof.castShadow = true; outline(roof, 1.04); h.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), toon('#7a4f2a')); door.position.set(0, 1.9, 1.71); h.add(door);
    scene.add(h);
  });
  // Leuchtturm
  { const th = 0.9, R = islandR(th) + 2, x = Math.cos(th) * R, z = Math.sin(th) * R;
    const lh = new THREE.Group(); lh.position.set(x, -1, z);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(4, 0), toon('#9a8f80')); rock.scale.set(1.3, 0.6, 1.3); lh.add(rock);
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(1.5 - i * 0.12, 1.6 - i * 0.12, 2.2, 16), toon(i % 2 ? '#e8434a' : '#ffffff')); s.position.y = 2.5 + i * 2.2; s.castShadow = true; outline(s, 1.03); lh.add(s); }
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 12), new THREE.MeshBasicMaterial({ color: '#fff3a0' })); lamp.position.y = 14.1; lh.add(lamp);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.6, 12), toon('#e8434a')); cap.position.y = 15.6; outline(cap, 1.05); lh.add(cap);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(3, 26, 16, 1, true).rotateZ(Math.PI / 2).translate(13, 0, 0), new THREE.MeshBasicMaterial({ color: '#fff7c0', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 14.1; lh.add(beam);
    W.anim.push(t => { beam.rotation.y = t * 0.8; });
    scene.add(lh); }
  // Vulkan-Rauch
  const smokeM = new THREE.MeshLambertMaterial({ color: '#f2efe9', transparent: true, opacity: 0.7, depthWrite: false });
  const puffs = []; for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), smokeM.clone()); scene.add(p); puffs.push({ m: p, o: i / 9 }); }
  W.anim.push(t => puffs.forEach(p => { const k = (t * 0.12 + p.o) % 1; p.m.position.set(Math.sin(k * 5 + p.o * 9) * 1.5 + k * 6, 10 + k * 18, Math.cos(k * 4) * 1.2); p.m.scale.setScalar(0.6 + k * 2.4); p.m.material.opacity = 0.75 * (1 - k); }));
  // Segelboot
  { const boat = new THREE.Group(); const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.8, 1.2, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), toon('#ffffff')); hull.scale.set(1, 1, 3); boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 6), toon('#7a4f2a')); mast.position.y = 3; boat.add(mast);
    const sail = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.8, 0.2), new THREE.Vector3(0, 5.8, 0.2), new THREE.Vector3(0, 0.8, 3)]), toon('#ff6f61', { side: THREE.DoubleSide })); boat.add(sail);
    scene.add(boat); W.anim.push(t => { const a = t * 0.05; boat.position.set(Math.cos(a) * 92, Math.sin(t * 1.3) * 0.2, Math.sin(a) * 92); boat.rotation.y = -a; boat.rotation.z = Math.sin(t * 1.1) * 0.06; }); }
  // Wolken
  const cloudM = toon('#ffffff');
  for (let i = 0; i < 9; i++) { const c = new THREE.Group(); for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(rnd(3, 6), 12, 8), cloudM); s.position.set(k * 4 - 8, rnd(-1, 1.5), rnd(-2, 2)); c.add(s); } c.position.set(rnd(-200, 200), rnd(55, 90), rnd(-220, 60)); scene.add(c); const sp = rnd(0.5, 1.2); W.anim.push((t, dt) => { c.position.x += sp * dt; if (c.position.x > 240) c.position.x = -240; }); }
  // Sonnenschirme am Strand
  const um = spots(14, (x, z, h) => h > 0.3 && h < 0.9 && !nearPath(x, z, 3));
  um.forEach(([x, z], i) => { const g = new THREE.Group(); g.position.set(x, heightAt(x, z), z); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3, 6), toon('#ffffff')); pole.position.y = 1.5; g.add(pole); const top = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.8, 10), toon(pick(['#ff5f5f', '#4fa8ff', '#ffd23d', '#ff8fc0']))); top.position.y = 3; top.castShadow = true; outline(top, 1.04); g.add(top); const towel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), toon(pick(['#ffffff', '#ffb3c7', '#b3e5ff']))); towel.rotation.x = -Math.PI / 2; towel.position.set(1, 0.05, 0.6); g.add(towel); scene.add(g); });
}

// ---------- Trophäe ----------
function makeTrophy() {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.7, 0], [0.7, 0.18], [0.3, 0.3], [0.18, 0.8], [0.25, 1.0], [0.7, 1.25], [0.85, 1.9], [0.78, 1.95], [0.6, 1.4], [0, 1.25]].map(p => new THREE.Vector2(p[0], p[1]));
  const gold = new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: 0.85, roughness: 0.25, emissive: '#7a5200', emissiveIntensity: 0.35 });
  const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), gold); cup.castShadow = true; g.add(cup);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 8, 16, Math.PI * 1.2), gold); h.position.set(s * 0.82, 1.5, 0); h.rotation.z = s > 0 ? -0.9 : Math.PI + 0.9; g.add(h); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,150,.9)'); gr.addColorStop(1, 'rgba(255,220,80,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false }));
  glow.scale.set(5, 5, 1); glow.position.y = 1.2; g.add(glow);
  g.scale.setScalar(1.3);
  return g;
}

// ---------- Würfelkristall ----------
function makeDice() {
  const texs = []; for (let n = 1; n <= 10; n++) texs.push(canvasTex(128, 128, (c) => { const g = c.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dff3ff'); c.fillStyle = g; c.beginPath(); c.roundRect(4, 4, 120, 120, 26); c.fill(); c.strokeStyle = '#34bdef'; c.lineWidth = 8; c.stroke(); c.fillStyle = '#1b5fae'; c.font = '900 76px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 64, 70); }));
  const mat = new THREE.MeshBasicMaterial({ map: texs[0] });
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), mat); outline(m, 1.06);
  return { m, set(n) { mat.map = texs[n - 1]; mat.needsUpdate = true; } };
}
function numberSprite() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); sp.scale.set(2.6, 2.6, 1); sp.renderOrder = 10;
  return { sp, set(n, col = '#1b5fae') { c.clearRect(0, 0, 128, 128); c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 56, 0, TAU); c.fill(); c.strokeStyle = col; c.lineWidth = 10; c.stroke(); c.fillStyle = col; c.font = '900 72px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 64, 70); tex.needsUpdate = true; } };
}

const CSS = `.pt{position:absolute;inset:0;background:#7fd0f0;overflow:hidden;font-family:Nunito,sans-serif}.pt canvas{position:absolute;inset:0;width:100%;height:100%}
.pt-card{position:absolute;width:min(21vw,270px);background:rgba(255,255,255,.92);border-radius:22px;border:4px solid #fff;box-shadow:0 8px 22px rgba(0,0,0,.18);display:flex;gap:10px;align-items:center;padding:8px 12px 8px 8px;transition:transform .25s,box-shadow .25s}
.pt-card img{width:58px;height:58px;border-radius:16px;background:#fff6e0}.pt-card .nm{font-weight:900;font-size:17px;color:#3d4145;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pt-card .st{display:flex;gap:12px;font-weight:900;font-size:20px;color:#4c5054}
.pt-card .st span{display:flex;align-items:center;gap:4px}.pt-card .rk{position:absolute;top:-12px;right:-8px;width:34px;height:34px;border-radius:50%;background:#3d4145;color:#fff;font-weight:900;display:grid;place-items:center;font-size:17px;border:3px solid #fff}
.pt-card .it{font-size:12px;font-weight:800;color:#8a8f94;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pt-card.act{transform:scale(1.07);box-shadow:0 0 0 5px var(--c),0 10px 26px rgba(0,0,0,.25)}
.pt-c0{left:14px;top:14px}.pt-c1{right:14px;top:14px}.pt-c2{left:14px;bottom:14px}.pt-c3{right:14px;bottom:14px}
.ico-coin{width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3a0,#f2b705 60%,#c98a00);border:2px solid #a87300;display:inline-block}
.ico-tro{width:20px;height:20px;display:inline-block;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 3h12v5a6 6 0 0 1-12 0z' fill='%23f2b705' stroke='%23a87300'/%3E%3Cpath d='M6 5H3c0 3 1.5 4.5 3.5 5M18 5h3c0 3-1.5 4.5-3.5 5' stroke='%23a87300' fill='none' stroke-width='1.6'/%3E%3Crect x='10.5' y='13' width='3' height='4' fill='%23c98a00'/%3E%3Crect x='7' y='17' width='10' height='4' rx='1' fill='%238a5533'/%3E%3C/svg%3E")}
.pt-round{position:absolute;left:50%;top:14px;transform:translateX(-50%);background:rgba(255,255,255,.92);border-radius:999px;padding:8px 24px;font-weight:900;font-size:20px;color:#3d4145;box-shadow:0 6px 18px rgba(0,0,0,.15);border:4px solid #fff}
.pt-round.end{background:#ff6f61;color:#fff}
.pt-banner{position:absolute;left:0;right:0;top:36%;text-align:center;pointer-events:none;font-weight:900;font-size:clamp(40px,6.5vw,92px);color:#fff;text-shadow:0 5px 0 rgba(0,0,0,.25),0 0 30px rgba(0,0,0,.25);opacity:0;transform:scale(.6);transition:opacity .3s,transform .35s cubic-bezier(.2,1.6,.4,1)}
.pt-banner.on{opacity:1;transform:scale(1)}.pt-banner small{display:block;font-size:.38em;margin-top:6px}
.pt-dlg{position:absolute;left:50%;bottom:22px;transform:translate(-50%,140%);width:min(820px,60vw);background:#fffaf0;border-radius:26px;border:5px solid #f2b705;box-shadow:0 14px 40px rgba(0,0,0,.3);padding:18px 24px;transition:transform .35s cubic-bezier(.2,1.3,.4,1);text-align:center}
.pt-dlg.on{transform:translate(-50%,0)}.pt-dlg h3{margin:0 0 6px;font-size:24px;font-weight:900;color:#6b4a12}.pt-dlg p{margin:0 0 10px;font-weight:800;color:#7a5a2a;font-size:18px}
.pt-opts{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}.pt-opt{padding:12px 22px;border-radius:18px;border:4px solid #e9d6a6;background:#fff;font-weight:900;font-size:19px;color:#5c4314;transition:transform .12s,border-color .12s,box-shadow .12s}
.pt-opt.sel,.pt-opt.hover{border-color:#34bdef;box-shadow:0 0 0 4px rgba(52,189,239,.35);transform:scale(1.05)}.pt-opt small{display:block;font-size:13px;color:#9a7b45}
.pt-ov{position:absolute;inset:0;display:none;place-items:center;background:radial-gradient(circle at 50% 30%,#8fe0ff,#2a9fd6 55%,#1a6fb0)}.pt-ov.on{display:grid}.pt-ov.glass{background:rgba(10,40,70,.45)}
.pt-panel{background:#fffaf0;border-radius:32px;border:5px solid #fff;box-shadow:0 20px 60px rgba(0,0,0,.3);padding:24px 32px;width:min(1120px,94vw);max-height:93vh;overflow:auto;text-align:center;color:#5c4314}
.pt-panel h2{margin:0;font-size:clamp(34px,4.6vw,62px);font-weight:900;color:#ff7a3d;text-shadow:0 4px 0 #ffd9a8;letter-spacing:-.01em}.pt-panel h3{margin:14px 0 8px;font-size:22px;font-weight:900;color:#6b4a12}.pt-panel p{margin:6px 0;font-weight:800;color:#9a7b45}
.pt-row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:8px 0}
.pt-b{min-width:150px;padding:14px 22px;border-radius:20px;border:4px solid #e9d6a6;background:linear-gradient(#fff,#fff3dc);font-weight:900;font-size:21px;color:#5c4314;transition:transform .12s,border-color .12s,box-shadow .12s}.pt-b small{display:block;font-size:14px;color:#9a7b45}
.pt-b.sel{border-color:#ff7a3d;background:linear-gradient(#fff3e8,#ffd9b8)}.pt-b.big{min-width:240px;font-size:26px;padding:20px 28px}
.pt-b.hover,.pt-ch.hover{border-color:#34bdef;box-shadow:0 0 0 5px rgba(52,189,239,.35);transform:scale(1.05)}
.pt-chars{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:10px 0}
.pt-ch{position:relative;border-radius:22px;border:5px solid #f0e2c0;background:linear-gradient(#fff,#fff1d0);padding:6px;transition:transform .12s,border-color .12s,box-shadow .12s}.pt-ch img{width:100%;aspect-ratio:1;display:block}.pt-ch b{display:block;font-size:20px;font-weight:900;color:#5c4314}.pt-ch span{font-size:13px;font-weight:800;color:#9a7b45}
.pt-ch .tags{position:absolute;top:6px;left:6px;right:6px;display:flex;gap:4px;flex-wrap:wrap}.pt-ch .tags i{font-style:normal;font-weight:900;font-size:13px;color:#fff;border-radius:999px;padding:2px 8px}
.pt-ch.taken{opacity:.45}
.pt-slots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:12px 0}.pt-slot{border-radius:18px;padding:10px;font-weight:900;color:#fff}.pt-slot small{display:block;font-weight:800;opacity:.9}
.pt-qr{display:flex;gap:14px;align-items:center;justify-content:center;background:#fff3dc;border-radius:18px;padding:10px 14px;font-weight:800;text-align:left;color:#7a5a2a}.pt-qr .q{width:110px;height:110px}.pt-qr .q img{width:100%;height:100%;image-rendering:pixelated}
.pt-tbl{width:100%;border-collapse:collapse;font-weight:900;font-size:20px;margin:8px 0}.pt-tbl td{padding:6px 10px;border-bottom:2px solid #f0e2c0;text-align:left}.pt-tbl td.n{text-align:right}.pt-tbl img{width:44px;height:44px;vertical-align:middle;margin-right:8px}`;

function open(box, K) {
  if (!document.getElementById('pt-css')) { const s = document.createElement('style'); s.id = 'pt-css'; s.textContent = CSS; document.head.appendChild(s); }
  box.innerHTML = `<div class="pt"><canvas id="pt-gl"></canvas><canvas id="pt-hud"></canvas><div id="pt-cards"></div><div class="pt-round" id="pt-round" style="display:none"></div>
    <div class="pt-banner" id="pt-banner"></div><div class="pt-dlg" id="pt-dlg"><h3 id="pt-dh"></h3><p id="pt-dp"></p><div class="pt-opts" id="pt-do"></div></div>
    <div class="pt-ov on" id="pt-ov"><div class="pt-panel" id="pt-panel"></div></div></div>`;
  const q = s => box.querySelector(s);
  const glCv = q('#pt-gl'), hud = q('#pt-hud'), hc = hud.getContext('2d'), ov = q('#pt-ov'), panel = q('#pt-panel');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: glCv, antialias: true }); }
  catch (e) { panel.innerHTML = '<h2>Insel-Party</h2><p>WebGL ist in diesem Browser nicht verfügbar.</p><button class="hv pt-b" id="pt-x">Zurück</button>'; q('#pt-x').onclick = () => K.closeChannel(); return {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const portraits = creaturePortraits();
  let W = 1, H = 1, dpr = 1, alive = true, paused = false, view = null, time = 0;
  function resize() { W = box.clientWidth; H = box.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2); renderer.setSize(W, H, false); hud.width = W * dpr; hud.height = H * dpr; if (view && view.resize) view.resize(W, H); }

  // ---------- Eingabe pro Handy (Handy 1 = auch Tastatur/Maus) ----------
  const inp = {}; for (let p = 1; p <= 4; p++) inp[p] = { btn: {}, edges: [], shake: 0, shakeHit: 0, tx: 0, ty: 0, tT: 0 };
  const listeners = new Set();
  function pressEdge(p, name) { listeners.forEach(f => f(p, name)); }
  function phoneOf(pl) { return pl && pl.human ? pl.phone : 0; }
  function setPad(p, cfg) { if (p) K.sendTo(p, { t: 'mode', m: 'pad', cfg }); }
  function setPointer(p) { K.sendTo(p, { t: 'mode', m: 'pointer' }); }
  function waitEdge(p, names, extra) {
    return new Promise(res => { const f = (pp, n) => { if (pp === p && names.includes(n)) { listeners.delete(f); res(n); } }; listeners.add(f); if (extra) extra(res, () => listeners.delete(f)); });
  }
  const env = {
    THREE, renderer, box, K, portraits, PCOL, inp,
    setView(v) { view = v; if (v && v.resize) v.resize(W, H); },
    hud: () => ({ c: hc, W, H, dpr }),
    wait, setPad, alive: () => alive, paused: () => paused, onEdge(f) { listeners.add(f); return () => listeners.delete(f); },
    banner, makeCreature, CREATURES,
  };

  // ---------- Warten mit Pause ----------
  function wait(ms) { return new Promise((res, rej) => { let t = 0, last = performance.now(); const iv = setInterval(() => { const now = performance.now(); if (!alive) { clearInterval(iv); rej(new Error('closed')); return; } if (!paused) t += Math.min(250, now - last); last = now; if (t >= ms) { clearInterval(iv); res(); } }, 30); }); }

  // ---------- Banner und Dialog ----------
  let bannerT;
  function banner(text, sub = '', ms = 1600) { const b = q('#pt-banner'); b.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); b.classList.add('on'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('on'), ms); }
  function dialogHide() { q('#pt-dlg').classList.remove('on'); }
  // Frage an einen Spieler. Mensch: Handy-Tasten, Klick oder Tastatur. Computer: cpu() nach kurzer Pause.
  async function ask(pl, title, text, options, cpu) {
    const dlg = q('#pt-dlg'); q('#pt-dh').textContent = title; q('#pt-dp').textContent = text;
    const box2 = q('#pt-do'); box2.innerHTML = options.map((o, i) => `<button class="pt-opt${pl.human ? ' hv' : ''}" data-i="${i}">${esc(o.label || o)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`).join('');
    dlg.classList.add('on');
    if (!pl.human) {
      await wait(900); const i = cpu ? cpu() : 0; box2.children[i] && box2.children[i].classList.add('sel'); Sound.play('select'); await wait(700); dialogHide(); await wait(250); return i;
    }
    let sel = 0; const mark = () => [...box2.children].forEach((c, i) => c.classList.toggle('sel', i === sel)); mark();
    const p = pl.phone;
    setPad(p, { title, hint: text, buttons: options.slice(0, 6).map((o, i) => ({ b: 'O' + i, label: o.label || o, color: ['#1b9fd6', '#e5242f', '#2eaa4f', '#f0a500', '#9b59d0', '#5c6064'][i] })) });
    const r = await new Promise(res => {
      const f = (pp, n) => {
        if (pp !== p && !(p === 1 && pp === 1)) return;
        if (/^O\d$/.test(n)) { done(+n.slice(1)); }
        else if (n === 'LEFT' || n === 'UP') { sel = (sel - 1 + options.length) % options.length; mark(); Sound.play('hover'); }
        else if (n === 'RIGHT' || n === 'DOWN') { sel = (sel + 1) % options.length; mark(); Sound.play('hover'); }
        else if (n === 'A') done(sel);
      };
      const clicks = [...box2.children].map((c, i) => { const h = () => done(i); c.addEventListener('click', h); return h; });
      function done(i) { listeners.delete(f); res(i); }
      listeners.add(f); void clicks;
    });
    Sound.play('select'); dialogHide(); setIdle(pl); await wait(250); return r;
  }
  async function say(title, text, ms = 1800) { const dlg = q('#pt-dlg'); q('#pt-dh').textContent = title; q('#pt-dp').textContent = text; q('#pt-do').innerHTML = ''; dlg.classList.add('on'); await wait(ms); dialogHide(); await wait(200); }
  function setIdle(pl) { if (pl && pl.human) setPad(pl.phone, { title: 'Insel-Party', hint: 'Warte, bis du dran bist.' }); }
  function idleAll(except) { G && G.players.forEach(pl => { if (pl !== except) setIdle(pl); }); }

  // ---------- Setup ----------
  let G = null; // Spielzustand
  const setup = { humans: 1, rounds: 10, cpu: 1, picks: [], cur: [0, 1, 2, 3], ready: [false, false, false, false] };
  function screen(html) { ov.classList.add('on'); ov.classList.remove('glass'); panel.innerHTML = html; }
  function bind(sel, fn) { panel.querySelectorAll(sel).forEach(el => el.addEventListener('click', () => fn(el))); }
  function qrBlock() {
    const ps = K.players();
    return `<div class="pt-qr"><div class="q">${K.qrHTML()}</div><div>Weitere Handys koppeln: QR-Code scannen oder Code <b style="color:#ff7a3d;letter-spacing:.12em">${K.code()}</b> auf …/konsole/remote.html eingeben.<br>
      ${[1, 2, 3, 4].map(n => `<span style="color:${ps.includes(n) ? PCOL[n - 1] : '#c0ab80'}">Handy ${n} ${ps.includes(n) ? 'verbunden' : '–'}</span>`).join(' · ')}</div></div>`;
  }
  function showTitle() {
    G = null; K.send({ t: 'mode', m: 'pointer' }); Sound.music('party');
    const n = Math.max(1, K.players().length);
    if (setup.humans > Math.max(n, 1)) setup.humans = Math.max(n, 1);
    screen(`<h2>Insel-Party</h2><p>Würfeln, Münzen sammeln, Trophäen kaufen. Wer am Ende die meisten Trophäen hat, gewinnt.</p>
      <h3>Wie viele spielen mit?</h3><div class="pt-row">${[1, 2, 3, 4].map(k => `<button class="hv pt-b${k === setup.humans ? ' sel' : ''}" data-h="${k}" ${k > Math.max(n, 1) ? 'style="opacity:.45"' : ''}>${k} ${k === 1 ? 'Spieler' : 'Spieler'}<small>${4 - k} Computer</small></button>`).join('')}</div>
      <h3>Runden</h3><div class="pt-row">${[10, 15, 20].map(r => `<button class="hv pt-b${r === setup.rounds ? ' sel' : ''}" data-r="${r}">${r} Runden<small>ca. ${Math.round(r * 2.6)} Min.</small></button>`).join('')}</div>
      <h3>Computer-Stärke</h3><div class="pt-row">${['Leicht', 'Mittel', 'Schwer'].map((d, i) => `<button class="hv pt-b${i === setup.cpu ? ' sel' : ''}" data-c="${i}">${d}</button>`).join('')}</div>
      ${qrBlock()}
      <div class="pt-row" style="margin-top:14px"><button class="hv pt-b big" id="pt-go">Figuren wählen</button><button class="hv pt-b" id="pt-back">Zurück zum Menü</button></div>`);
    bind('[data-h]', el => { const k = +el.dataset.h; if (k > Math.max(K.players().length, 1)) { K.toast('Dafür braucht es ' + k + ' verbundene Handys'); return; } setup.humans = k; showTitle(); });
    bind('[data-r]', el => { setup.rounds = +el.dataset.r; showTitle(); });
    bind('[data-c]', el => { setup.cpu = +el.dataset.c; showTitle(); });
    bind('#pt-go', showChars);
    bind('#pt-back', () => K.closeChannel());
  }
  let charState = null;
  function showChars() {
    charState = 'chars'; setup.ready = [false, false, false, false]; setup.cur = [0, 1, 2, 3];
    for (let i = 0; i < setup.humans; i++) setPad(i + 1, { title: 'Figur wählen', hint: 'Mit dem Steuerkreuz wählen, A bestätigen, B zurück.', dpad: true, buttons: [{ b: 'A', label: 'Auswählen' }, { b: 'B', label: 'Zurück', color: '#9aa0a5' }] });
    if (setup.humans === 1 || !K.players().includes(1)) setPointer(1);
    drawChars();
  }
  function drawChars() {
    screen(`<h2>Wer spielt mit?</h2><p>Spieler wählen mit dem Steuerkreuz und A auf dem Handy. Spieler 1 kann auch zeigen und klicken.</p>
      <div class="pt-chars">${CREATURES.map((c, i) => { const tags = []; for (let p = 0; p < setup.humans; p++) if (setup.cur[p] === i) tags.push(`<i style="background:${PCOL[p]}">${setup.ready[p] ? 'S' + (p + 1) + ' bereit' : 'Spieler ' + (p + 1)}</i>`);
        const taken = setup.ready.some((r, p) => r && p < setup.humans && setup.cur[p] === i);
        return `<button class="hv pt-ch${taken ? ' taken' : ''}" data-i="${i}" style="${tags.length ? 'border-color:' + PCOL[setup.cur.findIndex((c2, p) => p < setup.humans && c2 === i)] : ''}"><div class="tags">${tags.join('')}</div><img src="${portraits[c.id]}" alt=""><b>${c.name}</b><span>${c.desc}</span></button>`; }).join('')}</div>
      <div class="pt-row"><button class="hv pt-b" id="pt-back">Zurück</button></div>`);
    bind('[data-i]', el => { if (setup.ready[0]) return; setup.cur[0] = +el.dataset.i; confirmChar(0); });
    bind('#pt-back', showTitle);
  }
  function confirmChar(p) {
    if (setup.ready.some((r, o) => r && o !== p && o < setup.humans && setup.cur[o] === setup.cur[p])) { Sound.play('buzz'); return; }
    setup.ready[p] = true; Sound.play('select'); drawChars();
    if (setup.ready.slice(0, setup.humans).every(Boolean)) { charState = null; setTimeout(startGame, 600); }
  }
  function charInput(p, n) {
    const i = p - 1; if (i >= setup.humans) return;
    if (n === 'B') { if (setup.ready[i]) { setup.ready[i] = false; drawChars(); } return; }
    if (setup.ready[i]) return;
    if (n === 'A') { if (p === 1 && document.querySelector('.pt-ch.hover')) return; confirmChar(i); return; }
    const d = { LEFT: -1, RIGHT: 1, UP: -4, DOWN: 4 }[n]; if (!d) return;
    setup.cur[i] = (setup.cur[i] + d + 8) % 8; Sound.play('hover'); drawChars();
  }

  // ---------- Spiel ----------
  let scene, camera, board, world, trophyMesh, diceObj, numSp, camTarget = new THREE.Vector3(), camPos = new THREE.Vector3(0, 70, 90), camLook = new THREE.Vector3(), camMode = 'over';
  const coinFx = [];
  function buildScene() {
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(50, W / H, 0.5, 2000);
    world = buildWorld(scene); board = buildBoard(scene, world); decorate(scene, world, board);
    trophyMesh = makeTrophy(); scene.add(trophyMesh);
    diceObj = makeDice(); diceObj.m.visible = false; scene.add(diceObj.m);
    numSp = numberSprite(); numSp.sp.visible = false; scene.add(numSp.sp);
  }
  const boardView = {
    resize() { if (camera) { camera.aspect = W / H; camera.updateProjectionMatrix(); } },
    update(dt) {
      world.anim.forEach(f => f(time, dt));
      G.players.forEach((pl, i) => {
        const c = pl.cre; c.anim(time + i, pl.anim || 'idle');
        if (!pl.moving) { const n = board.nodes[pl.node], sharing = G.players.filter(o => o.node === pl.node && !o.moving), k = sharing.indexOf(pl), m = sharing.length;
          const off = m > 1 ? { x: Math.cos(k / m * TAU) * 1.0, z: Math.sin(k / m * TAU) * 1.0 } : { x: 0, z: 0 };
          c.root.position.x = lerp(c.root.position.x, n.x + off.x, 0.2); c.root.position.z = lerp(c.root.position.z, n.z + off.z, 0.2); c.root.position.y = n.y + 0.4; }
        if (pl.face != null) c.root.rotation.y = lerp(c.root.rotation.y, pl.face, 0.15);
      });
      if (G.trophyNode != null) { const n = board.nodes[G.trophyNode]; trophyMesh.position.set(n.x, n.y + 0.6 + Math.sin(time * 2) * 0.25, n.z); trophyMesh.rotation.y = time * 1.2; }
      if (diceObj.m.visible) { diceObj.m.rotation.x += dt * 4; diceObj.m.rotation.y += dt * 5; }
      for (const f of coinFx) { f.t += dt; f.m.position.y = f.y0 + f.t * (f.up ? 3 : -2); f.m.rotation.y += dt * 8; f.m.material.opacity = 1 - f.t; if (f.t > 1) { scene.remove(f.m); f.dead = true; } }
      for (let i = coinFx.length - 1; i >= 0; i--) if (coinFx[i].dead) coinFx.splice(i, 1);
      // Kamera
      let want, look;
      if (camMode === 'over') { look = new THREE.Vector3(0, 0, 4); want = new THREE.Vector3(Math.sin(time * 0.05) * 20, 92, 96); }
      else { look = camTarget.clone(); want = camTarget.clone().add(new THREE.Vector3(0, 17, 21)); }
      camPos.lerp(want, Math.min(1, dt * 2.5)); camLook.lerp(look, Math.min(1, dt * 3.5));
      camera.position.copy(camPos); camera.lookAt(camLook);
    },
    render() { renderer.render(scene, camera); hc.setTransform(1, 0, 0, 1, 0, 0); hc.clearRect(0, 0, hud.width, hud.height); },
  };
  function follow(pl) { camMode = 'follow'; camTarget.copy(pl.cre.root.position); }
  function coinBurst(pl, n, up) {
    const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16).rotateX(Math.PI / 2);
    for (let i = 0; i < Math.min(n, 8); i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: 0.7, roughness: 0.3, transparent: true }));
      const p = pl.cre.root.position; m.position.set(p.x + rnd(-0.8, 0.8), p.y + 2.5 + rnd(0, 1), p.z + rnd(-0.8, 0.8)); scene.add(m);
      coinFx.push({ m, t: -i * 0.08, y0: m.position.y, up });
    }
  }
  function cards() {
    const cs = q('#pt-cards'); if (!G) { cs.innerHTML = ''; return; }
    const ranks = rankList();
    cs.innerHTML = G.players.map((pl, i) => `<div class="pt-card pt-c${i}${G.active === pl ? ' act' : ''}" style="--c:${pl.color};border-color:${pl.color}"><img src="${portraits[pl.def.id]}" alt=""><div style="min-width:0"><div class="nm" style="color:${pl.color}">${esc(pl.name)}</div>
      <div class="st"><span><i class="ico-coin"></i>${pl.coins}</span><span><i class="ico-tro"></i>${pl.trophies}</span></div><div class="it">${pl.items.map(k => ITEMS[k].name).join(', ') || '&nbsp;'}</div></div><div class="rk">${ranks.indexOf(pl) + 1}</div></div>`).join('');
    const r = q('#pt-round'); r.style.display = ''; r.textContent = 'Runde ' + Math.min(G.round, G.rounds) + ' / ' + G.rounds; r.classList.toggle('end', G.round > G.rounds - 5);
  }
  function rankList() { return [...G.players].sort((a, b) => b.trophies - a.trophies || b.coins - a.coins); }
  function addCoins(pl, n, silent) {
    const before = pl.coins; pl.coins = Math.max(0, pl.coins + n); const d = pl.coins - before;
    pl.stats.maxCoins = Math.max(pl.stats.maxCoins, pl.coins);
    if (!silent && d) { Sound.play(d > 0 ? 'coin' : 'coinLose'); coinBurst(pl, Math.abs(d), d > 0); }
    cards(); return d;
  }

  async function startGame() {
    const humans = [];
    for (let i = 0; i < setup.humans; i++) humans.push(setup.cur[i]);
    const free = CREATURES.map((_, i) => i).filter(i => !humans.includes(i)).sort(() => Math.random() - 0.5);
    const defs = humans.concat(free.slice(0, 4 - humans.length));
    ov.classList.remove('on');
    buildScene(); resize();
    G = { round: 1, rounds: setup.rounds, cpu: setup.cpu, players: [], trophyNode: null, active: null, lastGames: [], trapNodes: {} };
    G.players = defs.map((ci, i) => {
      const def = CREATURES[ci], human = i < setup.humans, cre = makeCreature(def);
      cre.root.scale.setScalar(1.05); scene.add(cre.root);
      const pl = { idx: i, def, name: def.name, human, phone: human ? i + 1 : 0, cre, coins: 10, trophies: 0, items: [], node: 0, color: PCOL[i], stats: { mgCoins: 0, maxCoins: 10, events: 0, mgWins: 0 }, lastColor: 'blue', anim: 'idle', face: 0 };
      cre.root.position.set(board.nodes[0].x, board.nodes[0].y, board.nodes[0].z);
      // Farbring unter der Figur
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 24), new THREE.MeshBasicMaterial({ color: pl.color, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; cre.root.add(ring);
      return pl;
    });
    env.setView(boardView); Sound.music('party');
    try { await gameLoop(); } catch (e) { if (e.message !== 'closed') console.error(e); }
  }

  // ---------- Würfeln ----------
  async function rollDice(pl, count) {
    const vals = [];
    for (let k = 0; k < count; k++) {
      diceObj.m.visible = true; const p = pl.cre.root.position; diceObj.m.position.set(p.x, p.y + 4.2 + k * 0.1, p.z);
      let n = 1, spinning = true;
      const spin = setInterval(() => { if (!paused) { n = n % 10 + 1; diceObj.set(n); Sound.play('diceSpin'); } }, 70);
      if (pl.human) {
        setPad(pl.phone, { title: 'Würfeln', hint: count > 1 ? `Würfel ${k + 1} von ${count}: Handy schütteln!` : 'Schüttle dein Handy!', shake: true, buttons: [{ b: 'A', label: 'Oder hier tippen', color: '#f0a500' }] });
        await new Promise(res => { const off = env.onEdge((pp, nm) => { if (pp === pl.phone && (nm === 'A' || nm === 'SHAKE')) { off(); res(); } }); });
      } else await wait(rnd(900, 1500));
      clearInterval(spin); spinning = false; void spinning;
      n = 1 + Math.floor(Math.random() * 10); diceObj.set(n); Sound.play('diceHit');
      pl.anim = 'happy'; await wait(450); pl.anim = 'idle';
      vals.push(n); await wait(350);
    }
    diceObj.m.visible = false; setIdle(pl);
    return vals;
  }

  // ---------- Bewegung ----------
  async function hop(pl, to) {
    const a = pl.cre.root.position.clone(), n = board.nodes[to], b = new THREE.Vector3(n.x, n.y + 0.4, n.z);
    pl.moving = true; pl.face = Math.atan2(b.x - a.x, b.z - a.z); pl.anim = 'walk';
    const dur = 300; let t = 0, last = performance.now();
    await new Promise(res => { const iv = setInterval(() => { const now = performance.now(), d = now - last; last = now; if (!alive) { clearInterval(iv); res(); return; } if (paused) return; t += Math.min(100, d); const k = Math.min(1, t / dur); pl.cre.root.position.lerpVectors(a, b, k); pl.cre.root.position.y += Math.sin(k * Math.PI) * 1.1; camTarget.copy(pl.cre.root.position); if (k >= 1) { clearInterval(iv); res(); } }, 16); });
    pl.node = to; pl.moving = false; pl.anim = 'idle'; Sound.play('step');
  }
  function distToTrophy(from) {
    if (G.trophyNode == null) return 0;
    const dist = { [from]: 0 }, Q = [from];
    while (Q.length) { const u = Q.shift(); if (u === G.trophyNode) return dist[u]; for (const v of board.nodes[u].next) if (dist[v] == null) { dist[v] = dist[u] + 1; Q.push(v); } }
    return 99;
  }
  async function move(pl, steps) {
    numSp.sp.visible = true;
    while (steps > 0) {
      const cur = board.nodes[pl.node];
      numSp.set(steps, pl.color); const p = pl.cre.root.position; numSp.sp.position.set(p.x, p.y + 3.6, p.z);
      let to = cur.next[0];
      if (cur.next.length > 1) {
        const names = board.junctions[cur.id] || cur.next.map((_, i) => 'Weg ' + (i + 1));
        const arrows = cur.next.map(j => { const n2 = board.nodes[j]; const a = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 10), toon('#ffffff')); a.position.set((cur.x + n2.x) / 2, cur.y + 1.6, (cur.z + n2.z) / 2); a.rotation.z = -Math.PI / 2; a.rotation.y = -Math.atan2(n2.z - cur.z, n2.x - cur.x); outline(a, 1.12); scene.add(a); return a; });
        const ch = await ask(pl, 'Abzweigung', 'Welchen Weg nimmst du?', names.map((nm, i) => ({ label: nm })), () => {
          const d = cur.next.map(j => distToTrophy(j)); const best = d.indexOf(Math.min(...d)); return Math.random() < [0.55, 0.75, 0.92][G.cpu] ? best : Math.floor(Math.random() * cur.next.length);
        });
        arrows.forEach(a => scene.remove(a)); to = cur.next[ch];
      }
      await hop(pl, to); steps--;
      const n = board.nodes[pl.node];
      p.copy(pl.cre.root.position); numSp.sp.position.set(p.x, p.y + 3.6, p.z); numSp.set(steps, pl.color);
      if (G.trophyNode === pl.node) { numSp.sp.visible = false; await trophyOffer(pl); numSp.sp.visible = true; }
      if (n.type === 'shop' && steps > 0) { numSp.sp.visible = false; await shop(pl, true); numSp.sp.visible = true; }
    }
    numSp.sp.visible = false;
  }
  async function trophyOffer(pl) {
    if (pl.coins < TROPHY_PRICE) { await say('Trophäe', `${pl.name} hat nicht genug Münzen (${TROPHY_PRICE} nötig).`, 1500); return; }
    const i = await ask(pl, 'Trophäe!', `Für ${TROPHY_PRICE} Münzen kaufen?`, [{ label: 'Ja, kaufen!' }, { label: 'Nein' }], () => 0);
    if (i !== 0) return;
    addCoins(pl, -TROPHY_PRICE); pl.trophies++; Sound.play('trophy'); pl.anim = 'happy'; banner(pl.name, 'hat eine Trophäe!', 2200); cards();
    await wait(2200); pl.anim = 'idle';
    await moveTrophy();
  }
  async function moveTrophy(first) {
    const opts = board.trophySpots.filter(i => i !== G.trophyNode && !G.players.some(p => p.node === i));
    G.trophyNode = pick(opts);
    const n = board.nodes[G.trophyNode];
    camMode = 'follow'; camTarget.set(n.x, n.y, n.z); Sound.play('whoosh');
    banner(first ? 'Die Trophäe' : 'Neue Trophäe', 'steht jetzt hier!', 1800); await wait(2000);
  }

  // ---------- Felder ----------
  async function land(pl) {
    const n = board.nodes[pl.node], mul = G.round > G.rounds - 5 ? 2 : 1;
    if (G.trapNodes[pl.node] != null && G.trapNodes[pl.node] !== pl.idx) {
      const owner = G.players[G.trapNodes[pl.node]]; delete G.trapNodes[pl.node]; if (n.trapMesh) { scene.remove(n.trapMesh); n.trapMesh = null; }
      const d = -addCoins(pl, -10); addCoins(owner, d); await say('Fallennetz!', `${pl.name} zahlt ${d} Münzen an ${owner.name}.`);
    }
    switch (n.type) {
      case 'blue': case 'start': pl.lastColor = 'blue'; addCoins(pl, 3 * mul); pl.anim = 'happy'; await wait(900); break;
      case 'red': pl.lastColor = 'red'; addCoins(pl, -3 * mul); pl.anim = 'sad'; await wait(900); break;
      case 'event': pl.lastColor = Math.random() < 0.5 ? 'blue' : 'red'; pl.stats.events++; await eventSpace(pl); break;
      case 'lucky': pl.lastColor = Math.random() < 0.5 ? 'blue' : 'red'; pl.stats.events++; await luckySpace(pl); break;
      case 'bad': pl.lastColor = Math.random() < 0.5 ? 'blue' : 'red'; pl.stats.events++; await badSpace(pl); break;
      case 'shop': pl.lastColor = Math.random() < 0.5 ? 'blue' : 'red'; await shop(pl, false); break;
      case 'duel': pl.lastColor = Math.random() < 0.5 ? 'blue' : 'red'; await duel(pl); break;
    }
    pl.anim = 'idle';
  }
  async function eventSpace(pl) {
    Sound.play('event');
    const ev = pick(['dolphin', 'wave', 'chest', 'rain', 'gull', 'trophy', 'swap']);
    if (ev === 'dolphin') { await say('Delfin-Taxi', `Ein Delfin trägt ${pl.name} fünf Felder weiter.`); for (let i = 0; i < 5; i++) await hop(pl, board.nodes[pl.node].next[0]); if (G.trophyNode === pl.node) await trophyOffer(pl); }
    else if (ev === 'wave') { await say('Riesenwelle', `Eine Welle spült ${pl.name} drei Felder zurück.`); for (let i = 0; i < 3; i++) { const pv = board.nodes[pl.node].prev; await hop(pl, pv[0]); } }
    else if (ev === 'chest') { await say('Schatzkiste', `${pl.name} findet eine Schatzkiste mit 10 Münzen.`, 1200); addCoins(pl, 10); await wait(700); }
    else if (ev === 'rain') { await say('Kokos-Regen', 'Alle Spieler bekommen 5 Münzen.', 1200); G.players.forEach(p => addCoins(p, 5)); await wait(700); }
    else if (ev === 'gull') { await say('Diebische Möwe', `Eine Möwe schnappt ${pl.name} 6 Münzen weg.`, 1200); addCoins(pl, -6); await wait(700); }
    else if (ev === 'trophy') { await say('Inselbeben', 'Die Trophäe zieht an einen anderen Ort.', 1200); await moveTrophy(); follow(pl); }
    else if (ev === 'swap') { const o = pick(G.players.filter(p => p !== pl)); await say('Strudel', `${pl.name} tauscht den Platz mit ${o.name}.`); const a = pl.node; pl.node = o.node; o.node = a; await wait(800); follow(pl); }
  }
  async function luckySpace(pl) {
    Sound.play('win');
    const ev = pick(['coins', 'item', 'tax']);
    if (ev === 'coins') { await say('Glücksfeld', `${pl.name} bekommt 10 Münzen.`, 1200); addCoins(pl, 10); }
    else if (ev === 'item' && pl.items.length < 3) { const it = pick(Object.keys(ITEMS)); pl.items.push(it); cards(); await say('Glücksfeld', `${pl.name} bekommt eine ${ITEMS[it].name}.`); }
    else { await say('Glücksfeld', `Jeder Mitspieler gibt ${pl.name} 3 Münzen.`, 1300); G.players.forEach(o => { if (o !== pl) { const d = -addCoins(o, -3); addCoins(pl, d); } }); }
    pl.anim = 'happy'; await wait(800);
  }
  async function badSpace(pl) {
    Sound.play('bad'); pl.anim = 'sad';
    const ev = pick(['lose', 'share', 'give', pl.trophies > 0 && Math.random() < 0.3 ? 'trophy' : 'lose']);
    if (ev === 'lose') { await say('Sturmwolke', `Ein Gewitter pustet ${pl.name} 10 Münzen weg.`, 1400); addCoins(pl, -10); }
    else if (ev === 'share') { await say('Sturmwolke', 'Alle Münzen werden gleich verteilt!', 1500); const tot = G.players.reduce((s, p) => s + p.coins, 0), each = Math.floor(tot / 4); G.players.forEach(p => { p.coins = each; }); Sound.play('whoosh'); cards(); }
    else if (ev === 'give') { await say('Sturmwolke', `${pl.name} muss jedem Mitspieler 4 Münzen geben.`, 1400); G.players.forEach(o => { if (o !== pl) { const d = -addCoins(pl, -4); addCoins(o, d); } }); }
    else { await say('Sturmwolke', `${pl.name} verliert eine Trophäe!`, 1500); pl.trophies--; cards(); }
    await wait(700);
  }
  async function shop(pl, passing) {
    if (pl.items.length >= 3) { if (!passing) await say('Laden', `${pl.name} hat schon drei Gegenstände.`, 1200); return; }
    const keys = Object.keys(ITEMS).filter(k => ITEMS[k].price <= pl.coins);
    if (!keys.length) { if (!passing) await say('Laden', `${pl.name} hat zu wenig Münzen.`, 1200); return; }
    if (!pl.human && passing && Math.random() < 0.5) return;
    const opts = keys.map(k => ({ label: ITEMS[k].name, sub: ITEMS[k].price + ' Münzen · ' + ITEMS[k].desc })).concat([{ label: 'Nichts kaufen' }]);
    const i = await ask(pl, 'Inselladen', 'Was möchtest du kaufen?', opts, () => {
      if (pl.coins - 10 < TROPHY_PRICE && G.trophyNode != null && distToTrophy(pl.node) < 20) return keys.length;
      const pref = ['compass', 'triple', 'double', 'steal', 'trap', 'swap'].find(k => keys.includes(k) && pl.coins - ITEMS[k].price >= 10);
      return pref ? keys.indexOf(pref) : keys.length;
    });
    if (i >= keys.length) return;
    addCoins(pl, -ITEMS[keys[i]].price); pl.items.push(keys[i]); cards(); Sound.play('pickup');
  }
  async function duel(pl) {
    const others = G.players.filter(o => o !== pl);
    Sound.play('event');
    const oi = await ask(pl, 'Duell!', 'Wen forderst du heraus?', others.map(o => ({ label: o.name, sub: o.coins + ' Münzen' })), () => others.indexOf([...others].sort((a, b) => b.coins - a.coins)[0]));
    const opp = others[oi];
    const wager = Math.min(10, pl.coins, opp.coins);
    if (wager <= 0) { await say('Duell', 'Einer von beiden hat keine Münzen. Kein Duell.', 1400); return; }
    await say('Duell', `${pl.name} gegen ${opp.name} um ${wager} Münzen!`, 1600);
    const games = GAMES.filter(g => g.duel);
    const game = pick(games);
    const res = await playMini(game, [pl, opp], 'duel');
    env.setView(boardView); Sound.music('party'); follow(pl);
    const win = res.winners.length === 1 ? res.winners[0] : null;
    if (win) { const lose = win === pl ? opp : pl; const d = -addCoins(lose, -wager); addCoins(win, d); await say('Duell', `${win.name} gewinnt ${d} Münzen!`, 1600); }
    else await say('Duell', 'Unentschieden!', 1200);
  }

  // ---------- Gegenstände ----------
  async function useItem(pl, key) {
    pl.items.splice(pl.items.indexOf(key), 1); cards(); Sound.play('pickup');
    if (key === 'double') return 2;
    if (key === 'triple') return 3;
    if (key === 'steal') {
      const others = G.players.filter(o => o !== pl && o.coins > 0);
      if (!others.length) { await say('Klauhand', 'Niemand hat Münzen.', 1200); return 1; }
      const oi = await ask(pl, 'Klauhand', 'Wem stibitzt du Münzen?', others.map(o => ({ label: o.name, sub: o.coins + ' Münzen' })), () => others.indexOf([...others].sort((a, b) => b.coins - a.coins)[0]));
      const o = others[oi], n = Math.min(o.coins, 5 + Math.floor(Math.random() * 11)); addCoins(o, -n); addCoins(pl, n); await say('Klauhand', `${pl.name} stibitzt ${n} Münzen von ${o.name}!`, 1500); return 1;
    }
    if (key === 'compass') {
      const prev = board.nodes[G.trophyNode].prev[0]; await say('Kompassmuschel', `${pl.name} reist direkt zur Trophäe!`, 1300); Sound.play('whoosh'); pl.node = prev; await wait(700); follow(pl); return 1;
    }
    if (key === 'swap') {
      const others = G.players.filter(o => o !== pl);
      const oi = await ask(pl, 'Tauschmuschel', 'Mit wem tauschst du den Platz?', others.map(o => ({ label: o.name })), () => { const d = others.map(o => distToTrophy(o.node)); return d.indexOf(Math.min(...d)); });
      const o = others[oi], a = pl.node; pl.node = o.node; o.node = a; Sound.play('whoosh'); await wait(900); follow(pl); return 1;
    }
    if (key === 'trap') {
      G.trapNodes[pl.node] = pl.idx; const n = board.nodes[pl.node];
      const net = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.12, 6, 20), toon(pl.color)); net.rotation.x = -Math.PI / 2; net.position.set(n.x, n.y + 0.45, n.z); scene.add(net); n.trapMesh = net;
      await say('Fallennetz', `${pl.name} legt ein Netz aus.`, 1200); return 1;
    }
    return 1;
  }

  // ---------- Zug ----------
  async function turn(pl) {
    G.active = pl; cards(); follow(pl); idleAll(pl);
    banner(pl.name + ' ist dran', pl.human ? 'Spieler ' + pl.phone : 'Computer', 1300); await wait(1400);
    let dice = 1;
    if (pl.items.length) {
      const opts = [{ label: 'Würfeln' }].concat(pl.items.map(k => ({ label: ITEMS[k].name, sub: ITEMS[k].desc })));
      const ci = await ask(pl, 'Dein Zug', 'Würfeln oder einen Gegenstand benutzen?', opts, () => {
        const d = distToTrophy(pl.node);
        const want = pl.coins >= TROPHY_PRICE ? (pl.items.includes('compass') ? 'compass' : d > 8 && pl.items.includes('triple') ? 'triple' : d > 6 && pl.items.includes('double') ? 'double' : null) : (pl.items.includes('steal') ? 'steal' : null);
        if (!want && pl.items.includes('trap') && Math.random() < 0.4) return 1 + pl.items.indexOf('trap');
        return want ? 1 + pl.items.indexOf(want) : 0;
      });
      if (ci > 0) dice = await useItem(pl, pl.items[ci - 1]);
    }
    follow(pl);
    const vals = await rollDice(pl, dice);
    const total = vals.reduce((a, b) => a + b, 0);
    if (vals.length > 1) { banner(vals.join(' + ') + ' = ' + total, '', 1400); await wait(1300); }
    await move(pl, total);
    await land(pl);
    cards();
  }

  async function playMini(game, players, mode) {
    K.send({ t: 'mode', m: 'pad', cfg: { title: 'Minispiel', hint: 'Gleich geht es los …' } });
    q('#pt-cards').style.display = 'none'; q('#pt-round').style.visibility = 'hidden'; dialogHide();
    let res;
    try { res = await runMinigame(env, game, players, mode); }
    finally { q('#pt-cards').style.display = ''; q('#pt-round').style.visibility = ''; }
    players.forEach(p => p.anim = 'idle');
    return res;
  }

  async function gameLoop() {
    cards(); camMode = 'over';
    banner('Insel-Party', G.rounds + ' Runden', 2400); await wait(2600);
    // Reihenfolge auswürfeln
    await say('Reihenfolge', 'Wer am höchsten würfelt, fängt an.', 1600);
    const rolls = [];
    for (const pl of G.players) { follow(pl); const v = (await rollDice(pl, 1))[0]; rolls.push([pl, v + Math.random() * 0.1]); }
    G.players = rolls.sort((a, b) => b[1] - a[1]).map(r => r[0]);
    G.players.forEach((p, i) => { p.color = p.color; });
    cards();
    await say('Reihenfolge', G.players.map((p, i) => (i + 1) + '. ' + p.name).join('   '), 2000);
    camMode = 'over'; await moveTrophy(true);
    while (G.round <= G.rounds) {
      cards(); camMode = 'over';
      if (G.round === G.rounds - 4 && G.rounds >= 10) {
        banner('Endspurt!', 'Noch 5 Runden. Plus- und Minusfelder zählen doppelt.', 2600); Sound.play('fanfare'); await wait(2800);
        const last = rankList()[3]; await say('Endspurt', `${last.name} liegt hinten und bekommt 10 Münzen Rückenwind.`, 1800); addCoins(last, 10);
      } else { banner('Runde ' + G.round, G.round === G.rounds ? 'Letzte Runde!' : '', 1600); await wait(1700); }
      for (const pl of G.players) await turn(pl);
      G.active = null; cards();
      // Minispiel
      const blue = G.players.filter(p => p.lastColor === 'blue'), red = G.players.filter(p => p.lastColor === 'red');
      let mode = 'ffa', teams = null;
      if (blue.length === 2) { mode = '2v2'; teams = [blue, red]; } else if (blue.length === 1 || blue.length === 3) { mode = '1v3'; teams = blue.length === 1 ? [blue, red] : [red, blue]; }
      const pool = GAMES.filter(g => g.type === mode && !G.lastGames.includes(g.id));
      const game = pick(pool.length ? pool : GAMES.filter(g => g.type === mode));
      G.lastGames.push(game.id); if (G.lastGames.length > 5) G.lastGames.shift();
      const ordered = mode === 'ffa' ? G.players : teams[0].concat(teams[1]);
      const res = await playMini(game, ordered, mode);
      env.setView(boardView); Sound.music('party'); camMode = 'over';
      for (const w of res.winners) { addCoins(w, 10, true); w.stats.mgCoins += 10; w.stats.mgWins++; }
      if (res.winners.length) { Sound.play('coin'); await say('Minispiel', res.winners.map(w => w.name).join(' und ') + ' bekommt je 10 Münzen.', 1800); }
      G.round++;
    }
    await finale();
  }

  async function finale() {
    camMode = 'over'; G.active = null; cards();
    banner('Spielende!', '', 2200); Sound.play('fanfare'); await wait(2500);
    const bonus = [['Minispiel-Ass', 'die meisten Minispiel-Münzen', p => p.stats.mgCoins], ['Münzkönig', 'den höchsten Münzstand', p => p.stats.maxCoins], ['Inselentdecker', 'die meisten Ereignisfelder', p => p.stats.events]];
    for (const [name, why, f] of bonus) {
      const best = Math.max(...G.players.map(f)); const ws = G.players.filter(p => f(p) === best && best > 0);
      if (!ws.length) continue;
      ws.forEach(w => w.trophies++); Sound.play('trophy'); cards();
      await say('Bonus-Trophäe: ' + name, ws.map(w => w.name).join(' und ') + ' für ' + why + '.', 2400);
    }
    const ranks = rankList();
    await podium(ranks);
  }
  async function podium(ranks) {
    // Siegerpodest als 3D-Szene
    const sc = new THREE.Scene(); sc.background = new THREE.Color('#7fd0f0');
    sc.add(new THREE.HemisphereLight('#ffffff', '#ffd9a0', 1.4)); const dl = new THREE.DirectionalLight('#ffffff', 2); dl.position.set(5, 12, 8); dl.castShadow = true; sc.add(dl);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 40), toon('#f6dfa6')); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
    const hs = [3, 2.1, 1.4, 0.7], xs = [0, -3.4, 3.4, 6.6];
    const cols = ['#f2b705', '#c0c7cf', '#d0864a', '#9aa0a5'];
    ranks.forEach((p, i) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(3, hs[i], 3), toon(cols[i])); b.position.set(xs[i], hs[i] / 2, 0); b.castShadow = b.receiveShadow = true; outline(b, 1.02); sc.add(b);
      const c = makeCreature(p.def); c.root.position.set(xs[i], hs[i], 0.3); c.root.scale.setScalar(1.3); sc.add(c.root); p.pod = c;
    });
    const tro = makeTrophy(); tro.position.set(0, hs[0] + 3.4, 0); tro.scale.setScalar(0.9); sc.add(tro);
    const conf = []; const cg = new THREE.PlaneGeometry(0.25, 0.4);
    for (let i = 0; i < 160; i++) { const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: pick(['#ff5f5f', '#4fa8ff', '#ffd23d', '#5fcf5a', '#ff8fc0', '#a26bff']), side: THREE.DoubleSide })); m.position.set(rnd(-10, 10), rnd(6, 20), rnd(-6, 4)); sc.add(m); conf.push({ m, v: rnd(1, 2.5), s: rnd(1, 4) }); }
    const cam = new THREE.PerspectiveCamera(45, W / H, 0.1, 200); cam.position.set(1.5, 5.5, 14); cam.lookAt(1.5, 2.6, 0);
    env.setView({ resize() { cam.aspect = W / H; cam.updateProjectionMatrix(); }, update(dt) {
      ranks.forEach((p, i) => p.pod.anim(time + i, i === 0 ? 'happy' : i === 3 ? 'sad' : 'idle'));
      tro.rotation.y = time; conf.forEach(c => { c.m.position.y -= c.v * dt; c.m.rotation.x += c.s * dt; c.m.rotation.y += c.s * dt * 0.7; if (c.m.position.y < 0) c.m.position.y = 18; });
    }, render() { renderer.render(sc, cam); hc.setTransform(1, 0, 0, 1, 0, 0); hc.clearRect(0, 0, hud.width, hud.height); } });
    q('#pt-cards').innerHTML = ''; q('#pt-round').style.display = 'none';
    Sound.play('record'); banner(ranks[0].name + ' gewinnt!', ranks[0].trophies + ' Trophäen · ' + ranks[0].coins + ' Münzen', 4000);
    await wait(4200);
    ov.classList.add('on', 'glass');
    panel.innerHTML = `<h2>${esc(ranks[0].name)} gewinnt!</h2><table class="pt-tbl">${ranks.map((p, i) => `<tr><td class="n">${i + 1}.</td><td><img src="${portraits[p.def.id]}" alt="">${esc(p.name)} <span style="color:${p.color}">${p.human ? '(Spieler ' + p.phone + ')' : '(Computer)'}</span></td><td class="n">${p.trophies} Trophäen</td><td class="n">${p.coins} Münzen</td></tr>`).join('')}</table>
      <div class="pt-row"><button class="hv pt-b big" id="pt-again">Neues Spiel</button><button class="hv pt-b" id="pt-menu">Konsolen-Menü</button></div>`;
    K.send({ t: 'mode', m: 'pointer' });
    bind('#pt-again', () => { cleanup(); showTitle(); });
    bind('#pt-menu', () => K.closeChannel());
  }
  function cleanup() {
    env.setView(null);
    if (scene) scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
    scene = null; G = null; q('#pt-cards').innerHTML = ''; q('#pt-round').style.display = 'none'; dialogHide();
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  resize(); addEventListener('resize', resize);
  window.__pt = () => ({ G, setup, env, board });
  window.__ptMini = (id, mode) => { ov.classList.remove('on'); return runMinigame(env, GAMES.find(g => g.id === id), CREATURES.slice(0, mode === 'duel' ? 2 : 4).map((d, i) => ({ def: d, name: d.name, color: PCOL[i], human: false, phone: 0 })), mode).then(r => r.winners.map(w => w.name)); };
  showTitle();

  return {
    onFrame(dt) {
      if (paused) { if (view) view.render(); return; }
      time += dt;
      if (view) { view.update(dt); view.render(); }
      // Schütteln über Schwelle als Ereignis
      for (let p = 1; p <= 4; p++) { const I = inp[p]; if (I.shake > 16 && performance.now() - I.shakeHit > 600) { I.shakeHit = performance.now(); pressEdge(p, 'SHAKE'); } I.shake *= 0.85; }
    },
    onPause(p) { paused = p; },
    onRemotes() { if (!G && ov.classList.contains('on') && !charState) showTitle(); },
    onData(d, p) {
      if (d.t === 'sh') { inp[p].shake = Math.max(inp[p].shake, +d.e || 0); inp[p].shakeE = +d.e || 0; return true; }
      if (d.t === 'tl') { inp[p].tx = +d.x || 0; inp[p].ty = +d.y || 0; inp[p].tT = performance.now(); return true; }
      return false;
    },
    onButton(name, down, p) {
      if (name === 'HOME') return false;
      const I = inp[p]; I.btn[name] = down;
      if (down) {
        if (charState === 'chars') { charInput(p, name); if (p === 1 && (name === 'A') && document.querySelector('.pt-ch.hover')) return false; return true; }
        pressEdge(p, name);
      }
      if (!G && !charState) return false; // Menüs: normale Bedienung
      if (p === 1 && name === 'A' && down && document.querySelector('.pt-opt.hover')) return false; // Klick auf Dialogknopf mit dem Zeiger
      return true;
    },
    close() { alive = false; removeEventListener('resize', resize); K.send({ t: 'mode', m: 'pointer' }); cleanup(); renderer.dispose(); },
  };
}

const tileSVG = big => `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">
  <defs><linearGradient id="psk${big}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb4ff"/><stop offset="1" stop-color="#ffe9c4"/></linearGradient>
  <style>.pb{animation:pb 1.6s ease-in-out infinite}@keyframes pb{50%{transform:translateY(-8px)}}@media(prefers-reduced-motion:reduce){.pb{animation:none}}</style></defs>
  <rect width="320" height="200" fill="url(#psk${big})"/><rect y="120" width="320" height="80" fill="#29b6d8"/>
  <ellipse cx="160" cy="135" rx="140" ry="40" fill="#f6dfa6"/><ellipse cx="170" cy="122" rx="80" ry="24" fill="#6fc24f"/><path d="M150 120 L175 72 L200 120Z" fill="#8a7d6e"/>
  ${[[70, 140, '#2f8fe8'], [110, 150, '#e8434a'], [150, 154, '#36b85a'], [190, 152, '#2f8fe8'], [230, 146, '#f4c430'], [262, 136, '#2f8fe8']].map(([x, y, c]) => `<ellipse cx="${x}" cy="${y}" rx="15" ry="6" fill="${c}" stroke="#fff" stroke-width="2"/>`).join('')}
  <g class="pb"><circle cx="110" cy="132" r="15" fill="#ff8fc0" stroke="#2a1c14" stroke-width="2.5"/><circle cx="105" cy="129" r="3" fill="#1d1410"/><circle cx="115" cy="129" r="3" fill="#1d1410"/></g>
  <g class="pb" style="animation-delay:.4s"><circle cx="190" cy="134" r="15" fill="#5b9cf0" stroke="#2a1c14" stroke-width="2.5"/><circle cx="185" cy="131" r="3" fill="#1d1410"/><circle cx="195" cy="131" r="3" fill="#1d1410"/></g>
  <path d="M250 112h14v7c0 5-3 8-7 8s-7-3-7-8z" fill="#f2b705" stroke="#a87300" stroke-width="1.5"/>
  ${big ? '<text x="160" y="44" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="30" fill="#fff" stroke="#ff7a3d" stroke-width="6" paint-order="stroke">Insel-Party</text>' : ''}</svg>`;

const PartyChannel = { id: 'party', name: 'Insel-Party', music: 'party', tile: el => el.innerHTML = tileSVG(0), preview: el => el.innerHTML = tileSVG(1), open };
if (window.K && K.addChannel) K.addChannel(PartyChannel); else addEventListener('load', () => K.addChannel(PartyChannel));
