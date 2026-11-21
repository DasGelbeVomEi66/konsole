// Casino-Kanal: Spielautomat "Sonnen-Slots" und Blackjack für 1 bis 4 Spieler. Nur Spielchips ohne Geldwert.
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PCOL = ['#1b9fd6', '#e5242f', '#2eaa4f', '#f0a500'];
const START = 1000;

// ---------- Chips pro Handy ----------
function wallet(K, p) { return K.store.get('cs-chips-' + p, START); }
function setWallet(K, p, v) { K.store.set('cs-chips-' + p, Math.max(0, Math.round(v))); }

// ---------- Slot-Symbole ----------
const SYM = ['cherry', 'lemon', 'orange', 'grape', 'bell', 'clover', 'diamond', 'seven'];
const WEIGHT = { cherry: 8, lemon: 7, orange: 6, grape: 5, bell: 3, clover: 2, diamond: 1, seven: 1 };
const PAY = { cherry: 12, lemon: 20, orange: 25, grape: 40, bell: 100, clover: 200, diamond: 800, seven: 1500 };
const SYM_NAME = { cherry: 'Kirschen', lemon: 'Zitrone', orange: 'Orange', grape: 'Trauben', bell: 'Glocke', clover: 'Kleeblatt', diamond: 'Diamant', seven: 'Sieben' };
const LINES = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];
const LINE_COL = ['#ffe14d', '#4fd6ff', '#ff6b9a', '#7dff9a', '#ffa64d'];
function makeStrip() { const a = []; for (const s of SYM) for (let i = 0; i < WEIGHT[s]; i++) a.push(s); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function drawSym(c, s, x, y, S) {
  c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineCap = 'round';
  const rg = (r, a, b, ox = -0.35, oy = -0.4) => { const g = c.createRadialGradient(r * ox, r * oy, r * 0.1, 0, 0, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const shine = (x2, y2, r) => { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x2, y2, r, r * 0.55, -0.6, 0, TAU); c.fill(); };
  const ol = (w = 0.035) => { c.strokeStyle = 'rgba(40,20,10,.55)'; c.lineWidth = S * w; c.stroke(); };
  switch (s) {
    case 'cherry':
      c.strokeStyle = '#3f8a2a'; c.lineWidth = S * 0.05; c.beginPath(); c.moveTo(-S * 0.18, S * 0.05); c.quadraticCurveTo(-S * 0.05, -S * 0.3, S * 0.12, -S * 0.38); c.moveTo(S * 0.2, S * 0.1); c.quadraticCurveTo(S * 0.18, -S * 0.2, S * 0.12, -S * 0.38); c.stroke();
      c.fillStyle = '#4caf3c'; c.beginPath(); c.ellipse(S * 0.22, -S * 0.36, S * 0.14, S * 0.06, -0.4, 0, TAU); c.fill();
      for (const [cx, cy] of [[-S * 0.18, S * 0.17], [S * 0.2, S * 0.22]]) { c.save(); c.translate(cx, cy); c.fillStyle = rg(S * 0.17, '#ff8a8a', '#a8001a'); c.beginPath(); c.arc(0, 0, S * 0.17, 0, TAU); c.fill(); ol(); shine(-S * 0.06, -S * 0.07, S * 0.05); c.restore(); }
      break;
    case 'lemon': c.fillStyle = rg(S * 0.36, '#fff9a8', '#e0b800'); c.beginPath(); c.ellipse(0, 0, S * 0.36, S * 0.26, -0.3, 0, TAU); c.fill(); ol(); c.beginPath(); c.ellipse(S * 0.34, -S * 0.11, S * 0.06, S * 0.04, -0.3, 0, TAU); c.fillStyle = '#e0b800'; c.fill(); shine(-S * 0.12, -S * 0.1, S * 0.08); break;
    case 'orange': c.fillStyle = rg(S * 0.32, '#ffd27a', '#e06a00'); c.beginPath(); c.arc(0, S * 0.04, S * 0.32, 0, TAU); c.fill(); ol(); c.fillStyle = 'rgba(160,70,0,.2)'; for (let i = 0; i < 18; i++) { const a = i * 2.4, d = S * (0.06 + (i % 5) * 0.05); c.beginPath(); c.arc(Math.cos(a) * d, S * 0.04 + Math.sin(a) * d, S * 0.012, 0, TAU); c.fill(); } c.fillStyle = '#3f9a35'; c.beginPath(); c.ellipse(S * 0.1, -S * 0.3, S * 0.13, S * 0.05, -0.5, 0, TAU); c.fill(); shine(-S * 0.12, -S * 0.08, S * 0.08); break;
    case 'grape': for (const [cx, cy] of [[-0.14, -0.12], [0.02, -0.14], [0.17, -0.1], [-0.08, 0.04], [0.09, 0.04], [0, 0.2], [-0.2, 0.06], [0.22, 0.06]]) { c.save(); c.translate(cx * S, cy * S + S * 0.05); c.fillStyle = rg(S * 0.11, '#d7a3ff', '#5a1d8a'); c.beginPath(); c.arc(0, 0, S * 0.11, 0, TAU); c.fill(); ol(0.02); shine(-S * 0.03, -S * 0.04, S * 0.03); c.restore(); } c.strokeStyle = '#6b4423'; c.lineWidth = S * 0.04; c.beginPath(); c.moveTo(0, -S * 0.2); c.lineTo(S * 0.04, -S * 0.36); c.stroke(); c.fillStyle = '#4caf3c'; c.beginPath(); c.ellipse(S * 0.15, -S * 0.3, S * 0.13, S * 0.06, 0.3, 0, TAU); c.fill(); break;
    case 'bell': { const g = c.createLinearGradient(-S * 0.3, 0, S * 0.3, 0); g.addColorStop(0, '#b87a00'); g.addColorStop(0.4, '#ffe680'); g.addColorStop(1, '#c98a00'); c.fillStyle = g; c.beginPath(); c.moveTo(-S * 0.32, S * 0.2); c.quadraticCurveTo(-S * 0.26, -S * 0.36, 0, -S * 0.34); c.quadraticCurveTo(S * 0.26, -S * 0.36, S * 0.32, S * 0.2); c.closePath(); c.fill(); ol(); c.fillStyle = '#c98a00'; c.fillRect(-S * 0.36, S * 0.18, S * 0.72, S * 0.07); c.fillStyle = '#8a5a00'; c.beginPath(); c.arc(0, S * 0.3, S * 0.07, 0, TAU); c.fill(); c.beginPath(); c.arc(0, -S * 0.37, S * 0.05, 0, TAU); c.fill(); shine(-S * 0.12, -S * 0.12, S * 0.06); break; }
    case 'clover': for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; c.save(); c.translate(Math.cos(a) * S * 0.14, Math.sin(a) * S * 0.14 - S * 0.04); c.fillStyle = rg(S * 0.15, '#9cf59c', '#1f8a2a'); c.beginPath(); c.arc(0, 0, S * 0.15, 0, TAU); c.fill(); ol(0.02); c.restore(); } c.strokeStyle = '#1f6a2a'; c.lineWidth = S * 0.045; c.beginPath(); c.moveTo(0, S * 0.08); c.quadraticCurveTo(S * 0.06, S * 0.28, S * 0.16, S * 0.36); c.stroke(); break;
    case 'diamond': { const g = c.createLinearGradient(0, -S * 0.3, 0, S * 0.36); g.addColorStop(0, '#d8f6ff'); g.addColorStop(0.5, '#4fc3ff'); g.addColorStop(1, '#1a5fd6'); c.fillStyle = g; c.beginPath(); c.moveTo(-S * 0.34, -S * 0.1); c.lineTo(-S * 0.18, -S * 0.3); c.lineTo(S * 0.18, -S * 0.3); c.lineTo(S * 0.34, -S * 0.1); c.lineTo(0, S * 0.36); c.closePath(); c.fill(); ol(); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = S * 0.02; c.beginPath(); c.moveTo(-S * 0.34, -S * 0.1); c.lineTo(S * 0.34, -S * 0.1); c.moveTo(-S * 0.1, -S * 0.3); c.lineTo(-S * 0.14, -S * 0.1); c.lineTo(0, S * 0.36); c.lineTo(S * 0.14, -S * 0.1); c.lineTo(S * 0.1, -S * 0.3); c.stroke(); break; }
    case 'seven': { c.font = `900 ${S * 0.82}px Nunito, Arial Black, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = S * 0.1; c.strokeStyle = '#7a0010'; c.strokeText('7', 0, S * 0.04); const g = c.createLinearGradient(0, -S * 0.35, 0, S * 0.35); g.addColorStop(0, '#ff8a8a'); g.addColorStop(0.5, '#e5242f'); g.addColorStop(1, '#9a0016'); c.fillStyle = g; c.fillText('7', 0, S * 0.04); c.lineWidth = S * 0.025; c.strokeStyle = '#ffe14d'; c.strokeText('7', 0, S * 0.04); break; }
  }
  c.restore();
}

// ---------- Karten ----------
const SUITS = [{ s: '♠', red: false, n: 'Pik' }, { s: '♥', red: true, n: 'Herz' }, { s: '♦', red: true, n: 'Karo' }, { s: '♣', red: false, n: 'Kreuz' }];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'D', 'K'];
const val = r => r === 'A' ? 11 : ['B', 'D', 'K', '10'].includes(r) ? 10 : +r;
function handVal(cards) { let v = 0, a = 0; for (const c of cards) { v += val(c.r); if (c.r === 'A') a++; } while (v > 21 && a) { v -= 10; a--; } return { v, soft: a > 0 }; }
function cardHTML(c, hidden) {
  if (hidden) return `<div class="cs-card back"><i></i></div>`;
  const S = SUITS[c.s], col = S.red ? '#d0192b' : '#1d1d24';
  const pips = ['B', 'D', 'K'].includes(c.r) ? `<div class="face" style="color:${col}">${c.r}<small>${S.s}</small></div>` : `<div class="mid" style="color:${col}">${S.s}</div>`;
  return `<div class="cs-card" style="color:${col}"><span class="tl">${c.r}<br>${S.s}</span>${pips}<span class="br">${c.r}<br>${S.s}</span></div>`;
}

const CSS = `.cs{position:absolute;top:0;right:0;bottom:0;left:0;overflow:hidden;font-family:Nunito,sans-serif;color:#fff;background:radial-gradient(circle at 50% 30%,#3a1f6a,#140a2a 70%)}
.cs-top{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;align-items:center;padding:14px 2.5vw;z-index:5}
.cs-top h2{margin:0;font-weight:900;font-size:clamp(24px,3vw,38px);color:#ffd23d;text-shadow:0 3px 0 #7a4a00}
.cs-btn{padding:12px 24px;border-radius:999px;border:4px solid #ffd23d;background:linear-gradient(#5a2fa8,#2e1460);color:#fff;font-weight:900;font-size:19px;transition:transform .12s,box-shadow .12s}
.cs-btn.hover,.cs-big.hover{transform:scale(1.06);box-shadow:0 0 0 5px rgba(255,210,61,.45)}
.cs-btn.gold{background:linear-gradient(#ffe680,#f0a500);color:#5a3400}
.cs-btn:disabled{opacity:.45}
.cs-chips{display:inline-flex;align-items:center;gap:8px;font-weight:900;font-size:22px;background:rgba(0,0,0,.35);border-radius:999px;padding:6px 16px 6px 8px}
.cs-chip{width:28px;height:28px;border-radius:50%;background:repeating-conic-gradient(#e5242f 0 30deg,#fff 30deg 60deg);border:3px solid #e5242f;box-shadow:inset 0 0 0 5px #e5242f;display:inline-block}
.cs-lobby{position:absolute;top:0;right:0;bottom:0;left:0;display:grid;place-items:center}
.cs-lob{display:flex;gap:4vw;flex-wrap:wrap;justify-content:center}
.cs-big{width:min(38vw,440px);border-radius:30px;border:5px solid #ffd23d;background:linear-gradient(#4a248f,#1d0d40);padding:18px;text-align:center;transition:transform .15s,box-shadow .15s;color:#fff}
.cs-big b{display:block;font-size:clamp(26px,3vw,40px);font-weight:900;color:#ffd23d;margin-top:8px}.cs-big span{font-weight:800;color:#d8c8ff}
.cs-big canvas{width:100%;border-radius:18px;background:#0c0620}
.cs-note{font-weight:800;color:#bfa8ff;text-align:center;margin-top:18px;font-size:15px}
/* Slots */
.sl{position:absolute;top:0;right:0;bottom:0;left:0;display:grid;place-items:center}
.sl-cab{position:relative;width:min(70vw,880px);border-radius:40px 40px 26px 26px;padding:24px 28px 22px;background:linear-gradient(#ff5a8a,#c0185a 40%,#7a0a3a);box-shadow:0 0 0 6px #ffd23d,0 30px 60px rgba(0,0,0,.6),inset 0 4px 0 rgba(255,255,255,.35)}
.sl-title{text-align:center;font-weight:900;font-size:clamp(28px,3.4vw,46px);color:#fff7c0;text-shadow:0 3px 0 #7a0a3a,0 0 18px #ffd23d;margin-bottom:10px;letter-spacing:.02em}
.sl-lights{position:absolute;left:14px;right:14px;top:10px;display:flex;justify-content:space-between;pointer-events:none}
.sl-lights i{width:12px;height:12px;border-radius:50%;background:#fff3a0;box-shadow:0 0 10px #ffe14d;animation:bl 1s infinite}.sl-lights i:nth-child(2n){animation-delay:.5s}
@keyframes bl{50%{opacity:.25}}
.sl-win .sl-lights i{animation-duration:.2s}
.sl-glass{position:relative;border-radius:20px;background:#120826;padding:12px;box-shadow:inset 0 0 0 4px #ffd23d,inset 0 8px 20px rgba(0,0,0,.7)}
.sl-glass canvas{display:block;width:100%;border-radius:12px}
.sl-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;flex-wrap:wrap}
.sl-disp{background:#120826;border-radius:14px;padding:8px 16px;font-weight:900;font-size:22px;color:#7dff9a;font-variant-numeric:tabular-nums;box-shadow:inset 0 0 0 3px #ffd23d;min-width:150px;text-align:center}
.sl-disp small{display:block;font-size:12px;color:#ffb3d0;font-weight:800}
.sl-lever{position:absolute;right:-70px;top:90px;width:60px;height:260px}
.sl-lever .rod{position:absolute;left:24px;top:30px;width:12px;height:190px;background:linear-gradient(90deg,#9aa4b2,#f0f4f8,#7a8490);border-radius:6px;transform-origin:50% 100%;transition:transform .25s}
.sl-lever .ball{position:absolute;left:4px;top:0;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff9aa8,#c0102a);box-shadow:0 4px 10px rgba(0,0,0,.4);transition:top .25s}
.sl-lever.pull .rod{transform:scaleY(.35)}.sl-lever.pull .ball{top:150px}
.sl-lever .base{position:absolute;left:12px;bottom:0;width:36px;height:50px;border-radius:10px;background:linear-gradient(#5c6672,#2a2f36)}
.sl-pay{position:absolute;left:2vw;top:50%;transform:translateY(-50%);width:min(17vw,210px);background:rgba(0,0,0,.4);border-radius:18px;padding:10px;font-weight:900;font-size:14px}
.sl-pay div{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:3px 0}.sl-pay canvas{width:34px;height:34px}
.sl-msg{position:absolute;left:0;right:0;top:12%;text-align:center;font-weight:900;font-size:clamp(40px,6vw,86px);color:#ffe14d;text-shadow:0 5px 0 #7a4a00,0 0 30px #ff9a1f;opacity:0;transform:scale(.6);transition:opacity .25s,transform .3s cubic-bezier(.2,1.6,.4,1);pointer-events:none;z-index:6}
.sl-msg.on{opacity:1;transform:scale(1)}
/* Blackjack */
.bj{position:absolute;top:0;right:0;bottom:0;left:0;background:radial-gradient(ellipse at 50% 20%,#1f8a4f,#0d5a32 60%,#073a20)}
.bj-arc{position:absolute;left:8%;right:8%;top:36%;height:28%;border:4px solid rgba(255,230,140,.35);border-top:0;border-radius:0 0 50% 50%/0 0 100% 100%;pointer-events:none}
.bj-text{position:absolute;left:0;right:0;top:44%;text-align:center;font-weight:900;color:rgba(255,240,180,.55);font-size:clamp(14px,1.6vw,22px);letter-spacing:.08em;pointer-events:none}
.bj-dealer{position:absolute;left:50%;top:9%;transform:translateX(-50%);text-align:center}
.bj-dealer .lbl{font-weight:900;font-size:20px;color:#ffe9a0}
.bj-hand{display:flex;justify-content:center;gap:0;min-height:120px;margin-top:6px}
.bj-hand .cs-card{margin-left:-28px;animation:deal .35s ease-out both}.bj-hand .cs-card:first-child{margin-left:0}
@keyframes deal{from{transform:translate(30vw,-30vh) rotate(-40deg);opacity:0}to{transform:none;opacity:1}}
.cs-card{position:relative;width:clamp(70px,6.2vw,96px);aspect-ratio:5/7;border-radius:10px;background:linear-gradient(#fff,#f1efe8);box-shadow:0 6px 14px rgba(0,0,0,.4);font-weight:900}
.cs-card .tl,.cs-card .br{position:absolute;font-size:clamp(14px,1.3vw,20px);line-height:1;text-align:center}.cs-card .tl{left:7px;top:6px}.cs-card .br{right:7px;bottom:6px;transform:rotate(180deg)}
.cs-card .mid{position:absolute;top:0;right:0;bottom:0;left:0;display:grid;place-items:center;font-size:clamp(34px,3.2vw,50px)}
.cs-card .face{position:absolute;top:18%;right:16%;bottom:18%;left:16%;border-radius:6px;border:2px solid currentColor;display:grid;place-items:center;font-size:clamp(28px,2.6vw,40px);background:linear-gradient(#fff7e0,#ffe9b8)}.cs-card .face small{font-size:.5em;display:block;margin-top:-.6em}
.cs-card.back{background:repeating-linear-gradient(45deg,#2a3fa8 0 6px,#3550c8 6px 12px);border:4px solid #fff}.cs-card.back i{position:absolute;top:16%;right:16%;bottom:16%;left:16%;border:2px solid rgba(255,255,255,.6);border-radius:6px}
.bj-seats{position:absolute;left:2%;right:2%;bottom:3%;display:flex;justify-content:space-around;align-items:flex-end;gap:12px}
.bj-seat{flex:1;max-width:340px;text-align:center;border-radius:22px;padding:10px 8px 12px;background:rgba(0,0,0,.22);border:4px solid transparent;transition:border-color .2s,box-shadow .2s}
.bj-seat.act{border-color:var(--c);box-shadow:0 0 24px var(--c)}
.bj-seat .nm{font-weight:900;font-size:20px}.bj-seat .chp{font-weight:900;color:#ffe9a0}
.bj-seat .hands{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}
.bj-seat .hd{padding:4px;border-radius:12px}.bj-seat .hd.cur{background:rgba(255,255,255,.15)}
.bj-seat .tot{font-weight:900;font-size:18px;margin-top:2px}.bj-res{display:inline-block;margin-top:4px;padding:2px 12px;border-radius:999px;font-weight:900}
.bj-bet{display:inline-flex;align-items:center;gap:6px;font-weight:900;margin:4px 0}
.bj-info{position:absolute;left:50%;top:52%;transform:translateX(-50%);font-weight:900;font-size:clamp(20px,2.2vw,30px);color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.4);text-align:center}
.bj-ctrl{position:absolute;right:2vw;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:10px}`;

function open(box, K) {
  if (!document.getElementById('cs-css')) { const s = document.createElement('style'); s.id = 'cs-css'; s.textContent = CSS; document.head.appendChild(s); }
  box.innerHTML = `<div class="cs"><div class="cs-top"><h2 id="cs-h">Casino</h2><div style="display:flex;gap:12px;align-items:center"><span class="cs-chips"><i class="cs-chip"></i><span id="cs-w"></span></span><button class="hv cs-btn" id="cs-back">Menü</button></div></div><div id="cs-main"></div></div>`;
  const q = s => box.querySelector(s);
  const main = q('#cs-main');
  let view = 'lobby', slot = null, bj = null, closed = false;
  const showW = () => q('#cs-w').textContent = wallet(K, 1).toLocaleString('de-DE');
  q('#cs-back').addEventListener('click', () => { if (view === 'lobby') K.closeChannel(); else lobby(); });
  const padAll = cfg => K.send({ t: 'mode', m: 'pad', cfg });

  // ---------- Lobby ----------
  function lobby() {
    view = 'lobby'; slot && slot.stop(); slot = null; bj = null; q('#cs-h').textContent = 'Casino'; showW(); K.send({ t: 'mode', m: 'pointer' });
    main.innerHTML = `<div class="cs-lobby"><div><div class="cs-lob">
      <button class="hv cs-big" id="go-slot"><canvas width="400" height="200" id="lob-s"></canvas><b>Sonnen-Slots</b><span>Spielautomat mit 5 Gewinnlinien</span></button>
      <button class="hv cs-big" id="go-bj"><canvas width="400" height="200" id="lob-b"></canvas><b>Blackjack</b><span>Gegen die Bank, 1 bis 4 Spieler</span></button></div>
      <div class="cs-note">Gespielt wird nur mit Spielchips ohne echten Wert. Jedes Handy hat ein eigenes Chip-Konto.<br>
      ${wallet(K, 1) < 50 ? '<button class="hv cs-btn gold" id="cs-refill" style="margin-top:10px">Chips auffüllen (+1.000)</button>' : ''}</div></div></div>`;
    const c1 = q('#lob-s').getContext('2d'); const g = c1.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, '#ff5a8a'); g.addColorStop(1, '#7a0a3a'); c1.fillStyle = g; c1.fillRect(0, 0, 400, 200);
    ['seven', 'diamond', 'seven'].forEach((s, i) => { c1.fillStyle = '#fff8ea'; c1.fillRect(40 + i * 110, 40, 100, 120); drawSym(c1, s, 90 + i * 110, 100, 100); });
    const c2 = q('#lob-b').getContext('2d'); const g2 = c2.createRadialGradient(200, 60, 10, 200, 100, 260); g2.addColorStop(0, '#1f8a4f'); g2.addColorStop(1, '#073a20'); c2.fillStyle = g2; c2.fillRect(0, 0, 400, 200);
    [['A', 0, 140, -0.15], ['K', 1, 220, 0.12]].forEach(([r, s, x, a]) => { c2.save(); c2.translate(x, 100); c2.rotate(a); c2.fillStyle = '#fff'; c2.beginPath(); c2.roundRect(-45, -63, 90, 126, 10); c2.fill(); c2.fillStyle = SUITS[s].red ? '#d0192b' : '#1d1d24'; c2.font = '900 40px Nunito'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(r, 0, -10); c2.font = '900 34px Nunito'; c2.fillText(SUITS[s].s, 0, 30); c2.restore(); });
    q('#go-slot').addEventListener('click', openSlots); q('#go-bj').addEventListener('click', openBJ);
    const rf = q('#cs-refill'); if (rf) rf.addEventListener('click', () => { setWallet(K, 1, wallet(K, 1) + 1000); Sound.play('coin'); lobby(); });
  }

  // ---------- Spielautomat ----------
  function openSlots() {
    view = 'slot'; q('#cs-h').textContent = 'Sonnen-Slots';
    main.innerHTML = `<div class="sl"><div class="sl-msg" id="sl-msg"></div>
      <div class="sl-pay" id="sl-pay"></div>
      <div class="sl-cab" id="sl-cab"><div class="sl-lights">${'<i></i>'.repeat(16)}</div><div class="sl-title">SONNEN-SLOTS</div>
        <div class="sl-glass"><canvas id="sl-cv" width="900" height="540"></canvas></div>
        <div class="sl-bar"><button class="hv cs-btn" id="sl-minus">Einsatz −</button><div class="sl-disp"><small>Einsatz (5 Linien)</small><span id="sl-bet"></span></div><div class="sl-disp"><small>Gewinn</small><span id="sl-win">0</span></div><button class="hv cs-btn" id="sl-plus">Einsatz +</button><button class="hv cs-btn gold" id="sl-spin">Drehen</button></div>
        <div class="sl-lever" id="sl-lever"><div class="base"></div><div class="rod"></div><div class="ball hv" id="sl-ball"></div></div></div></div>`;
    q('#sl-pay').innerHTML = '<div style="justify-content:center;color:#ffd23d">Gewinnplan</div>' + SYM.slice().reverse().map(s => `<div><canvas width="68" height="68" data-s="${s}"></canvas><span>3× = ${PAY[s]}</span></div>`).join('') + '<div><span>2 Kirschen links</span><span>3</span></div><div style="color:#bfa8ff;font-size:12px">pro Linie mal Münzwert</div>';
    q('#sl-pay').querySelectorAll('canvas').forEach(cv => drawSym(cv.getContext('2d'), cv.dataset.s, 34, 34, 64));
    const COINS = [1, 2, 5, 10, 20, 50];
    let ci = K.store.get('cs-coin', 1), spinning = false, lastWin = 0;
    const cv = q('#sl-cv'), c = cv.getContext('2d'), CW = 900, CH = 540, RW = 270, SH = 180, X0 = (CW - RW * 3 - 24) / 2;
    const strips = [makeStrip(), makeStrip(), makeStrip()];
    const reels = strips.map((st, i) => ({ st, pos: Math.floor(Math.random() * st.length), v: 0, target: null, stopAt: 0, done: true }));
    let winLines = [], flash = 0;
    const bet = () => COINS[ci] * 5;
    const updBar = () => { q('#sl-bet').textContent = bet(); q('#sl-win').textContent = lastWin; showW(); };
    const symAt = (r, row) => { const n = r.st.length; return r.st[((Math.floor(r.pos) + row - 1) % n + n) % n]; };
    function draw(t) {
      c.clearRect(0, 0, CW, CH);
      reels.forEach((r, i) => {
        const x = X0 + i * (RW + 12);
        const g = c.createLinearGradient(0, 0, 0, CH); g.addColorStop(0, '#d9d2c4'); g.addColorStop(0.15, '#fffaf0'); g.addColorStop(0.85, '#fffaf0'); g.addColorStop(1, '#d9d2c4');
        c.fillStyle = g; c.fillRect(x, 0, RW, CH);
        c.save(); c.beginPath(); c.rect(x, 0, RW, CH); c.clip();
        const n = r.st.length, frac = r.pos - Math.floor(r.pos);
        for (let row = -1; row <= 3; row++) {
          const s = r.st[((Math.floor(r.pos) + row - 1) % n + n) % n];
          const y = (row - frac) * SH + SH / 2;
          const blur = Math.min(1, Math.abs(r.v) / 30);
          c.globalAlpha = 1 - blur * 0.35; drawSym(c, s, x + RW / 2, y, SH * 0.82); c.globalAlpha = 1;
        }
        c.restore();
        const sh = c.createLinearGradient(0, 0, 0, CH); sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(0.18, 'rgba(0,0,0,0)'); sh.addColorStop(0.82, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.45)');
        c.fillStyle = sh; c.fillRect(x, 0, RW, CH);
      });
      // Gewinnlinien
      if (winLines.length && Math.sin(t * 10) > -0.3) winLines.forEach(li => {
        const L = LINES[li]; c.strokeStyle = LINE_COL[li]; c.lineWidth = 10; c.shadowColor = LINE_COL[li]; c.shadowBlur = 18; c.beginPath();
        L.forEach((row, i) => { const x = X0 + i * (RW + 12) + RW / 2, y = row * SH + SH / 2; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.shadowBlur = 0;
        L.forEach((row, i) => { c.strokeStyle = LINE_COL[li]; c.lineWidth = 6; c.strokeRect(X0 + i * (RW + 12) + 10, row * SH + 8, RW - 20, SH - 16); });
      });
    }
    let raf = 0, lastT = performance.now();
    function loop(t) {
      if (closed || view !== 'slot') return;
      const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
      let moving = false;
      reels.forEach((r, i) => {
        if (r.done) return; moving = true;
        if (performance.now() < r.stopAt) { r.v = Math.min(r.v + 90 * dt, 26); r.pos -= r.v * dt; }
        else { if (r.target == null) { const n = r.st.length; r.target = Math.floor(r.pos) - 4 - Math.floor(Math.random() * n); } const d = r.pos - r.target; r.v = Math.max(3, d * 4); r.pos -= Math.min(d, r.v * dt); if (d <= 0.01) { r.pos = ((r.target % r.st.length) + r.st.length) % r.st.length; r.done = true; r.v = 0; Sound.play('reel'); } }
      });
      if (spinning && !moving) finish();
      if (spinning && moving && Math.random() < 0.25) Sound.play('diceSpin');
      draw(t / 1000);
      raf = requestAnimationFrame(loop);
    }
    function spin() {
      if (spinning) return;
      const w = wallet(K, 1);
      if (w < bet()) { msg('Zu wenig Chips', '#ff8a8a'); Sound.play('buzz'); return; }
      setWallet(K, 1, w - bet()); lastWin = 0; winLines = []; updBar(); Sound.play('chip');
      spinning = true; q('#sl-cab').classList.remove('sl-win');
      const lv = q('#sl-lever'); lv.classList.add('pull'); setTimeout(() => lv.classList.remove('pull'), 400);
      const now = performance.now(); reels.forEach((r, i) => { r.done = false; r.target = null; r.v = 0; r.stopAt = now + 900 + i * 450 + Math.random() * 200; });
    }
    function finish() {
      spinning = false;
      let win = 0; winLines = [];
      LINES.forEach((L, li) => {
        const s = L.map((row, i) => symAt(reels[i], row));
        let p = 0;
        if (s[0] === s[1] && s[1] === s[2]) p = PAY[s[0]];
        else if (s[0] === 'cherry' && s[1] === 'cherry') p = 3;
        if (p) { win += p * COINS[ci]; winLines.push(li); }
      });
      lastWin = win;
      if (win) {
        setWallet(K, 1, wallet(K, 1) + win); q('#sl-cab').classList.add('sl-win');
        const big = win >= bet() * 20; Sound.play(big ? 'jackpot' : 'win'); msg(big ? 'Riesengewinn! +' + win : '+' + win, '#ffe14d');
      }
      updBar();
      K.sendTo(1, { t: 'hud', pos: '', lap: '', item: '' });
    }
    let msgT; function msg(t, col) { const m = q('#sl-msg'); m.textContent = t; m.style.color = col; m.classList.add('on'); clearTimeout(msgT); msgT = setTimeout(() => m.classList.remove('on'), 1800); }
    q('#sl-spin').addEventListener('click', spin); q('#sl-ball').addEventListener('click', spin);
    q('#sl-minus').addEventListener('click', () => { if (!spinning && ci > 0) { ci--; K.store.set('cs-coin', ci); updBar(); Sound.play('chip'); } });
    q('#sl-plus').addEventListener('click', () => { if (!spinning && ci < COINS.length - 1) { ci++; K.store.set('cs-coin', ci); updBar(); Sound.play('chip'); } });
    updBar(); raf = requestAnimationFrame(loop);
    padAll({ title: 'Sonnen-Slots', hint: 'Schüttle das Handy oder tippe auf Drehen.', shake: true, buttons: [{ b: 'A', label: 'Drehen', color: '#f0a500' }, { b: 'MINUS', label: 'Einsatz −', color: '#7a5ac8' }, { b: 'PLUS', label: 'Einsatz +', color: '#7a5ac8' }] });
    slot = { spin, minus: () => q('#sl-minus').click(), plus: () => q('#sl-plus').click(), stop() { cancelAnimationFrame(raf); } };
  }

  // ---------- Blackjack ----------
  function openBJ() {
    view = 'bj'; q('#cs-h').textContent = 'Blackjack';
    const seatsFrom = () => { const ps = K.players(); return (ps.length ? ps : [1]).slice(0, 4); };
    bj = { shoe: [], dealer: [], seats: [], phase: 'bet', turn: -1, hand: 0, msg: '' };
    const newShoe = () => { bj.shoe = []; for (let d = 0; d < 6; d++) for (let s = 0; s < 4; s++) for (const r of RANKS) bj.shoe.push({ r, s }); for (let i = bj.shoe.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bj.shoe[i], bj.shoe[j]] = [bj.shoe[j], bj.shoe[i]]; } };
    newShoe();
    const draw = () => { if (bj.shoe.length < 20) newShoe(); Sound.play('card'); return bj.shoe.pop(); };
    function syncSeats() { const want = seatsFrom(); want.forEach(p => { if (!bj.seats.find(s => s.p === p)) bj.seats.push({ p, bet: Math.min(50, wallet(K, p)), ready: false, hands: [], out: false }); }); bj.seats = bj.seats.filter(s => want.includes(s.p)).sort((a, b) => a.p - b.p); }
    syncSeats();
    main.innerHTML = `<div class="bj"><div class="bj-arc"></div><div class="bj-text">BLACKJACK ZAHLT 3 ZU 2 · BANK ZIEHT BIS 16, STEHT AUF 17</div>
      <div class="bj-dealer"><div class="lbl">Bank <span id="bj-dv"></span></div><div class="bj-hand" id="bj-dh"></div></div>
      <div class="bj-info" id="bj-info"></div><div class="bj-ctrl" id="bj-ctrl"></div><div class="bj-seats" id="bj-seats"></div></div>`;
    let dealtCount = {};
    function render() {
      const dh = q('#bj-dh'); if (!dh) return;
      const hideHole = bj.phase === 'play' || bj.phase === 'deal';
      dh.innerHTML = bj.dealer.map((c, i) => cardHTML(c, i === 1 && hideHole)).join('');
      q('#bj-dv').textContent = bj.dealer.length ? '· ' + (hideHole ? val(bj.dealer[0].r) : handVal(bj.dealer).v) : '';
      q('#bj-seats').innerHTML = bj.seats.map((s, si) => {
        const col = PCOL[s.p - 1];
        const hands = s.hands.map((h, hi) => { const v = handVal(h.cards); return `<div class="hd${bj.phase === 'play' && bj.turn === si && bj.hand === hi ? ' cur' : ''}"><div class="bj-hand">${h.cards.map(c => cardHTML(c)).join('')}</div><div class="tot">${v.v}${v.soft && v.v < 21 ? ' (weich)' : ''} · Einsatz ${h.bet}</div>${h.res ? `<span class="bj-res" style="background:${h.resCol}">${h.res}</span>` : ''}</div>`; }).join('');
        return `<div class="bj-seat${bj.phase === 'play' && bj.turn === si ? ' act' : ''}" style="--c:${col}"><div class="nm" style="color:${col}">Spieler ${s.p}</div><div class="chp">${wallet(K, s.p).toLocaleString('de-DE')} Chips</div>
          ${bj.phase === 'bet' ? `<div class="bj-bet"><i class="cs-chip"></i>${s.out ? 'setzt aus' : s.bet}${s.ready ? ' · bereit' : ''}</div>` : ''}<div class="hands">${hands}</div></div>`;
      }).join('');
      q('#bj-info').textContent = bj.msg;
      // Steuerung am Laptop für Spieler 1 (oder den, der dran ist)
      const ctrl = q('#bj-ctrl'); ctrl.innerHTML = '';
      const btn = (id, label, gold) => `<button class="hv cs-btn${gold ? ' gold' : ''}" data-a="${id}">${label}</button>`;
      if (bj.phase === 'bet') { const s = bj.seats[0]; if (s && !s.ready) ctrl.innerHTML = btn('BET10', 'Einsatz +10') + btn('BET50', 'Einsatz +50') + btn('BETM', 'Einsatz −10') + btn('DEAL', 'Bereit', true); }
      else if (bj.phase === 'play') { const s = bj.seats[bj.turn]; if (s) { const o = options(s); ctrl.innerHTML = o.map(x => btn(x.b, x.label, x.b === 'HIT')).join(''); } }
      else if (bj.phase === 'done') ctrl.innerHTML = btn('NEXT', 'Nächste Runde', true);
      ctrl.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act(bj.phase === 'play' ? bj.seats[bj.turn].p : 1, b.dataset.a, true)));
    }
    function options(s) {
      const h = s.hands[bj.hand]; if (!h) return [];
      const o = [{ b: 'HIT', label: 'Karte' }, { b: 'STAND', label: 'Halten' }];
      const w = wallet(K, s.p);
      if (h.cards.length === 2 && w >= h.bet) o.push({ b: 'DOUBLE', label: 'Verdoppeln' });
      if (h.cards.length === 2 && val(h.cards[0].r) === val(h.cards[1].r) && s.hands.length < 2 && w >= h.bet) o.push({ b: 'SPLIT', label: 'Teilen' });
      return o;
    }
    function pads() {
      bj.seats.forEach((s, si) => {
        if (bj.phase === 'bet') K.sendTo(s.p, { t: 'mode', m: 'pad', cfg: s.ready ? { title: 'Blackjack', hint: 'Warte auf die anderen …' } : { title: 'Blackjack', hint: 'Einsatz wählen: ' + (s.out ? 'Aussetzen' : s.bet) + ' Chips (du hast ' + wallet(K, s.p) + ')', buttons: [{ b: 'BET10', label: '+10' }, { b: 'BET50', label: '+50' }, { b: 'BETM', label: '−10', color: '#9aa0a5' }, { b: 'SIT', label: 'Aussetzen', color: '#5c6064' }, { b: 'DEAL', label: 'Bereit', color: '#2eaa4f' }] } });
        else if (bj.phase === 'play' && bj.turn === si) { const h = s.hands[bj.hand], v = handVal(h.cards).v; K.sendTo(s.p, { t: 'mode', m: 'pad', cfg: { title: 'Du bist dran', hint: 'Deine Hand: ' + v + ' · Bank zeigt ' + val(bj.dealer[0].r), buttons: options(s).map((o, i) => ({ b: o.b, label: o.label, color: ['#2eaa4f', '#e5242f', '#f0a500', '#1b9fd6'][i] })) } }); }
        else if (bj.phase === 'done') K.sendTo(s.p, { t: 'mode', m: 'pad', cfg: { title: 'Blackjack', hint: s.hands.map(h => h.res || '').join(' · ') || 'Runde vorbei', buttons: [{ b: 'NEXT', label: 'Nächste Runde', color: '#2eaa4f' }] } });
        else K.sendTo(s.p, { t: 'mode', m: 'pad', cfg: { title: 'Blackjack', hint: 'Warte …' } });
      });
    }
    const wait = ms => new Promise(r => setTimeout(r, ms));
    async function deal() {
      const players = bj.seats.filter(s => !s.out && s.bet > 0);
      if (!players.length) { bj.seats.forEach(s => s.ready = false); bj.msg = 'Niemand hat gesetzt.'; render(); pads(); return; }
      bj.phase = 'deal'; bj.dealer = []; bj.msg = '';
      bj.seats.forEach(s => { s.hands = []; if (!s.out && s.bet > 0) { setWallet(K, s.p, wallet(K, s.p) - s.bet); s.hands = [{ cards: [], bet: s.bet }]; } });
      pads(); Sound.play('chip');
      for (let r = 0; r < 2; r++) { for (const s of players) { s.hands[0].cards.push(draw()); render(); await wait(300); } bj.dealer.push(draw()); render(); await wait(300); }
      if (closed || view !== 'bj') return;
      // Bank prüft auf Blackjack
      if (handVal(bj.dealer).v === 21 && ['A', '10', 'B', 'D', 'K'].includes(bj.dealer[0].r)) { bj.msg = 'Die Bank hat Blackjack!'; return settle(); }
      bj.phase = 'play'; bj.turn = -1; nextTurn();
    }
    function nextTurn() {
      // nächste offene Hand suchen
      while (true) {
        if (bj.turn >= 0) { const s = bj.seats[bj.turn]; if (s && bj.hand < s.hands.length - 1) { bj.hand++; } else { bj.turn++; bj.hand = 0; } } else { bj.turn = 0; bj.hand = 0; }
        if (bj.turn >= bj.seats.length) return dealerPlay();
        const s = bj.seats[bj.turn], h = s.hands[bj.hand];
        if (!h) continue;
        if (handVal(h.cards).v === 21 && h.cards.length === 2 && s.hands.length === 1) { h.bj = true; continue; }
        if (h.done) continue;
        break;
      }
      bj.msg = 'Spieler ' + bj.seats[bj.turn].p + ' ist dran'; render(); pads();
    }
    async function dealerPlay() {
      bj.phase = 'dealer'; bj.msg = 'Die Bank deckt auf'; render(); pads(); await wait(700);
      const anyLive = bj.seats.some(s => s.hands.some(h => handVal(h.cards).v <= 21 && !h.bj));
      if (anyLive) while (handVal(bj.dealer).v < 17) { bj.dealer.push(draw()); render(); await wait(650); if (closed || view !== 'bj') return; }
      bj.msg = ''; settle();
    }
    function settle() {
      bj.phase = 'done'; const dv = handVal(bj.dealer).v, dBJ = dv === 21 && bj.dealer.length === 2;
      bj.seats.forEach(s => s.hands.forEach(h => {
        const pv = handVal(h.cards).v, pBJ = h.bj; let pay = 0;
        if (pv > 21) { h.res = 'Überkauft'; h.resCol = '#a8001a'; }
        else if (pBJ && !dBJ) { pay = h.bet * 2.5; h.res = 'Blackjack! +' + Math.round(h.bet * 1.5); h.resCol = '#c98a00'; }
        else if (dBJ && !pBJ) { h.res = 'Verloren'; h.resCol = '#a8001a'; }
        else if (dv > 21 || pv > dv) { pay = h.bet * 2; h.res = 'Gewonnen +' + h.bet; h.resCol = '#1f8a2a'; }
        else if (pv === dv) { pay = h.bet; h.res = 'Unentschieden'; h.resCol = '#5c6064'; }
        else { h.res = 'Verloren'; h.resCol = '#a8001a'; }
        if (pay) setWallet(K, s.p, wallet(K, s.p) + pay);
      }));
      const won = bj.seats.some(s => s.hands.some(h => h.resCol === '#1f8a2a' || h.resCol === '#c98a00'));
      Sound.play(won ? 'win' : 'coinLose');
      if (!bj.msg) bj.msg = dv > 21 ? 'Die Bank hat sich überkauft!' : 'Die Bank hat ' + dv;
      showW(); render(); pads();
    }
    function newRound() { syncSeats(); bj.phase = 'bet'; bj.dealer = []; bj.msg = 'Einsätze bitte'; bj.seats.forEach(s => { s.hands = []; s.ready = false; s.bet = Math.min(s.bet || 50, wallet(K, s.p)); if (wallet(K, s.p) < 10) { setWallet(K, s.p, wallet(K, s.p) + 500); } }); render(); pads(); }
    function act(p, a, fromMouse) {
      const s = bj.seats.find(x => x.p === p) || (fromMouse ? bj.seats[0] : null); if (!s) return;
      if (bj.phase === 'bet' && !s.ready) {
        const w = wallet(K, s.p);
        if (a === 'BET10') { s.out = false; s.bet = Math.min(w, s.bet + 10); Sound.play('chip'); }
        else if (a === 'BET50') { s.out = false; s.bet = Math.min(w, s.bet + 50); Sound.play('chip'); }
        else if (a === 'BETM') { s.bet = Math.max(10, s.bet - 10); Sound.play('chip'); }
        else if (a === 'SIT') { s.out = true; s.ready = true; }
        else if (a === 'DEAL' || a === 'A') { if (s.bet > w) s.bet = w; s.ready = true; Sound.play('select'); }
        render(); pads();
        if (bj.seats.every(x => x.ready)) deal();
        return;
      }
      if (bj.phase === 'play') {
        const cur = bj.seats[bj.turn]; if (!cur || (cur !== s && !fromMouse)) return;
        const h = cur.hands[bj.hand], opts = options(cur).map(o => o.b);
        if (a === 'A') a = 'HIT'; if (a === 'B') a = 'STAND';
        if (!opts.includes(a)) return;
        if (a === 'HIT') { h.cards.push(draw()); const v = handVal(h.cards).v; if (v >= 21) { h.done = true; if (v > 21) Sound.play('buzz'); render(); setTimeout(nextTurn, 600); } else { render(); pads(); } }
        else if (a === 'STAND') { h.done = true; nextTurn(); }
        else if (a === 'DOUBLE') { setWallet(K, cur.p, wallet(K, cur.p) - h.bet); h.bet *= 2; h.cards.push(draw()); h.done = true; Sound.play('chip'); render(); setTimeout(nextTurn, 700); }
        else if (a === 'SPLIT') { setWallet(K, cur.p, wallet(K, cur.p) - h.bet); const c2 = h.cards.pop(); cur.hands.push({ cards: [c2, draw()], bet: h.bet }); h.cards.push(draw()); Sound.play('chip'); render(); pads(); }
        return;
      }
      if (bj.phase === 'done' && (a === 'NEXT' || a === 'A')) newRound();
    }
    bj.act = act; bj.onRemotes = () => { if (bj.phase === 'bet') { syncSeats(); render(); pads(); } };
    newRound();
  }

  lobby();
  return {
    onButton(name, down, p) {
      if (!down) return view !== 'lobby';
      if (name === 'HOME') return false;
      if (view === 'slot' && slot) { if (name === 'A' && p !== 1) return true; if (name === 'A' && document.querySelector('.cs .hover')) return false; if (name === 'A') { slot.spin(); return true; } if (name === 'PLUS') { slot.plus(); return true; } if (name === 'MINUS') { slot.minus(); return true; } if (name === 'SHAKE') { slot.spin(); return true; } return name !== 'B'; }
      if (view === 'bj' && bj) {
        if (name === 'B' && bj.phase !== 'play') return false;
        if (p === 1 && name === 'A' && document.querySelector('.cs .hover')) return false;
        bj.act(p, name); return true;
      }
      return false;
    },
    onData(d, p) { if (d.t === 'sh' && view === 'slot' && p === 1 && +d.e > 18 && slot) { const now = performance.now(); if (!this._sh || now - this._sh > 1200) { this._sh = now; slot.spin(); } return true; } return false; },
    onRemotes() { if (view === 'bj' && bj) bj.onRemotes(); },
    close() { closed = true; slot && slot.stop(); K.send({ t: 'mode', m: 'pointer' }); },
  };
}

const tileSVG = big => `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">
  <defs><radialGradient id="cbg${big}" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#5a2fa8"/><stop offset="1" stop-color="#140a2a"/></radialGradient>
  <style>.cb{animation:cb 1s infinite}.cb:nth-child(2n){animation-delay:.5s}@keyframes cb{50%{opacity:.3}}@media(prefers-reduced-motion:reduce){.cb{animation:none}}</style></defs>
  <rect width="320" height="200" fill="url(#cbg${big})"/>
  <g>${Array.from({ length: 12 }, (_, i) => `<circle class="cb" cx="${20 + i * 25}" cy="14" r="5" fill="#ffe14d"/>`).join('')}</g>
  <rect x="40" y="40" width="130" height="110" rx="16" fill="#c0185a" stroke="#ffd23d" stroke-width="5"/>
  ${[0, 1, 2].map(i => `<rect x="${52 + i * 38}" y="62" width="32" height="56" rx="6" fill="#fff8ea"/><text x="${68 + i * 38}" y="103" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="34" fill="#e5242f" stroke="#7a0010" stroke-width="2">7</text>`).join('')}
  <g transform="translate(205 70) rotate(-12)"><rect width="56" height="80" rx="8" fill="#fff"/><text x="28" y="40" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="28" fill="#1d1d24">A</text><text x="28" y="68" text-anchor="middle" font-size="24" fill="#1d1d24">♠</text></g>
  <g transform="translate(240 82) rotate(10)"><rect width="56" height="80" rx="8" fill="#fff"/><text x="28" y="40" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="28" fill="#d0192b">K</text><text x="28" y="68" text-anchor="middle" font-size="24" fill="#d0192b">♥</text></g>
  ${big ? '<text x="160" y="186" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="26" fill="#ffd23d" stroke="#7a4a00" stroke-width="5" paint-order="stroke">Casino</text>' : ''}</svg>`;

const CasinoChannel = { id: 'casino', name: 'Casino-Kanal', music: 'menu', tile: el => el.innerHTML = tileSVG(0), preview: el => el.innerHTML = tileSVG(1), open };
if (window.K && K.addChannel) K.addChannel(CasinoChannel); else addEventListener('load', () => K.addChannel(CasinoChannel));
