// Prozedurale Dinosaurier aus Einzelteilen, mit Gang, Atmung, Kopfzucken und leuchtenden Augen im Lampenlicht.
import * as THREE from '../../lib/three.module.min.js';
import { skinTextures } from './tex.js';

const TAU = Math.PI * 2;
const V = THREE.Vector3;

let skinCache = {};
function skinMat(kind) {
  if (!skinCache[kind]) {
    const t = kind === 'rex' ? skinTextures([46, 40, 32], false) : skinTextures([58, 52, 38], true);
    t.map.repeat.set(3, 3); t.normalMap.repeat.set(3, 3);
    skinCache[kind] = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.62, metalness: 0.0, color: 0xffffff });
  }
  return skinCache[kind];
}
const toothMat = new THREE.MeshStandardMaterial({ color: '#8f8466', roughness: 0.45 });
const clawMat = new THREE.MeshStandardMaterial({ color: '#1a1612', roughness: 0.3 });
const mouthMat = new THREE.MeshStandardMaterial({ color: '#3a0c0c', roughness: 0.4 });
const quillMat = new THREE.MeshStandardMaterial({ color: '#1e1a14', roughness: 0.8 });

// Gedrehter Körperteil entlang +z, Profil [z, r]
function lathe(profile, sx = 1, sy = 1, mat, seg = 16) {
  const pts = profile.map(([z, r]) => new THREE.Vector2(Math.max(0.001, r), z));
  const g = new THREE.LatheGeometry(pts, seg); g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.scale.set(sx, sy, 1); m.castShadow = true; m.receiveShadow = true; return m;
}
// Schädel aus verformter Kugel
function skullGeo(len, w, h, jaw) {
  const g = new THREE.SphereGeometry(1, 24, 16), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (z + 1) / 2; // 0 hinten, 1 Schnauze
    const taper = 1 - 0.55 * Math.pow(t, 1.3);
    x *= w * taper * (jaw ? 0.85 : 1);
    if (jaw) { y = y > 0 ? y * h * 0.15 : y * h * 0.45 * (1 - t * 0.5); }
    else { y = y < 0 ? y * h * 0.25 : y * h * (0.85 - t * 0.35); if (t > 0.35 && t < 0.6 && y > 0) y *= 1.08; }
    z = t * len;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals(); return g;
}
function teeth(parent, len, w, y, down, n, size) {
  const g = new THREE.ConeGeometry(size * 0.35, size, 5); if (!down) g.rotateX(Math.PI);
  for (let s of [-1, 1]) for (let i = 0; i < n; i++) {
    const t = 0.25 + i / n * 0.72, taper = 1 - 0.55 * Math.pow(t, 1.3);
    const m = new THREE.Mesh(g, toothMat);
    m.position.set(s * w * taper * 0.86, y + (down ? -size * 0.45 : size * 0.45), t * len);
    m.scale.setScalar(0.5 + Math.random() * 0.7 * (1 - t * 0.5)); m.rotation.z = (Math.random() - 0.5) * 0.4; m.rotation.x += (Math.random() - 0.5) * 0.3; parent.add(m);
  }
}

export function makeDino(kind = 'raptor') {
  const rex = kind === 'rex';
  const P = rex
    ? { hip: 1.15, tLen: 1.05, tR: 0.44, neck: [0.16, 0.14], neckR: 0.26, head: [0.7, 0.2, 0.28], tail: 7, tailLen: 0.34, tailR: 0.32, thigh: 0.6, shin: 0.55, meta: 0.3, legR: 0.18, arm: 0.12, quills: false }
    : { hip: 0.92, tLen: 0.8, tR: 0.27, neck: [0.17, 0.15, 0.13], neckR: 0.115, head: [0.6, 0.095, 0.16], tail: 9, tailLen: 0.24, tailR: 0.17, thigh: 0.42, shin: 0.42, meta: 0.27, legR: 0.1, arm: 0.3, quills: true };
  const mat = skinMat(kind);
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = P.hip; root.add(hips);

  // Rumpf
  const torso = lathe([[-0.35, 0.02], [-0.3, P.tR * 0.7], [-0.1, P.tR * 0.95], [0.2, P.tR], [0.5, P.tR * 0.85], [P.tLen, P.tR * 0.55], [P.tLen + 0.08, P.tR * 0.2]], 0.78, 1, mat);
  const torsoG = new THREE.Group(); torsoG.add(torso); hips.add(torsoG); torsoG.rotation.x = -0.12;
  // Rücken-Federkiele
  if (P.quills) {
    const qg = new THREE.ConeGeometry(0.012, 0.16, 4);
    for (let i = 0; i < 26; i++) {
      const z = -0.3 + i * 0.045, q = new THREE.Mesh(qg, quillMat);
      q.position.set((Math.random() - 0.5) * 0.04, P.tR * (0.82 + Math.sin(i * 0.3) * 0.05), z); q.rotation.x = -0.9 - Math.random() * 0.3; q.rotation.z = (Math.random() - 0.5) * 0.3;
      q.scale.y = 0.6 + Math.random() * 0.8; torsoG.add(q);
    }
  }

  // Hals und Kopf
  const neckRoot = new THREE.Group(); neckRoot.position.set(0, P.tR * 0.35, P.tLen - 0.02); torsoG.add(neckRoot);
  const neck = []; let par = neckRoot;
  P.neck.forEach((len, i) => {
    const g = new THREE.Group(); if (i) g.position.z = P.neck[i - 1]; par.add(g);
    const r0 = P.neckR * (1.25 - i * 0.12), r1 = P.neckR * (1.12 - i * 0.12);
    g.add(lathe([[-0.04, r0 * 0.9], [0, r0], [len, r1], [len + 0.05, r1 * 0.85]], 0.85, 1, mat, 12));
    neck.push(g); par = g;
  });
  neck[0].rotation.x = -0.5; if (neck[1]) neck[1].rotation.x = 0.2; if (neck[2]) neck[2].rotation.x = 0.2;
  const head = new THREE.Group(); head.position.z = P.neck[P.neck.length - 1]; par.add(head);
  head.rotation.x = 0.55;
  const [hl, hw, hh] = P.head;
  const skull = new THREE.Mesh(skullGeo(hl, hw, hh, false), mat); skull.castShadow = true; skull.position.set(0, 0, -hl * 0.12); head.add(skull);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mouthMat); mouth.scale.set(hw * 0.7, hh * 0.2, hl * 0.42); mouth.position.set(0, -hh * 0.05, hl * 0.4); head.add(mouth);
  teeth(skull, hl, hw, -hh * 0.2, true, rex ? 9 : 11, rex ? 0.07 : 0.022);
  const jaw = new THREE.Group(); jaw.position.set(0, -hh * 0.12, -hl * 0.06); head.add(jaw);
  const jawM = new THREE.Mesh(skullGeo(hl * 0.92, hw * 0.92, hh, true), mat); jawM.castShadow = true; jaw.add(jawM);
  teeth(jawM, hl * 0.92, hw * 0.9, -hh * 0.02, false, rex ? 8 : 10, rex ? 0.055 : 0.018);
  // Augen mit Brauenwulst
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#0a0805', roughness: 0.1, metalness: 0.2, emissive: new THREE.Color('#e8d060'), emissiveIntensity: 0 });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(rex ? 0.045 : 0.024, 12, 8), eyeMat);
    e.position.set(s * hw * 0.78, hh * 0.32, hl * 0.2); head.add(e); eyes.push(e);
    const brow = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), mat); brow.scale.set(hw * 0.28, hh * 0.13, hl * 0.16); brow.position.set(s * hw * 0.7, hh * 0.5, hl * 0.18); brow.rotation.z = s * 0.4; head.add(brow);
    if (rex) { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), mat); horn.position.set(s * hw * 0.55, hh * 0.62, hl * 0.12); head.add(horn); }
  }

  // Schwanz
  const tail = []; par = new THREE.Group(); par.position.set(0, P.tR * 0.1, -0.3); par.rotation.y = Math.PI; torsoG.add(par);
  for (let i = 0; i < P.tail; i++) {
    const g = new THREE.Group(); if (i) g.position.z = P.tailLen; par.add(g);
    const r0 = P.tailR * (1 - i / P.tail) + 0.012, r1 = P.tailR * (1 - (i + 1) / P.tail) + 0.008;
    g.add(lathe([[-0.03, r0], [P.tailLen, r1], [P.tailLen + 0.03, r1 * 0.8]], 0.75, 1, mat, 10));
    if (P.quills && i < P.tail - 2) { const q = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.12, 4), quillMat); q.position.set(0, r0 * 0.8, P.tailLen * 0.5); q.rotation.x = 0.9; g.add(q); }
    tail.push(g); par = g;
  }
  tail[0].rotation.x = 0.12;

  // Beine
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * P.tR * 0.62, -0.02, 0); hips.add(hip);
    const thigh = lathe([[-0.06, P.legR * 1.2], [0.02, P.legR * 2.0], [P.thigh * 0.45, P.legR * 1.7], [P.thigh, P.legR * 0.75]], 0.8, 1.1, mat, 14); thigh.rotation.x = Math.PI / 2; // zeigt nach unten
    hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -P.thigh; hip.add(knee);
    const shin = lathe([[-0.03, P.legR * 0.8], [P.shin * 0.3, P.legR * 0.95], [P.shin, P.legR * 0.45]], 0.85, 1, mat, 10); shin.rotation.x = Math.PI / 2; knee.add(shin);
    const ankle = new THREE.Group(); ankle.position.y = -P.shin; knee.add(ankle);
    const meta = lathe([[0, P.legR * 0.45], [P.meta, P.legR * 0.35]], 1, 1, mat, 8); meta.rotation.x = Math.PI / 2; ankle.add(meta);
    const foot = new THREE.Group(); foot.position.y = -P.meta; ankle.add(foot);
    for (const a of [-0.35, 0, 0.35]) {
      const toe = lathe([[0, P.legR * 0.32], [P.meta * 0.55, P.legR * 0.18]], 1, 0.8, mat, 6); toe.rotation.y = a; foot.add(toe);
      const cl = new THREE.Mesh(new THREE.ConeGeometry(P.legR * 0.15, P.legR * 0.6, 5), clawMat); cl.rotation.x = Math.PI / 2 + 0.4; cl.position.set(Math.sin(a) * P.meta * 0.55, -0.01, Math.cos(a) * P.meta * 0.55); foot.add(cl);
    }
    if (!rex) { // Sichelkralle
      const sk = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 4, 10, Math.PI * 0.8), clawMat); sk.position.set(s * 0.03, 0.04, 0.04); sk.rotation.y = Math.PI / 2; sk.rotation.z = -0.4; foot.add(sk);
    }
    legs.push({ hip, knee, ankle, foot, side: s });
  }
  // Arme
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * P.tR * 0.6, -P.tR * 0.25, P.tLen * 0.72); torsoG.add(sh);
    const up = lathe([[0, P.arm * 0.16], [P.arm * 0.5, P.arm * 0.1]], 1, 1, mat, 8); up.rotation.x = Math.PI / 2 + 0.6; sh.add(up);
    const el = new THREE.Group(); el.position.set(0, -Math.cos(0.6) * P.arm * 0.5, Math.sin(0.6) * P.arm * 0.5); sh.add(el);
    const fo = lathe([[0, P.arm * 0.09], [P.arm * 0.5, P.arm * 0.06]], 1, 1, mat, 8); fo.rotation.x = -0.4; el.add(fo);
    for (let k = 0; k < (rex ? 2 : 3); k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(P.arm * 0.035, P.arm * 0.28, 4), clawMat); c.position.set((k - 1) * P.arm * 0.05, -P.arm * 0.2, P.arm * 0.5); c.rotation.x = 2.4; el.add(c); }
    arms.push({ sh, el, s });
  }
  if (rex) root.scale.setScalar(2.6);

  // ---------- Animation ----------
  const st = { phase: 0, t: Math.random() * 10, twitchT: 0, tw: new V(), twTarget: new V(), lookYaw: 0, lookPitch: 0 };
  const tmpV = new V(), tmpQ = new THREE.Quaternion(), inv = new THREE.Matrix4();
  const D = {
    root, hips, head, jaw, eyes, eyeMat, rex, P,
    speed: 0, jawOpen: 0, crouch: 0, lookAt: null, agitation: 0, rear: 0,
    update(dt) {
      st.t += dt;
      const sp = Math.min(1, D.speed / (rex ? 4 : 5));
      st.phase += dt * (D.speed * (rex ? 1.1 : 3.2) + (D.speed > 0.05 ? 1 : 0));
      const ph = st.phase;
      // Becken
      hips.position.y = P.hip * (1 - D.crouch * 0.28) + Math.abs(Math.sin(ph)) * 0.04 * sp - 0.02 * sp;
      hips.rotation.z = Math.sin(ph) * 0.04 * sp;
      torsoG.rotation.x = -0.12 + D.crouch * 0.18 + sp * 0.12 + Math.sin(st.t * 1.7) * 0.01 - D.rear * 0.45;
      torso.scale.y = 1 + Math.sin(st.t * (2 + D.agitation * 3)) * 0.025;
      // Beine (vereinfachter Gang)
      for (const L of legs) {
        const p = ph + (L.side > 0 ? Math.PI : 0), sw = Math.sin(p), lift = Math.max(0, Math.cos(p));
        L.hip.rotation.x = -0.55 - sw * 0.55 * sp + D.crouch * -0.5;
        L.knee.rotation.x = 1.25 + lift * 0.7 * sp + D.crouch * 0.6;
        L.ankle.rotation.x = -1.35 - lift * 0.4 * sp - D.crouch * 0.2;
        L.foot.rotation.x = 0.6 - L.hip.rotation.x - L.knee.rotation.x - L.ankle.rotation.x - 0.6 + lift * 0.5 * sp;
      }
      // Schwanz
      tail.forEach((g, i) => { g.rotation.y = Math.sin(st.t * 1.2 - i * 0.5) * 0.05 * (1 + D.agitation) + Math.sin(ph - i * 0.4) * 0.06 * sp; g.rotation.x = (i === 0 ? 0.12 : -0.02) + D.crouch * 0.02; });
      // Kopf: Blick zum Ziel plus Vogel-artiges Zucken
      st.twitchT -= dt;
      if (st.twitchT <= 0) { st.twitchT = 0.4 + Math.random() * (2.2 - D.agitation * 1.5); st.twTarget.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.4); }
      if (D.rear > 0.01 || D.jawOpen > 0.8) st.twTarget.set(0, 0, 0); st.tw.lerp(st.twTarget, Math.min(1, dt * 22));
      let yaw = 0, pitch = 0;
      if (D.lookAt) {
        root.updateMatrixWorld(); inv.copy(neckRoot.matrixWorld).invert();
        tmpV.copy(D.lookAt).applyMatrix4(inv);
        yaw = Math.atan2(tmpV.x, tmpV.z); pitch = -Math.atan2(tmpV.y, Math.hypot(tmpV.x, tmpV.z));
        yaw = THREE.MathUtils.clamp(yaw, -1.2, 1.2); pitch = THREE.MathUtils.clamp(pitch, -0.9, 0.6);
      }
      st.lookYaw += (yaw - st.lookYaw) * Math.min(1, dt * 6); st.lookPitch += (pitch - st.lookPitch) * Math.min(1, dt * 6);
      const n = neck.length;
      neck.forEach((g, i) => { g.rotation.y = st.lookYaw / (n + 1); });
      neck[0].rotation.x = -0.5 + D.crouch * 0.5 + sp * 0.35 + st.lookPitch * 0.3;
      head.rotation.y = st.lookYaw / (n + 1) + st.tw.x;
      head.rotation.x = 0.25 + st.lookPitch * 0.5 + st.tw.y - D.jawOpen * 0.25;
      head.rotation.z = st.tw.z;
      jaw.rotation.x = D.jawOpen * (rex ? 0.75 : 0.85) + Math.max(0, Math.sin(st.t * 0.7)) * 0.04;
      arms.forEach(a => { a.sh.rotation.x = 0.3 + Math.sin(st.t * 1.3 + a.s) * 0.05 + D.agitation * 0.2; a.el.rotation.x = -0.5 - D.agitation * 0.3; });
    },
    // Augenleuchten: hell, wenn die Lampe die Augen trifft und das Tier zur Kamera schaut
    eyeshine(camPos, camDir, lampOn, ambient = 0) {
      const e = eyes[0]; e.getWorldPosition(tmpV);
      const toEye = tmpV.sub(camPos), dist = toEye.length(); toEye.divideScalar(dist);
      const inBeam = Math.max(0, camDir.dot(toEye)), beam = lampOn ? Math.pow(Math.max(0, (inBeam - 0.88) / 0.12), 1.5) : 0;
      head.getWorldDirection(tmpV); const facing = Math.max(0, -tmpV.dot(toEye));
      D.eyeMat.emissiveIntensity = (beam * 9 + ambient) * Math.pow(facing, 2) * Math.min(1, 14 / (dist + 0.5));
    },
  };
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  D.update(0);
  return D;
}
