// Weitere Kanäle: Avatar, Foto, Wetter, Pinnwand, Einstellungen.
const AV = {
  skins: ['#ffe0c4', '#f5c9a0', '#e0a878', '#b97a4f', '#8a5533', '#5e3a22'],
  hairCols: ['#2b1b10', '#5a3418', '#a0612b', '#e2b25c', '#d9d9d9', '#c0392b', '#34495e'],
  shirts: ['#34bdef', '#e5242f', '#2eaa4f', '#f5a623', '#8e44ad', '#5c6064'],
  def: { face: 0, skin: 1, hair: 0, hairCol: 1, eyes: 0, mouth: 0, shirt: 0, brows: 0, name: 'Spieler' },
  get() { return Object.assign({}, AV.def, K.store.get('kk-avatar', {})); },
  svg(a, extra = '') {
    const sk = AV.skins[a.skin], hc = AV.hairCols[a.hairCol], sh = AV.shirts[a.shirt];
    const head = [
      `<circle cx="60" cy="58" r="34" fill="${sk}"/>`,
      `<ellipse cx="60" cy="58" rx="30" ry="37" fill="${sk}"/>`,
      `<rect x="27" y="24" width="66" height="68" rx="20" fill="${sk}"/>`][a.face];
    const hairBack = a.hair === 2 ? `<path d="M24 56 C22 18 98 18 96 56 L98 98 L84 98 L84 60 L36 60 L36 98 L22 98Z" fill="${hc}"/>` : '';
    const hair = [
      `<path d="M26 54 C24 20 96 20 94 54 C88 38 70 32 60 34 C48 32 32 38 26 54Z" fill="${hc}"/>`,
      `<path d="M26 54 L30 30 L40 38 L46 20 L56 34 L62 16 L70 33 L80 20 L84 38 L92 30 L94 54 C80 40 40 40 26 54Z" fill="${hc}"/>`,
      `<path d="M26 56 C22 18 98 18 94 56 C86 40 72 34 60 36 C46 34 34 40 26 56Z" fill="${hc}"/>`,
      `<path d="M26 56 C24 20 96 20 94 52 C80 46 62 30 52 28 C46 40 36 46 26 56Z" fill="${hc}"/>`,
      ``,
      `<circle cx="60" cy="18" r="11" fill="${hc}"/><path d="M26 54 C24 22 96 22 94 54 C86 40 72 34 60 35 C48 34 34 40 26 54Z" fill="${hc}"/>`][a.hair];
    const eyes = [
      `<circle cx="47" cy="58" r="4" fill="#222"/><circle cx="73" cy="58" r="4" fill="#222"/>`,
      `<ellipse cx="47" cy="58" rx="6" ry="7" fill="#fff"/><ellipse cx="73" cy="58" rx="6" ry="7" fill="#fff"/><circle cx="48" cy="59" r="3.5" fill="#222"/><circle cx="74" cy="59" r="3.5" fill="#222"/>`,
      `<path d="M41 60 Q47 52 53 60 M67 60 Q73 52 79 60" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
      `<path d="M41 59 H53 M67 59 H79" stroke="#222" stroke-width="3.5" stroke-linecap="round"/>`][a.eyes];
    const brows = [`<path d="M41 49 Q47 45 53 48 M67 48 Q73 45 79 49" stroke="${hc}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      `<path d="M41 47 L53 50 M67 50 L79 47" stroke="${hc}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
      ``][a.brows];
    const mouth = [
      `<path d="M50 74 Q60 82 70 74" stroke="#7a2a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
      `<path d="M47 72 Q60 90 73 72 Z" fill="#7a2a1a"/><path d="M50 73 H70 L68 76 H52Z" fill="#fff"/>`,
      `<path d="M51 76 H69" stroke="#7a2a1a" stroke-width="3.5" stroke-linecap="round"/>`,
      `<ellipse cx="60" cy="76" rx="5" ry="6" fill="#7a2a1a"/>`][a.mouth];
    return `<svg viewBox="0 0 120 140" ${extra}>${hairBack}<path d="M20 140 C22 112 40 100 60 100 C80 100 98 112 100 140Z" fill="${sh}"/><rect x="52" y="86" width="16" height="16" rx="6" fill="${sk}"/>
      <ellipse cx="26" cy="62" rx="6" ry="8" fill="${sk}"/><ellipse cx="94" cy="62" rx="6" ry="8" fill="${sk}"/>${head}${hair}${brows}${eyes}
      <circle cx="40" cy="70" r="5" fill="#ff7b7b" opacity=".25"/><circle cx="80" cy="70" r="5" fill="#ff7b7b" opacity=".25"/><path d="M60 62 Q63 68 59 70" stroke="#00000033" stroke-width="2.5" fill="none" stroke-linecap="round"/>${mouth}</svg>`;
  },
};

const CH_CSS = `
.av{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:4vw;height:100%;align-items:center}
.av-prev{background:radial-gradient(circle at 50% 40%,#fff,#e3e7ea);border-radius:30px;border:3px solid #c4c8cc;height:min(62vh,520px);display:grid;place-items:center}
.av-prev svg{height:90%}
.av-rows{display:grid;gap:1.4vh}
.av-row{display:grid;grid-template-columns:9em 56px minmax(0,1fr) 56px;align-items:center;gap:12px;font-weight:800;font-size:20px}
.av-row .v{text-align:center;background:#fff;border:3px solid #dfe2e5;border-radius:14px;padding:8px}
.arr{width:56px;height:56px;border-radius:50%;border:3px solid #c4c8cc;background:linear-gradient(#fff,#eceef0);font-weight:900;font-size:22px;transition:transform .15s,border-color .15s,box-shadow .15s}
.arr.hover{border-color:#34bdef;box-shadow:0 0 0 4px rgba(52,189,239,.35);transform:scale(1.1)}
.ph-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:18px;margin-top:20px;max-height:62vh;overflow:auto}
.ph-t{aspect-ratio:4/3;border-radius:18px;border:4px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.15);background-size:cover;background-position:center;transition:transform .15s,border-color .15s}
.ph-t.hover{transform:scale(1.06) rotate(-1deg);border-color:#34bdef}
.ph-view{position:absolute;inset:0;background:#111;display:none}.ph-view.on{display:block}
.ph-view img{position:absolute;inset:0 0 90px 0;width:100%;height:calc(100% - 90px);object-fit:contain}
.ph-bar{position:absolute;left:0;right:0;bottom:0;height:90px;display:flex;justify-content:center;align-items:center;gap:20px;background:#222}
.drop{display:inline-block;padding:16px 28px;border:3px dashed #9aa0a5;border-radius:18px;font-weight:800;background:#fff}
.drop input{display:none}
.wx{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:4vw;align-items:center;height:calc(100% - 70px)}
.wx-now{text-align:center}.wx-now .t{font-size:clamp(70px,12vh,130px);font-weight:900;color:#3d4145;line-height:1}.wx-now .d{font-size:26px;font-weight:800}
.wx-days{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}
.wx-day{background:#fff;border:3px solid #dfe2e5;border-radius:22px;padding:14px 6px;text-align:center;font-weight:800}
.wx-day svg{width:70%;max-width:80px}.wx-day .hi{font-size:24px;color:#e0612b}.wx-day .lo{color:#1b9fd6}
.bd{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:3vw;height:100%}
.bd textarea{width:100%;height:30vh;resize:none}
.bd-notes{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px;align-content:start;overflow:auto;max-height:66vh;padding:6px}
.note{background:#fff8b8;border-radius:6px;padding:16px 16px 12px;box-shadow:0 6px 14px rgba(0,0,0,.12);font-weight:700;position:relative;transform:rotate(var(--r));white-space:pre-wrap;word-break:break-word}
.note small{display:block;color:#9a8b3a;margin-top:10px}
.note .x{position:absolute;right:6px;top:6px;width:34px;height:34px;border-radius:50%;border:2px solid #d8cb6a;background:#fffbe0;font-weight:900;color:#9a8b3a}
.note .x.hover{border-color:#e5242f;color:#e5242f}
.set{display:grid;gap:1.8vh;max-width:900px;margin:0 auto}
.set-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:20px;background:#fff;border:3px solid #dfe2e5;border-radius:22px;padding:14px 22px;font-weight:800;font-size:21px}
.set-row .row{justify-content:flex-end}
.set-row .val{min-width:4em;text-align:center}
`;
function chStyle() { if (!document.getElementById('ch-css')) { const s = document.createElement('style'); s.id = 'ch-css'; s.textContent = CH_CSS; document.head.appendChild(s); } }
function chFrame(box, title, K, extraHead = '') {
  chStyle();
  box.innerHTML = `<div class="ch"><div class="ch-head"><h2>${title}</h2><div class="row">${extraHead}<button class="hv btn" data-close>Menü</button></div></div><div class="ch-body"></div></div>`;
  box.querySelector('[data-close]').addEventListener('click', () => K.closeChannel());
  return box.querySelector('.ch-body');
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Avatar ----------
const AvatarChannel = {
  id: 'avatar', name: 'Avatar-Kanal',
  tile(el) { el.innerHTML = `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,#fff,#dfe6ec);display:grid;place-items:center">${AV.svg(AV.get(), 'style="height:78%;margin-bottom:12%"')}</div>`; },
  open(box, K) {
    const body = chFrame(box, 'Avatar-Kanal', K);
    let a = AV.get();
    const ROWS = [
      ['face', 'Kopfform', ['Rund', 'Oval', 'Eckig']], ['skin', 'Hautton', AV.skins.map((_, i) => 'Ton ' + (i + 1))],
      ['hair', 'Frisur', ['Kurz', 'Stachelig', 'Lang', 'Seitenscheitel', 'Glatze', 'Dutt']], ['hairCol', 'Haarfarbe', ['Schwarz', 'Braun', 'Rotbraun', 'Blond', 'Grau', 'Rot', 'Blaugrau']],
      ['brows', 'Augenbrauen', ['Sanft', 'Streng', 'Keine']], ['eyes', 'Augen', ['Punkte', 'Groß', 'Fröhlich', 'Müde']],
      ['mouth', 'Mund', ['Lächeln', 'Lachen', 'Neutral', 'Staunen']], ['shirt', 'Pulli', ['Blau', 'Rot', 'Grün', 'Orange', 'Lila', 'Grau']]];
    body.innerHTML = `<div class="av"><div class="av-prev" id="av-p"></div><div class="av-rows">
      ${ROWS.map(([k, l]) => `<div class="av-row"><span>${l}</span><button class="hv arr" data-k="${k}" data-d="-1">◀</button><div class="v" id="av-${k}"></div><button class="hv arr" data-k="${k}" data-d="1">▶</button></div>`).join('')}
      <div class="row" style="margin-top:8px"><input class="hv field" id="av-name" maxlength="12" value="${esc(a.name)}" style="width:12em"><button class="hv btn" id="av-save">Speichern</button><button class="hv btn" id="av-rand">Zufall</button></div></div></div>`;
    const draw = () => { body.querySelector('#av-p').innerHTML = AV.svg(a); ROWS.forEach(([k, , n]) => body.querySelector('#av-' + k).textContent = n[a[k]]); };
    body.querySelectorAll('.arr').forEach(b => b.addEventListener('click', () => { const r = ROWS.find(x => x[0] === b.dataset.k); a[r[0]] = (a[r[0]] + +b.dataset.d + r[2].length) % r[2].length; draw(); }));
    body.querySelector('#av-rand').addEventListener('click', () => { ROWS.forEach(([k, , n]) => a[k] = Math.floor(Math.random() * n.length)); draw(); });
    body.querySelector('#av-save').addEventListener('click', () => { a.name = body.querySelector('#av-name').value.trim() || 'Spieler'; K.store.set('kk-avatar', a); K.toast('Avatar gespeichert'); });
    draw();
    return {};
  },
};

// ---------- Foto ----------
const photos = [];
const FotoChannel = {
  id: 'foto', name: 'Foto-Kanal',
  tile(el) {
    el.innerHTML = `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%"><rect width="320" height="200" fill="#e9eef2"/>
      <g transform="rotate(-8 110 100)"><rect x="50" y="40" width="120" height="110" fill="#fff" stroke="#d0d5da" stroke-width="2"/><rect x="60" y="50" width="100" height="72" fill="#7cc6ec"/><circle cx="135" cy="70" r="10" fill="#ffd54a"/><path d="M60 122 L95 85 L120 108 L135 95 L160 122Z" fill="#4caf50"/></g>
      <g transform="rotate(7 210 100)"><rect x="150" y="45" width="120" height="110" fill="#fff" stroke="#d0d5da" stroke-width="2"/><rect x="160" y="55" width="100" height="72" fill="#f4a261"/><circle cx="210" cy="91" r="22" fill="#e76f51"/></g></svg>`;
  },
  open(box, K) {
    const body = chFrame(box, 'Foto-Kanal', K);
    body.innerHTML = `<div class="row"><label class="drop hv" id="ph-pick">Fotos auswählen (Mausklick)<input type="file" accept="image/*" multiple id="ph-in"></label><span class="muted">Fotos bleiben nur, bis die Seite neu geladen wird.</span></div>
      <div class="ph-grid" id="ph-g"></div>
      <div class="ph-view" id="ph-v"><img id="ph-img" alt=""><div class="ph-bar"><button class="hv arr" id="ph-prev">◀</button><button class="hv btn" id="ph-show">Diashow</button><button class="hv btn" id="ph-close">Schließen</button><button class="hv arr" id="ph-next">▶</button></div></div>`;
    const g = body.querySelector('#ph-g'), v = body.querySelector('#ph-v'), img = body.querySelector('#ph-img');
    let idx = 0, slide = null;
    const grid = () => { g.innerHTML = photos.length ? photos.map((p, i) => `<button class="hv ph-t" data-i="${i}" style="background-image:url(${p})"></button>`).join('') : '<p class="muted">Noch keine Fotos. Wähle oben Bilder von deinem Laptop aus.</p>'; g.querySelectorAll('.ph-t').forEach(b => b.addEventListener('click', () => view(+b.dataset.i))); };
    const view = i => { if (!photos.length) return; idx = (i + photos.length) % photos.length; img.src = photos[idx]; v.classList.add('on'); };
    const stopSlide = () => { clearInterval(slide); slide = null; body.querySelector('#ph-show').textContent = 'Diashow'; };
    body.querySelector('#ph-in').addEventListener('change', e => { [...e.target.files].forEach(f => photos.push(URL.createObjectURL(f))); grid(); });
    body.querySelector('#ph-prev').addEventListener('click', () => view(idx - 1));
    body.querySelector('#ph-next').addEventListener('click', () => view(idx + 1));
    body.querySelector('#ph-close').addEventListener('click', () => { stopSlide(); v.classList.remove('on'); });
    body.querySelector('#ph-show').addEventListener('click', e => { if (slide) stopSlide(); else { slide = setInterval(() => view(idx + 1), 3500); e.currentTarget.textContent = 'Diashow stoppen'; } });
    grid();
    return {
      onButton(n, d) {
        if (!d || !v.classList.contains('on')) return false;
        if (n === 'LEFT') { view(idx - 1); return true; } if (n === 'RIGHT') { view(idx + 1); return true; }
        if (n === 'B') { stopSlide(); v.classList.remove('on'); return true; }
        return false;
      },
      close() { stopSlide(); },
    };
  },
};

// ---------- Wetter ----------
function wxKind(c) { if (c === 0) return 'sun'; if (c <= 2) return 'part'; if (c === 3) return 'cloud'; if (c <= 48) return 'fog'; if (c <= 67 || (c >= 80 && c <= 82)) return 'rain'; if (c <= 77 || c === 85 || c === 86) return 'snow'; return 'storm'; }
const WX_TXT = { sun: 'Sonnig', part: 'Heiter bis wolkig', cloud: 'Bewölkt', fog: 'Nebel', rain: 'Regen', snow: 'Schnee', storm: 'Gewitter' };
function wxIcon(k) {
  const sun = '<circle cx="50" cy="42" r="18" fill="#ffc83d"/><g stroke="#ffc83d" stroke-width="5" stroke-linecap="round">' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r = a * Math.PI / 180; return `<line x1="${50 + Math.cos(r) * 26}" y1="${42 + Math.sin(r) * 26}" x2="${50 + Math.cos(r) * 34}" y2="${42 + Math.sin(r) * 34}"/>`; }).join('') + '</g>';
  const cloud = (x, y, c = '#dfe5ea') => `<path d="M${x} ${y} h44 a12 12 0 0 0 0-24 a16 16 0 0 0-30-6 a12 12 0 0 0-14 30z" fill="${c}" stroke="#b9c2ca" stroke-width="2"/>`;
  const drops = (col, sym) => [30, 48, 66].map(x => sym === 'snow' ? `<circle cx="${x}" cy="84" r="4" fill="#fff" stroke="#9fb5c7" stroke-width="1.5"/>` : `<line x1="${x}" y1="78" x2="${x - 5}" y2="90" stroke="${col}" stroke-width="5" stroke-linecap="round"/>`).join('');
  const body = { sun, part: sun.replace('cx="50" cy="42"', 'cx="38" cy="36"') + cloud(36, 74), cloud: cloud(20, 64, '#cfd7de') + cloud(36, 76),
    fog: cloud(24, 56) + '<g stroke="#b9c2ca" stroke-width="5" stroke-linecap="round"><line x1="20" y1="72" x2="80" y2="72"/><line x1="26" y1="84" x2="74" y2="84"/></g>',
    rain: cloud(24, 66) + drops('#3fa7e6'), snow: cloud(24, 66) + drops(0, 'snow'), storm: cloud(24, 66, '#aab4bd') + '<path d="M52 66 L40 84 H52 L44 98 L64 78 H52 L58 66Z" fill="#ffc83d"/>' }[k];
  return `<svg viewBox="0 0 100 100">${body}</svg>`;
}
const WetterChannel = {
  id: 'wetter', name: 'Wetter-Kanal',
  tile(el) {
    const c = K.store.get('kk-wx-cache', null);
    el.innerHTML = `<div style="position:absolute;inset:0;background:linear-gradient(#7cc6ec,#d7eefa);display:flex;align-items:center;justify-content:center;gap:6%;padding-bottom:12%">
      <div style="width:42%">${wxIcon(c ? c.kind : 'part')}</div><div style="font-weight:900;font-size:clamp(20px,2.6vw,38px);color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.25)">${c ? Math.round(c.temp) + '°' : ''}</div></div>`;
  },
  open(box, K) {
    const body = chFrame(box, 'Wetter-Kanal', K);
    let city = K.store.get('kk-wx-city', 'Berlin');
    body.innerHTML = `<div class="row"><input class="hv field" id="wx-city" value="${esc(city)}" style="width:14em"><button class="hv btn" id="wx-go">Ort suchen</button><span class="muted" id="wx-msg"></span></div><div class="wx" id="wx-out"></div>`;
    const out = body.querySelector('#wx-out'), msg = body.querySelector('#wx-msg');
    const TG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    async function load() {
      msg.textContent = 'Lade …';
      try {
        const geo = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=de&name=' + encodeURIComponent(city))).json();
        if (!geo.results || !geo.results.length) { msg.textContent = 'Ort nicht gefunden'; return; }
        const p = geo.results[0];
        const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`)).json();
        const k = wxKind(w.current.weather_code);
        K.store.set('kk-wx-city', city); K.store.set('kk-wx-cache', { kind: k, temp: w.current.temperature_2m });
        out.innerHTML = `<div class="wx-now"><div style="width:min(240px,60%);margin:0 auto">${wxIcon(k)}</div><div class="t">${Math.round(w.current.temperature_2m)}°</div><div class="d">${esc(p.name)} · ${WX_TXT[k]}</div><p class="muted">Wind ${Math.round(w.current.wind_speed_10m)} km/h · Feuchte ${w.current.relative_humidity_2m} %</p></div>
          <div class="wx-days">${w.daily.time.map((d, i) => `<div class="wx-day"><div>${i ? TG[new Date(d).getDay()] : 'Heute'}</div>${wxIcon(wxKind(w.daily.weather_code[i]))}<div class="hi">${Math.round(w.daily.temperature_2m_max[i])}°</div><div class="lo">${Math.round(w.daily.temperature_2m_min[i])}°</div></div>`).join('')}</div>`;
        msg.textContent = 'Daten: Open-Meteo';
      } catch (e) { msg.textContent = 'Wetterdaten nicht erreichbar.'; }
    }
    body.querySelector('#wx-go').addEventListener('click', () => { city = body.querySelector('#wx-city').value.trim() || city; load(); });
    body.querySelector('#wx-city').addEventListener('keydown', e => { if (e.key === 'Enter') { city = e.target.value.trim() || city; e.target.blur(); load(); } });
    load();
    return {};
  },
};

// ---------- Pinnwand ----------
const BoardChannel = {
  id: 'board', name: 'Pinnwand',
  tile(el) {
    const n = (K.store.get('kk-board', []) || []).length;
    el.innerHTML = `<div style="position:absolute;inset:0;background:#c79a62;background-image:radial-gradient(#b4844c 1.5px,transparent 1.5px);background-size:12px 12px;display:grid;place-items:center;padding-bottom:12%">
      <div style="background:#fff8b8;width:46%;aspect-ratio:1;transform:rotate(-5deg);box-shadow:0 4px 10px rgba(0,0,0,.2);display:grid;place-items:center;font-weight:900;font-size:clamp(18px,2.4vw,34px);color:#9a8b3a">${n || '+'}</div></div>`;
  },
  open(box, K) {
    const body = chFrame(box, 'Pinnwand', K);
    let notes = K.store.get('kk-board', []) || [];
    body.innerHTML = `<div class="bd"><div><textarea class="hv field" id="bd-t" maxlength="240" placeholder="Nachricht schreiben (Tastatur am Laptop)"></textarea><div class="row" style="margin-top:14px"><button class="hv btn" id="bd-add">Anheften</button></div></div><div class="bd-notes" id="bd-n"></div></div>`;
    const list = body.querySelector('#bd-n');
    const save = () => { K.store.set('kk-board', notes); K.updMail(); };
    const draw = () => {
      list.innerHTML = notes.length ? notes.map((n, i) => `<div class="note" style="--r:${(i % 3 - 1) * 1.6}deg"><button class="hv x" data-i="${i}" aria-label="Löschen">×</button>${esc(n.text)}<small>${new Date(n.t).toLocaleString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div>`).join('') : '<p class="muted">Noch keine Zettel an der Pinnwand.</p>';
      list.querySelectorAll('.x').forEach(b => b.addEventListener('click', () => { notes.splice(+b.dataset.i, 1); save(); draw(); }));
    };
    body.querySelector('#bd-add').addEventListener('click', () => { const t = body.querySelector('#bd-t'); if (!t.value.trim()) return; notes.unshift({ text: t.value.trim(), t: Date.now() }); t.value = ''; save(); draw(); K.toast('Angeheftet'); });
    draw();
    return {};
  },
};

// ---------- Einstellungen ----------
const SettingsChannel = {
  id: 'settings', name: 'Einstellungen',
  open(box, K) {
    const body = chFrame(box, 'Konsolen-Einstellungen', K);
    body.innerHTML = `<div class="set">
      <div class="set-row"><span>Lautstärke</span><div class="row"><button class="hv arr" id="s-vd">−</button><span class="val" id="s-v"></span><button class="hv arr" id="s-vu">+</button></div></div>
      <div class="set-row"><span>Hintergrundmusik</span><div class="row"><button class="hv btn" id="s-m"></button></div></div>
      <div class="set-row"><span>Cursor-Tempo der Fernbedienung</span><div class="row"><button class="hv arr" id="s-sd">−</button><span class="val" id="s-s"></span><button class="hv arr" id="s-su">+</button></div></div>
      <div class="set-row"><span>Fernbedienung</span><div class="row"><span class="muted" id="s-r"></span><button class="hv btn" id="s-pair">Koppeln</button></div></div>
      <div class="set-row"><span>Vollbild (Mausklick)</span><div class="row"><button class="hv btn" id="s-fs">Umschalten</button></div></div>
      <div class="set-row"><span>Spielstände und Rekorde</span><div class="row"><button class="hv btn" id="s-reset">Zurücksetzen</button></div></div>
    </div>`;
    const $ = id => body.querySelector('#' + id);
    const draw = () => {
      $('s-v').textContent = Math.round(Sound.s.vol * 10); $('s-m').textContent = Sound.s.music ? 'An' : 'Aus';
      $('s-s').textContent = K.sens.toFixed(1).replace('.', ','); $('s-r').textContent = K.remoteConnected() ? 'verbunden' : 'nicht verbunden';
    };
    $('s-vd').addEventListener('click', () => { Sound.setVol(Sound.s.vol - 0.1); draw(); });
    $('s-vu').addEventListener('click', () => { Sound.setVol(Sound.s.vol + 0.1); draw(); });
    $('s-m').addEventListener('click', () => { Sound.setMusic(!Sound.s.music); draw(); });
    $('s-sd').addEventListener('click', () => { K.sens = Math.max(0.4, +(K.sens - 0.2).toFixed(1)); K.store.set('kk-sens', K.sens); draw(); });
    $('s-su').addEventListener('click', () => { K.sens = Math.min(3, +(K.sens + 0.2).toFixed(1)); K.store.set('kk-sens', K.sens); draw(); });
    $('s-pair').addEventListener('click', () => K.showPair('channel'));
    $('s-fs').addEventListener('click', () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {} });
    let armed = false;
    $('s-reset').addEventListener('click', e => {
      if (!armed) { armed = true; e.currentTarget.textContent = 'Wirklich? Nochmal klicken'; return; }
      ['kk-best-classic', 'kk-best-time', 'kk-avatar', 'kk-board'].forEach(k => { try { localStorage.removeItem(k); } catch (x) {} });
      K.updMail(); armed = false; e.currentTarget.textContent = 'Zurücksetzen'; K.toast('Zurückgesetzt');
    });
    draw();
    const iv = setInterval(draw, 1000);
    return { close() { clearInterval(iv); } };
  },
};

const CHANNELS = [FruitChannel, AvatarChannel, FotoChannel, WetterChannel, BoardChannel];
const EXTRA = { settings: SettingsChannel };
