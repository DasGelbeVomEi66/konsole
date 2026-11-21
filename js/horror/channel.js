// Kanal-Eintrag für FOSSIL (Horror). Lädt das Spiel erst beim Öffnen.
import { openHorror } from './game.js';

const tileSVG = big => `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">
  <defs><linearGradient id="hrw${big}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#1a1d18"/><stop offset="1" stop-color="#050605"/></linearGradient>
  <radialGradient id="hrl${big}" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#e8d8b0" stop-opacity=".35"/><stop offset="1" stop-color="#e8d8b0" stop-opacity="0"/></radialGradient>
  <style>.he{animation:hb 5s infinite}@keyframes hb{0%,86%,100%{opacity:1}88%,92%{opacity:0}}@media(prefers-reduced-motion:reduce){.he{animation:none}}</style></defs>
  <rect width="320" height="200" fill="#030303"/>
  <polygon points="0,0 120,62 120,150 0,200" fill="url(#hrw${big})"/><polygon points="320,0 200,62 200,150 320,200" fill="url(#hrw${big})"/>
  <polygon points="0,200 120,150 200,150 320,200" fill="#140c07"/><polygon points="0,0 120,62 200,62 320,0" fill="#0c0c0a"/>
  <rect x="120" y="62" width="80" height="88" fill="#020202"/>
  <rect x="146" y="88" width="28" height="62" fill="#0e0a07" stroke="#2a1a10" stroke-width="2"/>
  <ellipse cx="160" cy="112" rx="70" ry="50" fill="url(#hrl${big})"/>
  <g class="he"><ellipse cx="150" cy="104" rx="3.2" ry="2" fill="#f0dc70"/><ellipse cx="168" cy="102" rx="3.2" ry="2" fill="#f0dc70"/></g>
  <line x1="160" y1="0" x2="160" y2="40" stroke="#111" stroke-width="2"/><path d="M148 40 L172 40 L166 48 L154 48Z" fill="#1d2a22"/><circle cx="160" cy="50" r="3" fill="#3a3020"/>
  ${big ? '<text x="160" y="186" text-anchor="middle" font-family="Georgia,serif" font-size="26" letter-spacing="8" fill="#cfc6b0">FOSSIL</text>' : '<text x="160" y="188" text-anchor="middle" font-family="Georgia,serif" font-size="18" letter-spacing="6" fill="#8f887a">FOSSIL</text>'}</svg>`;

const HorrorChannel = { id: 'horror', name: 'Horror-Kanal', music: 'none', tile: el => el.innerHTML = tileSVG(0), preview: el => el.innerHTML = tileSVG(1), open: (box, K) => openHorror(box, K) };
if (window.K && K.addChannel) K.addChannel(HorrorChannel); else addEventListener('load', () => K.addChannel(HorrorChannel));
