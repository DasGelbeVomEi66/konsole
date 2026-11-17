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
    beep() { const t = ctx.currentTime; osc('square', 440, t, 0.25, 0.1, sfx, { lp: 2000 }); },
    beepGo() { const t = ctx.currentTime; osc('square', 880, t, 0.5, 0.12, sfx, { lp: 3000, wet: 1 }); },
    pickup() { const t = ctx.currentTime; [76, 83, 88].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.04, 0.08, 0.1, sfx, { wet: 1 })); },
    roll() { const t = ctx.currentTime; osc('square', 1200 + Math.random() * 600, t, 0.02, 0.04, sfx, { lp: 4000 }); },
    itemGet() { const t = ctx.currentTime; osc('triangle', mtof(84), t, 0.12, 0.13, sfx, { wet: 1 }); osc('triangle', mtof(91), t + 0.1, 0.2, 0.12, sfx, { wet: 1 }); },
    boost() { const t = ctx.currentTime; noise(t, 0.6, 0.35, sfx, { type: 'bandpass', f: 400, to: 3000, q: 0.8 }); osc('sawtooth', 120, t, 0.5, 0.08, sfx, { to: 400, lp: 1500 }); },
    spark() { const t = ctx.currentTime; noise(t, 0.05, 0.06, sfx, { type: 'highpass', f: 7000 }); },
    spin() { const t = ctx.currentTime; osc('sawtooth', 700, t, 0.6, 0.1, sfx, { to: 120, lp: 2000 }); noise(t, 0.3, 0.2, sfx, { type: 'lowpass', f: 1200, to: 200 }); },
    throw() { const t = ctx.currentTime; noise(t, 0.2, 0.2, sfx, { type: 'bandpass', f: 1500, to: 500 }); },
    shield() { const t = ctx.currentTime; [60, 67, 72, 79].forEach((m, i) => osc('sine', mtof(m + 12), t + i * 0.03, 0.3, 0.07, sfx, { wet: 1 })); },
    shrink() { const t = ctx.currentTime; osc('square', 1800, t, 0.7, 0.07, sfx, { to: 90, lp: 3000, wet: 1 }); },
    gold() { const t = ctx.currentTime; [72, 76, 79, 84, 88].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.05, 0.12, 0.1, sfx, { wet: 1 })); },
    ink() { const t = ctx.currentTime; noise(t, 0.35, 0.3, sfx, { type: 'lowpass', f: 600, to: 150 }); },
    lap() { const t = ctx.currentTime; osc('triangle', mtof(81), t, 0.15, 0.14, sfx, { wet: 1 }); osc('triangle', mtof(88), t + 0.15, 0.3, 0.14, sfx, { wet: 1 }); },
    finalLap() { const t = ctx.currentTime; [72, 72, 79, 84].forEach((m, i) => osc('square', mtof(m), t + i * 0.12, 0.1, 0.08, sfx, { lp: 3000, wet: 1 })); },
    finish() { const t = ctx.currentTime; [67, 72, 76, 79, 84, 79, 84].forEach((m, i) => osc('square', mtof(m), t + i * 0.11, i === 6 ? 0.6 : 0.1, 0.08, sfx, { lp: 3500, wet: 1 })); },
    coin() { const t = ctx.currentTime; osc('square', mtof(88), t, 0.05, 0.07, sfx, { lp: 5000 }); osc('square', mtof(95), t + 0.05, 0.12, 0.07, sfx, { lp: 5000, wet: 1 }); },
    coinLose() { const t = ctx.currentTime; osc('triangle', mtof(79), t, 0.08, 0.1, sfx); osc('triangle', mtof(72), t + 0.08, 0.14, 0.1, sfx); },
    step() { const t = ctx.currentTime; osc('sine', 520 + Math.random() * 60, t, 0.05, 0.12, sfx, { to: 300 }); },
    diceSpin() { const t = ctx.currentTime; osc('square', 1500 + Math.random() * 900, t, 0.015, 0.03, sfx, { lp: 5000 }); },
    diceHit() { const t = ctx.currentTime; noise(t, 0.15, 0.3, sfx, { type: 'bandpass', f: 1200, q: 0.8 }); [72, 79, 84].forEach((m, i) => osc('triangle', mtof(m), t + 0.05 + i * 0.05, 0.15, 0.12, sfx, { wet: 1 })); },
    trophy() { const t = ctx.currentTime; [60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((m, i) => osc('triangle', mtof(m + 7), t + i * 0.09, 0.2, 0.11, sfx, { wet: 1 })); },
    bad() { const t = ctx.currentTime; [55, 54, 53, 48].forEach((m, i) => osc('sawtooth', mtof(m), t + i * 0.18, 0.2, 0.06, sfx, { lp: 1200 })); },
    event() { const t = ctx.currentTime; [72, 75, 79, 82].forEach((m, i) => osc('sine', mtof(m), t + i * 0.06, 0.2, 0.1, sfx, { wet: 1 })); },
    whoosh() { const t = ctx.currentTime; noise(t, 0.4, 0.25, sfx, { type: 'bandpass', f: 300, to: 2500, q: 0.7 }); },
    fanfare() { const t = ctx.currentTime; [[67, 0], [67, 0.15], [67, 0.3], [72, 0.45], [76, 0.75], [79, 1.0]].forEach(([m, d]) => { osc('square', mtof(m), t + d, d > 0.9 ? 0.6 : 0.12, 0.07, sfx, { lp: 3000, wet: 1 }); osc('triangle', mtof(m - 12), t + d, d > 0.9 ? 0.6 : 0.12, 0.08, sfx); }); },
    win() { const t = ctx.currentTime; [72, 76, 79, 84, 88].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.08, 0.3, 0.12, sfx, { wet: 1 })); },
    buzz() { const t = ctx.currentTime; osc('sawtooth', 110, t, 0.35, 0.12, sfx, { lp: 800 }); },
    splash() { const t = ctx.currentTime; noise(t, 0.5, 0.35, sfx, { type: 'lowpass', f: 2500, to: 300 }); },
    pop() { const t = ctx.currentTime; osc('sine', 300, t, 0.08, 0.25, sfx, { to: 900, glide: 0.06 }); },
    bump() { const t = ctx.currentTime; osc('sine', 140, t, 0.08, 0.3, sfx, { to: 60 }); },
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
  // Rennmusik: schneller Dur-Groove, 8 Takte, eigene Melodie
  const RM = [[0,72,2],[2,76,2],[4,79,3],[7,81,1],[8,79,2],[10,76,2],[12,74,4],[16,76,2],[18,77,2],[20,79,2],[22,84,2],[24,83,4],[28,79,4],
    [32,77,2],[34,76,2],[36,74,3],[39,72,1],[40,74,2],[42,76,2],[44,79,4],[48,81,2],[50,79,2],[52,77,2],[54,76,2],[56,74,6],[62,71,2],
    [64,72,2],[66,76,2],[68,79,3],[71,81,1],[72,84,2],[74,86,2],[76,88,4],[80,86,2],[82,84,2],[84,81,2],[86,79,2],[88,81,4],[92,84,4],
    [96,86,3],[99,84,1],[100,81,2],[102,79,2],[104,77,4],[108,79,2],[110,81,2],[112,79,4],[116,76,2],[118,74,2],[120,72,8]];
  const raceMel = {}; RM.forEach(([st, n, l]) => raceMel[st] = [n, l]);
  const raceCh = [[48,52,55],[53,57,60],[55,59,62],[52,55,59],[57,60,64],[53,57,60],[50,53,57],[55,59,62]];
  tracks.race = { bpm: 148, len: 128, swing: 0, play(st, t, d) {
    const bar = st >> 4, s = st & 15, ch = raceCh[bar], root = ch[0] - 12;
    if (s % 4 === 0) osc('sine', 160, t, 0.1, 0.45, music, { to: 50, glide: 0.1 });
    if (s === 4 || s === 12) noise(t, 0.12, 0.2, music, { type: 'bandpass', f: 2000, q: 0.6 });
    noise(t, 0.02, s % 2 ? 0.025 : 0.045, music, { type: 'highpass', f: 9000 });
    if (s % 2 === 1) osc('triangle', mtof(root + (s % 4 === 3 ? 12 : 0)), t, d * 0.9, 0.2, music, { rel: 0.04 });
    if (s === 2 || s === 6 || s === 10 || s === 14) ch.forEach(n => osc('square', mtof(n + 12), t, d * 0.6, 0.018, music, { lp: 2400, rel: 0.04 }));
    const m = raceMel[st]; if (m) { osc('square', mtof(m[0]), t, d * m[1] * 0.85, 0.045, music, { lp: 3200, rel: 0.06, wet: 1 }); osc('triangle', mtof(m[0] - 12), t, d * m[1] * 0.85, 0.05, music, { rel: 0.06 }); }
  } };
  // Brettspiel-Musik: fröhlicher Inselgroove mit Steeldrum-artigem Klang, eigene Melodie
  const PM = [[0,79,2],[2,81,1],[3,79,1],[4,76,2],[6,72,2],[8,74,2],[10,76,4],[16,77,2],[18,79,1],[19,77,1],[20,74,2],[22,71,2],[24,72,2],[26,74,4],
    [32,76,2],[34,79,2],[36,84,3],[39,83,1],[40,81,2],[42,79,2],[44,76,4],[48,77,2],[50,76,2],[52,74,2],[54,71,2],[56,72,6],
    [64,84,2],[66,83,1],[67,81,1],[68,79,2],[70,76,2],[72,77,2],[74,79,4],[80,81,2],[82,79,1],[83,77,1],[84,76,2],[86,74,2],[88,76,6],
    [96,72,2],[98,76,2],[100,79,2],[102,84,2],[104,83,3],[107,81,1],[108,79,4],[112,77,2],[114,74,2],[116,71,2],[118,74,2],[120,72,8]];
  const partyMel = {}; PM.forEach(([st, n, l]) => partyMel[st] = [n, l]);
  const partyCh = [[48,52,55],[53,57,60],[55,59,62],[48,52,55],[57,60,64],[53,57,60],[55,59,62],[48,52,55]];
  function steel(n, t, dur, v) { osc('sine', mtof(n), t, dur, v, music, { a: 0.004, rel: 0.18, wet: 1 }); osc('sine', mtof(n) * 2.76, t, dur * 0.25, v * 0.25, music, { rel: 0.06 }); osc('sine', mtof(n) * 1.5, t, dur * 0.4, v * 0.2, music, { rel: 0.08 }); }
  tracks.party = { bpm: 112, len: 128, swing: 0.1, play(st, t, d) {
    const bar = st >> 4, s = st & 15, ch = partyCh[bar], root = ch[0] - 24;
    if (s === 0 || s === 8) osc('sine', 120, t, 0.12, 0.35, music, { to: 50, glide: 0.1 });
    if (s === 4 || s === 12) noise(t, 0.05, 0.08, music, { type: 'bandpass', f: 2500, q: 1 });
    if (s % 2 === 0) noise(t, 0.04, 0.03, music, { type: 'highpass', f: 7000 });
    if ([0, 3, 6, 8, 11, 14].includes(s)) osc('triangle', mtof(root + (s === 6 || s === 14 ? 7 : s === 11 ? 12 : 0)), t, d * 1.5, 0.2, music, { rel: 0.05 });
    if (s === 2 || s === 6 || s === 10 || s === 14) ch.forEach(n => steel(n + 12, t, d * 0.8, 0.018));
    const m = partyMel[st]; if (m) steel(m[0], t, d * m[1] * 0.9, 0.08);
  } };
  tracks.mini = { bpm: 156, len: 64, swing: 0, play(st, t, d) {
    const bar = st >> 4, s = st & 15, roots = [60, 65, 67, 62], r = roots[bar];
    if (s % 4 === 0) osc('sine', 160, t, 0.1, 0.45, music, { to: 45, glide: 0.1 });
    if (s === 4 || s === 12) noise(t, 0.1, 0.16, music, { type: 'bandpass', f: 2400, q: 0.7 });
    noise(t, 0.02, s % 2 ? 0.025 : 0.04, music, { type: 'highpass', f: 9000 });
    if (s % 2 === 0) osc('triangle', mtof(r - 24 + (s % 8 === 4 ? 12 : 0)), t, d * 1.5, 0.2, music, { rel: 0.04 });
    const n = r + [0, 4, 7, 12, 7, 4, 7, 11][s % 8];
    if (s % 2 === 1) osc('square', mtof(n), t, d * 0.6, 0.03, music, { lp: 2600, rel: 0.04, wet: 1 });
  } };
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
    // Motorgeräusch pro Spieler, Tonhöhe folgt der Geschwindigkeit
    engine(pan = 0) {
      if (!ctx) return { set() {}, stop() {} };
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      o.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 7; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0;
      o.connect(f); o2.connect(f); f.connect(g); if (p) { p.pan.value = pan; g.connect(p); p.connect(sfx); } else g.connect(sfx);
      o.start(); o2.start();
      return {
        set(speed, on) { const t = ctx.currentTime, fr = 45 + speed * 3.2; o.frequency.setTargetAtTime(fr, t, 0.05); o2.frequency.setTargetAtTime(fr * 0.5, t, 0.05); f.frequency.setTargetAtTime(300 + speed * 25, t, 0.05); g.gain.setTargetAtTime(on ? 0.035 + Math.min(speed, 40) * 0.0012 : 0, t, 0.08); },
        stop() { const t = ctx.currentTime; g.gain.setTargetAtTime(0, t, 0.05); o.stop(t + 0.3); o2.stop(t + 0.3); },
      };
    },
    setVol(v) { s.vol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = s.vol; save(); },
    setMusic(on) { s.music = on; if (music) music.gain.value = on ? 0.55 : 0; if (on && ctx) next = ctx.currentTime + 0.05; save(); },
  };
})();
