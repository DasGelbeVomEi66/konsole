// Saurier als durchgehendes, mit Knochen verformtes Modell (SkinnedMesh): Körper, Hals und Schwanz sind eine
// einzige glatte Haut, Kopf und Unterkiefer eigene Teile, Beine mit Zwei-Knochen-IK und Schrittzyklus.
import * as THREE from '../../lib/three.module.min.js';
import { skinTextures } from './tex.js';

const V = THREE.Vector3, TAU = Math.PI * 2, clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;

// ---------- Bauplan ----------
// Körper-Stützstellen: [z, y, halbe Breite, Höhe oben, Höhe unten]
const BODY = {
  raptor: [[-2.1, 0.82, .012, .014, .014], [-1.7, 0.86, .035, .04, .04], [-1.25, 0.9, .068, .08, .075], [-0.85, 0.94, .11, .13, .12], [-0.5, 0.96, .16, .19, .19], [-0.2, 0.97, .2, .24, .26], [0.1, 0.97, .23, .26, .34], [0.36, 1.0, .21, .24, .32], [0.56, 1.08, .15, .18, .19], [0.7, 1.2, .1, .115, .115], [0.8, 1.33, .085, .095, .095], [0.88, 1.43, .078, .088, .085], [0.96, 1.49, .08, .09, .08]],
  rex: [[-2.05, 1.05, .015, .02, .02], [-1.55, 1.1, .06, .07, .07], [-1.05, 1.15, .12, .14, .14], [-0.58, 1.2, .2, .24, .24], [-0.2, 1.22, .27, .32, .36], [0.15, 1.2, .3, .34, .46], [0.45, 1.25, .27, .3, .4], [0.7, 1.36, .2, .24, .27], [0.84, 1.5, .175, .2, .2], [0.95, 1.6, .16, .18, .165]],
};
// Kopf (relativ zum Hinterhaupt) und Unterkiefer (relativ zum Kiefergelenk): [z, y, halbe Breite, oben, unten]
const HEAD = {
  raptor: [[-0.07, 0, .072, .072, .062], [0.03, 0.002, .092, .092, .062], [0.13, -0.004, .085, .088, .045], [0.24, -0.016, .068, .07, .037], [0.36, -0.027, .052, .057, .031], [0.47, -0.034, .037, .045, .025], [0.55, -0.038, .017, .025, .015]],
  rex: [[-0.08, 0, .15, .17, .12], [0.04, 0.005, .17, .2, .13], [0.18, -0.01, .155, .19, .11], [0.33, -0.03, .12, .155, .09], [0.48, -0.045, .095, .125, .075], [0.6, -0.055, .075, .1, .06], [0.68, -0.06, .05, .07, .045]],
};
const JAW = {
  raptor: [[-0.02, 0, .07, .015, .038], [0.11, 0.002, .065, .015, .045], [0.24, 0.006, .052, .012, .037], [0.37, 0.01, .039, .011, .026], [0.47, 0.012, .02, .009, .015]],
  rex: [[-0.03, 0, .14, .03, .1], [0.15, 0, .13, .03, .13], [0.35, .01, .105, .025, .11], [0.52, .015, .08, .02, .08], [0.64, .02, .05, .015, .05]],
};
const CFG = {
  raptor: { hipX: .15, hipZ: -0.16, L: [.4, .42, .25], legR: [.15, .07, .036], toe: .17, arm: .32, scale: 1, back: '#3f3a2c', belly: '#a69676', stripe: true, neckBones: 4, tailBones: 9, teeth: 12, toothS: .02, stride: 1.3 },
  rex: { hipX: .22, hipZ: -0.15, L: [.54, .54, .3], legR: [.26, .13, .07], toe: .22, arm: .14, scale: 2.4, back: '#37322a', belly: '#8a7d66', stripe: false, neckBones: 2, tailBones: 8, teeth: 10, toothS: .06, stride: 1.6 },
};

// Catmull-Rom über Stützstellen
function sampleKeys(keys, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1) * (keys.length - 1), k = Math.min(keys.length - 2, Math.floor(f)), t = f - k;
    const p0 = keys[Math.max(0, k - 1)], p1 = keys[k], p2 = keys[k + 1], p3 = keys[Math.min(keys.length - 1, k + 2)];
    const r = [];
    for (let j = 0; j < p1.length; j++) { const a = p0[j], b = p1[j], c = p2[j], d = p3[j]; r.push(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)); }
    out.push(r);
  }
  return out;
}

// Rohrkörper aus Querschnitten. st: [{p, w, ht, hb, ridge, s}], weightsFn(s, p) -> [[boneIdx, w], ...]
function loft(st, M, ref, weightsFn, colorFn, uScale, caps = [true, true]) {
  const N = st.length, pos = [], uv = [], col = [], si = [], sw = [], idx = [];
  const tan = st.map((s, i) => { const a = st[Math.max(0, i - 1)].p, b = st[Math.min(N - 1, i + 1)].p; return b.clone().sub(a).normalize(); });
  let len = 0; const arc = [0]; for (let i = 1; i < N; i++) { len += st[i].p.distanceTo(st[i - 1].p); arc.push(len); }
  const tmp = new V(), side = new V(), up = new V(), c = new THREE.Color();
  const pushW = wts => { const w4 = [0, 0, 0, 0], i4 = [0, 0, 0, 0]; wts.slice(0, 4).forEach(([b, w], j) => { i4[j] = b; w4[j] = w; }); si.push(...i4); sw.push(...w4); };
  for (let i = 0; i < N; i++) {
    const S = st[i], t = tan[i];
    side.crossVectors(ref, t).normalize(); up.crossVectors(t, side).normalize();
    const wts = weightsFn(S.s, S.p);
    for (let k = 0; k <= M; k++) {
      const th = (k % M) / M * TAU, cs = Math.cos(th), sn = Math.sin(th);
      const x = S.w * Math.sign(cs) * Math.pow(Math.abs(cs), 0.85);
      let y = (sn > 0 ? S.ht : S.hb) * sn;
      if (S.ridge) y += S.ridge * Math.pow(Math.max(0, sn), 24);
      tmp.copy(S.p).addScaledVector(side, x).addScaledVector(up, y);
      pos.push(tmp.x, tmp.y, tmp.z); uv.push(arc[i] * uScale, k / M);
      colorFn(c, sn, S.s, cs); col.push(c.r, c.g, c.b); pushW(wts);
    }
  }
  const R = M + 1;
  for (let i = 0; i < N - 1; i++) for (let k = 0; k < M; k++) { const a = i * R + k, b = a + 1, cc = a + R, d = cc + 1; idx.push(a, b, cc, b, d, cc); }
  const cap = (i, flip) => {
    const ci = pos.length / 3, S = st[i]; pos.push(S.p.x, S.p.y, S.p.z); uv.push(arc[i] * uScale, 0.5); colorFn(c, 0, S.s, 1); col.push(c.r, c.g, c.b); pushW(weightsFn(S.s, S.p));
    for (let k = 0; k < M; k++) { const a = i * R + k, b = a + 1; if (flip) idx.push(ci, b, a); else idx.push(ci, a, b); }
  };
  if (caps[0]) cap(0, true); if (caps[1]) cap(N - 1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx); g.computeVertexNormals();
  const nA = g.attributes.normal, pA = g.attributes.position, mi = Math.floor(N / 2), mid = mi * R + Math.floor(M / 4);
  const nv = new V(nA.getX(mid), nA.getY(mid), nA.getZ(mid)), pv = new V(pA.getX(mid), pA.getY(mid), pA.getZ(mid)).sub(st[mi].p);
  if (nv.dot(pv) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
  for (let i = 0; i < N; i++) { const a = i * R, b = a + M; const nx = nA.getX(a) + nA.getX(b), ny = nA.getY(a) + nA.getY(b), nz = nA.getZ(a) + nA.getZ(b), l = Math.hypot(nx, ny, nz) || 1; nA.setXYZ(a, nx / l, ny / l, nz / l); nA.setXYZ(b, nx / l, ny / l, nz / l); }
  return g;
}
function merge(geos) {
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const out = new THREE.BufferGeometry(), idx = [];
  for (const a of ['position', 'normal', 'uv', 'color', 'skinIndex', 'skinWeight']) {
    const s = geos[0].attributes[a].itemSize, arr = a === 'skinIndex' ? new Uint16Array(n * s) : new Float32Array(n * s); let o = 0;
    for (const g of geos) { arr.set(g.attributes[a].array, o * s); o += g.attributes.position.count; }
    out.setAttribute(a, a === 'skinIndex' ? new THREE.Uint16BufferAttribute(arr, s) : new THREE.BufferAttribute(arr, s));
  }
  let o = 0; for (const g of geos) { for (const i of g.index.array) idx.push(i + o); o += g.attributes.position.count; }
  out.setIndex(idx); return out;
}

const matCache = {};
function skinMaterial(kind) {
  if (matCache[kind]) return matCache[kind];
  const t = skinTextures([200, 196, 186], kind === 'raptor');
  t.map.repeat.set(1, 1); t.normalMap.repeat.set(1, 1);
  return (matCache[kind] = new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.1, 1.1), vertexColors: true, roughness: 0.58, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.55, sheen: 0.3, sheenRoughness: 0.8, sheenColor: new THREE.Color('#6a6050') }));
}
const toothMat = new THREE.MeshStandardMaterial({ color: '#b8ab88', roughness: 0.35 });
const clawMat = new THREE.MeshStandardMaterial({ color: '#16120e', roughness: 0.25, metalness: 0.1 });
const gumMat = new THREE.MeshStandardMaterial({ color: '#4a1414', roughness: 0.35 });

export function makeDino(kind = 'raptor') {
  const C = CFG[kind], rex = kind === 'rex';
  const root = new THREE.Group();
  const mat = skinMaterial(kind);
  const back = new THREE.Color(C.back), belly = new THREE.Color(C.belly), mouth = new THREE.Color('#5a1a18');
  const bodyColor = (c, sn, s) => { const d = clamp(sn * 0.5 + 0.5, 0, 1); c.copy(belly).lerp(back, Math.pow(d, 0.7)); if (C.stripe && sn > 0.1) { const sv = Math.max(0, Math.sin(s * 34 + Math.sin(s * 9) * 1.5)); c.multiplyScalar(1 - sv * 0.35 * sn); } };

  // ---------- Knochen ----------
  const bones = [], B = (name, parent, pos) => { const b = new THREE.Bone(); b.name = name; b.position.copy(pos); (parent || root).add(b); bones.push(b); return b; };
  const bodyKeys = BODY[kind], bodyS = sampleKeys(bodyKeys, 90);
  const pointAtZ = z => { let best = bodyS[0]; for (const s of bodyS) if (Math.abs(s[0] - z) < Math.abs(best[0] - z)) best = s; return new V(0, best[1], best[0]); };
  const pelvisP = pointAtZ(C.hipZ);
  const pelvis = B('pelvis', null, pelvisP);
  const z0 = bodyKeys[0][0], zEnd = bodyKeys[bodyKeys.length - 1][0];
  const spineZ = [0.12, 0.42, 0.62], neckZ = []; for (let i = 0; i < C.neckBones; i++) neckZ.push(lerp(0.7, zEnd - 0.04, i / C.neckBones));
  const chain = [{ b: pelvis, p: pelvisP }];
  let par = pelvis, parP = pelvisP;
  for (const z of [...spineZ, ...neckZ]) { const p = pointAtZ(z); const b = B('sp', par, p.clone().sub(parP)); chain.push({ b, p }); par = b; parP = p; }
  const headP = pointAtZ(zEnd); const head = B('head', par, headP.clone().sub(parP)); chain.push({ b: head, p: headP });
  const spineBones = chain.slice(1, 1 + spineZ.length).map(c => c.b), neckBones = chain.slice(1 + spineZ.length, chain.length - 1).map(c => c.b);
  const tail = [], tailChain = []; par = pelvis; parP = pelvisP;
  for (let i = 1; i <= C.tailBones; i++) { const z = lerp(C.hipZ, z0 + 0.05, i / C.tailBones); const p = pointAtZ(z); const b = B('tail', par, p.clone().sub(parP)); tail.push(b); tailChain.push({ b, p }); par = b; parP = p; }
  const bodyChain = [...tailChain.slice().reverse(), ...chain];
  const bodyWeights = (s, p) => {
    const z = p.z; if (z <= bodyChain[0].p.z) return [[bones.indexOf(bodyChain[0].b), 1]];
    let i = 0; while (i < bodyChain.length - 1 && bodyChain[i + 1].p.z < z) i++;
    if (i >= bodyChain.length - 1) return [[bones.indexOf(bodyChain[bodyChain.length - 1].b), 1]];
    const a = bodyChain[i], b = bodyChain[i + 1]; let t = clamp((z - a.p.z) / (b.p.z - a.p.z || 1), 0, 1); t = t * t * (3 - 2 * t);
    return [[bones.indexOf(a.b), 1 - t], [bones.indexOf(b.b), t]];
  };
  const bodySt = bodyS.map(s => ({ p: new V(0, s[1], s[0]), w: s[2], ht: s[3], hb: s[4], s: (s[0] - z0) / (zEnd - z0), ridge: rex ? 0 : 0.012 * Math.max(0, 1 - Math.abs(s[0] - 0.1) / 1.2) }));
  const geos = [loft(bodySt, 28, new V(0, 1, 0), bodyWeights, bodyColor, 3, [true, false])];

  // Kopf und Kiefer
  const hk = HEAD[kind], jk = JAW[kind], hlen = hk[hk.length - 1][0];
  const headIdx = bones.indexOf(head);
  const jawHinge = new V(0, hk[1][1] - hk[1][4] * 0.9, 0.02 + (rex ? 0.02 : 0));
  const jaw = B('jaw', head, jawHinge), jawIdx = bones.indexOf(jaw);
  const headSt = sampleKeys(hk, 34).map(s => ({ p: new V(0, s[1], s[0]).add(headP), w: s[2], ht: s[3], hb: s[4], s: s[0] / hlen }));
  const headColor = (c, sn, s, cs) => { if (sn < -0.55) c.copy(mouth); else { bodyColor(c, sn, 1, cs); if (sn > 0.4 && s > 0.15 && s < 0.35) c.multiplyScalar(0.8); } };
  geos.push(loft(headSt, 24, new V(0, 1, 0), () => [[headIdx, 1]], headColor, 3));
  const jawSt = sampleKeys(jk, 26).map(s => ({ p: new V(0, s[1], s[0]).add(headP).add(jawHinge), w: s[2], ht: s[3], hb: s[4], s: s[0] / hlen }));
  const jawColor = (c, sn) => { if (sn > 0.5) c.copy(mouth); else c.copy(belly).lerp(back, clamp(sn * 0.5 + 0.6, 0, 1) * 0.6); };
  geos.push(loft(jawSt, 20, new V(0, 1, 0), () => [[jawIdx, 1]], jawColor, 3));

  // Beine: gerade nach unten gebaut, die Pose kommt aus der IK
  const legs = [];
  const legColor = (c, sn, s, cs) => { c.copy(belly).lerp(back, clamp(0.55 + cs * 0.25 + (1 - s) * 0.2, 0, 1)); };
  for (const sx of [-1, 1]) {
    const hipP = new V(sx * C.hipX, pelvisP.y - 0.06, pelvisP.z);
    const hip = B('hip', pelvis, hipP.clone().sub(pelvisP));
    const knee = B('knee', hip, new V(0, -C.L[0], 0));
    const ankle = B('ankle', knee, new V(0, -C.L[1], 0));
    const toe = B('toe', ankle, new V(0, -C.L[2], 0));
    const iH = bones.indexOf(hip), iK = bones.indexOf(knee), iA = bones.indexOf(ankle), iT = bones.indexOf(toe);
    const tot = C.L[0] + C.L[1] + C.L[2];
    const prof = [[-0.16, C.legR[0] * 0.9, 0.0], [-0.06, C.legR[0] * 1.3, 0.03], [0.04, C.legR[0] * 1.4, 0.04], [C.L[0] * 0.35, C.legR[0] * 1.15, 0.035], [C.L[0] * 0.75, C.legR[0] * 0.7, 0.01], [C.L[0], C.legR[1] * 1.1, 0], [C.L[0] + C.L[1] * 0.25, C.legR[1] * 1.15, -0.01], [C.L[0] + C.L[1] * 0.8, C.legR[1] * 0.6, 0], [C.L[0] + C.L[1], C.legR[2] * 1.2, 0], [C.L[0] + C.L[1] + C.L[2] * 0.5, C.legR[2], 0], [tot, C.legR[2] * 0.9, 0.005]];
    const ls = sampleKeys(prof, 30).map(s => ({ p: hipP.clone().add(new V(0, -s[0], s[2])), w: s[1] * 0.85, ht: s[1] * 1.05, hb: s[1] * 0.95, s: s[0] / tot }));
    const legW = (s, p) => { const d = hipP.y - p.y, b = 0.05; if (d < C.L[0] - b) return [[iH, 1]]; if (d < C.L[0] + b) { const t = (d - C.L[0] + b) / (2 * b); return [[iH, 1 - t], [iK, t]]; } if (d < C.L[0] + C.L[1] - b * 0.6) return [[iK, 1]]; if (d < C.L[0] + C.L[1] + b * 0.6) { const t = (d - C.L[0] - C.L[1] + b * 0.6) / (1.2 * b); return [[iK, 1 - t], [iA, t]]; } return [[iA, 1]]; };
    geos.push(loft(ls, 16, new V(0, 0, 1), legW, legColor, 3));
    const toeBase = hipP.clone().add(new V(0, -tot, 0));
    for (const [a, lenK] of [[-0.42, 0.75], [0, 1], [0.42, 0.8]]) {
      const L = C.toe * lenK, dir = new V(Math.sin(a), 0, Math.cos(a));
      const ts = [0, 0.5, 1].map(f => ({ p: toeBase.clone().addScaledVector(dir, f * L).add(new V(0, f === 0 ? 0 : -0.01, 0)), w: C.legR[2] * (0.55 - f * 0.25), ht: C.legR[2] * (0.5 - f * 0.25), hb: C.legR[2] * (0.35 - f * 0.15), s: f }));
      geos.push(loft(ts, 10, new V(0, 1, 0), () => [[iT, 1]], legColor, 3));
      const cl = new THREE.Mesh(new THREE.ConeGeometry(C.legR[2] * 0.22, C.legR[2] * 0.9, 6), clawMat); cl.rotation.x = Math.PI / 2 + 0.5; cl.position.copy(dir.clone().multiplyScalar(L + C.legR[2] * 0.2)).add(new V(0, -0.012, 0)); toe.add(cl);
    }
    if (!rex) { const sk = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 5, 12, Math.PI * 0.85), clawMat); sk.position.set(sx * 0.015, 0.035, 0.03); sk.rotation.y = Math.PI / 2; sk.rotation.z = -0.6; toe.add(sk); }
    legs.push({ hip, knee, ankle, toe, sx, ph: sx > 0 ? 0 : 0.5 });
  }
  // Arme (angelegte Haltung)
  const arms = [];
  for (const sx of [-1, 1]) {
    const shP = pointAtZ(0.5).add(new V(sx * (rex ? 0.24 : 0.13), -(rex ? 0.18 : 0.1), 0));
    const sh = B('sh', spineBones[1], shP.clone().sub(chain[2].p)), iS = bones.indexOf(sh);
    const a = C.arm, prof = [[0, a * 0.13], [a * 0.45, a * 0.09], [a * 0.5, a * 0.07], [a, a * 0.05]];
    const dir = new V(0, -0.6, 0.8).normalize();
    const as = sampleKeys(prof, 10).map(s => ({ p: shP.clone().addScaledVector(dir, s[0]), w: s[1], ht: s[1], hb: s[1], s: s[0] / a }));
    geos.push(loft(as, 10, new V(1, 0, 0), () => [[iS, 1]], (c, sn) => c.copy(belly).lerp(back, 0.5 + sn * 0.3), 3));
    for (let k = 0; k < (rex ? 2 : 3); k++) { const cl = new THREE.Mesh(new THREE.ConeGeometry(a * 0.035, a * 0.3, 5), clawMat); cl.position.copy(dir.clone().multiplyScalar(a * 1.08)).add(new V((k - 1) * a * 0.05, -a * 0.04, 0)); cl.rotation.x = 2.3; sh.add(cl); }
    arms.push(sh);
  }

  // ---------- Haut binden ----------
  const mesh = new THREE.SkinnedMesh(merge(geos), mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  root.add(mesh); root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));

  // Zähne, Augen, Nasenlöcher
  const toothG = new THREE.ConeGeometry(1, 1, 5); toothG.translate(0, -0.5, 0);
  const addTeeth = (keys, parent, down) => {
    const ks = sampleKeys(keys, 40);
    for (const sx of [-1, 1]) for (let i = 0; i < C.teeth; i++) {
      const f = 0.18 + i / C.teeth * 0.78, s = ks[Math.floor(f * (ks.length - 1))];
      const t = new THREE.Mesh(toothG, toothMat), sz = C.toothS * (0.6 + Math.random() * 0.6) * (1.15 - f * 0.5);
      t.scale.set(sz * 0.28, sz, sz * 0.32);
      if (down) t.position.set(sx * s[2] * 0.86, s[1] - s[4] * 0.85, s[0]); else { t.position.set(sx * s[2] * 0.82, s[1] + s[3] * 0.6, s[0]); t.rotation.x = Math.PI; }
      t.rotation.x += down ? 0.25 : -0.25; t.rotation.z = (Math.random() - 0.5) * 0.25; parent.add(t);
    }
  };
  addTeeth(hk, head, true); addTeeth(jk, jaw, false);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), gumMat); tongue.scale.set(jk[1][2] * 0.6, jk[1][4] * 0.3, hlen * 0.34); tongue.position.set(0, 0.004, hlen * 0.36); jaw.add(tongue);
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#0a0805', roughness: 0.05, metalness: 0.3, emissive: new THREE.Color('#e8cf58'), emissiveIntensity: 0 });
  const eyes = [], eyeK = hk[2], eyeR = rex ? 0.032 : 0.022;
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 14, 10), eyeMat); e.position.set(sx * eyeK[2] * 0.86, eyeK[1] + eyeK[3] * 0.42, eyeK[0] - 0.01); head.add(e); eyes.push(e);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, Math.PI * 0.55), mat); lid.scale.set(eyeR * 1.2, eyeR * 1.05, eyeR * 1.3); lid.position.copy(e.position); lid.rotation.z = -sx * 0.25; lid.rotation.x = -0.15; head.add(lid);
    const brow = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat); brow.scale.set(eyeK[2] * 0.32, eyeK[3] * 0.18, eyeK[2] * 0.85); brow.position.set(sx * eyeK[2] * 0.68, eyeK[1] + eyeK[3] * 0.72, eyeK[0] + 0.005); brow.rotation.z = sx * 0.45; head.add(brow);
    const nk = hk[hk.length - 2], nos = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#0a0606' })); nos.scale.set(eyeR * 0.3, eyeR * 0.35, eyeR * 0.7); nos.position.set(sx * nk[2] * 0.6, nk[1] + nk[3] * 0.45, nk[0] + 0.02); head.add(nos);
  }
  if (!rex) { // Federkiele auf Hals und Rücken
    const qg = new THREE.ConeGeometry(0.006, 0.09, 4); qg.translate(0, 0.045, 0); const qm = new THREE.MeshStandardMaterial({ color: '#1e1a12', roughness: 0.9 });
    for (const [b, n, h] of [[neckBones[0], 4, 0.085], [neckBones[1], 4, 0.075], [spineBones[2], 6, 0.14], [spineBones[1], 6, 0.2]]) for (let i = 0; i < n; i++) { const q = new THREE.Mesh(qg, qm); q.position.set((Math.random() - 0.5) * 0.03, h, (i - n / 2) * 0.035); q.rotation.x = -1.0 - Math.random() * 0.4; q.scale.y = 0.6 + Math.random() * 0.9; b.add(q); }
  }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  if (C.scale !== 1) root.scale.setScalar(C.scale);

  // ---------- Animation ----------
  const st = { t: Math.random() * 10, twT: 0, tw: new V(), twTo: new V(), yaw: 0, pitch: 0, cyc: 0 };
  const inv = new THREE.Matrix4(), tmp = new V();
  const L1 = C.L[0], L2 = C.L[1], L3 = C.L[2];
  function legIK(leg, footZ, lift, crouch) {
    const phi = 0.42 + crouch * 0.25 - lift * 1.2;                   // Neigung des Mittelfußes (vorn positiv)
    const hipY = leg.hip.position.y + pelvis.position.y, hipZ = leg.hip.position.z + pelvis.position.z;
    const footY = lift * 0.2;
    const ankY = footY + L3 * Math.cos(phi), ankZ = footZ - L3 * Math.sin(phi) - hipZ;
    let dy = hipY - ankY, dz = ankZ, d = Math.hypot(dy, dz); const maxD = (L1 + L2) * 0.995; if (d > maxD) { dy *= maxD / d; dz *= maxD / d; d = maxD; }
    const a = Math.atan2(dz, dy);
    const cA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), cK = clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);
    const thigh = a + Math.acos(cA), shin = thigh - (Math.PI - Math.acos(cK));
    leg.hip.rotation.x = -thigh; leg.knee.rotation.x = -(shin - thigh); leg.ankle.rotation.x = -(phi - shin); leg.toe.rotation.x = phi - lift * 0.5;
  }
  const D = {
    root, head, jaw, eyes, eyeMat, rex, mesh,
    speed: 0, jawOpen: 0, crouch: 0, lookAt: null, agitation: 0, rear: 0, lunge: 0,
    update(dt) {
      st.t += dt;
      const sp = D.speed / C.scale, run = clamp(D.speed / (rex ? 4 : 5), 0, 1);
      const T = clamp((rex ? 1.5 : 1.05) - D.speed * (rex ? 0.14 : 0.11), rex ? 0.7 : 0.42, rex ? 1.5 : 1.05);
      const stride = Math.min(sp * T * 0.6, C.stride * 0.6);
      if (D.speed > 0.05) st.cyc = (st.cyc + dt / T) % 1;
      const moving = clamp(D.speed / 0.4, 0, 1);
      const bob = moving * Math.abs(Math.cos(st.cyc * TAU)) * 0.03;
      pelvis.position.y = pelvisP.y * (1 - D.crouch * 0.2) - bob - run * 0.04 + D.rear * 0.04;
      pelvis.rotation.z = Math.sin(st.cyc * TAU) * 0.05 * moving;
      pelvis.rotation.y = Math.sin(st.cyc * TAU) * 0.06 * moving;
      pelvis.rotation.x = -D.rear * 0.35 + D.crouch * 0.08 + run * 0.06;
      const breath = Math.sin(st.t * (1.8 + D.agitation * 2.5)) * 0.015;
      spineBones.forEach(b => { b.rotation.x = breath - D.rear * 0.15 + D.crouch * 0.03; b.rotation.y = -Math.sin(st.cyc * TAU) * 0.03 * moving; });
      tail.forEach((b, i) => { b.rotation.y = Math.sin(st.t * 1.1 - i * 0.45) * 0.035 * (1 + D.agitation) + Math.sin(st.cyc * TAU - i * 0.35) * 0.05 * moving; b.rotation.x = (i === 0 ? -0.04 : 0.01) + D.rear * 0.06 - run * 0.01 + Math.sin(st.t * 0.9 - i * 0.3) * 0.01; });
      st.twT -= dt;
      if (st.twT <= 0) { st.twT = 0.35 + Math.random() * (2.2 - D.agitation * 1.4); st.twTo.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.35); }
      if (D.rear > 0.01 || D.jawOpen > 0.8) st.twTo.set(0, 0, 0);
      st.tw.lerp(st.twTo, Math.min(1, dt * 20));
      let yaw = 0, pitch = 0;
      if (D.lookAt) {
        root.updateMatrixWorld(); inv.copy(neckBones[0].matrixWorld).invert(); tmp.copy(D.lookAt).applyMatrix4(inv);
        yaw = clamp(Math.atan2(tmp.x, tmp.z), -1.3, 1.3); pitch = clamp(-Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)), -0.9, 0.8);
      }
      st.yaw += (yaw - st.yaw) * Math.min(1, dt * 6); st.pitch += (pitch - st.pitch) * Math.min(1, dt * 6);
      const n = neckBones.length;
      neckBones.forEach((b, i) => { b.rotation.y = st.yaw / (n + 1); b.rotation.x = st.pitch / (n + 1) + (i === 0 ? D.crouch * 0.25 + run * 0.2 : 0) - D.rear * 0.05; });
      head.rotation.y = st.yaw / (n + 1) + st.tw.x; head.rotation.x = st.pitch / (n + 1) + st.tw.y + D.jawOpen * 0.12 + D.crouch * 0.1; head.rotation.z = st.tw.z;
      jaw.rotation.x = D.jawOpen * (rex ? 0.62 : 0.72) + Math.max(0, Math.sin(st.t * 0.6)) * 0.03;
      arms.forEach((a, i) => { a.rotation.x = 0.2 + Math.sin(st.t * 1.2 + i) * 0.05 + D.agitation * 0.25; a.rotation.z = (i ? -1 : 1) * 0.15; });
      for (const leg of legs) {
        const ph = (st.cyc + leg.ph) % 1; let fz, lift = 0;
        if (ph < 0.6) fz = lerp(stride / 2, -stride / 2, ph / 0.6);
        else { const q = (ph - 0.6) / 0.4; fz = lerp(-stride / 2, stride / 2, q * q * (3 - 2 * q)); lift = Math.sin(q * Math.PI) * moving; }
        legIK(leg, fz * moving + 0.06, lift, D.crouch);
      }
    },
    eyeshine(camPos, camDir, lampOn, ambient = 0) {
      eyes[0].getWorldPosition(tmp);
      const toEye = tmp.sub(camPos), dist = toEye.length(); toEye.divideScalar(dist);
      const inBeam = Math.max(0, camDir.dot(toEye)), beam = lampOn ? Math.pow(Math.max(0, (inBeam - 0.88) / 0.12), 1.5) : 0;
      const hd = new V(); head.getWorldDirection(hd); const facing = Math.max(0, -hd.dot(toEye));
      eyeMat.emissiveIntensity = (beam * 9 + ambient) * Math.pow(facing, 2) * Math.min(1, 14 / (dist + 0.5));
    },
  };
  D.update(0);
  return D;
}
