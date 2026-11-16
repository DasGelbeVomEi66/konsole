// Kart-Kanal "Turbo-Flitzer": 3D-Rennspiel mit Three.js. 1 oder 2 Spieler (geteilter Bildschirm links/rechts),
// Computerfahrer, 4 Strecken, Cup, eigene Items. Handy wird quer gehalten und als Lenkrad benutzt.
import * as THREE from '../lib/three.module.min.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const LAPS = 3, POINTS = [15, 12, 10, 8, 6, 4, 2, 1];
const fmtT = t => { if (t == null || !isFinite(t)) return '–'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2).replace('.', ','); };

// ---------- Fahrer ----------
const CLASS = {
  leicht: { acc: 1.18, vmax: 0.97, w: 0.8, hand: 1.12, label: 'Leicht' },
  mittel: { acc: 1.0, vmax: 1.0, w: 1.0, hand: 1.0, label: 'Mittel' },
  schwer: { acc: 0.88, vmax: 1.04, w: 1.35, hand: 0.9, label: 'Schwer' },
};
const DRIVERS = [
  { name: 'Lotta', cls: 'leicht', kart: '#ff5fa2', shirt: '#ffffff', skin: '#f5c9a0', helmet: '#ff8cc0' },
  { name: 'Fritz', cls: 'mittel', kart: '#e5242f', shirt: '#2f3b52', skin: '#ffe0c4', helmet: '#ffffff' },
  { name: 'Mila', cls: 'leicht', kart: '#ffc83d', shirt: '#3d7bd9', skin: '#e0a878', helmet: '#ffe27a' },
  { name: 'Bruno', cls: 'schwer', kart: '#8a5533', shirt: '#e9b44c', skin: '#b97a4f', helmet: '#5a3418' },
  { name: 'Kenji', cls: 'mittel', kart: '#2f7de1', shirt: '#ffffff', skin: '#f5c9a0', helmet: '#9fd0ff' },
  { name: 'Ronja', cls: 'mittel', kart: '#2eaa4f', shirt: '#ffcf33', skin: '#8a5533', helmet: '#b6f0c4' },
  { name: 'Oskar', cls: 'schwer', kart: '#7b3fbf', shirt: '#222831', skin: '#ffe0c4', helmet: '#c9a8ff' },
  { name: 'Ida', cls: 'leicht', kart: '#ff8a1f', shirt: '#1f9e8f', skin: '#5e3a22', helmet: '#ffd0a0' },
];
function avatarDriver() {
  const a = (typeof AV !== 'undefined') ? AV.get() : null;
  if (!a) return { name: 'Mein Avatar', cls: 'mittel', kart: '#34bdef', shirt: '#34bdef', skin: '#f5c9a0', helmet: '#5a3418', avatar: true };
  return { name: a.name || 'Mein Avatar', cls: 'mittel', kart: AV.shirts[a.shirt], shirt: AV.shirts[a.shirt], skin: AV.skins[a.skin], helmet: AV.hairCols[a.hairCol], avatar: true };
}

// ---------- Strecken ----------
const TRACKS = [
  { name: 'Blumenwiese', theme: 'meadow', grip: 1, width: 17, sky: '#8fd3ff', ground: '#69bd4a', road: '#5d6169', curb: ['#e5242f', '#ffffff'],
    pts: [[0, -170], [130, -170], [205, -115], [215, 0], [180, 95], [95, 140], [20, 105], [-45, 150], [-140, 160], [-205, 85], [-205, -65], [-135, -160]] },
  { name: 'Sonnenstrand', theme: 'beach', grip: 1, width: 16, sky: '#9fe0ff', ground: '#efd59a', road: '#6b6a68', curb: ['#ff8a1f', '#ffffff'],
    pts: [[0, -210], [150, -220], [245, -150], [215, -45], [115, -5], [165, 95], [265, 150], [210, 245], [60, 235], [-40, 160], [-145, 215], [-250, 140], [-230, 0], [-125, -65], [-190, -160], [-105, -220]] },
  { name: 'Gletscherpass', theme: 'ice', grip: 0.62, width: 17, sky: '#cfe6f5', ground: '#f3f7fa', road: '#9fb9cb', curb: ['#2f7de1', '#ffffff'],
    pts: [[0, -190], [170, -210], [235, -125], [130, -60], [245, 20], [245, 150], [130, 205], [45, 120], [-30, 205], [-160, 215], [-225, 105], [-125, 40], [-235, -40], [-215, -160], [-115, -210]] },
  { name: 'Mondburg', theme: 'castle', grip: 1, width: 16, sky: '#141a33', ground: '#2b2e3a', road: '#3c404c', curb: ['#ffc83d', '#7b3fbf'],
    pts: [[0, -230], [160, -240], [275, -175], [255, -60], [150, -40], [100, 45], [190, 115], [295, 160], [260, 275], [125, 275], [40, 190], [-55, 265], [-190, 265], [-275, 170], [-210, 65], [-275, -40], [-245, -165], [-125, -210]] },
];

// ---------- Items (eigene Auswahl) ----------
const ITEM_NAMES = { turbo: 'Turbo', triple: 'Dreifach-Turbo', oil: 'Ölfleck', ball: 'Prallball', drone: 'Suchdrohne', shield: 'Schutzblase', shrink: 'Schrumpfwelle', ink: 'Tintenwolke', gold: 'Goldrausch' };
const ITEM_LIST = Object.keys(ITEM_NAMES);
function rollItem(rank, n) {
  const f = (rank - 1) / Math.max(1, n - 1); // 0 = vorne, 1 = hinten
  const tbl = f < 0.25 ? { oil: 35, ball: 30, shield: 20, drone: 10, turbo: 5 }
    : f < 0.65 ? { drone: 24, ball: 16, oil: 10, turbo: 20, triple: 10, shield: 10, ink: 10 }
      : { triple: 26, turbo: 16, gold: 20, shrink: 13, drone: 15, ink: 10 };
  let sum = 0; for (const k in tbl) sum += tbl[k];
  let r = Math.random() * sum; for (const k in tbl) { r -= tbl[k]; if (r <= 0) return k; } return 'turbo';
}
function drawIcon(c, type, x, y, s) {
  c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineCap = 'round';
  const circ = (r, col, cx = 0, cy = 0) => { c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill(); };
  const flame = (ox, sc) => { c.save(); c.translate(ox, 0); c.scale(sc, sc); c.fillStyle = '#ff7a1a'; c.beginPath(); c.moveTo(0, -s * 0.38); c.quadraticCurveTo(s * 0.3, -s * 0.05, s * 0.18, s * 0.25); c.quadraticCurveTo(0, s * 0.4, -s * 0.18, s * 0.25); c.quadraticCurveTo(-s * 0.3, -s * 0.05, 0, -s * 0.38); c.fill(); c.fillStyle = '#ffe14d'; c.beginPath(); c.moveTo(0, -s * 0.12); c.quadraticCurveTo(s * 0.14, s * 0.08, 0, s * 0.25); c.quadraticCurveTo(-s * 0.14, s * 0.08, 0, -s * 0.12); c.fill(); c.restore(); };
  switch (type) {
    case 'turbo': flame(0, 1); break;
    case 'triple': flame(-s * 0.24, 0.6); flame(s * 0.24, 0.6); flame(0, 0.7); break;
    case 'oil': c.fillStyle = '#1b1b22'; c.beginPath(); c.ellipse(0, s * 0.08, s * 0.38, s * 0.22, 0, 0, TAU); c.fill(); circ(s * 0.1, '#1b1b22', s * 0.3, -s * 0.1); c.fillStyle = 'rgba(160,120,255,.6)'; c.beginPath(); c.ellipse(-s * 0.1, s * 0.02, s * 0.12, s * 0.05, 0, 0, TAU); c.fill(); break;
    case 'ball': circ(s * 0.34, '#2bb34a'); circ(s * 0.34, 'rgba(0,0,0,0)'); c.strokeStyle = '#d9ffe0'; c.lineWidth = s * 0.06; c.beginPath(); c.arc(0, 0, s * 0.22, -2.4, -0.8); c.stroke(); break;
    case 'drone': c.fillStyle = '#e5242f'; c.beginPath(); c.ellipse(0, 0, s * 0.34, s * 0.2, 0, 0, TAU); c.fill(); circ(s * 0.1, '#fff'); circ(s * 0.05, '#111'); c.strokeStyle = '#555'; c.lineWidth = s * 0.05; c.beginPath(); c.moveTo(-s * 0.4, -s * 0.24); c.lineTo(-s * 0.15, -s * 0.24); c.moveTo(s * 0.15, -s * 0.24); c.lineTo(s * 0.4, -s * 0.24); c.stroke(); break;
    case 'shield': c.strokeStyle = '#4fd6ff'; c.lineWidth = s * 0.08; c.beginPath(); c.arc(0, 0, s * 0.34, 0, TAU); c.stroke(); c.fillStyle = 'rgba(79,214,255,.25)'; c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-s * 0.12, -s * 0.14, s * 0.1, s * 0.05, -0.6, 0, TAU); c.fill(); break;
    case 'shrink': c.strokeStyle = '#b06bff'; c.lineWidth = s * 0.07; for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(0, 0, s * 0.12 * i, 0, TAU); c.stroke(); } circ(s * 0.06, '#b06bff'); break;
    case 'ink': c.fillStyle = '#4a2a8a'; for (const [a, b, r] of [[0, 0, 0.26], [0.2, -0.15, 0.14], [-0.22, 0.1, 0.15], [0.12, 0.22, 0.12], [-0.12, -0.22, 0.1]]) { c.beginPath(); c.arc(a * s, b * s, r * s, 0, TAU); c.fill(); } break;
    case 'gold': { c.fillStyle = '#ffcc33'; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = (i % 2 ? 0.2 : 0.38) * s; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill(); circ(s * 0.15, '#fff1a8'); break; }
  }
  c.restore();
}

// ---------- Hilfen für Texturen ----------
function canvasTex(w, h, draw, rep = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function noiseFill(c, w, h, base, amp) {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 6; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * amp})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}

// ---------- Strecke bauen ----------
function buildTrack(def, scene) {
  const group = new THREE.Group(); scene.add(group);
  const curve = new THREE.CatmullRomCurve3(def.pts.map(p => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal');
  const N = 1400, P = [], T = [], R = [];
  for (let i = 0; i < N; i++) {
    const p = curve.getPointAt(i / N), t = curve.getTangentAt(i / N);
    const tl = Math.hypot(t.x, t.z) || 1;
    P.push({ x: p.x, z: p.z }); T.push({ x: t.x / tl, z: t.z / tl }); R.push({ x: -t.z / tl, z: t.x / tl });
  }
  let len = 0; for (let i = 0; i < N; i++) { const a = P[i], b = P[(i + 1) % N]; len += Math.hypot(b.x - a.x, b.z - a.z); }
  const hw = def.width / 2, seg = len / N;

  // Straßenband
  function ribbon(off0, off1, y, mat, vScale) {
    const pos = [], uv = [], idx = [];
    let s = 0;
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = P[k], r = R[k];
      pos.push(p.x + r.x * off0, y, p.z + r.z * off0, p.x + r.x * off1, y, p.z + r.z * off1);
      uv.push(0, s / vScale, 1, s / vScale);
      s += seg;
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); group.add(m); return m;
  }
  const roadTex = canvasTex(128, 128, (c, w, h) => { noiseFill(c, w, h, def.road, 0.08); c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(w / 2 - 3, 0, 6, h * 0.45); c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(2, 0, 4, h); c.fillRect(w - 6, 0, 4, h); });
  ribbon(hw, -hw, 0.02, new THREE.MeshLambertMaterial({ map: roadTex, side: THREE.DoubleSide }), 10);
  const curbTex = canvasTex(16, 64, (c, w, h) => { c.fillStyle = def.curb[0]; c.fillRect(0, 0, w, h / 2); c.fillStyle = def.curb[1]; c.fillRect(0, h / 2, w, h / 2); });
  const curbMat = new THREE.MeshLambertMaterial({ map: curbTex, side: THREE.DoubleSide });
  ribbon(hw + 1.6, hw, 0.04, curbMat, 4); ribbon(-hw, -hw - 1.6, 0.04, curbMat, 4);

  // Boden
  const groundTex = canvasTex(256, 256, (c, w, h) => noiseFill(c, w, h, def.ground, def.theme === 'castle' ? 0.12 : 0.07));
  groundTex.repeat.set(60, 60);
  if (def.theme === 'beach') {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ color: '#2fb5e0' })); water.rotation.x = -Math.PI / 2; water.position.y = -0.4; group.add(water);
    const sand = new THREE.Mesh(new THREE.CircleGeometry(420, 64), new THREE.MeshLambertMaterial({ map: groundTex })); sand.rotation.x = -Math.PI / 2; group.add(sand);
  } else {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ map: groundTex })); g.rotation.x = -Math.PI / 2; groundTex.repeat.set(120, 120); group.add(g);
  }

  // Start-Ziel
  const chk = canvasTex(64, 16, (c, w, h) => { for (let x = 0; x < 8; x++) for (let y = 0; y < 2; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * 8, y * 8, 8, 8); } }, false);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(def.width, 2.5), new THREE.MeshLambertMaterial({ map: chk }));
  line.rotation.x = -Math.PI / 2; line.rotation.z = Math.atan2(T[0].x, T[0].z); line.position.set(P[0].x, 0.05, P[0].z); group.add(line);
  const postMat = new THREE.MeshLambertMaterial({ color: '#dddddd' });
  for (const sd of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8), postMat); post.position.set(P[0].x + R[0].x * (hw + 2.5) * sd, 4.5, P[0].z + R[0].z * (hw + 2.5) * sd); group.add(post); }
  const ban = new THREE.Mesh(new THREE.BoxGeometry(def.width + 6, 2, 0.6), new THREE.MeshLambertMaterial({ map: canvasTex(256, 32, (c, w, h) => { for (let x = 0; x < 32; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * 8, y * 8, 8, 8); } }, false) }));
  ban.position.set(P[0].x, 9, P[0].z); ban.rotation.y = Math.atan2(T[0].x, T[0].z); group.add(ban);

  // nächster Streckenpunkt
  function nearest(i0, x, z, win = 40) {
    let best = i0, bd = Infinity;
    for (let o = -win; o <= win; o++) { const k = (i0 + o + N) % N, dx = x - P[k].x, dz = z - P[k].z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = k; } }
    const lat = (x - P[best].x) * R[best].x + (z - P[best].z) * R[best].z;
    return { i: best, lat };
  }
  function globalNearest(x, z) { let best = 0, bd = Infinity; for (let k = 0; k < N; k += 4) { const dx = x - P[k].x, dz = z - P[k].z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = k; } } return nearest(best, x, z, 6); }
  function distToTrack(x, z) { let bd = Infinity; for (let k = 0; k < N; k += 5) { const dx = x - P[k].x, dz = z - P[k].z, d = dx * dx + dz * dz; if (d < bd) bd = d; } return Math.sqrt(bd); }

  // Deko
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  P.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
  function spots(n, dmin, dmax, spread = 90) {
    const out = []; let tries = 0;
    while (out.length < n && tries < n * 30) {
      tries++; const x = rnd(minX - spread, maxX + spread), z = rnd(minZ - spread, maxZ + spread), d = distToTrack(x, z);
      if (d > hw + dmin && d < hw + dmax) out.push([x, z]);
    }
    return out;
  }
  function instanced(geo, mat, list, setup) {
    const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D();
    list.forEach((p, i) => { o.position.set(p[0], 0, p[1]); o.rotation.set(0, Math.random() * TAU, 0); o.scale.setScalar(1); setup && setup(o, i, m); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; group.add(m); return m;
  }
  const L = (c, e) => new THREE.MeshLambertMaterial(e ? { color: c, emissive: c, emissiveIntensity: e } : { color: c });
  const th = def.theme;
  if (th === 'meadow') {
    const t1 = spots(150, 7, 120);
    instanced(new THREE.CylinderGeometry(0.5, 0.7, 4, 6).translate(0, 2, 0), L('#7a5230'), t1, (o) => o.scale.setScalar(rnd(0.8, 1.4)));
    instanced(new THREE.SphereGeometry(3.2, 10, 8).translate(0, 6, 0), L('#3f9a35'), t1, (o) => o.scale.setScalar(rnd(0.8, 1.4)));
    const fl = spots(500, 3, 70), cols = ['#ff5fa2', '#ffe14d', '#ffffff', '#b06bff', '#ff8a1f'];
    const fm = instanced(new THREE.SphereGeometry(0.45, 6, 4).translate(0, 0.4, 0), L('#ffffff'), fl);
    fl.forEach((_, i) => fm.setColorAt(i, new THREE.Color(cols[i % cols.length]))); fm.instanceColor.needsUpdate = true;
    instanced(new THREE.SphereGeometry(60, 16, 10), L('#58a83d'), spots(14, 150, 400, 300), (o) => { o.position.y = -25; o.scale.set(rnd(1, 2), rnd(0.6, 1), rnd(1, 2)); });
  } else if (th === 'beach') {
    const pl = spots(90, 6, 80);
    instanced(new THREE.CylinderGeometry(0.4, 0.6, 9, 6).translate(0, 4.5, 0), L('#9a6a3a'), pl, (o) => { o.rotation.z = rnd(-0.2, 0.2); });
    const leaf = new THREE.ConeGeometry(1.2, 6, 4).rotateX(Math.PI / 2).translate(0, 9, 3);
    for (let k = 0; k < 5; k++) instanced(leaf, L('#2e9e3e'), pl, (o) => { o.rotation.y = k / 5 * TAU; o.rotation.x = 0.35; });
    const um = spots(24, 5, 30), uc = ['#e5242f', '#2f7de1', '#ffc83d', '#ff5fa2'];
    instanced(new THREE.CylinderGeometry(0.1, 0.1, 4, 4).translate(0, 2, 0), L('#ffffff'), um);
    const ut = instanced(new THREE.ConeGeometry(2.6, 1.2, 8).translate(0, 4.2, 0), L('#ffffff'), um);
    um.forEach((_, i) => ut.setColorAt(i, new THREE.Color(uc[i % 4]))); ut.instanceColor.needsUpdate = true;
  } else if (th === 'ice') {
    const pn = spots(170, 6, 120);
    instanced(new THREE.ConeGeometry(3, 7, 7).translate(0, 5, 0), L('#2f6b4f'), pn, (o) => o.scale.setScalar(rnd(0.8, 1.5)));
    instanced(new THREE.ConeGeometry(1.8, 3, 7).translate(0, 8.5, 0), L('#ffffff'), pn, (o) => o.scale.setScalar(rnd(0.8, 1.5)));
    const mt = spots(16, 180, 450, 350);
    instanced(new THREE.ConeGeometry(70, 120, 8).translate(0, 50, 0), L('#8aa4b8'), mt, (o) => o.scale.setScalar(rnd(0.8, 1.6)));
    instanced(new THREE.ConeGeometry(28, 48, 8).translate(0, 86, 0), L('#ffffff'), mt, (o) => o.scale.setScalar(rnd(0.8, 1.6)));
  } else if (th === 'castle') {
    const tw = spots(16, 12, 70);
    instanced(new THREE.CylinderGeometry(5, 6, 26, 10).translate(0, 13, 0), L('#5b5e6e'), tw, (o) => o.scale.setScalar(rnd(0.8, 1.3)));
    instanced(new THREE.ConeGeometry(6.5, 10, 10).translate(0, 31, 0), L('#5a2a8a'), tw, (o) => o.scale.setScalar(rnd(0.8, 1.3)));
    const ln = [];
    for (let k = 0; k < N; k += 28) for (const sd of [-1, 1]) ln.push([P[k].x + R[k].x * (hw + 4) * sd, P[k].z + R[k].z * (hw + 4) * sd]);
    instanced(new THREE.CylinderGeometry(0.15, 0.15, 4, 4).translate(0, 2, 0), L('#222'), ln);
    instanced(new THREE.BoxGeometry(0.9, 0.9, 0.9).translate(0, 4.3, 0), L('#ffcc55', 1.4), ln);
    const sg = new THREE.BufferGeometry(), sp = [];
    for (let i = 0; i < 900; i++) { const a = Math.random() * TAU, e = rnd(0.05, 1.2), r = 900; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    group.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(40, 20, 14), new THREE.MeshBasicMaterial({ color: '#fff6d8', fog: false })); moon.position.set(-500, 380, -600); group.add(moon);
  }

  // Item-Kristalle
  const crystalMat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#4466ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.88 });
  const crystalGeo = new THREE.OctahedronGeometry(1.25);
  const boxes = [];
  for (const fr of [0.14, 0.4, 0.64, 0.87]) {
    const k = Math.floor(fr * N);
    for (const o of [-0.6, -0.2, 0.2, 0.6]) {
      const x = P[k].x + R[k].x * o * hw, z = P[k].z + R[k].z * o * hw;
      const m = new THREE.Mesh(crystalGeo, crystalMat); m.position.set(x, 1.6, z); group.add(m);
      boxes.push({ x, z, mesh: m, t: 0 });
    }
  }

  return { def, N, P, T, R, hw, len, group, nearest, globalNearest, boxes, crystalMat, bounds: { minX, maxX, minZ, maxZ } };
}

// ---------- Kart-Modell ----------
function makeKart(d) {
  const g = new THREE.Group(), L = c => new THREE.MeshLambertMaterial({ color: c });
  const body = new THREE.Group(); g.add(body);
  const kartMat = L(d.kart);
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 2.7), kartMat); chassis.position.y = 0.55; body.add(chassis);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.9), kartMat); nose.position.set(0, 0.5, 1.65); body.add(nose);
  const bump = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.25, 0.3), L('#333')); bump.position.set(0, 0.4, 2.1); body.add(bump);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.3), L('#2a2a2a')); seat.position.set(0, 1.1, -0.75); body.add(seat);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.5), kartMat); wing.position.set(0, 1.35, -1.35); body.add(wing);
  for (const s of [-0.7, 0.7]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), L('#333')); p.position.set(s, 1.05, -1.3); body.add(p); }
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.38, 14).rotateZ(Math.PI / 2), wm = L('#1d1d22');
  const wheels = [];
  for (const [x, z] of [[-1.0, 0.95], [1.0, 0.95], [-1.0, -0.95], [1.0, -0.95]]) { const w = new THREE.Mesh(wheelGeo, wm); w.position.set(x, 0.45, z); body.add(w); wheels.push(w); }
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.45, 0.75, 10), L(d.shirt)); torso.position.set(0, 1.25, -0.35); body.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), L(d.skin)); head.position.set(0, 1.9, -0.3); body.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10, 0, TAU, 0, Math.PI * 0.55), L(d.helmet)); helm.position.set(0, 1.95, -0.32); body.add(helm);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.12), L('#1a1a1a')); visor.position.set(0, 2.0, 0.05); body.add(visor);
  const wheelS = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 14), L('#222')); wheelS.position.set(0, 1.35, 0.35); wheelS.rotation.x = -0.6; body.add(wheelS);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff8a1f', transparent: true, opacity: 0.85 })); flame.position.set(0, 0.6, -2.1); flame.visible = false; body.add(flame);
  const sparkMat = new THREE.MeshBasicMaterial({ color: '#4fd6ff' });
  const sparks = [-1.0, 1.0].map(x => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), sparkMat); s.position.set(x, 0.3, -1.3); s.visible = false; body.add(s); return s; });
  const shield = new THREE.Mesh(new THREE.SphereGeometry(2.3, 18, 12), new THREE.MeshBasicMaterial({ color: '#4fd6ff', transparent: true, opacity: 0.25, depthWrite: false })); shield.position.y = 1.1; shield.visible = false; g.add(shield);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.7, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.3, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.06; g.add(shadow);
  return { g, body, wheels, flame, sparks, sparkMat, shield, kartMat, baseColor: new THREE.Color(d.kart) };
}

function portraitSVG(d) {
  if (d.avatar && typeof AV !== 'undefined') return AV.svg(AV.get(), 'style="width:100%;height:100%"');
  return `<svg viewBox="0 0 100 100" style="width:100%;height:100%"><rect width="100" height="100" fill="${d.kart}"/><circle cx="50" cy="118" r="44" fill="${d.shirt}"/>
    <circle cx="50" cy="52" r="24" fill="${d.skin}"/><path d="M24 50 A26 26 0 0 1 76 50 L76 44 A26 26 0 0 0 24 44Z" fill="${d.helmet}"/><path d="M24 50 C24 20 76 20 76 50 L70 50 C66 38 34 38 30 50Z" fill="${d.helmet}"/>
    <circle cx="41" cy="55" r="3.5" fill="#222"/><circle cx="59" cy="55" r="3.5" fill="#222"/><path d="M42 65 Q50 71 58 65" stroke="#7a2a1a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
}
function trackPreview(def) {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 200; const c = cv.getContext('2d');
  c.fillStyle = def.ground; c.fillRect(0, 0, 320, 200);
  if (def.theme === 'beach') { c.fillStyle = '#2fb5e0'; c.fillRect(0, 0, 320, 200); c.fillStyle = def.ground; c.beginPath(); c.ellipse(160, 100, 150, 95, 0, 0, TAU); c.fill(); }
  const curve = new THREE.CatmullRomCurve3(def.pts.map(p => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal');
  const pts = curve.getSpacedPoints(200);
  let a = Infinity, b = -Infinity, e = Infinity, f = -Infinity; pts.forEach(p => { a = Math.min(a, p.x); b = Math.max(b, p.x); e = Math.min(e, p.z); f = Math.max(f, p.z); });
  const sc = Math.min(280 / (b - a), 165 / (f - e)), ox = 160 - (a + b) / 2 * sc, oz = 100 - (e + f) / 2 * sc;
  c.lineJoin = 'round'; c.lineCap = 'round';
  const path = () => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x * sc + ox, p.z * sc + oz) : c.moveTo(p.x * sc + ox, p.z * sc + oz)); c.closePath(); };
  c.strokeStyle = def.curb[0]; c.lineWidth = 16; path(); c.stroke(); c.strokeStyle = def.road; c.lineWidth = 11; path(); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(pts[0].x * sc + ox, pts[0].z * sc + oz, 5, 0, TAU); c.fill();
  return cv.toDataURL();
}

const CSS = `.kt{position:absolute;inset:0;background:#000;overflow:hidden}.kt canvas{position:absolute;inset:0;width:100%;height:100%}
.kt-ov{position:absolute;inset:0;display:none;place-items:center;background:linear-gradient(160deg,#1b5fae,#0d2f63 60%,#0a1f44)}.kt-ov.on{display:grid}.kt-ov.glass{background:rgba(5,15,35,.55)}
.kt-card{background:rgba(255,255,255,.97);border-radius:30px;border:4px solid #c4c8cc;padding:26px 34px;text-align:center;width:min(1100px,94vw);max-height:92vh;overflow:auto;color:#4c5054;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.kt-card h2{margin:0 0 4px;font-size:clamp(30px,4vw,50px);font-weight:900;color:#1b5fae;letter-spacing:-.01em}.kt-card h3{margin:0 0 14px;font-size:22px;font-weight:900;color:#5c6064}.kt-card p{margin:4px 0 14px;font-weight:700;color:#7a7f84}
.kt-row{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;margin:10px 0}
.kt-b{min-width:200px;padding:16px 26px;border-radius:22px;border:4px solid #c4c8cc;background:linear-gradient(#fff,#eceef0);font-weight:900;font-size:22px;color:#4c5054;transition:transform .15s,border-color .15s,box-shadow .15s}
.kt-b.big{min-width:260px;padding:26px 30px;font-size:28px}.kt-b small{display:block;font-size:15px;color:#7a7f84;font-weight:700;margin-top:4px}
.kt-b.sel{border-color:#1b5fae;background:linear-gradient(#e6f1ff,#cfe3ff)}
.kt-b.hover,.kt-d.hover,.kt-t.hover{border-color:#34bdef;box-shadow:0 0 0 5px rgba(52,189,239,.35);transform:scale(1.04)}
.kt-drivers{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin:10px 0}
.kt-d{position:relative;border-radius:20px;border:4px solid #d3d6d9;background:#fff;padding:8px;transition:transform .15s,border-color .15s,box-shadow .15s}
.kt-d .pic{aspect-ratio:1;border-radius:14px;overflow:hidden;background:#eef0f2}.kt-d b{display:block;font-size:19px;font-weight:900;margin-top:6px;color:#3d4145}.kt-d span{font-weight:700;color:#7a7f84;font-size:14px}
.kt-d .tag{position:absolute;top:-12px;padding:3px 10px;border-radius:999px;font-weight:900;font-size:14px;color:#fff;display:none}
.kt-d .t1{left:8px;background:#1b9fd6}.kt-d .t2{right:8px;background:#e5242f}
.kt-d.p1{border-color:#1b9fd6}.kt-d.p2{border-color:#e5242f}.kt-d.p1.p2{border-color:#8e44ad}.kt-d.p1 .t1,.kt-d.p2 .t2{display:block}.kt-d.ok1 .t1::after,.kt-d.ok2 .t2::after{content:' bereit'}
.kt-tracks{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin:10px 0}
.kt-t{border-radius:20px;border:4px solid #d3d6d9;background:#fff;padding:8px;transition:transform .15s,border-color .15s,box-shadow .15s}.kt-t img{width:100%;border-radius:12px;display:block}.kt-t b{display:block;font-size:20px;font-weight:900;margin-top:6px;color:#3d4145}.kt-t span{font-size:14px;font-weight:700;color:#7a7f84}
.kt-tbl{width:100%;border-collapse:collapse;font-weight:800;font-size:19px;margin:6px 0 10px}.kt-tbl td,.kt-tbl th{padding:4px 10px;border-bottom:2px solid #eceef0;text-align:left}.kt-tbl th{color:#9aa0a5;font-size:15px}.kt-tbl td.n{text-align:right;font-variant-numeric:tabular-nums}
.kt-tbl tr.me1 td{background:#e3f4fc}.kt-tbl tr.me2 td{background:#fde6e7}.kt-tbl .pic{width:32px;height:32px;border-radius:10px;overflow:hidden;display:inline-block;vertical-align:middle;margin-right:10px}
.kt-qr{display:flex;gap:16px;align-items:center;justify-content:center;background:#f3f5f7;border-radius:18px;padding:12px 16px;margin-top:14px;font-weight:800;text-align:left}.kt-qr .q{width:120px;height:120px}.kt-qr .q img{width:100%;height:100%;image-rendering:pixelated}
.kt-pod{display:flex;align-items:flex-end;justify-content:center;gap:12px;margin:10px 0 18px}.kt-pod .col{width:160px;display:flex;flex-direction:column;align-items:center;font-weight:900;color:#3d4145;font-size:19px}.kt-pod .pic{width:100px;height:100px;border-radius:16px;overflow:hidden;border:4px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.15)}.kt-pod .nm{margin:6px 0}.kt-pod .nm small{display:block;color:#7a7f84;font-size:15px}.kt-pod .blk{width:100%;border-radius:14px 14px 0 0;color:#fff;font-size:44px;display:grid;place-items:center;text-shadow:0 2px 0 rgba(0,0,0,.2)}
.kt-cup{width:110px;height:110px;margin:0 auto}`;

function open(box, K) {
  if (!document.getElementById('kt-css')) { const s = document.createElement('style'); s.id = 'kt-css'; s.textContent = CSS; document.head.appendChild(s); }
  box.innerHTML = `<div class="kt"><canvas id="kt-gl"></canvas><canvas id="kt-hud"></canvas><div class="kt-ov on" id="kt-ov"><div class="kt-card" id="kt-card"></div></div></div>`;
  const q = s => box.querySelector(s);
  const glCv = q('#kt-gl'), hud = q('#kt-hud'), hc = hud.getContext('2d'), ov = q('#kt-ov'), card = q('#kt-card');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: glCv, antialias: true }); }
  catch (e) { card.innerHTML = '<h2>Turbo-Flitzer</h2><p>WebGL ist in diesem Browser nicht verfügbar.</p><div class="kt-row"><button class="hv kt-b" id="kt-x">Zurück</button></div>'; q('#kt-x').onclick = () => K.closeChannel(); return {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  let W = 1, H = 1, dpr = 1;
  function resize() {
    W = box.clientWidth; H = box.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setSize(W, H, false); hud.width = W * dpr; hud.height = H * dpr;
    if (race) race.cams.forEach(c => { c.cam.aspect = (W / race.views) / H; c.cam.updateProjectionMatrix(); });
  }

  // ---------- Eingabe ----------
  const inp = { 1: mkIn(), 2: mkIn() };
  function mkIn() { return { steer: 0, remote: null, remoteT: 0, gas: false, brake: false, drift: false, item: false, kL: false, kR: false, kU: false, kD: false, kDr: false }; }
  const KEYS = { ArrowLeft: [1, 'kL'], ArrowRight: [1, 'kR'], ArrowUp: [1, 'kU'], ArrowDown: [1, 'kD'], Shift: [1, 'kDr'], Enter: [1, 'item'],
    a: [2, 'kL'], d: [2, 'kR'], w: [2, 'kU'], s: [2, 'kD'], f: [2, 'kDr'], e: [2, 'item'] };
  function onKey(e) {
    if (e.target.matches && e.target.matches('input,textarea')) return;
    const k = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (!k || state !== 'race') return;
    const down = e.type === 'keydown'; const pI = inp[k[0]];
    if (k[1] === 'item') { if (down && !e.repeat) pI.itemQ = true; } else pI[k[1]] = down;
    e.preventDefault();
  }
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);

  // ---------- Menüzustand ----------
  let state = 'title', players = 1, mode = 'single', diff = K.store.get('kt-diff', 1), picks = { 1: null, 2: null }, ok = { 1: false, 2: false }, cur = { 1: 0, 2: 1 };
  let cup = null, race = null, trackIdx = 0, paused = false, closed = false;
  const roster = () => DRIVERS.concat([avatarDriver()]);
  const DIFFS = ['Leicht', 'Mittel', 'Schwer'];

  function setPhones(m) { [1, 2].forEach(p => K.sendTo(p, { t: 'mode', m })); }
  function screen(html) { ov.classList.add('on'); ov.classList.remove('glass'); card.innerHTML = html; }
  function bind(sel, fn) { card.querySelectorAll(sel).forEach(el => el.addEventListener('click', e => fn(el, e))); }

  function qrBlock() {
    const ps = K.players();
    return `<div class="kt-qr"><div class="q">${K.qrHTML()}</div><div>Zweites Handy koppeln: QR-Code scannen<br>oder auf <span style="color:#1b9fd6">…/konsole/remote.html</span> den Code <b style="color:#1b9fd6;letter-spacing:.15em">${K.code()}</b> eingeben.<br>
      <span style="color:${ps.includes(1) ? '#2eaa4f' : '#9aa0a5'}">Spieler 1 ${ps.includes(1) ? 'verbunden' : 'fehlt'}</span> · <span style="color:${ps.includes(2) ? '#2eaa4f' : '#9aa0a5'}">Spieler 2 ${ps.includes(2) ? 'verbunden' : 'fehlt (sonst Tastatur WASD)'}</span></div></div>`;
  }
  function showTitle() {
    state = 'title'; setPhones('pointer'); Sound.music('menu');
    screen(`<h2>Turbo-Flitzer</h2><p>Kart-Rennen mit dem Handy als Lenkrad. Handy quer halten, neigen zum Lenken.</p>
      <div class="kt-row"><button class="hv kt-b big" data-p="1">1 Spieler<small>gegen 7 Computerfahrer</small></button><button class="hv kt-b big" data-p="2">2 Spieler<small>geteilter Bildschirm, 6 Computerfahrer</small></button></div>
      ${qrBlock()}<div class="kt-row"><button class="hv kt-b" id="kt-back">Zurück zum Menü</button></div>`);
    bind('[data-p]', el => { players = +el.dataset.p; showMode(); });
    bind('#kt-back', () => K.closeChannel());
  }
  function showMode() {
    state = 'mode';
    screen(`<h2>Spielmodus</h2><p>${players} Spieler</p>
      <div class="kt-row"><button class="hv kt-b big" data-m="single">Einzelrennen<small>eine Strecke, 3 Runden</small></button><button class="hv kt-b big" data-m="cup">Blitz-Cup<small>alle 4 Strecken, Punkte</small></button></div>
      <h3>Schwierigkeit</h3><div class="kt-row">${DIFFS.map((d, i) => `<button class="hv kt-b${i === diff ? ' sel' : ''}" data-d="${i}">${d}</button>`).join('')}</div>
      <div class="kt-row"><button class="hv kt-b" id="kt-back">Zurück</button></div>`);
    bind('[data-m]', el => { mode = el.dataset.m; showDrivers(); });
    bind('[data-d]', el => { diff = +el.dataset.d; K.store.set('kt-diff', diff); showMode(); });
    bind('#kt-back', showTitle);
  }
  function showDrivers() {
    state = 'drivers'; picks = { 1: null, 2: null }; ok = { 1: false, 2: false }; cur = { 1: 0, 2: 1 };
    const R = roster();
    screen(`<h2>Fahrer wählen</h2><p>Spieler 1: zeigen und A drücken (oder Steuerkreuz).${players === 2 ? ' Spieler 2: Steuerkreuz und A, mit B zurück.' : ''}</p>
      <div class="kt-drivers">${R.map((d, i) => `<button class="hv kt-d" data-i="${i}"><span class="tag t1">Spieler 1</span><span class="tag t2">Spieler 2</span><div class="pic">${portraitSVG(d)}</div><b>${esc(d.name)}</b><span>${CLASS[d.cls].label}${d.avatar ? ' · Avatar' : ''}</span></button>`).join('')}</div>
      <div class="kt-row"><button class="hv kt-b" id="kt-back">Zurück</button></div>`);
    bind('[data-i]', el => { cur[1] = +el.dataset.i; confirmPick(1); });
    bind('#kt-back', showMode);
    drawPicks();
  }
  function drawPicks() {
    card.querySelectorAll('.kt-d').forEach((el, i) => {
      el.classList.toggle('p1', cur[1] === i); el.classList.toggle('ok1', cur[1] === i && ok[1]);
      el.classList.toggle('p2', players === 2 && cur[2] === i); el.classList.toggle('ok2', players === 2 && cur[2] === i && ok[2]);
    });
  }
  function confirmPick(p) {
    if (p === 2 && players < 2) return;
    ok[p] = true; picks[p] = cur[p]; Sound.play('select'); drawPicks();
    if (ok[1] && (players === 1 || ok[2])) setTimeout(() => { if (state === 'drivers') mode === 'cup' ? showCupIntro() : showTracks(); }, 500);
  }
  function movePick(p, dx, dy) {
    if (ok[p] || (p === 2 && players < 2)) return;
    const n = roster().length, cols = Math.max(1, Math.round(card.querySelector('.kt-drivers').clientWidth / 164));
    cur[p] = (cur[p] + dx + dy * cols + n * 4) % n; Sound.play('hover'); drawPicks();
  }
  function showTracks() {
    state = 'tracks';
    screen(`<h2>Strecke wählen</h2><div class="kt-tracks">${TRACKS.map((t, i) => `<button class="hv kt-t" data-t="${i}"><img src="${trackPreview(t)}" alt=""><b>${t.name}</b><span>Rekord: ${fmtT(K.store.get('kt-best-' + i, null))}${t.grip < 1 ? ' · glatt' : ''}</span></button>`).join('')}</div>
      <div class="kt-row"><button class="hv kt-b" id="kt-back">Zurück</button></div>`);
    bind('[data-t]', el => startRace(+el.dataset.t));
    bind('#kt-back', showDrivers);
  }
  function showCupIntro() {
    state = 'cupintro';
    cup = { race: 0, pts: {}, field: null };
    screen(`<h2>Blitz-Cup</h2><p>4 Rennen, Punkte für jeden Platz: ${POINTS.join(' · ')}</p>
      <div class="kt-tracks">${TRACKS.map((t, i) => `<div class="kt-t"><img src="${trackPreview(t)}" alt=""><b>${i + 1}. ${t.name}</b></div>`).join('')}</div>
      <div class="kt-row"><button class="hv kt-b big" id="kt-go">Cup starten</button><button class="hv kt-b" id="kt-back">Zurück</button></div>`);
    bind('#kt-go', () => startRace(0));
    bind('#kt-back', showDrivers);
  }

  // ---------- Rennen ----------
  function buildField() {
    const R = roster(), humans = [picks[1]].concat(players === 2 ? [picks[2]] : []);
    const pool = DRIVERS.map((_, i) => i).filter(i => !humans.includes(i)).sort(() => Math.random() - 0.5);
    const ai = pool.slice(0, 8 - humans.length);
    return humans.map((di, k) => ({ d: R[di], human: k + 1, key: 'h' + (k + 1) })).concat(ai.map(i => ({ d: R[i], human: 0, key: 'd' + i })));
  }

  function startRace(ti) {
    trackIdx = ti;
    if (mode === 'cup') { if (!cup.field) cup.field = buildField(); }
    const field = mode === 'cup' ? cup.field : buildField();
    if (race) race.dispose();
    race = new Race(TRACKS[ti], field);
    ov.classList.remove('on'); state = 'race'; paused = false;
    resize(); setPhones('wheel'); Sound.music('race');
  }

  class Race {
    constructor(def, field) {
      this.def = def;
      const scene = this.scene = new THREE.Scene();
      scene.background = new THREE.Color(def.sky);
      scene.fog = new THREE.Fog(def.sky, def.theme === 'castle' ? 120 : 220, def.theme === 'castle' ? 520 : 900);
      scene.add(new THREE.HemisphereLight(def.theme === 'castle' ? '#7f8fd0' : '#ffffff', def.theme === 'castle' ? '#202030' : '#556b3a', def.theme === 'castle' ? 0.9 : 1.2));
      const sun = new THREE.DirectionalLight(def.theme === 'castle' ? '#b9c6ff' : '#ffffff', def.theme === 'castle' ? 0.8 : 1.6); sun.position.set(120, 260, 80); scene.add(sun);
      this.track = buildTrack(def, scene);
      const tr = this.track, N = tr.N;
      this.views = players; this.time = 0; this.count = 3.6; this.msgs = { 1: null, 2: null }; this.endT = null; this.done = false;
      this.traps = []; this.projs = []; this.lastBump = 0;
      // Startaufstellung: Spieler hinten
      const order = field.filter(f => !f.human).concat(field.filter(f => f.human));
      this.karts = order.map((f, slot) => {
        const row = Math.floor(slot / 2), col = slot % 2;
        const i = (N - 10 - row * 9 + N) % N, lat = (col ? 1 : -1) * tr.hw * 0.38;
        const m = makeKart(f.d); scene.add(m.g);
        const k = { f, d: f.d, human: f.human, st: CLASS[f.d.cls], m, x: tr.P[i].x + tr.R[i].x * lat, z: tr.P[i].z + tr.R[i].z * lat, vx: 0, vz: 0, h: Math.atan2(tr.T[i].x, tr.T[i].z),
          idx: i, lapC: -1, prog: -1 + i / N, fin: false, time: null, rank: 0, item: null, cnt: 0, roll: 0, boost: 0, drift: false, dDir: 0, charge: 0, prevDrift: false, hop: 0,
          spin: 0, spinA: 0, shrink: 0, gold: 0, shield: 0, ink: 0, lane: rnd(-0.4, 0.4), laneT: rnd(2, 5), aiT: 0, skill: rnd(0.96, 1.02), lat: lat, off: false, maxLap: 0, eng: null };
        if (k.human) k.eng = Sound.engine(players === 2 ? (k.human === 1 ? -0.6 : 0.6) : 0);
        return k;
      });
      this.cams = this.karts.filter(k => k.human).sort((a, b) => a.human - b.human).map(k => { const cam = new THREE.PerspectiveCamera(70, (W / players) / H, 0.5, 2000); return { k, cam, pos: new THREE.Vector3(k.x - Math.sin(k.h) * 9, 4, k.z - Math.cos(k.h) * 9) }; });
      // Projektil-Meshes
      this.geo = { oil: new THREE.CircleGeometry(1.6, 16), ball: new THREE.SphereGeometry(0.7, 14, 10), drone: new THREE.SphereGeometry(0.75, 14, 10) };
      this.mat = { oil: new THREE.MeshBasicMaterial({ color: '#15151c' }), ball: new THREE.MeshLambertMaterial({ color: '#2bb34a', emissive: '#0b4a18' }), drone: new THREE.MeshLambertMaterial({ color: '#e5242f', emissive: '#550000' }) };
      this.minimap = this.mkMinimap();
      this.beeped = 4;
    }
    mkMinimap() {
      const tr = this.track, b = tr.bounds, cv = document.createElement('canvas'), S = 170; cv.width = cv.height = S; const c = cv.getContext('2d');
      const sc = (S - 20) / Math.max(b.maxX - b.minX, b.maxZ - b.minZ), ox = S / 2 - (b.minX + b.maxX) / 2 * sc, oz = S / 2 - (b.minZ + b.maxZ) / 2 * sc;
      c.lineJoin = 'round'; c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 9; c.beginPath(); tr.P.forEach((p, i) => i % 7 === 0 && (i ? c.lineTo(p.x * sc + ox, p.z * sc + oz) : c.moveTo(p.x * sc + ox, p.z * sc + oz))); c.closePath(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.stroke();
      return { cv, sc, ox, oz, S };
    }
    dispose() {
      this.karts.forEach(k => k.eng && k.eng.stop());
      this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    }
    fwd(k) { return { x: Math.sin(k.h), z: Math.cos(k.h) }; }
    rankOf(k) { return k.rank; }
    hit(k, why) {
      if (k.gold > 0) return false;
      if (k.shield > 0) { k.shield = 0; if (k.human) Sound.play('shield'); return false; }
      k.spin = 1.15; k.drift = false; k.charge = 0; k.boost = 0;
      const f = this.fwd(k); k.vx *= 0.3; k.vz *= 0.3; void f;
      if (k.human) { Sound.play('spin'); this.msg(k.human, why || 'Getroffen!', 1.2); }
      return true;
    }
    msg(p, text, t = 1.6) { this.msgs[p] = { text, t }; }
    useItem(k) {
      if (!k.item || k.roll > 0 || k.spin > 0) return;
      const type = k.item, f = this.fwd(k), tr = this.track;
      const H = k.human;
      if (type === 'turbo' || type === 'triple') { k.boost = Math.max(k.boost, 1.3); if (H) Sound.play('boost'); if (type === 'triple') { k.cnt--; if (k.cnt > 0) return; } }
      else if (type === 'oil') { const m = new THREE.Mesh(this.geo.oil, this.mat.oil); m.rotation.x = -Math.PI / 2; const x = k.x - f.x * 3.2, z = k.z - f.z * 3.2; m.position.set(x, 0.08, z); this.scene.add(m); this.traps.push({ x, z, m, life: 45, owner: k, safe: 0.5 }); if (H) Sound.play('throw'); }
      else if (type === 'ball' || type === 'drone') {
        const m = new THREE.Mesh(this.geo[type], this.mat[type]); const x = k.x + f.x * 3, z = k.z + f.z * 3; m.position.set(x, 0.8, z); this.scene.add(m);
        const sp = type === 'ball' ? 78 : 72;
        let target = null; if (type === 'drone') target = this.karts.find(o => o.rank === k.rank - 1 && !o.fin) || null;
        this.projs.push({ type, x, z, vx: f.x * sp, vz: f.z * sp, m, life: type === 'ball' ? 7 : 11, owner: k, safe: 0.4, idx: k.idx, bounce: 0, target });
        if (H) Sound.play('throw');
      }
      else if (type === 'shield') { k.shield = 10; if (H) Sound.play('shield'); }
      else if (type === 'gold') { k.gold = 7; k.spin = 0; if (H) Sound.play('gold'); }
      else if (type === 'shrink') {
        if (H || this.karts.some(o => o.human)) Sound.play('shrink');
        this.karts.forEach(o => { if (o === k || o.gold > 0) return; if (o.shield > 0) { o.shield = 0; return; } o.shrink = 5; o.spin = Math.max(o.spin, 0.5); if (o.human) this.msg(o.human, 'Geschrumpft!', 1.5); });
      }
      else if (type === 'ink') {
        Sound.play('ink');
        this.karts.forEach(o => { if (o !== k && o.rank < k.rank && o.gold <= 0) { o.ink = 4.5; if (o.human) this.msg(o.human, 'Tinte!', 1.2); } });
      }
      k.item = null; k.cnt = 0;
    }

    input(k, dt) {
      if (k.human && !k.fin) {
        const I = inp[k.human];
        let kb = (I.kR ? 1 : 0) - (I.kL ? 1 : 0);
        let target = kb;
        if (!kb && I.remote != null && performance.now() - I.remoteT < 600) target = I.remote;
        I.steer = lerp(I.steer, target, Math.min(1, dt * (kb ? 8 : 14)));
        const it = I.itemQ; I.itemQ = false;
        return { steer: I.steer, gas: I.gas || I.kU, brake: I.brake || I.kD, drift: I.drift || I.kDr, item: it };
      }
      // Computerfahrer (und Autopilot nach dem Ziel)
      const tr = this.track, N = tr.N, sp = Math.hypot(k.vx, k.vz);
      k.laneT -= dt; if (k.laneT < 0) { k.lane = clamp(k.lane + rnd(-0.35, 0.35), -0.5, 0.5); k.laneT = rnd(2, 5); }
      const look = 16 + Math.floor(sp * 0.35), ti = (k.idx + look) % N;
      let ax = tr.P[ti].x + tr.R[ti].x * k.lane * tr.hw, az = tr.P[ti].z + tr.R[ti].z * k.lane * tr.hw;
      for (const t of this.traps) { const dx = t.x - k.x, dz = t.z - k.z; if (dx * dx + dz * dz < 400) { const f = this.fwd(k); if (dx * f.x + dz * f.z > 0) { const s = (dx * f.z - dz * f.x) > 0 ? -1 : 1; ax += tr.R[ti].x * s * 4; az += tr.R[ti].z * s * 4; } } }
      const want = Math.atan2(ax - k.x, az - k.z), df = wrapA(want - k.h);
      let steer = clamp(-df * 2.4, -1, 1);
      if (k.ink > 0) steer += Math.sin(this.time * 7 + k.lane * 9) * 0.5;
      let item = false;
      if (k.item && k.roll <= 0) {
        k.aiT -= dt;
        if (k.item === 'ball' || k.item === 'drone') { const ahead = this.karts.find(o => o.rank === k.rank - 1); if (ahead && Math.hypot(ahead.x - k.x, ahead.z - k.z) < 45 && k.aiT < 1.5) item = true; }
        if (k.aiT < 0) item = true;
      }
      return { steer, gas: true, brake: Math.abs(df) > 1.25 && sp > 22, drift: false, item };
    }

    physics(k, I, dt) {
      const tr = this.track, st = k.st;
      if (k.spin > 0) { k.spin -= dt; k.spinA += dt * 14; I = { steer: 0, gas: false, brake: false, drift: false }; } else k.spinA = 0;
      if (this.count > 0) I = { steer: 0, gas: false, brake: false, drift: false };
      const near = tr.nearest(k.idx, k.x, k.z);
      const prev = k.idx; k.idx = near.i; k.lat = near.lat;
      // Runden
      const N = tr.N;
      if (prev > N * 0.8 && k.idx < N * 0.2) {
        k.lapC++;
        if (k.lapC > k.maxLap) {
          k.maxLap = k.lapC;
          if (k.human && !k.fin) { if (k.lapC === LAPS - 1) { Sound.play('finalLap'); this.msg(k.human, 'Letzte Runde!', 2); } else if (k.lapC > 0 && k.lapC < LAPS) Sound.play('lap'); }
        }
        if (k.lapC >= LAPS && !k.fin) this.finish(k);
      } else if (prev < N * 0.2 && k.idx > N * 0.8) k.lapC--;
      k.prog = k.lapC + k.idx / N;

      const off = Math.abs(k.lat) > tr.hw + 0.8; k.off = off;
      const rb = k.human ? 1 : this.rubber(k);
      let vmax = 41 * st.vmax * (k.human ? 1 : [0.84, 0.93, 1.0][diff] * k.skill * rb);
      if (k.shrink > 0) vmax *= 0.68;
      if (k.gold > 0) vmax *= 1.22;
      if (k.boost > 0) vmax *= 1.38;
      if (off && k.boost <= 0 && k.gold <= 0) vmax *= 0.45;
      const f = this.fwd(k), r = { x: -f.z, z: f.x };
      let fs = k.vx * f.x + k.vz * f.z, ls = k.vx * r.x + k.vz * r.z;
      if (I.gas) { if (fs < vmax) fs += 27 * st.acc * dt * (1 - Math.max(0, fs) / vmax * 0.85); }
      if (fs > vmax) fs -= (fs - vmax) * 2.5 * dt;
      if (I.brake) { fs -= (fs > 0 ? 42 : 14) * dt; fs = Math.max(fs, -12); }
      if (!I.gas && !I.brake) fs -= Math.sign(fs) * Math.min(Math.abs(fs), 9 * dt);
      if (k.boost > 0) { k.boost -= dt; fs = Math.min(vmax, fs + 60 * dt); }
      // Driften
      if (I.drift && !k.prevDrift && Math.abs(fs) > 10 && k.hop <= 0) k.hop = 0.28;
      if (I.drift && !k.drift && Math.abs(fs) > 14 && Math.abs(I.steer) > 0.3 && k.spin <= 0) { k.drift = true; k.dDir = Math.sign(I.steer); k.charge = 0; }
      if (k.drift) {
        k.charge += dt * (0.8 + 0.5 * Math.abs(I.steer + k.dDir * 0.2));
        const lvl = k.charge > 2.1 ? 2 : k.charge > 0.95 ? 1 : 0;
        if (k.human && lvl > (k.lvl || 0)) Sound.play('spark'); k.lvl = lvl;
        if (!I.drift || Math.abs(fs) < 9) {
          k.drift = false;
          if (lvl) { k.boost = Math.max(k.boost, lvl === 2 ? 1.15 : 0.6); if (k.human) Sound.play('boost'); }
          k.lvl = 0; k.charge = 0;
        }
      }
      k.prevDrift = I.drift;
      if (k.hop > 0) k.hop -= dt;
      const grip = tr.def.grip * (k.drift ? 0.3 : 1) * 9;
      ls *= Math.exp(-grip * dt);
      const spF = clamp(Math.abs(fs) / 14, 0, 1), dir = fs >= 0 ? 1 : -1;
      let rate = k.drift ? (k.dDir * 0.72 + I.steer * 0.45) * 2.05 * st.hand : I.steer * 1.95 * st.hand * (1 - 0.32 * clamp(fs / 41, 0, 1));
      if (k.shrink > 0) rate *= 1.1;
      k.h -= rate * spF * dir * dt;
      const nf = this.fwd(k), nr = { x: -nf.z, z: nf.x };
      k.vx = nf.x * fs + nr.x * ls; k.vz = nf.z * fs + nr.z * ls;
      k.x += k.vx * dt; k.z += k.vz * dt;
      // Streckenrand
      const lim = tr.hw + 22;
      if (Math.abs(k.lat) > lim) {
        const R = tr.R[k.idx], s = Math.sign(k.lat), over = Math.abs(k.lat) - lim;
        k.x -= R.x * s * over; k.z -= R.z * s * over;
        const vn = k.vx * R.x + k.vz * R.z; if (vn * s > 0) { k.vx -= R.x * vn * 1.4; k.vz -= R.z * vn * 1.4; }
      }
      // Timer
      for (const t of ['shrink', 'gold', 'shield', 'ink']) if (k[t] > 0) k[t] = Math.max(0, k[t] - dt);
      if (k.roll > 0) { k.roll -= dt; if (k.human && Math.random() < 0.5) Sound.play('roll'); if (k.roll <= 0 && k.human) Sound.play('itemGet'); }
      if (I.item) this.useItem(k);
      return fs;
    }
    rubber(k) {
      const hs = this.karts.filter(o => o.human); if (!hs.length) return 1;
      const best = Math.max(...hs.map(o => o.prog)), d = k.prog - best;
      return d > 0.12 ? 0.92 : d < -0.15 ? 1.08 : 1;
    }
    finish(k) {
      k.fin = true; k.time = this.time;
      if (k.human) {
        Sound.play('finish'); this.msg(k.human, 'Ziel! ' + (this.karts.filter(o => o.fin).length) + '. Platz', 5);
        K.sendTo(k.human, { t: 'mode', m: 'pointer' });
        const bk = 'kt-best-' + trackIdx, b = K.store.get(bk, null); if (b == null || k.time < b) K.store.set(bk, k.time);
      }
    }

    update(dt) {
      if (this.count > 0) {
        this.count -= dt; const n = Math.ceil(this.count - 0.6);
        if (n < this.beeped && n >= 1 && n <= 3) { this.beeped = n; Sound.play('beep'); }
        if (this.count <= 0.6 && this.beeped > 0) { this.beeped = 0; Sound.play('beepGo'); }
      } else this.time += dt;
      const tr = this.track;
      // Kristalle
      tr.crystalMat.emissive.setHSL((this.time * 0.15) % 1, 0.9, 0.45);
      for (const b of tr.boxes) {
        b.mesh.rotation.y += dt * 1.5; b.mesh.rotation.x += dt * 0.7; b.mesh.position.y = 1.6 + Math.sin(this.time * 2 + b.x) * 0.25;
        if (b.t > 0) { b.t -= dt; b.mesh.visible = b.t <= 0; }
      }
      for (const k of this.karts) {
        const I = this.input(k, dt), fs = this.physics(k, I, dt);
        if (k.eng) k.eng.set(Math.abs(fs), !this.done);
        for (const b of tr.boxes) {
          if (b.t > 0) continue; const dx = b.x - k.x, dz = b.z - k.z;
          if (dx * dx + dz * dz < 7.5) { b.t = 2.5; b.mesh.visible = false; if (!k.item) { k.item = rollItem(k.rank || 8, this.karts.length); k.cnt = k.item === 'triple' ? 3 : 1; k.roll = k.human ? 1.1 : 0; k.aiT = rnd(1, 4); if (k.human) Sound.play('pickup'); } }
        }
      }
      // Kollisionen Kart gegen Kart
      for (let i = 0; i < this.karts.length; i++) for (let j = i + 1; j < this.karts.length; j++) {
        const a = this.karts[i], b = this.karts[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        const ra = a.shrink > 0 ? 0.65 : 1.25, rb = b.shrink > 0 ? 0.65 : 1.25;
        if (d > 0.01 && d < ra + rb) {
          const nx = dx / d, nz = dz / d, ov2 = ra + rb - d, wa = a.st.w * (a.shrink > 0 ? 0.4 : 1) * (a.gold > 0 ? 5 : 1), wb = b.st.w * (b.shrink > 0 ? 0.4 : 1) * (b.gold > 0 ? 5 : 1), s = wa + wb;
          a.x -= nx * ov2 * wb / s; a.z -= nz * ov2 * wb / s; b.x += nx * ov2 * wa / s; b.z += nz * ov2 * wa / s;
          const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
          if (rv < 0) { const imp = -rv * 1.3; a.vx -= nx * imp * wb / s; a.vz -= nz * imp * wb / s; b.vx += nx * imp * wa / s; b.vz += nz * imp * wa / s; }
          if (a.gold > 0 && b.gold <= 0) this.hit(b); if (b.gold > 0 && a.gold <= 0) this.hit(a);
          if (a.shrink > 0 && b.shrink <= 0 && b.gold <= 0) this.hit(a, 'Plattgefahren!'); if (b.shrink > 0 && a.shrink <= 0 && a.gold <= 0) this.hit(b, 'Plattgefahren!');
          if ((a.human || b.human) && this.time - this.lastBump > 0.25 && Math.abs(rv) > 4) { this.lastBump = this.time; Sound.play('bump'); }
        }
      }
      // Fallen
      for (const t of this.traps) {
        t.life -= dt; t.safe -= dt;
        for (const k of this.karts) { if (t.safe > 0 && k === t.owner) continue; const dx = t.x - k.x, dz = t.z - k.z; if (dx * dx + dz * dz < 4.5) { this.hit(k, 'Ausgerutscht!'); t.life = 0; break; } }
        if (t.life <= 0) { this.scene.remove(t.m); }
      }
      this.traps = this.traps.filter(t => t.life > 0);
      // Geschosse
      for (const p of this.projs) {
        p.life -= dt; p.safe -= dt;
        const nr = tr.nearest(p.idx, p.x, p.z, 30); p.idx = nr.i;
        if (p.type === 'drone') {
          let ax, az;
          const tg = p.target && !p.target.fin ? p.target : null;
          if (tg && Math.hypot(tg.x - p.x, tg.z - p.z) < 40) { ax = tg.x; az = tg.z; }
          else { const ti = (p.idx + 14) % tr.N; ax = tr.P[ti].x; az = tr.P[ti].z; }
          const dx = ax - p.x, dz = az - p.z, dl = Math.hypot(dx, dz) || 1;
          p.vx = lerp(p.vx, dx / dl * 72, Math.min(1, dt * 5)); p.vz = lerp(p.vz, dz / dl * 72, Math.min(1, dt * 5));
        } else if (Math.abs(nr.lat) > tr.hw + 1.2) {
          const R = tr.R[p.idx], s = Math.sign(nr.lat), vn = p.vx * R.x + p.vz * R.z;
          if (vn * s > 0) { p.vx -= 2 * vn * R.x; p.vz -= 2 * vn * R.z; p.bounce++; if (p.bounce > 5) p.life = 0; }
        }
        p.x += p.vx * dt; p.z += p.vz * dt;
        p.m.position.set(p.x, 0.8 + (p.type === 'drone' ? Math.sin(this.time * 12) * 0.15 + 0.6 : 0), p.z); p.m.rotation.y += dt * 8;
        for (const k of this.karts) {
          if (p.safe > 0 && k === p.owner) continue;
          const dx = k.x - p.x, dz = k.z - p.z;
          if (dx * dx + dz * dz < 5) { this.hit(k); p.life = 0; break; }
        }
        for (const o of this.projs) { if (o !== p && o.life > 0 && p.life > 0) { const dx = o.x - p.x, dz = o.z - p.z; if (dx * dx + dz * dz < 2.5) { o.life = 0; p.life = 0; } } }
        for (const t of this.traps) { const dx = t.x - p.x, dz = t.z - p.z; if (p.life > 0 && dx * dx + dz * dz < 3.5) { t.life = 0; this.scene.remove(t.m); p.life = 0; } }
        if (p.life <= 0) this.scene.remove(p.m);
      }
      this.projs = this.projs.filter(p => p.life > 0);
      this.traps = this.traps.filter(t => t.life > 0);
      // Platzierung
      const sorted = [...this.karts].sort((a, b) => (a.fin && b.fin) ? a.time - b.time : a.fin ? -1 : b.fin ? 1 : b.prog - a.prog);
      sorted.forEach((k, i) => k.rank = i + 1);
      // Nachrichten
      for (const p of [1, 2]) if (this.msgs[p]) { this.msgs[p].t -= dt; if (this.msgs[p].t <= 0) this.msgs[p] = null; }
      // Ende
      const hs = this.karts.filter(k => k.human);
      if (!this.done && (hs.every(k => k.fin) || this.time > 480)) { this.done = true; this.endT = 4; }
      if (this.done) { this.endT -= dt; if (this.endT <= 0 && state === 'race') { this.complete(); return; } }
      // Handy-Anzeige
      this.hudT = (this.hudT || 0) - dt;
      if (this.hudT <= 0) { this.hudT = 0.5; hs.forEach(k => K.sendTo(k.human, { t: 'hud', pos: k.rank, lap: clamp(k.lapC + 1, 1, LAPS), item: k.item && k.roll <= 0 ? ITEM_NAMES[k.item] : '' })); }
      this.visuals(dt);
    }
    complete() {
      const avg = this.track.len / (41 * 0.86);
      this.karts.forEach(k => { if (!k.fin) { k.time = this.time + Math.max(0, LAPS - k.prog) * avg + k.rank * 0.3; } });
      const res = [...this.karts].sort((a, b) => a.time - b.time);
      res.forEach((k, i) => k.rank = i + 1);
      this.karts.forEach(k => k.eng && k.eng.set(0, false));
      showResults(res);
    }
    visuals(dt) {
      for (const k of this.karts) {
        const m = k.m;
        m.g.position.set(k.x, k.hop > 0 ? Math.sin((0.28 - k.hop) / 0.28 * Math.PI) * 0.7 : 0, k.z);
        m.g.rotation.y = k.h;
        m.body.rotation.y = (k.drift ? -k.dDir * 0.45 : 0) + k.spinA;
        m.body.rotation.z = clamp(-(inp[k.human] ? inp[k.human].steer : 0) * 0.04, -0.1, 0.1);
        const sp = Math.hypot(k.vx, k.vz);
        m.wheels.forEach(w => w.rotation.x += sp * dt * 2.2);
        const s = k.shrink > 0 ? 0.5 : 1; m.g.scale.setScalar(lerp(m.g.scale.x, s, Math.min(1, dt * 8)));
        m.flame.visible = k.boost > 0 || k.gold > 0; m.flame.scale.setScalar(0.8 + Math.random() * 0.5); m.flame.material.color.set(k.gold > 0 ? '#ffd23d' : '#ff8a1f');
        const lvl = k.drift ? (k.charge > 2.1 ? 2 : k.charge > 0.95 ? 1 : 0) : -1;
        m.sparks.forEach(sk => { sk.visible = lvl >= 0; sk.scale.setScalar(0.6 + Math.random() * 0.7); });
        m.sparkMat.color.set(lvl === 2 ? '#ff8a1f' : lvl === 1 ? '#4fd6ff' : '#ffffff');
        m.shield.visible = k.shield > 0;
        if (k.gold > 0) m.kartMat.color.setHSL(0.13, 1, 0.5 + Math.sin(this.time * 20) * 0.15); else m.kartMat.color.copy(m.baseColor);
      }
      for (const c of this.cams) {
        const k = c.k, f = this.fwd(k);
        const back = k.shrink > 0 ? 6 : 9, hgt = k.shrink > 0 ? 3 : 4;
        const want = new THREE.Vector3(k.x - f.x * back, hgt, k.z - f.z * back);
        c.pos.lerp(want, Math.min(1, dt * 6));
        c.cam.position.copy(c.pos);
        c.cam.lookAt(k.x + f.x * 6, 1.5, k.z + f.z * 6);
        const fov = 68 + (k.boost > 0 || k.gold > 0 ? 10 : 0); c.cam.fov = lerp(c.cam.fov, fov, Math.min(1, dt * 4)); c.cam.updateProjectionMatrix();
      }
    }
    render() {
      renderer.setScissorTest(true);
      const vw = W / this.views;
      this.cams.forEach((c, i) => { renderer.setViewport(i * vw, 0, vw, H); renderer.setScissor(i * vw, 0, vw, H); renderer.render(this.scene, c.cam); });
      renderer.setScissorTest(false);
      this.drawHud();
    }
    drawHud() {
      const c = hc; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      const vw = W / this.views, fs = clamp(H * 0.075, 30, 70);
      const T = (s, x, y, size, col, al = 'left', base = 'top') => { c.font = `900 ${size}px Nunito, sans-serif`; c.textAlign = al; c.textBaseline = base; c.lineJoin = 'round'; c.lineWidth = size * 0.18; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(s, x, y); c.fillStyle = col; c.fillText(s, x, y); };
      this.cams.forEach((cm, vi) => {
        const k = cm.k, x0 = vi * vw;
        c.save(); c.beginPath(); c.rect(x0, 0, vw, H); c.clip();
        // Tinte
        if (k.ink > 0) { c.fillStyle = `rgba(55,25,105,${Math.min(0.92, k.ink / 2)})`; for (let i = 0; i < 9; i++) { const a = i * 2.3, r = H * (0.12 + (i % 3) * 0.06); c.beginPath(); c.arc(x0 + vw * (0.2 + (i * 0.37) % 0.6), H * (0.25 + (i * 0.23) % 0.5), r, 0, TAU); c.fill(); } }
        // Platz und Runde
        const rk = k.rank, col = rk === 1 ? '#ffd23d' : rk === 2 ? '#e8eef2' : rk === 3 ? '#ffae6b' : '#ffffff';
        T(rk + '.', x0 + 22, 16, fs * 1.35, col);
        T('Runde ' + clamp(k.lapC + 1, 1, LAPS) + '/' + LAPS, x0 + 26, 22 + fs * 1.35, fs * 0.42, '#ffffff');
        T(fmtT(this.time), x0 + 26, H - 20, fs * 0.42, '#ffffff', 'left', 'bottom');
        // Item-Feld
        const bs = clamp(H * 0.12, 60, 110), bx = x0 + vw - bs - 22, by = 18;
        c.fillStyle = 'rgba(255,255,255,.88)'; c.strokeStyle = players === 2 ? (k.human === 1 ? '#1b9fd6' : '#e5242f') : '#1b9fd6'; c.lineWidth = 5;
        c.beginPath(); c.roundRect(bx, by, bs, bs, 18); c.fill(); c.stroke();
        if (k.item) { const show = k.roll > 0 ? ITEM_LIST[Math.floor(this.time * 14) % ITEM_LIST.length] : k.item; drawIcon(c, show, bx + bs / 2, by + bs / 2, bs * 0.95); if (k.item === 'triple' && k.roll <= 0) T('×' + k.cnt, bx + bs - 6, by + bs - 4, bs * 0.28, '#ffffff', 'right', 'bottom'); }
        if (k.drift) { const lvl = k.charge > 2.1 ? 2 : k.charge > 0.95 ? 1 : 0; if (lvl) T(lvl === 2 ? 'Mega-Turbo bereit' : 'Turbo bereit', x0 + vw / 2, H * 0.82, fs * 0.38, lvl === 2 ? '#ff9a3d' : '#4fd6ff', 'center'); }
        // Minikarte
        const mm = this.minimap, ms = clamp(H * 0.24, 110, 170), mx = x0 + vw - ms - 16, my = H - ms - 16;
        c.globalAlpha = 0.9; c.drawImage(mm.cv, mx, my, ms, ms); c.globalAlpha = 1;
        const f = ms / mm.S;
        for (const o of this.karts) { const px = mx + (o.x * mm.sc + mm.ox) * f, py = my + (o.z * mm.sc + mm.oz) * f; c.fillStyle = o.d.kart; c.beginPath(); c.arc(px, py, o === k ? 7 : 5, 0, TAU); c.fill(); c.strokeStyle = o.human ? (o.human === 1 ? '#1b9fd6' : '#e5242f') : '#000'; c.lineWidth = o.human ? 3 : 1.5; c.stroke(); }
        // Nachrichten
        const m = this.msgs[k.human]; if (m) T(m.text, x0 + vw / 2, H * 0.3, fs * 0.8, '#ffffff', 'center');
        if (players === 2) { c.fillStyle = k.human === 1 ? '#1b9fd6' : '#e5242f'; c.fillRect(x0, H - 6, vw, 6); }
        c.restore();
      });
      if (this.views === 2) { c.fillStyle = '#000'; c.fillRect(W / 2 - 2, 0, 4, H); }
      if (this.count > 0) { const n = Math.ceil(this.count - 0.6); T(n >= 1 ? String(Math.min(3, n)) : 'Los!', W / 2, H * 0.38, H * 0.2, n >= 1 ? '#ffffff' : '#ffd23d', 'center', 'middle'); }
      if (paused) { c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, 0, W, H); }
    }
  }

  function showResults(res) {
    state = 'results'; setPhones('pointer'); Sound.music('menu');
    const R = res;
    let cupRows = '';
    if (mode === 'cup') {
      R.forEach((k, i) => { cup.pts[k.f.key] = (cup.pts[k.f.key] || 0) + POINTS[i]; });
    }
    const rows = R.map((k, i) => `<tr class="${k.human ? 'me' + k.human : ''}"><td class="n">${i + 1}.</td><td><span class="pic">${portraitSVG(k.d)}</span>${esc(k.d.name)}${k.human ? ' (Spieler ' + k.human + ')' : ''}</td><td class="n">${fmtT(k.time)}${k.fin ? '' : ' *'}</td>${mode === 'cup' ? `<td class="n">+${POINTS[i]}</td><td class="n">${cup.pts[k.f.key]}</td>` : ''}</tr>`).join('');
    const last = mode === 'cup' && trackIdx === TRACKS.length - 1;
    ov.classList.add('on', 'glass');
    card.innerHTML = `<h2>${TRACKS[trackIdx].name}</h2><p>${mode === 'cup' ? 'Rennen ' + (trackIdx + 1) + ' von ' + TRACKS.length : 'Ergebnis'}</p>
      <table class="kt-tbl"><tr><th></th><th>Fahrer</th><th style="text-align:right">Zeit</th>${mode === 'cup' ? '<th style="text-align:right">Punkte</th><th style="text-align:right">Gesamt</th>' : ''}</tr>${rows}</table>
      <p style="font-size:14px">* geschätzt, Fahrer war beim Rennende noch unterwegs</p>
      <div class="kt-row">${mode === 'cup' ? `<button class="hv kt-b big" id="kt-next">${last ? 'Siegerehrung' : 'Nächstes Rennen'}</button>` : `<button class="hv kt-b big" id="kt-again">Nochmal</button><button class="hv kt-b" id="kt-tr">Andere Strecke</button>`}<button class="hv kt-b" id="kt-menu">Kart-Menü</button></div>`;
    void cupRows;
    bind('#kt-next', () => last ? showPodium() : startRace(trackIdx + 1));
    bind('#kt-again', () => startRace(trackIdx));
    bind('#kt-tr', () => { cleanupRace(); showTracks(); });
    bind('#kt-menu', () => { cleanupRace(); showTitle(); });
  }
  function showPodium() {
    const list = cup.field.map(f => ({ f, pts: cup.pts[f.key] || 0 })).sort((a, b) => b.pts - a.pts);
    const top = [list[1], list[0], list[2]], hs = [150, 200, 120], cols = ['#b8c2cc', '#f0b72f', '#d0864a'];
    cleanupRace(); state = 'podium'; Sound.play('record');
    screen(`<h2>Siegerehrung</h2><svg class="kt-cup" viewBox="0 0 100 100"><path d="M28 14h44v18c0 18-10 30-22 30S28 50 28 32z" fill="#f0b72f"/><path d="M28 20H14c0 16 8 22 16 22M72 20h14c0 16-8 22-16 22" stroke="#f0b72f" stroke-width="6" fill="none"/><rect x="44" y="60" width="12" height="14" fill="#d79c1c"/><rect x="30" y="74" width="40" height="12" rx="3" fill="#8a5533"/></svg>
      <div class="kt-pod">${top.map((x, i) => x ? `<div class="col"><div class="pic">${portraitSVG(x.f.d)}</div><div class="nm">${esc(x.f.d.name)}<small>${x.pts} Punkte</small></div><div class="blk" style="height:${hs[i] * 0.6}px;background:${cols[i]}">${[2, 1, 3][i]}</div></div>` : '').join('')}</div>
      <table class="kt-tbl">${list.map((x, i) => `<tr class="${x.f.human ? 'me' + x.f.human : ''}"><td class="n">${i + 1}.</td><td>${esc(x.f.d.name)}${x.f.human ? ' (Spieler ' + x.f.human + ')' : ''}</td><td class="n">${x.pts}</td></tr>`).join('')}</table>
      <div class="kt-row"><button class="hv kt-b big" id="kt-menu">Kart-Menü</button></div>`);
    bind('#kt-menu', showTitle);
  }
  function cleanupRace() { if (race) { race.dispose(); race = null; } hc.setTransform(1, 0, 0, 1, 0, 0); hc.clearRect(0, 0, hud.width, hud.height); renderer.setClearColor('#000'); renderer.clear(); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  resize(); addEventListener('resize', resize);
  window.__kt = () => ({ race, state, inp });
  showTitle();

  return {
    onFrame(dt) {
      if (state === 'race' && race && !paused) { race.update(Math.min(dt, 1 / 30)); if (race) race.render(); }
    },
    onPause(p) {
      paused = p;
      if (state === 'race' && race) { setPhones(p ? 'pointer' : 'wheel'); race.karts.forEach(k => k.eng && k.eng.set(0, !p)); race.render(); }
    },
    onSteer(v, p) { inp[p].remote = clamp(+v || 0, -1, 1); inp[p].remoteT = performance.now(); },
    onRemotes() { if (state === 'title') showTitle(); },
    onButton(name, down, p) {
      if (state === 'race') {
        const I = inp[p];
        if (name === 'GAS' || name === 'A') { I.gas = down; return true; }
        if (name === 'BRAKE' || name === 'B') { I.brake = down; return true; }
        if (name === 'DRIFT') { I.drift = down; return true; }
        if (name === 'ITEM') { if (down) I.itemQ = true; return true; }
        if (['UP', 'DOWN', 'LEFT', 'RIGHT', 'PLUS', 'MINUS'].includes(name)) return true;
        return false;
      }
      if (state === 'drivers' && down) {
        if (name === 'LEFT') { movePick(p, -1, 0); return true; }
        if (name === 'RIGHT') { movePick(p, 1, 0); return true; }
        if (name === 'UP') { movePick(p, 0, -1); return true; }
        if (name === 'DOWN') { movePick(p, 0, 1); return true; }
        if (p === 2 && name === 'A') { confirmPick(2); return true; }
        if (name === 'B' && ok[p]) { ok[p] = false; drawPicks(); return true; }
        if (p === 2) return true;
      }
      if (p === 2) return true; // Spieler 2 bedient außerhalb der Fahrerwahl keine Menüs
      if (name === 'B' && down && state !== 'title') { ({ mode: showTitle, drivers: showMode, tracks: showDrivers, cupintro: showDrivers })[state]?.(); return true; }
      return false;
    },
    close() {
      closed = true; removeEventListener('resize', resize); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey);
      setPhones('pointer'); if (race) race.dispose(); race = null; renderer.dispose();
    },
  };
}

const tileSVG = big => `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">
  <defs><linearGradient id="ksk${big}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5cc4ff"/><stop offset="1" stop-color="#bfe8ff"/></linearGradient>
  <style>.kr{animation:kr 1.2s ease-in-out infinite alternate}@keyframes kr{to{transform:translateX(10px)}}.kl{animation:kl .4s linear infinite}@keyframes kl{to{stroke-dashoffset:-40}}@media(prefers-reduced-motion:reduce){.kr,.kl{animation:none}}</style></defs>
  <rect width="320" height="200" fill="url(#ksk${big})"/><path d="M0 120 Q80 95 160 110 T320 105 V200 H0Z" fill="#5fb84a"/>
  <path d="M120 200 L150 112 L170 112 L260 200Z" fill="#5d6169"/><path class="kl" d="M160 114 L190 200" stroke="#fff" stroke-width="4" stroke-dasharray="14 14"/>
  <g class="kr" transform="translate(132 132)"><rect x="0" y="22" width="64" height="20" rx="6" fill="#e5242f"/><rect x="10" y="8" width="16" height="18" rx="4" fill="#2f3b52"/><circle cx="18" cy="6" r="9" fill="#ffffff"/><rect x="14" y="3" width="10" height="4" fill="#222"/>
  <circle cx="12" cy="44" r="8" fill="#1d1d22"/><circle cx="54" cy="44" r="8" fill="#1d1d22"/><rect x="54" y="12" width="14" height="5" fill="#e5242f"/></g>
  ${big ? '<text x="160" y="40" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="28" fill="#fff" stroke="#1b5fae" stroke-width="5" paint-order="stroke">Turbo-Flitzer</text>' : ''}</svg>`;

const KartChannel = { id: 'kart', name: 'Kart-Kanal', music: 'menu', tile: el => el.innerHTML = tileSVG(0), preview: el => el.innerHTML = tileSVG(1), open };
if (window.K && K.addChannel) K.addChannel(KartChannel); else addEventListener('load', () => K.addChannel(KartChannel));
