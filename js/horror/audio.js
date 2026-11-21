// Klangwelt des Horror-Kanals: Dröhnen, Regen, Gewitter, Herzschlag und räumliche Geräusche der Tiere (HRTF).
// Alles wird mit der Web Audio API synthetisiert.

export function makeAudio() {
  const S = typeof Sound !== 'undefined' ? Sound : null; if (S) S.init();
  const ctx = S && S.ctx;
  if (!ctx) { const stub = { stop() {}, set() {}, move() {} }, nop = () => stub; return new Proxy({}, { get: () => nop }); }
  const out = ctx.createGain(); out.gain.value = 0; out.connect(S.out);
  out.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(out);
  const bus = ctx.createGain(); bus.connect(comp);
  // langer, dunkler Hall
  const rev = ctx.createConvolver();
  { const len = ctx.sampleRate * 3.4, b = ctx.createBuffer(2, len, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = lp * Math.pow(1 - i / len, 2.6); } } rev.buffer = b; }
  const revG = ctx.createGain(); revG.gain.value = 0.55; rev.connect(revG); revG.connect(comp);
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const brown = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); { const d = brown.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }
  const dist = ctx.createWaveShaper(); { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / n * 2 - 1; c[i] = Math.tanh(x * 3); } dist.curve = c; }
  const now = () => ctx.currentTime;

  function src(buf = nb, loop = true) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = loop; return s; }
  function filt(type, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  function gain(v = 0) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
  function setP(p, x, y, z) { if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z); }
  function panner(pos, ref = 1.2) {
    const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = 1.3; p.maxDistance = 60;
    if (pos) setP(p, pos.x, pos.y, pos.z); p.connect(bus); const r = gain(0.35); p.connect(r); r.connect(rev); return p;
  }
  const dest = (pos, ref) => pos ? panner(pos, ref) : (() => { const g = gain(1); g.connect(bus); const r = gain(0.3); g.connect(r); r.connect(rev); return g; })();
  function env(g, t, a, peak, hold, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); }
  function burst(d, t, dur, vol, type, f, q, opt = {}) {
    const s = src(opt.brown ? brown : nb), b = filt(type, f, q), g = gain(0);
    if (opt.to) b.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
    env(g, t, opt.a || 0.002, vol, opt.hold || 0, dur); chain(s, b, g, d); s.start(t, Math.random()); s.stop(t + dur + (opt.a || 0) + (opt.hold || 0) + 0.1);
  }
  function tone(d, type, f, t, dur, vol, opt = {}) {
    const o = ctx.createOscillator(), g = gain(0); o.type = type; o.frequency.setValueAtTime(f, t);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + (opt.glide || dur));
    env(g, t, opt.a || 0.003, vol, opt.hold || 0, dur); let n = o; if (opt.lp) { const b = filt('lowpass', opt.lp, opt.q || 1); o.connect(b); n = b; }
    n.connect(g); g.connect(d); o.start(t); o.stop(t + (opt.a || 0) + (opt.hold || 0) + dur + 0.1); return o;
  }

  // ---------- Daueratmosphäre ----------
  const amb = {};
  { // Dröhnen
    const g = gain(0); g.connect(bus); const lp = filt('lowpass', 160, 2); lp.connect(g);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
    o1.type = o2.type = 'sawtooth'; o3.type = 'sine'; o1.frequency.value = 41.2; o2.frequency.value = 41.5; o3.frequency.value = 58.3;
    const g3 = gain(0); o3.connect(g3); g3.connect(g);
    o1.connect(lp); o2.connect(lp); o1.start(); o2.start(); o3.start();
    const lfo = ctx.createOscillator(), lg = gain(60); lfo.frequency.value = 0.07; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    // hohes, schwebendes Flirren für Anspannung
    const hi = gain(0); hi.connect(bus); const hr = gain(0.6); hi.connect(hr); hr.connect(rev);
    const hs = [1840, 1851, 2603].map(f => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(hi); o.start(); return o; });
    // Lüftungsrauschen
    const air = src(brown), ab = filt('bandpass', 280, 0.6), ag = gain(0); chain(air, ab, ag, bus); air.start();
    // Netzbrummen
    const hum = ctx.createOscillator(), hg = gain(0), hl = filt('lowpass', 300); hum.type = 'square'; hum.frequency.value = 50; chain(hum, hl, hg, bus); hum.start();
    amb.drone = g; amb.g3 = g3; amb.hi = hi; amb.air = ag; amb.hum = hg;
  }
  { // Regen
    const r = src(nb), hp = filt('highpass', 900), lp = filt('lowpass', 7000), g = gain(0); chain(r, hp, lp, g, bus); r.start();
    const r2 = src(brown), l2 = filt('lowpass', 500), g2 = gain(0); chain(r2, l2, g2, bus); r2.start();
    amb.rain = g; amb.rainLow = g2; amb.rainLp = lp;
  }
  // Herzschlag
  let hbRate = 0, hbNext = 0, hbVol = 0;
  // Uhr, Lampen, Radio als Dauerquellen an Positionen
  const loops = [];

  const A = {
    ctx,
    listener(p, f, u) {
      const L = ctx.listener;
      if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z; }
      else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
    },
    // tension 0..1, rain 0..1 (nah am Fenster lauter), power: Licht an/aus (Brummen)
    mood(tension, rain, power, inside = 1) {
      const t = now();
      amb.drone.gain.setTargetAtTime(0.05 + tension * 0.14, t, 1.5);
      amb.g3.gain.setTargetAtTime(tension > 0.4 ? (tension - 0.4) * 0.35 : 0, t, 2);
      amb.hi.gain.setTargetAtTime(tension > 0.55 ? (tension - 0.55) * 0.02 : 0, t, 2.5);
      amb.air.gain.setTargetAtTime(0.05 + tension * 0.04, t, 1);
      amb.hum.gain.setTargetAtTime(power ? 0.012 : 0, t, 0.05);
      amb.rain.gain.setTargetAtTime(rain * 0.07, t, 0.6); amb.rainLow.gain.setTargetAtTime(rain * 0.25, t, 0.6);
      amb.rainLp.frequency.setTargetAtTime(inside ? 2500 + rain * 3500 : 9000, t, 0.5);
    },
    heartbeat(rate, vol) { hbRate = rate; hbVol = vol; },
    tick(dt) {
      const t = now();
      if (hbRate > 0 && hbVol > 0.01) {
        if (hbNext < t) hbNext = t + 0.05;
        while (hbNext < t + 0.2) {
          const d = dest(null);
          tone(d, 'sine', 62, hbNext, 0.12, 0.55 * hbVol, { to: 38, glide: 0.1 });
          tone(d, 'sine', 55, hbNext + 0.24, 0.14, 0.4 * hbVol, { to: 34, glide: 0.12 });
          hbNext += 60 / hbRate;
        }
      }
      for (const l of loops) l.tick && l.tick(t);
    },
    // ---------- Dauerquellen ----------
    loop(kind, pos) {
      const p = panner(pos, kind === 'clock' ? 0.6 : 1); const L = { p, on: true, set(v) { L.g && L.g.gain.setTargetAtTime(v, now(), 0.02); }, move(q) { setP(p, q.x, q.y, q.z); }, stop() { L.on = false; L.g && L.g.gain.setTargetAtTime(0, now(), 0.05); if (L.s) try { L.s.stop(now() + 0.3); } catch (e) {} const i = loops.indexOf(L); if (i >= 0) loops.splice(i, 1); } };
      if (kind === 'buzz') { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100; const b = filt('bandpass', 400, 3); L.g = gain(0.012); chain(o, b, L.g, p); o.start(); L.s = o; }
      if (kind === 'static') { const s = src(nb), b = filt('bandpass', 1800, 0.7); L.g = gain(0.05); const am = gain(1); chain(s, b, am, L.g, p); s.start(); L.s = s; L.tick = t => { if (Math.random() < 0.3) am.gain.setValueAtTime(0.3 + Math.random() * 0.9, t); }; }
      if (kind === 'clock') { L.next = now(); L.tick = t => { if (!L.on || L.stopped) return; while (L.next < t + 0.1) { burst(p, L.next, 0.02, 0.25, 'bandpass', 3200, 6); tone(p, 'sine', L.alt ? 1800 : 2100, L.next, 0.02, 0.06); L.alt = !L.alt; L.next += 1; } }; }
      if (kind === 'steam') { const s2 = src(nb), hp = filt('highpass', 2500); L.g = gain(0.14); chain(s2, hp, L.g, p); s2.start(); L.s = s2; }
      if (kind === 'hum') { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120; const b = filt('bandpass', 240, 4); L.g = gain(0.02); chain(o, b, L.g, p); o.start(); L.s = o; const s2 = src(nb), b2 = filt('bandpass', 4000, 2), g2 = gain(0.008); chain(s2, b2, g2, p); s2.start(); }
      if (kind === 'gen') { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50; const b = filt('lowpass', 260); L.g = gain(0); chain(o, b, L.g, p); o.start(); L.s = o; }
      if (kind === 'rainfall') { const s = src(nb), hp = filt('highpass', 1500); L.g = gain(0.2); chain(s, hp, L.g, p); s.start(); L.s = s; }
      loops.push(L); return L;
    },
    // ---------- Einzelgeräusche ----------
    step(surface, vol = 1, pos) {
      const t = now(), d = dest(pos);
      burst(d, t, 0.09, 0.22 * vol, 'lowpass', 380, 1, { brown: 1 });
      if (surface === 'wood') { burst(d, t, 0.05, 0.05 * vol, 'bandpass', 1400, 2); if (Math.random() < 0.18) tone(d, 'sawtooth', 180 + Math.random() * 80, t + 0.02, 0.25, 0.012 * vol, { lp: 900, to: 140 }); }
      if (surface === 'tile') burst(d, t, 0.04, 0.08 * vol, 'bandpass', 2600, 2);
      if (surface === 'wet') burst(d, t + 0.01, 0.12, 0.08 * vol, 'highpass', 2500, 0.7);
    },
    claws(pos, n = 2, vol = 1) {
      const t = now(), d = panner(pos, 0.8);
      for (let i = 0; i < n; i++) { const tt = t + i * (0.07 + Math.random() * 0.03); burst(d, tt, 0.015, 0.6 * vol, 'bandpass', 3000 + Math.random() * 1500, 5); tone(d, 'sine', 1900 + Math.random() * 600, tt, 0.012, 0.08 * vol); }
      burst(d, t, 0.08, 0.12 * vol, 'lowpass', 250, 1, { brown: 1 });
    },
    breath(pos, vol = 1, big) {
      const t = now(), d = panner(pos, big ? 3 : 0.9);
      const s1 = src(nb), b1 = filt('bandpass', big ? 380 : 750, 1.6), b2 = filt('bandpass', big ? 900 : 2300, 3), g = gain(0);
      s1.connect(b1); s1.connect(b2); b1.connect(g); b2.connect(g); g.connect(d);
      const k = big ? 2 : 1;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35 * vol, t + 0.7 * k); g.gain.linearRampToValueAtTime(0.02, t + 0.9 * k);
      g.gain.linearRampToValueAtTime(0.5 * vol, t + 1.05 * k); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1 * k);
      b1.frequency.setValueAtTime(big ? 380 : 750, t); b1.frequency.linearRampToValueAtTime(big ? 260 : 520, t + 2 * k);
      s1.start(t); s1.stop(t + 2.3 * k);
      if (big) tone(d, 'sawtooth', 48, t + 1, 1.2, 0.15 * vol, { lp: 200 });
    },
    growl(pos, dur = 1.6, vol = 1, big) {
      const t = now(), d = panner(pos, big ? 3 : 1);
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(); o.type = 'sawtooth'; o2.type = 'sawtooth';
      o.frequency.setValueAtTime(big ? 42 : 78, t); o.frequency.linearRampToValueAtTime(big ? 36 : 64, t + dur); o2.frequency.value = big ? 43.5 : 81;
      const am = gain(0.6), lfo = ctx.createOscillator(), lg = gain(0.4); lfo.frequency.value = big ? 11 : 19; lfo.connect(lg); lg.connect(am.gain); lfo.start(t); lfo.stop(t + dur + 0.5);
      const f1 = filt('bandpass', big ? 260 : 520, 2), f2 = filt('lowpass', big ? 500 : 1100), g = gain(0);
      const ds = ctx.createWaveShaper(); ds.curve = dist.curve;
      o.connect(am); o2.connect(am); am.connect(ds); ds.connect(f1); ds.connect(f2);
      f1.connect(g); f2.connect(g); g.connect(d);
      env(g, t, 0.25, 0.4 * vol, dur * 0.6, dur * 0.5);
      o.start(t); o2.start(t); o.stop(t + dur * 1.3 + 0.4); o2.stop(t + dur * 1.3 + 0.4);
      burst(d, t, dur, 0.1 * vol, 'bandpass', big ? 500 : 1200, 1.2, { a: 0.3 });
    },
    hiss(pos, vol = 1) { const t = now(), d = panner(pos, 1); burst(d, t, 0.9, 0.5 * vol, 'highpass', 2600, 0.7, { a: 0.15, hold: 0.2 }); burst(d, t, 0.6, 0.2 * vol, 'bandpass', 5200, 2, { a: 0.1 }); },
    screech(pos, vol = 1) {
      const t = now(), d = pos ? panner(pos, 2) : dest(null);
      for (const [f0, f1, dt] of [[880, 1500, 0], [1240, 2100, 0.03], [640, 980, 0.05]]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t + dt); o.frequency.exponentialRampToValueAtTime(f1, t + dt + 0.25); o.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + dt + 1.1);
        const vib = ctx.createOscillator(), vg = gain(40); vib.frequency.value = 23; vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + 1.5);
        const ds = ctx.createWaveShaper(); ds.curve = dist.curve; const b = filt('bandpass', 2000, 0.8), g = gain(0);
        chain(o, ds, b, g, d); env(g, t + dt, 0.03, 0.22 * vol, 0.5, 0.7); o.start(t + dt); o.stop(t + 1.6);
      }
      burst(d, t, 1.2, 0.45 * vol, 'bandpass', 3200, 0.8, { a: 0.02, hold: 0.3 });
      A.growl(pos || { x: 0, y: 0, z: 0 }, 1.0, vol * 0.8);
    },
    roar(pos, vol = 1) {
      const t = now(), d = panner(pos, 6);
      for (const [f0, f1, ty] of [[210, 70, 'sawtooth'], [150, 52, 'sawtooth'], [104, 38, 'square']]) {
        const o = ctx.createOscillator(); o.type = ty; o.frequency.setValueAtTime(f0 * 0.7, t); o.frequency.linearRampToValueAtTime(f0, t + 0.5); o.frequency.exponentialRampToValueAtTime(f1, t + 3.2);
        const vib = ctx.createOscillator(), vg = gain(9); vib.frequency.value = 13; vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + 3.6);
        const ds = ctx.createWaveShaper(); ds.curve = dist.curve; const b = filt('lowpass', 1200, 1.5), g = gain(0);
        b.frequency.setValueAtTime(400, t); b.frequency.linearRampToValueAtTime(1600, t + 0.6); b.frequency.exponentialRampToValueAtTime(300, t + 3.2);
        chain(o, ds, b, g, d); env(g, t, 0.35, 0.3 * vol, 1.6, 1.4); o.start(t); o.stop(t + 3.8);
      }
      burst(d, t, 3, 0.4 * vol, 'bandpass', 700, 0.7, { a: 0.3, hold: 1, to: 250 });
      tone(dest(null), 'sine', 38, t, 3, 0.4 * vol, { a: 0.4, hold: 1 });
    },
    thunder(delay = 0, vol = 1) {
      const t = now() + delay, d = dest(null);
      burst(d, t, 0.3, 0.35 * vol, 'bandpass', 1800, 0.6);
      burst(d, t + 0.05, 5, 0.9 * vol, 'lowpass', 260, 0.8, { brown: 1, a: 0.15, hold: 0.6, to: 80 });
      for (let i = 0; i < 4; i++) burst(d, t + 0.4 + Math.random() * 2, 1.2, 0.4 * vol, 'lowpass', 180, 1, { brown: 1, a: 0.1 });
    },
    door(pos, kind = 'open') {
      const t = now(), d = panner(pos, 1.5);
      if (kind === 'open' || kind === 'creak') {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; const b = filt('bandpass', 1100, 8), g = gain(0); chain(o, b, g, d);
        let f = 140; for (let i = 0; i < 40; i++) { f = Math.max(80, Math.min(260, f + (Math.random() - 0.5) * 40)); o.frequency.setValueAtTime(f, t + 0.15 + i * 0.03); }
        env(g, t + 0.1, 0.1, 0.15, 0.9, 0.3); o.start(t); o.stop(t + 1.6);
      }
      if (kind === 'open' || kind === 'latch') { burst(d, t, 0.05, 0.35, 'bandpass', 2400, 3); tone(d, 'square', 900, t, 0.03, 0.04); }
      if (kind === 'slam') { burst(d, t, 0.35, 0.9, 'lowpass', 300, 1, { brown: 1 }); burst(d, t, 0.08, 0.4, 'bandpass', 1500, 1); }
      if (kind === 'locked') { for (let i = 0; i < 3; i++) { burst(d, t + i * 0.13, 0.05, 0.35, 'bandpass', 1800, 4); burst(d, t + i * 0.13, 0.08, 0.2, 'lowpass', 300, 1); } }
      if (kind === 'bang') { for (let i = 0; i < 3; i++) burst(d, t + i * 0.42 + Math.random() * 0.05, 0.4, 1, 'lowpass', 220, 1, { brown: 1 }); }
    },
    glass(pos) { const t = now(), d = panner(pos, 1.5); burst(d, t, 0.25, 0.9, 'highpass', 2500, 0.7); for (let i = 0; i < 26; i++) tone(d, 'sine', 2500 + Math.random() * 5000, t + Math.random() * 0.9, 0.06 + Math.random() * 0.15, 0.06); burst(d, t, 0.2, 0.4, 'lowpass', 400, 1); },
    metal(pos) { const t = now(), d = panner(pos, 1.5); burst(d, t, 0.2, 0.8, 'lowpass', 500, 1, { brown: 1 }); for (const f of [310, 474, 822, 1290, 1960]) tone(d, 'sine', f, t, 0.9 + Math.random(), 0.06); for (let i = 1; i < 4; i++) { burst(d, t + i * 0.18 / i + i * 0.1, 0.1, 0.25 / i, 'bandpass', 1200, 2); } },
    click(pos) { const t = now(), d = dest(pos); burst(d, t, 0.03, 0.4, 'bandpass', 2000, 3); tone(d, 'square', 1200, t, 0.015, 0.05); },
    lampClick() { const t = now(), d = dest(null); burst(d, t, 0.02, 0.35, 'bandpass', 3000, 4); burst(d, t + 0.05, 0.02, 0.2, 'bandpass', 2400, 4); },
    powerDown() { const t = now(), d = dest(null); burst(d, t, 0.4, 0.8, 'lowpass', 160, 1, { brown: 1 }); tone(d, 'sawtooth', 120, t, 1.4, 0.12, { to: 30, lp: 600 }); burst(d, t, 0.06, 0.4, 'bandpass', 2500, 2); },
    paper() { const t = now(), d = dest(null); for (let i = 0; i < 5; i++) burst(d, t + i * 0.05, 0.06, 0.12, 'bandpass', 3000 + Math.random() * 3000, 1.5); },
    pickup() { const t = now(), d = dest(null); burst(d, t, 0.04, 0.2, 'bandpass', 2500, 3); tone(d, 'sine', 1400, t + 0.03, 0.06, 0.05); },
    beep(ok) { const t = now(), d = dest(null); tone(d, 'square', ok ? 1320 : 330, t, 0.12, 0.05, { lp: 3000 }); if (ok) tone(d, 'square', 1760, t + 0.13, 0.12, 0.05, { lp: 3000 }); },
    drip(pos) { const t = now(), d = panner(pos, 0.6); tone(d, 'sine', 1200 + Math.random() * 600, t, 0.06, 0.12, { to: 2400, glide: 0.04 }); },
    vent(pos) { const t = now(), d = panner(pos, 1); for (let i = 0; i < 4; i++) { burst(d, t + i * 0.12 + Math.random() * 0.05, 0.05, 0.4, 'bandpass', 900 + Math.random() * 500, 3); } burst(d, t, 0.6, 0.15, 'lowpass', 300, 1, { brown: 1 }); },
    // Stich: dissonanter Anschwellklang bei Schreckmomenten
    sting(vol = 1, long) {
      const t = now(), d = dest(null), L = long ? 3.5 : 1.8;
      [196, 207.6, 277.2, 293.7, 415.3].forEach((f, i) => { const o = ctx.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f; const b = filt('lowpass', 300), g = gain(0); b.frequency.setValueAtTime(300, t); b.frequency.exponentialRampToValueAtTime(4000, t + L * 0.5); chain(o, b, g, d); env(g, t, L * 0.45, 0.07 * vol, 0.05, L * 0.5); o.start(t); o.stop(t + L + 0.3); });
      burst(d, t, L, 0.25 * vol, 'bandpass', 600, 0.6, { a: L * 0.45, to: 3000 });
    },
    whoosh() { const t = now(); burst(dest(null), t, 0.5, 0.3, 'bandpass', 400, 1, { a: 0.2, to: 2000 }); },
    say() {},
    // nachgeahmte Stimme: zwei Formanten auf einer Sägezahnquelle, klingt wie ein verzerrtes "Hallo?"
    mimic(pos, vol = 1) {
      const t = now(), d = pos ? panner(pos, 1) : dest(null);
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(150, t); o.frequency.linearRampToValueAtTime(175, t + 0.25); o.frequency.linearRampToValueAtTime(140, t + 0.35); o.frequency.linearRampToValueAtTime(205, t + 0.75); o.frequency.linearRampToValueAtTime(120, t + 1.0);
      const vib = ctx.createOscillator(), vg = gain(9); vib.frequency.value = 7; vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + 1.3);
      const f1 = filt('bandpass', 800, 6), f2 = filt('bandpass', 1300, 8), g = gain(0);
      f1.frequency.setValueAtTime(750, t); f1.frequency.linearRampToValueAtTime(450, t + 0.45); f1.frequency.linearRampToValueAtTime(500, t + 1);
      f2.frequency.setValueAtTime(1250, t); f2.frequency.linearRampToValueAtTime(900, t + 0.45); f2.frequency.linearRampToValueAtTime(850, t + 1);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(d);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * vol, t + 0.06); g.gain.linearRampToValueAtTime(0.15 * vol, t + 0.3); g.gain.linearRampToValueAtTime(0.5 * vol, t + 0.42); g.gain.linearRampToValueAtTime(0.35 * vol, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
      o.start(t); o.stop(t + 1.3);
      burst(d, t, 0.25, 0.12 * vol, 'highpass', 3000, 0.7, { a: 0.02 });
    },
    radio() { const t = now(), d = dest(null); burst(d, t, 0.35, 0.18, 'bandpass', 1800, 0.8, { a: 0.01 }); tone(d, 'square', 1400, t, 0.03, 0.04); burst(d, t + 0.4, 6, 0.025, 'bandpass', 2200, 0.6, { a: 0.2, hold: 4 }); },
    chime() { const t = now(), d = dest(null); [[784, 0], [659, 0.35], [523, 0.7]].forEach(([f, dt]) => { tone(d, 'sine', f, t + dt, 0.9, 0.12, { a: 0.01 }); tone(d, 'sine', f * 2, t + dt, 0.4, 0.03); }); burst(d, t, 3, 0.02, 'bandpass', 1500, 0.5, { a: 0.1, hold: 2 }); },
    slide(pos, open = true) { const t = now(), d = panner(pos, 1.5); burst(d, t, 0.6, 0.35, 'bandpass', open ? 500 : 400, 1.2, { a: 0.05, to: open ? 900 : 250 }); tone(d, 'sawtooth', 70, t, 0.6, 0.05, { lp: 300 }); burst(d, t + 0.55, 0.1, 0.4, 'lowpass', 300, 1, { brown: 1 }); },
    locker(pos, open = true) { const t = now(), d = panner(pos, 1); burst(d, t, 0.05, 0.4, 'bandpass', 2200, 3); for (const f of [420, 690, 1130]) tone(d, 'sine', f * (open ? 1 : 0.9), t + 0.02, 0.35, 0.05); burst(d, t, 0.15, 0.3, 'lowpass', 400, 1, { brown: 1 }); },
    spark(pos) { const t = now(), d = panner(pos, 0.8); for (let i = 0; i < 6; i++) burst(d, t + Math.random() * 0.25, 0.02 + Math.random() * 0.04, 0.5, 'highpass', 3000, 0.7); tone(d, 'square', 120, t, 0.2, 0.05, { lp: 2000 }); },
    alarm(on) {
      if (on && !A._al) {
        const o = ctx.createOscillator(); o.type = 'square'; const f = filt('lowpass', 1400), g = gain(0); chain(o, f, g, bus); const r = gain(0.4); g.connect(r); r.connect(rev);
        const lfo = ctx.createOscillator(), lg = gain(220); lfo.frequency.value = 0.55; lfo.connect(lg); lg.connect(o.frequency); o.frequency.value = 600; o.start(); lfo.start();
        g.gain.setTargetAtTime(0.035, now(), 0.3); A._al = { o, lfo, g };
      } else if (!on && A._al) { A._al.g.gain.setTargetAtTime(0, now(), 0.3); const a = A._al; setTimeout(() => { try { a.o.stop(); a.lfo.stop(); } catch (e) {} }, 1500); A._al = null; }
    },
    gasp() { const t = now(), d = dest(null); burst(d, t, 0.5, 0.5, 'bandpass', 900, 1.5, { a: 0.03 }); burst(d, t + 0.5, 0.8, 0.25, 'bandpass', 600, 1.2, { a: 0.1 }); },
    breathe(vol) { const t = now(), d = dest(null); burst(d, t, 0.7, 0.07 * vol, 'bandpass', 700, 1.3, { a: 0.35 }); burst(d, t + 0.9, 0.9, 0.09 * vol, 'bandpass', 500, 1.3, { a: 0.1 }); },
    rumble(vol = 1) { const t = now(); burst(dest(null), t, 3, 0.5 * vol, 'lowpass', 90, 1, { brown: 1, a: 0.5, hold: 1 }); },
    screamFar(pos) { A.screech(pos, 0.35); },
    hush() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} },
    duck(v, time = 0.3) { out.gain.setTargetAtTime(v, now(), time); },
    stop() {
      A.hush(); out.gain.setTargetAtTime(0, now(), 0.2);
      for (const l of loops.slice()) l.stop();
      setTimeout(() => { try { out.disconnect(); } catch (e) {} }, 1500);
    },
  };
  return A;
}
