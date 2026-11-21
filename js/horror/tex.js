// Prozedurale Texturen für den Horror-Kanal. Alles wird zur Laufzeit auf Canvas gemalt, es gibt keine Bilddateien.
import * as THREE from '../../lib/three.module.min.js';

const TAU = Math.PI * 2;
let seed = 1337;
export const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const R = (a, b) => a + rand() * (b - a);

// ---------- Wertrauschen ----------
const PERM = new Uint8Array(512); { const p = []; for (let i = 0; i < 256; i++) p.push(i); for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
const VAL = new Float32Array(256); for (let i = 0; i < 256; i++) VAL[i] = rand();
const fade = t => t * t * (3 - 2 * t);
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => VAL[PERM[(PERM[a & 255] + b) & 255]];
  const u = fade(xf), v = fade(yf);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += vnoise(x * f, y * f) * a; n += a; a *= 0.5; f *= 2.03; } return s / n; }

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toTex(c, rep, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
// Höhenbild (Graustufen-Canvas) zu Normalenkarte
function normalMap(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = cv(w, h), ctx = out.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return out;
}
// Rauschen pixelweise auf ein Canvas legen
function grain(c, amt, scale = 1, mode = 'mul') {
  const ctx = c.getContext('2d'), img = ctx.getImageData(0, 0, c.width, c.height), d = img.data, w = c.width;
  for (let i = 0; i < d.length; i += 4) {
    const p = i / 4, x = p % w, y = (p / w) | 0;
    const n = mode === 'fbm' ? (fbm(x / (40 * scale), y / (40 * scale), 4) - 0.5) * 2 : (rand() - 0.5);
    const k = 1 + n * amt;
    d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k);
  }
  ctx.putImageData(img, 0, 0);
}
function stain(ctx, x, y, r, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col.replace('A', a)); g.addColorStop(0.6, col.replace('A', a * 0.5)); g.addColorStop(1, col.replace('A', 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * R(0.6, 1.2), R(0, TAU), 0, TAU); ctx.fill();
}

// ---------- Parkett ----------
export function floorTextures() {
  const S = 1024, c = cv(S, S), h = cv(S, S), x = c.getContext('2d'), hx = h.getContext('2d');
  x.fillStyle = '#3a2416'; x.fillRect(0, 0, S, S); hx.fillStyle = '#000'; hx.fillRect(0, 0, S, S);
  const pw = S / 16; // 16 Dielen auf 2 m
  for (let i = 0; i < 16; i++) {
    let y = -R(0, 300);
    while (y < S) {
      const len = R(220, 520), hue = R(18, 30), l = R(17, 30), sat = R(30, 48);
      const g = x.createLinearGradient(i * pw, 0, (i + 1) * pw, 0);
      g.addColorStop(0, `hsl(${hue},${sat}%,${l * 0.85}%)`); g.addColorStop(0.5, `hsl(${hue},${sat}%,${l}%)`); g.addColorStop(1, `hsl(${hue},${sat}%,${l * 0.8}%)`);
      x.fillStyle = g; x.fillRect(i * pw + 1, y + 1, pw - 2, len - 2);
      // Maserung
      x.save(); x.beginPath(); x.rect(i * pw + 1, y + 1, pw - 2, len - 2); x.clip();
      for (let k = 0; k < 14; k++) {
        x.strokeStyle = `rgba(${R(10, 30)},${R(5, 15)},0,${R(0.15, 0.4)})`; x.lineWidth = R(0.5, 2);
        x.beginPath(); const ox = i * pw + R(2, pw - 2); x.moveTo(ox, y);
        for (let t = 0; t <= len; t += 20) x.lineTo(ox + Math.sin(t * 0.02 + k) * R(1, 4), y + t);
        x.stroke();
      }
      if (rand() < 0.3) { x.fillStyle = 'rgba(20,8,0,.5)'; x.beginPath(); x.ellipse(i * pw + R(10, pw - 10), y + R(30, len - 30), R(3, 7), R(6, 14), 0, 0, TAU); x.fill(); }
      x.restore();
      hx.fillStyle = `rgb(${R(170, 220)},0,0)`; hx.fillRect(i * pw + 2, y + 2, pw - 4, len - 4);
      y += len;
    }
  }
  hx.filter = 'blur(1.5px)'; hx.drawImage(h, 0, 0); hx.filter = 'none';
  // Grauwerte aus Rotkanal
  { const id = hx.getImageData(0, 0, S, S), d = id.data; for (let i = 0; i < d.length; i += 4) d[i + 1] = d[i + 2] = d[i]; hx.putImageData(id, 0, 0); }
  // Schmutz und Abnutzung
  for (let i = 0; i < 40; i++) stain(x, R(0, S), R(0, S), R(30, 160), 'rgba(10,6,2,A)', R(0.08, 0.3));
  for (let i = 0; i < 18; i++) stain(x, R(0, S), R(0, S), R(40, 120), 'rgba(120,90,60,A)', R(0.04, 0.1));
  grain(c, 0.12);
  // Rauheit: Abnutzung = glatter
  const r = cv(512, 512), rx = r.getContext('2d'); rx.fillStyle = '#9a9a9a'; rx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 30; i++) stain(rx, R(0, 512), R(0, 512), R(20, 90), 'rgba(40,40,40,A)', R(0.2, 0.5));
  grain(r, 0.2);
  return { map: toTex(c), normalMap: toTex(normalMap(h, 3), null, false), roughnessMap: toTex(r, null, false) };
}

// ---------- Wand: Holzvertäfelung unten, Tapete oben, Wasserflecken ----------
export function wallTextures(variant = 0) {
  const W = 768, H = 1152, c = cv(W, H), h = cv(W, H), x = c.getContext('2d'), hx = h.getContext('2d'); // 2 m breit, 3 m hoch
  const py = H * (1 - 0.95 / 3); // Oberkante Vertäfelung
  // Tapete
  x.fillStyle = variant ? '#3d4a3a' : '#4a5440'; x.fillRect(0, 0, W, py);
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
  for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? 'rgba(255,240,200,.035)' : 'rgba(0,0,0,.05)'; x.fillRect(i * W / 12, 0, W / 24, py); }
  // Damastmuster
  const motif = (cx, cy, s) => {
    x.save(); x.translate(cx, cy); x.scale(s, s); x.fillStyle = 'rgba(170,160,110,.1)'; x.strokeStyle = 'rgba(20,18,8,.14)'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(0, -46);
    x.bezierCurveTo(22, -30, 30, -8, 12, 6); x.bezierCurveTo(30, 14, 26, 34, 0, 46); x.bezierCurveTo(-26, 34, -30, 14, -12, 6); x.bezierCurveTo(-30, -8, -22, -30, 0, -46);
    x.fill(); x.stroke();
    x.beginPath(); x.arc(0, 0, 5, 0, TAU); x.fillStyle = 'rgba(20,15,5,.08)'; x.fill();
    for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(12 * sg, 6); x.quadraticCurveTo(40 * sg, -10, 44 * sg, 20); x.quadraticCurveTo(30 * sg, 10, 14 * sg, 12); x.fillStyle = 'rgba(170,160,110,.05)'; x.fill(); }
    x.restore();
  };
  for (let yy = 30; yy < py; yy += 96) for (let xx = 0; xx <= W; xx += 96) motif(xx + ((yy / 96) % 2 ? 48 : 0), yy, 0.55);
  // Wasserflecken von der Decke
  for (let i = 0; i < (variant ? 10 : 5); i++) {
    const sx = R(0, W), sw = R(30, 110), len = R(150, variant ? 700 : 450);
    const g = x.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, 'rgba(40,30,10,.55)'); g.addColorStop(0.7, 'rgba(60,45,15,.25)'); g.addColorStop(1, 'rgba(60,45,15,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(sx - sw, 0);
    for (let t = 0; t <= 1; t += 0.1) x.lineTo(sx - sw * (1 - t * 0.7) + Math.sin(t * 9 + i) * 12, t * len);
    for (let t = 1; t >= 0; t -= 0.1) x.lineTo(sx + sw * (1 - t * 0.7) + Math.cos(t * 7 + i) * 12, t * len);
    x.fill();
    x.strokeStyle = 'rgba(30,20,5,.35)'; x.lineWidth = 2; x.stroke();
  }
  // abgelöste Tapete
  for (let i = 0; i < (variant ? 6 : 2); i++) {
    const ex = R(0, W), ey = R(60, py - 80), ew = R(30, 90), eh = R(40, 140);
    x.fillStyle = 'rgba(70,62,44,.75)'; x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex + ew, ey + R(-10, 10)); x.lineTo(ex + ew * R(0.6, 1), ey + eh); x.lineTo(ex + R(0, 10), ey + eh * R(0.6, 1)); x.closePath(); x.fill();
    hx.fillStyle = '#5a5a5a'; hx.beginPath(); hx.moveTo(ex, ey); hx.lineTo(ex + ew, ey); hx.lineTo(ex + ew, ey + eh); hx.lineTo(ex, ey + eh); hx.fill();
  }
  for (let i = 0; i < 30; i++) stain(x, R(0, W), R(0, py), R(20, 120), 'rgba(15,12,5,A)', R(0.05, 0.22));
  // Vertäfelung
  x.fillStyle = '#2c1a10'; x.fillRect(0, py, W, H - py);
  const pnl = 2, pwid = W / pnl;
  for (let i = 0; i < pnl; i++) {
    const x0 = i * pwid + 26, y0 = py + 50, w0 = pwid - 52, h0 = H - py - 120;
    const g = x.createLinearGradient(x0, y0, x0 + w0, y0 + h0); g.addColorStop(0, '#3e2616'); g.addColorStop(1, '#2a180c');
    x.fillStyle = g; x.fillRect(x0, y0, w0, h0);
    x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 6; x.strokeRect(x0, y0, w0, h0);
    x.strokeStyle = 'rgba(255,200,140,.08)'; x.lineWidth = 2; x.strokeRect(x0 + 8, y0 + 8, w0 - 16, h0 - 16);
    hx.fillStyle = '#6a6a6a'; hx.fillRect(x0, y0, w0, h0); hx.fillStyle = '#9a9a9a'; hx.fillRect(x0 + 10, y0 + 10, w0 - 20, h0 - 20);
    for (let k = 0; k < 30; k++) { x.strokeStyle = `rgba(0,0,0,${R(0.1, 0.3)})`; x.lineWidth = R(0.5, 1.5); x.beginPath(); const yy = R(py, H); x.moveTo(0, yy); x.bezierCurveTo(W * 0.3, yy + R(-6, 6), W * 0.6, yy + R(-6, 6), W, yy + R(-4, 4)); x.stroke(); }
  }
  // Handlauf und Fußleiste
  x.fillStyle = '#1e1008'; x.fillRect(0, py - 6, W, 22); x.fillStyle = 'rgba(255,210,150,.12)'; x.fillRect(0, py - 6, W, 4);
  x.fillStyle = '#160c06'; x.fillRect(0, H - 40, W, 40);
  hx.fillStyle = '#d0d0d0'; hx.fillRect(0, py - 6, W, 22); hx.fillStyle = '#b0b0b0'; hx.fillRect(0, H - 40, W, 40);
  // Schmutzkante unten
  const gd = x.createLinearGradient(0, H - 200, 0, H); gd.addColorStop(0, 'rgba(0,0,0,0)'); gd.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = gd; x.fillRect(0, H - 200, W, 200);
  grain(c, 0.1);
  hx.filter = 'blur(2px)'; hx.drawImage(h, 0, 0); hx.filter = 'none';
  return { map: toTex(c), normalMap: toTex(normalMap(h, 2.5), null, false) };
}

export function ceilingTexture() {
  const S = 512, c = cv(S, S), x = c.getContext('2d');
  x.fillStyle = '#8c8676'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 25; i++) stain(x, R(0, S), R(0, S), R(20, 140), 'rgba(70,55,25,A)', R(0.1, 0.4));
  for (let i = 0; i < 6; i++) { x.strokeStyle = 'rgba(30,25,15,.4)'; x.lineWidth = 1; x.beginPath(); let px = R(0, S), py = R(0, S); x.moveTo(px, py); for (let k = 0; k < 12; k++) { px += R(-25, 25); py += R(-25, 25); x.lineTo(px, py); } x.stroke(); }
  grain(c, 0.25, 1, 'fbm');
  return toTex(c);
}

export function doorTexture(scratched) {
  const W = 512, H = 1024, c = cv(W, H), x = c.getContext('2d'), h = cv(W, H), hx = h.getContext('2d');
  x.fillStyle = '#3a2214'; x.fillRect(0, 0, W, H); hx.fillStyle = '#909090'; hx.fillRect(0, 0, W, H);
  for (let k = 0; k < 60; k++) { x.strokeStyle = `rgba(0,0,0,${R(0.08, 0.25)})`; x.lineWidth = R(0.5, 2); x.beginPath(); const xx = R(0, W); x.moveTo(xx, 0); x.bezierCurveTo(xx + R(-8, 8), H * 0.3, xx + R(-8, 8), H * 0.6, xx + R(-5, 5), H); x.stroke(); }
  const panels = [[50, 60, 180, 380], [282, 60, 180, 380], [50, 520, 180, 440], [282, 520, 180, 440]];
  for (const [px, py, pw, ph] of panels) {
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px, py, pw, ph);
    x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 8; x.strokeRect(px, py, pw, ph);
    x.strokeStyle = 'rgba(255,200,150,.1)'; x.lineWidth = 3; x.strokeRect(px + 10, py + 10, pw - 20, ph - 20);
    hx.fillStyle = '#5a5a5a'; hx.fillRect(px, py, pw, ph); hx.fillStyle = '#808080'; hx.fillRect(px + 14, py + 14, pw - 28, ph - 28);
  }
  for (let i = 0; i < 12; i++) stain(x, R(0, W), R(0, H), R(30, 100), 'rgba(0,0,0,A)', R(0.1, 0.3));
  if (scratched) {
    for (let s = 0; s < 3; s++) {
      const bx = R(80, 300), by = R(300, 700), len = R(220, 380), ang = R(-0.25, 0.25);
      for (let k = 0; k < 4; k++) {
        x.save(); x.translate(bx + k * 26, by); x.rotate(ang);
        x.strokeStyle = '#c9a07a'; x.lineWidth = R(3, 6); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(R(-12, 12), len / 2, R(-8, 8), len); x.stroke();
        x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(3, 2); x.quadraticCurveTo(R(-10, 14), len / 2, R(-6, 10), len - 4); x.stroke();
        x.restore();
        hx.save(); hx.translate(bx + k * 26, by); hx.rotate(ang); hx.strokeStyle = '#202020'; hx.lineWidth = 6; hx.beginPath(); hx.moveTo(0, 0); hx.lineTo(0, len); hx.stroke(); hx.restore();
      }
    }
  }
  grain(c, 0.1);
  hx.filter = 'blur(2px)'; hx.drawImage(h, 0, 0); hx.filter = 'none';
  return { map: toTex(c), normalMap: toTex(normalMap(h, 2), null, false) };
}

// ---------- Dinohaut: Schuppen, Streifen ----------
export function skinTextures(base = [52, 48, 34], stripes = true) {
  const S = 512, c = cv(S, S), h = cv(S, S), x = c.getContext('2d'), hx = h.getContext('2d');
  const id = x.createImageData(S, S), hd = hx.createImageData(S, S);
  // Zellen für Schuppen
  const pts = []; for (let i = 0; i < 900; i++) pts.push([rand() * S, rand() * S, R(0.7, 1.15)]);
  const grid = {}; const gs = 32; for (const p of pts) { const k = ((p[0] / gs) | 0) + ',' + ((p[1] / gs) | 0); (grid[k] = grid[k] || []).push(p); }
  for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
    let d1 = 1e9, d2 = 1e9, sh = 1; const gx = (xx / gs) | 0, gy = (y / gs) | 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const k = (((gx + ox) % 16 + 16) % 16) + ',' + (((gy + oy) % 16 + 16) % 16), L = grid[k]; if (!L) continue;
      for (const p of L) {
        let dx = Math.abs(p[0] - xx), dy = Math.abs(p[1] - y); if (dx > S / 2) dx = S - dx; if (dy > S / 2) dy = S - dy;
        const d = Math.hypot(dx, dy); if (d < d1) { d2 = d1; d1 = d; sh = p[2]; } else if (d < d2) d2 = d;
      }
    }
    const edge = Math.min(1, (d2 - d1) / 4), i = (y * S + xx) * 4;
    const st = stripes ? Math.max(0, Math.sin(xx / S * TAU * 7 + fbm(xx / 60, y / 60, 3) * 6)) : 0;
    const n = fbm(xx / 90, y / 90, 3);
    const k = (0.65 + n * 0.6) * sh * (0.55 + edge * 0.45) * (1 - st * 0.45);
    id.data[i] = base[0] * k; id.data[i + 1] = base[1] * k; id.data[i + 2] = base[2] * k; id.data[i + 3] = 255;
    const hv = Math.min(255, (edge * 0.8 + 0.2) * 255 * Math.min(1, 1 - d1 / 40 + 0.4));
    hd.data[i] = hd.data[i + 1] = hd.data[i + 2] = hv; hd.data[i + 3] = 255;
  }
  x.putImageData(id, 0, 0); hx.putImageData(hd, 0, 0);
  return { map: toTex(c), normalMap: toTex(normalMap(h, 4), null, false) };
}

// ---------- Papier mit Text ----------
export function paperCanvas(lines, opt = {}) {
  const W = 600, H = 800, c = cv(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#d9cfb0'); g.addColorStop(1, '#bfb08a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 10; i++) stain(x, R(0, W), R(0, H), R(30, 160), 'rgba(110,80,30,A)', R(0.05, 0.25));
  x.fillStyle = '#2a2418'; x.font = 'bold 30px "Courier New", monospace'; x.fillText(opt.title || '', 40, 70);
  x.font = '24px "Courier New", monospace'; let y = 120;
  for (const l of lines) { x.fillStyle = l.startsWith('!') ? '#6a1010' : '#2a2418'; x.fillText(l.replace(/^!/, ''), 40, y); y += 34; }
  if (opt.blood) for (let i = 0; i < 6; i++) stain(x, R(W * 0.5, W), R(H * 0.6, H), R(10, 50), 'rgba(70,5,5,A)', R(0.4, 0.8));
  grain(c, 0.08);
  return c;
}
export function paperTexture(lines, opt) { return toTex(paperCanvas(lines, opt)); }

export function clockTexture() {
  const S = 256, c = cv(S, S), x = c.getContext('2d');
  x.fillStyle = '#d8d0b8'; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 4, 0, TAU); x.fill();
  x.strokeStyle = '#2a2418'; x.lineWidth = 8; x.stroke();
  x.fillStyle = '#2a2418'; x.font = 'bold 26px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU - Math.PI / 2; x.fillText(String(i), S / 2 + Math.cos(a) * 92, S / 2 + Math.sin(a) * 92); }
  stain(x, 80, 70, 60, 'rgba(100,70,20,A)', 0.3);
  return toTex(c);
}

export function radioTexture() {
  const W = 512, H = 256, c = cv(W, H), x = c.getContext('2d');
  x.fillStyle = '#4a2c18'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#1c140c'; x.fillRect(24, 24, 300, 208);
  for (let yy = 30; yy < 228; yy += 9) { x.fillStyle = '#3a2a1a'; x.fillRect(28, yy, 292, 4); }
  x.fillStyle = '#cfb66a'; x.fillRect(350, 40, 140, 60); x.fillStyle = '#2a1a0a'; x.font = '14px monospace';
  for (let i = 0; i < 6; i++) x.fillRect(360 + i * 22, 70, 2, 20);
  x.fillText('MW  UKW', 372, 60);
  for (const [cx, cy] of [[385, 170], [455, 170]]) { x.fillStyle = '#20140a'; x.beginPath(); x.arc(cx, cy, 26, 0, TAU); x.fill(); x.fillStyle = '#6a5a3a'; x.beginPath(); x.arc(cx, cy, 18, 0, TAU); x.fill(); }
  grain(c, 0.15);
  return toTex(c);
}

export function footprintTexture() {
  const S = 256, c = cv(S, S), x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, S, S);
  const col = 'rgba(25,18,10,.85)';
  x.fillStyle = col;
  x.beginPath(); x.ellipse(128, 170, 34, 40, 0, 0, TAU); x.fill();
  for (const [a, l] of [[-0.42, 95], [0, 115], [0.42, 95]]) {
    x.save(); x.translate(128, 160); x.rotate(a);
    x.beginPath(); x.ellipse(0, -l / 2 - 10, 14, l / 2, 0, 0, TAU); x.fill();
    x.beginPath(); x.moveTo(-6, -l - 6); x.lineTo(0, -l - 26); x.lineTo(6, -l - 6); x.fill();
    x.restore();
  }
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 200; i++) { x.fillStyle = `rgba(0,0,0,${R(0.1, 0.6)})`; x.beginPath(); x.arc(R(0, S), R(0, S), R(1, 6), 0, TAU); x.fill(); }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function scratchTexture() {
  const W = 512, H = 512, c = cv(W, H), x = c.getContext('2d');
  for (let s = 0; s < 2; s++) {
    const bx = 120 + s * 160, by = 60, ang = -0.2 + s * 0.25;
    for (let k = 0; k < 4; k++) {
      x.save(); x.translate(bx + k * 30, by + k * 10); x.rotate(ang);
      x.strokeStyle = 'rgba(210,190,150,.9)'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(14, 200, 4, 380); x.stroke();
      x.strokeStyle = 'rgba(10,6,2,.9)'; x.lineWidth = 3; x.beginPath(); x.moveTo(3, 6); x.quadraticCurveTo(16, 200, 6, 370); x.stroke();
      x.restore();
    }
  }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function cookieTexture() {
  const S = 256, c = cv(S, S), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, '#fff'); g.addColorStop(0.2, '#f0ece2'); g.addColorStop(0.26, '#fbf8f0'); g.addColorStop(0.5, '#a49e92'); g.addColorStop(0.56, '#b4aea2'); g.addColorStop(0.8, '#3a3632'); g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 30; i++) stain(x, R(40, 216), R(40, 216), R(6, 30), 'rgba(0,0,0,A)', R(0.05, 0.2));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Gemälde: Farnwald im Nebel. Variante 1: dieselbe Szene, aber mit einer Gestalt zwischen den Stämmen.
export function paintingTexture(variant) {
  const W = 512, H = 384, c = cv(W, H), x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#6c7058'); sky.addColorStop(0.6, '#3c4430'); sky.addColorStop(1, '#1a1e12');
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  seed = 99;
  for (let layer = 0; layer < 3; layer++) {
    const a = 0.3 + layer * 0.3;
    for (let i = 0; i < 9; i++) {
      const tx = R(0, W), tw = R(8, 22) * (1 + layer * 0.5);
      x.fillStyle = `rgba(${20 - layer * 5},${26 - layer * 6},${14 - layer * 4},${a})`; x.fillRect(tx, R(-20, 60), tw, H);
    }
    for (let i = 0; i < 30; i++) {
      const fx = R(0, W), fy = H * (0.65 + layer * 0.12);
      x.strokeStyle = `rgba(${30 + layer * 10},${50 + layer * 12},${24},${0.5 + layer * 0.2})`; x.lineWidth = 2;
      for (let k = -4; k <= 4; k++) { x.beginPath(); x.moveTo(fx, fy); x.quadraticCurveTo(fx + k * 8, fy - 40, fx + k * 16, fy - R(20, 50)); x.stroke(); }
    }
    x.fillStyle = `rgba(150,150,120,${0.08})`; x.fillRect(0, H * 0.4, W, H * 0.3);
  }
  if (variant) {
    // Gestalt: dunkler Umriss mit zwei hellen Augen
    x.fillStyle = 'rgba(8,8,4,.92)';
    x.beginPath(); x.ellipse(300, 250, 46, 30, -0.2, 0, TAU); x.fill();
    x.beginPath(); x.moveTo(330, 238); x.quadraticCurveTo(360, 190, 372, 170); x.lineTo(392, 176); x.quadraticCurveTo(375, 200, 350, 246); x.fill();
    x.beginPath(); x.ellipse(392, 168, 26, 11, 0.2, 0, TAU); x.fill();
    x.beginPath(); x.moveTo(260, 250); x.quadraticCurveTo(200, 270, 150, 300); x.lineTo(155, 306); x.quadraticCurveTo(210, 280, 265, 262); x.fill();
    x.fillRect(290, 270, 8, 60); x.fillRect(312, 270, 8, 60);
    x.fillStyle = '#e0d070'; x.beginPath(); x.arc(400, 164, 2.5, 0, TAU); x.fill();
  }
  grain(c, 0.12);
  // Craquelé
  x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 0.6;
  for (let i = 0; i < 80; i++) { x.beginPath(); let px = R(0, W), py = R(0, H); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += R(-15, 15); py += R(-15, 15); x.lineTo(px, py); } x.stroke(); }
  return toTex(c);
}

export function signTexture(text, col = '#3dff7a') {
  const W = 512, H = 160, c = cv(W, H), x = c.getContext('2d');
  x.fillStyle = '#0a1a0e'; x.fillRect(0, 0, W, H);
  x.fillStyle = col; x.font = 'bold 84px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + 4);
  return toTex(c);
}

export function rainGlassTexture() {
  const S = 512, c = cv(S, S), x = c.getContext('2d');
  x.clearRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {
    const px = R(0, S), py = R(0, S), r = R(1, 4);
    x.fillStyle = `rgba(200,220,230,${R(0.15, 0.45)})`; x.beginPath(); x.ellipse(px, py, r, r * 1.3, 0, 0, TAU); x.fill();
    if (rand() < 0.25) { x.strokeStyle = 'rgba(200,220,230,.18)'; x.lineWidth = r * 0.8; x.beginPath(); x.moveTo(px, py); x.lineTo(px + R(-3, 3), py - R(20, 90)); x.stroke(); }
  }
  return toTex(c);
}

export function tileTextures() {
  const S = 1024, c = cv(S, S), h = cv(S, S), x = c.getContext('2d'), hx = h.getContext('2d');
  x.fillStyle = '#1c1e18'; x.fillRect(0, 0, S, S); hx.fillStyle = '#202020'; hx.fillRect(0, 0, S, S);
  const n = 8, ts = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const l = R(30, 46); x.fillStyle = `hsl(${R(60, 90)},${R(4, 12)}%,${l}%)`; x.fillRect(i * ts + 3, j * ts + 3, ts - 6, ts - 6);
    hx.fillStyle = `rgb(${R(170, 210)},${R(170, 210)},${R(170, 210)})`; hx.fillRect(i * ts + 4, j * ts + 4, ts - 8, ts - 8);
    if (rand() < 0.2) { x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(i * ts + R(0, ts), j * ts); x.lineTo(i * ts + R(0, ts), j * ts + ts); x.stroke(); }
  }
  for (let i = 0; i < 50; i++) stain(x, R(0, S), R(0, S), R(30, 160), 'rgba(30,50,15,A)', R(0.15, 0.5)); // Moos
  for (let i = 0; i < 30; i++) stain(x, R(0, S), R(0, S), R(30, 120), 'rgba(0,0,0,A)', R(0.1, 0.4));
  grain(c, 0.15);
  hx.filter = 'blur(2px)'; hx.drawImage(h, 0, 0); hx.filter = 'none';
  const r = cv(256, 256), rx = r.getContext('2d'); rx.fillStyle = '#707070'; rx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 25; i++) stain(rx, R(0, 256), R(0, 256), R(10, 50), 'rgba(0,0,0,A)', R(0.4, 0.8)); // Pfützen
  return { map: toTex(c), normalMap: toTex(normalMap(h, 3), null, false), roughnessMap: toTex(r, null, false) };
}

export function leafTexture() {
  const S = 256, c = cv(S, S), x = c.getContext('2d');
  x.clearRect(0, 0, S, S);
  // Farnwedel
  x.strokeStyle = '#2c3a18'; x.lineWidth = 4; x.beginPath(); x.moveTo(128, 250); x.quadraticCurveTo(122, 120, 128, 6); x.stroke();
  for (let t = 0.05; t < 0.95; t += 0.045) {
    const y = 250 - t * 244, w = Math.sin(t * Math.PI) * 110;
    for (const s of [-1, 1]) {
      const g = x.createLinearGradient(128, y, 128 + s * w, y - 14); g.addColorStop(0, '#2e4a1a'); g.addColorStop(1, '#4a6a28');
      x.fillStyle = g; x.beginPath(); x.moveTo(128, y); x.quadraticCurveTo(128 + s * w * 0.5, y - 18, 128 + s * w, y - 12); x.quadraticCurveTo(128 + s * w * 0.5, y + 2, 128, y + 6); x.fill();
    }
  }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function bloodTexture() {
  const S = 256, c = cv(S, S), x = c.getContext('2d');
  x.clearRect(0, 0, S, S);
  for (let i = 0; i < 14; i++) stain(x, 128 + R(-50, 50), 128 + R(-50, 50), R(12, 60), 'rgba(50,4,4,A)', R(0.5, 0.9));
  for (let i = 0; i < 20; i++) { x.fillStyle = 'rgba(45,3,3,.8)'; x.beginPath(); x.arc(128 + R(-110, 110), 128 + R(-110, 110), R(1, 5), 0, TAU); x.fill(); }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// ================= Labor-Texturen =================
function pack(c, h, rough, ns = 2.5, rep) {
  const o = { map: toTex(c, rep) };
  if (h) o.normalMap = toTex(normalMap(h, ns), rep, false);
  if (rough) o.roughnessMap = toTex(rough, rep, false);
  return o;
}
function roughFrom(c, base, var_, wet) {
  const r = cv(256, 256), x = r.getContext('2d'); x.fillStyle = `rgb(${base},${base},${base})`; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) stain(x, R(0, 256), R(0, 256), R(10, 60), 'rgba(255,255,255,A)', R(0, var_));
  for (let i = 0; i < (wet || 0); i++) stain(x, R(0, 256), R(0, 256), R(15, 70), 'rgba(0,0,0,A)', R(0.4, 0.9));
  grain(r, 0.15); return r;
}
// Beton (Wände Lager, Generator, Treppenhaus)
export function concreteTex() {
  const S = 512, c = cv(S, S), h = cv(S, S), x = c.getContext('2d'), hx = h.getContext('2d');
  x.fillStyle = '#6a6862'; x.fillRect(0, 0, S, S); hx.fillStyle = '#808080'; hx.fillRect(0, 0, S, S);
  grain(c, 0.35, 0.6, 'fbm');
  for (let i = 0; i < 400; i++) { const px = R(0, S), py = R(0, S), r = R(0.5, 2.5); x.fillStyle = `rgba(30,30,28,${R(0.2, 0.6)})`; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); hx.fillStyle = '#404040'; hx.beginPath(); hx.arc(px, py, r, 0, TAU); hx.fill(); }
  // Schalungsfugen
  for (const y of [S / 2]) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, y - 2, S, 4); hx.fillStyle = '#303030'; hx.fillRect(0, y - 2, S, 4); }
  for (const [px, py] of [[S * 0.25, S * 0.25], [S * 0.75, S * 0.25], [S * 0.25, S * 0.75], [S * 0.75, S * 0.75]]) { x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.arc(px, py, 5, 0, TAU); x.fill(); hx.fillStyle = '#202020'; hx.beginPath(); hx.arc(px, py, 5, 0, TAU); hx.fill(); }
  for (let i = 0; i < 8; i++) { const sx = R(0, S), len = R(100, 400); const g = x.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(30,25,15,.4)'); g.addColorStop(1, 'rgba(30,25,15,0)'); x.fillStyle = g; x.fillRect(sx, 0, R(6, 30), len); }
  for (let i = 0; i < 20; i++) stain(x, R(0, S), R(0, S), R(30, 120), 'rgba(20,18,12,A)', R(0.1, 0.3));
  hx.filter = 'blur(1px)'; hx.drawImage(h, 0, 0); hx.filter = 'none';
  return pack(c, h, roughFrom(c, 220, 0.1), 2);
}
// Laborwand: helle Paneele mit Fugen, unten Schmutz, Schrauben
export function panelTex(tint = [178, 182, 178], dirty = 1) {
  const W = 512, Hh = 768, c = cv(W, Hh), h = cv(W, Hh), x = c.getContext('2d'), hx = h.getContext('2d'); // 2 m breit, 3 m hoch
  x.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`; x.fillRect(0, 0, W, Hh); hx.fillStyle = '#909090'; hx.fillRect(0, 0, W, Hh);
  grain(c, 0.08, 1, 'fbm');
  const rows = [0, 0.33, 0.8, 1], cols = [0, 0.5, 1];
  for (let i = 0; i < cols.length - 1; i++) for (let j = 0; j < rows.length - 1; j++) {
    const x0 = cols[i] * W, x1 = cols[i + 1] * W, y0 = rows[j] * Hh, y1 = rows[j + 1] * Hh;
    const k = R(0.94, 1.04); x.fillStyle = `rgba(${k > 1 ? 255 : 0},${k > 1 ? 255 : 0},${k > 1 ? 255 : 0},${Math.abs(1 - k) * 1.5})`; x.fillRect(x0, y0, x1 - x0, y1 - y0);
    x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 4; x.strokeRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4);
    x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1.5; x.strokeRect(x0 + 5, y0 + 5, x1 - x0 - 10, y1 - y0 - 10);
    hx.fillStyle = '#404040'; hx.fillRect(x0, y0, x1 - x0, y1 - y0); hx.fillStyle = '#a0a0a0'; hx.fillRect(x0 + 5, y0 + 5, x1 - x0 - 10, y1 - y0 - 10);
    for (const [sx, sy] of [[x0 + 14, y0 + 14], [x1 - 14, y0 + 14], [x0 + 14, y1 - 14], [x1 - 14, y1 - 14]]) { x.fillStyle = 'rgba(60,60,60,.8)'; x.beginPath(); x.arc(sx, sy, 3.5, 0, TAU); x.fill(); hx.fillStyle = '#e0e0e0'; hx.beginPath(); hx.arc(sx, sy, 3.5, 0, TAU); hx.fill(); }
  }
  // Sockelleiste
  x.fillStyle = '#3a3c3c'; x.fillRect(0, Hh - 34, W, 34); hx.fillStyle = '#c0c0c0'; hx.fillRect(0, Hh - 34, W, 34);
  // Schmutz und Rost
  const gd = x.createLinearGradient(0, Hh * 0.6, 0, Hh); gd.addColorStop(0, 'rgba(30,26,18,0)'); gd.addColorStop(1, `rgba(30,26,18,${0.55 * dirty})`); x.fillStyle = gd; x.fillRect(0, Hh * 0.6, W, Hh * 0.4);
  for (let i = 0; i < 18 * dirty; i++) stain(x, R(0, W), R(0, Hh), R(20, 110), 'rgba(40,32,18,A)', R(0.06, 0.25));
  for (let i = 0; i < 5 * dirty; i++) { const sx = R(0, W), len = R(80, 500), g = x.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(70,40,15,.45)'); g.addColorStop(1, 'rgba(70,40,15,0)'); x.fillStyle = g; x.fillRect(sx, R(0, Hh * 0.3), R(2, 10), len); }
  hx.filter = 'blur(1.2px)'; hx.drawImage(h, 0, 0); hx.filter = 'none';
  return pack(c, h, roughFrom(c, 120, 0.25), 2.5);
}
// Bodenfliesen
export function floorTileTex(col = [150, 152, 148], size = 8, grout = '#2a2a26', wet = 6) {
  const S = 512, c = cv(S, S), h = cv(S, S), x = c.getContext('2d'), hx = h.getContext('2d');
  x.fillStyle = grout; x.fillRect(0, 0, S, S); hx.fillStyle = '#202020'; hx.fillRect(0, 0, S, S);
  const ts = S / size;
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
    const k = R(0.88, 1.06); x.fillStyle = `rgb(${col[0] * k},${col[1] * k},${col[2] * k})`; x.fillRect(i * ts + 2, j * ts + 2, ts - 4, ts - 4);
    hx.fillStyle = `rgb(${R(175, 200)},0,0)`; hx.fillRect(i * ts + 3, j * ts + 3, ts - 6, ts - 6);
    if (rand() < 0.08) { x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(i * ts + R(0, ts), j * ts); x.lineTo(i * ts + R(0, ts), j * ts + R(ts * 0.5, ts)); x.stroke(); }
  }
  { const id = hx.getImageData(0, 0, S, S), d = id.data; for (let i = 0; i < d.length; i += 4) d[i + 1] = d[i + 2] = d[i]; hx.putImageData(id, 0, 0); }
  grain(c, 0.25, 0.8, 'fbm');
  for (let i = 0; i < 30; i++) stain(x, R(0, S), R(0, S), R(20, 120), 'rgba(25,22,15,A)', R(0.08, 0.35));
  hx.filter = 'blur(1px)'; hx.drawImage(h, 0, 0); hx.filter = 'none';
  return pack(c, h, roughFrom(c, 150, 0.15, wet), 2);
}
export function carpetTex() {
  const S = 256, c = cv(S, S), x = c.getContext('2d'); x.fillStyle = '#2c3038'; x.fillRect(0, 0, S, S);
  grain(c, 0.5); grain(c, 0.3, 0.4, 'fbm');
  for (let i = 0; i < 12; i++) stain(x, R(0, S), R(0, S), R(10, 60), 'rgba(10,8,5,A)', R(0.2, 0.5));
  return { map: toTex(c) };
}
export function grateTex() {
  const S = 256, c = cv(S, S), x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { x.fillStyle = `rgb(${R(70, 95)},${R(70, 90)},${R(65, 85)})`; x.fillRect(i * 16 + 1, j * 16 + 1, 14, 3); x.fillRect(i * 16 + 1, j * 16 + 9, 14, 3); }
  for (let i = 0; i < 10; i++) stain(x, R(0, S), R(0, S), R(10, 50), 'rgba(80,40,10,A)', R(0.2, 0.5));
  const a = cv(S, S), ax = a.getContext('2d'); ax.fillStyle = '#000'; ax.fillRect(0, 0, S, S); ax.fillStyle = '#fff';
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { ax.fillRect(i * 16 + 1, j * 16 + 1, 14, 3); ax.fillRect(i * 16 + 1, j * 16 + 9, 14, 3); ax.fillRect(i * 16, j * 16, 1, 16); }
  return { map: toTex(c), alphaMap: toTex(a, null, false) };
}
export function ceilTileTex() {
  const S = 256, c = cv(S, S), h = cv(S, S), x = c.getContext('2d'), hx = h.getContext('2d');
  x.fillStyle = '#9a9a94'; x.fillRect(0, 0, S, S); hx.fillStyle = '#a0a0a0'; hx.fillRect(0, 0, S, S);
  grain(c, 0.3);
  x.strokeStyle = '#505048'; x.lineWidth = 6; x.strokeRect(0, 0, S, S); hx.strokeStyle = '#303030'; hx.lineWidth = 6; hx.strokeRect(0, 0, S, S);
  for (let i = 0; i < 6; i++) stain(x, R(0, S), R(0, S), R(10, 80), 'rgba(80,60,20,A)', R(0.1, 0.45));
  return pack(c, h, null, 2);
}
export function lockerTex() {
  const W = 128, Hh = 512, c = cv(W, Hh), h = cv(W, Hh), x = c.getContext('2d'), hx = h.getContext('2d');
  x.fillStyle = '#3e5058'; x.fillRect(0, 0, W, Hh); hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, Hh);
  grain(c, 0.12, 1, 'fbm');
  for (const y0 of [40, Hh - 120]) for (let i = 0; i < 6; i++) { const y = y0 + i * 12; x.fillStyle = '#0a0c0e'; x.fillRect(28, y, W - 56, 5); x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(28, y + 5, W - 56, 1.5); hx.fillStyle = '#202020'; hx.fillRect(28, y, W - 56, 5); }
  x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 4; x.strokeRect(4, 4, W - 8, Hh - 8); hx.strokeStyle = '#d0d0d0'; hx.lineWidth = 4; hx.strokeRect(6, 6, W - 12, Hh - 12);
  x.fillStyle = '#aaa'; x.fillRect(W - 26, Hh / 2 - 30, 8, 60); x.fillStyle = '#d8d0b0'; x.fillRect(36, 150, 56, 22); x.fillStyle = '#333'; x.font = 'bold 14px monospace'; x.fillText(String(Math.floor(R(10, 99))), 52, 166);
  for (let i = 0; i < 6; i++) stain(x, R(0, W), R(0, Hh), R(10, 50), 'rgba(80,50,20,A)', R(0.1, 0.4));
  const r = roughFrom(c, 110, 0.3);
  return pack(c, h, r, 2);
}
export function screenTex(kind, seedv = 0) {
  const W = 256, Hh = 160, c = cv(W, Hh), x = c.getContext('2d');
  x.fillStyle = kind === 'cctv' ? '#0b1410' : '#03100a'; x.fillRect(0, 0, W, Hh);
  if (kind === 'cctv') {
    // Überwachungsbild: Gang in Grautönen
    const g = x.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, '#1a2420'); g.addColorStop(1, '#2a3a32'); x.fillStyle = g; x.fillRect(0, 0, W, Hh);
    x.fillStyle = '#0a100c'; x.beginPath(); x.moveTo(W * 0.4, Hh * 0.35); x.lineTo(W * 0.6, Hh * 0.35); x.lineTo(W * 0.6, Hh * 0.7); x.lineTo(W * 0.4, Hh * 0.7); x.fill();
    x.strokeStyle = '#3a5046'; x.beginPath(); x.moveTo(0, 0); x.lineTo(W * 0.4, Hh * 0.35); x.moveTo(W, 0); x.lineTo(W * 0.6, Hh * 0.35); x.moveTo(0, Hh); x.lineTo(W * 0.4, Hh * 0.7); x.moveTo(W, Hh); x.lineTo(W * 0.6, Hh * 0.7); x.stroke();
    if (seedv % 3 === 1) { x.fillStyle = '#050805'; x.beginPath(); x.ellipse(W * 0.52, Hh * 0.62, 14, 8, 0, 0, TAU); x.fill(); x.fillRect(W * 0.56, Hh * 0.5, 4, 10); }
    x.fillStyle = '#9fe0b0'; x.font = '12px monospace'; x.fillText('KAM ' + (seedv + 1) + '  REC', 8, 16); x.fillText('03:4' + seedv + ':12', W - 74, Hh - 8);
    for (let y = 0; y < Hh; y += 3) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, y, W, 1); }
  } else {
    x.fillStyle = '#3dff8a'; x.font = '11px monospace';
    const L = ['LINDHOLM BIOSYS v4.2', '> STATUS GEHEGE B ... OFFEN', '> K-7 ... NICHT GEFUNDEN', '> K-9 ... NICHT GEFUNDEN', '> STROM: NOTBETRIEB', '> TEMP 31.4 C', '> FEHLER 0x7F2A', '_'];
    L.forEach((l, i) => { x.globalAlpha = 0.6 + rand() * 0.4; x.fillText(l, 8, 18 + i * 17); }); x.globalAlpha = 1;
    for (let y = 0; y < Hh; y += 2) { x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, y, W, 1); }
  }
  return toTex(c);
}
export function cardboardTex() {
  const S = 256, c = cv(S, S), x = c.getContext('2d'); x.fillStyle = '#8a6a44'; x.fillRect(0, 0, S, S); grain(c, 0.2, 0.5, 'fbm');
  x.fillStyle = '#5a4026'; x.fillRect(0, S / 2 - 12, S, 24); x.fillStyle = 'rgba(30,20,10,.7)'; x.font = 'bold 22px Arial'; x.fillText('PROBEN', 30, 70); x.fillText('↑↑', 190, 220);
  return { map: toTex(c) };
}
export function stripeTex() {
  const S = 256, c = cv(S, 64), x = c.getContext('2d'); x.fillStyle = '#d4a812'; x.fillRect(0, 0, S, 64);
  x.fillStyle = '#141414'; for (let i = -2; i < 10; i++) { x.beginPath(); x.moveTo(i * 32, 64); x.lineTo(i * 32 + 16, 64); x.lineTo(i * 32 + 48, 0); x.lineTo(i * 32 + 32, 0); x.fill(); }
  grain(c, 0.3); for (let i = 0; i < 8; i++) stain(x, R(0, S), R(0, 64), R(5, 30), 'rgba(20,15,10,A)', R(0.3, 0.6));
  return toTex(c);
}
export function labelTex(text, bg = '#d8dcd8', fg = '#1a1c1c', w = 512, h = 128) {
  const c = cv(w, h), x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = fg; x.font = `bold ${Math.round(Math.min(h * 0.5, w / text.length * 1.45))}px Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 3);
  x.strokeStyle = fg; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12);
  grain(c, 0.1); for (let i = 0; i < 5; i++) stain(x, R(0, w), R(0, h), R(10, 50), 'rgba(40,30,15,A)', R(0.1, 0.3));
  return toTex(c);
}
export function liquidTex() {
  const S = 128, c = cv(S, S), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#6aff9a'); g.addColorStop(1, '#0a5a30'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(200,255,220,${R(0.1, 0.4)})`; x.beginPath(); x.arc(R(0, S), R(0, S), R(1, 4), 0, TAU); x.stroke(); }
  return toTex(c);
}
export function soilTex() {
  const S = 256, c = cv(S, S), x = c.getContext('2d'); x.fillStyle = '#2a2216'; x.fillRect(0, 0, S, S); grain(c, 0.5, 0.5, 'fbm'); grain(c, 0.3);
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${R(20, 60)},${R(40, 70)},${R(10, 30)},.6)`; x.beginPath(); x.arc(R(0, S), R(0, S), R(2, 8), 0, TAU); x.fill(); }
  return { map: toTex(c) };
}
// Fluchtplan aus dem Raster
export function mapCanvas(grid, rooms, you, extra) {
  const cs = 16, W = grid[0].length * cs + 40, Hh = grid.length * cs + 90, c = cv(W, Hh), x = c.getContext('2d');
  x.fillStyle = '#e8e4d4'; x.fillRect(0, 0, W, Hh);
  x.fillStyle = '#1a6a2a'; x.fillRect(0, 0, W, 50); x.fillStyle = '#fff'; x.font = 'bold 26px Arial'; x.fillText('FLUCHTPLAN  EBENE -3', 20, 34);
  const col = { c: '#c8c4b4', l: '#d8e0e0', v: '#c0c8d0', o: '#d8d0c0', u: '#d0d8d0', x: '#9ad0a0', h: '#d8d4c8', e: '#b0b0b0', g: '#e0c8a0', s: '#d8c8a8', k: '#e0d8c0', m: '#a8a49a', b: '#7a9a6a', d: '#c8c4b4', r: '#e08070', X: '#4ac060', w: '#8ab0d0' };
  for (let r = 0; r < grid.length; r++) for (let q = 0; q < grid[0].length; q++) { const ch = grid[r][q]; if (col[ch]) { x.fillStyle = col[ch]; x.fillRect(20 + q * cs, 60 + r * cs, cs, cs); } }
  x.fillStyle = '#222'; x.font = 'bold 11px Arial'; x.textAlign = 'center';
  for (const rm of rooms) x.fillText(rm.name, 20 + rm.c * cs, 60 + rm.r * cs);
  if (you) { x.fillStyle = '#d01010'; x.beginPath(); x.arc(20 + you.c * cs, 60 + you.r * cs, 6, 0, TAU); x.fill(); x.fillText('Sie sind hier', 20 + you.c * cs, 60 + you.r * cs - 10); }
  x.textAlign = 'left'; x.fillStyle = '#333'; x.font = '13px Arial'; x.fillText(extra || '', 20, Hh - 12);
  return c;
}
