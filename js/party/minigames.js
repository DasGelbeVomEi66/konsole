// Minispiele der Insel-Party. Alle eigenen Ideen, gesteuert über das Handy (Tasten, Steuerkreuz, Neigen, Schütteln, Quiz).
import * as THREE from '../../lib/three.module.min.js';
import { makeCreature, toon, outline } from './creatures.js';
import { QUIZ, TRUEFALSE } from './quiz.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// ---------- Gemeinsame Kulisse ----------
function beach(scene, o = {}) {
  scene.background = new THREE.Color(o.sky || '#8fd6ff');
  scene.fog = new THREE.Fog(o.sky || '#8fd6ff', 60, 180);
  scene.add(new THREE.HemisphereLight('#fff6e0', '#6aa88a', 1.3));
  const dl = new THREE.DirectionalLight('#fff1d6', 2); dl.position.set(-14, 30, 18); dl.castShadow = true; dl.shadow.mapSize.set(1024, 1024);
  Object.assign(dl.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 }); dl.shadow.bias = -0.001; scene.add(dl);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), new THREE.MeshPhongMaterial({ color: '#29b6d8', shininess: 80 })); water.rotation.x = -Math.PI / 2; water.position.y = -0.3; scene.add(water);
  if (o.sand !== false) { const s = new THREE.Mesh(new THREE.CircleGeometry(o.sandR || 26, 48), toon('#f6dfa6')); s.rotation.x = -Math.PI / 2; s.receiveShadow = true; scene.add(s); }
  const foam = new THREE.Mesh(new THREE.RingGeometry((o.sandR || 26), (o.sandR || 26) + 0.8, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 })); foam.rotation.x = -Math.PI / 2; foam.position.y = -0.2; if (o.sand !== false) scene.add(foam);
  if (o.palms !== false) for (let i = 0; i < (o.palmN || 8); i++) { const a = i / (o.palmN || 8) * TAU + 0.3; palm(scene, Math.cos(a) * ((o.sandR || 26) - 2.5), Math.sin(a) * ((o.sandR || 26) - 2.5), rnd(0.8, 1.15)); }
  return { water };
}
const trunkGeo = new THREE.CylinderGeometry(0.28, 0.4, 1.4, 7);
const leafGeo = (() => { const g = new THREE.PlaneGeometry(1.1, 4.6, 1, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 2.3; p.setZ(i, -((y / 4.6) ** 2) * 2); p.setX(i, p.getX(i) * Math.sin(Math.PI * clamp(y / 4.6, 0.05, 1))); p.setY(i, y); } g.rotateX(-Math.PI / 2 + 0.25); g.computeVertexNormals(); return g; })();
function palm(scene, x, z, s = 1, segs = 6) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = Math.random() * TAU;
  const tm = toon('#9a6b3c'), lm = toon('#3fae4a', { side: THREE.DoubleSide });
  let px = 0, py = 0; for (let i = 0; i < segs; i++) { const t = new THREE.Mesh(trunkGeo, tm); t.position.set(px, py + 0.7, 0); t.castShadow = true; p.add(t); py += 1.3; px += 0.05 * i; }
  for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(leafGeo, lm); l.position.set(px, py + 0.3, 0); l.rotation.y = i / 7 * TAU; l.castShadow = true; p.add(l); }
  p.scale.setScalar(s); scene.add(p); return { g: p, top: py * s };
}
function img(src) { const i = new Image(); i.src = src; return i; }

// ---------- Ablauf eines Minispiels ----------
const TYPE_LABEL = { ffa: 'Jeder gegen jeden', '2v2': '2 gegen 2', '1v3': '1 gegen 3', duel: 'Duell' };
const MG_CSS = `.mg-ov{position:absolute;inset:0;display:grid;place-items:center;background:rgba(10,40,70,.55);z-index:20}
.mg-card{background:#fffaf0;border-radius:32px;border:5px solid #fff;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:22px 32px;width:min(980px,92vw);text-align:center;color:#5c4314;font-family:Nunito,sans-serif}
.mg-card .ty{display:inline-block;background:#ff7a3d;color:#fff;font-weight:900;border-radius:999px;padding:4px 16px;font-size:16px}
.mg-card h2{margin:8px 0 4px;font-size:clamp(34px,4.4vw,58px);font-weight:900;color:#1b7fc4;text-shadow:0 4px 0 #cfe9ff}
.mg-card p{margin:6px 0;font-weight:800;font-size:19px;color:#7a5a2a}.mg-card .ctl{background:#fff3dc;border-radius:16px;padding:10px 16px;margin:12px auto;max-width:640px;font-weight:900;color:#6b4a12}
.mg-teams{display:flex;justify-content:center;align-items:center;gap:22px;margin:12px 0}.mg-team{display:flex;gap:10px}.mg-vs{font-weight:900;font-size:28px;color:#ff7a3d}
.mg-p{width:96px;border-radius:18px;border:4px solid;padding:4px;background:#fff;position:relative}.mg-p img{width:100%;display:block}.mg-p b{font-size:14px;font-weight:900;display:block}.mg-p .ok{position:absolute;top:-10px;right:-10px;background:#2eaa4f;color:#fff;border-radius:999px;font-size:12px;font-weight:900;padding:2px 8px;display:none}.mg-p.rdy .ok{display:block}
.mg-win img{width:120px}.mg-win{display:flex;justify-content:center;gap:18px;margin:12px 0}`;

export async function runMinigame(env, game, players, mode) {
  const { renderer, wait, setPad, portraits, box, K } = env;
  if (!document.getElementById('mg-css')) { const s = document.createElement('style'); s.id = 'mg-css'; s.textContent = MG_CSS; document.head.appendChild(s); }
  const host = box.querySelector('.pt');
  const teams = mode === '2v2' ? [[0, 1], [2, 3]] : mode === '1v3' ? [[0], [1, 2, 3]] : null;
  const teamOf = i => teams ? (teams[0].includes(i) ? 0 : 1) : i;
  Sound.music('mini');
  // Anleitung
  const ov = document.createElement('div'); ov.className = 'mg-ov'; host.appendChild(ov);
  const pcard = (pl, i) => `<div class="mg-p" id="mgp${i}" style="border-color:${pl.color}"><span class="ok">bereit</span><img src="${portraits[pl.def.id]}" alt=""><b style="color:${pl.color}">${pl.name}</b></div>`;
  const teamHTML = teams ? `<div class="mg-team">${teams[0].map(i => pcard(players[i], i)).join('')}</div><div class="mg-vs">gegen</div><div class="mg-team">${teams[1].map(i => pcard(players[i], i)).join('')}</div>`
    : players.map((pl, i) => pcard(pl, i)).join(mode === 'duel' ? '<div class="mg-vs">gegen</div>' : '');
  const ctlFor = i => (game.ctl1 && teams && teams[0].includes(i)) ? game.ctl1 : game.ctl;
  ov.innerHTML = `<div class="mg-card"><span class="ty">${TYPE_LABEL[mode]}</span><h2>${game.name}</h2><p>${mode === '1v3' && game.desc1 ? game.desc1 : game.desc}</p><div class="ctl">${game.ctl}${game.ctl1 ? '<br>' + game.ctl1 : ''}</div>
    <div class="mg-teams">${teamHTML}</div><p style="font-size:15px">Menschen drücken A, wenn sie bereit sind. Start spätestens nach 15 Sekunden.</p></div>`;
  const ready = players.map(p => !p.human);
  players.forEach((pl, i) => { if (pl.human) setPad(pl.phone, { title: game.name, hint: ctlFor(i) + ' · Drücke A, wenn du bereit bist.', buttons: [{ b: 'A', label: 'Bereit!' }] }); else ov.querySelector('#mgp' + i).classList.add('rdy'); });
  await new Promise(res => {
    let t = 0; const off = env.onEdge((p, n) => { if (n !== 'A') return; players.forEach((pl, i) => { if (pl.human && pl.phone === p && !ready[i]) { ready[i] = true; ov.querySelector('#mgp' + i).classList.add('rdy'); Sound.play('select'); } }); if (ready.every(Boolean)) { off(); clearInterval(iv); res(); } });
    let last = performance.now(); const iv = setInterval(() => { const now = performance.now(), d = now - last; last = now; if (!env.alive()) { clearInterval(iv); off(); res(); return; } if (!env.paused()) t += Math.min(300, d); if (t > 15000 || ready.every(Boolean)) { clearInterval(iv); off(); res(); } }, 100);
  });
  await wait(400); ov.remove();

  // Szene
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 500);
  const edgeQ = players.map(() => []);
  const offEdge = env.onEdge((p, n) => players.forEach((pl, i) => { if (pl.human && pl.phone === p) edgeQ[i].push(n); }));
  const P = players.map((pl, i) => {
    const cre = makeCreature(pl.def); scene.add(cre.root);
    return { i, pl, cre, human: pl.human, phone: pl.phone, color: pl.color, name: pl.name, team: teamOf(i), score: 0, out: false, x: 0, z: 0, y: 0, vx: 0, vz: 0, anim: 'idle', face: 0, img: img(portraits[pl.def.id]) };
  });
  const cpu = (G => G ? G.cpu : 1)(window.__pt && window.__pt().G);
  const ctx = {
    scene, camera, P, mode, teams, cpu, time: 0, done: false,
    take(i, name) { const q = edgeQ[i], k = q.indexOf(name); if (k < 0) return false; q.splice(k, 1); return true; },
    takeAny(i, names) { const q = edgeQ[i]; for (let k = 0; k < q.length; k++) if (names.includes(q[k])) { const n = q[k]; q.splice(k, 1); return n; } return null; },
    clear(i) { edgeQ[i].length = 0; },
    held(i, name) { const p = P[i]; return p.human ? !!env.inp[p.phone].btn[name] : false; },
    dir(i) { const p = P[i]; if (!p.human) return { x: 0, z: 0 }; const I = env.inp[p.phone]; let x = (I.btn.RIGHT ? 1 : 0) - (I.btn.LEFT ? 1 : 0), z = (I.btn.DOWN ? 1 : 0) - (I.btn.UP ? 1 : 0); const l = Math.hypot(x, z); return l ? { x: x / l, z: z / l } : { x: 0, z: 0 }; },
    tilt(i) { const p = P[i]; if (!p.human) return { x: 0, z: 0 }; const I = env.inp[p.phone]; if (performance.now() - I.tT < 500) return { x: clamp(I.tx * 1.3, -1, 1), z: clamp(I.ty * 1.3, -1, 1) }; return ctx.dir(i); },
    shake(i) { const p = P[i]; if (!p.human) return 0; const I = env.inp[p.phone]; let e = I.shakeE || 0; I.shakeE = 0; if (ctx.take(i, 'A')) e += 22; return e; },
    pad(i, cfg) { const p = P[i]; if (p.human) setPad(p.phone, Object.assign({ title: game.name }, cfg)); },
    sfx: n => Sound.play(n), text, scoreBar,
  };
  players.forEach((pl, i) => ctx.pad(i, game.pad ? (typeof game.pad === 'function' ? game.pad(i, ctx) : game.pad) : {}));
  const g = game.create(ctx);
  let countdown = 3.2, finished = false, endT = 0;
  env.setView({
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    update(dt) {
      ctx.time += dt;
      P.forEach(p => { p.cre.anim(ctx.time + p.i, p.anim); });
      if (countdown > 0) { const before = Math.ceil(countdown); countdown -= dt; if (Math.ceil(countdown) !== before && countdown > 0) Sound.play('beep'); if (countdown <= 0) { Sound.play('beepGo'); P.forEach((p, i) => ctx.clear(i)); } g.idle && g.idle(dt); return; }
      if (!finished) { g.update(dt); if (ctx.done) { finished = true; endT = 1.6; Sound.play('whoosh'); } }
      else { endT -= dt; g.idle && g.idle(dt); }
    },
    render() {
      renderer.render(scene, camera);
      const { c, W, H, dpr } = env.hud(); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      g.hud && g.hud(c, W, H);
      if (countdown > 0) text(c, countdown > 0.4 ? String(Math.ceil(countdown - 0.2) || 'Los!') : 'Los!', W / 2, H * 0.42, H * 0.18, '#ffffff');
      if (finished) text(c, 'Fertig!', W / 2, H * 0.42, H * 0.14, '#ffd23d');
    },
  });
  while (!finished || endT > 0) await wait(50);
  const winners = g.result();
  offEdge();
  // Ergebnis
  winners.forEach(i => P[i].anim = 'happy'); P.forEach((p, i) => { if (!winners.includes(i)) p.anim = 'sad'; });
  Sound.play(winners.length ? 'win' : 'buzz');
  const ov2 = document.createElement('div'); ov2.className = 'mg-ov'; ov2.style.background = 'rgba(10,40,70,.35)'; host.appendChild(ov2);
  ov2.innerHTML = `<div class="mg-card"><span class="ty">${game.name}</span><h2>${winners.length ? (winners.length > 1 ? 'Gewinner' : 'Gewinner') : 'Niemand gewinnt'}</h2>
    <div class="mg-win">${winners.map(i => `<div class="mg-p" style="border-color:${players[i].color}"><img src="${portraits[players[i].def.id]}" alt=""><b style="color:${players[i].color}">${players[i].name}</b></div>`).join('')}</div>
    ${g.summary ? `<p>${g.summary()}</p>` : ''}</div>`;
  await wait(3200); ov2.remove();
  scene.traverse(o => { if (o.geometry && o.geometry !== trunkGeo && o.geometry !== leafGeo) o.geometry.dispose(); });
  return { winners: winners.map(i => players[i]) };
}

function text(c, s, x, y, size, col, align = 'center', base = 'middle') {
  c.font = `900 ${size}px Nunito, sans-serif`; c.textAlign = align; c.textBaseline = base; c.lineJoin = 'round';
  c.lineWidth = Math.max(4, size * 0.16); c.strokeStyle = 'rgba(40,25,10,.75)'; c.strokeText(s, x, y); c.fillStyle = col; c.fillText(s, x, y);
}
function scoreBar(c, W, H, P, val, opts = {}) {
  const n = P.length, w = Math.min(230, (W - 40) / n - 12), y = opts.bottom ? H - 78 : 14;
  P.forEach((p, k) => {
    const x = W / 2 - (n * (w + 12) - 12) / 2 + k * (w + 12);
    c.fillStyle = p.out ? 'rgba(80,80,80,.75)' : 'rgba(255,255,255,.92)'; c.beginPath(); c.roundRect(x, y, w, 62, 18); c.fill();
    c.lineWidth = 4; c.strokeStyle = p.color; c.stroke();
    if (p.img.complete) c.drawImage(p.img, x + 4, y + 3, 56, 56);
    c.font = '900 15px Nunito, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = p.color; c.fillText(p.name, x + 64, y + 8);
    c.font = '900 24px Nunito, sans-serif'; c.fillStyle = p.out ? '#ddd' : '#3d4145'; c.fillText(String(val(p)), x + 64, y + 28);
  });
}
function timerHud(c, W, H, t) { text(c, String(Math.max(0, Math.ceil(t))), W / 2, 112, 46, t < 5 ? '#ff6b6b' : '#ffffff'); }
function bestOf(P, key = 'score', filter = () => true) { const ps = P.filter(filter); if (!ps.length) return []; const m = Math.max(...ps.map(p => p[key])); return ps.filter(p => p[key] === m).map(p => p.i); }
function placeRow(P, z, spread = 4.5) { const n = P.length; P.forEach((p, k) => { p.x = (k - (n - 1) / 2) * spread; p.z = z; p.cre.root.position.set(p.x, 0, p.z); }); }
const shadowDisc = (scene, r = 0.9) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; scene.add(m); return m; };

// ---------- Die Spiele ----------
export const GAMES = [
  // 1 Kokos-Klau (Neigen)
  { id: 'kokos', name: 'Kokos-Klau', type: 'ffa', desc: 'Kokosnüsse fallen vom Himmel. Fang so viele wie möglich, goldene zählen dreifach.', ctl: 'Handy neigen zum Laufen', pad: { tilt: true, hint: 'Handy flach halten und neigen' },
    create(ctx) {
      const { scene, camera, P } = ctx; beach(scene, { sandR: 24 });
      camera.position.set(0, 30, 24); camera.lookAt(0, 0, 1);
      P.forEach((p, k) => { const a = k / P.length * TAU; p.x = Math.cos(a) * 5; p.z = Math.sin(a) * 5; });
      const nuts = [], nutGeo = new THREE.SphereGeometry(0.6, 12, 10), brown = toon('#6b4423'), gold = toon('#ffcc33', { emissive: '#7a5200', emissiveIntensity: 0.4 });
      let spawn = 0, T = 30;
      const step = (p, mx, mz, dt, sp = 9) => { p.vx = lerp(p.vx, mx * sp, dt * 8); p.vz = lerp(p.vz, mz * sp, dt * 8); p.x = clamp(p.x + p.vx * dt, -17, 17); p.z = clamp(p.z + p.vz * dt, -13, 13); if (Math.hypot(p.vx, p.vz) > 1) { p.face = Math.atan2(p.vx, p.vz); p.anim = 'walk'; } else p.anim = 'idle'; };
      return {
        update(dt) {
          T -= dt; if (T <= 0) ctx.done = true;
          spawn -= dt; if (spawn <= 0) { spawn = rnd(0.25, 0.5); const gld = Math.random() < 0.12; const m = new THREE.Mesh(nutGeo, gld ? gold : brown); m.castShadow = true; const n = { x: rnd(-16, 16), z: rnd(-12, 12), y: 16, vy: 0, gold: gld, m, sh: shadowDisc(scene, 0.7) }; m.position.set(n.x, n.y, n.z); n.sh.position.set(n.x, 0.03, n.z); scene.add(m); nuts.push(n); }
          for (const n of nuts) { n.vy -= 22 * dt; n.y += n.vy * dt; n.m.position.y = n.y; n.sh.scale.setScalar(clamp(1.6 - n.y / 12, 0.3, 1.4));
            if (n.y < 0.9 && !n.dead) {
              void 0;
              let best = null, bd = 2.0; for (const p of P) { const d = Math.hypot(p.x - n.x, p.z - n.z); if (d < bd) { bd = d; best = p; } }
              if (best) { best.score += n.gold ? 3 : 1; Sound.play(n.gold ? 'win' : 'coin'); } else Sound.play('pop');
              n.dead = true; scene.remove(n.m); scene.remove(n.sh);
            } }
          for (let k = nuts.length - 1; k >= 0; k--) if (nuts[k].dead) nuts.splice(k, 1);
          P.forEach((p, i) => {
            if (p.human) { const t = ctx.tilt(i); step(p, t.x, t.z, dt); }
            else { let best = null, bs = 1e9; for (const n of nuts) { const tl = Math.max(0.05, (n.y + Math.sqrt(n.vy * n.vy + 44 * n.y) / 1) / 22), d = Math.hypot(n.x - p.x, n.z - p.z), need = d / 8; if (need < tl + 0.2 * (2 - ctx.cpu)) { const sc = d - (n.gold ? 6 : 0) + ((i * 7 + Math.floor(n.x)) % 5); if (sc < bs) { bs = sc; best = n; } } }
              if (best) { const dx = best.x - p.x, dz = best.z - p.z, l = Math.hypot(dx, dz) || 1; step(p, dx / l * clamp(l, 0, 1), dz / l * clamp(l, 0, 1), dt, [6.5, 7.8, 8.8][ctx.cpu]); } else step(p, 0, 0, dt); }
            p.cre.root.position.set(p.x, 0, p.z); p.cre.root.rotation.y = lerp(p.cre.root.rotation.y, p.face, 0.2);
          });
        },
        idle() { P.forEach(p => p.cre.root.position.set(p.x, 0, p.z)); },
        hud(c, W, H) { scoreBar(c, W, H, P, p => p.score); if (!ctx.done) timerHud(c, W, H, T); },
        result() { return bestOf(P); },
      };
    } },
  // 2 Palmen-Klettern (Schütteln)
  { id: 'palme', name: 'Palmen-Kraxler', type: 'ffa', duel: true, desc: 'Wer zuerst oben an der Palme ankommt, gewinnt.', ctl: 'Handy schütteln (oder A hämmern)', pad: { shake: true, buttons: [{ b: 'A', label: 'Klettern' }], hint: 'Schütteln, so schnell du kannst!' },
    create(ctx) {
      const { scene, camera, P } = ctx; beach(scene, { sandR: 22, palms: false });
      const n = P.length, H0 = 14, sp = 5;
      P.forEach((p, k) => { p.x = (k - (n - 1) / 2) * sp; p.z = 0; p.h = 0; p.fin = null; palm(scene, p.x, -0.8, 1, 11); p.cre.root.rotation.y = 0; });
      camera.position.set(0, 9, 26); camera.lookAt(0, 8, 0);
      let order = 0, T = 25; const rate = P.map(() => rnd(0.85, 1.15) * [0.085, 0.1, 0.115][ctx.cpu]);
      return {
        update(dt) {
          T -= dt; if (T <= 0) ctx.done = true;
          P.forEach((p, i) => {
            if (p.fin) return;
            if (p.human) { const e = ctx.shake(i); p.h += e * 0.0016; } else p.h += rate[i] * dt * (0.6 + Math.random() * 0.8);
            p.h = Math.min(1, p.h); p.anim = 'walk';
            if (p.h >= 1) { p.fin = ++order; p.anim = 'happy'; Sound.play('win'); }
            p.cre.root.position.set(p.x, p.h * H0, 0.35);
          });
          if (P.every(p => p.fin) || order >= 1 && ctx.mode === 'duel') ctx.done = true;
        },
        idle() { P.forEach(p => p.cre.root.position.set(p.x, (p.h || 0) * H0, 0.35)); },
        hud(c, W, H) { scoreBar(c, W, H, P, p => p.fin ? p.fin + '. Platz' : Math.round(p.h * 100) + ' %'); if (!ctx.done) timerHud(c, W, H, T); },
        result() { const f = P.filter(p => p.fin === 1); return f.length ? f.map(p => p.i) : bestOf(P, 'h'); },
      };
    } },
  // 3 Muschel-Blitz (Reaktion)
  { id: 'muschel', name: 'Muschel-Blitz', type: 'ffa', duel: true, desc: 'Sobald die Riesenmuschel aufklappt: drücken! Wer zu früh drückt, setzt die Runde aus.', ctl: 'A drücken, sobald die Perle leuchtet', pad: { buttons: [{ b: 'A', label: 'Jetzt!' }], hint: 'Warte auf die Perle …' },
    create(ctx) {
      const { scene, camera, P } = ctx; beach(scene, { sandR: 22 });
      camera.position.set(0, 12, 20); camera.lookAt(0, 1.5, 0);
      const clam = new THREE.Group(), shellM = toon('#ffb3c7'), lo = new THREE.Mesh(new THREE.SphereGeometry(3, 24, 12, 0, TAU, Math.PI / 2, Math.PI / 2), shellM), up = new THREE.Mesh(new THREE.SphereGeometry(3, 24, 12, 0, TAU, 0, Math.PI / 2), shellM);
      lo.scale.y = 0.45; up.scale.y = 0.45; shellM.side = THREE.DoubleSide; const hinge = new THREE.Group(); hinge.position.z = -3; up.position.z = 3; hinge.add(up); clam.add(lo, hinge); clam.position.set(0, 1.2, -2); scene.add(clam);
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#bfe8ff', emissiveIntensity: 0, roughness: 0.2 })); pearl.position.set(0, 1.4, -2); scene.add(pearl);
      placeRow(P, 6, 4.2); P.forEach(p => p.cre.root.rotation.y = Math.PI);
      let round = 0, phase = 'wait', t = rnd(1.5, 3.5), early = new Set(), cpuT = [], winnerRound = null;
      const ROUNDS = 5;
      const startRound = () => { round++; phase = 'wait'; t = rnd(1.6, 4); early.clear(); winnerRound = null; P.forEach((p, i) => { ctx.clear(i); p.anim = 'idle'; }); cpuT = P.map(() => (Math.random() < 0.06 ? -rnd(0.3, 1) : [0.5, 0.38, 0.28][ctx.cpu] + rnd(0, 0.25))); };
      startRound(); round = 1;
      let openT = 0;
      return {
        update(dt) {
          t -= dt;
          if (phase === 'wait') {
            hinge.rotation.x = lerp(hinge.rotation.x, 0, 0.2); pearl.material.emissiveIntensity = 0;
            P.forEach((p, i) => { const early1 = p.human ? ctx.take(i, 'A') : (cpuT[i] < 0 && t < -cpuT[i] * 0.5 + 0.4); if (early1 && !early.has(i)) { early.add(i); p.anim = 'sad'; Sound.play('buzz'); if (!p.human) cpuT[i] = 99; } });
            if (t <= 0) { phase = 'open'; openT = 0; Sound.play('pop'); }
          } else if (phase === 'open') {
            openT += dt; hinge.rotation.x = lerp(hinge.rotation.x, -1.0, 0.3); pearl.material.emissiveIntensity = 1;
            for (const p of P) { const i = p.i; if (early.has(i) || winnerRound != null) continue; const hit = p.human ? ctx.take(i, 'A') : openT > cpuT[i] && cpuT[i] > 0; if (hit) { winnerRound = i; p.score++; p.anim = 'happy'; Sound.play('win'); } }
            if (winnerRound != null || openT > 3) { phase = 'show'; t = 1.6; }
          } else if (phase === 'show' && t <= 0) { if (round >= ROUNDS || (ctx.mode === 'duel' && P.some(p => p.score >= 3))) ctx.done = true; else startRound(); }
        },
        hud(c, W, H) { scoreBar(c, W, H, P, p => p.score + ' Punkte'); text(c, 'Runde ' + Math.min(round, ROUNDS) + ' / ' + ROUNDS, W / 2, 110, 30, '#ffffff'); if (phase === 'wait') P.forEach(p => early.has(p.i) && text(c, p.name + ': zu früh!', W / 2, H - 60 - [...early].indexOf(p.i) * 36, 28, '#ff6b6b')); },
        result() { return bestOf(P); },
      };
    } },
  // 4 Baumstamm-Hüpfer (Springen)
  { id: 'stamm', name: 'Baumstamm-Hüpfer', type: 'ffa', desc: 'Ein Baumstamm rollt immer schneller über den Strand. Spring rechtzeitig, sonst fliegst du ins Wasser.', ctl: 'A zum Springen', pad: { buttons: [{ b: 'A', label: 'Springen' }] },
    create(ctx) {
      const { scene, camera, P } = ctx; beach(scene, { sandR: 24 });
      camera.position.set(0, 9, 19); camera.lookAt(0, 1.5, 0);
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 26, 16).rotateX(Math.PI / 2), toon('#9a6b3c')); outline(log, 1.04); log.castShadow = true; scene.add(log);
      placeRow(P, 0, 3.4); P.forEach(p => { p.vy = 0; p.cre.root.rotation.y = Math.PI / 2; });
      // Stamm rollt in x-Richtung über alle hinweg, quer liegend (Achse z)
      let lx = -16, dir = 1, speed = 7, T = 0, passes = 0; const react = P.map(() => 0);
      return {
        update(dt) {
          T += dt; lx += dir * speed * dt; log.position.set(lx, 0.7, 0); log.rotation.z -= dir * speed * dt / 0.7;
          if (Math.abs(lx) > 17) { dir = -dir; speed = Math.min(22, speed + 1.6); passes++; P.forEach((p, i) => { react[i] = rnd(0, [0.16, 0.1, 0.05][ctx.cpu]); p.willJump = Math.random() < [0.86, 0.92, 0.96][ctx.cpu] - speed * 0.006; }); }
          P.forEach((p, i) => {
            if (p.out) { p.vy -= 25 * dt; p.y += p.vy * dt; p.z += 9 * dt; p.cre.root.position.set(p.x, p.y, p.z); p.cre.root.rotation.x += dt * 8; return; }
            const ground = p.y <= 0.001;
            let jump = false;
            if (p.human) jump = ctx.take(i, 'A');
            else { const dist = (p.x - lx) * dir, tt = dist / speed; const lo2 = p.willJump === false ? 0.75 : 0.18 + react[i] * 0.5, hi2 = p.willJump === false ? 0.95 : 0.33 + react[i]; if (dist > 0 && tt < hi2 && tt > lo2) jump = true; }
            if (jump && ground) { p.vy = 10.5; Sound.play('pop'); }
            p.vy -= 28 * dt; p.y = Math.max(0, p.y + p.vy * dt); if (p.y === 0) p.vy = 0;
            if (Math.abs(p.x - lx) < 0.9 && p.y < 1.1) { p.out = true; p.vy = 9; p.anim = 'spin'; Sound.play('splash'); }
            p.anim = p.out ? 'spin' : ground ? 'idle' : 'happy';
            p.cre.root.position.set(p.x, p.y, p.z);
          });
          const alive = P.filter(p => !p.out);
          if (alive.length <= 1 || T > 45) ctx.done = true;
        },
        hud(c, W, H) { scoreBar(c, W, H, P, p => p.out ? 'raus' : 'dabei'); text(c, 'Tempo ' + Math.round(speed), W / 2, 110, 28, '#ffffff'); },
        result() { const a = P.filter(p => !p.out); return a.length ? a.map(p => p.i) : []; },
      };
    } },
  // 5 Farben-Echo (Gedächtnis)
  { id: 'echo', name: 'Farben-Echo', type: 'ffa', desc: 'Die Muscheln leuchten in einer Reihenfolge auf. Merk sie dir und tippe sie nach. Jede Runde kommt eine dazu.', ctl: 'Steuerkreuz: ▲ Gelb · ▶ Rot · ▼ Blau · ◀ Grün', pad: { dpad: true, hint: '▲ Gelb  ▶ Rot  ▼ Blau  ◀ Grün' },
    create(ctx) {
      const { scene, camera, P } = ctx; beach(scene, { sandR: 22 });
      camera.position.set(0, 16, 15); camera.lookAt(0, 0, -1);
      const COLS = ['#ffd23d', '#ff5f5f', '#4fa8ff', '#5fcf5a'], DIRS = ['UP', 'RIGHT', 'DOWN', 'LEFT'], POS = [[0, -5.5], [5, -2], [0, 1.5], [-5, -2]];
      const shells = COLS.map((col, k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 10, 0, TAU, 0, Math.PI / 2), toon(col, { emissive: col, emissiveIntensity: 0 })); m.scale.y = 0.55; m.position.set(POS[k][0], 0.1, POS[k][1]); outline(m, 1.04); scene.add(m); return m; });
      const tones = [72, 76, 79, 84];
      placeRow(P, 7, 3.6); P.forEach(p => { p.cre.root.rotation.y = Math.PI; p.prog = 0; });
      let seq = [0, 1, 2].map(() => Math.floor(Math.random() * 4)), phase = 'show', k = 0, t = 0.8, inT = 0;
      const flash = j => { shells[j].material.emissiveIntensity = 0.9; Sound.play('select'); setTimeout(() => shells[j].material.emissiveIntensity = 0, 380); };
      void tones;
      return {
        update(dt) {
          t -= dt;
          if (phase === 'show') { if (t <= 0) { if (k < seq.length) { flash(seq[k]); k++; t = Math.max(0.35, 0.65 - seq.length * 0.02); } else { phase = 'input'; inT = 3 + seq.length * 0.9; P.forEach((p, i) => { p.prog = 0; p.ok = false; ctx.clear(i); p.cpuOk = Math.random() < ([0.9, 0.94, 0.975][ctx.cpu]) ** seq.length; p.cpuT = rnd(1, 2 + seq.length * 0.4); }); } } }
          else if (phase === 'input') {
            inT -= dt;
            P.forEach((p, i) => {
              if (p.out || p.ok) return;
              if (p.human) { const d = ctx.takeAny(i, DIRS); if (d) { const j = DIRS.indexOf(d); if (j === seq[p.prog]) { p.prog++; Sound.play('step'); if (p.prog === seq.length) { p.ok = true; p.anim = 'happy'; } } else { p.out = true; p.anim = 'sad'; Sound.play('buzz'); } } }
              else if (inT < 3 + seq.length * 0.9 - p.cpuT) { if (p.cpuOk) { p.ok = true; p.prog = seq.length; p.anim = 'happy'; } else { p.out = true; p.anim = 'sad'; Sound.play('buzz'); } }
            });
            if (inT <= 0) P.forEach(p => { if (!p.ok && !p.out) { p.out = true; p.anim = 'sad'; } });
            if (P.every(p => p.out || p.ok)) {
              const alive = P.filter(p => !p.out);
              if (alive.length <= 1 || seq.length >= 14) { if (!alive.length) P.forEach(p => { if (p.lastRound === seq.length - 1 || p.outAt === seq.length) p.keep = true; }); P.forEach(p => { if (!p.out) p.surv = seq.length + 1; else if (!p.surv) p.surv = seq.length; }); ctx.done = true; }
              else { P.forEach(p => { if (p.out && !p.surv) p.surv = seq.length; p.anim = p.out ? 'sad' : 'idle'; }); seq.push(Math.floor(Math.random() * 4)); phase = 'show'; k = 0; t = 1.2; }
            }
          }
        },
        hud(c, W, H) { scoreBar(c, W, H, P, p => p.out ? 'raus' : phase === 'input' ? p.prog + ' / ' + seq.length : 'dabei'); text(c, phase === 'show' ? 'Gut aufpassen …' : 'Jetzt nachtippen! ' + Math.max(0, Math.ceil(inT)), W / 2, 112, 32, '#ffffff'); text(c, 'Länge ' + seq.length, W / 2, H - 40, 26, '#ffffff'); },
        result() { const m = Math.max(...P.map(p => p.surv || 0)); return P.filter(p => (p.surv || 0) === m).map(p => p.i); },
      };
    } },
  // 6 Angel-Glück (Timing)
  { id: 'angeln', name: 'Angel-Glück', type: 'ffa', duel: true, desc: 'Drück, wenn der Zeiger im grünen Bereich ist, dann beißt ein Fisch an. Daneben drücken kostet kurz Zeit.', ctl: 'A zum Einholen', pad: { buttons: [{ b: 'A', label: 'Einholen' }] },
    create(ctx) {
      const { scene, camera, P } = ctx; beach(scene, { sandR: 14, palmN: 5 });
      camera.position.set(0, 10, 22); camera.lookAt(0, 0.5, 4);
      const pier = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 4), toon('#b07a45')); pier.position.set(0, 0.6, 10); pier.receiveShadow = true; scene.add(pier);
      placeRow(P, 9.5, 5); P.forEach(p => { p.cre.root.position.y = 0.85; p.cre.root.rotation.y = Math.PI; p.needle = Math.random(); p.dir = 1; p.zone = 0.22; p.cool = 0; p.speed = 0.9;
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 6), toon('#5a3418')); rod.position.set(p.x + 0.6, 2.3, p.z - 1.4); rod.rotation.x = -0.9; scene.add(rod);
        const bob = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), toon('#ff5f5f')); bob.position.set(p.x + 0.6, -0.15, p.z - 5); scene.add(bob); p.bob = bob; });
      const fishes = []; let T = 30;
      return {
        update(dt) {
          T -= dt; if (T <= 0) ctx.done = true;
          P.forEach((p, i) => {
            p.needle += p.dir * p.speed * dt; if (p.needle > 1) { p.needle = 1; p.dir = -1; } if (p.needle < 0) { p.needle = 0; p.dir = 1; }
            p.cool -= dt; const inZone = Math.abs(p.needle - 0.5) < p.zone / 2;
            let press = false;
            if (p.human) press = ctx.take(i, 'A');
            else if (p.cool <= 0) { if (inZone && Math.random() < [0.05, 0.09, 0.14][ctx.cpu]) press = true; else if (!inZone && Math.random() < [0.012, 0.006, 0.002][ctx.cpu]) press = true; }
            if (press && p.cool <= 0) {
              if (inZone) { p.score++; p.zone = Math.max(0.1, p.zone - 0.012); p.speed = Math.min(1.8, p.speed + 0.06); Sound.play('splash'); p.anim = 'happy'; setTimeout(() => p.anim = 'idle', 500);
                const f = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), toon(pick(['#ff9f43', '#54a0ff', '#feca57', '#ff6b9a']))); f.scale.set(1.6, 0.8, 0.6); f.position.copy(p.bob.position); scene.add(f); fishes.push({ m: f, t: 0, x0: p.bob.position.x, z0: p.bob.position.z, x1: p.x, z1: p.z }); }
              else { p.cool = 0.9; Sound.play('buzz'); }
            }
            p.bob.position.y = -0.15 + Math.sin(ctx.time * 3 + i) * 0.08;
          });
          for (const f of fishes) { f.t += dt * 1.4; const k = Math.min(1, f.t); f.m.position.set(lerp(f.x0, f.x1, k), Math.sin(k * Math.PI) * 4 + 0.5, lerp(f.z0, f.z1, k)); f.m.rotation.z += dt * 10; if (f.t >= 1) { scene.remove(f.m); f.dead = true; } }
          for (let k = fishes.length - 1; k >= 0; k--) if (fishes[k].dead) fishes.splice(k, 1);
        },
        hud(c, W, H) {
          scoreBar(c, W, H, P, p => p.score + ' Fische'); if (!ctx.done) timerHud(c, W, H, T);
          const n = P.length, bw = Math.min(260, W / n - 30);
          P.forEach((p, k) => { const x = W / 2 - (n * (bw + 30) - 30) / 2 + k * (bw + 30), y = H - 70;
            c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.roundRect(x, y, bw, 34, 17); c.fill(); c.strokeStyle = p.color; c.lineWidth = 4; c.stroke();
            c.fillStyle = p.cool > 0 ? '#bbb' : '#5fcf5a'; c.fillRect(x + bw * (0.5 - p.zone / 2), y + 5, bw * p.zone, 24);
            c.fillStyle = '#3d4145'; c.fillRect(x + 6 + (bw - 12) * p.needle - 3, y - 6, 6, 46); });
        },
        result() { return bestOf(P); },
      };
    } },
  // 7 Strand-Sprint (abwechselnd tippen)
  { id: 'sprint', name: 'Strand-Sprint', type: 'ffa', duel: true, desc: 'Ein Wettrennen über den Strand. Tippe abwechselnd links und rechts.', ctl: 'Abwechselnd A und B tippen', pad: { buttons: [{ b: 'A', label: 'Links', color: '#1b9fd6' }, { b: 'B', label: 'Rechts', color: '#e5242f' }], hint: 'Immer abwechselnd tippen!' },
    create(ctx) {
      const { scene, camera, P } = ctx; beach(scene, { sandR: 40, palmN: 12 });
      const n = P.length, L = 50, gap = 3.6;
      P.forEach((p, k) => { p.x = (k - (n - 1) / 2) * gap; p.d = 0; p.last = null; p.fin = null; p.cre.root.rotation.y = Math.PI;
        const lane = new THREE.Mesh(new THREE.PlaneGeometry(gap - 0.4, L + 6), toon(k % 2 ? '#f0d39a' : '#f8e6bd')); lane.rotation.x = -Math.PI / 2; lane.position.set(p.x, 0.02, 10 - L / 2); scene.add(lane); });
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(n * gap + 2, 0.15, 0.15), toon('#ff5f5f')); ribbon.position.set(0, 1.4, 10 - L); scene.add(ribbon);
      for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 8), toon('#ffffff')); post.position.set(s * (n * gap / 2 + 1), 1.5, 10 - L); scene.add(post); }
      let order = 0, T = 0; const rate = P.map(() => rnd(0.9, 1.1) * [6.2, 7.3, 8.4][ctx.cpu]);
      return {
        update(dt) {
          T += dt;
          P.forEach((p, i) => {
            if (p.fin) { p.anim = 'happy'; return; }
            if (p.human) { const b = ctx.takeAny(i, ['A', 'B']); if (b && b !== p.last) { p.d += 0.85; p.last = b; } } else p.d += rate[i] * dt * rnd(0.7, 1.3);
            p.anim = 'walk';
            if (p.d >= L) { p.fin = ++order; Sound.play('win'); }
            p.cre.root.position.set(p.x, 0, 10 - p.d);
          });
          const lead = Math.max(...P.map(p => p.d));
          camera.position.set(0, 8, 22 - lead * 0.9); camera.lookAt(0, 1, 6 - lead * 0.9 - 6);
          if (P.every(p => p.fin) || (ctx.mode === 'duel' && order >= 1) || T > 40) ctx.done = true;
        },
        idle() { const lead = Math.max(...P.map(p => p.d || 0)); camera.position.set(0, 8, 22 - lead * 0.9); camera.lookAt(0, 1, -lead * 0.9); P.forEach(p => p.cre.root.position.set(p.x, 0, 10 - (p.d || 0))); },
        hud(c, W, H) { scoreBar(c, W, H, P, p => p.fin ? p.fin + '. Platz' : Math.round(p.d) + ' m'); },
        result() { const f = P.filter(p => p.fin === 1); return f.length ? f.map(p => p.i) : bestOf(P, 'd'); },
      };
    } },
  // 8 Muschel-Quiz (Allgemeinwissen)
  { id: 'quiz', name: 'Muschel-Quiz', type: 'ffa', duel: true, desc: 'Sechs Fragen zum Allgemeinwissen. Wer zuerst richtig antwortet, bekommt 2 Punkte, alle anderen Richtigen 1 Punkt.', ctl: 'Antwort auf dem Handy antippen', pad: { quiz: true, labels: ['…', '…', '…', '…'], hint: 'Gleich kommt die erste Frage' },
    create(ctx) { return quizGame(ctx, false); } },
  // 9 Wahr oder Falsch (Allgemeinwissen)
  { id: 'wahr', name: 'Wahr oder Falsch', type: 'ffa', desc: 'Acht Behauptungen, schnell entscheiden: stimmt das oder nicht? Der Schnellste mit der richtigen Antwort bekommt einen Extrapunkt.', ctl: 'Wahr oder Falsch auf dem Handy antippen', pad: { buttons: [{ b: 'Q1', label: 'Wahr', color: '#2eaa4f' }, { b: 'Q2', label: 'Falsch', color: '#e5242f' }], hint: 'Gleich geht es los' },
    create(ctx) { return quizGame(ctx, true); } },
  // 10 Sandburg-Duell (2 gegen 2, hämmern)
  { id: 'sandburg', name: 'Sandburg-Duell', type: '2v2', desc: 'Baut im Team die höchste Sandburg. Jeder Tipp schaufelt Sand auf den Turm.', ctl: 'A hämmern', pad: { buttons: [{ b: 'A', label: 'Schaufeln!' }] },
    create(ctx) {
      const { scene, camera, P, teams } = ctx; beach(scene, { sandR: 24 });
      camera.position.set(0, 9, 20); camera.lookAt(0, 3, 0);
      const castles = teams.map((tm, k) => { const g = new THREE.Group(); g.position.set(k ? 6 : -6, 0, 0); scene.add(g); return { g, h: 0, tiers: 0 }; });
      teams.forEach((tm, k) => tm.forEach((i, j) => { const p = P[i]; p.x = (k ? 6 : -6) + (j ? 2.6 : -2.6); p.z = 2.2; p.cre.root.position.set(p.x, 0, p.z); p.cre.root.rotation.y = j ? -0.6 : 0.6; }));
      const sandM = toon('#e9c98a'), sandD = toon('#d8b571');
      const flag = k => { const f = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), toon('#7a4f2a')); pole.position.y = 0.8; f.add(pole); const cl = P[teams[k][0]].color; const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), toon(cl, { side: THREE.DoubleSide })); fl.position.set(0.45, 1.35, 0); f.add(fl); return f; };
      const flags = [flag(0), flag(1)]; flags.forEach((f, k) => castles[k].g.add(f));
      let T = 12; const rate = P.map(() => rnd(0.9, 1.1) * [5, 6.3, 7.5][ctx.cpu]);
      return {
        update(dt) {
          T -= dt; if (T <= 0) ctx.done = true;
          P.forEach((p, i) => { let add = 0; if (p.human) { while (ctx.take(i, 'A')) add++; } else if (Math.random() < rate[i] * dt) add = 1; if (add) { castles[p.team].h += add * 0.045; p.score += add; p.anim = 'happy'; setTimeout(() => p.anim = 'idle', 150); } });
          castles.forEach((cs, k) => {
            const want = Math.floor(cs.h / 0.8);
            while (cs.tiers < want) { const r = Math.max(0.6, 2.6 - cs.tiers * 0.12); const tier = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, 0.8, 16), cs.tiers % 2 ? sandD : sandM); tier.position.y = cs.tiers * 0.8 + 0.4; tier.castShadow = true; outline(tier, 1.03); cs.g.add(tier); cs.tiers++; Sound.play('step'); }
            flags[k].position.y = cs.tiers * 0.8;
          });
          camera.position.y = lerp(camera.position.y, 9 + Math.max(...castles.map(c => c.tiers)) * 0.5, 0.05); camera.lookAt(0, 3 + Math.max(...castles.map(c => c.tiers)) * 0.35, 0);
        },
        hud(c, W, H) { scoreBar(c, W, H, P, p => p.score + ' Schaufeln'); if (!ctx.done) timerHud(c, W, H, T); castles.forEach((cs, k) => text(c, (cs.h * 1.25).toFixed(1).replace('.', ',') + ' m', k ? W * 0.72 : W * 0.28, H - 50, 34, P[teams[k][0]].color)); },
        result() { const [a, b] = castles.map(c => c.h); return a === b ? [] : teams[a > b ? 0 : 1]; },
      };
    } },
  // 11 Floß-Rennen (2 gegen 2, im Takt)
  { id: 'floss', name: 'Floß-Rennen', type: '2v2', desc: 'Paddelt gemeinsam ans Ziel. Tippen beide fast gleichzeitig, schießt das Floß doppelt so weit.', ctl: 'A im Takt mit dem Teampartner', pad: { buttons: [{ b: 'A', label: 'Paddeln!' }], hint: 'Im Takt mit deinem Partner!' },
    create(ctx) {
      const { scene, camera, P, teams } = ctx; beach(scene, { sand: false, palms: false });
      for (let i = 0; i < 10; i++) palm(scene, (i % 2 ? 1 : -1) * 16, -i * 9 + 6, 1);
      for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 120), toon('#f6dfa6')); b.position.set(s * 17, -0.1, -40); scene.add(b); }
      const L = 60;
      const rafts = teams.map((tm, k) => { const g = new THREE.Group(); g.position.set(k ? 4.5 : -4.5, 0, 6); scene.add(g); for (let j = 0; j < 5; j++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4, 10).rotateX(Math.PI / 2), toon('#9a6b3c')); lg.position.set(-1.4 + j * 0.7, 0, 0); g.add(lg); } tm.forEach((i, j) => { P[i].cre.root.position.set(j ? 0.9 : -0.9, 0.3, 0); P[i].cre.root.rotation.y = Math.PI; g.add(P[i].cre.root); }); return { g, d: 0, last: [-9, -9], v: 0 }; });
      const finish = new THREE.Mesh(new THREE.BoxGeometry(24, 0.2, 0.2), toon('#ff5f5f')); finish.position.set(0, 2, 6 - L); scene.add(finish);
      let T = 0, winner = null; const nextCpu = P.map(() => rnd(0.2, 0.5));
      return {
        update(dt) {
          T += dt;
          teams.forEach((tm, k) => {
            const r = rafts[k];
            tm.forEach((i, j) => {
              const p = P[i]; let press = false;
              if (p.human) press = ctx.take(i, 'A');
              else { nextCpu[i] -= dt; const mate = tm[1 - j], mateT = r.last[1 - j]; if (nextCpu[i] <= 0 || (!P[mate].human && T - mateT < 0.05 && Math.random() < [0.3, 0.5, 0.75][ctx.cpu])) { press = true; nextCpu[i] = rnd(0.28, 0.42) / [0.8, 0.9, 1][ctx.cpu]; } }
              if (press) { const sync = Math.abs(T - r.last[1 - j]) < 0.18; r.last[j] = T; r.v += sync ? 2.6 : 1.2; p.anim = 'happy'; setTimeout(() => p.anim = 'idle', 180); if (sync) Sound.play('splash'); }
            });
            r.v *= Math.exp(-1.6 * dt); r.d += r.v * dt; r.g.position.z = 6 - r.d; r.g.rotation.z = Math.sin(T * 2 + k) * 0.04;
            if (r.d >= L && winner == null) { winner = k; Sound.play('win'); ctx.done = true; }
          });
          const lead = Math.max(...rafts.map(r => r.d)); camera.position.set(0, 10, 22 - lead); camera.lookAt(0, 0, 2 - lead - 6);
          if (T > 45) { winner = rafts[0].d > rafts[1].d ? 0 : 1; ctx.done = true; }
        },
        idle() { const lead = Math.max(...rafts.map(r => r.d)); camera.position.set(0, 10, 22 - lead); camera.lookAt(0, 0, -4 - lead); },
        hud(c, W, H) { rafts.forEach((r, k) => text(c, Math.min(L, Math.round(r.d)) + ' / ' + L + ' m', k ? W * 0.72 : W * 0.28, 40, 34, P[teams[k][0]].color)); },
        result() { return winner == null ? [] : teams[winner]; },
      };
    } },
  // 12 Tauziehen (2 gegen 2, schütteln)
  { id: 'tau', name: 'Lagunen-Tauziehen', type: '2v2', desc: 'Zieht das andere Team ins Wasser. Je stärker ihr schüttelt, desto kräftiger zieht ihr.', ctl: 'Handy schütteln (oder A hämmern)', pad: { shake: true, buttons: [{ b: 'A', label: 'Ziehen!' }], hint: 'Schüttle so fest du kannst!' },
    create(ctx) {
      const { scene, camera, P, teams } = ctx; beach(scene, { sandR: 26 });
      const pit = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshPhongMaterial({ color: '#29b6d8', shininess: 80 })); pit.rotation.x = -Math.PI / 2; pit.position.y = 0.04; scene.add(pit);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 18, 8).rotateZ(Math.PI / 2), toon('#d9b26f')); rope.position.y = 1; scene.add(rope);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), toon('#ff5f5f', { side: THREE.DoubleSide })); flag.position.y = 0.5; scene.add(flag);
      camera.position.set(0, 9, 17); camera.lookAt(0, 1, 0);
      let pos = 0, T = 20; const rate = P.map(() => rnd(0.9, 1.1) * [0.9, 1.05, 1.2][ctx.cpu]);
      const place = () => { teams.forEach((tm, k) => tm.forEach((i, j) => { const p = P[i], s = k ? 1 : -1; p.x = pos + s * (3.6 + j * 2.6); p.cre.root.position.set(p.x, 0, 0); p.cre.root.rotation.y = s * Math.PI / 2 * -1 + (k ? -Math.PI : 0); })); rope.position.x = pos; flag.position.set(pos, 1.6, 0); };
      place(); P.forEach(p => p.cre.root.rotation.y = p.team ? -Math.PI / 2 : Math.PI / 2);
      return {
        update(dt) {
          T -= dt;
          let f = [0, 0];
          P.forEach((p, i) => { const e = p.human ? ctx.shake(i) : (Math.random() < 0.5 ? rnd(10, 26) * rate[i] : 0); f[p.team] += e; p.anim = e > 8 ? 'walk' : 'idle'; });
          pos += (f[1] - f[0]) * 0.0018; place();
          if (Math.abs(pos) > 6) { ctx.done = true; Sound.play('splash'); }
          if (T <= 0) ctx.done = true;
        },
        hud(c, W, H) { if (!ctx.done) timerHud(c, W, H, T); const bw = Math.min(600, W * 0.6), x = W / 2 - bw / 2; c.fillStyle = P[teams[0][0]].color; c.fillRect(x, 50, bw / 2, 20); c.fillStyle = P[teams[1][0]].color; c.fillRect(x + bw / 2, 50, bw / 2, 20); c.fillStyle = '#fff'; c.fillRect(x + bw / 2 + pos / 6 * bw / 2 - 5, 42, 10, 36); },
        result() { if (Math.abs(pos) < 0.3) return []; return teams[pos > 0 ? 1 : 0]; },
      };
    } },
  // 13 Kanonen-Klippe (1 gegen 3)
  { id: 'kanone', name: 'Kanonen-Klippe', type: '1v3', desc: 'Einer schießt von der Klippe Wasserbomben, die anderen drei weichen am Strand aus.', desc1: 'Einer schießt von der Klippe Wasserbomben, die anderen drei weichen am Strand aus. Bleibt jemand trocken, gewinnt das Dreierteam.', ctl: 'Dreierteam: Steuerkreuz ◀ ▶ zum Ausweichen', ctl1: 'Kanonier: ◀ ▶ zielen, A feuern',
    pad: (i, ctx) => ctx.teams[0].includes(i) ? { dpad: true, buttons: [{ b: 'A', label: 'Feuer!' }], hint: '◀ ▶ zielen, A feuern' } : { dpad: true, hint: '◀ ▶ ausweichen' },
    create(ctx) {
      const { scene, camera, P, teams } = ctx; beach(scene, { sandR: 26 });
      camera.position.set(0, 17, 21); camera.lookAt(0, 3, -5);
      const cliff = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, 8, 10), toon('#a59a8c')); cliff.position.set(0, 4, -14); outline(cliff, 1.02); scene.add(cliff);
      const solo = P[teams[0][0]]; solo.cre.root.position.set(-1.8, 8, -13); solo.cre.root.rotation.y = 0;
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 12), toon('#3d4145')); cannon.position.set(0.8, 8.8, -12.6); cannon.rotation.x = 1.1; scene.add(cannon);
      teams[1].forEach((i, k) => { const p = P[i]; p.x = (k - 1) * 6; p.z = 2; p.cre.root.rotation.y = Math.PI; });
      const ret = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 24), new THREE.MeshBasicMaterial({ color: '#ff3b3b', side: THREE.DoubleSide })); ret.rotation.x = -Math.PI / 2; ret.position.set(0, 0.06, 2); scene.add(ret);
      let rx = 0, cool = 0, T = 25; const shots = [], cpuAim = { t: 0 };
      return {
        update(dt) {
          T -= dt; cool -= dt;
          // Kanonier
          let fire = false;
          if (solo.human) { const d = ctx.dir(solo.i).x; rx = clamp(rx + d * 13 * dt, -13, 13); fire = ctx.take(solo.i, 'A'); }
          else { const tg = teams[1].map(i => P[i]).filter(p => !p.out).sort((a, b) => Math.abs(a.x - rx) - Math.abs(b.x - rx))[0]; if (tg) { const lead = tg.vx * 1.1 * [0.2, 0.6, 0.9][ctx.cpu]; rx = lerp(rx, clamp(tg.x + lead, -13, 13), dt * [2, 3.2, 4.5][ctx.cpu]); if (Math.abs(rx - tg.x - lead) < 1 && cool <= 0) fire = true; } }
          ret.position.x = rx; cannon.rotation.z = -rx * 0.04;
          if (fire && cool <= 0) { cool = [1.3, 1.1, 0.95][ctx.cpu] * (solo.human ? 0.85 : 1); Sound.play('throw'); const m = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), toon('#4fa8ff')); scene.add(m); shots.push({ m, t: 0, x: rx, mark: (() => { const s = shadowDisc(scene, 1.6); s.position.set(rx, 0.05, 2); return s; })() }); }
          for (const s of shots) { s.t += dt / 1.1; const k = Math.min(1, s.t); s.m.position.set(lerp(0.8, s.x, k), lerp(9.5, 0.5, k) + Math.sin(k * Math.PI) * 6, lerp(-12, 2, k)); s.mark.scale.setScalar(0.5 + k);
            if (s.t >= 1 && !s.done) { s.done = true; Sound.play('splash'); scene.remove(s.m); scene.remove(s.mark); teams[1].forEach(i => { const p = P[i]; if (!p.out && Math.abs(p.x - s.x) < 1.7) { p.out = true; p.anim = 'spin'; p.vy = 8; } }); } }
          // Läufer
          teams[1].forEach(i => {
            const p = P[i]; if (p.out) { p.vy -= 20 * dt; p.y = Math.max(-3, (p.y || 0) + p.vy * dt); p.z += 6 * dt; p.cre.root.position.set(p.x, p.y, p.z); return; }
            let mx;
            if (p.human) mx = ctx.dir(i).x;
            else { const danger = shots.filter(s => !s.done && Math.abs(s.x - p.x) < 2.6 && s.t > 0.25 - ctx.cpu * 0.1); if (danger.length) mx = Math.sign(p.x - danger[0].x || (Math.random() - 0.5)); else mx = Math.abs(rx - p.x) < 2.5 && Math.random() < 0.5 ? Math.sign(p.x - rx) : (Math.abs(p.x) > 10 ? -Math.sign(p.x) * 0.5 : 0); }
            p.vx = lerp(p.vx || 0, mx * 9, dt * 10); p.x = clamp(p.x + p.vx * dt, -14, 14); p.anim = Math.abs(p.vx) > 1 ? 'walk' : 'idle'; if (Math.abs(p.vx) > 1) p.cre.root.rotation.y = p.vx > 0 ? Math.PI / 2 : -Math.PI / 2;
            p.cre.root.position.set(p.x, 0, p.z);
          });
          if (teams[1].every(i => P[i].out) || T <= 0) ctx.done = true;
        },
        hud(c, W, H) { scoreBar(c, W, H, P, p => p.team === 0 ? 'Kanonier' : p.out ? 'nass' : 'trocken'); if (!ctx.done) timerHud(c, W, H, T); },
        result() { return teams[1].every(i => P[i].out) ? teams[0] : teams[1]; },
      };
    } },
  // 14 Hai-Alarm (1 gegen 3)
  { id: 'hai', name: 'Hai-Alarm', type: '1v3', desc: 'Einer ist der Hai und jagt die drei Schwimmer in der Lagune. Wer 20 Sekunden durchhält, rettet sein Team.', desc1: 'Einer ist der Hai und jagt die drei Schwimmer. Fängt er alle in 20 Sekunden, gewinnt er.', ctl: 'Schwimmer: Steuerkreuz zum Schwimmen', ctl1: 'Hai: Steuerkreuz zum Jagen (etwas schneller)', pad: { dpad: true, hint: 'Steuerkreuz zum Schwimmen' },
    create(ctx) {
      const { scene, camera, P, teams } = ctx; beach(scene, { sand: false, palms: false });
      const ring = new THREE.Mesh(new THREE.RingGeometry(13, 18, 48), toon('#f6dfa6')); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1; scene.add(ring);
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; palm(scene, Math.cos(a) * 16, Math.sin(a) * 16, 0.9); }
      const lag = new THREE.Mesh(new THREE.CircleGeometry(13, 40), new THREE.MeshPhongMaterial({ color: '#3fc8e0', shininess: 90 })); lag.rotation.x = -Math.PI / 2; lag.position.y = -0.1; scene.add(lag);
      camera.position.set(0, 24, 18); camera.lookAt(0, 0, 0);
      const shark = P[teams[0][0]];
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 4), toon('#6c7a89')); fin.position.set(0, 2.4, -0.4); fin.scale.z = 0.3; outline(fin, 1.08); shark.cre.body.add(fin);
      shark.x = 0; shark.z = -8;
      teams[1].forEach((i, k) => { const a = k / 3 * TAU + Math.PI / 2; P[i].x = Math.cos(a) * 7; P[i].z = Math.sin(a) * 7; const fl = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.25, 8, 18), toon(P[i].color)); fl.rotation.x = Math.PI / 2; fl.position.y = 0.9; P[i].cre.body.add(fl); });
      let T = 20;
      const moveP = (p, mx, mz, sp, dt) => { p.vx = lerp(p.vx, mx * sp, dt * 6); p.vz = lerp(p.vz, mz * sp, dt * 6); p.x += p.vx * dt; p.z += p.vz * dt; const d = Math.hypot(p.x, p.z); if (d > 12.2) { p.x *= 12.2 / d; p.z *= 12.2 / d; } if (Math.hypot(p.vx, p.vz) > 0.5) p.face = Math.atan2(p.vx, p.vz); p.cre.root.position.set(p.x, -0.6, p.z); p.cre.root.rotation.y = lerp(p.cre.root.rotation.y, p.face, 0.2); p.anim = 'walk'; };
      return {
        update(dt) {
          T -= dt;
          const prey = teams[1].map(i => P[i]).filter(p => !p.out);
          if (shark.human) { const d = ctx.dir(shark.i); moveP(shark, d.x, d.z, 7.2, dt); }
          else { const tg = prey.sort((a, b) => Math.hypot(a.x - shark.x, a.z - shark.z) - Math.hypot(b.x - shark.x, b.z - shark.z))[0]; if (tg) { const dx = tg.x + tg.vx * 0.3 - shark.x, dz = tg.z + tg.vz * 0.3 - shark.z, l = Math.hypot(dx, dz) || 1; moveP(shark, dx / l, dz / l, [5.6, 6.3, 7][ctx.cpu], dt); } }
          teams[1].forEach(i => {
            const p = P[i]; if (p.out) { p.cre.root.position.y = lerp(p.cre.root.position.y, -3, 0.05); return; }
            if (p.human) { const d = ctx.dir(i); moveP(p, d.x, d.z, 6, dt); }
            else { let dx = p.x - shark.x, dz = p.z - shark.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const cx = -p.x / 12, cz = -p.z / 12; const tx = -dz, tz = dx; const wx = dx + cx * 0.9 + tx * 0.6, wz = dz + cz * 0.9 + tz * 0.6, wl = Math.hypot(wx, wz) || 1; moveP(p, wx / wl, wz / wl, [4.8, 5.4, 5.9][ctx.cpu] * (l < 7 ? 1 : 0.6), dt); }
            if (Math.hypot(p.x - shark.x, p.z - shark.z) < 1.5) { p.out = true; p.anim = 'sad'; Sound.play('splash'); }
          });
          if (teams[1].every(i => P[i].out) || T <= 0) ctx.done = true;
        },
        hud(c, W, H) { scoreBar(c, W, H, P, p => p.team === 0 ? 'Hai' : p.out ? 'gefangen' : 'frei'); if (!ctx.done) timerHud(c, W, H, T); },
        result() { return teams[1].every(i => P[i].out) ? teams[0] : teams[1]; },
      };
    } },
];

// ---------- Quiz-Bühne ----------
function quizGame(ctx, tf) {
  const { scene, camera, P } = ctx; beach(scene, { sandR: 22 });
  camera.position.set(0, 7, 17); camera.lookAt(0, 2, 0);
  const stageM = toon('#ffffff');
  placeRow(P, 2, 4.4);
  P.forEach(p => { const pod = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 1.2, 16), toon(p.color)); pod.position.set(p.x, 0.6, p.z); outline(pod, 1.03); scene.add(pod); p.cre.root.position.y = 1.2; p.cre.root.rotation.y = 0; p.lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshBasicMaterial({ color: '#555' })); p.lamp.position.set(p.x, 3.9, p.z); scene.add(p.lamp); });
  const back = new THREE.Mesh(new THREE.BoxGeometry(22, 8, 0.6), stageM); back.position.set(0, 4, -5); scene.add(back);
  const pool = tf ? shuffle(TRUEFALSE).slice(0, 8) : shuffle(QUIZ).slice(0, 6);
  const ANS_T = tf ? 7 : 12;
  let k = -1, phase = 'next', t = 0.5, first = null, order = 0; const cols = ['#e5242f', '#1b9fd6', '#2eaa4f', '#f0a500'];
  let cur = null;
  const next = () => {
    k++; if (k >= pool.length) { ctx.done = true; return; }
    const q = pool[k];
    cur = tf ? { q: q.q, o: ['Wahr', 'Falsch'], a: q.a ? 0 : 1 } : (() => { const idx = shuffle([0, 1, 2, 3]); return { q: q.q, o: idx.map(i => q.o[i]), a: idx.indexOf(q.a) }; })();
    phase = 'ask'; t = ANS_T; first = null; order = 0;
    P.forEach((p, i) => { p.ans = null; p.at = 0; p.lamp.material.color.set('#555'); ctx.clear(i); p.cpuT = rnd(1.5, ANS_T - 2); p.cpuA = Math.random() < [0.5, 0.65, 0.8][ctx.cpu] ? cur.a : pick([0, 1, 2, 3].slice(0, cur.o.length).filter(x => x !== cur.a));
      if (tf) ctx.pad(i, { title: 'Wahr oder Falsch', hint: cur.q, buttons: [{ b: 'Q1', label: 'Wahr', color: '#2eaa4f' }, { b: 'Q2', label: 'Falsch', color: '#e5242f' }] });
      else ctx.pad(i, { title: 'Frage ' + (k + 1), hint: cur.q, quiz: true, labels: cur.o }); });
    Sound.play('event');
  };
  return {
    update(dt) {
      t -= dt;
      if (phase === 'next' && t <= 0) next();
      else if (phase === 'ask') {
        P.forEach((p, i) => {
          if (p.ans != null) return;
          let a = null;
          if (p.human) { const n = ctx.takeAny(i, ['Q1', 'Q2', 'Q3', 'Q4']); if (n) a = +n.slice(1) - 1; }
          else if (ANS_T - t > p.cpuT) a = p.cpuA;
          if (a != null && a < cur.o.length) { p.ans = a; p.at = ++order; p.lamp.material.color.set('#ffd23d'); Sound.play('select'); }
        });
        if (t <= 0 || P.every(p => p.ans != null)) {
          phase = 'reveal'; t = 2.6;
          const right = P.filter(p => p.ans === cur.a).sort((a, b) => a.at - b.at);
          right.forEach((p, j) => { p.score += tf ? (j === 0 ? 2 : 1) : (j === 0 ? 2 : 1); p.anim = 'happy'; p.lamp.material.color.set('#5fcf5a'); });
          P.forEach(p => { if (p.ans !== cur.a) { p.anim = 'sad'; p.lamp.material.color.set('#ff5f5f'); } });
          Sound.play(right.length ? 'win' : 'buzz');
        }
      } else if (phase === 'reveal' && t <= 0) { P.forEach(p => p.anim = 'idle'); phase = 'next'; t = 0.3; }
    },
    hud(c, W, H) {
      scoreBar(c, W, H, P, p => p.score + ' Punkte', { bottom: true });
      if (!cur) return;
      const bw = Math.min(1000, W - 60), x = W / 2 - bw / 2;
      c.fillStyle = 'rgba(255,250,240,.96)'; c.beginPath(); c.roundRect(x, 18, bw, tf ? 120 : 230, 24); c.fill(); c.lineWidth = 5; c.strokeStyle = '#f2b705'; c.stroke();
      c.fillStyle = '#9a7b45'; c.font = '900 18px Nunito, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText((tf ? 'Behauptung ' : 'Frage ') + (k + 1) + ' / ' + pool.length, x + 22, 30);
      c.textAlign = 'right'; c.fillText(phase === 'ask' ? Math.ceil(t) + ' s' : '', x + bw - 22, 30);
      c.fillStyle = '#5c4314'; c.font = '900 30px Nunito, sans-serif'; c.textAlign = 'center';
      wrap(c, cur.q, W / 2, 60, bw - 50, 36);
      if (!tf) cur.o.forEach((o, j) => { const ox = x + 22 + (j % 2) * (bw / 2 - 11), oy = 130 + Math.floor(j / 2) * 52, ow = bw / 2 - 33; const show = phase === 'reveal';
        c.fillStyle = show ? (j === cur.a ? '#5fcf5a' : 'rgba(0,0,0,.08)') : cols[j]; c.beginPath(); c.roundRect(ox, oy, ow, 44, 14); c.fill();
        c.fillStyle = show && j !== cur.a ? '#9a7b45' : '#fff'; c.font = '900 22px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o, ox + ow / 2, oy + 23); });
      else if (phase === 'reveal') { c.fillStyle = cur.a === 0 ? '#2eaa4f' : '#e5242f'; c.font = '900 26px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(cur.a === 0 ? 'Stimmt!' : 'Stimmt nicht!', W / 2, 108); }
    },
    result() { return bestOf(P); },
    summary() { return P.map(p => p.name + ' ' + p.score).join(' · '); },
  };
}
function wrap(c, s, x, y, maxW, lh) {
  const words = s.split(' '); let line = '', yy = y;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, yy); line = w; yy += lh; } else line = t; }
  c.fillText(line, x, yy);
}
