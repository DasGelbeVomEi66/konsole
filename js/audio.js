// Klang: Effekte und zwei selbst komponierte Musikstücke, alles mit der Web Audio API erzeugt.
const Sound = (() => {
  let ctx = null, master, music, sfx, verb;
  const s = { vol: 0.8, music: true };
  try { Object.assign(s, JSON.parse(localStorage.getItem('kk-sound') || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem('kk-sound', JSON.stringify(s)); } catch (e) {} };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = s.vol; master.connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = s.music ? 0.55 : 0; music.connect(master);
    sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    // kleiner Hall aus kurzem Rauschimpuls
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 1.6, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = buf; const vg = ctx.createGain(); vg.gain.value = 0.22; verb.connect(vg); vg.connect(master);
  }

  function env(g, t, a, peak, dur, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(0.0001, t + dur, rel);
  }
  function osc(type, freq, t, dur, vol, dest, opt = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + (opt.glide || dur));
    if (opt.detune) o.detune.value = opt.detune;
    env(g, t, opt.a || 0.005, vol, dur, opt.rel || 0.08);
    let out = g;
    if (opt.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.lp; f.Q.value = opt.q || 0.7; g.connect(f); out = f; }
    o.connect(g); out.connect(dest);
    if (opt.wet) out.connect(verb);
    o.start(t); o.stop(t + dur + (opt.rel || 0.08) * 6);
  }
  let noiseBuf = null;
  function noise(t, dur, vol, dest, opt = {}) {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = opt.type || 'bandpass'; f.frequency.setValueAtTime(opt.f || 2000, t); f.Q.value = opt.q || 1;
    if (opt.to) f.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
    const g = ctx.createGain(); env(g, t, opt.a || 0.003, vol, dur, opt.rel || 0.05);
    n.connect(f); f.connect(g); g.connect(dest); if (opt.wet) g.connect(verb);
    n.start(t, Math.random() * 0.5); n.stop(t + dur + (opt.rel || 0.05) * 6);
  }

  // ---------- Effekte ----------
  const fx = {
    hover() { const t = ctx.currentTime; osc('sine', 1900, t, 0.02, 0.07, sfx, { rel: 0.02 }); },
    select() { const t = ctx.currentTime; osc('sine', 880, t, 0.05, 0.18, sfx, { wet: 1 }); osc('sine', 1320, t + 0.06, 0.09, 0.16, sfx, { wet: 1 }); },
    back() { const t = ctx.currentTime; osc('sine', 1100, t, 0.05, 0.15, sfx); osc('sine', 740, t + 0.06, 0.08, 0.14, sfx); },
    open() { const t = ctx.currentTime; [60, 64, 67, 72].forEach((m, i) => osc('triangle', mtof(m + 12), t + i * 0.05, 0.12, 0.12, sfx, { wet: 1 })); },
    boot() { const t = ctx.currentTime; [48, 55, 60, 64, 67, 72].forEach((m, i) => osc('sine', mtof(m + 12), t + i * 0.11, 0.9, 0.1, sfx, { a: 0.02, rel: 0.4, wet: 1 })); },
    connect() { const t = ctx.currentTime; [72, 76, 79, 84].forEach((m, i) => osc('sine', mtof(m), t + i * 0.07, 0.1, 0.14, sfx, { wet: 1 })); },
    slice() { const t = ctx.currentTime; noise(t, 0.12, 0.35, sfx, { type: 'bandpass', f: 5000, to: 1200, q: 1.5 }); },
    splat() { const t = ctx.currentTime; noise(t, 0.08, 0.4, sfx, { type: 'lowpass', f: 900, to: 300 }); osc('sine', 180, t, 0.08, 0.25, sfx, { to: 70 }); },
    combo(n) { const t = ctx.currentTime; for (let i = 0; i < Math.min(n, 6); i++) osc('square', mtof(72 + [0, 4, 7, 12, 16, 19][i]), t + i * 0.06, 0.07, 0.06, sfx, { lp: 3000, wet: 1 }); },
    fuse() { const t = ctx.currentTime; noise(t, 0.3, 0.05, sfx, { type: 'highpass', f: 6000 }); },
    boom() { const t = ctx.currentTime; noise(t, 1.2, 0.9, sfx, { type: 'lowpass', f: 1800, to: 60, rel: 0.3 }); osc('sine', 120, t, 0.6, 0.6, sfx, { to: 30 }); },
    miss() { const t = ctx.currentTime; osc('sawtooth', 220, t, 0.18, 0.1, sfx, { to: 110, lp: 900 }); },
    go() { const t = ctx.currentTime; osc('square', mtof(67), t, 0.08, 0.08, sfx, { lp: 2500 }); osc('square', mtof(79), t + 0.1, 0.2, 0.08, sfx, { lp: 2500, wet: 1 }); },
    over() { const t = ctx.currentTime; [67, 64, 60, 55].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.16, 0.2, 0.14, sfx, { wet: 1 })); },
    record() { const t = ctx.currentTime; [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.07, 0.14, 0.12, sfx, { wet: 1 })); },
    tick() { const t = ctx.currentTime; osc('sine', 1400, t, 0.03, 0.12, sfx); },
  };

  // ---------- Musik ----------
  // Menü: ruhiger Lounge-Groove, 8 Takte. Spiel: treibender Beat in a-Moll.
  const M = [[0,76,3],[3,79,2],[6,81,4],[10,84,2],[12,81,2],[14,79,2],[16,79,4],[20,76,2],[22,74,2],[24,76,6],
    [32,77,3],[35,76,1],[36,74,2],[38,72,2],[40,69,4],[44,72,2],[46,74,2],[48,71,4],[52,74,2],[54,77,2],[56,76,6],[62,74,2],
    [64,72,3],[67,76,2],[70,79,4],[74,84,2],[76,83,2],[78,79,2],[80,81,4],[84,79,2],[86,76,2],[88,72,6],
    [96,74,3],[99,77,2],[102,81,4],[106,79,2],[108,77,2],[110,76,2],[112,74,6],[118,71,2],[120,67,4],[124,74,4]];
  const melody = {}; M.forEach(([st, n, l]) => melody[st] = [n, l]);
  const menuChords = [[53,57,60,64],[52,55,59,62],[50,53,57,60],[53,55,59,62],[48,52,55,59],[48,52,57,60],[50,53,57,60],[53,55,59,62]];
  const menuBass = [41, 40, 38, 43, 36, 45, 38, 43];
  const tracks = {
    menu: { bpm: 94, len: 128, swing: 0.16, play(st, t, d) {
      const bar = st >> 4, s = st & 15, ch = menuChords[bar];
      if (s === 0 || s === 7) ch.forEach(n => ep(n, t, s === 0 ? d * 6 : d * 2, 0.045));
      if (s === 0) bass(menuBass[bar], t, d * 5); if (s === 6) bass(menuBass[bar] + 7, t, d * 3); if (s === 10) bass(menuBass[bar] + 12, t, d * 3);
      if (s % 2 === 0) noise(t, 0.03, s % 4 === 2 ? 0.05 : 0.025, music, { type: 'highpass', f: 8000 });
      if (s === 4 || s === 12) noise(t, 0.06, 0.06, music, { type: 'bandpass', f: 1800, q: 0.8 });
      const m = melody[st]; if (m) { osc('sine', mtof(m[0]), t, d * m[1] * 0.9, 0.09, music, { a: 0.01, rel: 0.12, wet: 1 }); osc('triangle', mtof(m[0] + 12), t, d * m[1] * 0.5, 0.02, music, { rel: 0.08 }); }
    } },
    game: { bpm: 128, len: 64, swing: 0, play(st, t, d) {
      const bar = st >> 4, s = st & 15, roots = [57, 53, 48, 55], r = roots[bar];
      if (s % 4 === 0) { osc('sine', 150, t, 0.12, 0.5, music, { to: 45, glide: 0.12 }); }
      if (s === 4 || s === 12) noise(t, 0.1, 0.18, music, { type: 'bandpass', f: 2200, q: 0.7 });
      noise(t, 0.02, s % 2 ? 0.03 : 0.05, music, { type: 'highpass', f: 9000 });
      if (s % 2 === 0) osc('triangle', mtof(r - 24 + (s % 8 === 6 ? 12 : 0)), t, d * 1.6, 0.22, music, { rel: 0.05 });
      const arp = [0, 7, 12, 15, 12, 7, 3, 7], third = (bar === 0) ? 3 : 4;
      const n = r + [0, 7, 12, 12 + third, 12, 7, third, 7][s % 8];
      if (s % 2 === 0 || s % 8 === 5) osc('square', mtof(n), t, d * 0.7, 0.035, music, { lp: 1800 + 900 * Math.sin(st / 10), rel: 0.05, wet: 1 });
      void arp;
    } },
  };
  function ep(n, t, dur, v) { osc('sine', mtof(n), t, dur, v, music, { a: 0.008, rel: 0.25 }); osc('sine', mtof(n) * 2.01, t, dur * 0.3, v * 0.3, music, { rel: 0.1 }); }
  function bass(n, t, dur) { osc('triangle', mtof(n), t, dur, 0.2, music, { rel: 0.06 }); osc('sine', mtof(n - 12), t, dur, 0.12, music, { rel: 0.06 }); }

  let cur = null, step = 0, next = 0, timer = null;
  function playMusic(name) {
    if (!ctx) return;
    if (cur === name) return;
    cur = name; step = 0; next = ctx.currentTime + 0.1;
    if (!timer) timer = setInterval(sched, 25);
  }
  function stopMusic() { cur = null; }
  function sched() {
    if (!cur || !s.music) return;
    const tr = tracks[cur], d = 60 / tr.bpm / 4;
    while (next < ctx.currentTime + 0.15) {
      const sw = (step % 2) ? d * tr.swing : 0;
      tr.play(step, next + sw, d);
      step = (step + 1) % tr.len; next += d;
    }
  }

  return {
    init, s,
    play(name, ...a) { if (ctx && fx[name]) try { fx[name](...a); } catch (e) {} },
    music: playMusic, stopMusic,
    setVol(v) { s.vol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = s.vol; save(); },
    setMusic(on) { s.music = on; if (music) music.gain.value = on ? 0.55 : 0; if (on && ctx) next = ctx.currentTime + 0.05; save(); },
  };
})();
