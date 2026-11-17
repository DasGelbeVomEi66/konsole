// Eigene Figuren der Insel-Party: kleine Inselabenteurer im Chibi-Stil (großer Kopf, Toon-Look mit Umrisslinie).
import * as THREE from '../../lib/three.module.min.js';

const TAU = Math.PI * 2;
let gradTex = null;
export function toonGrad() {
  if (gradTex) return gradTex;
  const d = new Uint8Array([95, 95, 95, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  gradTex = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter; gradTex.needsUpdate = true;
  return gradTex;
}
export const toon = (color, extra = {}) => new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: toonGrad() }, extra));
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#2a1c14', side: THREE.BackSide });
export function outline(mesh, s = 1.07) { const o = new THREE.Mesh(mesh.geometry, OUTLINE); o.scale.setScalar(s); o.raycast = () => {}; mesh.add(o); return mesh; }

export const CREATURES = [
  { id: 'marla', name: 'Marla', desc: 'Kapitänin mit Kompass', skin: '#f5c9a0', hair: '#d9532b', shirt: '#2f4f9a', pants: '#f2ead3', shoes: '#5a3418' },
  { id: 'tiko', name: 'Tiko', desc: 'Tiefseetaucher', skin: '#c98b5c', hair: '#2b1b10', shirt: '#f4b400', pants: '#f4b400', shoes: '#3d4145' },
  { id: 'basil', name: 'Basil', desc: 'Strandkoch', skin: '#ffe0c4', hair: '#7a5230', shirt: '#ffffff', pants: '#3d4a5c', shoes: '#2a2a2a' },
  { id: 'juna', name: 'Juna', desc: 'Dschungelforscherin', skin: '#8a5533', hair: '#2b1b10', shirt: '#c9b27a', pants: '#7a6a3a', shoes: '#5a3418' },
  { id: 'bolt', name: 'Bolt', desc: 'Kleiner Inselroboter', skin: '#9fd9d0', hair: '#3fb8a8', shirt: '#5fd1c4', pants: '#3d7f86', shoes: '#2f3b52', robot: true },
  { id: 'nyx', name: 'Nyx', desc: 'Sternenzauberin', skin: '#f2d2e8', hair: '#f4f1ff', shirt: '#6a3fb5', pants: '#4b2a85', shoes: '#2a1a4a' },
  { id: 'kai', name: 'Kai', desc: 'Wellenreiter', skin: '#e0a878', hair: '#ffd23d', shirt: '#ff7a3d', pants: '#2f8fe8', shoes: '#ffffff' },
  { id: 'flora', name: 'Flora', desc: 'Gärtnerin mit Blumenkranz', skin: '#f5c9a0', hair: '#8a4b2a', shirt: '#fff3c4', pants: '#4caf50', shoes: '#7a4f2a' },
];

const CAP = (r, l, mat, ol = 1.08) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), mat); m.castShadow = true; outline(m, ol); return m; };
const SPH = (r, mat, ol = 1.06, seg = 22) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat); m.castShadow = true; if (ol) outline(m, ol); return m; };
const BOX = (w, h, d, mat, ol = 1.05) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; if (ol) outline(m, ol); return m; };

function face(head, d, R) {
  const B = new THREE.MeshBasicMaterial({ color: '#1d1410' }), Wh = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(R * 0.15, 14, 10), B); e.scale.set(0.8, 1.15, 0.4); e.position.set(s * R * 0.34, R * 0.05, R * 0.9); head.add(e);
    const h = new THREE.Mesh(new THREE.SphereGeometry(R * 0.05, 8, 6), Wh); h.position.set(R * 0.04, R * 0.06, R * 0.06); e.add(h);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.025, R * 0.14, 3, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(d.hair).multiplyScalar(0.6) })); brow.rotation.z = Math.PI / 2 + s * 0.15; brow.position.set(s * R * 0.34, R * 0.3, R * 0.9); head.add(brow);
    const ch = new THREE.Mesh(new THREE.CircleGeometry(R * 0.11, 14), new THREE.MeshBasicMaterial({ color: '#ff7b9a', transparent: true, opacity: 0.5 })); ch.position.set(s * R * 0.55, -R * 0.2, R * 0.8); ch.rotation.y = s * 0.6; head.add(ch);
  }
  const m = new THREE.Mesh(new THREE.TorusGeometry(R * 0.13, R * 0.03, 6, 14, Math.PI), new THREE.MeshBasicMaterial({ color: '#4a1f1a' })); m.rotation.z = Math.PI; m.position.set(0, -R * 0.28, R * 0.94); head.add(m);
  const n = new THREE.Mesh(new THREE.SphereGeometry(R * 0.07, 10, 8), toon(new THREE.Color(d.skin).multiplyScalar(0.9))); n.position.set(0, -R * 0.08, R * 0.98); head.add(n);
}

// Baut eine Figur. Höhe etwa 2,6 Einheiten, Blick Richtung +z.
export function makeCreature(def) {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  const parts = { root, body: g, def, arms: [], feet: [], legs: [], extra: [] };
  const Skin = toon(def.skin), Hair = toon(def.hair), Shirt = toon(def.shirt), Pants = toon(def.pants), Shoes = toon(def.shoes);
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.2, 0.62, 0); g.add(hip);
    const leg = CAP(0.15, 0.32, Pants); leg.position.y = -0.24; hip.add(leg);
    const shoe = SPH(0.17, Shoes, 1.1, 14); shoe.scale.set(1.1, 0.7, 1.5); shoe.position.set(0, -0.5, 0.06); hip.add(shoe);
    parts.legs.push(hip); parts.feet.push(shoe);
  }
  const torso = def.robot ? BOX(0.78, 0.7, 0.55, Shirt) : CAP(0.36, 0.3, Shirt); torso.position.y = 0.98; g.add(torso);
  if (!def.robot) { const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.09, 18), toon(new THREE.Color(def.pants).multiplyScalar(0.7))); belt.position.y = 0.76; g.add(belt); }
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.42, 1.18, 0); g.add(sh);
    const arm = CAP(0.11, 0.3, def.robot ? toon('#8aa4b8') : Shirt); arm.position.y = -0.2; sh.add(arm);
    const hand = SPH(0.12, def.robot ? toon('#2f3b52') : Skin, 1.1, 12); hand.position.y = -0.42; sh.add(hand);
    sh.rotation.z = s * 0.18; parts.arms.push(sh);
  }
  const head = new THREE.Group(); head.position.y = 1.86; g.add(head); parts.head = head;
  const R = 0.62;
  if (def.robot) {
    head.add(BOX(1.1, 0.95, 0.95, toon(def.skin)));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.6), new THREE.MeshBasicMaterial({ color: '#173a4a' })); screen.position.z = 0.48; head.add(screen);
    const eM = new THREE.MeshBasicMaterial({ color: '#7dfcff' });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), eM); e.position.set(s * 0.2, 0.05, 0.485); head.add(e); }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 12, Math.PI), eM); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.12, 0.485); head.add(mouth);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), toon('#3d4145')); ant.position.y = 0.7; head.add(ant);
    const bulb = SPH(0.1, toon('#ff5f5f', { emissive: '#ff3030', emissiveIntensity: 0.7 }), 1.1, 10); bulb.position.y = 0.95; head.add(bulb); parts.extra.push(bulb);
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12).rotateZ(Math.PI / 2), toon('#3fb8a8')); ear.position.set(s * 0.6, 0, 0); head.add(ear); }
    const panel = BOX(0.4, 0.25, 0.04, toon('#f4b400'), 0); panel.position.set(0, 1.0, 0.29); g.add(panel);
  } else {
    head.add(SPH(R, Skin, 1.05, 26));
    for (const s of [-1, 1]) { const ear = SPH(0.12, Skin, 1.1, 10); ear.position.set(s * R * 0.98, -0.02, 0); ear.scale.set(0.6, 1, 0.8); head.add(ear); }
    face(head, def, R);
  }
  const add = (m, x, y, z) => { m.position.set(x, y, z); head.add(m); return m; };
  switch (def.id) {
    case 'marla': {
      const cap = SPH(R * 1.02, Hair, 1.04); cap.scale.set(1, 0.65, 1); add(cap, 0, 0.16, -0.06);
      const tail = SPH(0.24, Hair, 1.08, 14); tail.scale.set(0.8, 1.4, 0.8); add(tail, 0, -0.1, -0.68);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.07, 3), toon('#1f2a4a')); brim.rotation.y = Math.PI; outline(brim, 1.04); add(brim, 0, 0.46, 0);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.42, 16), toon('#1f2a4a')); outline(crown, 1.05); add(crown, 0, 0.68, 0);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.08, 16), toon('#f2b705')), 0, 0.53, 0);
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 8), toon('#ffffff')); feather.rotation.z = -0.6; add(feather, 0.4, 0.95, -0.1);
      for (const s of [-1, 1]) { const b = SPH(0.05, toon('#f2b705'), 0, 8); b.position.set(s * 0.12, 1.08, 0.36); g.add(b); }
      break;
    }
    case 'tiko': {
      const hair = SPH(R * 1.01, Hair, 0); hair.scale.set(1, 0.5, 1); add(hair, 0, 0.3, -0.05);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.92, 26, 18), new THREE.MeshPhongMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.25, shininess: 120, depthWrite: false })), 0, 0.02, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 10, 24), toon('#c98a2a')); outline(ring, 1.06); add(ring, 0, 0.02, 0.62);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.22, 20), toon('#c98a2a')); outline(collar, 1.04); add(collar, 0, -0.78, 0);
      const tank = CAP(0.18, 0.5, toon('#e5242f')); tank.position.set(0, 1.0, -0.42); g.add(tank);
      break;
    }
    case 'basil': {
      const hair = SPH(R * 1.02, Hair, 1.04); hair.scale.set(1, 0.6, 1); add(hair, 0, 0.12, -0.08);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.22, 20), toon('#ffffff')); outline(band, 1.04); add(band, 0, 0.5, 0);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; add(SPH(0.3, toon('#ffffff'), 1.05, 14), Math.cos(a) * 0.28, 0.92, Math.sin(a) * 0.28); }
      add(SPH(0.34, toon('#ffffff'), 1.05, 14), 0, 1.05, 0);
      const gl = new THREE.MeshBasicMaterial({ color: '#2a2a2a' });
      for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 16), gl); r.position.set(s * R * 0.34, R * 0.05, R * 0.95); head.add(r); }
      for (let i = 0; i < 2; i++) { const b = SPH(0.05, toon('#3d4a5c'), 0, 8); b.position.set(0.12, 1.12 - i * 0.2, 0.37); g.add(b); }
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 18), toon('#e5242f')); scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.32; g.add(scarf);
      break;
    }
    case 'juna': {
      const hair = SPH(R * 1.02, Hair, 1.04); hair.scale.set(1.02, 0.75, 1.02); add(hair, 0, 0.08, -0.1);
      for (const s of [-1, 1]) add(SPH(0.2, Hair, 1.08, 12), s * 0.62, -0.25, -0.2);
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.66, 22, 12, 0, TAU, 0, Math.PI / 2), toon('#e8dcb0')); outline(helm, 1.04); add(helm, 0, 0.3, 0);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 24), toon('#e8dcb0')); outline(brim, 1.03); add(brim, 0, 0.32, 0);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.67, 0.67, 0.08, 22), toon('#7a5a2a')), 0, 0.36, 0);
      const bino = new THREE.Group(); for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 10).rotateX(Math.PI / 2), toon('#2a2a2a')); c.position.x = s * 0.1; bino.add(c); } bino.position.set(0, 1.0, 0.4); g.add(bino);
      break;
    }
    case 'nyx': {
      const hair = SPH(R * 1.04, Hair, 1.04); hair.scale.set(1.03, 0.9, 0.9); add(hair, 0, 0.1, -0.26);
      for (const s of [-1, 1]) { const lock = CAP(0.16, 0.5, Hair); lock.position.set(s * 0.55, -0.45, -0.1); head.add(lock); }
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.05, 24), toon('#4b2a85')); outline(brim, 1.03); add(brim, 0, 0.42, 0);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 20), toon('#6a3fb5')); cone.rotation.z = -0.25; outline(cone, 1.04); add(cone, 0.12, 1.05, 0);
      const sm = new THREE.MeshBasicMaterial({ color: '#ffd23d' });
      for (const [x, y, z] of [[0.05, 0.85, 0.47], [0.28, 1.25, 0.3], [-0.15, 0.7, 0.5]]) add(new THREE.Mesh(new THREE.OctahedronGeometry(0.07), sm), x, y, z);
      const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), toon('#5a3418')); wand.position.set(0, -0.6, 0.15); wand.rotation.x = 0.5; parts.arms[1].add(wand);
      const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshBasicMaterial({ color: '#fff2a0' })); tip.position.set(0, -0.9, 0.35); parts.arms[1].add(tip); parts.extra.push(tip);
      break;
    }
    case 'kai': {
      const hair = SPH(R * 1.02, Hair, 1.04); hair.scale.set(1, 0.6, 1); add(hair, 0, 0.18, -0.06);
      for (let i = 0; i < 7; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 8), Hair); const a = (i / 6 - 0.5) * 2.2; sp.position.set(Math.sin(a) * 0.45, 0.55 + Math.cos(a) * 0.1, -0.15 + Math.cos(a) * 0.1); sp.rotation.z = -a * 0.7; sp.rotation.x = -0.3; outline(sp, 1.1); head.add(sp); }
      const gl = new THREE.MeshBasicMaterial({ color: '#1a1a2a' });
      for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.17, 16), gl); l.position.set(s * R * 0.34, R * 0.08, R * 0.97); head.add(l); }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), gl); bridge.position.set(0, R * 0.12, R * 0.98); head.add(bridge);
      const fl = new THREE.MeshBasicMaterial({ color: '#ffe14d' }); for (const [x, y] of [[-0.18, 1.1], [0.15, 0.92], [0.2, 1.2]]) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.06, 5), fl); f.position.set(x, y, 0.37); g.add(f); }
      const board = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.5, 6, 12), toon('#2fc4b2')); board.scale.z = 0.15; board.position.set(0, 1.2, -0.45); board.rotation.z = 0.3; outline(board, 1.04); g.add(board);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.02), toon('#ffffff')); stripe.position.set(0, 0, 0.05); board.add(stripe);
      break;
    }
    default: {
      const hair = SPH(R * 1.03, Hair, 1.04); hair.scale.set(1.02, 0.7, 1.03); add(hair, 0, 0.14, -0.1);
      for (let i = 0; i < 5; i++) { const t = SPH(0.2, Hair, 1.08, 12); const a = (i / 4 - 0.5) * 1.6; add(t, Math.sin(a) * 0.45, 0.42, Math.cos(a) * 0.3 + 0.12); }
      break;
    }
    case 'flora': {
      const hair = SPH(R * 1.03, Hair, 1.04); hair.scale.set(1.02, 0.8, 1.03); add(hair, 0, 0.06, -0.1);
      for (const s of [-1, 1]) { const br = CAP(0.11, 0.45, Hair); br.position.set(s * 0.45, -0.55, -0.25); br.rotation.z = s * 0.2; head.add(br); const tie = SPH(0.07, toon('#ff6fa8'), 0, 8); tie.position.set(s * 0.5, -0.85, -0.25); head.add(tie); }
      const cols = ['#ff6fa8', '#ffe14d', '#ffffff', '#b98bff', '#ff8a3d'];
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; add(SPH(0.11, toon(cols[i % 5]), 1.1, 10), Math.sin(a) * 0.6, 0.38 + Math.cos(a * 2) * 0.02, Math.cos(a) * 0.6); }
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.05), Pants); strap.position.set(0, 1.0, 0.33); g.add(strap);
      break;
    }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  parts.anim = (t, st = 'idle') => {
    const [lL, lR] = parts.legs, [aL, aR] = parts.arms;
    g.rotation.y = 0;
    if (st === 'idle') { const s = Math.sin(t * 3) * 0.02; g.position.y = 0; g.scale.set(1 + s, 1 - s, 1 + s); g.rotation.z = 0; head.rotation.set(Math.sin(t * 1.3) * 0.04, Math.sin(t * 0.8) * 0.12, 0); lL.rotation.x = lR.rotation.x = 0; aL.rotation.x = aR.rotation.x = Math.sin(t * 3) * 0.06; aL.rotation.z = -0.18; aR.rotation.z = 0.18; }
    else if (st === 'walk') { const w = Math.sin(t * 13); g.position.y = Math.abs(Math.cos(t * 13)) * 0.12; g.scale.set(1, 1, 1); g.rotation.z = w * 0.04; lL.rotation.x = w * 0.7; lR.rotation.x = -w * 0.7; aL.rotation.x = -w * 0.8; aR.rotation.x = w * 0.8; aL.rotation.z = -0.18; aR.rotation.z = 0.18; head.rotation.set(0, 0, 0); }
    else if (st === 'happy') { const p = (t * 2.2) % 1; g.position.y = Math.sin(p * Math.PI) * 1.0; g.scale.set(1, 1, 1); lL.rotation.x = lR.rotation.x = -Math.sin(p * Math.PI) * 0.5; aL.rotation.x = aR.rotation.x = 0; aL.rotation.z = -2.6; aR.rotation.z = 2.6; head.rotation.set(-0.15, 0, 0); }
    else if (st === 'sad') { g.position.y = 0; g.scale.set(1, 0.96, 1); head.rotation.set(0.45, Math.sin(t * 1.5) * 0.15, 0); aL.rotation.z = -0.05; aR.rotation.z = 0.05; aL.rotation.x = aR.rotation.x = 0.1; lL.rotation.x = lR.rotation.x = 0; }
    else if (st === 'spin') { g.rotation.y = t * 10; aL.rotation.z = -1.4; aR.rotation.z = 1.4; }
    parts.extra.forEach((e, i) => { e.rotation.y = t * 2 + i; });
  };
  root.scale.setScalar(0.92);
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
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 2.0, 6.6); cam.lookAt(0, 1.45, 0);
    for (const d of CREATURES) {
      const c = makeCreature(d); c.root.rotation.y = -0.35; sc.add(c.root); c.anim(0, 'idle'); r.render(sc, cam); portraits[d.id] = cv.toDataURL(); sc.remove(c.root);
      c.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    r.dispose(); r.forceContextLoss && r.forceContextLoss();
  } catch (e) { CREATURES.forEach(d => portraits[d.id] = ''); }
  return portraits;
}
