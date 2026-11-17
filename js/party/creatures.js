// Eigene Inselkreaturen für die Insel-Party: Toon-Look mit Umrisslinie.
import * as THREE from '../../lib/three.module.min.js';

const TAU = Math.PI * 2;
let gradTex = null;
export function toonGrad() {
  if (gradTex) return gradTex;
  const d = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  gradTex = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter; gradTex.needsUpdate = true;
  return gradTex;
}
export const toon = (color, extra = {}) => new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: toonGrad() }, extra));
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#2a1c14', side: THREE.BackSide });
export function outline(mesh, s = 1.07) { const o = new THREE.Mesh(mesh.geometry, OUTLINE); o.scale.setScalar(s); o.raycast = () => {}; mesh.add(o); return mesh; }

export const CREATURES = [
  { id: 'pippa', name: 'Pippa', color: '#ff8fc0', belly: '#ffd6e8', accent: '#e8558f', desc: 'Fröhlicher Lagunen-Molch' },
  { id: 'brummo', name: 'Brummo', color: '#5b9cf0', belly: '#cfe3ff', accent: '#2f63b8', desc: 'Gemütlicher Wellenbär' },
  { id: 'zitzi', name: 'Zitzi', color: '#ffd23d', belly: '#fff3b8', accent: '#ff8a1f', desc: 'Kleines Blitzküken' },
  { id: 'glupsch', name: 'Glupsch', color: '#5fcf5a', belly: '#e1f7c8', accent: '#2f8f3a', desc: 'Neugieriger Riffrosch' },
  { id: 'fluffel', name: 'Fluffel', color: '#f7f4ff', belly: '#ffffff', accent: '#6b5a8a', desc: 'Flauschiges Wolkenschaf' },
  { id: 'krakko', name: 'Krakko', color: '#a26bff', belly: '#e3d2ff', accent: '#6a35c9', desc: 'Schlauer Mini-Krake' },
  { id: 'fuxi', name: 'Fuxi', color: '#ff8a3d', belly: '#fff1e0', accent: '#c4561a', desc: 'Flinker Dünenfuchs' },
  { id: 'panzo', name: 'Panzo', color: '#3fc9b4', belly: '#e9e2b0', accent: '#1e7f70', desc: 'Ruhige Panzerkröte' },
];

function sph(r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ol = true, seg = 20) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; if (ol) outline(m); return m;
}
function eyes(g, y, z, sep, size, look = 0) {
  const W = toon('#ffffff'), B = new THREE.MeshBasicMaterial({ color: '#1d1410' }), H = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const out = [];
  for (const s of [-1, 1]) {
    const e = sph(size, W, s * sep, y, z, 1, 1.15, 0.7); g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(size * 0.55, 14, 10), B); p.position.set(look * size * 0.2, -size * 0.05, size * 0.82); p.scale.set(1, 1.1, 0.45); e.add(p);
    const h = new THREE.Mesh(new THREE.SphereGeometry(size * 0.2, 8, 6), H); h.position.set(size * 0.18, size * 0.25, size * 0.3); p.add(h);
    out.push(e);
  }
  return out;
}
function smile(g, y, z, w, open = false) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(w, w * 0.22, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: '#4a1f1a' }));
  m.rotation.z = Math.PI; m.position.set(0, y, z); g.add(m);
  if (open) { const t = new THREE.Mesh(new THREE.CircleGeometry(w * 0.8, 16, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: '#c0392b' })); t.position.set(0, y, z - 0.01); g.add(t); }
  return m;
}
function cheeks(g, y, z, sep, r = 0.13) { const M = new THREE.MeshBasicMaterial({ color: '#ff7b9a', transparent: true, opacity: 0.55 }); for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(r, 14), M); c.position.set(s * sep, y, z); c.rotation.y = s * 0.5; g.add(c); } }

// Baut eine Kreatur. Höhe etwa 2 Einheiten, Blick Richtung +z.
export function makeCreature(def) {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  const C = toon(def.color), Bm = toon(def.belly), A = toon(def.accent);
  const parts = { root, body: g, def, arms: [], feet: [], extra: [] };
  const feet = (y = 0.12, sep = 0.38, mat = A) => { for (const s of [-1, 1]) { const f = sph(0.26, mat, s * sep, y, 0.12, 1.1, 0.6, 1.4); g.add(f); parts.feet.push(f); } };
  const arms = (y, sep, mat = C, r = 0.2) => { for (const s of [-1, 1]) { const a = sph(r, mat, s * sep, y, 0.1, 0.8, 1.2, 0.8); a.rotation.z = s * 0.5; g.add(a); parts.arms.push(a); } };
  switch (def.id) {
    case 'pippa': {
      g.add(sph(0.85, C, 0, 0.95, 0, 1, 0.95, 0.9)); g.add(sph(0.55, Bm, 0, 0.8, 0.42, 1, 0.9, 0.6, false));
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const fr = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 8), A); fr.position.set(s * 0.82, 1.35 - i * 0.22, -0.05); fr.rotation.z = -s * (1.1 + i * 0.25); outline(fr, 1.12); g.add(fr); parts.extra.push(fr);
      }
      eyes(g, 1.15, 0.62, 0.32, 0.17); smile(g, 0.82, 0.78, 0.22); cheeks(g, 0.95, 0.75, 0.52);
      const tail = sph(0.3, C, 0, 0.5, -0.8, 0.6, 0.6, 1.4); g.add(tail); parts.extra.push(tail);
      feet(); arms(0.75, 0.78); break;
    }
    case 'brummo': {
      g.add(sph(0.9, C, 0, 1.0, 0, 1, 1, 0.95)); g.add(sph(0.58, Bm, 0, 0.82, 0.45, 1, 0.95, 0.6, false));
      for (const s of [-1, 1]) { const e = sph(0.28, C, s * 0.58, 1.78, 0); g.add(e); const ie = sph(0.15, Bm, s * 0.58, 1.8, 0.14, 1, 1, 0.5, false); g.add(ie); }
      const snout = sph(0.28, Bm, 0, 0.98, 0.82, 1.2, 0.85, 0.7); g.add(snout); g.add(sph(0.1, new THREE.MeshBasicMaterial({ color: '#2a1c14' }), 0, 1.08, 1.0, 1.3, 0.9, 0.8, false));
      eyes(g, 1.32, 0.7, 0.3, 0.15); smile(g, 0.86, 0.98, 0.12); cheeks(g, 1.05, 0.82, 0.55);
      feet(0.12, 0.42); arms(0.8, 0.85, C, 0.24); break;
    }
    case 'zitzi': {
      g.add(sph(0.78, C, 0, 0.88, 0, 1, 1.05, 1)); g.add(sph(0.5, Bm, 0, 0.72, 0.4, 1, 0.9, 0.6, false));
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 10).rotateX(Math.PI / 2), toon('#ff8a1f')); beak.position.set(0, 0.95, 0.85); outline(beak, 1.15); g.add(beak);
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 6), A); ant.position.set(0.1, 1.85, 0); ant.rotation.z = -0.3; g.add(ant);
      const bolt = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), toon('#ffffff', { emissive: '#ffe14d', emissiveIntensity: 0.8 })); bolt.position.set(0.2, 2.15, 0); g.add(bolt); parts.extra.push(bolt);
      eyes(g, 1.15, 0.62, 0.3, 0.15); cheeks(g, 0.9, 0.7, 0.5);
      for (const s of [-1, 1]) { const w = sph(0.3, A, s * 0.78, 0.85, -0.05, 0.4, 0.9, 0.8); w.rotation.z = s * 0.6; g.add(w); parts.arms.push(w); }
      feet(0.1, 0.32, toon('#ff8a1f')); break;
    }
    case 'glupsch': {
      g.add(sph(0.88, C, 0, 0.85, 0, 1.15, 0.85, 1)); g.add(sph(0.6, Bm, 0, 0.68, 0.42, 1.1, 0.75, 0.6, false));
      for (const s of [-1, 1]) g.add(sph(0.32, C, s * 0.42, 1.52, 0.2));
      const W = toon('#ffffff'), Bk = new THREE.MeshBasicMaterial({ color: '#1d1410' });
      for (const s of [-1, 1]) { const e = sph(0.24, W, s * 0.42, 1.6, 0.38, 1, 1, 0.6); g.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), Bk); p.position.set(0, 0, 0.17); e.add(p); }
      const mouth = smile(g, 0.88, 0.95, 0.42); mouth.scale.set(1, 0.6, 1);
      const spotM = toon(def.accent); for (const [x, y, z] of [[-0.5, 1.1, -0.5], [0.4, 1.2, -0.6], [0.1, 1.4, -0.4]]) g.add(sph(0.12, spotM, x, y, z, 1, 0.5, 1, false));
      cheeks(g, 0.95, 0.85, 0.65); feet(0.1, 0.5); arms(0.65, 0.95); break;
    }
    case 'fluffel': {
      const W = C;
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, yy = 0.95 + Math.sin(i * 1.7) * 0.25; if (Math.sin(a) > 0.35) continue; g.add(sph(0.42, W, Math.cos(a) * 0.62, yy, Math.sin(a) * 0.55, 1, 1, 1, true, 14)); }
      g.add(sph(0.75, W, 0, 1.0, 0)); g.add(sph(0.45, W, 0, 1.55, 0));
      const face = sph(0.45, toon('#6b5a8a'), 0, 1.1, 0.68, 1, 1.05, 0.5); g.add(face);
      eyes(g, 1.2, 0.86, 0.17, 0.12); smile(g, 0.95, 0.9, 0.09); cheeks(g, 1.05, 0.9, 0.3, 0.07);
      for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.07, 8, 14, Math.PI * 1.4), toon('#e9c46a')); h.position.set(s * 0.45, 1.55, 0.25); h.rotation.y = s * 1.2; outline(h, 1.15); g.add(h); }
      feet(0.1, 0.35, toon('#6b5a8a')); break;
    }
    case 'krakko': {
      g.add(sph(0.85, C, 0, 1.25, 0, 1, 1.15, 1)); g.add(sph(0.45, Bm, 0, 1.0, 0.55, 1, 0.8, 0.5, false));
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + 0.3, tg = new THREE.Group();
        const t1 = sph(0.2, C, 0, 0, 0, 1, 1, 1, true, 12), t2 = sph(0.16, C, 0, -0.25, 0.12, 1, 1, 1, true, 12), t3 = sph(0.12, A, 0, -0.42, 0.28, 1, 1, 1, true, 12);
        tg.add(t1, t2, t3); tg.position.set(Math.sin(a) * 0.55, 0.48, Math.cos(a) * 0.55); tg.rotation.y = a; g.add(tg); parts.feet.push(tg);
      }
      eyes(g, 1.45, 0.7, 0.3, 0.18); smile(g, 1.05, 0.84, 0.14); cheeks(g, 1.2, 0.78, 0.55);
      for (const [x, y, z] of [[-0.4, 1.9, 0.35], [0.45, 1.75, 0.45], [0.1, 2.05, 0.2]]) g.add(sph(0.08, A, x, y, z, 1, 1, 0.5, false));
      break;
    }
    case 'fuxi': {
      g.add(sph(0.8, C, 0, 0.92, 0, 1, 1, 0.95)); g.add(sph(0.52, Bm, 0, 0.75, 0.42, 1, 0.95, 0.6, false));
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.65, 10), C); e.position.set(s * 0.45, 1.75, 0); e.rotation.z = -s * 0.3; outline(e, 1.1); g.add(e); const ie = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 8), toon('#3a2418')); ie.position.set(s * 0.45, 1.72, 0.1); ie.rotation.z = -s * 0.3; g.add(ie); }
      const muz = sph(0.3, Bm, 0, 0.88, 0.7, 1.2, 0.8, 0.8); g.add(muz); g.add(sph(0.08, new THREE.MeshBasicMaterial({ color: '#2a1c14' }), 0, 0.98, 0.98, 1, 1, 1, false));
      eyes(g, 1.2, 0.65, 0.3, 0.14); smile(g, 0.78, 0.92, 0.1);
      const tail = sph(0.42, C, 0, 0.8, -0.85, 0.8, 0.8, 1.5); tail.rotation.x = 0.6; g.add(tail); const tip = sph(0.22, Bm, 0, 1.2, -1.35, 0.9, 0.9, 1.1); g.add(tip); parts.extra.push(tail, tip);
      feet(0.1, 0.36, toon('#3a2418')); arms(0.75, 0.78); break;
    }
    case 'panzo': {
      g.add(sph(0.78, C, 0, 0.9, 0.05, 1, 1, 0.9)); g.add(sph(0.52, Bm, 0, 0.75, 0.42, 1, 0.95, 0.6, false));
      const shell = sph(0.85, toon('#8a6a3a'), 0, 1.0, -0.4, 1.05, 1, 0.7); g.add(shell);
      const hexM = toon('#c9a35a'); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const h = new THREE.Mesh(new THREE.CircleGeometry(0.2, 6), hexM); h.position.set(Math.cos(a) * 0.45, 1.0 + Math.sin(a) * 0.45, -0.95); h.rotation.y = Math.PI; g.add(h); }
      const hc = new THREE.Mesh(new THREE.CircleGeometry(0.22, 6), hexM); hc.position.set(0, 1.0, -0.99); hc.rotation.y = Math.PI; g.add(hc);
      eyes(g, 1.18, 0.62, 0.28, 0.14); smile(g, 0.85, 0.78, 0.15); cheeks(g, 0.95, 0.72, 0.5);
      feet(0.12, 0.4); arms(0.75, 0.8); break;
    }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  // Animation: idle, hop, jump, sad, walk
  parts.anim = (t, st = 'idle', k = 0) => {
    const b = g;
    if (st === 'idle') { const s = Math.sin(t * 3.2 + (def.id.length)) * 0.035; b.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5); b.position.y = 0; b.rotation.z = 0; }
    else if (st === 'walk') { b.position.y = Math.abs(Math.sin(t * 12)) * 0.25; b.rotation.z = Math.sin(t * 12) * 0.08; b.scale.set(1, 1, 1); }
    else if (st === 'happy') { const p = (t * 2.2) % 1; b.position.y = Math.sin(p * Math.PI) * 1.1; b.scale.set(1, 1 + Math.sin(p * Math.PI) * 0.1, 1); b.rotation.y = 0; }
    else if (st === 'sad') { b.position.y = 0; b.scale.set(1.06, 0.88, 1.06); b.rotation.z = Math.sin(t * 2) * 0.05; }
    else if (st === 'spin') { b.rotation.y = t * 10; }
    parts.arms.forEach((a, i) => { a.rotation.x = st === 'walk' ? Math.sin(t * 12 + i * Math.PI) * 0.7 : st === 'happy' ? -2.2 : Math.sin(t * 2 + i) * 0.1; });
    parts.extra.forEach((e, i) => { e.rotation.x = Math.sin(t * 4 + i) * 0.12; });
  };
  return parts;
}

// Porträtbilder (einmal gerendert, als Daten-URL)
let portraits = null;
export function creaturePortraits() {
  if (portraits) return portraits;
  portraits = {};
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#ffd9a0', 1.6)); const dl = new THREE.DirectionalLight('#ffffff', 1.6); dl.position.set(2, 4, 5); sc.add(dl);
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(0, 1.4, 6.2); cam.lookAt(0, 1.05, 0);
    for (const d of CREATURES) {
      const c = makeCreature(d); c.root.rotation.y = -0.35; sc.add(c.root); r.render(sc, cam); portraits[d.id] = cv.toDataURL(); sc.remove(c.root);
      c.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    r.dispose(); r.forceContextLoss && r.forceContextLoss();
  } catch (e) { CREATURES.forEach(d => portraits[d.id] = ''); }
  return portraits;
}
