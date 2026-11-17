// Kart-Kanal "Turbo-Flitzer" (Version 2): 3D-Kartrennen mit Höhen, Sprüngen, Abgründen, Hindernissen,
// 17 eigenen Items und 5 eigenen Strecken. 1 oder 2 Spieler (geteilter Bildschirm links/rechts). Handy = Lenkrad.
import * as THREE from '../lib/three.module.min.js';
import { TRACKS } from './kart-tracks.js';
import { CREATURES, makeCreature, creaturePortraits } from './party/creatures.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const LAPS = 3, POINTS = [15, 12, 10, 8, 6, 4, 2, 1], VMAX = 46, GRAV = 34;
const fmtT = t => { if (t == null || !isFinite(t)) return '–'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2).replace('.', ','); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Fahrer ----------
const CLASS = {
  leicht: { acc: 1.18, vmax: 0.97, w: 0.8, hand: 1.12, label: 'Leicht' },
  mittel: { acc: 1.0, vmax: 1.0, w: 1.0, hand: 1.0, label: 'Mittel' },
  schwer: { acc: 0.88, vmax: 1.04, w: 1.35, hand: 0.9, label: 'Schwer' },
};
const DCLS = { marla: 'mittel', tiko: 'schwer', basil: 'schwer', juna: 'mittel', bolt: 'schwer', nyx: 'leicht', kai: 'leicht', flora: 'leicht' };
const KCOL = { marla: '#2f4f9a', tiko: '#f4b400', basil: '#e5242f', juna: '#4f7a3a', bolt: '#3fb8a8', nyx: '#6a3fb5', kai: '#ff7a3d', flora: '#ff6fa8' };
function roster() {
  const list = CREATURES.map(c => ({ ...c, cls: DCLS[c.id] || 'mittel', kart: KCOL[c.id] || '#34bdef' }));
  const a = (typeof AV !== 'undefined') ? AV.get() : null;
  list.push(a ? { id: 'avatar', name: a.name || 'Mein Avatar', skin: AV.skins[a.skin], hair: AV.hairCols[a.hairCol], shirt: AV.shirts[a.shirt], pants: '#3d4a5c', shoes: '#2a2a2a', cls: 'mittel', kart: AV.shirts[a.shirt], avatar: true }
    : { id: 'avatar', name: 'Mein Avatar', skin: '#f5c9a0', hair: '#5a3418', shirt: '#34bdef', pants: '#3d4a5c', shoes: '#2a2a2a', cls: 'mittel', kart: '#34bdef', avatar: true });
  return list;
}

// ---------- Items ----------
const ITEMS = {
  turbo: 'Raketenbooster', triple: 'Dreifach-Booster', goldturbo: 'Goldbooster', oil: 'Ölfleck', fake: 'Kristall-Attrappe',
  ball: 'Prallball', triball: 'Dreifach-Prallball', drone: 'Suchdrohne', tridrone: 'Dreifach-Drohne', comet: 'Kometenjäger',
  bomb: 'Knallkugel', shield: 'Schutzblase', shrink: 'Schrumpfwelle', ink: 'Tintenwolke', gold: 'Goldrausch', rocket: 'Autopilot-Rakete', cloud: 'Gewitterwolke',
};
const ITEM_LIST = Object.keys(ITEMS);
const USES = { triple: 3, triball: 3, tridrone: 3 };
function rollItem(rank, n) {
  const f = (rank - 1) / Math.max(1, n - 1);
  const tbl = f < 0.2 ? { oil: 22, fake: 14, ball: 22, triball: 6, shield: 14, bomb: 8, turbo: 8, cloud: 6 }
    : f < 0.6 ? { drone: 16, ball: 10, triball: 8, turbo: 14, triple: 10, bomb: 10, ink: 8, oil: 6, shield: 6, cloud: 4, tridrone: 8 }
      : { triple: 16, goldturbo: 12, gold: 12, tridrone: 12, rocket: 10, shrink: 8, comet: 8, drone: 10, ink: 6, turbo: 6 };
  if (rank === 1) delete tbl.comet;
  let sum = 0; for (const k in tbl) sum += tbl[k];
  let r = Math.random() * sum; for (const k in tbl) { r -= tbl[k]; if (r <= 0) return k; } return 'turbo';
}
function drawIcon(c, type, x, y, s) {
  c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineCap = 'round';
  const rg = (r, a, b) => { const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const ball = (r, a, b, cx = 0, cy = 0) => { c.save(); c.translate(cx, cy); c.fillStyle = rg(r, a, b); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = s * 0.025; c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.42, r * 0.28, r * 0.16, -0.6, 0, TAU); c.fill(); c.restore(); };
  const rocket = (ox, oy, sc, body = ['#ff6b5a', '#c0221a']) => {
    c.save(); c.translate(ox, oy); c.scale(sc, sc); c.rotate(-0.6);
    const R = s * 0.13, L = s * 0.36;
    c.fillStyle = '#ffb02e'; c.beginPath(); c.moveTo(-R * 0.7, L * 0.55); c.quadraticCurveTo(0, L * 1.25, R * 0.7, L * 0.55); c.fill();
    c.fillStyle = '#fff3a0'; c.beginPath(); c.moveTo(-R * 0.35, L * 0.55); c.quadraticCurveTo(0, L * 0.95, R * 0.35, L * 0.55); c.fill();
    const g = c.createLinearGradient(-R, 0, R, 0); g.addColorStop(0, body[1]); g.addColorStop(0.45, body[0]); g.addColorStop(1, body[1]);
    c.fillStyle = g; c.beginPath(); c.moveTo(0, -L); c.quadraticCurveTo(R * 1.3, -L * 0.3, R, L * 0.55); c.lineTo(-R, L * 0.55); c.quadraticCurveTo(-R * 1.3, -L * 0.3, 0, -L); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, -L * 0.25, R * 0.45, 0, TAU); c.fill(); c.fillStyle = '#4fb4ff'; c.beginPath(); c.arc(0, -L * 0.25, R * 0.3, 0, TAU); c.fill();
    c.fillStyle = body[1]; c.beginPath(); c.moveTo(-R, L * 0.2); c.lineTo(-R * 1.7, L * 0.65); c.lineTo(-R, L * 0.55); c.fill(); c.beginPath(); c.moveTo(R, L * 0.2); c.lineTo(R * 1.7, L * 0.65); c.lineTo(R, L * 0.55); c.fill();
    c.restore();
  };
  const crystal = (fill1, fill2) => { const g = c.createLinearGradient(0, -s * 0.38, 0, s * 0.38); g.addColorStop(0, fill1); g.addColorStop(1, fill2); c.fillStyle = g; c.beginPath(); c.moveTo(0, -s * 0.4); c.lineTo(s * 0.3, -s * 0.05); c.lineTo(0, s * 0.4); c.lineTo(-s * 0.3, -s * 0.05); c.closePath(); c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = s * 0.03; c.beginPath(); c.moveTo(-s * 0.3, -s * 0.05); c.lineTo(s * 0.3, -s * 0.05); c.moveTo(0, -s * 0.4); c.lineTo(0, s * 0.4); c.stroke(); };
  const drone = (cx, cy, sc) => { c.save(); c.translate(cx, cy); c.scale(sc, sc); c.strokeStyle = '#555'; c.lineWidth = s * 0.05; c.beginPath(); c.moveTo(-s * 0.36, -s * 0.2); c.lineTo(s * 0.36, -s * 0.2); c.stroke(); c.fillStyle = 'rgba(200,220,255,.7)'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * s * 0.36, -s * 0.24, s * 0.16, s * 0.04, 0, 0, TAU); c.fill(); }
    c.fillStyle = rg(s * 0.26, '#ff8a80', '#b71c1c'); c.beginPath(); c.ellipse(0, 0, s * 0.3, s * 0.18, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * 0.08, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(0, 0, s * 0.045, 0, TAU); c.fill(); c.restore(); };
  switch (type) {
    case 'turbo': rocket(0, 0, 1); break;
    case 'triple': rocket(-s * 0.22, s * 0.05, 0.65); rocket(s * 0.22, s * 0.05, 0.65); rocket(0, -s * 0.08, 0.75); break;
    case 'goldturbo': rocket(0, 0, 1.05, ['#ffe680', '#c99400']); c.fillStyle = '#fff'; for (const [a, b] of [[-0.32, -0.3], [0.3, 0.25], [0.28, -0.32]]) { c.beginPath(); c.arc(a * s, b * s, s * 0.035, 0, TAU); c.fill(); } break;
    case 'oil': { const g = c.createRadialGradient(-s * 0.1, -s * 0.05, s * 0.02, 0, s * 0.05, s * 0.42); g.addColorStop(0, '#5a4a7a'); g.addColorStop(0.4, '#1a1622'); g.addColorStop(1, '#09080c'); c.fillStyle = g; c.beginPath(); c.moveTo(-s * 0.38, s * 0.05); c.bezierCurveTo(-s * 0.4, -s * 0.25, -s * 0.05, -s * 0.18, s * 0.05, -s * 0.28); c.bezierCurveTo(s * 0.3, -s * 0.35, s * 0.45, -s * 0.05, s * 0.36, s * 0.12); c.bezierCurveTo(s * 0.3, s * 0.32, -s * 0.2, s * 0.35, -s * 0.38, s * 0.05); c.fill(); c.strokeStyle = 'rgba(140,200,255,.5)'; c.lineWidth = s * 0.03; c.beginPath(); c.arc(-s * 0.05, -s * 0.02, s * 0.12, 3.6, 5.2); c.stroke(); break; }
    case 'fake': crystal('#ff9a9a', '#b3122b'); c.fillStyle = '#fff'; c.font = `900 ${s * 0.3}px Nunito`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 0, s * 0.02); break;
    case 'ball': ball(s * 0.34, '#9cf59c', '#118a2a'); c.strokeStyle = '#eaffea'; c.lineWidth = s * 0.05; c.beginPath(); c.arc(0, 0, s * 0.22, 0.3, 2.6); c.stroke(); break;
    case 'triball': ball(s * 0.2, '#9cf59c', '#118a2a', -s * 0.2, s * 0.12); ball(s * 0.2, '#9cf59c', '#118a2a', s * 0.2, s * 0.12); ball(s * 0.2, '#9cf59c', '#118a2a', 0, -s * 0.18); break;
    case 'drone': drone(0, 0, 1); break;
    case 'tridrone': drone(-s * 0.2, s * 0.15, 0.55); drone(s * 0.2, s * 0.15, 0.55); drone(0, -s * 0.16, 0.6); break;
    case 'comet': { c.save(); c.rotate(-0.5); const g = c.createLinearGradient(-s * 0.45, 0, s * 0.2, 0); g.addColorStop(0, 'rgba(120,180,255,0)'); g.addColorStop(1, 'rgba(120,200,255,.9)'); c.fillStyle = g; c.beginPath(); c.moveTo(-s * 0.48, -s * 0.06); c.lineTo(s * 0.1, -s * 0.2); c.lineTo(s * 0.1, s * 0.2); c.lineTo(-s * 0.48, s * 0.06); c.fill(); c.restore(); ball(s * 0.22, '#e0f2ff', '#1a5fd6', s * 0.12, -s * 0.08); c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = (i % 2 ? 0.05 : 0.12) * s; c.lineTo(s * 0.12 + Math.cos(a) * r, -s * 0.08 + Math.sin(a) * r); } c.fill(); break; }
    case 'bomb': ball(s * 0.3, '#6b6f75', '#0d0e10', 0, s * 0.06); c.fillStyle = '#3c3f44'; c.fillRect(-s * 0.09, -s * 0.3, s * 0.18, s * 0.1); c.strokeStyle = '#c9a36a'; c.lineWidth = s * 0.04; c.beginPath(); c.moveTo(0, -s * 0.3); c.quadraticCurveTo(s * 0.12, -s * 0.45, s * 0.24, -s * 0.38); c.stroke(); c.fillStyle = '#ffe14d'; c.beginPath(); c.arc(s * 0.25, -s * 0.38, s * 0.07, 0, TAU); c.fill(); break;
    case 'shield': { c.strokeStyle = '#4fd6ff'; c.lineWidth = s * 0.06; c.beginPath(); c.arc(0, 0, s * 0.36, 0, TAU); c.stroke(); c.fillStyle = 'rgba(79,214,255,.22)'; c.fill(); c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(-s * 0.13, -s * 0.15, s * 0.11, s * 0.05, -0.6, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = s * 0.025; c.beginPath(); c.arc(0, 0, s * 0.26, 0.5, 1.6); c.stroke(); break; }
    case 'shrink': for (let i = 3; i >= 1; i--) { c.strokeStyle = ['#e0b3ff', '#b06bff', '#7a2fd6'][i - 1]; c.lineWidth = s * 0.07; c.beginPath(); c.arc(0, 0, s * 0.12 * i, 0, TAU); c.stroke(); } c.fillStyle = '#7a2fd6'; c.beginPath(); c.arc(0, 0, s * 0.06, 0, TAU); c.fill(); break;
    case 'ink': c.fillStyle = '#3a1f73'; for (const [a, b, r] of [[0, 0, 0.26], [0.2, -0.15, 0.14], [-0.22, 0.1, 0.15], [0.12, 0.22, 0.12], [-0.14, -0.2, 0.1], [0.3, 0.12, 0.07]]) { c.beginPath(); c.arc(a * s, b * s, r * s, 0, TAU); c.fill(); } c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(-s * 0.08, -s * 0.08, s * 0.06, 0, TAU); c.fill(); break;
    case 'gold': { const g = c.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 0.42); g.addColorStop(0, '#fff7c0'); g.addColorStop(0.5, '#ffcc33'); g.addColorStop(1, '#d48a00'); c.fillStyle = g; c.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = (i % 2 ? 0.26 : 0.4) * s; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * 0.12, 0, TAU); c.fill(); break; }
    case 'rocket': { c.save(); c.rotate(-0.5); const g = c.createLinearGradient(0, -s * 0.15, 0, s * 0.15); g.addColorStop(0, '#9aa4b2'); g.addColorStop(0.5, '#e8eef5'); g.addColorStop(1, '#5c6672'); c.fillStyle = g; c.beginPath(); c.moveTo(s * 0.42, 0); c.quadraticCurveTo(s * 0.2, -s * 0.18, -s * 0.25, -s * 0.15); c.lineTo(-s * 0.25, s * 0.15); c.quadraticCurveTo(s * 0.2, s * 0.18, s * 0.42, 0); c.fill(); c.fillStyle = '#e5242f'; c.fillRect(-s * 0.05, -s * 0.16, s * 0.08, s * 0.32); c.fillStyle = '#ff9a1f'; c.beginPath(); c.moveTo(-s * 0.25, -s * 0.1); c.lineTo(-s * 0.46, 0); c.lineTo(-s * 0.25, s * 0.1); c.fill(); c.restore(); break; }
    case 'cloud': { c.fillStyle = '#4a4f63'; for (const [a, b, r] of [[-0.18, 0, 0.18], [0.04, -0.1, 0.22], [0.24, 0.02, 0.16], [0, 0.06, 0.18]]) { c.beginPath(); c.arc(a * s, b * s, r * s, 0, TAU); c.fill(); } c.fillStyle = '#ffe14d'; c.beginPath(); c.moveTo(s * 0.02, s * 0.12); c.lineTo(-s * 0.1, s * 0.38); c.lineTo(s * 0.04, s * 0.3); c.lineTo(-s * 0.02, s * 0.46); c.lineTo(s * 0.16, s * 0.22); c.lineTo(s * 0.04, s * 0.26); c.lineTo(s * 0.12, s * 0.12); c.fill(); break; }
  }
  c.restore();
}

// ---------- Texturen ----------
function canvasTex(w, h, draw, rep = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function noiseFill(c, w, h, base, amp, n = 1) {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 5 * n; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * amp})`; const s = Math.random() < 0.9 ? 1.5 : 3; c.fillRect(Math.random() * w, Math.random() * h, s, s); }
}

// ---------- Partikel ----------
class Particles {
  constructor(scene, max, additive) {
    this.max = max; this.data = []; this.i = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, vertexColors: true,
      vertexShader: 'attribute float size; attribute float alpha; varying vec3 vC; varying float vA; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = size*(320./-mv.z); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord-.5)*2.; if(d>1.) discard; gl_FragColor = vec4(vC, vA*(1.-d*d)); }' });
    this.pts = new THREE.Points(g, m); this.pts.frustumCulled = false; scene.add(this.pts); this.g = g;
    for (let i = 0; i < max; i++) this.data.push({ life: 0 });
  }
  emit(x, y, z, vx, vy, vz, life, size, color, grow = 0, grav = 0) {
    const p = this.data[this.i]; this.i = (this.i + 1) % this.max;
    Object.assign(p, { x, y, z, vx, vy, vz, life, max: life, size, grow, grav }); p.c = color instanceof THREE.Color ? color : new THREE.Color(color);
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.data[i];
      if (p.life > 0) { p.life -= dt; p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.size += p.grow * dt; }
      const a = p.life > 0 ? p.life / p.max : 0;
      this.pos[i * 3] = p.x || 0; this.pos[i * 3 + 1] = p.life > 0 ? p.y : -9999; this.pos[i * 3 + 2] = p.z || 0;
      if (p.c) { this.col[i * 3] = p.c.r; this.col[i * 3 + 1] = p.c.g; this.col[i * 3 + 2] = p.c.b; }
      this.size[i] = Math.max(0, p.size || 0); this.alpha[i] = a;
    }
    for (const k of ['position', 'color', 'size', 'alpha']) this.g.attributes[k].needsUpdate = true;
  }
}

// ---------- Strecke bauen ----------
function buildTrack(def, scene, renderer) {
  const group = new THREE.Group(); scene.add(group);
  const space = def.theme === 'space';
  const curve = new THREE.CatmullRomCurve3(def.pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), true, 'centripetal');
  const N = 1800, P = [], T = [], R = [], HW = [], SIDE = [[], []], GAP = [];
  const ctrlU = def.pts.map(p => { let best = 0, bd = Infinity; for (let i = 0; i < 400; i++) { const q = curve.getPointAt(i / 400); const d = (q.x - p[0]) ** 2 + (q.z - p[2]) ** 2; if (d < bd) { bd = d; best = i / 400; } } return best; });
  const widthAt = u => { let k = 0; for (let i = 0; i < ctrlU.length; i++) if (ctrlU[i] <= u) k = i; const a = ctrlU[k], b = (k + 1 < ctrlU.length ? ctrlU[k + 1] : 1 + ctrlU[0]); const t = b > a ? (u - a) / (b - a) : 0; return lerp(def.pts[k][3] || 16, def.pts[(k + 1) % def.pts.length][3] || 16, clamp(t, 0, 1)); };
  const inZone = (u, z) => z.a < z.b ? (u >= z.a && u <= z.b) : (u >= z.a || u <= z.b);
  for (let i = 0; i < N; i++) {
    const u = i / N, p = curve.getPointAt(u), t = curve.getTangentAt(u), tl = Math.hypot(t.x, t.z) || 1;
    P.push({ x: p.x, y: p.y, z: p.z }); T.push({ x: t.x / tl, z: t.z / tl }); R.push({ x: -t.z / tl, z: t.x / tl }); HW.push(widthAt(u) / 2);
    for (let s = 0; s < 2; s++) {
      let side = { grass: def.grass, edge: def.edge };
      for (const z of def.zones || []) if (inZone(u, z) && (z.side === 'B' || (z.side === 'L') === (s === 0))) side = { grass: z.grass != null ? z.grass : side.grass, edge: z.edge || side.edge };
      SIDE[s].push(side);
    }
    GAP.push((def.gaps || []).some(g => u >= g[0] && u <= g[1]));
  }
  let len = 0; for (let i = 0; i < N; i++) { const a = P[i], b = P[(i + 1) % N]; len += Math.hypot(b.x - a.x, b.z - a.z); }
  const seg = len / N;
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  P.forEach(p => { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
  const baseY = minY - 2.5;
  const outer = (s, k) => HW[k] + 1.6 + SIDE[s][k].grass;
  const sgn = [-1, 1];

  // Himmel und Umgebungslicht
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color(def.sky[0]) }, bot: { value: new THREE.Color(def.sky[1]) } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vp; void main(){ float h = clamp(vp.y*1.3+.15,0.,1.); gl_FragColor = vec4(mix(bot, top, pow(h,.7)),1.); }' });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), skyMat));
  try { const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), skyMat.clone())); const fl = new THREE.Mesh(new THREE.CircleGeometry(9, 16), new THREE.MeshBasicMaterial({ color: space ? '#20104a' : def.ground })); fl.rotation.x = -Math.PI / 2; fl.position.y = -2; es.add(fl); scene.environment = pm.fromScene(es, 0.04).texture; pm.dispose(); } catch (e) {}

  function ribbon(f0, f1, fy, mat, vScale, skip) {
    const pos = [], uv = [], idx = []; let s = 0;
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = P[k], r = R[k], o0 = f0(k), o1 = f1(k), y = fy(k);
      pos.push(p.x + r.x * o0, y, p.z + r.z * o0, p.x + r.x * o1, y, p.z + r.z * o1); uv.push(0, s / vScale, 1, s / vScale); s += seg;
      if (i < N && !(skip && (skip(k) || skip((k + 1) % N)))) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; group.add(m); return m;
  }
  function wallStrip(fo, fy0, fy1, mat, vScale, active) {
    const pos = [], uv = [], idx = []; let s = 0;
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = P[k], r = R[k], o = fo(k);
      pos.push(p.x + r.x * o, fy0(k), p.z + r.z * o, p.x + r.x * o, fy1(k), p.z + r.z * o); uv.push(s / vScale, 0, s / vScale, 1); s += seg;
      if (i < N && active(k) && active((k + 1) % N)) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
  }

  // Fahrbahn
  let roadTex, roadMat;
  if (space) {
    roadTex = canvasTex(256, 64, (c, w, h) => { const cols = ['#ff3b3b', '#ff9a1f', '#ffe14d', '#3ddc5a', '#2fb6ff', '#5b5bff', '#c04bff']; cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * w / 7, 0, w / 7 + 1, h); }); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, 0, w, 6); for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
    roadTex.wrapS = THREE.ClampToEdgeWrapping;
    roadMat = new THREE.MeshBasicMaterial({ map: roadTex, transparent: true, opacity: 0.93, side: THREE.DoubleSide });
  } else {
    roadTex = canvasTex(256, 256, (c, w, h) => { noiseFill(c, w, h, def.road, 0.09, 2); c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(6, 0, 6, h); c.fillRect(w - 12, 0, 6, h); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(w / 2 - 3, 0, 6, h * 0.42); for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(w * (0.3 + Math.random() * 0.4), Math.random() * h, 3, 30); } });
    roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  }
  ribbon(k => HW[k], k => -HW[k], k => P[k].y + 0.02, roadMat, space ? 30 : 12, k => GAP[k]);
  const curbTex = canvasTex(16, 64, (c, w, h) => { c.fillStyle = def.curb[0]; c.fillRect(0, 0, w, h / 2); c.fillStyle = def.curb[1]; c.fillRect(0, h / 2, w, h / 2); });
  const curbMat = space ? new THREE.MeshBasicMaterial({ color: '#dff6ff', side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.7, side: THREE.DoubleSide });
  ribbon(k => HW[k] + 1.6, k => HW[k], k => P[k].y + 0.05, curbMat, 4, k => GAP[k]); ribbon(k => -HW[k], k => -HW[k] - 1.6, k => P[k].y + 0.05, curbMat, 4, k => GAP[k]);
  // Randstreifen (sichtbar befahrbar, bremst)
  const grassCol = { meadow: '#5fae45', beach: '#f0d59a', ice: '#f3f7fa', castle: '#3a3d4a' }[def.theme] || def.ground;
  const grassTex = canvasTex(256, 256, (c, w, h) => { noiseFill(c, w, h, grassCol, def.theme === 'meadow' ? 0.18 : 0.08, 2); if (def.theme === 'meadow') for (let i = 0; i < 400; i++) { c.strokeStyle = `rgba(${Math.random() < 0.5 ? '40,110,30' : '140,210,90'},.6)`; c.lineWidth = 1.5; const x = Math.random() * w, y = Math.random() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + rnd(-2, 2), y - rnd(3, 7)); c.stroke(); } });
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, side: THREE.DoubleSide });
  if (!space) for (let s = 0; s < 2; s++) ribbon(k => sgn[s] * (HW[k] + 1.6), k => sgn[s] * outer(s, k), k => P[k].y - 0.03, grassMat, 8, k => GAP[k] || SIDE[s][k].grass < 0.5);
  // Wände
  const wallH = { fence: 1.4, rock: 3.2, ice: 2.6, castle: 4.2, none: 0 }[def.wall] || 0;
  const wallTex = canvasTex(128, 64, (c, w, h) => {
    if (def.wall === 'fence') { c.clearRect(0, 0, w, h); c.fillStyle = '#f4f1ea'; c.fillRect(0, 8, w, 10); c.fillRect(0, 34, w, 10); for (let x = 0; x < w; x += 32) c.fillRect(x + 12, 0, 8, h); c.fillStyle = '#c9c2b2'; c.fillRect(0, 16, w, 2); c.fillRect(0, 42, w, 2); }
    else if (def.wall === 'rock') { noiseFill(c, w, h, '#a8957a', 0.25, 2); c.strokeStyle = 'rgba(60,40,20,.35)'; c.lineWidth = 2; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(Math.random() * w, 0); c.lineTo(Math.random() * w, h); c.stroke(); } }
    else if (def.wall === 'ice') { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e9fbff'); g.addColorStop(1, '#8cc8ea'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 10; i++) { c.beginPath(); c.moveTo(Math.random() * w, Math.random() * h); c.lineTo(Math.random() * w, Math.random() * h); c.stroke(); } }
    else { noiseFill(c, w, h, '#5b5e6e', 0.2, 2); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2; for (let y = 0; y < h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 16 % 2) * 16; x < w; x += 32) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 16); c.stroke(); } } }
  });
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, transparent: def.wall === 'fence', alphaTest: def.wall === 'fence' ? 0.5 : 0, side: THREE.DoubleSide });
  if (wallH) for (let s = 0; s < 2; s++) wallStrip(k => sgn[s] * outer(s, k), k => P[k].y - 0.6, k => P[k].y + wallH, wallMat, 6, k => SIDE[s][k].edge === 'wall' && !GAP[k]);
  // Seitenflächen bis zum Boden
  const skirtCol = { meadow: '#8a6a45', beach: '#d8b97a', ice: '#9bb5c8', castle: '#2b2e3a', space: '#30186a' }[def.theme];
  const skirtTex = canvasTex(128, 128, (c, w, h) => { noiseFill(c, w, h, skirtCol, 0.2, 2); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, Math.random() * h, w, 3); } });
  const skirtMat = space ? new THREE.MeshBasicMaterial({ color: '#7f5cff', transparent: true, opacity: 0.35, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ map: skirtTex, roughness: 1, side: THREE.DoubleSide });
  for (let s = 0; s < 2; s++) {
    if (space) { wallStrip(k => sgn[s] * (HW[k] + 1.6), k => P[k].y - 1.5, k => P[k].y + 0.04, skirtMat, 10, k => !GAP[k]); continue; }
    const deep = k => SIDE[s][k].edge === 'void' ? P[k].y - 60 : baseY;
    wallStrip(k => sgn[s] * (SIDE[s][k].grass < 0.5 ? HW[k] + 1.6 : outer(s, k)), deep, k => P[k].y - 0.03, skirtMat, 10, k => !GAP[k]);
  }
  if (space) ribbon(k => HW[k] + 1.6, k => -HW[k] - 1.6, k => P[k].y - 1.5, new THREE.MeshBasicMaterial({ color: '#3a1f8a', transparent: true, opacity: 0.6, side: THREE.DoubleSide }), 30, k => GAP[k]);

  // Boden / Wasser / Lava
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, size = Math.max(maxX - minX, maxZ - minZ) + 900;
  let water = null;
  if (def.theme === 'beach') { water = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: '#1fa9d6', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9 })); water.rotation.x = -Math.PI / 2; water.position.set(cx, baseY + 1.2, cz); group.add(water); const sand = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: '#d9c08a' })); sand.rotation.x = -Math.PI / 2; sand.position.set(cx, baseY - 2, cz); group.add(sand); }
  else if (def.theme === 'castle') { const lt = canvasTex(256, 256, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); g.addColorStop(0, '#ffcf3d'); g.addColorStop(1, '#ff3d00'); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(80,10,0,.35)'; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, rnd(6, 30), 0, TAU); c.fill(); } }); lt.repeat.set(30, 30); const lava = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: lt })); lava.rotation.x = -Math.PI / 2; lava.position.set(cx, baseY, cz); group.add(lava); }
  else if (!space) { const gt = canvasTex(256, 256, (c, w, h) => noiseFill(c, w, h, def.ground, 0.1, 2)); gt.repeat.set(size / 30, size / 30); const g = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 })); g.rotation.x = -Math.PI / 2; g.position.set(cx, def.theme === 'ice' ? minY - 40 : baseY, cz); g.receiveShadow = true; group.add(g); }

  // Start-Ziel, Torbogen, Startampel
  const chk = canvasTex(64, 16, (c) => { for (let x = 0; x < 8; x++) for (let y = 0; y < 2; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * 8, y * 8, 8, 8); } }, false);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(HW[0] * 2, 2.6), new THREE.MeshStandardMaterial({ map: chk })); line.rotation.x = -Math.PI / 2; line.rotation.z = Math.atan2(T[0].x, T[0].z); line.position.set(P[0].x, P[0].y + 0.06, P[0].z); group.add(line);
  const gate = new THREE.Group(); gate.position.set(P[0].x, P[0].y, P[0].z); gate.rotation.y = Math.atan2(T[0].x, T[0].z); group.add(gate);
  const gm = new THREE.MeshStandardMaterial({ color: '#e8ecf0', metalness: 0.6, roughness: 0.3 });
  for (const sd of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 10, 12), gm); post.position.set(sd * (HW[0] + 3), 5, 0); post.castShadow = true; gate.add(post); }
  const ban = new THREE.Mesh(new THREE.BoxGeometry(HW[0] * 2 + 7, 2.2, 0.8), new THREE.MeshStandardMaterial({ map: canvasTex(512, 64, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#1b5fae'); g.addColorStop(1, '#34bdef'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 40px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TURBO-FLITZER', w / 2, h / 2 + 2); }, false) }));
  ban.position.y = 10; ban.castShadow = true; gate.add(ban);
  const lampBox = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.6, 0.6), new THREE.MeshStandardMaterial({ color: '#222' })); lampBox.position.set(0, 7.9, 0.1); gate.add(lampBox);
  const lamps = [0, 1, 2].map(i => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshStandardMaterial({ color: '#331111', emissive: '#000000' })); l.position.set(-1.6 + i * 1.6, 7.9, 0.5); gate.add(l); return l; });

  function nearest(i0, x, y, z, win = 60) {
    let best = i0, bd = Infinity;
    for (let o = -win; o <= win; o++) { const k = (i0 + o + N) % N, dx = x - P[k].x, dz = z - P[k].z, dy = (y - P[k].y) * 0.6, d = dx * dx + dz * dz + dy * dy; if (d < bd) { bd = d; best = k; } }
    return { i: best, lat: (x - P[best].x) * R[best].x + (z - P[best].z) * R[best].z };
  }
  function globalNearest(x, y, z) { let best = 0, bd = Infinity; for (let k = 0; k < N; k += 6) { const dx = x - P[k].x, dz = z - P[k].z, dy = (y - P[k].y) * 0.6, d = dx * dx + dz * dz + dy * dy; if (d < bd) { bd = d; best = k; } } return nearest(best, x, y, z, 8); }
  function distTrack(x, z) { let bd = Infinity, bk = 0; for (let k = 0; k < N; k += 8) { const d = (x - P[k].x) ** 2 + (z - P[k].z) ** 2; if (d < bd) { bd = d; bk = k; } } return { d: Math.sqrt(bd), k: bk }; }
  // Boden unter einem Punkt; null = Abgrund, Wasser oder Lava
  function ground(i, lat) {
    if (GAP[i]) return null;
    const a = Math.abs(lat), s = lat < 0 ? 0 : 1;
    if (a <= HW[i] + 1.6) return { y: P[i].y, surf: a <= HW[i] ? 'road' : 'curb' };
    if (a <= outer(s, i) && SIDE[s][i].grass >= 0.5) return { y: P[i].y - 0.03, surf: 'grass' };
    if (SIDE[s][i].edge === 'wall') return { y: P[i].y - 0.03, surf: 'grass', wall: true };
    return null;
  }

  // Deko
  const L = (c, e) => new THREE.MeshStandardMaterial(e ? { color: c, emissive: c, emissiveIntensity: e, roughness: 0.8 } : { color: c, roughness: 0.85 });
  function spots(n, dmin, dmax) {
    const out = []; let tries = 0;
    while (out.length < n && tries < n * 40) { tries++; const x = rnd(minX - 160, maxX + 160), z = rnd(minZ - 160, maxZ + 160), r = distTrack(x, z), lim = HW[r.k] + 1.6 + Math.max(SIDE[0][r.k].grass, SIDE[1][r.k].grass); if (r.d > lim + dmin && r.d < lim + dmax) out.push([x, z, r.k]); }
    return out;
  }
  function inst(geo, mat, list, f, cast = true) {
    const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D();
    list.forEach((p, i) => { o.position.set(p[0], baseY + 0.4, p[1]); o.rotation.set(0, Math.random() * TAU, 0); o.scale.setScalar(1); f && f(o, i, p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; m.castShadow = cast; m.receiveShadow = true; group.add(m); return m;
  }
  const anim = [], th = def.theme;
  if (th === 'meadow') {
    const tr = spots(220, 6, 200);
    inst(new THREE.CylinderGeometry(0.6, 0.9, 5, 7).translate(0, 2.5, 0), L('#7a5230'), tr, o => o.scale.setScalar(rnd(0.9, 1.5)));
    const crowns = inst(new THREE.IcosahedronGeometry(3.6, 1).translate(0, 7.5, 0), L('#ffffff'), tr, o => o.scale.setScalar(rnd(0.9, 1.5)));
    tr.forEach((_, i) => crowns.setColorAt(i, new THREE.Color(pick(['#3f9a35', '#4fae3f', '#2f8a32', '#6cbf3f'])))); crowns.instanceColor.needsUpdate = true;
    const fl = spots(900, 1, 80), fm = inst(new THREE.SphereGeometry(0.4, 6, 4).translate(0, 0.3, 0), L('#ffffff'), fl, null, false);
    fl.forEach((_, i) => fm.setColorAt(i, new THREE.Color(pick(['#ff5fa2', '#ffe14d', '#ffffff', '#b06bff', '#ff8a1f'])))); fm.instanceColor.needsUpdate = true;
    inst(new THREE.SphereGeometry(90, 20, 12), L('#5aa83d'), spots(14, 250, 600), o => { o.position.y = baseY - 40; o.scale.set(rnd(1, 2.2), rnd(0.7, 1.1), rnd(1, 2.2)); }, false);
    spots(2, 20, 50).forEach(([x, z]) => { const w = new THREE.Group(); w.position.set(x, baseY, z); const tw = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.5, 18, 10), L('#f4efe2')); tw.position.y = 9; tw.castShadow = true; w.add(tw); const roof = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 10), L('#c0392b')); roof.position.y = 20.5; w.add(roof); const hub = new THREE.Group(); hub.position.set(0, 17, 3.6); w.add(hub); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 11, 0.2), L('#e8dcc0')); b.position.y = 5.5; const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; arm.add(b); hub.add(arm); } group.add(w); anim.push(t => hub.rotation.z = t * 0.8); });
    for (let i = 0; i < 14; i++) { const c2 = new THREE.Group(); for (let k = 0; k < 5; k++) { const s2 = new THREE.Mesh(new THREE.SphereGeometry(rnd(6, 12), 12, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 })); s2.position.set(k * 9 - 18, rnd(-2, 3), rnd(-4, 4)); c2.add(s2); } c2.position.set(rnd(minX - 300, maxX + 300), maxY + rnd(80, 150), rnd(minZ - 300, maxZ + 300)); group.add(c2); }
  } else if (th === 'beach') {
    const pl = spots(140, 3, 60);
    inst(new THREE.CylinderGeometry(5, 7, 4, 12), L('#f0d59a'), pl, o => { o.position.y = baseY + 1.6; });
    inst(new THREE.CylinderGeometry(0.45, 0.7, 11, 7).translate(0, 5.5, 0), L('#9a6a3a'), pl, o => { o.position.y = baseY + 3.7; o.rotation.z = rnd(-0.25, 0.25); });
    const leafGeo = new THREE.ConeGeometry(1.6, 7, 4).rotateX(Math.PI / 2).translate(0, 11, 3.2);
    for (let k = 0; k < 6; k++) inst(leafGeo, L('#2e9e3e'), pl, o => { o.position.y = baseY + 3.7; o.rotation.y = k / 6 * TAU; o.rotation.x = 0.35; });
    const lp = spots(1, 40, 90)[0]; if (lp) { const lh = new THREE.Group(); lh.position.set(lp[0], baseY, lp[1]); for (let i = 0; i < 6; i++) { const s2 = new THREE.Mesh(new THREE.CylinderGeometry(3 - i * 0.25, 3.2 - i * 0.25, 4, 16), L(i % 2 ? '#e8434a' : '#ffffff')); s2.position.y = 2 + i * 4; s2.castShadow = true; lh.add(s2); } const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.2, 12), L('#fff3a0', 1.5)); lamp.position.y = 25; lh.add(lamp); group.add(lh); }
    spots(6, 40, 200).forEach(([x, z], i) => { const b = new THREE.Group(); b.add(new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 9), L('#ffffff'))); const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 9, 6), L('#7a4f2a')); mast.position.y = 5; b.add(mast); const sail = new THREE.Mesh(new THREE.PlaneGeometry(4, 7), L(pick(['#ff6f61', '#4fa8ff', '#ffd23d']))); sail.position.set(0, 5, 1.5); sail.rotation.y = Math.PI / 2; sail.material.side = THREE.DoubleSide; b.add(sail); b.position.set(x, baseY + 1.6, z); group.add(b); anim.push(t => { b.position.y = baseY + 1.6 + Math.sin(t * 1.3 + i) * 0.25; b.rotation.z = Math.sin(t + i) * 0.05; }); });
  } else if (th === 'ice') {
    const pn = spots(240, 4, 160);
    inst(new THREE.ConeGeometry(3.4, 9, 8).translate(0, 6, 0), L('#2f6b4f'), pn, o => o.scale.setScalar(rnd(0.8, 1.6)));
    inst(new THREE.ConeGeometry(2, 4, 8).translate(0, 10.5, 0), L('#ffffff'), pn, o => o.scale.setScalar(rnd(0.8, 1.6)));
    const mt = spots(18, 260, 700);
    inst(new THREE.ConeGeometry(120, 220, 9).translate(0, 90, 0), L('#8aa4b8'), mt, o => { o.position.y = minY - 40; o.scale.setScalar(rnd(0.8, 1.6)); });
    inst(new THREE.ConeGeometry(48, 88, 9).translate(0, 158, 0), L('#ffffff'), mt, o => { o.position.y = minY - 40; o.scale.setScalar(rnd(0.8, 1.6)); });
    inst(new THREE.OctahedronGeometry(2.4, 0), new THREE.MeshStandardMaterial({ color: '#bff0ff', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }), spots(80, 2, 30), o => { o.scale.set(rnd(0.6, 1.2), rnd(1.2, 2.4), rnd(0.6, 1.2)); o.rotation.z = rnd(-0.3, 0.3); });
  } else if (th === 'castle') {
    const tw = spots(26, 6, 120);
    inst(new THREE.CylinderGeometry(6, 7, 40, 12).translate(0, 20, 0), L('#5b5e6e'), tw, o => o.scale.setScalar(rnd(0.8, 1.3)));
    inst(new THREE.ConeGeometry(7.5, 13, 12).translate(0, 46.5, 0), L('#5a2a8a'), tw, o => o.scale.setScalar(rnd(0.8, 1.3)));
    const ln = []; for (let k = 0; k < N; k += 30) for (const sd of [-1, 1]) { const o = sd * (outer(sd < 0 ? 0 : 1, k) + 1); ln.push([P[k].x + R[k].x * o, P[k].z + R[k].z * o, P[k].y]); }
    inst(new THREE.CylinderGeometry(0.2, 0.2, 5, 5).translate(0, 2.5, 0), L('#222'), ln, (o, i, p) => o.position.y = p[2]);
    inst(new THREE.SphereGeometry(0.7, 8, 6).translate(0, 5.4, 0), L('#ffaa33', 2.5), ln, (o, i, p) => o.position.y = p[2], false);
    const sg = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 1500; i++) { const a = Math.random() * TAU, e = rnd(0.05, 1.3), r = 1300; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); group.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff6d8', fog: false })); moon.position.set(-700, 500, -800); group.add(moon);
  } else if (th === 'space') {
    const sg = new THREE.BufferGeometry(), sp = [], sc = []; for (let i = 0; i < 4000; i++) { const v = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(900, 1400)); sp.push(v.x, v.y, v.z); const c2 = new THREE.Color().setHSL(rnd(0.5, 0.9), 0.6, rnd(0.7, 1)); sc.push(c2.r, c2.g, c2.b); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    group.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, vertexColors: true, fog: false })));
    const neb = canvasTex(256, 256, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.3, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }, false);
    for (let i = 0; i < 14; i++) { const s2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: neb, color: pick(['#ff4fd8', '#6b5bff', '#2fd6ff', '#ff8a3d']), transparent: true, opacity: 0.35, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); s2.position.copy(new THREE.Vector3(rnd(-1, 1), rnd(-0.6, 0.8), rnd(-1, 1)).normalize().multiplyScalar(1100)); s2.scale.setScalar(rnd(300, 700)); group.add(s2); }
    const planet = (r, col, x, y, z, ring) => { const p2 = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })); p2.position.set(x, y, z); group.add(p2); if (ring) { const rg2 = new THREE.Mesh(new THREE.RingGeometry(r * 1.4, r * 2.1, 48), new THREE.MeshBasicMaterial({ color: ring, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })); rg2.rotation.x = 1.2; rg2.position.copy(p2.position); group.add(rg2); } anim.push(t => p2.rotation.y = t * 0.05); };
    planet(90, '#4f7cff', -500, 160, -700, '#c9b8ff'); planet(50, '#ff8a3d', 600, 260, 400); planet(30, '#7fe08a', 300, -120, -600);
    for (let k = 0; k < N; k += 150) { const arch = new THREE.Mesh(new THREE.TorusGeometry(HW[k] + 4, 0.6, 8, 32, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(k / N, 0.9, 0.65) })); arch.position.set(P[k].x, P[k].y, P[k].z); arch.rotation.y = Math.atan2(T[k].x, T[k].z) + Math.PI / 2; group.add(arch); }
    inst(new THREE.DodecahedronGeometry(6, 0), L('#5a4a7a'), spots(60, 20, 300), o => { o.position.y = minY + rnd(-60, 60); o.scale.setScalar(rnd(0.5, 2)); o.rotation.set(Math.random() * 3, Math.random() * 3, 0); });
  }

  // Boost-Felder
  const padTex = canvasTex(64, 128, (c, w, h) => { c.fillStyle = '#ff7a1a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffe14d'; for (let y = -32; y < h; y += 42) { c.beginPath(); c.moveTo(8, y + 36); c.lineTo(w / 2, y + 10); c.lineTo(w - 8, y + 36); c.lineTo(w - 8, y + 50); c.lineTo(w / 2, y + 24); c.lineTo(8, y + 50); c.fill(); } });
  const pads = (def.boosts || []).map(([u, l]) => { const k = Math.floor(u * N) % N, lat = l * HW[k]; const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 7.5), new THREE.MeshBasicMaterial({ map: padTex, transparent: true, opacity: 0.95 })); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.atan2(T[k].x, T[k].z) + Math.PI; m.position.set(P[k].x + R[k].x * lat, P[k].y + 0.08, P[k].z + R[k].z * lat); group.add(m); return { k, lat, m }; });
  anim.push(t => { padTex.offset.y = -t * 1.5; });
  // Sprungrampen
  const rampMat = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (c, w) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffd23d' : '#2a2a2a'; c.fillRect(0, i * 8, w, 8); } }), roughness: 0.6 });
  const ramps = (def.ramps || []).map(([u, l, pw]) => {
    const k = Math.floor(u * N) % N, lat = l * HW[k], w = HW[k] * 1.3;
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(7, 0); shape.lineTo(7, 1.6); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }); g.translate(-7, 0, -w / 2); g.rotateY(-Math.PI / 2);
    const m = new THREE.Mesh(g, rampMat); m.position.set(P[k].x + R[k].x * lat, P[k].y, P[k].z + R[k].z * lat); m.rotation.y = Math.atan2(T[k].x, T[k].z); m.castShadow = m.receiveShadow = true; group.add(m);
    return { k, lat, w, pw: pw || 11 };
  });
  // Item-Kristalle
  const crystalMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#4466ff', emissiveIntensity: 0.7, transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.3 });
  const coreMat = new THREE.MeshBasicMaterial({ color: '#ffffff' }), crystalGeo = new THREE.IcosahedronGeometry(1.35, 0), coreGeo = new THREE.OctahedronGeometry(0.55);
  const boxes = [];
  for (const fr of [0.11, 0.34, 0.57, 0.8]) {
    const k = Math.floor(fr * N);
    for (const o of [-0.66, -0.22, 0.22, 0.66]) {
      const x = P[k].x + R[k].x * o * HW[k], z = P[k].z + R[k].z * o * HW[k];
      const m = new THREE.Mesh(crystalGeo, crystalMat); m.position.set(x, P[k].y + 1.7, z); m.castShadow = true; m.add(new THREE.Mesh(coreGeo, coreMat)); group.add(m);
      boxes.push({ x, z, y: P[k].y, mesh: m, t: 0 });
    }
  }
  return { def, N, P, T, R, HW, SIDE, GAP, len, group, nearest, globalNearest, ground, boxes, crystalMat, pads, ramps, lamps, anim, water, space, roadTex, outer, baseY, bounds: { minX, maxX, minZ, maxZ, minY, maxY } };
}

// ---------- Hindernisse ----------
function buildObstacles(tr, scene) {
  const out = [];
  const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  for (const o of tr.def.obstacles || []) {
    const k = Math.floor(o.at * tr.N) % tr.N, hw = tr.HW[k];
    const ob = { t: o.t, k, lat: (o.lat || 0) * hw, r: 1.6, solid: false, harm: false, mesh: new THREE.Group(), phase: Math.random() * 10, speed: o.speed || 1 };
    const pos = () => { const p = tr.P[ob.k], r = tr.R[ob.k]; ob.x = p.x + r.x * ob.lat; ob.z = p.z + r.z * ob.lat; ob.mesh.position.set(ob.x, p.y, ob.z); };
    const yaw = Math.atan2(tr.T[k].x, tr.T[k].z);
    if (o.t === 'hay') { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 16).rotateZ(Math.PI / 2), M('#e3c15a')); m.position.y = 1.6; m.castShadow = true; ob.mesh.add(m); for (const s of [-0.6, 0.6]) { const band = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.07, 6, 20), M('#8a5a20')); band.rotation.y = Math.PI / 2; band.position.set(s, 1.6, 0); ob.mesh.add(band); } ob.mesh.rotation.y = yaw; ob.solid = true; ob.r = 1.8; }
    else if (o.t === 'rock') { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 1), M('#8f8576')); m.scale.set(1.2, 0.8, 1); m.position.y = 1.2; m.castShadow = true; ob.mesh.add(m); ob.solid = true; ob.r = 2.4; }
    else if (o.t === 'roller') { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 16), M('#9a6b3c')); m.rotation.x = Math.PI / 2; m.position.y = 1.5; m.castShadow = true; ob.mesh.add(m); ob.harm = true; ob.r = 1.9; ob.mesh.rotation.y = yaw + Math.PI / 2; ob.update = (t) => { const prev = ob.lat; ob.lat = Math.sin(t * ob.speed + ob.phase) * (hw - 1); m.rotation.y += (ob.lat - prev) / 1.5; pos(); }; }
    else if (o.t === 'crab') {
      const red = M('#e8434a'); const body = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), red); body.scale.set(1.3, 0.6, 1); body.position.y = 1; body.castShadow = true; ob.mesh.add(body);
      for (const s of [-1, 1]) { const claw = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), red); claw.scale.set(1, 0.7, 1.3); claw.position.set(s * 1.7, 1.2, 0.8); ob.mesh.add(claw); for (let i = 0; i < 3; i++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 5), red); leg.position.set(s * 1.4, 0.5, -0.5 + i * 0.5); leg.rotation.z = s * 0.9; ob.mesh.add(leg); } const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), M('#ffffff')); eye.position.set(s * 0.4, 1.8, 0.6); ob.mesh.add(eye); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), M('#111')); pu.position.set(0, 0, 0.17); eye.add(pu); }
      ob.harm = true; ob.r = 2.0; ob.update = (t) => { const ph = t * ob.speed * 0.6 + ob.phase; ob.lat = Math.sin(ph) * (hw + 2); ob.mesh.rotation.y = yaw + Math.PI / 2 * Math.sign(Math.cos(ph) || 1); pos(); ob.mesh.position.y = tr.P[k].y + Math.abs(Math.sin(t * 8)) * 0.2; };
    }
    else if (o.t === 'snowball') { const m = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 14), M('#ffffff')); m.position.y = 2.2; m.castShadow = true; ob.mesh.add(m); ob.harm = true; ob.r = 2.6; ob.update = (t, dt) => { const span = hw * 2 + 30; ob.lat = -hw - 15 + ((t * ob.speed * 8 + ob.phase * 10) % span); m.rotation.x += dt * 4; pos(); ob.mesh.visible = Math.abs(ob.lat) < hw + 12; }; }
    else if (o.t === 'geyser') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.4, 16), M('#3a2a2a')); base.position.y = 0.2; ob.mesh.add(base);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 16), new THREE.MeshBasicMaterial({ color: '#ff6a00', transparent: true })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.42; ob.mesh.add(glow);
      const fire = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 9, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffb02e', transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); fire.position.y = 4.5; ob.mesh.add(fire);
      ob.r = 2.0; ob.update = (t) => { const c = (t + ob.phase) % 4.6; ob.harm = c > 2.4 && c < 3.8; fire.visible = ob.harm; fire.scale.set(1 + Math.sin(t * 30) * 0.08, 1, 1 + Math.cos(t * 27) * 0.08); glow.material.opacity = c > 1.4 ? 0.5 + Math.sin(t * 20) * 0.4 : 0.2; pos(); };
    }
    else if (o.t === 'meteor') { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 0), M('#6a5a8a')); m.position.y = 2.4; m.castShadow = true; ob.mesh.add(m); const gl = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff4fd8', transparent: true, opacity: 0.18, depthWrite: false })); gl.position.y = 2.4; ob.mesh.add(gl); ob.solid = true; ob.harm = true; ob.r = 2.6; ob.update = (t, dt) => { m.rotation.x += dt; m.rotation.y += dt * 0.7; ob.mesh.position.y = tr.P[k].y + Math.sin(t * 1.5 + ob.phase) * 0.4; }; }
    pos(); scene.add(ob.mesh); out.push(ob);
  }
  return out;
}

// ---------- Kart-Modell ----------
function makeKart(d) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const paint = new THREE.MeshStandardMaterial({ color: d.kart, metalness: 0.45, roughness: 0.28 });
  const dark = new THREE.MeshStandardMaterial({ color: '#23262b', metalness: 0.3, roughness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#e8ecf0', metalness: 1, roughness: 0.18 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#1a1a1e', roughness: 0.9 });
  const sh = new THREE.Shape(); sh.moveTo(-1.45, 0.28); sh.lineTo(-1.5, 0.82); sh.quadraticCurveTo(-1.2, 0.98, -0.75, 0.92); sh.lineTo(-0.35, 0.62); sh.lineTo(0.55, 0.68); sh.quadraticCurveTo(1.3, 0.62, 1.7, 0.42); sh.lineTo(1.72, 0.28); sh.closePath();
  const tub = new THREE.ExtrudeGeometry(sh, { depth: 1.35, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 4, curveSegments: 10 });
  tub.translate(0, 0, -0.675); tub.rotateY(-Math.PI / 2);
  const chassis = new THREE.Mesh(tub, paint); chassis.castShadow = true; body.add(chassis);
  for (const s of [-1, 1]) { const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 1.5, 6, 12).rotateX(Math.PI / 2), paint); pod.position.set(s * 0.98, 0.45, 0.1); pod.castShadow = true; body.add(pod); const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 1.4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 })); st.position.set(s * 1.25, 0.5, 0.1); body.add(st); }
  const bump = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.32), dark); bump.position.set(0, 0.36, 1.85); body.add(bump);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.25), dark); seat.position.set(0, 1.05, -0.78); seat.rotation.x = -0.2; body.add(seat);
  const eng = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.6), chrome); eng.position.set(0, 0.85, -1.38); body.add(eng);
  const flames = [];
  for (const s of [-0.32, 0.32]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.6, 12).rotateX(Math.PI / 2 - 0.3), chrome); pipe.position.set(s, 0.95, -1.75); body.add(pipe);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 12, 1, true).rotateX(-Math.PI / 2 + 0.3), new THREE.MeshBasicMaterial({ color: '#ff9a1f', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); f.position.set(s, 1.1, -2.35); f.visible = false; body.add(f); flames.push(f);
  }
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.55), paint); wing.position.set(0, 1.5, -1.55); wing.castShadow = true; body.add(wing);
  for (const s of [-0.7, 0.7]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.18), dark); p.position.set(s, 1.22, -1.5); body.add(p); }
  const swheel = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.05, 8, 18), dark); swheel.position.set(0, 1.12, 0.32); swheel.rotation.x = -0.9; body.add(swheel);
  const flag = new THREE.Group(); const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), dark); rod.position.y = 0.7; flag.add(rod); const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshStandardMaterial({ color: d.shirt, side: THREE.DoubleSide })); fl.position.set(0.25, 1.25, 0); flag.add(fl); flag.position.set(0.65, 1.2, -1.6); body.add(flag);
  const wheels = [], front = [];
  const tireGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.42, 20).rotateZ(Math.PI / 2), rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.44, 14).rotateZ(Math.PI / 2), hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.46, 8).rotateZ(Math.PI / 2);
  for (const [x, z, fr] of [[-1.02, 1.05, 1], [1.02, 1.05, 1], [-1.04, -1.0, 0], [1.04, -1.0, 0]]) {
    const piv = new THREE.Group(); piv.position.set(x, 0.46, z); body.add(piv);
    const w = new THREE.Group(); piv.add(w);
    const tire = new THREE.Mesh(tireGeo, rubber); tire.castShadow = true; w.add(tire); w.add(new THREE.Mesh(rimGeo, chrome)); w.add(new THREE.Mesh(hubGeo, paint));
    for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.06), paint); sp.rotation.x = i * Math.PI / 4; sp.position.x = x > 0 ? 0.22 : -0.22; w.add(sp); }
    if (!fr) w.scale.set(1.15, 1.05, 1.05);
    wheels.push(w); if (fr) front.push(piv);
  }
  const drv = makeCreature(d); drv.root.scale.setScalar(0.6); drv.root.position.set(0, 0.62, -0.42); body.add(drv.root);
  const shield = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 16), new THREE.MeshStandardMaterial({ color: '#4fd6ff', transparent: true, opacity: 0.22, roughness: 0, metalness: 0.2, depthWrite: false, emissive: '#1a6fb0', emissiveIntensity: 0.4 })); shield.position.y = 1.1; shield.visible = false; g.add(shield);
  const shell = new THREE.Group(); const shm = new THREE.MeshStandardMaterial({ color: '#c8ced6', metalness: 0.9, roughness: 0.2 }); const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 20).rotateX(Math.PI / 2), shm); cone.position.set(0, 1, 2.3); shell.add(cone); const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.4, 20).rotateX(Math.PI / 2), shm); cyl.position.set(0, 1, -0.4); shell.add(cyl); const band = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.52, 0.5, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e5242f' })); band.position.set(0, 1, 0.8); shell.add(band); shell.visible = false; g.add(shell);
  const cloud = new THREE.Group(); const cm = new THREE.MeshStandardMaterial({ color: '#4a4f63', roughness: 1 }); for (let i = 0; i < 5; i++) { const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.6 + Math.random() * 0.3, 10, 8), cm); s2.position.set(i * 0.5 - 1, Math.random() * 0.3, Math.random() * 0.4 - 0.2); cloud.add(s2); } cloud.position.y = 4.3; cloud.visible = false; g.add(cloud);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(1.8, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false })); blob.rotation.x = -Math.PI / 2;
  return { g, body, wheels, front, flames, shield, shell, cloud, paint, blob, drv, baseColor: new THREE.Color(d.kart) };
}

function portraitOf(d, portraits) {
  if (d.avatar && typeof AV !== 'undefined') return AV.svg(AV.get(), 'style="width:100%;height:100%"');
  return `<img src="${portraits[d.id] || ''}" alt="" style="width:100%;height:100%;object-fit:contain">`;
}
function trackPreview(def) {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 200; const c = cv.getContext('2d');
  const bg = { meadow: ['#8fd3ff', '#5fae45'], beach: ['#9fe0ff', '#1fa9d6'], ice: ['#cfe6f5', '#f3f7fa'], castle: ['#141a33', '#ff5a1a'], space: ['#04020f', '#1a0b3a'] }[def.theme];
  const g = c.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]); c.fillStyle = g; c.fillRect(0, 0, 320, 200);
  if (def.theme === 'space') for (let i = 0; i < 80; i++) { c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(Math.random() * 320, Math.random() * 200, 1.5, 1.5); }
  const curve = new THREE.CatmullRomCurve3(def.pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), true, 'centripetal');
  const pts = curve.getSpacedPoints(240);
  let a = Infinity, b = -Infinity, e = Infinity, f = -Infinity; pts.forEach(p => { a = Math.min(a, p.x); b = Math.max(b, p.x); e = Math.min(e, p.z); f = Math.max(f, p.z); });
  const sc = Math.min(280 / (b - a), 165 / (f - e)), ox = 160 - (a + b) / 2 * sc, oz = 100 - (e + f) / 2 * sc;
  c.lineJoin = 'round'; c.lineCap = 'round';
  const path = () => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x * sc + ox, p.z * sc + oz) : c.moveTo(p.x * sc + ox, p.z * sc + oz)); c.closePath(); };
  if (def.road === 'rainbow') { const lg = c.createLinearGradient(0, 0, 320, 0); ['#ff3b3b', '#ff9a1f', '#ffe14d', '#3ddc5a', '#2fb6ff', '#c04bff'].forEach((col, i) => lg.addColorStop(i / 5, col)); c.strokeStyle = lg; c.lineWidth = 10; path(); c.stroke(); }
  else { c.strokeStyle = def.curb[0]; c.lineWidth = 15; path(); c.stroke(); c.strokeStyle = def.road; c.lineWidth = 10; path(); c.stroke(); }
  c.fillStyle = '#fff'; c.beginPath(); c.arc(pts[0].x * sc + ox, pts[0].z * sc + oz, 5, 0, TAU); c.fill();
  return cv.toDataURL();
}

const CSS = `.kt{position:absolute;inset:0;background:#000;overflow:hidden}.kt canvas{position:absolute;inset:0;width:100%;height:100%}
.kt-ov{position:absolute;inset:0;display:none;place-items:center;background:radial-gradient(circle at 50% 20%,#2f8de0,#123c7a 60%,#0a1f44)}.kt-ov.on{display:grid}.kt-ov.glass{background:rgba(5,15,35,.55)}
.kt-card{background:rgba(255,255,255,.97);border-radius:30px;border:4px solid #fff;padding:24px 32px;text-align:center;width:min(1150px,94vw);max-height:93vh;overflow:auto;color:#4c5054;box-shadow:0 24px 70px rgba(0,0,0,.4)}
.kt-card h2{margin:0 0 4px;font-size:clamp(32px,4.4vw,58px);font-weight:900;color:#1b5fae;letter-spacing:-.01em;text-shadow:0 4px 0 #cfe3ff}.kt-card h3{margin:10px 0 12px;font-size:22px;font-weight:900;color:#5c6064}.kt-card p{margin:4px 0 14px;font-weight:700;color:#7a7f84}
.kt-row{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin:10px 0}
.kt-b{min-width:190px;padding:15px 24px;border-radius:22px;border:4px solid #c4c8cc;background:linear-gradient(#fff,#eceef0);font-weight:900;font-size:21px;color:#4c5054;transition:transform .15s,border-color .15s,box-shadow .15s}
.kt-b.big{min-width:250px;padding:24px 28px;font-size:27px}.kt-b small{display:block;font-size:15px;color:#7a7f84;font-weight:700;margin-top:4px}
.kt-b.sel{border-color:#1b5fae;background:linear-gradient(#e6f1ff,#cfe3ff)}
.kt-b.hover,.kt-d.hover,.kt-t.hover{border-color:#34bdef;box-shadow:0 0 0 5px rgba(52,189,239,.35);transform:scale(1.04)}
.kt-drivers{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:12px;margin:10px 0}
.kt-d{position:relative;border-radius:20px;border:4px solid #d3d6d9;background:linear-gradient(#fff,#eef3f8);padding:6px;transition:transform .15s,border-color .15s,box-shadow .15s}
.kt-d .pic{aspect-ratio:1;border-radius:14px;overflow:hidden;background:radial-gradient(circle at 50% 40%,#fff,#dce8f3)}.kt-d b{display:block;font-size:18px;font-weight:900;margin-top:4px;color:#3d4145}.kt-d span{font-weight:700;color:#7a7f84;font-size:13px}
.kt-d .tag{position:absolute;top:-12px;padding:3px 10px;border-radius:999px;font-weight:900;font-size:13px;color:#fff;display:none}
.kt-d .t1{left:6px;background:#1b9fd6}.kt-d .t2{right:6px;background:#e5242f}
.kt-d.p1{border-color:#1b9fd6}.kt-d.p2{border-color:#e5242f}.kt-d.p1.p2{border-color:#8e44ad}.kt-d.p1 .t1,.kt-d.p2 .t2{display:block}.kt-d.ok1 .t1::after,.kt-d.ok2 .t2::after{content:' bereit'}
.kt-tracks{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin:10px 0}
.kt-t{border-radius:20px;border:4px solid #d3d6d9;background:#fff;padding:7px;transition:transform .15s,border-color .15s,box-shadow .15s}.kt-t img{width:100%;border-radius:12px;display:block}.kt-t b{display:block;font-size:19px;font-weight:900;margin-top:6px;color:#3d4145}.kt-t span{font-size:13px;font-weight:700;color:#7a7f84}
.kt-tbl{width:100%;border-collapse:collapse;font-weight:800;font-size:19px;margin:6px 0 10px}.kt-tbl td,.kt-tbl th{padding:4px 10px;border-bottom:2px solid #eceef0;text-align:left}.kt-tbl th{color:#9aa0a5;font-size:15px}.kt-tbl td.n{text-align:right;font-variant-numeric:tabular-nums}
.kt-tbl tr.me1 td{background:#e3f4fc}.kt-tbl tr.me2 td{background:#fde6e7}.kt-tbl .pic{width:36px;height:36px;border-radius:10px;overflow:hidden;display:inline-block;vertical-align:middle;margin-right:10px;background:#eef3f8}
.kt-qr{display:flex;gap:16px;align-items:center;justify-content:center;background:#f3f5f7;border-radius:18px;padding:12px 16px;margin-top:14px;font-weight:800;text-align:left}.kt-qr .q{width:120px;height:120px}.kt-qr .q img{width:100%;height:100%;image-rendering:pixelated}
.kt-pod{display:flex;align-items:flex-end;justify-content:center;gap:12px;margin:10px 0 18px}.kt-pod .col{width:160px;display:flex;flex-direction:column;align-items:center;font-weight:900;color:#3d4145;font-size:19px}.kt-pod .pic{width:100px;height:100px;border-radius:16px;overflow:hidden;border:4px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.15);background:#eef3f8}.kt-pod .nm{margin:6px 0}.kt-pod .nm small{display:block;color:#7a7f84;font-size:15px}.kt-pod .blk{width:100%;border-radius:14px 14px 0 0;color:#fff;font-size:44px;display:grid;place-items:center;text-shadow:0 2px 0 rgba(0,0,0,.2)}
.kt-cup{width:110px;height:110px;margin:0 auto}`;

function open(box, K) {
  if (!document.getElementById('kt-css2')) { const s = document.createElement('style'); s.id = 'kt-css2'; s.textContent = CSS; document.head.appendChild(s); }
  box.innerHTML = `<div class="kt"><canvas id="kt-gl"></canvas><canvas id="kt-hud"></canvas><div class="kt-ov on" id="kt-ov"><div class="kt-card" id="kt-card"></div></div></div>`;
  const q = s => box.querySelector(s);
  const glCv = q('#kt-gl'), hud = q('#kt-hud'), hc = hud.getContext('2d'), ov = q('#kt-ov'), card = q('#kt-card');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: glCv, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { card.innerHTML = '<h2>Turbo-Flitzer</h2><p>WebGL ist in diesem Browser nicht verfügbar.</p><div class="kt-row"><button class="hv kt-b" id="kt-x">Zurück</button></div>'; q('#kt-x').onclick = () => K.closeChannel(); return {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const portraits = creaturePortraits();
  let W = 1, H = 1, dpr = 1;
  function resize() {
    W = box.clientWidth; H = box.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setSize(W, H, false); hud.width = W * dpr; hud.height = H * dpr;
    if (race) race.cams.forEach(c => { c.cam.aspect = (W / race.views) / H; c.cam.updateProjectionMatrix(); });
  }

  // ---------- Eingabe ----------
  const inp = { 1: mkIn(), 2: mkIn() };
  function mkIn() { return { steer: 0, remote: null, remoteT: 0, gas: false, brake: false, drift: false, itemQ: false, kL: false, kR: false, kU: false, kD: false, kDr: false }; }
  const KEYS = { ArrowLeft: [1, 'kL'], ArrowRight: [1, 'kR'], ArrowUp: [1, 'kU'], ArrowDown: [1, 'kD'], Shift: [1, 'kDr'], Enter: [1, 'item'], a: [2, 'kL'], d: [2, 'kR'], w: [2, 'kU'], s: [2, 'kD'], f: [2, 'kDr'], e: [2, 'item'] };
  function onKey(e) {
    if (e.target.matches && e.target.matches('input,textarea')) return;
    const k = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (!k || state !== 'race') return;
    const down = e.type === 'keydown'; const pI = inp[k[0]];
    if (k[1] === 'item') { if (down && !e.repeat) pI.itemQ = true; } else pI[k[1]] = down;
    e.preventDefault();
  }
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);

  // ---------- Menüs ----------
  let state = 'title', players = 1, mode = 'single', diff = K.store.get('kt-diff', 1), picks = { 1: null, 2: null }, ok = { 1: false, 2: false }, cur = { 1: 0, 2: 1 };
  let cup = null, race = null, trackIdx = 0, paused = false;
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
      <div class="kt-row"><button class="hv kt-b big" data-m="single">Einzelrennen<small>eine Strecke, 3 Runden</small></button><button class="hv kt-b big" data-m="cup">Sternen-Cup<small>alle 5 Strecken, Punkte</small></button></div>
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
      <div class="kt-drivers">${R.map((d, i) => `<button class="hv kt-d" data-i="${i}"><span class="tag t1">Spieler 1</span><span class="tag t2">Spieler 2</span><div class="pic">${portraitOf(d, portraits)}</div><b>${esc(d.name)}</b><span>${CLASS[d.cls].label}</span></button>`).join('')}</div>
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
    const n = roster().length, cols = Math.max(1, Math.round(card.querySelector('.kt-drivers').clientWidth / 130));
    cur[p] = (cur[p] + dx + dy * cols + n * 4) % n; Sound.play('hover'); drawPicks();
  }
  function showTracks() {
    state = 'tracks';
    screen(`<h2>Strecke wählen</h2><div class="kt-tracks">${TRACKS.map((t, i) => `<button class="hv kt-t" data-t="${i}"><img src="${trackPreview(t)}" alt=""><b>${t.name}</b><span>Rekord: ${fmtT(K.store.get('kt2-best-' + i, null))}${t.grip < 1 ? ' · glatt' : ''}${t.edge === 'void' ? ' · ohne Geländer' : ''}</span></button>`).join('')}</div>
      <div class="kt-row"><button class="hv kt-b" id="kt-back">Zurück</button></div>`);
    bind('[data-t]', el => startRace(+el.dataset.t));
    bind('#kt-back', showDrivers);
  }
  function showCupIntro() {
    state = 'cupintro'; cup = { pts: {}, field: null };
    screen(`<h2>Sternen-Cup</h2><p>${TRACKS.length} Rennen, Punkte für jeden Platz: ${POINTS.join(' · ')}</p>
      <div class="kt-tracks">${TRACKS.map((t, i) => `<div class="kt-t"><img src="${trackPreview(t)}" alt=""><b>${i + 1}. ${t.name}</b></div>`).join('')}</div>
      <div class="kt-row"><button class="hv kt-b big" id="kt-go">Cup starten</button><button class="hv kt-b" id="kt-back">Zurück</button></div>`);
    bind('#kt-go', () => startRace(0));
    bind('#kt-back', showDrivers);
  }
  function buildField() {
    const R = roster(), humans = [picks[1]].concat(players === 2 ? [picks[2]] : []);
    const pool = R.map((_, i) => i).filter(i => !humans.includes(i) && !R[i].avatar).sort(() => Math.random() - 0.5);
    return humans.map((di, k) => ({ d: R[di], human: k + 1, key: 'h' + (k + 1) })).concat(pool.slice(0, 8 - humans.length).map(i => ({ d: R[i], human: 0, key: 'd' + i })));
  }
  function startRace(ti) {
    trackIdx = ti;
    if (mode === 'cup' && !cup.field) cup.field = buildField();
    const field = mode === 'cup' ? cup.field : buildField();
    if (race) { race.dispose(); race = null; }
    screen('<h2>Lade Strecke …</h2><p>' + TRACKS[ti].name + '</p>');
    setTimeout(() => {
      race = new Race(TRACKS[ti], field);
      ov.classList.remove('on'); state = 'race'; paused = false;
      resize(); setPhones('wheel'); Sound.music('race');
    }, 40);
  }

  // Rettungsdrohne (zieht abgestürzte Karts zurück auf die Strecke)
  function makeRescue() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), new THREE.MeshStandardMaterial({ color: '#ffd23d', metalness: 0.3, roughness: 0.4 }))); g.props = []; for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 14), new THREE.MeshStandardMaterial({ color: '#cfd8e0', transparent: true, opacity: 0.7 })); p.position.set(x, 0.35, z); g.add(p); g.props.push(p); } const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 4), new THREE.MeshStandardMaterial({ color: '#333' })); rope.position.y = -1.4; g.add(rope); return g; }

  // ---------- Rennen ----------
  class Race {
    constructor(def, field) {
      this.def = def;
      const scene = this.scene = new THREE.Scene();
      scene.fog = new THREE.Fog(def.fog, def.theme === 'space' ? 400 : 260, def.theme === 'space' ? 1500 : 1100);
      const night = def.theme === 'castle' || def.theme === 'space';
      scene.add(new THREE.HemisphereLight(night ? '#9aa6ff' : '#fff6e8', night ? '#1a1030' : '#4a6a3a', night ? 0.8 : 1.0));
      const sun = this.sun = new THREE.DirectionalLight(night ? '#c9d2ff' : '#fff1d6', night ? 1.3 : 2.4);
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 300 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
      scene.add(sun); scene.add(sun.target);
      this.track = buildTrack(def, scene, renderer);
      this.obs = buildObstacles(this.track, scene);
      this.fx = new Particles(scene, 1400, true); this.smoke = new Particles(scene, 900, false);
      const tr = this.track, N = tr.N;
      this.views = players; this.time = 0; this.count = 4.2; this.msgs = { 1: null, 2: null }; this.endT = null; this.done = false;
      this.traps = []; this.projs = []; this.lastBump = 0; this.beeped = 5;
      const order = field.filter(f => !f.human).concat(field.filter(f => f.human));
      this.karts = order.map((f, slot) => {
        const row = Math.floor(slot / 2), col = slot % 2;
        const i = (N - 14 - row * 11 + N) % N, lat = (col ? 1 : -1) * tr.HW[i] * 0.4;
        const m = makeKart(f.d); scene.add(m.g); scene.add(m.blob);
        const k = { f, d: f.d, human: f.human, st: CLASS[f.d.cls], m, x: tr.P[i].x + tr.R[i].x * lat, z: tr.P[i].z + tr.R[i].z * lat, y: tr.P[i].y, vy: 0, grounded: true,
          vx: 0, vz: 0, h: Math.atan2(tr.T[i].x, tr.T[i].z), idx: i, prog: -(N - i) / N, lapShown: 0, fin: false, time: null, rank: 0,
          item: null, cnt: 0, roll: 0, boost: 0, drift: false, dDir: 0, charge: 0, lvl: 0, prevDrift: false, hop: 0, spin: 0, spinA: 0, shrink: 0, gold: 0, shield: 0, ink: 0, goldT: 0, rocket: 0, cloud: 0,
          lane: rnd(-0.35, 0.35), laneT: rnd(2, 5), aiT: 0, skill: rnd(0.96, 1.02), lat, surf: 'road', fall: 0, rescue: 0, safe: { i, lat: 0 }, air: 0, rampAir: false, trick: 0, trickBoost: false, wrong: 0, eng: null, steerVis: 0 };
        if (k.human) k.eng = Sound.engine(players === 2 ? (k.human === 1 ? -0.6 : 0.6) : 0);
        return k;
      });
      this.cams = this.karts.filter(k => k.human).sort((a, b) => a.human - b.human).map(k => { const cam = new THREE.PerspectiveCamera(72, (W / players) / H, 0.4, 3000); return { k, cam, shake: 0, pos: new THREE.Vector3(k.x - Math.sin(k.h) * 8, k.y + 4, k.z - Math.cos(k.h) * 8), look: new THREE.Vector3(k.x, k.y, k.z) }; });
      this.minimap = this.mkMinimap();
      this.mkItemMeshes();
    }
    mkItemMeshes() {
      const S = (c, e = 0, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, emissive: c, emissiveIntensity: e, roughness: 0.3, metalness: 0.2 }, o));
      this.mk = {
        oil: () => { const m = new THREE.Mesh(new THREE.CircleGeometry(1.9, 24), new THREE.MeshStandardMaterial({ color: '#0d0b12', roughness: 0.05, metalness: 0.6 })); m.rotation.x = -Math.PI / 2; return m; },
        fake: () => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 0), S('#ff7a7a', 0.6, { transparent: true, opacity: 0.85 })); m.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.55), new THREE.MeshBasicMaterial({ color: '#ffd0d0' }))); return m; },
        ball: () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 14), S('#2bc04a', 0.25, { metalness: 0.4, roughness: 0.15 })); m.add(new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.09, 8, 24), S('#eaffea', 0.3))); return m; },
        drone: () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.75, 18, 12), S('#e5242f', 0.35, { metalness: 0.5 })); b.scale.y = 0.6; g.add(b); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff' })); eye.position.z = 0.6; g.add(eye); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: '#111' })); pu.position.z = 0.82; g.add(pu); g.props = []; for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), S('#555')); arm.position.set(s * 0.8, 0.3, 0); g.add(arm); const pr = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.18), S('#cfd8e0', 0.2)); pr.position.set(s * 1.2, 0.42, 0); g.add(pr); g.props.push(pr); } return g; },
        comet: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), S('#5fb4ff', 1.2))); for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 6), S('#ffffff', 0.8)); w.position.set(Math.cos(i * Math.PI / 2) * 1.1, Math.sin(i * Math.PI / 2) * 1.1, -0.4); w.rotation.x = Math.PI / 2; g.add(w); } return g; },
        bomb: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: '#1d1f24', roughness: 0.35, metalness: 0.5 }))); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 10), S('#666')); cap.position.y = 1; g.add(cap); const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), S('#c9a36a')); fuse.position.set(0.15, 1.35, 0); fuse.rotation.z = -0.5; g.add(fuse); const sp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe14d' })); sp.position.set(0.32, 1.6, 0); g.add(sp); g.spark = sp; return g; },
      };
    }
    mkMinimap() {
      const tr = this.track, b = tr.bounds, cv = document.createElement('canvas'), S = 200; cv.width = cv.height = S; const c = cv.getContext('2d');
      const sc = (S - 24) / Math.max(b.maxX - b.minX, b.maxZ - b.minZ), ox = S / 2 - (b.minX + b.maxX) / 2 * sc, oz = S / 2 - (b.minZ + b.maxZ) / 2 * sc;
      c.lineJoin = 'round'; c.lineCap = 'round';
      const path = () => { c.beginPath(); tr.P.forEach((p, i) => i % 6 === 0 && (i ? c.lineTo(p.x * sc + ox, p.z * sc + oz) : c.moveTo(p.x * sc + ox, p.z * sc + oz))); c.closePath(); };
      c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 11; path(); c.stroke();
      if (tr.space) { const lg = c.createLinearGradient(0, 0, S, S); ['#ff3b3b', '#ffe14d', '#3ddc5a', '#2fb6ff', '#c04bff'].forEach((col, i) => lg.addColorStop(i / 4, col)); c.strokeStyle = lg; } else c.strokeStyle = 'rgba(255,255,255,.95)';
      c.lineWidth = 5; path(); c.stroke();
      return { cv, sc, ox, oz, S };
    }
    dispose() {
      this.karts.forEach(k => k.eng && k.eng.stop());
      this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
      if (this.scene.environment) this.scene.environment.dispose();
    }
    fwd(k) { return { x: Math.sin(k.h), z: Math.cos(k.h) }; }
    msg(p, text, t = 1.6, col = '#ffffff') { if (p) this.msgs[p] = { text, t, col }; }
    hit(k, why, big) {
      if (k.gold > 0 || k.rocket > 0 || k.rescue > 0 || k.fall > 0) return false;
      if (k.shield > 0) { k.shield = 0; if (k.human) Sound.play('shield'); this.burst(k.x, k.y + 1, k.z, '#4fd6ff', 18); return false; }
      k.spin = big ? 1.6 : 1.15; k.drift = false; k.charge = 0; k.boost = 0; k.vx *= 0.25; k.vz *= 0.25;
      if (big && k.grounded) { k.vy = 11; k.grounded = false; }
      this.burst(k.x, k.y + 1, k.z, '#ffffff', 10, true);
      if (k.human) { Sound.play('spin'); this.msg(k.human, why || 'Getroffen!', 1.2); }
      return true;
    }
    burst(x, y, z, col, n, smoke) { const sys = smoke ? this.smoke : this.fx; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, e = Math.random() * 1.2; sys.emit(x, y, z, Math.cos(a) * Math.cos(e) * rnd(4, 10), Math.sin(e) * rnd(4, 10), Math.sin(a) * Math.cos(e) * rnd(4, 10), rnd(0.4, 0.9), smoke ? rnd(1.2, 2.4) : rnd(0.5, 1), col, smoke ? 2 : -0.5, smoke ? -2 : 8); } }
    explode(x, y, z, r) {
      Sound.play('boom'); this.burst(x, y, z, '#ffb02e', 60); this.burst(x, y, z, '#ff4a1a', 40); this.burst(x, y + 1, z, '#777', 25, true);
      this.karts.forEach(k => { if (Math.hypot(k.x - x, k.z - z) < r && Math.abs(k.y - y) < 6) this.hit(k, 'Explosion!', true); });
      this.cams.forEach(c => { if (Math.hypot(c.k.x - x, c.k.z - z) < 40) c.shake = 0.6; });
    }
    useItem(k) {
      if (k.goldT > 0) { k.boost = Math.max(k.boost, 0.9); if (k.human) Sound.play('boost'); return; }
      if (!k.item || k.roll > 0 || k.spin > 0 || k.rescue > 0 || k.fall > 0) return;
      const type = k.item, f = this.fwd(k), H = k.human, sc = this.scene;
      const after = () => { k.cnt--; if (k.cnt <= 0) { k.item = null; k.cnt = 0; } };
      if (type === 'turbo' || type === 'triple') { k.boost = Math.max(k.boost, 1.3); if (H) Sound.play('boost'); return after(); }
      if (type === 'goldturbo') { k.goldT = 7; k.boost = 0.9; if (H) Sound.play('gold'); k.item = null; return; }
      if (type === 'oil' || type === 'fake') {
        const m = this.mk[type](); const x = k.x - f.x * 3.4, z = k.z - f.z * 3.4; const nr = this.track.nearest(k.idx, x, k.y, z), gr = this.track.ground(nr.i, nr.lat); const y = gr ? gr.y : k.y;
        m.position.set(x, y + (type === 'oil' ? 0.09 : 1.6), z); sc.add(m); this.traps.push({ type, x, y, z, m, life: 60, owner: k, safe: 0.6 }); if (H) Sound.play('throw'); return after();
      }
      if (['ball', 'triball', 'drone', 'tridrone'].includes(type)) {
        const kind = type.includes('ball') ? 'ball' : 'drone', m = this.mk[kind](); const x = k.x + f.x * 3, z = k.z + f.z * 3; m.position.set(x, k.y + 0.8, z); sc.add(m);
        const sp = kind === 'ball' ? 80 : 74, target = kind === 'drone' ? this.karts.find(o => o.rank === k.rank - 1 && !o.fin) || null : null;
        this.projs.push({ type: kind, x, y: k.y + 0.8, z, vx: f.x * sp + k.vx * 0.3, vz: f.z * sp + k.vz * 0.3, m, life: kind === 'ball' ? 8 : 12, owner: k, safe: 0.4, idx: k.idx, bounce: 0, target });
        if (H) Sound.play('throw'); return after();
      }
      if (type === 'comet') { const leader = this.karts.find(o => o.rank === 1); if (leader && leader !== k) { const m = this.mk.comet(); m.position.set(k.x, k.y + 10, k.z); sc.add(m); this.projs.push({ type: 'comet', x: k.x, y: k.y + 10, z: k.z, m, life: 30, owner: k, idx: k.idx, target: leader, safe: 99 }); Sound.play('whoosh'); this.karts.forEach(o => o.human && o !== k && this.msg(o.human, 'Kometenjäger unterwegs!', 1.6, '#7fc8ff')); } k.item = null; return; }
      if (type === 'bomb') { const m = this.mk.bomb(); sc.add(m); this.projs.push({ type: 'bomb', x: k.x + f.x * 2, y: k.y + 2, z: k.z + f.z * 2, vx: f.x * 42 + k.vx * 0.5, vy: 12, vz: f.z * 42 + k.vz * 0.5, m, life: 5, fuse: null, owner: k, idx: k.idx, safe: 0.5 }); if (H) Sound.play('throw'); k.item = null; return; }
      if (type === 'shield') { k.shield = 10; if (H) Sound.play('shield'); }
      else if (type === 'gold') { k.gold = 7; k.spin = 0; if (H) Sound.play('gold'); }
      else if (type === 'rocket') { k.rocket = 6; k.spin = 0; k.drift = false; Sound.play('boost'); if (H) this.msg(H, 'Autopilot!', 1.4, '#ffd23d'); }
      else if (type === 'cloud') { k.cloud = 9; if (H) this.msg(H, 'Gib die Wolke weiter!', 1.6, '#c9cfe0'); }
      else if (type === 'shrink') { Sound.play('shrink'); this.karts.forEach(o => { if (o === k || o.gold > 0 || o.rocket > 0) return; if (o.shield > 0) { o.shield = 0; return; } o.shrink = 6; o.spin = Math.max(o.spin, 0.5); if (o.human) this.msg(o.human, 'Geschrumpft!', 1.5, '#d7a8ff'); }); }
      else if (type === 'ink') { Sound.play('ink'); this.karts.forEach(o => { if (o !== k && o.rank < k.rank && o.gold <= 0) { o.ink = 5; if (o.human) this.msg(o.human, 'Tinte!', 1.2, '#b9a3ff'); } }); }
      k.item = null; k.cnt = 0;
    }

    input(k, dt) {
      if (k.human && !k.fin) {
        const I = inp[k.human];
        const kb = (I.kR ? 1 : 0) - (I.kL ? 1 : 0);
        let target = kb;
        if (!kb && I.remote != null && performance.now() - I.remoteT < 600) target = I.remote;
        I.steer = lerp(I.steer, target, Math.min(1, dt * (kb ? 8 : 14)));
        const it = I.itemQ; I.itemQ = false;
        return { steer: I.steer, gas: I.gas || I.kU, brake: I.brake || I.kD, drift: I.drift || I.kDr, item: it };
      }
      const tr = this.track, N = tr.N, sp = Math.hypot(k.vx, k.vz);
      k.laneT -= dt; if (k.laneT < 0) { k.lane = clamp(k.lane + rnd(-0.3, 0.3), -0.45, 0.45); k.laneT = rnd(2, 5); }
      const look = 14 + Math.floor(sp * 0.32), ti = (k.idx + look) % N, hw = tr.HW[ti];
      let lane = k.lane;
      const f = this.fwd(k);
      const avoid = (ox, oz, r) => { const dx = ox - k.x, dz = oz - k.z, ahead = dx * f.x + dz * f.z; if (ahead > 0 && ahead < 26) { const side = dx * f.z - dz * f.x; if (Math.abs(side) < r + 2.5) lane += (side > 0 ? 0.5 : -0.5); } };
      this.obs.forEach(o => (o.solid || o.harm || o.t === 'geyser') && avoid(o.x, o.z, o.r)); this.traps.forEach(t => avoid(t.x, t.z, 1.8));
      const risky = tr.SIDE[0][ti].edge !== 'wall' || tr.SIDE[1][ti].edge !== 'wall';
      lane = clamp(lane, risky ? -0.32 : -0.6, risky ? 0.32 : 0.6);
      const ax = tr.P[ti].x + tr.R[ti].x * lane * hw, az = tr.P[ti].z + tr.R[ti].z * lane * hw;
      const want = Math.atan2(ax - k.x, az - k.z), df = wrapA(want - k.h);
      let steer = clamp(-df * 2.6, -1, 1);
      if (k.ink > 0) steer += Math.sin(this.time * 7 + k.lane * 9) * 0.5;
      let item = false;
      if (k.goldT > 0 && Math.random() < dt * 2) item = true;
      if (k.item && k.roll <= 0) {
        k.aiT -= dt;
        const ahead = this.karts.find(o => o.rank === k.rank - 1);
        if (['ball', 'triball', 'drone', 'tridrone', 'bomb'].includes(k.item)) { if (ahead && Math.hypot(ahead.x - k.x, ahead.z - k.z) < 50 && k.aiT < 2) item = true; }
        else if (['comet', 'rocket', 'gold', 'goldturbo', 'shrink'].includes(k.item)) item = k.aiT < 3.5;
        if (k.aiT < 0) item = true;
      }
      const tA = tr.T[k.idx], tB = tr.T[(k.idx + 45) % N], bend = Math.acos(clamp(tA.x * tB.x + tA.z * tB.z, -1, 1));
      const slow = risky && bend > 0.7 && sp > 30;
      return { steer, gas: !slow, brake: (Math.abs(df) > 1.3 && sp > 26) || (slow && sp > 36), drift: false, item };
    }

    physics(k, I, dt) {
      const tr = this.track, st = k.st, N = tr.N;
      if (k.rescue > 0) {
        k.rescue -= dt; const P = tr.P[k.safe.i];
        k.x = P.x; k.z = P.z; k.y = P.y + Math.max(0, k.rescue - 0.3) * 6; k.vx = k.vz = k.vy = 0; k.h = Math.atan2(tr.T[k.safe.i].x, tr.T[k.safe.i].z); k.idx = k.safe.i;
        if (k.rescue <= 0) { k.grounded = true; k.y = P.y; }
        return 0;
      }
      if (k.fall > 0) { k.fall -= dt; k.vy -= GRAV * dt; k.y += k.vy * dt; k.x += k.vx * dt * 0.6; k.z += k.vz * dt * 0.6; if (k.fall <= 0) {
        k.rescue = 1.6; k.boost = 0; k.drift = false; k.spin = 0; k.lat = 0;
        // nicht direkt vor einer Lücke absetzen: dann hinter der Lücke weiter
        for (let o = 0; o < 90; o++) { const j = (k.safe.i + o) % N; if (tr.GAP[j]) { let e = j; while (tr.GAP[e % N]) e++; k.safe = { i: (e + 6) % N, lat: 0 }; break; } }
      } return 0; }
      if (k.spin > 0) { k.spin -= dt; k.spinA += dt * 14; I = { steer: 0, gas: false, brake: false, drift: false }; } else k.spinA = 0;
      if (this.count > 0) I = { steer: 0, gas: false, brake: false, drift: false };
      if (k.rocket > 0) {
        k.rocket -= dt; const ti = (k.idx + 22) % N, P = tr.P[ti];
        const want = Math.atan2(P.x - k.x, P.z - k.z); k.h += wrapA(want - k.h) * Math.min(1, dt * 6);
        const f = this.fwd(k), sp = 78; k.vx = f.x * sp; k.vz = f.z * sp; k.x += k.vx * dt; k.z += k.vz * dt;
        const nr = tr.nearest(k.idx, k.x, k.y, k.z); this.advance(k, nr.i); k.lat = nr.lat; k.y = lerp(k.y, tr.P[nr.i].y, 0.3); k.grounded = true; k.vy = 0; k.safe = { i: nr.i, lat: 0 };
        if (Math.random() < 0.7) this.fx.emit(k.x - f.x * 3, k.y + 1, k.z - f.z * 3, -f.x * 5, rnd(0, 2), -f.z * 5, 0.4, 1.4, '#ffb02e', -1);
        if (k.rocket <= 0) k.boost = 0.6;
        return sp;
      }
      let near = tr.nearest(k.idx, k.x, k.y, k.z);
      if (Math.abs(near.lat) > tr.HW[near.i] + 45) near = tr.globalNearest(k.x, k.y, k.z);
      this.advance(k, near.i); k.lat = near.lat;
      const gr = tr.ground(near.i, near.lat);
      k.surf = gr ? gr.surf : 'air';
      const offroad = gr && gr.surf === 'grass';
      const rb = k.human ? 1 : this.rubber(k);
      let vmax = VMAX * st.vmax * (k.human ? 1 : [0.84, 0.93, 1.0][diff] * k.skill * rb);
      if (k.shrink > 0) vmax *= 0.7; if (k.gold > 0) vmax *= 1.2; if (k.cloud > 0) vmax *= 1.06; if (k.boost > 0) vmax *= 1.42;
      if (offroad && k.boost <= 0 && k.gold <= 0 && k.grounded) vmax *= 0.48;
      const f = this.fwd(k), r = { x: -f.z, z: f.x };
      let fs = k.vx * f.x + k.vz * f.z, ls = k.vx * r.x + k.vz * r.z;
      if (k.grounded) {
        if (I.gas) { if (fs < vmax) fs += 28 * st.acc * dt * (1 - Math.max(0, fs) / vmax * 0.8); }
        if (I.brake) { fs -= (fs > 0 ? 44 : 14) * dt; fs = Math.max(fs, -14); }
        if (!I.gas && !I.brake) fs -= Math.sign(fs) * Math.min(Math.abs(fs), 9 * dt);
      }
      if (fs > vmax) fs -= (fs - vmax) * (k.grounded ? 2.6 : 0.4) * dt;
      if (k.boost > 0) { k.boost -= dt; fs = Math.min(vmax, fs + 70 * dt); }
      if (I.drift && !k.prevDrift) {
        if (!k.grounded && k.rampAir && !k.trickBoost) { k.trick = 0.5; k.trickBoost = true; Sound.play('whoosh'); if (k.human) this.msg(k.human, 'Trick!', 0.8, '#ffd23d'); }
        else if (k.grounded && Math.abs(fs) > 10) k.hop = 0.25;
      }
      if (I.drift && !k.drift && Math.abs(fs) > 15 && Math.abs(I.steer) > 0.3 && k.spin <= 0 && k.grounded) { k.drift = true; k.dDir = Math.sign(I.steer); k.charge = 0; }
      if (k.drift) {
        k.charge += dt * (0.75 + 0.55 * Math.abs(I.steer + k.dDir * 0.25));
        const lvl = k.charge > 3.0 ? 3 : k.charge > 1.9 ? 2 : k.charge > 0.9 ? 1 : 0;
        if (k.human && lvl > k.lvl) Sound.play('spark'); k.lvl = lvl;
        if (!I.drift || Math.abs(fs) < 9) { k.drift = false; if (lvl) { k.boost = Math.max(k.boost, [0, 0.6, 1.1, 1.6][lvl]); if (k.human) Sound.play('boost'); } k.lvl = 0; k.charge = 0; }
      }
      k.prevDrift = I.drift;
      if (k.hop > 0) k.hop -= dt; if (k.trick > 0) k.trick -= dt;
      const grip = (k.grounded ? tr.def.grip : 0.15) * (k.drift ? 0.3 : 1) * (offroad ? 0.8 : 1) * 9;
      ls *= Math.exp(-grip * dt);
      const spF = clamp(Math.abs(fs) / 14, 0, 1), dir = fs >= 0 ? 1 : -1;
      let rate = k.drift ? (k.dDir * 0.72 + I.steer * 0.45) * 2.1 * st.hand : I.steer * 2.0 * st.hand * (1 - 0.32 * clamp(fs / VMAX, 0, 1));
      if (!k.grounded) rate *= 0.45;
      k.h -= rate * spF * dir * dt;
      k.steerVis = lerp(k.steerVis, I.steer, 0.2);
      const nf = this.fwd(k), nr = { x: -nf.z, z: nf.x };
      k.vx = nf.x * fs + nr.x * ls; k.vz = nf.z * fs + nr.z * ls;
      k.x += k.vx * dt; k.z += k.vz * dt;
      // Wände und Höhe
      const near2 = tr.nearest(k.idx, k.x, k.y, k.z, 20), g2 = tr.ground(near2.i, near2.lat);
      if (g2 && g2.wall) {
        const s = Math.sign(near2.lat), lim = tr.outer(s < 0 ? 0 : 1, near2.i) - 0.8, R = tr.R[near2.i], over = Math.abs(near2.lat) - lim;
        if (over > 0) { k.x -= R.x * s * over; k.z -= R.z * s * over; const vn = k.vx * R.x + k.vz * R.z; if (vn * s > 0) { k.vx -= R.x * vn * 1.5; k.vz -= R.z * vn * 1.5; k.vx *= 0.85; k.vz *= 0.85; if (k.human && this.time - this.lastBump > 0.3 && Math.abs(vn) > 6) { this.lastBump = this.time; Sound.play('bump'); } } }
      }
      const gy = g2 ? g2.y : null;
      if (k.grounded) {
        if (gy == null || gy < k.y - 0.6) k.grounded = false;
        else { k.vy = clamp((gy - k.y) / Math.max(dt, 0.001), -30, 30); k.y = gy; }
      }
      if (!k.grounded) {
        k.vy -= GRAV * dt; k.y += k.vy * dt; k.air += dt;
        if (gy != null && k.y <= gy && k.vy <= 0) {
          k.y = gy; k.grounded = true; if (k.air > 0.35) { this.burst(k.x, k.y + 0.3, k.z, '#d8cdb8', 8, true); if (k.human) Sound.play('bump'); }
          if (k.trickBoost) { k.boost = Math.max(k.boost, 0.8); if (k.human) Sound.play('boost'); }
          k.air = 0; k.rampAir = false; k.trickBoost = false; k.vy = 0;
        } else if (gy == null && k.y < tr.P[k.idx].y - 7) {
          k.fall = 0.7; if (k.human) { Sound.play('miss'); this.msg(k.human, 'Abgestürzt!', 1.4, '#ff8a8a'); }
        }
      } else { k.air = 0; if (g2 && g2.surf === 'road' && Math.abs(near2.lat) < tr.HW[near2.i] - 1 && !tr.GAP[(near2.i + 30) % N]) k.safe = { i: near2.i, lat: 0 }; }
      if (k.grounded) {
        for (const p of tr.pads) { const d = (k.idx - p.k + N) % N; if ((d < 8 || d > N - 4) && Math.abs(k.lat - p.lat) < 2.8 && k.boost < 0.7) { k.boost = 1.0; if (k.human) Sound.play('boost'); } }
        for (const rp of tr.ramps) { const d = (k.idx - rp.k + N) % N; if (d >= 2 && d < 7 && Math.abs(k.lat - rp.lat) < rp.w / 2 && fs > 12) { k.grounded = false; k.vy = rp.pw * clamp(fs / VMAX, 0.6, 1.25); k.rampAir = true; k.trick = 0; this.burst(k.x, k.y + 0.4, k.z, '#ffe14d', 10); } }
      }
      // Partikel
      if (k.grounded && Math.abs(fs) > 14 && offroad && Math.random() < 0.5) this.smoke.emit(k.x - nf.x * 1.5, k.y + 0.3, k.z - nf.z * 1.5, rnd(-1, 1), rnd(1, 3), rnd(-1, 1), 0.7, 1.6, tr.def.theme === 'ice' ? '#ffffff' : tr.def.theme === 'beach' ? '#e8d3a0' : '#9c8a62', 2.5, 0);
      if (k.drift && k.lvl > 0) { const col = ['#fff', '#4fd6ff', '#ff9a3d', '#d26bff'][k.lvl]; for (const s of [-1, 1]) this.fx.emit(k.x - nf.x * 1.3 + nr.x * s * 1.0, k.y + 0.25, k.z - nf.z * 1.3 + nr.z * s * 1.0, rnd(-3, 3) - nf.x * 3, rnd(1, 4), rnd(-3, 3) - nf.z * 3, 0.25, rnd(0.4, 0.8), col, -1, 10); }
      else if (k.drift && Math.random() < 0.4) this.smoke.emit(k.x - nf.x * 1.4, k.y + 0.2, k.z - nf.z * 1.4, rnd(-1, 1), 1, rnd(-1, 1), 0.5, 1, '#dddddd', 2, 0);
      if (k.boost > 0 || k.goldT > 0) { for (const s of [-0.32, 0.32]) this.fx.emit(k.x - nf.x * 2.4 + nr.x * s, k.y + 1.1, k.z - nf.z * 2.4 + nr.z * s, -nf.x * 6 + rnd(-1, 1), rnd(0, 1.5), -nf.z * 6 + rnd(-1, 1), 0.22, rnd(0.6, 1.1), k.goldT > 0 ? '#ffd23d' : '#ff8a1f', -2, 0); }
      for (const t of ['shrink', 'gold', 'shield', 'ink', 'goldT']) if (k[t] > 0) k[t] = Math.max(0, k[t] - dt);
      if (k.cloud > 0) { k.cloud -= dt; if (k.cloud <= 0) { Sound.play('boom'); this.burst(k.x, k.y + 4, k.z, '#ffe14d', 20); if (k.shield > 0) k.shield = 0; else { k.shrink = 5; k.spin = 0.6; } if (k.human) this.msg(k.human, 'Blitz!', 1.2, '#ffe14d'); } }
      if (k.roll > 0) { k.roll -= dt; if (k.human && Math.random() < 0.5) Sound.play('roll'); if (k.roll <= 0 && k.human) Sound.play('itemGet'); }
      if (I.item) this.useItem(k);
      const tdot = nf.x * tr.T[k.idx].x + nf.z * tr.T[k.idx].z; k.wrong = (tdot < -0.3 && Math.abs(fs) > 5) ? k.wrong + dt : 0;
      return fs;
    }
    advance(k, ni) {
      const N = this.track.N; let d = ni - k.idx; if (d > N / 2) d -= N; if (d < -N / 2) d += N;
      k.idx = ni; k.prog += d / N;
      const lap = Math.floor(k.prog);
      if (lap > k.lapShown && lap >= 1) {
        k.lapShown = lap;
        if (lap >= LAPS && !k.fin) this.finish(k);
        else if (k.human) { if (lap === LAPS - 1) { Sound.play('finalLap'); this.msg(k.human, 'Letzte Runde!', 2, '#ffd23d'); } else Sound.play('lap'); }
      }
    }
    rubber(k) { const hs = this.karts.filter(o => o.human); if (!hs.length) return 1; const best = Math.max(...hs.map(o => o.prog)), d = k.prog - best; return d > 0.12 ? 0.92 : d < -0.15 ? 1.08 : 1; }
    finish(k) {
      k.fin = true; k.time = this.time;
      if (k.human) { Sound.play('finish'); this.msg(k.human, 'Ziel! ' + this.karts.filter(o => o.fin).length + '. Platz', 5, '#ffd23d'); K.sendTo(k.human, { t: 'mode', m: 'pointer' }); const bk = 'kt2-best-' + trackIdx, b = K.store.get(bk, null); if (b == null || k.time < b) K.store.set(bk, k.time); }
    }

    update(dt) {
      const tr = this.track;
      if (this.count > 0) {
        this.count -= dt; const n = Math.ceil(this.count - 0.8);
        if (n < this.beeped && n >= 1 && n <= 3) { this.beeped = n; Sound.play('beep'); }
        if (this.count <= 0.8 && this.beeped > 0) { this.beeped = 0; Sound.play('beepGo'); }
        const lit = this.count > 3.8 ? 0 : clamp(4 - Math.ceil(this.count - 0.8), 0, 3), go = this.count <= 0.8;
        tr.lamps.forEach((l, i) => { const on = !go && i < lit; l.material.emissive.set(go ? '#22ff55' : on ? '#ff2a2a' : '#000000'); l.material.emissiveIntensity = go || on ? 2.2 : 0; });
      } else this.time += dt;
      const t = this.time + (4.2 - Math.max(0, this.count));
      tr.anim.forEach(f => f(t));
      if (tr.space) tr.roadTex.offset.y = -t * 0.15;
      if (tr.water) tr.water.position.y = tr.baseY + 1.2 + Math.sin(t * 0.8) * 0.15;
      tr.crystalMat.emissive.setHSL((t * 0.15) % 1, 0.9, 0.5);
      for (const b of tr.boxes) { b.mesh.rotation.y += dt * 1.5; b.mesh.rotation.x += dt * 0.7; b.mesh.position.y = b.y + 1.7 + Math.sin(t * 2 + b.x) * 0.25; if (b.t > 0) { b.t -= dt; b.mesh.visible = b.t <= 0; } }
      for (const o of this.obs) o.update && o.update(t, dt);
      for (const k of this.karts) {
        const I = this.input(k, dt), fs = this.physics(k, I, dt);
        if (k.eng) k.eng.set(Math.abs(fs), !this.done);
        if (k.fall > 0 || k.rescue > 0) continue;
        for (const b of tr.boxes) {
          if (b.t > 0) continue; const dx = b.x - k.x, dz = b.z - k.z;
          if (dx * dx + dz * dz < 8 && Math.abs(k.y - b.y) < 3) { b.t = 2.5; b.mesh.visible = false; this.burst(b.x, b.y + 1.7, b.z, new THREE.Color().setHSL(Math.random(), 0.9, 0.6), 14); if (!k.item && k.goldT <= 0) { k.item = rollItem(k.rank || 8, this.karts.length); k.cnt = USES[k.item] || 1; k.roll = k.human ? 1.2 : 0; k.aiT = rnd(1, 4); if (k.human) Sound.play('pickup'); } }
        }
        for (const o of this.obs) {
          if (o.t === 'snowball' && !o.mesh.visible) continue;
          const dx = k.x - o.x, dz = k.z - o.z, d = Math.hypot(dx, dz), rr = o.r + (k.shrink > 0 ? 0.6 : 1.2);
          if (d < rr && Math.abs(k.y - o.mesh.position.y) < 4) {
            if (o.solid) { const nx = dx / (d || 1), nz = dz / (d || 1), ov = rr - d; k.x += nx * ov; k.z += nz * ov; const vn = k.vx * nx + k.vz * nz; if (vn < 0) { k.vx -= nx * vn * 1.6; k.vz -= nz * vn * 1.6; k.vx *= 0.6; k.vz *= 0.6; if (k.human) Sound.play('bump'); } }
            if (o.harm) this.hit(k, o.t === 'geyser' ? 'Feuer!' : 'Autsch!', o.t === 'geyser');
          }
        }
      }
      for (let i = 0; i < this.karts.length; i++) for (let j = i + 1; j < this.karts.length; j++) {
        const a = this.karts[i], b = this.karts[j]; if (a.fall > 0 || b.fall > 0 || a.rescue > 0 || b.rescue > 0) continue;
        const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), ra = a.shrink > 0 ? 0.7 : 1.3, rb2 = b.shrink > 0 ? 0.7 : 1.3;
        if (d > 0.01 && d < ra + rb2 && Math.abs(a.y - b.y) < 2.5) {
          const nx = dx / d, nz = dz / d, ov2 = ra + rb2 - d, big = o => o.gold > 0 || o.rocket > 0;
          const wa = a.st.w * (a.shrink > 0 ? 0.4 : 1) * (big(a) ? 6 : 1), wb = b.st.w * (b.shrink > 0 ? 0.4 : 1) * (big(b) ? 6 : 1), s = wa + wb;
          a.x -= nx * ov2 * wb / s; a.z -= nz * ov2 * wb / s; b.x += nx * ov2 * wa / s; b.z += nz * ov2 * wa / s;
          const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
          if (rv < 0) { const imp = -rv * 1.3; a.vx -= nx * imp * wb / s; a.vz -= nz * imp * wb / s; b.vx += nx * imp * wa / s; b.vz += nz * imp * wa / s; }
          if (big(a) && !big(b)) this.hit(b, 'Umgehauen!', true); if (big(b) && !big(a)) this.hit(a, 'Umgehauen!', true);
          if (a.shrink > 0 && b.shrink <= 0) this.hit(a, 'Plattgefahren!'); if (b.shrink > 0 && a.shrink <= 0) this.hit(b, 'Plattgefahren!');
          const pass = (from, to) => { if (from.cloud > 0 && to.cloud <= 0 && (from.cloudCool || 0) < this.time) { to.cloud = from.cloud; from.cloud = 0; to.cloudCool = this.time + 1; Sound.play('pop'); if (to.human) this.msg(to.human, 'Wolke erwischt!', 1.2, '#c9cfe0'); return true; } return false; };
          pass(a, b) || pass(b, a);
          if ((a.human || b.human) && this.time - this.lastBump > 0.25 && Math.abs(rv) > 4) { this.lastBump = this.time; Sound.play('bump'); this.burst((a.x + b.x) / 2, a.y + 1, (a.z + b.z) / 2, '#ffe9a0', 6); }
        }
      }
      for (const tp of this.traps) {
        tp.life -= dt; tp.safe -= dt; if (tp.type === 'fake') tp.m.rotation.y += dt * 1.5;
        for (const k of this.karts) { if (tp.safe > 0 && k === tp.owner) continue; if (k.fall > 0 || k.rescue > 0) continue; const dx = tp.x - k.x, dz = tp.z - k.z; if (dx * dx + dz * dz < 5 && Math.abs(k.y - tp.y) < 2.5) { this.hit(k, tp.type === 'oil' ? 'Ausgerutscht!' : 'Reingefallen!'); tp.life = 0; break; } }
        if (tp.life <= 0) this.scene.remove(tp.m);
      }
      this.traps = this.traps.filter(x => x.life > 0);
      this.updateProjs(dt);
      const sorted = [...this.karts].sort((a, b) => (a.fin && b.fin) ? a.time - b.time : a.fin ? -1 : b.fin ? 1 : b.prog - a.prog);
      sorted.forEach((k, i) => k.rank = i + 1);
      for (const p of [1, 2]) if (this.msgs[p]) { this.msgs[p].t -= dt; if (this.msgs[p].t <= 0) this.msgs[p] = null; }
      const hs = this.karts.filter(k => k.human);
      if (!this.done && (hs.every(k => k.fin) || this.time > 540)) { this.done = true; this.endT = 4; }
      if (this.done) { this.endT -= dt; if (this.endT <= 0 && state === 'race') { this.complete(); return; } }
      this.hudT = (this.hudT || 0) - dt;
      if (this.hudT <= 0) { this.hudT = 0.5; hs.forEach(k => K.sendTo(k.human, { t: 'hud', pos: k.rank, lap: clamp(Math.floor(k.prog) + 1, 1, LAPS), item: k.item && k.roll <= 0 ? ITEMS[k.item] : k.goldT > 0 ? 'Goldbooster' : '' })); }
      this.fx.update(dt); this.smoke.update(dt);
      this.visuals(dt);
    }
    updateProjs(dt) {
      const tr = this.track;
      for (const p of this.projs) {
        p.life -= dt; p.safe -= dt;
        if (p.type === 'comet') {
          const tg = p.target; if (!tg || tg.fin) { p.life = 0; this.scene.remove(p.m); continue; }
          const d = Math.hypot(tg.x - p.x, tg.z - p.z);
          if (d > 25) { const nr = tr.nearest(p.idx, p.x, p.y, p.z, 40); p.idx = nr.i; const P = tr.P[(p.idx + 16) % tr.N]; const dx = P.x - p.x, dz = P.z - p.z, l = Math.hypot(dx, dz) || 1; p.x += dx / l * 110 * dt; p.z += dz / l * 110 * dt; p.y = lerp(p.y, P.y + 12, 0.1); }
          else { const dx = tg.x - p.x, dz = tg.z - p.z, dy = tg.y + 1 - p.y, l = Math.hypot(dx, dz, dy) || 1; p.x += dx / l * 60 * dt; p.z += dz / l * 60 * dt; p.y += dy / l * 60 * dt; if (l < 2) { this.explode(p.x, p.y, p.z, 8); p.life = 0; } }
          p.m.position.set(p.x, p.y, p.z); p.m.rotation.z += dt * 6;
          for (let i = 0; i < 3; i++) this.fx.emit(p.x, p.y, p.z, rnd(-2, 2), rnd(-2, 2), rnd(-2, 2), 0.6, rnd(1, 2), '#7fc8ff', -1.5, 0);
          if (p.life <= 0) this.scene.remove(p.m); continue;
        }
        if (p.type === 'bomb') {
          if (p.fuse == null) { p.vy -= GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; const nr = tr.nearest(p.idx, p.x, p.y, p.z, 40); p.idx = nr.i; const g = tr.ground(nr.i, nr.lat); if (g && p.y <= g.y + 1) { p.y = g.y + 1; p.fuse = 1.1; Sound.play('fuse'); } else if (!g && p.y < tr.P[nr.i].y - 10) p.life = 0; }
          else { p.fuse -= dt; p.m.spark.visible = Math.sin(p.fuse * 40) > 0; if (p.fuse <= 0) { this.explode(p.x, p.y, p.z, 7.5); p.life = 0; } }
          p.m.position.set(p.x, p.y, p.z);
          if (p.fuse == null && p.life > 0) for (const k of this.karts) { if (p.safe > 0 && k === p.owner) continue; if (Math.hypot(k.x - p.x, k.z - p.z) < 2.2 && Math.abs(k.y + 1 - p.y) < 2) { this.explode(p.x, p.y, p.z, 7.5); p.life = 0; break; } }
          if (p.life <= 0) this.scene.remove(p.m); continue;
        }
        const nr = tr.nearest(p.idx, p.x, p.y, p.z, 30); p.idx = nr.i;
        if (p.type === 'drone') {
          let ax, az, ay; const tg = p.target && !p.target.fin ? p.target : null;
          if (tg && Math.hypot(tg.x - p.x, tg.z - p.z) < 45) { ax = tg.x; az = tg.z; ay = tg.y; } else { const P = tr.P[(p.idx + 14) % tr.N]; ax = P.x; az = P.z; ay = P.y; }
          const dx = ax - p.x, dz = az - p.z, dl = Math.hypot(dx, dz) || 1;
          p.vx = lerp(p.vx, dx / dl * 74, Math.min(1, dt * 5)); p.vz = lerp(p.vz, dz / dl * 74, Math.min(1, dt * 5)); p.y = lerp(p.y, ay + 1.4, 0.15);
          p.m.props.forEach(pr => pr.rotation.y += dt * 40); p.m.rotation.y = Math.atan2(p.vx, p.vz);
        } else {
          const g = tr.ground(nr.i, nr.lat);
          if (g && g.wall) { const R = tr.R[p.idx], s = Math.sign(nr.lat), vn = p.vx * R.x + p.vz * R.z; if (vn * s > 0) { p.vx -= 2 * vn * R.x; p.vz -= 2 * vn * R.z; p.bounce++; if (p.bounce > 6) p.life = 0; } }
          if (g) p.y = lerp(p.y, g.y + 0.8, 0.4); else { p.y -= 20 * dt; if (p.y < tr.P[nr.i].y - 8) p.life = 0; }
          p.m.rotation.x += dt * 12;
          if (Math.random() < 0.3) this.fx.emit(p.x, p.y, p.z, 0, 0.5, 0, 0.3, 0.6, '#9cf59c', -1, 0);
        }
        p.x += p.vx * dt; p.z += p.vz * dt; p.m.position.set(p.x, p.y, p.z);
        for (const k of this.karts) { if (p.safe > 0 && k === p.owner) continue; if (k.fall > 0 || k.rescue > 0) continue; const dx = k.x - p.x, dz = k.z - p.z; if (dx * dx + dz * dz < 5.5 && Math.abs(k.y + 0.8 - p.y) < 2.5) { this.hit(k); this.burst(p.x, p.y, p.z, p.type === 'ball' ? '#7dff9a' : '#ff6b6b', 16); p.life = 0; break; } }
        for (const o of this.projs) { if (o !== p && o.life > 0 && p.life > 0 && (o.type === 'ball' || o.type === 'drone')) { const dx = o.x - p.x, dz = o.z - p.z; if (dx * dx + dz * dz < 2.5) { o.life = 0; p.life = 0; this.burst(p.x, p.y, p.z, '#ffffff', 10); } } }
        for (const tp of this.traps) { const dx = tp.x - p.x, dz = tp.z - p.z; if (p.life > 0 && dx * dx + dz * dz < 3.5) { tp.life = 0; this.scene.remove(tp.m); p.life = 0; } }
        for (const ob of this.obs) if (ob.solid && p.life > 0 && Math.hypot(ob.x - p.x, ob.z - p.z) < ob.r + 0.6) { p.life = 0; this.burst(p.x, p.y, p.z, '#ffffff', 8); }
        if (p.life <= 0) this.scene.remove(p.m);
      }
      this.projs = this.projs.filter(p => p.life > 0);
      this.traps = this.traps.filter(x => x.life > 0);
    }
    complete() {
      const avg = this.track.len / (VMAX * 0.86);
      this.karts.forEach(k => { if (!k.fin) k.time = this.time + Math.max(0, LAPS - k.prog) * avg + k.rank * 0.3; });
      const res = [...this.karts].sort((a, b) => a.time - b.time); res.forEach((k, i) => k.rank = i + 1);
      this.karts.forEach(k => k.eng && k.eng.set(0, false));
      showResults(res);
    }
    visuals(dt) {
      const tr = this.track;
      for (const k of this.karts) {
        const m = k.m, sp = Math.hypot(k.vx, k.vz);
        m.g.position.set(k.x, k.y + (k.hop > 0 ? Math.sin((0.25 - k.hop) / 0.25 * Math.PI) * 0.6 : 0), k.z);
        const i2 = (k.idx + 3) % tr.N, i1 = (k.idx - 3 + tr.N) % tr.N, slope = Math.atan2(tr.P[i2].y - tr.P[i1].y, Math.hypot(tr.P[i2].x - tr.P[i1].x, tr.P[i2].z - tr.P[i1].z));
        const fdot = Math.sin(k.h) * tr.T[k.idx].x + Math.cos(k.h) * tr.T[k.idx].z;
        m.g.rotation.set(0, k.h, 0); m.body.rotation.x = lerp(m.body.rotation.x, k.grounded ? -slope * fdot : clamp(-k.vy * 0.02, -0.4, 0.4), 0.2);
        m.body.rotation.y = (k.drift ? -k.dDir * 0.42 : 0) + k.spinA + (k.trick > 0 ? (0.5 - k.trick) * TAU * 2 : 0);
        m.body.rotation.z = lerp(m.body.rotation.z, -k.steerVis * (k.drift ? 0.12 : 0.06), 0.2);
        m.wheels.forEach(w => w.rotation.x += sp * dt * 2.2); m.front.forEach(fw => fw.rotation.y = -k.steerVis * 0.45);
        m.g.scale.setScalar(lerp(m.g.scale.x, k.shrink > 0 ? 0.5 : 1, Math.min(1, dt * 8)));
        m.flames.forEach(fl => { fl.visible = k.boost > 0 || k.goldT > 0 || k.gold > 0; fl.scale.setScalar(0.8 + Math.random() * 0.5); fl.material.color.set(k.goldT > 0 || k.gold > 0 ? '#ffd23d' : k.boost > 1.2 ? '#d26bff' : '#ff8a1f'); });
        m.shield.visible = k.shield > 0; m.shell.visible = k.rocket > 0; m.drv.root.visible = k.rocket <= 0; m.cloud.visible = k.cloud > 0;
        if (k.cloud > 0) { m.cloud.rotation.y += dt * 2; if (Math.random() < 0.05) this.fx.emit(k.x, k.y + 3.6, k.z, 0, -6, 0, 0.2, 1.2, '#ffe14d', 0, 0); }
        if (k.gold > 0) { m.paint.color.setHSL((this.time * 1.5) % 1, 0.9, 0.6); if (Math.random() < 0.6) this.fx.emit(k.x + rnd(-1, 1), k.y + rnd(0.5, 2), k.z + rnd(-1, 1), 0, 2, 0, 0.4, 0.8, new THREE.Color().setHSL(Math.random(), 1, 0.7), -1, 0); } else m.paint.color.copy(m.baseColor);
        m.drv.anim(this.time, 'idle'); m.drv.legs.forEach(l => l.rotation.x = -1.35); m.drv.arms.forEach((a, i) => { a.rotation.x = -1.15; a.rotation.z = (i ? 1 : -1) * 0.25 - k.steerVis * 0.3; });
        const gr = tr.ground(k.idx, k.lat); m.blob.visible = !!gr && k.fall <= 0; if (gr) { m.blob.position.set(k.x, gr.y + 0.07, k.z); const hgt = k.y - gr.y; m.blob.scale.setScalar(clamp(1 - hgt * 0.06, 0.4, 1) * (k.shrink > 0 ? 0.5 : 1)); m.blob.material.opacity = clamp(0.3 - hgt * 0.02, 0.08, 0.3); }
        if (k.rescue > 0) { if (!k.drone) { k.drone = makeRescue(); this.scene.add(k.drone); } k.drone.position.set(k.x, k.y + 4.2, k.z); k.drone.props.forEach(p => p.rotation.y += dt * 30); } else if (k.drone) { this.scene.remove(k.drone); k.drone = null; }
      }
      for (const c of this.cams) {
        const k = c.k, f = this.fwd(k);
        const back = k.shrink > 0 ? 5.5 : 7.6, hgt = k.shrink > 0 ? 2.6 : 3.3;
        const baseY = k.fall > 0 ? tr.P[k.safe.i].y : k.y;
        c.pos.lerp(new THREE.Vector3(k.x - f.x * back, baseY + hgt, k.z - f.z * back), Math.min(1, dt * (k.rescue > 0 ? 3 : 7)));
        c.look.lerp(new THREE.Vector3(k.x + f.x * 7, baseY + 1.4, k.z + f.z * 7), Math.min(1, dt * 9));
        c.cam.position.copy(c.pos);
        if (c.shake > 0) { c.shake -= dt; c.cam.position.x += rnd(-1, 1) * c.shake; c.cam.position.y += rnd(-1, 1) * c.shake; }
        c.cam.lookAt(c.look); c.cam.rotateZ(-k.steerVis * 0.03);
        const fov = 70 + (k.boost > 0 || k.gold > 0 || k.rocket > 0 ? 12 : 0); c.cam.fov = lerp(c.cam.fov, fov, Math.min(1, dt * 4)); c.cam.updateProjectionMatrix();
      }
    }
    render() {
      renderer.setScissorTest(true);
      const vw = W / this.views;
      this.cams.forEach((c, i) => {
        const k = c.k; this.sun.position.set(k.x - 60, k.y + 120, k.z + 40); this.sun.target.position.set(k.x, k.y, k.z); this.sun.target.updateMatrixWorld();
        renderer.setViewport(i * vw, 0, vw, H); renderer.setScissor(i * vw, 0, vw, H); renderer.render(this.scene, c.cam);
      });
      renderer.setScissorTest(false);
      this.drawHud();
    }
    drawHud() {
      const c = hc; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      const vw = W / this.views, fs = clamp(H * 0.085, 34, 84);
      const T = (s, x, y, size, col, al = 'left', base = 'top', stroke = 'rgba(0,0,0,.65)') => { c.font = `900 ${size}px Nunito, sans-serif`; c.textAlign = al; c.textBaseline = base; c.lineJoin = 'round'; c.lineWidth = size * 0.2; c.strokeStyle = stroke; c.strokeText(s, x, y); if (typeof col === 'string') c.fillStyle = col; else { const g = c.createLinearGradient(0, y - (base === 'middle' ? size / 2 : 0), 0, y + size); col.forEach((cc, i) => g.addColorStop(i / (col.length - 1), cc)); c.fillStyle = g; } c.fillText(s, x, y); };
      this.cams.forEach((cm, vi) => {
        const k = cm.k, x0 = vi * vw;
        c.save(); c.beginPath(); c.rect(x0, 0, vw, H); c.clip();
        if (k.ink > 0) { c.fillStyle = `rgba(45,20,95,${Math.min(0.92, k.ink / 2.5)})`; for (let i = 0; i < 10; i++) { const r = H * (0.1 + (i % 3) * 0.06); c.beginPath(); c.arc(x0 + vw * (0.15 + (i * 0.37) % 0.7), H * (0.2 + (i * 0.23) % 0.6), r, 0, TAU); c.fill(); } }
        // Platz (unten links)
        const rk = k.rank, grad = rk === 1 ? ['#fff3a0', '#ffc61a', '#e08a00'] : rk === 2 ? ['#ffffff', '#c9d3dc', '#8a96a3'] : rk === 3 ? ['#ffd3a8', '#e08a4a', '#a8572a'] : ['#ffffff', '#e8eef5', '#b8c4d0'];
        T(rk + '.', x0 + 24, H - 18, fs * 1.55, grad, 'left', 'bottom');
        // Runde und Zeit
        const lap = clamp(Math.floor(k.prog) + 1, 1, LAPS);
        c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.roundRect(x0 + 18, 16, 190, 70, 18); c.fill();
        T('Runde ' + lap + '/' + LAPS, x0 + 32, 22, 26, '#ffffff', 'left', 'top', 'rgba(0,0,0,0)');
        T(fmtT(this.time), x0 + 32, 54, 22, '#ffd23d', 'left', 'top', 'rgba(0,0,0,0)');
        // Item-Feld
        const bs = clamp(H * 0.13, 64, 120), bx = x0 + 226, by = 12;
        const ig = c.createRadialGradient(bx + bs / 2, by + bs / 2, bs * 0.1, bx + bs / 2, by + bs / 2, bs * 0.6); ig.addColorStop(0, 'rgba(255,255,255,.95)'); ig.addColorStop(1, 'rgba(200,225,255,.85)');
        c.fillStyle = ig; c.beginPath(); c.arc(bx + bs / 2, by + bs / 2, bs / 2, 0, TAU); c.fill();
        c.lineWidth = 6; c.strokeStyle = players === 2 ? (k.human === 1 ? '#1b9fd6' : '#e5242f') : '#1b9fd6'; c.stroke(); c.lineWidth = 2; c.strokeStyle = '#ffffff'; c.beginPath(); c.arc(bx + bs / 2, by + bs / 2, bs / 2 - 6, 0, TAU); c.stroke();
        if (k.goldT > 0) { drawIcon(c, 'goldturbo', bx + bs / 2, by + bs / 2, bs * 0.9); c.strokeStyle = '#ffd23d'; c.lineWidth = 6; c.beginPath(); c.arc(bx + bs / 2, by + bs / 2, bs / 2 + 4, -Math.PI / 2, -Math.PI / 2 + TAU * k.goldT / 7); c.stroke(); }
        else if (k.item) { const show = k.roll > 0 ? ITEM_LIST[Math.floor(this.time * 14) % ITEM_LIST.length] : k.item; drawIcon(c, show, bx + bs / 2, by + bs / 2, bs * 0.9); if (USES[k.item] && k.roll <= 0) T('×' + k.cnt, bx + bs - 4, by + bs, bs * 0.28, '#ffffff', 'right', 'bottom'); }
        // Tacho
        const spd = Math.hypot(k.vx, k.vz), gx = x0 + vw - 96, gyy = H - 26;
        c.lineWidth = 12; c.strokeStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.arc(gx, gyy, 60, Math.PI, TAU); c.stroke();
        const sg = c.createLinearGradient(gx - 60, 0, gx + 60, 0); sg.addColorStop(0, '#4fd6ff'); sg.addColorStop(0.7, '#ffd23d'); sg.addColorStop(1, '#ff5a3d');
        c.strokeStyle = sg; c.beginPath(); c.arc(gx, gyy, 60, Math.PI, Math.PI + Math.PI * clamp(spd / (VMAX * 1.45), 0, 1)); c.stroke();
        T(String(Math.round(spd * 3.6)), gx, gyy - 12, 28, '#ffffff', 'center', 'bottom'); T('km/h', gx, gyy - 2, 13, '#cfe3ff', 'center', 'bottom', 'rgba(0,0,0,0)');
        if (k.drift && k.lvl) T(['', 'Turbo', 'Super-Turbo', 'Ultra-Turbo'][k.lvl], x0 + vw / 2, H * 0.84, fs * 0.42, ['', '#4fd6ff', '#ff9a3d', '#d26bff'][k.lvl], 'center');
        // Minikarte
        const mm = this.minimap, ms = clamp(H * 0.26, 120, 200), mx = x0 + vw - ms - 16, my = 16;
        c.globalAlpha = 0.92; c.drawImage(mm.cv, mx, my, ms, ms); c.globalAlpha = 1;
        const f = ms / mm.S;
        for (const o of [...this.karts].sort((a, b) => b.rank - a.rank)) { const px = mx + (o.x * mm.sc + mm.ox) * f, py = my + (o.z * mm.sc + mm.oz) * f; c.fillStyle = o.d.kart; c.beginPath(); c.arc(px, py, o === k ? 8 : 5.5, 0, TAU); c.fill(); c.strokeStyle = o.human ? (o.human === 1 ? '#4fd6ff' : '#ff6b6b') : '#000'; c.lineWidth = o.human ? 3 : 1.5; c.stroke(); }
        const m = this.msgs[k.human]; if (m) T(m.text, x0 + vw / 2, H * 0.3, fs * 0.75, m.col, 'center');
        if (k.wrong > 1.2) T('Falsche Richtung!', x0 + vw / 2, H * 0.42, fs * 0.6, '#ff6b6b', 'center');
        if (k.rescue > 0) T('Rettungsdrohne kommt …', x0 + vw / 2, H * 0.42, fs * 0.45, '#ffffff', 'center');
        if (players === 2) { c.fillStyle = k.human === 1 ? '#1b9fd6' : '#e5242f'; c.fillRect(x0, H - 6, vw, 6); }
        c.restore();
      });
      if (this.views === 2) { c.fillStyle = '#000'; c.fillRect(W / 2 - 2, 0, 4, H); }
      if (this.count > 0 && this.count < 3.8) { const n = Math.ceil(this.count - 0.8); T(n >= 1 ? String(Math.min(3, n)) : 'Los!', W / 2, H * 0.38, H * 0.22, n >= 1 ? ['#ffffff', '#cfe3ff'] : ['#fff3a0', '#ffc61a'], 'center', 'middle'); }
      if (paused) { c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, 0, W, H); }
    }
  }

  function showResults(res) {
    state = 'results'; setPhones('pointer'); Sound.music('menu');
    if (mode === 'cup') res.forEach((k, i) => { cup.pts[k.f.key] = (cup.pts[k.f.key] || 0) + POINTS[i]; });
    const rows = res.map((k, i) => `<tr class="${k.human ? 'me' + k.human : ''}"><td class="n">${i + 1}.</td><td><span class="pic">${portraitOf(k.d, portraits)}</span>${esc(k.d.name)}${k.human ? ' (Spieler ' + k.human + ')' : ''}</td><td class="n">${fmtT(k.time)}${k.fin ? '' : ' *'}</td>${mode === 'cup' ? `<td class="n">+${POINTS[i]}</td><td class="n">${cup.pts[k.f.key]}</td>` : ''}</tr>`).join('');
    const last = mode === 'cup' && trackIdx === TRACKS.length - 1;
    ov.classList.add('on', 'glass');
    card.innerHTML = `<h2>${TRACKS[trackIdx].name}</h2><p>${mode === 'cup' ? 'Rennen ' + (trackIdx + 1) + ' von ' + TRACKS.length : 'Ergebnis'}</p>
      <table class="kt-tbl"><tr><th></th><th>Fahrer</th><th style="text-align:right">Zeit</th>${mode === 'cup' ? '<th style="text-align:right">Punkte</th><th style="text-align:right">Gesamt</th>' : ''}</tr>${rows}</table>
      <p style="font-size:14px">* geschätzt, Fahrer war beim Rennende noch unterwegs</p>
      <div class="kt-row">${mode === 'cup' ? `<button class="hv kt-b big" id="kt-next">${last ? 'Siegerehrung' : 'Nächstes Rennen'}</button>` : `<button class="hv kt-b big" id="kt-again">Nochmal</button><button class="hv kt-b" id="kt-tr">Andere Strecke</button>`}<button class="hv kt-b" id="kt-menu">Kart-Menü</button></div>`;
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
      <div class="kt-pod">${top.map((x, i) => x ? `<div class="col"><div class="pic">${portraitOf(x.f.d, portraits)}</div><div class="nm">${esc(x.f.d.name)}<small>${x.pts} Punkte</small></div><div class="blk" style="height:${hs[i] * 0.6}px;background:${cols[i]}">${[2, 1, 3][i]}</div></div>` : '').join('')}</div>
      <table class="kt-tbl">${list.map((x, i) => `<tr class="${x.f.human ? 'me' + x.f.human : ''}"><td class="n">${i + 1}.</td><td>${esc(x.f.d.name)}${x.f.human ? ' (Spieler ' + x.f.human + ')' : ''}</td><td class="n">${x.pts}</td></tr>`).join('')}</table>
      <div class="kt-row"><button class="hv kt-b big" id="kt-menu">Kart-Menü</button></div>`);
    bind('#kt-menu', showTitle);
  }
  function cleanupRace() { if (race) { race.dispose(); race = null; } hc.setTransform(1, 0, 0, 1, 0, 0); hc.clearRect(0, 0, hud.width, hud.height); renderer.setClearColor('#000'); renderer.clear(); }

  resize(); addEventListener('resize', resize);
  window.__kt = () => ({ race, state, inp });
  showTitle();

  return {
    onFrame(dt) {
      if (state === 'race' && race && !paused) {
        const steps = dt > 1 / 45 ? 2 : 1; for (let i = 0; i < steps && race; i++) race.update(Math.min(dt / steps, 1 / 30));
        if (race) race.render();
      }
    },
    onPause(p) {
      paused = p;
      if (state === 'race' && race) { setPhones(p ? 'pointer' : 'wheel'); race.karts.forEach(k => k.eng && k.eng.set(0, !p)); race.render(); }
    },
    onSteer(v, p) { if (inp[p]) { inp[p].remote = clamp(+v || 0, -1, 1); inp[p].remoteT = performance.now(); } },
    onRemotes() { if (state === 'title') showTitle(); },
    onButton(name, down, p) {
      if (p > 2) return true;
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
      if (p === 2) return true;
      if (name === 'B' && down && state !== 'title') { ({ mode: showTitle, drivers: showMode, tracks: showDrivers, cupintro: showDrivers })[state]?.(); return true; }
      return false;
    },
    close() {
      removeEventListener('resize', resize); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey);
      setPhones('pointer'); if (race) race.dispose(); race = null; renderer.dispose();
    },
  };
}

const tileSVG = big => `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">
  <defs><linearGradient id="ksk${big}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0b3a"/><stop offset="1" stop-color="#3a7bd5"/></linearGradient>
  <linearGradient id="krb${big}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff3b3b"/><stop offset=".2" stop-color="#ff9a1f"/><stop offset=".4" stop-color="#ffe14d"/><stop offset=".6" stop-color="#3ddc5a"/><stop offset=".8" stop-color="#2fb6ff"/><stop offset="1" stop-color="#c04bff"/></linearGradient>
  <style>.kr{animation:kr 1.2s ease-in-out infinite alternate}@keyframes kr{to{transform:translateX(10px)}}@media(prefers-reduced-motion:reduce){.kr{animation:none}}</style></defs>
  <rect width="320" height="200" fill="url(#ksk${big})"/>${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 97) % 320}" cy="${(i * 53) % 110}" r="${i % 3 ? 1 : 1.6}" fill="#fff" opacity=".8"/>`).join('')}
  <path d="M-10 175 C60 120 120 150 170 120 S270 80 330 100 L330 130 C270 110 220 150 170 150 S60 160 -10 205Z" fill="url(#krb${big})" opacity=".95"/>
  <g class="kr" transform="translate(120 118)"><rect x="0" y="22" width="64" height="18" rx="7" fill="#e5242f"/><rect x="10" y="10" width="14" height="16" rx="4" fill="#2f3b52"/><circle cx="17" cy="6" r="9" fill="#ffe0c4"/><path d="M8 4 Q17 -6 26 4Z" fill="#7a5230"/>
  <circle cx="12" cy="42" r="8" fill="#1d1d22"/><circle cx="54" cy="42" r="8" fill="#1d1d22"/><circle cx="12" cy="42" r="3.5" fill="#e8ecf0"/><circle cx="54" cy="42" r="3.5" fill="#e8ecf0"/><rect x="52" y="10" width="14" height="5" fill="#e5242f"/><path d="M-4 26 l-16 -4 l0 10z" fill="#ff9a1f"/></g>
  ${big ? '<text x="160" y="40" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="28" fill="#fff" stroke="#1b5fae" stroke-width="5" paint-order="stroke">Turbo-Flitzer</text>' : ''}</svg>`;

const KartChannel = { id: 'kart', name: 'Kart-Kanal', music: 'menu', tile: el => el.innerHTML = tileSVG(0), preview: el => el.innerHTML = tileSVG(1), open };
if (window.K && K.addChannel) K.addChannel(KartChannel); else addEventListener('load', () => K.addChannel(KartChannel));
