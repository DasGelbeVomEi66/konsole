// Unterirdisches Labor "Ebene -3": Raster-Karte, daraus erzeugte Räume, Leuchten, Requisiten und Kollision.
import * as THREE from '../../lib/three.module.min.js';
import * as T from './tex.js';

const TAU = Math.PI * 2;
export const CELL = 2;
export const MAP = [
  '########################################',
  '#xxxx#####llllllll#llllllll#vvvv########',
  '#xxxx#####llllllll#llllllll#vvvv########',
  '#xxxx#####llllllll#llllllll#vvvv########',
  '###X#########d#########d#####d##########',
  '###u#####cccccccccccccccccccccccc#######',
  '##uuuuuu#c#########cccc#########c#ggggg#',
  '##uuuuuu#c#########wwww#########c#ggggg#',
  '##uuuuuudc###bbbbbbbbbbbbbbbb###crggggg#',
  '##uuuuuu#c###bbbbbbbbbbbbbbbb###c#ggggg#',
  '##uuuuuu#c###bbbbbbbbbbbbbbbb###c#ggggg#',
  '#########cccwbbbbbbbbbbbbbbbb###c#ggggg#',
  '##oooooo#cccwbbbbbbbbbbbbbbbb###c#######',
  '##oooooo#cccwbbbbbbbbbbbbbbbb###c#sssss#',
  '##oooooodc###bbbbbbbbbbbbbbbb###c#sssss#',
  '##oooooo#c###bbbbbbbbbbbbbbbb###crsssss#',
  '##oooooo#c###bbbbbbbbbbbbbbbb###c#sssss#',
  '#########c#######wwwwwwww#######c#sssss#',
  '#########c#######cccccccc#######c###r###',
  '#####ccccccccccccccccccccccccccccccccc##',
  '#####d#######d###########d###########m##',
  '##hhhhhh##oooooooo##kkkkkkkkkkk######m##',
  '##hhhhhh##oooooooo##kkkkkkkkkkk######m##',
  '##hhhhhh##oooooooo##kkkkkkkkkkk######m##',
  '##hhhhhh##oooooooo##kkkkkkkkkkkdmmmmmm##',
  '##ee######oooooooo##kkkkkkkkkkk#########',
  '##ee######oooooooo##kkkkkkkkkkk#########',
  '########################################',
  '########################################',
];
export const GW = MAP[0].length, GH = MAP.length;
export const ROOMS = [
  { name: 'Treppenhaus', c: 2.5, r: 2.2 }, { name: 'Umkleide', c: 5, r: 8.5 }, { name: 'Sicherheit', c: 5, r: 14.5 }, { name: 'Lobby', c: 5, r: 23 }, { name: 'Aufzug', c: 3, r: 26.5 },
  { name: 'Labor 1', c: 14, r: 2.5 }, { name: 'Labor 2', c: 23, r: 2.5 }, { name: 'Server', c: 30, r: 2.5 }, { name: 'Biodom', c: 21, r: 12.5 }, { name: 'Generator', c: 36.5, r: 9 },
  { name: 'Lager', c: 36.5, r: 15.5 }, { name: 'Kantine', c: 25.5, r: 24 }, { name: 'Ärzte', c: 14, r: 24 }, { name: 'Schacht', c: 35, r: 24.6 },
];
// Zelltypen: Höhe, Materialschlüssel, Rohre an der Decke, Leuchtenabstand
const TY = {
  c: { h: 3.0, floor: 'tileGrey', wall: 'panel', ceil: 'ceilTile', pipes: 1, lamp: 'tube' },
  l: { h: 3.3, floor: 'tileWhite', wall: 'panelWhite', ceil: 'ceilTile', lamp: 'panel' },
  v: { h: 3.0, floor: 'tileDark', wall: 'panelDark', ceil: 'ceilTile', lamp: 'tube' },
  o: { h: 2.9, floor: 'carpet', wall: 'panelWarm', ceil: 'ceilTile', lamp: 'panel' },
  u: { h: 3.0, floor: 'tileWhite', wall: 'panelWhite', ceil: 'ceilTile', lamp: 'tube' },
  x: { h: 7.0, floor: 'concrete', wall: 'concrete', ceil: 'concrete', lamp: 'cage' },
  h: { h: 4.0, floor: 'tileGrey', wall: 'panelWarm', ceil: 'ceilTile', lamp: 'panel' },
  e: { h: 3.0, floor: 'grate', wall: 'metal', ceil: 'metal', lamp: 'cage' },
  g: { h: 6.0, floor: 'grate', wall: 'concrete', ceil: 'concrete', lamp: 'cage', pipes: 1 },
  s: { h: 5.0, floor: 'concrete', wall: 'concrete', ceil: 'concrete', lamp: 'cage' },
  k: { h: 3.2, floor: 'tileWhite', wall: 'panelWhite', ceil: 'ceilTile', lamp: 'panel' },
  m: { h: 2.5, floor: 'concrete', wall: 'concrete', ceil: 'concrete', lamp: 'cage', pipes: 1 },
  b: { h: 12, floor: 'soil', wall: 'concrete', ceil: 'concrete', lamp: 'grow' },
  d: { h: 3.0, floor: 'tileGrey', wall: 'panel', ceil: 'ceilTile' }, r: { h: 3.0, floor: 'tileGrey', wall: 'panel', ceil: 'ceilTile' }, X: { h: 3.0, floor: 'concrete', wall: 'concrete', ceil: 'concrete' },
  w: { h: 3.0, floor: 'tileGrey', wall: 'panel', ceil: 'ceilTile' },
};
export const at = (c, r) => (r < 0 || r >= GH || c < 0 || c >= GW) ? '#' : MAP[r][c];
export const isFloor = ch => !!TY[ch];
export const cellH = ch => TY[ch] ? TY[ch].h : 0;
export const cx = c => (c + 0.5) * CELL, cz = r => (r + 0.5) * CELL;
export const cellOf = (x, z) => [Math.floor(x / CELL), Math.floor(z / CELL)];

// ---------- Materialien ----------
let M = null;
export function labMaterials() {
  if (M) return M;
  const std = o => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8, metalness: 0 }, o));
  const tw = (t, rx, ry) => { for (const k of ['map', 'normalMap', 'roughnessMap', 'alphaMap']) if (t[k]) t[k].repeat.set(rx, ry); return t; };
  const conc = T.concreteTex(), pan = T.panelTex([150, 156, 152], 1.2), panW = T.panelTex([196, 200, 196], 0.8), panD = T.panelTex([70, 76, 80], 1), panK = T.panelTex([150, 138, 116], 1);
  const tG = T.floorTileTex([118, 120, 114], 4, '#1e1e1a', 10), tW = T.floorTileTex([170, 174, 170], 8, '#3a3c38', 8), tD = T.floorTileTex([60, 64, 68], 4, '#111', 4);
  const car = T.carpetTex(), gr = T.grateTex(), ct = T.ceilTileTex(), lk = T.lockerTex(), soil = T.soilTex();
  M = {
    concrete: std({ ...conc, roughness: 1 }), panel: std({ ...pan, roughness: 1 }), panelWhite: std({ ...panW, roughness: 1 }), panelDark: std({ ...panD, roughness: 1, metalness: 0.3 }), panelWarm: std({ ...panK, roughness: 1 }),
    tileGrey: std({ ...tG, roughness: 1 }), tileWhite: std({ ...tW, roughness: 1 }), tileDark: std({ ...tD, roughness: 1 }),
    carpet: std({ ...car, roughness: 1 }), grate: std({ map: gr.map, roughness: 0.6, metalness: 0.6, color: '#888' }), ceilTile: std({ ...ct, roughness: 1 }),
    soil: std({ ...soil, roughness: 1 }),
    metal: std({ color: '#5a5e60', roughness: 0.4, metalness: 0.85 }), darkMetal: std({ color: '#26292b', roughness: 0.5, metalness: 0.7 }), steel: std({ color: '#8a8e90', roughness: 0.3, metalness: 0.9 }),
    rust: std({ color: '#5a4434', roughness: 0.85, metalness: 0.4 }), pipeA: std({ color: '#6a3a2a', roughness: 0.6, metalness: 0.5 }), pipeB: std({ color: '#3a4a52', roughness: 0.5, metalness: 0.6 }), pipeC: std({ color: '#8a8a7a', roughness: 0.45, metalness: 0.7 }),
    locker: std({ ...lk, metalness: 0.6, roughness: 1 }), lockerSide: std({ color: '#33424a', roughness: 0.45, metalness: 0.6 }),
    white: std({ color: '#c8ccc8', roughness: 0.5 }), plastic: std({ color: '#d8d8d0', roughness: 0.4 }), blackPl: std({ color: '#121314', roughness: 0.4 }), wood: std({ color: '#5a3e28', roughness: 0.6 }),
    cardboard: std({ ...T.cardboardTex(), roughness: 0.95 }), stripe: std({ map: T.stripeTex(), roughness: 0.7 }), rubber: std({ color: '#151515', roughness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({ color: '#a8c4c8', roughness: 0.22, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
    glassCrack: new THREE.MeshStandardMaterial({ color: '#c8dce0', roughness: 0.1, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
    tube: new THREE.MeshStandardMaterial({ color: '#f4f8ff', emissive: new THREE.Color('#dfeaff'), emissiveIntensity: 0 }),
    red: new THREE.MeshStandardMaterial({ color: '#400', emissive: new THREE.Color('#ff2010'), emissiveIntensity: 2.5 }),
    green: new THREE.MeshStandardMaterial({ color: '#030', emissive: new THREE.Color('#30ff70'), emissiveIntensity: 2.5 }),
    amber: new THREE.MeshStandardMaterial({ color: '#420', emissive: new THREE.Color('#ffaa20'), emissiveIntensity: 2 }),
    liquid: new THREE.MeshStandardMaterial({ color: '#2a8a50', emissive: new THREE.Color('#3aff8a'), emissiveIntensity: 0.9, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false }),
    leaf: new THREE.MeshStandardMaterial({ map: T.leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7, color: '#7a8a68' }),
    bark: std({ color: '#2a2018', roughness: 0.95 }),
    blood: new THREE.MeshStandardMaterial({ map: T.bloodTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.25 }),
    scratch: new THREE.MeshStandardMaterial({ map: T.scratchTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.6 }),
    foot: new THREE.MeshStandardMaterial({ map: T.footprintTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.2, opacity: 0.85 }),
    puddle: new THREE.MeshStandardMaterial({ color: '#06090a', roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    cookie: T.cookieTexture(),
  };
  M.grate.alphaMap = null;
  for (const k of ['concrete', 'panel', 'panelWhite', 'panelDark', 'panelWarm']) M[k].shadowSide = THREE.DoubleSide;
  return M;
}

// ---------- Geometrie sammeln und zusammenführen ----------
class Merger {
  constructor() { this.parts = new Map(); }
  add(mat, geo, matrix) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); if (matrix) g.applyMatrix4(matrix);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!this.parts.has(mat)) this.parts.set(mat, []); this.parts.get(mat).push(g);
  }
  quad(mat, p0, p1, p2, p3, uv) { // Reihenfolge gegen den Uhrzeigersinn von vorn gesehen
    const pos = [...p0, ...p1, ...p2, ...p0, ...p2, ...p3], u = uv || [0, 0, 1, 0, 1, 1, 0, 1];
    const uvs = [u[0], u[1], u[2], u[3], u[4], u[5], u[0], u[1], u[4], u[5], u[6], u[7]];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.computeVertexNormals();
    this.add(mat, g);
  }
  build(group, shadow = true) {
    for (const [mat, list] of this.parts) {
      let n = 0; for (const g of list) n += g.attributes.position.count;
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
      for (const g of list) { const c = g.attributes.position.count; P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); U.set(g.attributes.uv.array, o * 2); o += c; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.castShadow = shadow; group.add(m);
    }
    this.parts.clear();
  }
}
const mtx = (x, y, z, ry = 0, rx = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(s, s, s));
const mtxS = (x, y, z, ry, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 12), CYL6 = new THREE.CylinderGeometry(1, 1, 1, 8);

// ---------- Aufbau ----------
export function buildLab() {
  labMaterials();
  const group = new THREE.Group(), mg = new Merger(), solids = [], items = [], fixtures = [], lockers = [], doors = [], screens = [], steam = [], drips = [], sparks = [], tanks = [], blinks = [];
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // Böden, Decken, Wände
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const ch = at(c, r); if (!isFloor(ch)) continue;
    const t = TY[ch], h = t.h, x0 = c * CELL, z0 = r * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
    const fm = M[t.floor], cm = M[t.ceil], wm = M[t.wall];
    const fu = (x, z) => [x / 2, z / 2];
    mg.quad(fm, [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], [...fu(x0, z1), ...fu(x1, z1), ...fu(x1, z0), ...fu(x0, z0)]);
    mg.quad(cm, [x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1], [x0 / 2, z0 / 2, x1 / 2, z0 / 2, x1 / 2, z1 / 2, x0 / 2, z1 / 2]);
    for (const [dx, dz] of D) {
      const n = at(c + dx, r + dz); let y0 = 0, y1 = h;
      if (isFloor(n)) { const hn = cellH(n); if (hn >= h) continue; y0 = hn; }
      // Wand an der Kante, Blick in die Zelle
      let a, b;
      if (dx === 1) { a = [x1, 0, z0]; b = [x1, 0, z1]; } else if (dx === -1) { a = [x0, 0, z1]; b = [x0, 0, z0]; } else if (dz === 1) { a = [x1, 0, z1]; b = [x0, 0, z1]; } else { a = [x0, 0, z0]; b = [x1, 0, z0]; }
      const along = (dx !== 0 ? a[2] : a[0]) / 2, along2 = (dx !== 0 ? b[2] : b[0]) / 2;
      const vs = 3; // Wandtextur deckt 3 m
      mg.quad(wm, [a[0], y0, a[2]], [b[0], y0, b[2]], [b[0], y1, b[2]], [a[0], y1, a[2]], [along, y0 / vs, along2, y0 / vs, along2, y1 / vs, along, y1 / vs]);
    }
    // Glaswand-Zelle: Brüstung, Glas, Sturz
    if (ch === 'w') {
      const alongX = isFloor(at(c, r - 1)) && at(c, r - 1) !== 'w' || isFloor(at(c, r + 1)) && at(c, r + 1) !== 'w';
      const ry = alongX ? 0 : Math.PI / 2, mx = x0 + 1, mz = z0 + 1;
      mg.add(M.darkMetal, BOX, mtxS(mx, 0.5, mz, ry, 2, 1, 0.3)); mg.add(M.darkMetal, BOX, mtxS(mx, 2.85, mz, ry, 2, 0.3, 0.3));
      mg.add(M.darkMetal, BOX, mtxS(mx + (alongX ? -0.97 : 0), 1.85, mz + (alongX ? 0 : -0.97), ry, 0.08, 1.8, 0.2));
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.7), M.glass); gl.position.set(mx, 1.85, mz); gl.rotation.y = ry; group.add(gl);
      solids.push({ x0, x1, z0, z1, glass: true });
    }
  }
  // Solide Zellen für die Kollision
  const solidAt = (c, r) => { const ch = at(c, r); return !isFloor(ch) || ch === 'w'; };

  // ---------- Türen ----------
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const ch = at(c, r); if (ch !== 'd' && ch !== 'r' && ch !== 'X') continue;
    const passX = isFloor(at(c - 1, r)) && isFloor(at(c + 1, r));
    const x = cx(c), z = cz(r), ry = passX ? Math.PI / 2 : 0;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
    // Rahmen
    const fm = ch === 'X' ? M.stripe : M.darkMetal;
    for (const s of [-1, 1]) { const p = new THREE.Mesh(BOX, fm); p.scale.set(0.2, 2.5, 0.35); p.position.set(s * 0.9, 1.25, 0); p.castShadow = true; g.add(p); }
    const top = new THREE.Mesh(BOX, M.darkMetal); top.scale.set(2, 0.5, 0.35); top.position.set(0, 2.75, 0); g.add(top);
    const halves = [];
    for (const s of [-1, 1]) {
      const h = new THREE.Group(); g.add(h);
      const leaf = new THREE.Mesh(BOX, ch === 'X' ? M.metal : M.darkMetal); leaf.scale.set(0.82, 2.48, 0.1); leaf.position.set(s * 0.41, 1.24, 0); leaf.castShadow = true; h.add(leaf);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.6), M.glass); win.position.set(s * 0.5, 1.6, 0.052); h.add(win);
      const st = new THREE.Mesh(BOX, M.stripe); st.scale.set(0.8, 0.12, 0.105); st.position.set(s * 0.41, 0.3, 0); h.add(st);
      halves.push({ h, s });
    }
    // Lesegerät mit Lämpchen
    let led = null;
    if (ch !== 'd') { const rd = new THREE.Mesh(BOX, M.blackPl); rd.scale.set(0.14, 0.22, 0.06); rd.position.set(1.15, 1.3, 0.2); g.add(rd); led = new THREE.Mesh(BOX, ch === 'X' ? M.red : M.red); led.scale.set(0.05, 0.03, 0.02); led.position.set(1.15, 1.4, 0.24); g.add(led); const rd2 = rd.clone(); rd2.position.z = -0.2; g.add(rd2); }
    const door = { c, r, kind: ch, x, z, open: 0, target: 0, halves, led, locked: ch !== 'd', g, passX };
    doors.push(door);
  }

  // ---------- Deckenrohre in Gängen ----------
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const ch = at(c, r); if (!TY[ch] || !TY[ch].pipes) continue;
    const h = TY[ch].h, x = cx(c), z = cz(r);
    const ns = isFloor(at(c, r - 1)) || isFloor(at(c, r + 1)), ew = isFloor(at(c - 1, r)) || isFloor(at(c + 1, r));
    const dirs = []; if (ew || !ns) dirs.push(0); if (ns && !ew) dirs.push(1); if (ns && ew) dirs.push(1);
    for (const d of dirs) {
      const ry = d ? 0 : Math.PI / 2; const off = (k) => d ? [k, 0] : [0, k];
      [[0.62, 0.09, M.pipeA, 0.32], [0.38, 0.055, M.pipeB, 0.24], [-0.55, 0.12, M.pipeC, 0.36]].forEach(([o, rad, mat, dy]) => {
        const [ox, oz] = off(o); const m = mtx(x + ox, h - dy, z + oz, ry, Math.PI / 2, 0); m.scale(new THREE.Vector3(rad, CELL + 0.02, rad)); mg.add(mat, CYL6, m);
      });
      // Halterungen
      mg.add(M.darkMetal, BOX, mtxS(x, h - 0.15, z, ry + Math.PI / 2, 0.04, 0.3, 1.6));
      // Kabeltrasse
      const [kx, kz] = off(-0.78); mg.add(M.darkMetal, BOX, mtxS(x + kx, h - 0.62, z + kz, ry + Math.PI / 2, CELL, 0.03, 0.3));
    }
  }

  // ---------- Leuchten ----------
  const lampAt = (x, z, h, kind, state) => {
    const g = new THREE.Group(); g.position.set(x, h, z); group.add(g);
    let em;
    if (kind === 'tube') { const hs = new THREE.Mesh(BOX, M.darkMetal); hs.scale.set(1.3, 0.08, 0.26); hs.position.y = -0.04; g.add(hs); em = new THREE.Mesh(BOX, M.tube.clone()); em.scale.set(1.2, 0.04, 0.12); em.position.y = -0.09; g.add(em); }
    else if (kind === 'panel') { const hs = new THREE.Mesh(BOX, M.darkMetal); hs.scale.set(0.66, 0.04, 0.66); hs.position.y = -0.02; g.add(hs); em = new THREE.Mesh(BOX, M.tube.clone()); em.scale.set(0.6, 0.02, 0.6); em.position.y = -0.04; g.add(em); }
    else if (kind === 'cage') { const hs = new THREE.Mesh(CYL, M.darkMetal); hs.scale.set(0.14, 0.12, 0.14); hs.position.y = -0.06; g.add(hs); em = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), M.tube.clone()); em.position.y = -0.18; g.add(em); for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(BOX, M.darkMetal); w.scale.set(0.01, 0.2, 0.01); w.position.set(Math.cos(i * 1.57) * 0.12, -0.18, Math.sin(i * 1.57) * 0.12); g.add(w); } }
    else { em = new THREE.Mesh(BOX, M.tube.clone()); em.scale.set(2, 0.1, 0.4); g.add(em); }
    if (kind === 'grow') em.material.emissive.set('#b0ffc0');
    g.traverse(o => { if (o.isMesh) o.castShadow = false; });
    const f = { x, y: h - 0.2, z, kind, state, em, g, cur: 0, dip: 0, warm: kind === 'cage' ? 1 : 0 };
    fixtures.push(f); return f;
  };
  // Zustand vor dem Stromausfall wird im Spiel gesetzt: jede Leuchte bekommt ein "Schicksal"
  let k = 0;
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const ch = at(c, r), t = TY[ch]; if (!t || !t.lamp) continue;
    const big = ch === 'b' || ch === 'g' || ch === 's' || ch === 'x';
    if (big ? ((c + r) % 3 !== 0) : ((c + r) % 2 !== 0)) continue;
    const ns = isFloor(at(c, r - 1)) && isFloor(at(c, r + 1)) && !isFloor(at(c - 1, r));
    const f = lampAt(cx(c), cz(r), t.h, t.lamp, 'off');
    if (t.lamp === 'tube' && ns) f.g.rotation.y = Math.PI / 2;
    f.fate = (k++ * 7919) % 10; // 0-1 kaputt, 2-3 flackern, Rest normal
  }
  // Notleuchten (rot) an den Wänden der Gänge
  const emerg = [];
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    if (at(c, r) !== 'c' && at(c, r) !== 'm' && at(c, r) !== 'u') continue; if ((c * 3 + r * 5) % 7 !== 0) continue;
    for (const [dx, dz] of D) if (!isFloor(at(c + dx, r + dz))) {
      const x = cx(c) + dx * 0.97, z = cz(r) + dz * 0.97;
      const m = new THREE.Mesh(BOX, M.red.clone()); m.scale.set(dz ? 0.3 : 0.06, 0.1, dz ? 0.06 : 0.3); m.position.set(x, 2.45, z); group.add(m);
      emerg.push({ x: x - dx * 0.3, y: 2.3, z: z - dz * 0.3, m }); break;
    }
  }

  // ---------- Requisiten ----------
  const addSolid = (x, z, w, d, extra) => { const s = Object.assign({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }, extra || {}); solids.push(s); return s; };
  const boxM = (mat, x, y, z, sx, sy, sz, ry = 0) => mg.add(mat, BOX, mtxS(x, y, z, ry, sx, sy, sz));
  // Spinde: [Spalte, Zeile, Wandrichtung, Anzahl]
  const lockerSpots = [[4, 6, 'N', 4], [2, 10, 'S', 6], [7, 7, 'E', 3], [9, 16, 'W', 2], [16, 5, 'N', 3], [27, 5, 'N', 2], [32, 12, 'E', 2], [14, 19, 'S', 3], [29, 19, 'N', 2], [20, 26, 'S', 3], [30, 21, 'E', 2], [10, 21, 'N', 2], [9, 7, 'W', 1], [34, 13, 'N', 2], [2, 21, 'N', 2]];
  const W2 = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  for (const [c0, r0, dir, n] of lockerSpots) {
    const [wx, wz] = W2[dir];
    for (let i = 0; i < n; i++) {
      // entlang der Wand aufreihen
      const along = dir === 'N' || dir === 'S' ? [0.55, 0] : [0, 0.55];
      const baseX = cx(c0) + wx * (CELL / 2 - 0.3) - (dir === 'N' || dir === 'S' ? CELL / 2 - 0.3 : 0), baseZ = cz(r0) + wz * (CELL / 2 - 0.3) - (dir === 'E' || dir === 'W' ? CELL / 2 - 0.3 : 0);
      const x = baseX + along[0] * i, z = baseZ + along[1] * i;
      const [lc, lr] = cellOf(x, z); if (!isFloor(at(lc, lr)) || at(lc, lr) === 'd') continue;
      const ry = Math.atan2(-wx, -wz); // Tür zeigt in den Raum
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
      const body = new THREE.Mesh(BOX, M.lockerSide); body.scale.set(0.52, 1.95, 0.55); body.position.y = 0.975; body.castShadow = body.receiveShadow = true; g.add(body);
      const hinge = new THREE.Group(); hinge.position.set(-0.25, 0, 0.28); g.add(hinge);
      const door = new THREE.Mesh(BOX, [M.lockerSide, M.lockerSide, M.lockerSide, M.lockerSide, M.locker, M.lockerSide]); door.scale.set(0.5, 1.9, 0.025); door.position.set(0.25, 0.975, 0); door.castShadow = true; hinge.add(door);
      const top = new THREE.Mesh(BOX, M.darkMetal); top.scale.set(0.54, 0.05, 0.57); top.position.y = 1.97; g.add(top);
      const L = { x, z, ry, g, hinge, open: 0, target: 0, wx, wz, inX: x - wx * 0.02, inZ: z - wz * 0.02, outX: x - wx * 0.85, outZ: z - wz * 0.85 };
      lockers.push(L); addSolid(x, z, Math.abs(wx) ? 0.56 : 0.54, Math.abs(wz) ? 0.56 : 0.54, { locker: L });
    }
  }
  const desk = (x, z, ry, monitor) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
    const top = new THREE.Mesh(BOX, M.plastic); top.scale.set(1.6, 0.05, 0.75); top.position.y = 0.75; top.castShadow = top.receiveShadow = true; g.add(top);
    for (const s of [-1, 1]) { const l = new THREE.Mesh(BOX, M.darkMetal); l.scale.set(0.05, 0.73, 0.7); l.position.set(s * 0.75, 0.365, 0); l.castShadow = true; g.add(l); }
    if (monitor) {
      const mon = new THREE.Mesh(BOX, M.blackPl); mon.scale.set(0.55, 0.36, 0.04); mon.position.set(0, 1.05, -0.2); g.add(mon);
      const st = new THREE.Mesh(BOX, M.blackPl); st.scale.set(0.05, 0.2, 0.05); st.position.set(0, 0.85, -0.22); g.add(st);
      const sm = new THREE.MeshBasicMaterial({ map: T.screenTex(monitor, screens.length) }); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.51, 0.32), sm); sc.position.set(0, 1.05, -0.178); g.add(sc); screens.push(sc);
      const kb = new THREE.Mesh(BOX, M.blackPl); kb.scale.set(0.42, 0.02, 0.14); kb.position.set(0, 0.785, 0.05); g.add(kb);
    }
    for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(BOX, M.white); p.scale.set(0.21, 0.003, 0.29); p.position.set(0.45 + Math.random() * 0.2, 0.78 + i * 0.003, Math.random() * 0.2); p.rotation.y = Math.random(); g.add(p); }
    const ch = new THREE.Group(); ch.position.set(0.1, 0, 0.6); ch.rotation.y = Math.random() - 0.5 + Math.PI; g.add(ch);
    const seat = new THREE.Mesh(BOX, M.rubber); seat.scale.set(0.46, 0.08, 0.46); seat.position.y = 0.48; ch.add(seat); const back = new THREE.Mesh(BOX, M.rubber); back.scale.set(0.44, 0.5, 0.06); back.position.set(0, 0.8, -0.2); ch.add(back);
    const leg = new THREE.Mesh(CYL, M.steel); leg.scale.set(0.03, 0.44, 0.03); leg.position.y = 0.22; ch.add(leg);
    if (Math.random() < 0.4) { ch.rotation.z = Math.PI / 2; ch.position.y = 0.25; }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const w = Math.abs(Math.sin(ry)) > 0.5; addSolid(x, z, w ? 0.75 : 1.6, w ? 1.6 : 0.75);
    return g;
  };
  // Sicherheitsbüro: Pult mit Kameras, Karte
  const secDesk = desk(cx(4.5), cz(13) + 0.2, 0, 'cctv'); desk(cx(6), cz(15.5), Math.PI, 'cctv');
  for (let i = 0; i < 4; i++) { const sm = new THREE.MeshBasicMaterial({ map: T.screenTex('cctv', i + 2) }); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), sm); sc.position.set(cx(2) - 0.98 + 0.001, 1.7 + (i % 2) * 0.5, cz(13) + (i >> 1) * 0.8 - 0.4); sc.rotation.y = Math.PI / 2; group.add(sc); screens.push(sc); boxM(M.blackPl, cx(2) - 1.0, 1.7 + (i % 2) * 0.5, cz(13) + (i >> 1) * 0.8 - 0.4, 0.04, 0.48, 0.74); }
  // Büros / Ärzte
  desk(cx(12), cz(22), 0, 'term'); desk(cx(15.5), cz(22), 0, 'term'); desk(cx(12), cz(25), Math.PI); desk(cx(16), cz(25.2), Math.PI, 'term');
  // Labore: Tische, Tanks
  const bench = (x, z, ry) => { boxM(M.white, x, 0.45, z, ry ? 0.8 : 2.6, 0.9, ry ? 2.6 : 0.8); boxM(M.blackPl, x, 0.92, z, ry ? 0.84 : 2.64, 0.04, ry ? 2.64 : 0.84); addSolid(x, z, ry ? 0.84 : 2.64, ry ? 2.64 : 0.84);
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 10), M.glass); b.position.set(x + (ry ? 0 : (Math.random() - 0.5) * 2.2), 1.02, z + (ry ? (Math.random() - 0.5) * 2.2 : (Math.random() - 0.5) * 0.4)); group.add(b); }
    const mic = new THREE.Group(); mic.position.set(x + (ry ? 0.1 : 0.7), 0.94, z + (ry ? 0.7 : 0.1)); group.add(mic); const mb = new THREE.Mesh(BOX, M.white); mb.scale.set(0.2, 0.04, 0.26); mb.position.y = 0.02; mic.add(mb); const ma = new THREE.Mesh(BOX, M.white); ma.scale.set(0.06, 0.34, 0.06); ma.position.set(0, 0.2, -0.08); mic.add(ma); const mt = new THREE.Mesh(CYL, M.blackPl); mt.scale.set(0.03, 0.16, 0.03); mt.position.set(0, 0.36, 0); mt.rotation.x = 0.4; mic.add(mt); };
  bench(cx(12.5), cz(2), 0); bench(cx(15.5), cz(2), 0); bench(cx(24.5), cz(2.6), 0);
  const tank = (x, z, broken) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const base = new THREE.Mesh(CYL, M.darkMetal); base.scale.set(0.55, 0.4, 0.55); base.position.y = 0.2; g.add(base);
    const cap = new THREE.Mesh(CYL, M.darkMetal); cap.scale.set(0.55, 0.3, 0.55); cap.position.y = 2.55; g.add(cap);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 2.0, 24, 1, true), broken ? M.glassCrack : M.glass); tube.position.y = 1.4; g.add(tube);
    if (!broken) { const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.9, 20), M.liquid); liq.position.y = 1.38; g.add(liq);
      // Embryo
      const em = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshStandardMaterial({ color: '#3a3a28', roughness: 0.6 })); em.scale.set(0.8, 1.2, 0.7); em.position.y = 1.45; g.add(em);
      const tl = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 6), em.material); tl.position.set(0, 1.15, 0.05); tl.rotation.x = 2.6; g.add(tl);
      tanks.push({ g, liq, em, x, z }); }
    else { for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.2), M.glassCrack); s.position.set((Math.random() - 0.5) * 1.6, 0.01, (Math.random() - 0.5) * 1.6); s.rotation.x = -Math.PI / 2; s.rotation.z = Math.random() * 6; g.add(s); } const p = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), M.puddle); p.rotation.x = -Math.PI / 2; p.position.y = 0.006; g.add(p); }
    for (const a of [0, 2.1, 4.2]) { const p = new THREE.Mesh(CYL, M.pipeB); p.scale.set(0.04, 0.6, 0.04); p.position.set(Math.cos(a) * 0.5, 3.0, Math.sin(a) * 0.5); g.add(p); }
    g.traverse(o => { if (o.isMesh && o.material !== M.glass && o.material !== M.liquid) o.castShadow = true; });
    addSolid(x, z, 1.1, 1.1);
  };
  tank(cx(20), cz(1.6), false); tank(cx(22), cz(1.6), true); tank(cx(26), cz(1.6), false); tank(cx(11), cz(3), true); tank(cx(17), cz(1.3), false);
  // Serverraum
  for (let i = 0; i < 3; i++) for (const zz of [1.3, 3.0]) {
    const x = cx(28.6) + i * 1.0, z = cz(zz) - 0.6; boxM(M.blackPl, x, 1.05, z, 0.7, 2.1, 0.9); addSolid(x, z, 0.72, 0.92);
    for (let j = 0; j < 12; j++) { const led = new THREE.Mesh(BOX, j % 3 ? M.green.clone() : M.amber.clone()); led.scale.set(0.02, 0.02, 0.01); led.position.set(x - 0.25 + (j % 4) * 0.06, 0.4 + Math.floor(j / 4) * 0.5, z + 0.455); group.add(led); blinks.push(led); }
  }
  // Lager: Regale mit Kisten
  for (const [x, z] of [[cx(34.5), cz(14)], [cx(34.5), cz(16)], [cx(37.5), cz(14)]]) {
    for (const y of [0.05, 1.0, 2.0, 3.0]) boxM(M.metal, x, y, z, 0.6, 0.04, 2.0);
    for (const dx of [-0.28, 0.28]) for (const dz of [-0.98, 0.98]) boxM(M.darkMetal, x + dx, 1.6, z + dz, 0.04, 3.2, 0.04);
    for (const y of [0.07, 1.02, 2.02]) for (let i = 0; i < 3; i++) if (Math.random() < 0.8) { const s = 0.35 + Math.random() * 0.2; boxM(M.cardboard, x + (Math.random() - 0.5) * 0.15, y + s / 2, z - 0.6 + i * 0.6, s, s, s * 1.2, Math.random() * 0.3); }
    addSolid(x, z, 0.64, 2.04);
  }
  for (const [x, z] of [[cx(37.5), cz(16.6)], [cx(36.6), cz(17)]]) { const b = new THREE.Mesh(CYL, M.rust); b.scale.set(0.3, 0.9, 0.3); b.position.set(x, 0.45, z); b.castShadow = true; group.add(b); addSolid(x, z, 0.6, 0.6); }
  // Generatorraum
  const gen = new THREE.Group(); gen.position.set(cx(36.5), 0, cz(8.5)); group.add(gen);
  for (const dz of [-1.6, 1.6]) { const c = new THREE.Mesh(CYL, M.metal); c.scale.set(0.9, 3.2, 0.9); c.rotation.z = Math.PI / 2; c.position.set(0.6, 1.2, dz); c.castShadow = true; gen.add(c); for (let i = -1; i <= 1; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.05, 6, 20), M.darkMetal); r.rotation.y = Math.PI / 2; r.position.set(0.6 + i * 1.1, 1.2, dz); gen.add(r); } }
  const panelG = new THREE.Mesh(BOX, M.darkMetal); panelG.scale.set(0.5, 1.8, 1.4); panelG.position.set(-1.9, 0.9, 0); gen.add(panelG);
  const stripe = new THREE.Mesh(BOX, M.stripe); stripe.scale.set(0.52, 0.12, 1.42); stripe.position.set(-1.9, 1.85, 0); gen.add(stripe);
  const slot = new THREE.Mesh(BOX, M.blackPl); slot.scale.set(0.02, 0.22, 0.12); slot.position.set(-2.16, 1.25, -0.3); gen.add(slot);
  const lever = new THREE.Group(); lever.position.set(-2.17, 1.1, 0.35); gen.add(lever); const lv = new THREE.Mesh(CYL, M.red.clone()); lv.material.emissiveIntensity = 0.3; lv.scale.set(0.03, 0.4, 0.03); lv.position.y = 0.2; lever.add(lv); lever.rotation.x = 0.7;
  const fuseIn = new THREE.Mesh(BOX, M.amber); fuseIn.scale.set(0.05, 0.16, 0.08); fuseIn.position.set(-2.19, 1.25, -0.3); fuseIn.visible = false; gen.add(fuseIn);
  const genLed = new THREE.Mesh(BOX, M.red); genLed.scale.set(0.02, 0.05, 0.05); genLed.position.set(-2.16, 1.55, 0); gen.add(genLed);
  addSolid(cx(36.5) + 0.6, cz(8.5), 3.4, 5.2); addSolid(cx(36.5) - 1.9, cz(8.5), 0.6, 1.5);
  // Kantine
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const x = cx(21.5) + i * 3.2, z = cz(22.3) + j * 3.6; boxM(M.white, x, 0.74, z, 1.8, 0.05, 0.9); boxM(M.steel, x, 0.37, z, 0.08, 0.72, 0.08); addSolid(x, z, 1.8, 0.9);
    for (const s of [-1, 1]) for (const t of [-0.5, 0.5]) { if (Math.random() < 0.25) continue; const fallen = Math.random() < 0.3; const cg = new THREE.Group(); cg.position.set(x + t, 0, z + s * 0.75); if (fallen) { cg.rotation.z = Math.PI / 2; cg.position.y = 0.22; cg.rotation.y = Math.random() * 3; } group.add(cg); const st = new THREE.Mesh(BOX, M.plastic); st.scale.set(0.4, 0.05, 0.4); st.position.y = 0.45; cg.add(st); const bk = new THREE.Mesh(BOX, M.plastic); bk.scale.set(0.4, 0.4, 0.04); bk.position.set(0, 0.66, s * 0.19); cg.add(bk); for (const lx of [-0.17, 0.17]) for (const lz of [-0.17, 0.17]) { const lg = new THREE.Mesh(BOX, M.steel); lg.scale.set(0.025, 0.45, 0.025); lg.position.set(lx, 0.22, lz); cg.add(lg); } cg.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
  }
  const vend = new THREE.Group(); vend.position.set(cx(30) + 0.45, 0, cz(22.5)); vend.rotation.y = -Math.PI / 2; group.add(vend);
  { const b = new THREE.Mesh(BOX, M.darkMetal); b.scale.set(1.0, 1.9, 0.8); b.position.y = 0.95; b.castShadow = true; vend.add(b); const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.2), new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color('#a8d8ff'), emissiveIntensity: 1.1 })); fr.position.set(-0.12, 1.15, 0.405); vend.add(fr); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const it = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: ['#c02020', '#20a040', '#e0b020', '#2040c0'][(i + j) % 4] })); it.scale.set(0.1, 0.18, 0.05); it.position.set(-0.36 + j * 0.16, 0.7 + i * 0.28, 0.38); vend.add(it); } }
  addSolid(cx(30) + 0.45, cz(22.5), 0.8, 1.0);
  const vendLight = { x: cx(30) - 0.2, y: 1.2, z: cz(22.5), col: '#a8d8ff', amp: 0.8 };
  // Lobby: Empfang, Aufzug
  boxM(M.wood, cx(5.5), 0.55, cz(22.5), 3.0, 1.1, 0.6); boxM(M.plastic, cx(5.5), 1.12, cz(22.5), 3.1, 0.04, 0.7); addSolid(cx(5.5), cz(22.5), 3.1, 0.7);
  for (const s of [-1, 1]) { const d = new THREE.Mesh(BOX, M.steel); d.scale.set(0.9, 2.6, 0.06); d.position.set(cx(2.5) + s * 1.05, 1.3, cz(24) + 0.95); d.rotation.y = s * 0.15; group.add(d); }
  boxM(M.darkMetal, cx(2.5), 2.85, cz(24) + 0.97, 4, 0.3, 0.1);
  // Treppenhaus: Stufen nach oben
  for (let i = 0; i < 12; i++) boxM(M.concrete, cx(1.5) + 0.0, 0.1 + i * 0.2, cz(2.6) - i * 0.28, 1.8, 0.2, 0.28);
  boxM(M.stripe, cx(1.5), 2.6, cz(2.6) - 3.36, 1.8, 0.05, 0.5);
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), new THREE.MeshBasicMaterial({ map: T.signTexture('NOTAUSGANG') })); exitSign.position.set(cx(3), 2.75, cz(5) - 0.98); group.add(exitSign);
  // Biodom: Pflanzen und Bäume
  const ferns = [];
  for (let i = 0; i < 260; i++) { const x = cx(13) + Math.random() * 31, z = cz(8) + Math.random() * 17; ferns.push([x, z, 0.6 + Math.random() * 1.3]); }
  const fernGeo = new THREE.PlaneGeometry(1, 1.4); fernGeo.translate(0, 0.7, 0); fernGeo.rotateX(-0.5);
  const fern = new THREE.InstancedMesh(fernGeo, M.leaf, ferns.length * 5); let fi = 0;
  for (const [x, z, s] of ferns) for (let j = 0; j < 5; j++) fern.setMatrixAt(fi++, mtx(x, 0, z, j / 5 * TAU + Math.random(), Math.random() * 0.4, 0, s));
  fern.castShadow = true; group.add(fern);
  for (let i = 0; i < 16; i++) { const x = cx(13.5) + Math.random() * 30, z = cz(8.5) + Math.random() * 16, h = 6 + Math.random() * 4; const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, h, 9), M.bark); tr.position.set(x, h / 2, z); tr.castShadow = true; group.add(tr); for (let j = 0; j < 9; j++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.8), M.leaf); l.geometry.translate(0, 1.9, 0); l.position.set(x, h - 0.2, z); l.rotation.set(-1.1 - Math.random() * 0.4, j / 9 * TAU, 0, 'YXZ'); group.add(l); } }
  // Leuchtender Nebel hinten im Biodom: Bäume und Tiere zeichnen sich als Silhouetten ab
  const mistMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { t: { value: 0 }, k: { value: 1 } }, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float t,k; varying vec2 vUv; float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);} float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      void main(){ float c=n(vUv*vec2(6.,3.)+vec2(t*.03,0.))*.6+n(vUv*vec2(13.,6.)-vec2(t*.05,0.))*.4; float a=smoothstep(0.,.25,vUv.y)*smoothstep(1.,.45,vUv.y)*smoothstep(0.,.1,vUv.x)*smoothstep(1.,.9,vUv.x);
        gl_FragColor=vec4(vec3(.32,.5,.38)*(.5+c*.8)*k, a*(.3+c*.35)); }` });
  const mistA = new THREE.Mesh(new THREE.PlaneGeometry(17, 11), mistMat); mistA.position.set(cx(25.5), 5, cz(12)); mistA.rotation.y = Math.PI / 2; group.add(mistA);
  const mistB = new THREE.Mesh(new THREE.PlaneGeometry(30, 11), mistMat); mistB.position.set(cx(20.5), 5, cz(12)); group.add(mistB);
  // Raumschilder neben Türen
  const sign = (text, c, r, dx, dz, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshStandardMaterial({ map: T.labelTex(text, col || '#d8dcd8'), roughness: 0.5 })); m.position.set(cx(c) + dx, 2.2, cz(r) + dz); m.rotation.y = Math.abs(dx) > 0.95 ? Math.atan2(-Math.sign(dx), 0) : Math.atan2(0, -Math.sign(dz)); group.add(m); };
  sign('LABOR 1', 13, 5, 0.9, -0.98); sign('LABOR 2', 23, 5, 0.9, -0.98); sign('SERVER', 29, 5, 0.9, -0.98); sign('UMKLEIDE', 9, 8, -0.98, -0.9); sign('SICHERHEIT', 9, 14, -0.98, -0.9); sign('GENERATOR', 32, 8, 0.98, -0.9, '#e0b020'); sign('LAGER', 32, 15, 0.98, -0.9, '#e0b020'); sign('KANTINE', 25, 19, 0.9, 0.98); sign('ÄRZTE', 13, 19, 0.9, 0.98); sign('LOBBY', 5, 19, 0.9, 0.98);
  // Fluchtpläne
  const planSpots = [[6, 19, 0, -0.98], [20, 5, 0, 0.98], [9, 11, -0.98, 0], [32, 17, 0.98, 0], [26, 19, 0, -0.98]];
  const plans = planSpots.map(([c, r, dx, dz]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshStandardMaterial({ map: T.labelTex('FLUCHTPLAN', '#1a6a2a', '#fff', 256, 180), roughness: 0.4 })); m.position.set(cx(c) + dx, 1.5, cz(r) + dz); m.rotation.y = Math.atan2(-dx, -dz); group.add(m); return { x: m.position.x, y: 1.5, z: m.position.z, c, r }; });
  // Dampf, Tropfen, Funken
  steam.push({ x: cx(17) + 0.7, y: 2.6, z: cz(5), dir: [0, -0.3, 0.4] }, { x: cx(32), y: 2.7, z: cz(11) + 0.6, dir: [-0.5, -0.2, 0] }, { x: cx(9), y: 2.7, z: cz(17), dir: [0.5, -0.2, 0] }, { x: cx(36) , y: 4.5, z: cz(7), dir: [0, -0.3, 0.3] }, { x: cx(34), y: 2.2, z: cz(24), dir: [0, -0.3, 0.4] });
  drips.push({ x: cx(11), z: cz(5) }, { x: cx(22), z: cz(19) }, { x: cx(32), z: cz(9) }, { x: cx(9), z: cz(15) }, { x: cx(35), z: cz(24) }, { x: cx(36), z: cz(16) });
  for (const d of drips) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 0.6, 18), M.puddle); p.scale.y = 0.6; p.rotation.x = -Math.PI / 2; p.position.set(d.x + 0.2, 0.005, d.z); group.add(p); }
  // Spuren: Blut, Kratzer, Fußabdrücke
  const decal = (mat, x, y, z, s, ry, floor) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mat); if (floor) { m.rotation.x = -Math.PI / 2; m.rotation.z = ry; } else m.rotation.y = ry; m.position.set(x, y, z); m.receiveShadow = true; group.add(m); };
  for (const [x, z, s] of [[cx(11), cz(2.5), 1.2], [cx(13), cz(5), 0.8], [cx(9), cz(12), 0.7], [cx(20), cz(19), 1.0], [cx(25), cz(22), 0.9], [cx(4), cz(15), 0.8], [cx(32), cz(6), 0.7]]) decal(M.blood, x, 0.006, z, s, Math.random() * 6, true);
  for (let i = 0; i < 16; i++) decal(M.foot, cx(13) + i * 0.6, 0.007, cz(5) + (i % 2 ? 0.2 : -0.2), 0.3, -Math.PI / 2, true);
  for (let i = 0; i < 12; i++) decal(M.foot, cx(9) + (i % 2 ? 0.2 : -0.2), 0.007, cz(6) + i * 0.6, 0.3, Math.PI, true);
  decal(M.scratch, cx(14), 1.3, cz(5) - 0.98, 1.0, 0); decal(M.scratch, cx(26) + 0.4, 1.4, cz(5) - 0.98, 1.0, 0); decal(M.scratch, cx(32) + 0.98, 1.2, cz(14), 1.0, -Math.PI / 2); decal(M.scratch, cx(17) + 0.4, 1.0, cz(19) + 0.98, 0.9, Math.PI);
  // herunterhängende Kabel
  for (const [c, r] of [[15, 5], [9, 10], [28, 19], [32, 7]]) { const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 4), M.rubber); cab.position.set(cx(c) + 0.3, 2.4, cz(r)); cab.rotation.z = 0.2; group.add(cab); sparks.push({ x: cx(c) + 0.4, y: 1.8, z: cz(r) }); }

  mg.build(group);
  group.traverse(o => { if (o.isMesh && o.geometry === BOX) { o.castShadow = o.castShadow || false; } });
  return { mistMat, group, solids, solidAt, items, fixtures, emerg, lockers, doors, screens, steam, drips, sparks, tanks, blinks, plans, gen: { lever, fuseIn, led: genLed, slot: new THREE.Vector3(cx(36.5) - 2.2, 1.25, cz(8.5) - 0.3), x: cx(36.5) - 2.3, z: cz(8.5) }, secDesk, vendLight };
}
