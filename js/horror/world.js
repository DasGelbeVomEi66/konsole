// Spielwelt: der Gang des Instituts (verändert sich in jeder Runde) und der Wintergarten dahinter.
import * as THREE from '../../lib/three.module.min.js';
import * as T from './tex.js';

const TAU = Math.PI * 2;
export const H = 3;          // Raumhöhe Gang
export const W2 = 1.25;      // halbe Gangbreite
export const BX = 7;         // Ende von Gang B (Tür)
export const WIN = [-7.5, -10.5]; // Fenster zum Wintergarten (z)

let M = null; // Materialien, einmal erzeugt
export function materials() {
  if (M) return M;
  const fl = T.floorTextures(), wa = T.wallTextures(0), wb = T.wallTextures(1), dr = T.doorTexture(false), ds = T.doorTexture(true), ti = T.tileTextures();
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8, metalness: 0 }, o));
  M = {
    floor: std({ map: fl.map, normalMap: fl.normalMap, roughnessMap: fl.roughnessMap, roughness: 0.75, normalScale: new THREE.Vector2(0.8, 0.8) }),
    wall: std({ map: wa.map, normalMap: wa.normalMap, roughness: 0.85 }),
    wallB: std({ map: wb.map, normalMap: wb.normalMap, roughness: 0.85 }),
    ceil: std({ map: T.ceilingTexture(), roughness: 0.95 }),
    door: std({ map: dr.map, normalMap: dr.normalMap, roughness: 0.6 }),
    doorS: std({ map: ds.map, normalMap: ds.normalMap, roughness: 0.6 }),
    wood: std({ color: '#3a2214', roughness: 0.55, map: fl.map }),
    darkwood: std({ color: '#24150c', roughness: 0.5 }),
    brass: std({ color: '#b08a40', roughness: 0.3, metalness: 0.9 }),
    metal: std({ color: '#55585a', roughness: 0.45, metalness: 0.8 }),
    rust: std({ color: '#4a3a30', roughness: 0.8, metalness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: '#9fb4bf', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.16, depthWrite: false }),
    rainGlass: new THREE.MeshStandardMaterial({ color: '#c8d8e0', roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false, map: T.rainGlassTexture() }),
    bone: std({ color: '#7d6c52', roughness: 0.85 }),
    tile: std({ map: ti.map, normalMap: ti.normalMap, roughnessMap: ti.roughnessMap, roughness: 0.6 }),
    stone: std({ color: '#4a4a42', roughness: 0.9, map: ti.map }),
    leaf: new THREE.MeshStandardMaterial({ map: T.leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7, color: '#8a9a78' }),
    bark: std({ color: '#2a2018', roughness: 0.95 }),
    bulb: new THREE.MeshStandardMaterial({ color: '#fff4d0', emissive: new THREE.Color('#ffcf80'), emissiveIntensity: 3 }),
    shade: std({ color: '#1d2a22', roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }),
    cloth: std({ color: '#c8c4b4', roughness: 1 }),
    paper: std({ color: '#d0c6a8', roughness: 1 }),
    black: std({ color: '#050505', roughness: 1 }),
    red: new THREE.MeshStandardMaterial({ color: '#300', emissive: new THREE.Color('#ff1a10'), emissiveIntensity: 2 }),
    green: new THREE.MeshStandardMaterial({ color: '#030', emissive: new THREE.Color('#2bff60'), emissiveIntensity: 2 }),
    cork: std({ color: '#4a3622', roughness: 1 }),
  };
  for (const k of ['wall', 'wallB', 'ceil', 'floor', 'tile', 'stone']) M[k].shadowSide = THREE.DoubleSide;
  M.tex = { foot: T.footprintTexture(), scratch: T.scratchTexture(), blood: T.bloodTexture(), clock: T.clockTexture(), radio: T.radioTexture(), paint0: T.paintingTexture(0), paint1: T.paintingTexture(1), exit: T.signTexture('AUSGANG'), cookie: T.cookieTexture() };
  return M;
}

const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; };

// Wand von a nach b (Normale zeigt nach rechts der Laufrichtung), mit rechteckigen Aussparungen [u0,u1,v0,v1]
function wall(a, b, h, mat, holes = [], uvScale = [2, 3]) {
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(L, 0); sh.lineTo(L, h); sh.lineTo(0, h); sh.lineTo(0, 0);
  for (const [u0, u1, v0, v1] of holes) { const p = new THREE.Path(); p.moveTo(u0, v0); p.lineTo(u0, v1); p.lineTo(u1, v1); p.lineTo(u1, v0); p.lineTo(u0, v0); sh.holes.push(p); }
  const g = new THREE.ShapeGeometry(sh); const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / uvScale[0], pos.getY(i) / uvScale[1]);
  const m = new THREE.Mesh(g, mat); m.position.set(a.x, 0, a.z); m.rotation.y = Math.atan2(-dz / L, dx / L);
  m.receiveShadow = true; m.castShadow = true; return m;
}
function plane(x0, z0, x1, z1, y, mat, down, rep = 2) {
  const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0), g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / rep, uv.getY(i) * d / rep);
  const m = new THREE.Mesh(g, mat); m.rotation.x = down ? Math.PI / 2 : -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; m.castShadow = !!down; return m;
}
function decal(tex, w, h, opt = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: opt.rough || 0.4, color: opt.color || '#ffffff', opacity: opt.opacity == null ? 1 : opt.opacity }));
  m.receiveShadow = true; return m;
}

// ---------- Türen ----------
function makeDoor(mat, w = 1.0, h = 2.15) {
  const g = new THREE.Group(); const pivot = new THREE.Group(); g.add(pivot);
  const leaf = box(w - 0.04, h - 0.02, 0.05, mat, (w - 0.04) / 2, h / 2, 0); pivot.add(leaf);
  // Textur nicht auf allen Seiten strecken: Kanten dunkel
  leaf.material = [M.darkwood, M.darkwood, M.darkwood, M.darkwood, mat, mat];
  for (const s of [-1, 1]) { const hd = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), M.brass); hd.position.set(w - 0.14, 1.0, s * 0.06); pivot.add(hd); const pl = box(0.05, 0.18, 0.01, M.brass, w - 0.14, 1.0, s * 0.03); pivot.add(pl); }
  // Zarge
  g.add(box(0.08, h + 0.08, 0.16, M.darkwood, -0.04, (h + 0.08) / 2, 0)); g.add(box(0.08, h + 0.08, 0.16, M.darkwood, w + 0.04, (h + 0.08) / 2, 0)); g.add(box(w + 0.16, 0.08, 0.16, M.darkwood, w / 2, h + 0.04, 0));
  const D = { g, pivot, leaf, angle: 0, target: 0, speed: 1.5, update(dt) { D.angle += (D.target - D.angle) * Math.min(1, dt * D.speed); pivot.rotation.y = D.angle; } };
  return D;
}

// ---------- Requisiten ----------
function lamp() {
  const g = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.6, 4), M.black); cord.position.y = -0.3; g.add(cord);
  const shade = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.03, 0), new THREE.Vector2(0.06, -0.02), new THREE.Vector2(0.16, -0.12), new THREE.Vector2(0.24, -0.2)], 20), M.shade); shade.position.y = -0.6; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), M.bulb.clone()); bulb.position.y = -0.7; g.add(bulb);
  g.userData.bulb = bulb; return g;
}
function radio() {
  const g = new THREE.Group();
  const body = box(0.42, 0.24, 0.18, M.wood); body.position.y = 0.12;
  body.material = [M.wood, M.wood, M.wood, M.wood, new THREE.MeshStandardMaterial({ map: M.tex.radio, roughness: 0.7 }), M.wood]; g.add(body);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.45), M.metal); ant.position.set(0.15, 0.42, -0.04); ant.rotation.z = -0.4; g.add(ant);
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.04), new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color('#ffb040'), emissiveIntensity: 1.2 })); dial.position.set(0.11, 0.16, 0.091); g.add(dial);
  g.userData.dial = dial; return g;
}
function table(w = 0.7, d = 0.45, h = 0.75) {
  const g = new THREE.Group(); g.add(box(w, 0.04, d, M.wood, 0, h, 0));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.04, h, 0.04, M.darkwood, x * (w / 2 - 0.04), h / 2, z * (d / 2 - 0.04)));
  return g;
}
function desk() {
  const g = new THREE.Group(); g.add(box(1.3, 0.05, 0.65, M.wood, 0, 0.76, 0));
  g.add(box(0.45, 0.74, 0.62, M.darkwood, -0.42, 0.37, 0)); g.add(box(0.04, 0.74, 0.6, M.darkwood, 0.62, 0.37, 0));
  const drawer = new THREE.Group(); drawer.position.set(-0.42, 0.6, 0.0); g.add(drawer);
  const front = box(0.41, 0.16, 0.03, M.wood, 0, 0, 0.31); drawer.add(front); drawer.add(box(0.38, 0.12, 0.55, M.darkwood, 0, 0, 0.03));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.brass); knob.position.set(0, 0, 0.335); drawer.add(knob);
  g.add(box(0.41, 0.16, 0.03, M.wood, -0.42, 0.4, 0.31)); g.add(box(0.41, 0.16, 0.03, M.wood, -0.42, 0.18, 0.31));
  // Kram auf dem Tisch
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 12), M.brass); lampBase.position.set(0.4, 0.8, -0.15); g.add(lampBase);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35), M.brass); arm.position.set(0.4, 0.97, -0.15); g.add(arm);
  const sh = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.12, 14, 1, true), M.shade); sh.position.set(0.4, 1.12, -0.1); sh.rotation.x = 0.5; g.add(sh);
  for (let i = 0; i < 5; i++) { const p = box(0.21, 0.004, 0.3, M.paper, 0.05 + Math.random() * 0.1, 0.79 + i * 0.004, Math.random() * 0.1); p.rotation.y = (Math.random() - 0.5) * 0.6; g.add(p); }
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 12), M.cloth); mug.position.set(-0.25, 0.83, -0.1); g.add(mug);
  const chair = new THREE.Group(); chair.add(box(0.45, 0.05, 0.45, M.wood, 0, 0.46, 0)); chair.add(box(0.45, 0.5, 0.04, M.wood, 0, 0.72, -0.22)); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) chair.add(box(0.035, 0.46, 0.035, M.darkwood, x * 0.2, 0.23, z * 0.2)); chair.position.set(0.15, 0, 0.6); chair.rotation.y = Math.PI + 0.4; g.add(chair);
  g.userData.drawer = drawer; return g;
}
function displayCase(broken) {
  const g = new THREE.Group();
  g.add(box(1.0, 0.9, 0.6, M.darkwood, 0, 0.45, 0));
  g.add(box(1.04, 0.04, 0.64, M.wood, 0, 0.92, 0));
  if (!broken) { const gl = box(0.96, 0.6, 0.56, M.glass, 0, 1.24, 0); gl.castShadow = false; g.add(gl); }
  else {
    const sm = new THREE.MeshStandardMaterial({ color: '#1a2228', roughness: 0.12, metalness: 0.6, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
    const tri = () => { const gg = new THREE.BufferGeometry(); const a = []; for (let k = 0; k < 3; k++) a.push((Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18, 0); gg.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); gg.computeVertexNormals(); return gg; };
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(tri(), sm); s.position.set((Math.random() - 0.5) * 0.9, 0.96 + Math.random() * 0.08, (Math.random() - 0.5) * 0.5); s.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.3, 0, Math.random() * 6); g.add(s); }
    for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(tri(), sm); s.scale.setScalar(0.6); s.position.set((Math.random() - 0.5) * 1.6, 0.004, 0.4 + Math.random() * 0.8); s.rotation.set(-Math.PI / 2, 0, Math.random() * 6); g.add(s); }
    for (const x of [-0.48, 0.48]) { const s = new THREE.Mesh(tri(), sm); s.scale.set(1.2, 2, 1); s.position.set(x * 0.98, 1.4, 0.28); g.add(s); }
  }
  for (const x of [-0.48, 0.48]) for (const z of [-0.28, 0.28]) g.add(box(0.02, 0.62, 0.02, M.brass, x, 1.24, z));
  const plate = box(0.24, 0.06, 0.01, M.brass, 0, 0.6, 0.305); g.add(plate);
  return g;
}
export function skull() {
  // Fossilschädel aus Grundformen
  const g = new THREE.Group(), L = 0.42;
  const sg = new THREE.SphereGeometry(1, 20, 12), p = sg.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const t = (z + 1) / 2; x *= 0.08 * (1 - 0.55 * t); y = (y < 0 ? y * 0.03 : y * 0.11 * (1 - t * 0.4)); p.setXYZ(i, x, y, t * L); }
  sg.computeVertexNormals();
  const top = new THREE.Mesh(sg, M.bone); top.castShadow = true; g.add(top);
  const jaw = new THREE.Mesh(sg, M.bone); jaw.scale.set(0.85, 0.5, 0.95); jaw.position.y = -0.03; jaw.rotation.x = 0.12; g.add(jaw);
  for (const s of [-1, 1]) { const so = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), M.black); so.scale.set(0.6, 0.8, 1.2); so.position.set(s * 0.058, 0.055, 0.1); g.add(so); const fen = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.black); fen.scale.set(0.3, 0.7, 1.6); fen.position.set(s * 0.05, 0.03, 0.21); g.add(fen); const ant = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), M.black); ant.scale.set(0.3, 0.6, 1.4); ant.position.set(s * 0.045, 0.035, 0.29); g.add(ant); }
  const tg = new THREE.ConeGeometry(0.006, 0.03, 4);
  for (const s of [-1, 1]) for (let i = 0; i < 10; i++) { const t = new THREE.Mesh(tg, M.bone); const z = 0.12 + i * 0.028; t.position.set(s * 0.075 * (1 - 0.55 * z / L), -0.015, z); t.rotation.x = Math.PI; g.add(t); }
  return g;
}
function clock() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32), M.darkwood); rim.rotation.x = Math.PI / 2; g.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.18, 32), new THREE.MeshStandardMaterial({ map: M.tex.clock, roughness: 0.6 })); face.position.z = 0.026; g.add(face);
  const hand = (l, w) => { const h = new THREE.Group(); const m = box(w, l, 0.005, M.black, 0, l / 2 - 0.02, 0); h.add(m); h.position.z = 0.03; g.add(h); return h; };
  g.userData.hour = hand(0.1, 0.012); g.userData.min = hand(0.15, 0.008); g.userData.sec = hand(0.16, 0.003);
  return g;
}
function painting(tex, w = 0.9, h = 0.68) {
  const g = new THREE.Group();
  g.add(box(w + 0.1, h + 0.1, 0.04, M.brass, 0, 0, 0));
  const c = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 })); c.position.z = 0.021; g.add(c);
  g.userData.canvas = c; return g;
}
function board(notes) {
  const g = new THREE.Group();
  g.add(box(1.2, 0.8, 0.03, M.cork)); g.add(box(1.26, 0.86, 0.02, M.darkwood, 0, 0, -0.01));
  notes.forEach((n, i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshStandardMaterial({ map: n, roughness: 1 })); p.position.set(-0.4 + i * 0.27, (i % 2 ? -0.08 : 0.1), 0.02); p.rotation.z = (Math.random() - 0.5) * 0.15; g.add(p); const pin = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), M.red); pin.position.set(p.position.x, p.position.y + 0.12, 0.03); g.add(pin); });
  return g;
}
function vent() { const g = new THREE.Group(); g.add(box(0.6, 0.02, 0.4, M.metal)); for (let i = 0; i < 7; i++) g.add(box(0.56, 0.03, 0.02, M.rust, 0, -0.015, -0.17 + i * 0.057)); return g; }
function coatRack() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.8), M.darkwood)); g.children[0].position.y = 0.9; const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 12), M.darkwood); base.position.y = 0.02; g.add(base); const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.26, 1.1, 10, 1, true), M.cloth); coat.material = coat.material.clone(); coat.material.side = THREE.DoubleSide; coat.position.set(0, 1.12, 0.06); g.add(coat); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
function plant(dead) { const g = new THREE.Group(); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 14), M.rust); pot.position.y = 0.15; g.add(pot); for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.6), M.leaf); l.position.y = 0.55; l.rotation.y = i * 0.5; l.rotation.x = 0.2; if (dead) l.material = M.leaf.clone(), l.material.color.set('#4a3a20'); g.add(l); } g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }

// ---------- Gang ----------
// v: Einstellungen der Runde, siehe game.js
export function buildCorridor(v) {
  materials();
  const L = v.len || 14, g = new THREE.Group(), cols = [], items = [], refs = { lamps: [], doors: {} };
  const wm = v.decay ? M.wallB : M.wall;
  const seg = (ax, az, bx, bz, id) => { const s = { a: { x: ax, z: az }, b: { x: bx, z: bz }, on: true, id }; cols.push(s); return s; };
  // Böden und Decken
  g.add(plane(-W2, 0, W2, -L, 0, M.floor)); g.add(plane(-W2, -L, BX, -L - 2.5, 0, M.floor));
  g.add(plane(-W2, 0, W2, -L, H, M.ceil, true)); g.add(plane(W2, -L, BX, -L - 2.5, H, M.ceil, true));
  // Wände
  const frontDoorU = 1.25, offU = 2.2;
  g.add(wall({ x: W2, z: 0 }, { x: -W2, z: 0 }, H, wm, [[frontDoorU - 0.5, frontDoorU + 0.5, 0, 2.15]]));
  const lHoles = [[offU - 0.5, offU + 0.5, 0, 2.15], [L - 3.5, L - 2.5, 0, 2.15]];
  g.add(wall({ x: -W2, z: 0 }, { x: -W2, z: -L - 2.5 }, H, wm, lHoles));
  g.add(wall({ x: -W2, z: -L - 2.5 }, { x: BX, z: -L - 2.5 }, H, wm));
  g.add(wall({ x: BX, z: -L - 2.5 }, { x: BX, z: -L }, H, wm, [[0.75, 1.75, 0, 2.15]]));
  g.add(wall({ x: BX, z: -L }, { x: W2, z: -L }, H, wm));
  const wu0 = L + WIN[1], wu1 = L + WIN[0];
  g.add(wall({ x: W2, z: -L }, { x: W2, z: 0 }, H, wm, [[wu0, wu1, 0.9, 2.4]]));
  // Mauerdicke an Fenster und Türen (Laibungen)
  const reveal = (x, z, w, h, d, rotY, y) => { const m = box(w, h, d, M.darkwood, x, y, z); m.rotation.y = rotY; g.add(m); };
  reveal(W2 + 0.1, (WIN[0] + WIN[1]) / 2, 0.2, 0.06, 3.0, 0, 0.9); reveal(W2 + 0.1, (WIN[0] + WIN[1]) / 2, 0.2, 0.06, 3.0, 0, 2.4);
  reveal(W2 + 0.1, WIN[0], 0.2, 1.5, 0.06, 0, 1.65); reveal(W2 + 0.1, WIN[1], 0.2, 1.5, 0.06, 0, 1.65);
  const sill = box(0.3, 0.05, 3.1, M.wood, W2 - 0.05, 0.9, (WIN[0] + WIN[1]) / 2); g.add(sill);
  // Fensterkreuz und Glas
  for (const z of [WIN[0], (WIN[0] + WIN[1]) / 2, WIN[1]]) g.add(box(0.06, 1.5, 0.06, M.darkwood, W2 + 0.05, 1.65, z));
  g.add(box(0.06, 0.05, 3.0, M.darkwood, W2 + 0.05, 1.65, (WIN[0] + WIN[1]) / 2));
  if (!v.windowBroken) { const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.5), M.rainGlass); glass.rotation.y = -Math.PI / 2; glass.position.set(W2 + 0.06, 1.65, (WIN[0] + WIN[1]) / 2); g.add(glass); refs.glass = glass; }
  // Kollision (Wände als Strecken)
  seg(W2, 0, -W2, 0, 'front'); seg(-W2, 0, -W2, -L - 2.5); seg(-W2, -L - 2.5, BX, -L - 2.5); seg(BX, -L - 2.5, BX, -L, 'end'); seg(BX, -L, W2, -L); seg(W2, -L, W2, 0);

  // Türen
  const front = makeDoor(M.door); front.g.position.set(0.5, 0, 0); front.g.rotation.y = Math.PI; g.add(front.g); refs.doors.front = front;
  const office = makeDoor(M.door); office.g.position.set(-W2, 0, -offU + 0.5); office.g.rotation.y = Math.PI / 2; g.add(office.g); refs.doors.office = office;
  const store = makeDoor(v.decay ? M.doorS : M.door); store.g.position.set(-W2, 0, -L + 3.5); store.g.rotation.y = Math.PI / 2; g.add(store.g); refs.doors.store = store;
  const end = makeDoor(v.scratches ? M.doorS : M.door); end.g.position.set(BX, 0, -L - 1.75); end.g.rotation.y = -Math.PI / 2; g.add(end.g); refs.doors.end = end;
  // dunkle Räume hinter den Türen
  for (const [x, z, ry] of [[-W2 - 0.6, -offU, 0], [-W2 - 0.6, -L + 3, 0], [BX + 0.6, -L - 1.25, 0], [0, 0.6, 0]]) { const b = box(1.2, 2.3, 1.2, M.black, x, 1.15, z); b.material = new THREE.MeshBasicMaterial({ color: '#000', side: THREE.BackSide }); b.castShadow = false; g.add(b); refs['void' + Math.round(x * 10)] = b; }

  // Lampen
  const lampZ = v.len > 14 ? [-2.5, -7, -11.5, -16, -20] : [-2.5, -7, -11.5];
  for (const z of lampZ) { const l = lamp(); l.position.set(0, H, z); g.add(l); refs.lamps.push({ obj: l, pos: new THREE.Vector3(0, H - 0.72, z) }); }
  { const l = lamp(); l.position.set(4.2, H, -L - 1.25); g.add(l); refs.lamps.push({ obj: l, pos: new THREE.Vector3(4.2, H - 0.72, -L - 1.25) }); }

  // Möbel und Dinge
  const rad = radio(), rt = table(0.6, 0.4, 0.78); rt.position.set(-W2 + 0.3, 0, -3.6); rt.rotation.y = Math.PI / 2; g.add(rt);
  rad.position.set(-W2 + 0.3, 0.8, -3.6); rad.rotation.y = Math.PI / 2; g.add(rad); refs.radio = rad; seg(-W2, -3.25, -W2 + 0.55, -3.25); seg(-W2 + 0.55, -3.25, -W2 + 0.55, -3.95); seg(-W2 + 0.55, -3.95, -W2, -3.95);
  const dc = displayCase(v.caseBroken); dc.position.set(W2 - 0.35, 0, -5.0); dc.rotation.y = -Math.PI / 2; g.add(dc);
  seg(W2, -4.45, W2 - 0.66, -4.45); seg(W2 - 0.66, -4.45, W2 - 0.66, -5.55); seg(W2 - 0.66, -5.55, W2, -5.55);
  if (!v.skullGone) { const sk = skull(); sk.position.set(W2 - 0.35, 1.02, -5.0); sk.rotation.y = v.skullTurned ? Math.PI / 2 + 0.35 : Math.PI; g.add(sk); refs.skull = sk; }
  const dk = desk(); dk.position.set(-W2 + 0.36, 0, -9.2); dk.rotation.y = Math.PI / 2; g.add(dk); refs.desk = dk;
  seg(-W2, -8.5, -W2 + 0.7, -8.5); seg(-W2 + 0.7, -8.5, -W2 + 0.7, -9.9); seg(-W2 + 0.7, -9.9, -W2, -9.9);
  const ck = clock(); ck.position.set(-W2 + 0.03, 2.3, -6.2); ck.rotation.y = Math.PI / 2; g.add(ck); refs.clock = ck;
  const p1 = painting(v.paintingChanged ? M.tex.paint1 : M.tex.paint0); p1.position.set(-W2 + 0.03, 1.75, -12.0); p1.rotation.y = Math.PI / 2; g.add(p1); refs.painting = p1;
  const p2 = painting(M.tex.paint0, 0.6, 0.8); p2.position.set(W2 - 0.03, 1.7, -2.2); p2.rotation.y = -Math.PI / 2; g.add(p2);
  if (v.paintingFallen) { p2.position.set(W2 - 0.2, 0.42, -2.4); p2.rotation.set(-0.3, -Math.PI / 2, 0.1); }
  const cr = coatRack(); cr.position.set(W2 - 0.3, 0, -0.8); g.add(cr);
  const pl = plant(v.decay); pl.position.set(-W2 + 0.3, 0, -L - 2.1); g.add(pl);
  const pl2 = plant(v.decay); pl2.position.set(6.6, 0, -L - 2.1); g.add(pl2);
  if (v.boardNotes) { const bd = board(v.boardNotes); bd.position.set(W2 - 0.03, 1.6, -12.4); bd.rotation.y = -Math.PI / 2; g.add(bd); refs.board = bd; }
  // Lüftungsgitter
  refs.vents = [];
  for (const z of [-4.8, -9.6, -13]) { const vg = vent(); vg.position.set(0, H - 0.01, z); g.add(vg); refs.vents.push(vg); }
  // Spuren
  if (v.footprints) {
    for (let i = 0; i < 14; i++) {
      const z = -1.6 - i * 0.62, side = i % 2 ? 0.16 : -0.16;
      const d = decal(M.tex.foot, 0.32, 0.32, { rough: 0.15, opacity: 0.9 }); d.rotation.x = -Math.PI / 2; d.rotation.z = Math.PI + (Math.random() - 0.5) * 0.2; d.position.set(0.2 + side + i * 0.04, 0.004, z); g.add(d);
    }
  }
  if (v.scratches) { const d = decal(M.tex.scratch, 1.0, 1.0, { opacity: 0.85 }); d.position.set(BX - 0.01, 1.3, -L - 1.25); d.rotation.y = -Math.PI / 2; g.add(d); const d2 = decal(M.tex.scratch, 0.8, 0.8, { opacity: 0.8 }); d2.position.set(-W2 + 0.01, 1.1, -L + 1); d2.rotation.y = Math.PI / 2; g.add(d2); }
  if (v.blood) { for (const [x, z, s] of [[0.3, -L + 1, 0.9], [3, -L - 1.5, 0.7], [-0.5, -6.5, 0.5]]) { const d = decal(M.tex.blood, s, s, { rough: 0.2, opacity: 0.95 }); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.005, z); g.add(d); } const d = decal(M.tex.blood, 0.6, 1.2, { opacity: 0.8 }); d.position.set(BX - 0.012, 0.9, -L - 0.6); d.rotation.y = -Math.PI / 2; g.add(d); }
  return { group: g, cols, items, refs, L };
}

// ---------- Wintergarten ----------
// Hauptraum x 7..31, z -29..-3; Bucht vor dem Fenster x 1.3..7, z -13.8..-3
export const AT = { x0: 7, x1: 31, z0: -29, z1: -3, bx0: 1.3, bz0: -13.8, h: 9, exit: { x: 31, z: -22 } };
export function buildAtrium() {
  materials();
  const g = new THREE.Group(), cols = [], covers = [];
  const seg = (ax, az, bx, bz) => cols.push({ a: { x: ax, z: az }, b: { x: bx, z: bz }, on: true });
  g.add(plane(AT.x0, AT.z1, AT.x1, AT.z0, 0, M.tile, false, 4));
  g.add(plane(AT.bx0, AT.z1, AT.x0, AT.bz0, 0, M.tile, false, 4));
  const wm = M.stone, hgt = AT.h;
  // Außenwände (zeigen nach innen)
  // Außenwände: unten Stein, darüber Glas mit Blick in den Gewitterhimmel
  const gy0 = 1.4, gy1 = hgt - 0.5, nL = AT.x1 - AT.bx0, eL = AT.z1 - AT.z0, sL = AT.x1 - AT.x0, eu = AT.exit.z - AT.z0;
  g.add(wall({ x: AT.x1, z: AT.z1 }, { x: AT.bx0, z: AT.z1 }, hgt, wm, [[0.2, nL - 0.2, gy0, gy1]], [4, 4])); // Norden
  g.add(wall({ x: AT.x1, z: AT.z0 }, { x: AT.x1, z: AT.z1 }, hgt, wm, [[0.2, eu - 1.2, gy0, gy1], [eu - 1, eu + 1, 0, 2.4], [eu + 1.2, eL - 0.2, gy0, gy1]], [4, 4])); // Osten mit Ausgang
  g.add(wall({ x: AT.x0, z: AT.z0 }, { x: AT.x1, z: AT.z0 }, hgt, wm, [[0.2, sL - 0.2, gy0, gy1]], [4, 4])); // Süden
  const gpane = (cx, cz, w, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, gy1 - gy0), M.rainGlass); p.position.set(cx, (gy0 + gy1) / 2, cz); p.rotation.y = ry; g.add(p); };
  gpane((AT.x1 + AT.bx0) / 2, AT.z1 + 0.02, nL - 0.4, Math.PI); gpane((AT.x1 + AT.x0) / 2, AT.z0 - 0.02, sL - 0.4, 0);
  gpane(AT.x1 + 0.02, (AT.z0 + AT.exit.z - 1.2) / 2, eu - 1.4, -Math.PI / 2); gpane(AT.x1 + 0.02, (AT.exit.z + 1.2 + AT.z1) / 2, eL - eu - 1.4, -Math.PI / 2);
  for (let x = AT.bx0 + 3; x < AT.x1; x += 3) { g.add(box(0.12, gy1 - gy0, 0.12, M.rust, x, (gy0 + gy1) / 2, AT.z1)); g.add(box(0.12, gy1 - gy0, 0.12, M.rust, x, (gy0 + gy1) / 2, AT.z0)); }
  for (let z = AT.z0 + 3; z < AT.z1; z += 3) if (Math.abs(z - AT.exit.z) > 1.3) g.add(box(0.12, gy1 - gy0, 0.12, M.rust, AT.x1, (gy0 + gy1) / 2, z));
  for (const y of [gy0, 4.6]) { g.add(box(nL, 0.1, 0.14, M.rust, (AT.x1 + AT.bx0) / 2, y, AT.z1)); g.add(box(sL, 0.1, 0.14, M.rust, (AT.x1 + AT.x0) / 2, y, AT.z0)); g.add(box(0.14, 0.1, eL, M.rust, AT.x1, y, (AT.z1 + AT.z0) / 2)); }
  g.add(wall({ x: AT.x0, z: AT.bz0 }, { x: AT.x0, z: AT.z0 }, hgt, wm, [[AT.bz0 + 15.25 - 0.5, AT.bz0 + 15.25 + 0.5, 0, 2.15]], [4, 4])); // Westen mit Tür zum Gang
  g.add(wall({ x: AT.bx0, z: AT.bz0 }, { x: AT.x0, z: AT.bz0 }, hgt, wm, [], [4, 4]));
  g.add(wall({ x: AT.bx0, z: AT.z1 }, { x: AT.bx0, z: AT.bz0 }, hgt, wm, [[AT.z1 - WIN[0], AT.z1 - WIN[1], 0.9, 2.4]], [4, 4])); // Fensterwand
  seg(AT.bx0, AT.z1, AT.x1, AT.z1); seg(AT.x1, AT.z1, AT.x1, AT.z0); seg(AT.x1, AT.z0, AT.x0, AT.z0); seg(AT.x0, AT.z0, AT.x0, -15.75); seg(AT.x0, -14.75, AT.x0, AT.bz0); seg(AT.x0, AT.bz0, AT.bx0, AT.bz0); seg(AT.bx0, AT.bz0, AT.bx0, AT.z1);
  // Glasdach mit Stahlträgern
  const roofG = new THREE.Mesh(new THREE.PlaneGeometry(AT.x1 - AT.bx0, AT.z1 - AT.z0), M.rainGlass); roofG.rotation.x = Math.PI / 2; roofG.position.set((AT.x1 + AT.bx0) / 2, hgt, (AT.z1 + AT.z0) / 2); g.add(roofG);
  M.rainGlass.map.repeat.set(1, 1);
  const beamM = M.rust;
  for (let x = AT.bx0; x <= AT.x1 + 0.01; x += 3) { const b = box(0.15, 0.3, AT.z1 - AT.z0, beamM, x, hgt - 0.15, (AT.z1 + AT.z0) / 2); b.castShadow = true; g.add(b); }
  for (let z = AT.z0; z <= AT.z1 + 0.01; z += 3) { const b = box(AT.x1 - AT.bx0, 0.2, 0.12, beamM, (AT.x1 + AT.bx0) / 2, hgt - 0.1, z); g.add(b); }
  for (const [x, z] of [[10, -9], [16, -9], [22, -9], [28, -9], [10, -21], [16, -21], [22, -21], [28, -21], [4, -8]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, hgt, 10), beamM); c.position.set(x, hgt / 2, z); c.castShadow = true; g.add(c); covers.push({ x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25, tall: true }); seg(x - 0.2, z - 0.2, x + 0.2, z - 0.2); seg(x + 0.2, z - 0.2, x + 0.2, z + 0.2); seg(x + 0.2, z + 0.2, x - 0.2, z + 0.2); seg(x - 0.2, z + 0.2, x - 0.2, z - 0.2); }
  // Himmel über dem Dach (Gewitterwolken)
  const skyMat = new THREE.ShaderMaterial({ uniforms: { flash: { value: 0 }, t: { value: 0 } }, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float flash, t; varying vec2 vUv;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);} float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      float fb(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=n(p)*a;p*=2.1;a*=.5;}return s;}
      void main(){ vec2 p=vUv*6.+vec2(t*.02,t*.01); float c=fb(p); vec3 col=mix(vec3(.004,.006,.012),vec3(.03,.035,.05),c); col+=vec3(.5,.6,.85)*flash*(.3+c*1.1); gl_FragColor=vec4(col,1.); }` });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), skyMat); sky.rotation.x = Math.PI / 2; sky.position.set(16, hgt + 6, -16); g.add(sky);
  // Himmel hinter den Glaswänden, unten eine Waldkante als Silhouette
  const backMat = new THREE.ShaderMaterial({ uniforms: skyMat.uniforms, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float flash, t; varying vec2 vUv;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);} float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      float fb(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=n(p)*a;p*=2.1;a*=.5;}return s;}
      void main(){ vec2 p=vUv*vec2(9.,3.)+vec2(t*.02,0.); float c=fb(p);
        vec3 col=mix(vec3(.004,.006,.012),vec3(.025,.03,.045),c*smoothstep(.2,1.,vUv.y));
        col+=vec3(.5,.6,.85)*flash*(.25+c*1.1)*smoothstep(.25,.9,vUv.y);
        float tl = .42 + fb(vec2(vUv.x*14.,1.))*.16 + pow(n(vec2(vUv.x*60.,3.)),3.)*.06;
        if (vUv.y < tl) col = vec3(.002,.003,.003) + vec3(.02,.025,.035)*flash*smoothstep(tl-.02,tl,vUv.y);
        gl_FragColor=vec4(col,1.); }` });
  const back = (cx, cz, w, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 30), backMat); p.position.set(cx, 12, cz); p.rotation.y = ry; g.add(p); };
  back(16, AT.z1 + 14, 90, Math.PI); back(16, AT.z0 - 14, 90, 0); back(AT.x1 + 14, -16, 90, -Math.PI / 2);
  // Pflanzkübel als Deckung
  const planter = (x, z, w, d) => {
    const p = box(w, 1.0, d, M.stone, x, 0.5, z); g.add(p);
    const soil = box(w - 0.15, 0.04, d - 0.15, M.black, x, 1.0, z); g.add(soil);
    covers.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    seg(x - w / 2, z - d / 2, x + w / 2, z - d / 2); seg(x + w / 2, z - d / 2, x + w / 2, z + d / 2); seg(x + w / 2, z + d / 2, x - w / 2, z + d / 2); seg(x - w / 2, z + d / 2, x - w / 2, z - d / 2);
    return p;
  };
  const planters = [[10, -13, 3, 1.2], [10, -18, 1.2, 3], [13.5, -24, 3, 1.2], [14, -6.5, 3, 1.2], [18, -15, 1.2, 4], [21, -25.5, 4, 1.2], [21.5, -6, 1.2, 3], [24.5, -12, 3, 1.2], [26, -18.5, 1.2, 3], [28.5, -26, 2.5, 1.2], [28.5, -6, 2.5, 1.2], [4.5, -11.5, 2.4, 1.0], [4, -5, 1.0, 2.4], [13, -10, 1.2, 1.2], [23, -21.5, 1.2, 1.2]];
  const fernSpots = [];
  for (const [x, z, w, d] of planters) { planter(x, z, w, d); const n = Math.round(w * d * 2); for (let i = 0; i < n; i++) fernSpots.push([x + (Math.random() - 0.5) * (w - 0.3), 1.0, z + (Math.random() - 0.5) * (d - 0.3), 0.8 + Math.random() * 0.7]); }
  for (let i = 0; i < 80; i++) { const x = AT.x0 + Math.random() * (AT.x1 - AT.x0), z = AT.z0 + Math.random() * (AT.z1 - AT.z0); if (Math.abs(z - -15.25) < 2 && x < 10) continue; if (Math.abs(z - AT.exit.z) < 2 && x > 28) continue; fernSpots.push([x, 0, z, 0.5 + Math.random() * 0.6]); }
  for (let i = 0; i < 16; i++) fernSpots.push([AT.bx0 + 0.5 + Math.random() * 5, 0, AT.bz0 + 0.5 + Math.random() * 10, 0.7 + Math.random() * 0.8]);
  // Farne als Instanzen (drei gekreuzte Wedel je Pflanze)
  const fernGeo = new THREE.PlaneGeometry(1, 1.4); fernGeo.translate(0, 0.7, 0); fernGeo.rotateX(-0.5);
  const fern = new THREE.InstancedMesh(fernGeo, M.leaf, fernSpots.length * 5); fern.castShadow = true; fern.receiveShadow = true;
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
  for (const [x, y, z, s] of fernSpots) for (let j = 0; j < 5; j++) { e.set(Math.random() * 0.4, j / 5 * TAU + Math.random(), 0); q.setFromEuler(e); mm.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.8 + Math.random() * 0.5), s)); fern.setMatrixAt(k++, mm); }
  g.add(fern);
  // Bäume (Palmfarne)
  for (const [x, z, h] of [[12, -15.5, 6], [20, -11, 7], [25, -23, 6.5], [16, -27, 5.5], [27, -8, 6], [5.5, -9, 5]]) {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, h, 9), M.bark); tr.position.set(x, h / 2, z); tr.rotation.z = (Math.random() - 0.5) * 0.12; tr.castShadow = true; g.add(tr);
    covers.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4, tall: true });
    for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.4), M.leaf); l.geometry.translate(0, 1.7, 0); l.position.set(x, h - 0.2, z); l.rotation.set(-1.1 - Math.random() * 0.4, i / 9 * TAU, 0, 'YXZ'); l.castShadow = true; g.add(l); }
    seg(x - 0.3, z, x + 0.3, z); seg(x, z - 0.3, x, z + 0.3);
  }
  // Fossil-Skelett auf Sockel in der Mitte
  const sx = 17, sz = -18.5;
  const plinth = box(6, 0.6, 2.4, M.stone, sx, 0.3, sz); g.add(plinth); covers.push({ x0: sx - 3, x1: sx + 3, z0: sz - 1.2, z1: sz + 1.2 });
  seg(sx - 3, sz - 1.2, sx + 3, sz - 1.2); seg(sx + 3, sz - 1.2, sx + 3, sz + 1.2); seg(sx + 3, sz + 1.2, sx - 3, sz + 1.2); seg(sx - 3, sz + 1.2, sx - 3, sz - 1.2);
  const bones = new THREE.Group(); bones.position.set(sx, 0.6, sz); g.add(bones);
  const bone = (a, b, r) => { const v = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, v.length(), 6), M.bone); m.position.copy(a).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); m.castShadow = true; bones.add(m); };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  // Wirbelsäule
  const spine = []; for (let i = 0; i <= 26; i++) { const t = i / 26, x = -2.8 + t * 5.6, y = 2.6 + Math.sin(t * Math.PI) * 0.5 - (t > 0.85 ? (t - 0.85) * 2 : 0); spine.push(V3(x, y - (t < 0.3 ? (0.3 - t) * 2.5 : 0), 0)); }
  for (let i = 0; i < spine.length - 1; i++) { bone(spine[i], spine[i + 1], 0.05 + Math.sin(i / 26 * Math.PI) * 0.05); const v = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.05), M.bone); v.position.copy(spine[i]).add(V3(0, 0.15, 0)); bones.add(v); }
  for (let i = 9; i < 19; i++) for (const s of [-1, 1]) { const a = spine[i], c = V3(a.x, a.y - 0.9, s * 0.45), b = V3(a.x + 0.1, a.y - 1.4, s * 0.05); bone(a, c, 0.025); bone(c, b, 0.02); }
  for (const s of [-1, 1]) { const hip = V3(-0.2, 2.6, s * 0.3), kn = V3(0.3, 1.5, s * 0.35), an = V3(-0.3, 0.45, s * 0.35), ft = V3(0.2, 0.02, s * 0.35); bone(hip, kn, 0.11); bone(kn, an, 0.08); bone(an, ft, 0.05); }
  const sk = skull(); sk.scale.setScalar(3.2); sk.position.copy(spine[26]).add(V3(0.2, -0.1, 0)); sk.rotation.y = Math.PI / 2; bones.add(sk);
  const plaque = box(0.9, 0.4, 0.04, M.brass, sx, 0.35, sz + 1.22); g.add(plaque);
  // Umgestürzte Bänke, Kisten
  for (const [x, z, r] of [[15, -12, 0.3], [23, -16, 1.3], [9, -25, 2.2], [26.5, -14, 0.5]]) { const b = new THREE.Group(); b.add(box(1.8, 0.06, 0.45, M.wood, 0, 0.45, 0)); b.add(box(0.06, 0.45, 0.4, M.metal, -0.8, 0.22, 0)); b.add(box(0.06, 0.45, 0.4, M.metal, 0.8, 0.22, 0)); b.position.set(x, 0, z); b.rotation.set(0, r, Math.random() < 0.5 ? 1.5 : 0); g.add(b); }
  // Ausgang
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.38), new THREE.MeshBasicMaterial({ map: M.tex.exit })); exitSign.position.set(AT.x1 - 0.02, 2.75, AT.exit.z); exitSign.rotation.y = -Math.PI / 2; g.add(exitSign);
  const ed = makeDoor(M.metal, 2.0, 2.4); ed.g.position.set(AT.x1, 0, AT.exit.z - 1); ed.g.rotation.y = -Math.PI / 2; g.add(ed.g);
  // Pfützen (glatt spiegelnde Flecken)
  const puddleM = new THREE.MeshStandardMaterial({ color: '#05080a', roughness: 0.02, metalness: 0.4, transparent: true, opacity: 0.75, polygonOffset: true, polygonOffsetFactor: -2 });
  for (let i = 0; i < 22; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 1.4, 18), puddleM); p.scale.set(1, 0.4 + Math.random() * 0.6, 1); p.rotation.x = -Math.PI / 2; p.rotation.z = Math.random() * TAU; p.position.set(AT.x0 + Math.random() * 24, 0.006, AT.z0 + Math.random() * 26); p.receiveShadow = true; g.add(p); }
  return { group: g, cols, covers, skyMat, exitDoor: ed, exitSign };
}

// Regen als Linien, die im Shader fallen und nur sichtbar werden, wenn Licht darauf fällt
export function makeRain(n, area) {
  const pos = new Float32Array(n * 6), off = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = area.x0 + Math.random() * (area.x1 - area.x0), z = area.z0 + Math.random() * (area.z1 - area.z0), y = Math.random() * area.h;
    pos.set([x, y, z, x + 0.02, y - 0.35, z], i * 6); off[i * 2] = off[i * 2 + 1] = Math.random();
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('off', new THREE.BufferAttribute(off, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, h: { value: area.h }, flash: { value: 0 }, lp: { value: new THREE.Vector3() }, ld: { value: new THREE.Vector3(0, 0, -1) }, lon: { value: 0 } },
    vertexShader: `attribute float off; uniform float t,h; uniform vec3 lp,ld; varying float vL; uniform float lon;
      void main(){ vec3 p=position; p.y=mod(p.y - t*9. - off*h, h); vec3 d=p-lp; float dist=length(d); float c=dot(d/dist, ld);
      vL = lon*smoothstep(.9,.97,c)*clamp(6./(dist*dist+1.),0.,1.); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: 'uniform float flash; varying float vL; void main(){ gl_FragColor=vec4(vec3(.55,.62,.7)*(flash*.22+vL*.7+.03),1.); }' });
  const L = new THREE.LineSegments(g, m); L.frustumCulled = false; return L;
}

// Staub im Lichtkegel
export function makeDust(n) {
  const pos = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) pos[i] = Math.random();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, cen: { value: new THREE.Vector3() }, lp: { value: new THREE.Vector3() }, ld: { value: new THREE.Vector3(0, 0, -1) }, lon: { value: 1 }, size: { value: 6 } },
    vertexShader: `uniform float t,lon,size; uniform vec3 cen,lp,ld; varying float a;
      void main(){ vec3 p = position*6. - 3.; p += vec3(sin(t*.13+position.y*40.), sin(t*.07+position.x*30.)*.5, cos(t*.11+position.z*50.))*.25;
        vec3 w = cen + mod(p - cen + 3., 6.) - 3.; vec3 d = w - lp; float dist = length(d); float c = dot(d/max(dist,.001), ld);
        a = lon * smoothstep(.93,.985,c) * smoothstep(7.,.5,dist) * smoothstep(.15,.6,dist);
        vec4 mv = modelViewMatrix*vec4(w,1.); gl_Position = projectionMatrix*mv; gl_PointSize = size/(-mv.z); }`,
    fragmentShader: 'varying float a; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vec3(1.,.95,.85)*a*(1.-d*2.)*.5,1.); }' });
  const P = new THREE.Points(g, m); P.frustumCulled = false; return P;
}
