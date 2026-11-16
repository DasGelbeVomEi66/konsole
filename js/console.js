// Konsolen-Kern: Bildschirme, Cursor, Fernbedienung (PeerJS/WebRTC), Menü, HOME-Menü.
{
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  const K = window.K = {
    store, clamp,
    cursor: { x: innerWidth / 2, y: innerHeight / 2, fromRemote: false },
    sens: store.get('kk-sens', 1),
    toast, closeChannel, showPair, openChannelById,
    remoteConnected: () => conns.size > 0,
    players: () => [...conns.values()].map(x => x.player).sort(),
    send: obj => { conns.forEach(x => { try { x.c.open && x.c.send(obj); } catch (e) {} }); },
    sendTo: (player, obj) => { conns.forEach(x => { if (x.player === player) try { x.c.open && x.c.send(obj); } catch (e) {} }); },
    addChannel: def => { CHANNELS.push(def); buildMenu(); },
    qrHTML: () => $('qr').innerHTML,
    code: () => code,
  };

  let screen = 'power', hovered = null, chan = null, chanDef = null, homeOpen = false, lastRemote = 0, pairReturn = 'menu';

  // ---------- Bildschirme ----------
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 'scr-' + id));
    screen = id;
    K.send({ t: 'screen', s: id, ch: chanDef ? chanDef.name : '' });
  }

  // ---------- Hinweise ----------
  let toastT;
  function toast(msg, ms = 2400) {
    const t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
  }

  // ---------- Cursor ----------
  const curEl = $('cursor');
  function setCursor(x, y) { K.cursor.x = clamp(x, 0, innerWidth - 1); K.cursor.y = clamp(y, 0, innerHeight - 1); }
  addEventListener('mousemove', e => { if (performance.now() - lastRemote > 500) { setCursor(e.clientX, e.clientY); K.cursor.fromRemote = false; } });
  addEventListener('mousedown', () => curEl.classList.add('press'));
  addEventListener('mouseup', () => curEl.classList.remove('press'));

  function updHover() {
    const { x, y } = K.cursor;
    let el = document.elementFromPoint(x, y);
    let h = el ? el.closest('.hv') : null;
    if (h && homeOpen && !h.closest('#home')) h = null;
    if (h !== hovered) {
      if (hovered) hovered.classList.remove('hover');
      if (h) { h.classList.add('hover'); if (!h.dataset.quiet) Sound.play('hover'); }
      hovered = h;
    }
  }
  document.addEventListener('click', e => { const h = e.target.closest && e.target.closest('.hv'); if (h && !h.dataset.quiet && h.id !== 'power') Sound.play('select'); }, true);

  // ---------- Tasten (Fernbedienung und Tastatur) ----------
  function button(name, down, player = 1) {
    if (down) curEl.classList.toggle('press', name === 'A');
    else if (name === 'A') curEl.classList.remove('press');
    if (chan && chan.onButton && !homeOpen && chan.onButton(name, down, player)) return;
    if (!down) return;
    switch (name) {
      case 'A':
        if (!hovered) return;
        if (hovered.matches('input,textarea')) { hovered.focus(); return; }
        hovered.click();
        break;
      case 'B':
        if (homeOpen) closeHome();
        else if (screen === 'preview') backToMenu();
        else if (screen === 'channel') closeChannel();
        else if (screen === 'pair' && pairReturn !== 'boot') leavePair();
        break;
      case 'HOME':
        if (screen === 'power' || screen === 'boot') return;
        homeOpen ? closeHome() : openHome();
        break;
      case 'PLUS': Sound.setVol(Sound.s.vol + 0.1); updVol(); toast('Lautstärke ' + Math.round(Sound.s.vol * 10)); break;
      case 'MINUS': Sound.setVol(Sound.s.vol - 0.1); updVol(); toast('Lautstärke ' + Math.round(Sound.s.vol * 10)); break;
      case 'UP': setCursor(K.cursor.x, K.cursor.y - 50); break;
      case 'DOWN': setCursor(K.cursor.x, K.cursor.y + 50); break;
      case 'LEFT': setCursor(K.cursor.x - 50, K.cursor.y); break;
      case 'RIGHT': setCursor(K.cursor.x + 50, K.cursor.y); break;
    }
  }
  K.button = button;
  addEventListener('keydown', e => {
    if (e.target.matches && e.target.matches('input,textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
    const map = { Escape: 'HOME', Backspace: 'B', ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', '+': 'PLUS', '-': 'MINUS', ' ': 'A' };
    if (map[e.key] && !e.repeat) { e.preventDefault(); button(map[e.key], true); }
  });
  addEventListener('keyup', e => {
    const map = { ' ': 'A', ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT' };
    if (map[e.key] && !(e.target.matches && e.target.matches('input,textarea'))) button(map[e.key], false);
  });

  // ---------- Fernbedienung über PeerJS ----------
  let peer = null, code = store.get('kk-code', null);
  const conns = new Map();
  const ALPH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const newCode = () => Array.from({ length: 4 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join('');
  function pairStatus(txt, ok) { const s = $('pair-status'); s.textContent = txt; s.classList.toggle('ok', !!ok); }

  function remoteURL() {
    const u = new URL('remote.html', location.href); u.search = '?c=' + code; u.hash = ''; return u.href;
  }
  function renderQR() {
    $('code').textContent = code;
    try {
      const q = qrcode(0, 'M'); q.addData(remoteURL()); q.make();
      $('qr').innerHTML = q.createImgTag(8, 8, 'QR-Code für die Fernbedienung');
    } catch (e) { $('qr').textContent = 'QR-Code nicht verfügbar'; }
  }

  function startPeer() {
    if (!code) { code = newCode(); store.set('kk-code', code); }
    renderQR();
    if (typeof Peer === 'undefined') { pairStatus('Verbindungsbibliothek konnte nicht geladen werden.'); return; }
    try { peer = new Peer('kk-konsole-' + code.toLowerCase(), { debug: 0 }); }
    catch (e) { pairStatus('WebRTC ist hier nicht erlaubt. Bitte die GitHub-Version öffnen.'); return; }
    peer.on('open', () => updPairStatus());
    peer.on('connection', c => {
      c.on('open', () => {
        const used = [...conns.values()].map(x => x.player);
        let player = used.includes(1) ? (used.includes(2) ? 0 : 2) : 1;
        if (!player) { try { c.send({ t: 'full' }); } catch (e) {} setTimeout(() => c.close(), 300); return; }
        conns.set(c, { c, player });
        try { c.send({ t: 'player', n: player }); } catch (e) {}
        onRemote(true, player);
      });
      c.on('data', d => { const x = conns.get(c); if (x) onData(d, x.player); });
      c.on('close', () => { const x = conns.get(c); if (x) { conns.delete(c); onRemote(false, x.player); } });
      c.on('error', () => {});
    });
    let backoff = 1500;
    peer.on('open', () => { backoff = 1500; });
    peer.on('disconnected', () => { setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, backoff); backoff = Math.min(30000, backoff * 2); });
    peer.on('error', e => {
      if (e.type === 'unavailable-id') { try { peer.destroy(); } catch (x) {} code = newCode(); store.set('kk-code', code); startPeer(); }
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') pairStatus('Keine Verbindung zum Vermittlungsserver. Ist das Internet an?');
      else if (e.type === 'browser-incompatible') pairStatus('WebRTC ist hier nicht verfügbar. Bitte die GitHub-Version öffnen.');
    });
  }

  function updPairStatus() {
    const ps = K.players();
    const txt = ps.length ? ps.map(p => 'Spieler ' + p).join(' und ') + ' verbunden' : 'Warte auf Fernbedienung …';
    pairStatus(txt, ps.length > 0);
    $('home-remote-state').textContent = ps.length ? txt : 'Keine Fernbedienung';
  }
  function onRemote(on, player) {
    updPairStatus();
    if (on) {
      Sound.play('connect'); toast('Fernbedienung ' + player + ' verbunden');
      if (player === 1) setCursor(innerWidth / 2, innerHeight / 2);
      K.send({ t: 'screen', s: screen, ch: chanDef ? chanDef.name : '' });
      if (screen === 'pair' && K.players().length === 1 && pairReturn === 'boot') setTimeout(leavePair, 900);
    } else toast('Fernbedienung ' + player + ' getrennt');
    if (chan && chan.onRemotes) chan.onRemotes(K.players());
  }

  function onData(d, player) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 's') { if (chan && chan.onSteer) chan.onSteer(d.v, player); return; }
    if (d.t === 'm') {
      lastRemote = performance.now(); K.cursor.fromRemote = true;
      const ppd = innerWidth / (40 / K.sens);
      setCursor(K.cursor.x + d.x * ppd, K.cursor.y + d.y * ppd);
    } else if (d.t === 'b') button(d.b, !!d.d, player);
    else if (d.t === 'c') { setCursor(innerWidth / 2, innerHeight / 2); lastRemote = performance.now(); }
  }

  // ---------- Menü ----------
  let tileEls = [];
  function buildMenu() {
    const g = $('grid'); g.innerHTML = ''; tileEls = [];
    for (let i = 0; i < 12; i++) {
      const def = CHANNELS[i];
      const t = document.createElement('button');
      t.className = 'tile' + (def ? ' hv' : ' empty');
      if (def) {
        t.innerHTML = '<div class="art"></div><div class="name">' + def.name + '</div>';
        t.setAttribute('aria-label', def.name);
        def.tile && def.tile(t.querySelector('.art'));
        t.addEventListener('click', () => openPreview(def));
      } else t.tabIndex = -1;
      g.appendChild(t); tileEls.push(t);
    }
  }
  K.refreshTiles = () => CHANNELS.forEach((d, i) => { if (d && d.tile) { const a = tileEls[i] && tileEls[i].querySelector('.art'); if (a) { a.innerHTML = ''; d.tile(a); } } });

  let pvDef = null;
  function openPreview(def) {
    pvDef = def; Sound.play('open');
    const art = $('preview-art'); art.innerHTML = '';
    def.preview ? def.preview(art) : def.tile(art);
    show('preview');
  }
  function backToMenu() { Sound.play('back'); show('menu'); Sound.music('menu'); }

  function openChannel(def) {
    if (chan && chan.close) chan.close();
    const box = $('channel'); box.innerHTML = '';
    chanDef = def; chan = def.open(box, K) || {};
    show('channel');
    Sound.music(def.music || 'menu');
  }
  function openChannelById(id) { const d = CHANNELS.find(c => c && c.id === id) || EXTRA[id]; if (d) openChannel(d); }
  function closeChannel() {
    if (chan && chan.close) chan.close();
    chan = null; chanDef = null; $('channel').innerHTML = '';
    Sound.play('back'); show('menu'); Sound.music('menu'); K.refreshTiles();
  }

  // ---------- HOME ----------
  function openHome() { homeOpen = true; $('home').classList.add('on'); updVol(); Sound.play('open'); chan && chan.onPause && chan.onPause(true); $('home-reset').style.display = screen === 'channel' ? '' : 'none'; }
  function closeHome() { homeOpen = false; $('home').classList.remove('on'); Sound.play('back'); chan && chan.onPause && chan.onPause(false); }
  function updVol() { $('home-volfill').style.width = Math.round(Sound.s.vol * 100) + '%'; }

  // ---------- Koppeln ----------
  function showPair(from) { pairReturn = from || screen; $('pair-skip').textContent = pairReturn === 'boot' ? 'Mit Maus weiter' : 'Zurück'; show('pair'); }
  function leavePair() { if (pairReturn === 'channel' && chan) show('channel'); else { show('menu'); Sound.music('menu'); } }

  // ---------- Uhr ----------
  const TAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  function clock() {
    const d = new Date();
    $('clock-time').textContent = String(d.getHours()).padStart(2, '0') + (d.getSeconds() % 2 ? ' ' : ':') + String(d.getMinutes()).padStart(2, '0');
    $('clock-date').textContent = TAGE[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
  }

  // ---------- Ereignisse ----------
  $('power').addEventListener('click', () => {
    Sound.init(); Sound.play('boot'); show('boot');
    setTimeout(() => { if (conns.size) { show('menu'); } else showPair('boot'); Sound.music('menu'); }, 2400);
  });
  $('pair-skip').addEventListener('click', leavePair);
  $('pv-menu').addEventListener('click', backToMenu);
  $('pv-start').addEventListener('click', () => openChannel(pvDef));
  $('btn-settings').addEventListener('click', () => openChannelById('settings'));
  $('btn-mail').addEventListener('click', () => openChannelById('board'));
  $('home-close').addEventListener('click', closeHome);
  $('home-menu').addEventListener('click', () => { closeHome(); if (screen === 'channel') closeChannel(); else { show('menu'); Sound.music('menu'); } });
  $('home-reset').addEventListener('click', () => { closeHome(); if (chanDef) openChannel(chanDef); });
  $('home-pair').addEventListener('click', () => { closeHome(); showPair(screen); });
  $('home-volup').addEventListener('click', () => { Sound.setVol(Sound.s.vol + 0.1); updVol(); });
  $('home-voldown').addEventListener('click', () => { Sound.setVol(Sound.s.vol - 0.1); updVol(); });
  addEventListener('resize', () => setCursor(K.cursor.x, K.cursor.y));

  // ---------- Hauptschleife ----------
  let lastT = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
    updHover();
    curEl.style.transform = `translate(${K.cursor.x}px,${K.cursor.y}px)`;
    if (chan && chan.onFrame && !homeOpen) chan.onFrame(dt, t);
    requestAnimationFrame(frame);
  }

  buildMenu(); clock(); setInterval(clock, 1000); startPeer();
  $('btn-mail').classList.toggle('blink', (store.get('kk-board', []) || []).length > 0);
  K.updMail = () => $('btn-mail').classList.toggle('blink', (store.get('kk-board', []) || []).length > 0);
  requestAnimationFrame(frame);
}
