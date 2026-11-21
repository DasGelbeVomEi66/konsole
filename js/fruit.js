// Obst-Kanal: Obst schneiden mit der Fernbedienung. Klassisch (3 Leben, Bomben) und Zeitmodus (60 s).
const FruitChannel = (() => {
  const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- Obstsorten ----------
  function rg(c, r, stops) { const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
  function shine(c, r) { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-r * 0.38, -r * 0.42, r * 0.28, r * 0.16, -0.6, 0, TAU); c.fill(); }
  function leaf(c, x, y, s, a) { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#4caf3c'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.5, -s * 0.45, s, 0); c.quadraticCurveTo(s * 0.5, s * 0.45, 0, 0); c.fill(); c.restore(); }
  const TYPES = [
    { id: 'melone', size: 1.38, juice: '#ff3d55',
      skin(c, r) { c.fillStyle = rg(c, r, ['#8fd15e', '#3f9a2f', '#1f5e1b']); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        c.save(); c.clip(); c.fillStyle = 'rgba(20,70,18,.65)'; for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(k * r * 0.42, 0, r * 0.1, r * 1.05, k * 0.08, 0, TAU); c.fill(); } c.restore(); shine(c, r); },
      face(c, r) { ring(c, r, '#2f7d26'); ring(c, r * 0.9, '#e9f7d0'); ring(c, r * 0.82, '#f2394f'); c.fillStyle = '#2a1414'; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; c.beginPath(); c.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.05, r * 0.09, a, 0, TAU); c.fill(); } } },
    { id: 'orange', size: 1, juice: '#ff9a1f',
      skin(c, r) { c.fillStyle = rg(c, r, ['#ffd27a', '#ff9d14', '#d96a00']); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        c.fillStyle = 'rgba(160,70,0,.18)'; for (let i = 0; i < 26; i++) { const a = i * 2.4, d = r * (0.2 + (i % 5) * 0.16); c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.035, 0, TAU); c.fill(); }
        shine(c, r); leaf(c, r * 0.05, -r * 0.95, r * 0.45, -0.5); },
      face(c, r) { ring(c, r, '#ff9d14'); ring(c, r * 0.9, '#fff1d6'); ring(c, r * 0.84, '#ffb440'); c.strokeStyle = '#fff1d6'; c.lineWidth = r * 0.05; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84); c.stroke(); } } },
    { id: 'apfel', size: 0.98, juice: '#f7e9a8',
      skin(c, r) { c.fillStyle = rg(c, r, ['#ff8a7a', '#e5242f', '#8e0f19']); c.beginPath(); c.moveTo(0, -r * 0.72); c.bezierCurveTo(r * 0.7, -r * 1.15, r * 1.25, -r * 0.2, r * 0.85, r * 0.55); c.bezierCurveTo(r * 0.6, r * 1.05, r * 0.15, r * 0.95, 0, r * 0.85); c.bezierCurveTo(-r * 0.15, r * 0.95, -r * 0.6, r * 1.05, -r * 0.85, r * 0.55); c.bezierCurveTo(-r * 1.25, -r * 0.2, -r * 0.7, -r * 1.15, 0, -r * 0.72); c.fill();
        shine(c, r); c.strokeStyle = '#6b3d16'; c.lineWidth = r * 0.12; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -r * 0.65); c.quadraticCurveTo(r * 0.05, -r * 1.0, r * 0.2, -r * 1.12); c.stroke(); leaf(c, r * 0.12, -r * 0.92, r * 0.5, -0.3); },
      face(c, r) { ring(c, r * 0.95, '#d81f2a'); ring(c, r * 0.89, '#fff6d8'); c.fillStyle = '#5a3416'; c.beginPath(); c.ellipse(-r * 0.15, 0, r * 0.07, r * 0.15, 0.3, 0, TAU); c.ellipse(r * 0.15, 0, r * 0.07, r * 0.15, -0.3, 0, TAU); c.fill(); } },
    { id: 'kiwi', size: 0.88, juice: '#9ad94f',
      skin(c, r) { c.fillStyle = rg(c, r, ['#b98a5a', '#87603a', '#5a3d22']); c.beginPath(); c.ellipse(0, 0, r * 1.08, r * 0.92, 0.2, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(60,35,15,.35)'; c.lineWidth = 1; for (let i = 0; i < 40; i++) { const a = i * 2.39, d = r * 0.9 * Math.sqrt((i + 1) / 40); c.beginPath(); c.moveTo(Math.cos(a) * d, Math.sin(a) * d); c.lineTo(Math.cos(a) * d + 2, Math.sin(a) * d + 3); c.stroke(); } shine(c, r * 0.9); },
      face(c, r) { ring(c, r, '#7a5532'); ring(c, r * 0.92, '#7fcf3a'); ring(c, r * 0.32, '#f4f9de'); c.fillStyle = '#1d1a10'; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; c.beginPath(); c.ellipse(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.07, r * 0.035, a, 0, TAU); c.fill(); } } },
    { id: 'zitrone', size: 0.92, juice: '#ffe84a',
      skin(c, r) { c.fillStyle = rg(c, r, ['#fffbb0', '#ffe22e', '#d1aa00']); c.beginPath(); c.ellipse(0, 0, r * 1.15, r * 0.88, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(r * 1.12, 0, r * 0.16, r * 0.12, 0, 0, TAU); c.ellipse(-r * 1.12, 0, r * 0.16, r * 0.12, 0, 0, TAU); c.fill(); shine(c, r); },
      face(c, r) { ring(c, r, '#f5d400'); ring(c, r * 0.9, '#fffbe6'); ring(c, r * 0.84, '#fff27a'); c.strokeStyle = '#fffbe6'; c.lineWidth = r * 0.05; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84); c.stroke(); } } },
    { id: 'pflaume', size: 0.82, juice: '#a8389a',
      skin(c, r) { c.fillStyle = rg(c, r, ['#c27ae8', '#7a2fa8', '#3e135e']); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(40,10,60,.4)'; c.lineWidth = r * 0.06; c.beginPath(); c.arc(-r * 0.25, 0, r * 0.9, -0.9, 0.9); c.stroke(); shine(c, r); },
      face(c, r) { ring(c, r, '#5a1d82'); ring(c, r * 0.9, '#ffcf5a'); c.fillStyle = '#9a5a22'; c.beginPath(); c.ellipse(0, 0, r * 0.35, r * 0.25, 0, 0, TAU); c.fill(); } },
  ];
  function ring(c, r, col) { c.fillStyle = col; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); }
  function drawFace(c, t, r) { c.save(); c.scale(1, 0.32); t.face(c, r * 0.97); c.restore(); }
  function drawBomb(c, r, time) {
    c.fillStyle = 'rgba(255,40,40,' + (0.25 + 0.2 * Math.sin(time * 10)) + ')'; c.beginPath(); c.arc(0, 0, r * 1.35, 0, TAU); c.fill();
    c.fillStyle = rg(c, r, ['#6b6f75', '#2a2c30', '#08090a']); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.fillStyle = '#3c3f44'; c.fillRect(-r * 0.32, -r * 1.12, r * 0.64, r * 0.3);
    c.strokeStyle = '#c9a36a'; c.lineWidth = r * 0.1; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -r * 1.1); c.quadraticCurveTo(r * 0.35, -r * 1.6, r * 0.6, -r * 1.4); c.stroke();
    const f = 0.7 + 0.3 * Math.sin(time * 40); c.fillStyle = '#fff6a0'; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, d = (i % 2 ? 0.12 : 0.3) * r * f; c.lineTo(r * 0.6 + Math.cos(a) * d, -r * 1.4 + Math.sin(a) * d); } c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.4, r * 0.25, r * 0.14, -0.6, 0, TAU); c.fill();
    c.strokeStyle = '#ff4a4a'; c.lineWidth = r * 0.12; c.beginPath(); c.moveTo(-r * 0.3, -r * 0.1); c.lineTo(r * 0.3, r * 0.5); c.moveTo(r * 0.3, -r * 0.1); c.lineTo(-r * 0.3, r * 0.5); c.stroke();
  }

  // ---------- Kachel und Vorschau ----------
  const svgFruit = (cx, cy, r, col, dark, extra = '') => `<g transform="translate(${cx} ${cy})"><circle r="${r}" fill="${col}"/><circle r="${r}" fill="url(#sh)"/><ellipse cx="${-r * .35}" cy="${-r * .4}" rx="${r * .28}" ry="${r * .16}" fill="#fff" opacity=".4" transform="rotate(-30 ${-r * .35} ${-r * .4})"/>${extra}<circle r="${r}" fill="none" stroke="${dark}" stroke-width="1.5" opacity=".5"/></g>`;
  const scene = (big) => `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">
    <defs><linearGradient id="bgF${big}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b6a52"/><stop offset="1" stop-color="#0a2c23"/></linearGradient>
    <radialGradient id="sh" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
    <style>.b1{animation:bo 2.4s ease-in-out infinite}.b2{animation:bo 2.4s ease-in-out .8s infinite}.b3{animation:bo 2.4s ease-in-out 1.6s infinite}
    @keyframes bo{0%,100%{transform:translateY(40px)}50%{transform:translateY(-14px)}}.sl{stroke-dasharray:260;animation:sl 2.4s ease-in infinite}@keyframes sl{0%,55%{stroke-dashoffset:260;opacity:1}75%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}
    @media(prefers-reduced-motion:reduce){.b1,.b2,.b3,.sl{animation:none}}</style></defs>
    <rect width="320" height="200" fill="url(#bgF${big})"/>
    <g opacity=".08" fill="#fff"><circle cx="40" cy="40" r="50"/><circle cx="270" cy="60" r="70"/><circle cx="170" cy="190" r="60"/></g>
    <g class="b1">${svgFruit(80, 95, 34, '#3f9a2f', '#1f5e1b', '<g opacity=".6" fill="#1f5e1b"><ellipse cx="-14" rx="4" ry="33"/><ellipse cx="0" rx="4" ry="34"/><ellipse cx="14" rx="4" ry="33"/></g>')}</g>
    <g class="b2">${svgFruit(165, 85, 26, '#ff9d14', '#d96a00', '<path d="M2-26 q10-10 18-4 q-8 8-18 4z" fill="#4caf3c"/>')}</g>
    <g class="b3">${svgFruit(245, 100, 24, '#e5242f', '#8e0f19', '<path d="M0-22 q2-8 6-12" stroke="#6b3d16" stroke-width="3" fill="none"/>')}</g>
    <path class="sl" d="M30 160 L290 40" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>
    ${big ? '<text x="160" y="186" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="22" fill="#fff" opacity=".95">Obst-Kanal</text>' : ''}
  </svg>`;

  // ---------- Spiel ----------
  const CSS = `.fg{position:absolute;top:0;right:0;bottom:0;left:0;background:#0a2c23;overflow:hidden}.fg canvas{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%}
  .fg-ov{position:absolute;top:0;right:0;bottom:0;left:0;display:none;place-items:center;background:rgba(5,25,20,.45)}.fg-ov.on{display:grid}
  .fg-card{background:rgba(255,255,255,.96);border-radius:30px;border:4px solid #c4c8cc;padding:30px 40px;text-align:center;width:min(860px,92vw);color:#4c5054;box-shadow:0 20px 60px rgba(0,0,0,.35)}
  .fg-card h2{margin:0 0 6px;font-size:clamp(30px,4vw,48px);font-weight:900;color:#2f7d26}.fg-card p{margin:4px 0 18px;font-weight:700;color:#7a7f84}
  .fg-modes{display:flex;gap:22px;justify-content:center;flex-wrap:wrap}.fg-mode{flex:1 1 260px;max-width:340px;padding:22px 18px;border-radius:24px;border:4px solid #c4c8cc;background:linear-gradient(#fff,#eef0f2);transition:transform .15s,border-color .15s,box-shadow .15s}
  .fg-mode b{display:block;font-size:28px;font-weight:900;color:#3d4145}.fg-mode span{display:block;font-weight:700;color:#7a7f84;margin-top:6px}.fg-mode i{display:block;font-style:normal;font-weight:800;color:#1b9fd6;margin-top:10px}
  .fg-mode.hover,.fg-btn.hover{border-color:#34bdef;box-shadow:0 0 0 5px rgba(52,189,239,.35);transform:scale(1.05)}
  .fg-btns{display:flex;gap:18px;justify-content:center;margin-top:20px;flex-wrap:wrap}.fg-btn{padding:14px 34px;border-radius:999px;border:4px solid #c4c8cc;background:linear-gradient(#fff,#eceef0);font-weight:900;font-size:22px;color:#5c6064;transition:transform .15s,border-color .15s,box-shadow .15s}
  .fg-score{font-size:clamp(60px,9vw,110px);font-weight:900;color:#2f7d26;line-height:1}.fg-rec{color:#e5242f!important;font-size:24px}`;

  function open(box, K) {
    if (!document.getElementById('fg-css')) { const s = document.createElement('style'); s.id = 'fg-css'; s.textContent = CSS; document.head.appendChild(s); }
    box.innerHTML = `<div class="fg"><canvas id="fg-bg"></canvas><canvas id="fg-st"></canvas><canvas id="fg-c"></canvas>
      <div class="fg-ov on" id="fg-sel"><div class="fg-card"><h2>Obst-Kanal</h2><p>Schwing die Fernbedienung schnell durch das Obst. Bomben meiden.</p>
        <div class="fg-modes"><button class="hv fg-mode" data-m="classic"><b>Klassisch</b><span>3 Leben. Fällt Obst herunter, ist ein Leben weg. Eine Bombe beendet das Spiel.</span><i id="fg-b1"></i></button>
        <button class="hv fg-mode" data-m="time"><b>Zeitmodus</b><span>60 Sekunden, so viel wie möglich. Eine Bombe kostet 10 Punkte.</span><i id="fg-b2"></i></button></div>
        <div class="fg-btns"><button class="hv fg-btn" id="fg-back">Zurück zum Menü</button></div></div></div>
      <div class="fg-ov" id="fg-over"><div class="fg-card"><h2 id="fg-ot">Spiel vorbei</h2><div class="fg-score" id="fg-os">0</div><p id="fg-ob"></p>
        <div class="fg-btns"><button class="hv fg-btn" id="fg-again">Nochmal</button><button class="hv fg-btn" id="fg-modes">Modus wählen</button><button class="hv fg-btn" id="fg-menu">Menü</button></div></div></div></div>`;
    const q = s => box.querySelector(s);
    const cv = q('#fg-c'), c = cv.getContext('2d'), bg = q('#fg-bg'), st = q('#fg-st'), sc = st.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    function resize() {
      dpr = Math.min(2, devicePixelRatio || 1); W = box.clientWidth; H = box.clientHeight;
      [cv, bg, st].forEach(e => { e.width = W * dpr; e.height = H * dpr; });
      c.setTransform(dpr, 0, 0, dpr, 0, 0); sc.setTransform(dpr, 0, 0, dpr, 0, 0);
      const b = bg.getContext('2d'); b.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#17614b'); g.addColorStop(1, '#082219'); b.fillStyle = g; b.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) { b.fillStyle = `rgba(190,255,210,${rnd(0.02, 0.06)})`; b.beginPath(); b.arc(rnd(0, W), rnd(0, H), rnd(40, 180), 0, TAU); b.fill(); }
      b.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 9; i++) { b.save(); b.translate(rnd(0, W), H + 20); b.rotate(rnd(-0.6, 0.6)); b.beginPath(); b.ellipse(0, -H * 0.25, W * 0.04, H * 0.3, 0, 0, TAU); b.fill(); b.restore(); }
      const v = b.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); b.fillStyle = v; b.fillRect(0, 0, W, H);
    }
    resize(); addEventListener('resize', resize);

    const best = { classic: K.store.get('kk-best-classic', 0), time: K.store.get('kk-best-time', 0) };
    const showBest = () => { q('#fg-b1').textContent = 'Rekord: ' + best.classic; q('#fg-b2').textContent = 'Rekord: ' + best.time; };
    showBest();

    let state = 'select', mode = 'classic', paused = false, closed = false;
    let items = [], pieces = [], parts = [], texts = [], misses = [], blade = [];
    let score = 0, lives = 3, timeLeft = 60, wave = 1, spawnQ = [], tGame = 0, shake = 0, flash = 0, boomT = 0, readyT = 0;
    let combo = 0, lastSlice = -1, last = { x: K.cursor.x, y: K.cursor.y };
    const g = () => H * 1.5;

    function spawn(kind) {
      const t = TYPES[Math.floor(Math.random() * TYPES.length)];
      const r = H * 0.058 * (kind === 'bomb' ? 1 : t.size);
      const x = W * rnd(0.18, 0.82), h = H * rnd(0.5, 0.85), vy = -Math.sqrt(2 * g() * h), T = 2 * -vy / g();
      const tx = W * 0.5 + rnd(-0.25, 0.25) * W;
      items.push({ kind, t, r, x, y: H + r * 1.2, vx: (tx - x) / T * 0.9, vy, rot: rnd(0, TAU), vr: rnd(-3, 3) });
      if (kind === 'bomb') Sound.play('fuse');
    }
    function queueWave() {
      if (state === 'select') { spawnQ.push({ d: 0, k: 'fruit' }); wave = 1.6; return; }
      const lvl = Math.min(4, 1 + Math.floor(score / (mode === 'time' ? 10 : 14)));
      const n = 1 + Math.floor(Math.random() * lvl);
      const bombP = mode === 'time' ? 0.18 : Math.min(0.26, 0.08 + score * 0.004);
      let bombs = 0;
      for (let i = 0; i < n; i++) {
        const isB = tGame > 3 && bombs === 0 && Math.random() < bombP;
        if (isB) bombs++;
        spawnQ.push({ d: i * rnd(0.12, 0.3), k: isB ? 'bomb' : 'fruit' });
      }
      wave = mode === 'time' ? rnd(0.75, 1.15) : Math.max(0.95, 2.1 - score * 0.02) * rnd(0.85, 1.15);
    }

    function start(m) {
      mode = m; state = 'ready'; readyT = 1.2; score = 0; lives = 3; timeLeft = 60; tGame = 0; wave = 1.2;
      items = []; pieces = []; misses = []; spawnQ = []; combo = 0;
      q('#fg-sel').classList.remove('on'); q('#fg-over').classList.remove('on');
      sc.clearRect(0, 0, W, H); Sound.play('go');
    }
    function gameOver() {
      state = 'over';
      const rec = score > best[mode];
      if (rec) { best[mode] = score; K.store.set('kk-best-' + mode, score); }
      q('#fg-ot').textContent = mode === 'time' ? 'Zeit abgelaufen' : 'Spiel vorbei';
      q('#fg-os').textContent = score;
      q('#fg-ob').textContent = rec ? 'Neuer Rekord!' : 'Rekord: ' + best[mode];
      q('#fg-ob').classList.toggle('fg-rec', rec);
      setTimeout(() => { if (state === 'over' && !closed) { q('#fg-over').classList.add('on'); Sound.play(rec ? 'record' : 'over'); } }, 600);
      showBest();
    }
    box.querySelectorAll('.fg-mode').forEach(b => b.addEventListener('click', () => start(b.dataset.m)));
    q('#fg-back').addEventListener('click', () => K.closeChannel());
    q('#fg-menu').addEventListener('click', () => K.closeChannel());
    q('#fg-again').addEventListener('click', () => start(mode));
    q('#fg-modes').addEventListener('click', () => { state = 'select'; items = []; q('#fg-over').classList.remove('on'); q('#fg-sel').classList.add('on'); });

    function splat(x, y, col, n, r) {
      for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(60, 380); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: rnd(0.4, 0.9), max: 0.9, col, size: rnd(2, 6) * (r / 30) }); }
      sc.globalAlpha = 0.55; sc.fillStyle = col;
      for (let i = 0; i < 7; i++) { sc.beginPath(); sc.arc(x + rnd(-r, r) * 1.2, y + rnd(-r, r) * 1.2, rnd(r * 0.15, r * 0.55), 0, TAU); sc.fill(); }
      sc.globalAlpha = 1;
    }
    function floatText(x, y, text, col, size) { texts.push({ x, y, text, col, size, life: 1.1 }); }

    function sliceItem(it, ang) {
      it.dead = true;
      const scoring = state === 'play';
      if (it.kind === 'bomb') {
        Sound.play('boom'); flash = 1; shake = 0.6; splat(it.x, it.y, '#ffb347', 30, it.r); splat(it.x, it.y, '#444', 20, it.r);
        if (!scoring) return;
        if (mode === 'classic') { state = 'boom'; boomT = 1.1; }
        else { score = Math.max(0, score - 10); floatText(it.x, it.y, '−10', '#ff5a5a', 46); }
        return;
      }
      Sound.play('slice'); setTimeout(() => Sound.play('splat'), 40);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      [-1, 1].forEach(sd => pieces.push({ t: it.t, r: it.r, x: it.x, y: it.y, vx: it.vx + nx * sd * 90, vy: it.vy * 0.4 + ny * sd * 90 - 40, rot: ang, vr: sd * rnd(2, 5), side: sd, life: 3 }));
      splat(it.x, it.y, it.t.juice, 16, it.r);
      if (!scoring) return;
      score++;
      const now = tGame;
      if (now - lastSlice < 0.2) combo++; else { finishCombo(); combo = 1; }
      lastSlice = now; comboPos = { x: it.x, y: it.y };
    }
    let comboPos = { x: 0, y: 0 };
    function finishCombo() {
      if (combo >= 3) { score += combo; floatText(comboPos.x, comboPos.y - 40, combo + 'er-Kombo +' + combo, '#ffe84a', 40); Sound.play('combo', combo); }
      combo = 0;
    }

    function segDist(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
      const x = ax + t * dx - px, y = ay + t * dy - py; return Math.sqrt(x * x + y * y);
    }

    function update(dt) {
      const active = state === 'play' || state === 'select';
      const cx = K.cursor.x, cy = K.cursor.y, now = performance.now() / 1000;
      // Klinge
      blade.push({ x: cx, y: cy, t: now }); while (blade.length && now - blade[0].t > 0.14) blade.shift();
      const dx = cx - last.x, dy = cy - last.y, dist = Math.hypot(dx, dy), speed = dist / Math.max(dt, 0.001);
      if (active && speed > H * 0.75 && dist > 2) {
        const ang = Math.atan2(dy, dx);
        for (const it of items) if (!it.dead && segDist(it.x, it.y, last.x, last.y, cx, cy) < it.r * 1.1) sliceItem(it, ang);
      }
      last = { x: cx, y: cy };
      if (state === 'play' && combo && tGame - lastSlice > 0.2) finishCombo();

      if (state === 'ready') { readyT -= dt; if (readyT <= 0) state = 'play'; }
      if (state === 'play' || state === 'select') {
        tGame += dt; wave -= dt; if (wave <= 0) queueWave();
        for (const s of spawnQ) { s.d -= dt; if (s.d <= 0) { spawn(s.k); s.done = true; } }
        spawnQ = spawnQ.filter(s => !s.done);
        if (state === 'play' && mode === 'time') {
          const before = Math.ceil(timeLeft); timeLeft -= dt;
          if (Math.ceil(timeLeft) !== before && timeLeft < 5.5 && timeLeft > 0) Sound.play('tick');
          if (timeLeft <= 0) { timeLeft = 0; finishCombo(); gameOver(); }
        }
      }
      if (state === 'boom') { boomT -= dt; if (boomT <= 0) gameOver(); }

      const G = g();
      for (const it of items) {
        if (it.dead) continue;
        it.vy += G * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
        if (it.vy > 0 && it.y > H + it.r * 1.5) {
          it.dead = true;
          if (it.kind === 'fruit' && state === 'play' && mode === 'classic') {
            lives--; misses.push({ x: Math.max(40, Math.min(W - 40, it.x)), life: 1.4 }); Sound.play('miss');
            if (lives <= 0) { finishCombo(); gameOver(); }
          }
        }
      }
      items = items.filter(i => !i.dead);
      for (const p of pieces) { p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt; }
      pieces = pieces.filter(p => p.life > 0 && p.y < H + p.r * 3);
      for (const p of parts) { p.vy += G * 0.6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      parts = parts.filter(p => p.life > 0);
      for (const t of texts) { t.y -= 40 * dt; t.life -= dt; } texts = texts.filter(t => t.life > 0);
      for (const m of misses) m.life -= dt; misses = misses.filter(m => m.life > 0);
      shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt * 1.5);
      // Flecken verblassen langsam
      sc.globalCompositeOperation = 'destination-out'; sc.fillStyle = `rgba(0,0,0,${dt * 0.35})`; sc.fillRect(0, 0, W, H); sc.globalCompositeOperation = 'source-over';
    }

    function txt(s, x, y, size, col, align = 'left') {
      c.font = `900 ${size}px Nunito, sans-serif`; c.textAlign = align; c.textBaseline = 'top';
      c.lineWidth = size * 0.16; c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineJoin = 'round'; c.strokeText(s, x, y); c.fillStyle = col; c.fillText(s, x, y);
    }
    function render(time) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      if (shake > 0) c.translate(rnd(-1, 1) * shake * 30, rnd(-1, 1) * shake * 30);
      for (const p of pieces) {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.beginPath(); c.rect(-p.r * 2, p.side < 0 ? -p.r * 2 : 0, p.r * 4, p.r * 2); c.clip();
        c.globalAlpha = Math.min(1, p.life); p.t.skin(c, p.r); drawFace(c, p.t, p.r); c.restore();
      }
      for (const it of items) { c.save(); c.translate(it.x, it.y); c.rotate(it.rot); it.kind === 'bomb' ? drawBomb(c, it.r, time) : it.t.skin(c, it.r); c.restore(); }
      for (const p of parts) { c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      // Klinge
      if (blade.length > 2) {
        for (let i = 1; i < blade.length; i++) {
          const a = blade[i - 1], b = blade[i], w = (i / blade.length) * H * 0.016;
          c.strokeStyle = 'rgba(200,240,255,.5)'; c.lineWidth = w * 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
          c.strokeStyle = '#fff'; c.lineWidth = w; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
        }
      }
      for (const t of texts) { c.globalAlpha = Math.min(1, t.life * 2); txt(t.text, t.x, t.y, t.size, t.col, 'center'); }
      c.globalAlpha = 1;
      for (const m of misses) { c.globalAlpha = Math.min(1, m.life); c.strokeStyle = '#ff3b3b'; c.lineWidth = 9; c.lineCap = 'round'; const s = 22, y = H - 50; c.beginPath(); c.moveTo(m.x - s, y - s); c.lineTo(m.x + s, y + s); c.moveTo(m.x + s, y - s); c.lineTo(m.x - s, y + s); c.stroke(); }
      c.globalAlpha = 1;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (state !== 'select') {
        const fs = Math.max(34, H * 0.075);
        txt(String(score), 28, 20, fs, '#ffe36b');
        txt('Rekord ' + best[mode], 30, 24 + fs, fs * 0.38, '#ffffff');
        if (mode === 'classic') {
          for (let i = 0; i < 3; i++) { const lost = i < 3 - lives, x = W - 40 - i * 58, y = 50, s = 18 + (lost ? 3 : 0);
            c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 13; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x + s, y + s); c.moveTo(x + s, y - s); c.lineTo(x - s, y + s); c.stroke();
            c.strokeStyle = lost ? '#ff3b3b' : 'rgba(255,255,255,.55)'; c.lineWidth = 8; c.stroke(); }
        } else {
          const tl = Math.ceil(timeLeft), s = '0:' + String(tl).padStart(2, '0');
          txt(tl >= 60 ? '1:00' : s, W / 2, 18, fs, timeLeft < 10 ? '#ff6b6b' : '#ffffff', 'center');
        }
      }
      if (state === 'ready') { const k = readyT > 0.6 ? 'Bereit?' : 'Los!'; txt(k, W / 2, H * 0.4, H * 0.12, '#ffffff', 'center'); }
      if (paused) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, W, H); }
      if (flash > 0) { c.fillStyle = `rgba(255,255,255,${flash * 0.85})`; c.fillRect(0, 0, W, H); }
    }

    return {
      onFrame(dt, t) { if (paused) return; update(dt); render(t / 1000); },
      onPause(p) { paused = p; if (!p) last = { x: K.cursor.x, y: K.cursor.y }; render(performance.now() / 1000); },
      onButton(name, down) {
        if ((state === 'play' || state === 'ready') && (name === 'B' || name === 'A')) return true; // im Spiel nicht versehentlich verlassen
        return false;
      },
      close() { closed = true; removeEventListener('resize', resize); },
    };
  }

  return { id: 'obst', name: 'Obst-Kanal', music: 'game', tile: el => el.innerHTML = scene(0), preview: el => el.innerHTML = scene(1), open };
})();
