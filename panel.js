/* The station detail panel, its per-line navigation strips, and the mobile
   bottom sheet. Renders from state; reports intent through onSelect. */

import { LINES, BY_ID, TIERS, RATINGS, neighbours } from './data.js';
import { state } from './state.js';
import { escapeHtml, isMobile, setFilterDrawer } from './dom.js';
import { saveNotes } from './store.js';
import { map } from './map.js';

let onSelect = () => {};
export function initPanel(handlers){
  onSelect = handlers.onSelect;
  sheetHead.onclick = () => {
    const opening = document.body.dataset.sheet !== 'open';
    // Drawer and sheet both want the stage's height; only one may be open.
    if(opening) setFilterDrawer(false);
    setSheet(opening ? 'open' : 'peek');
  };
}

const panel = document.getElementById('panel');

const PIP_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" stroke-width="1.7"/>
  <path d="M12 5.4v6.8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M7.2 11.4 12 18l4.8-6.6z" fill="currentColor"/>
</svg>`;


function navBtn(id, line, dir){
  const arrow = dir === 'prev' ? '\u2190' : '\u2192';
  if(!id){
    const term = `<span class="nav-term">End of line</span>`;
    return `<button class="nav-btn ${dir}" disabled>${
      dir === 'prev' ? `<span class="ar">${arrow}</span>${term}` : `${term}<span class="ar">${arrow}</span>`
    }</button>`;
  }
  const n = escapeHtml(BY_ID[id].name);
  const nm = `<span class="nm2">${n}</span>`;
  return `<button class="nav-btn ${dir}" data-go="${id}" data-line="${line}" title="${n}">${
    dir === 'prev' ? `<span class="ar">${arrow}</span>${nm}` : `${nm}<span class="ar">${arrow}</span>`
  }</button>`;
}

export function renderPanel(){
  if(!state.selected){
    panel.innerHTML = `<div class="p-empty">
      <b>Nothing state.selected</b>
      Pick a station to see how Matt rated it, then ride the line with the arrows.
      At an interchange you get a set of arrows per line, so you can change trains.
    </div>`;
    return;
  }
  const s = BY_ID[state.selected];
  const r = RATINGS[s.id];
  const note = state.notes[s.id] || '';

  const nav = s.lines.map(l => {
    const { prev, next } = neighbours(s.id, l);
    return `<div class="nav-line${l === state.navLine ? ' state.active' : ''}" style="--c:${LINES[l].hex}">
      <div class="nav-head"><b>${LINES[l].num}</b> Ligne ${LINES[l].name}</div>
      <div class="nav-row">${navBtn(prev, l, 'prev')}${navBtn(next, l, 'next')}</div>
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="p-eyebrow">${s.lines.length > 1 ? 'Interchange · ' : ''}${escapeHtml(s.borough)}</div>
    <h2 class="p-name">${escapeHtml(s.name)}</h2>

    <div class="score" style="--c:${TIERS[r].hex}">
      <div class="pips">
        ${[1,2,3,4,5].map(i => `<span class="pip" data-on="${i <= r ? 1 : 0}">${PIP_SVG}</span>`).join('')}
      </div>
      <div class="score-name">${TIERS[r].name}</div>
      <div class="score-gloss">${TIERS[r].gloss}</div>
      <div class="score-by">Rated by Matt · metrodemontreal.com</div>
    </div>

    <div class="nav">${nav}</div>

    <dl class="facts">
      <div class="fact"><dt>Opened</dt><dd>${s.opened}</dd></div>
      <div class="fact"><dt>Lines</dt><dd>${s.lines.map(l => LINES[l].en).join(' · ')}</dd></div>
    </dl>

    <a class="readlink" href="https://www.metrodemontreal.com/${s.path}/archmain.html" target="_blank" rel="noopener">
      <span>
        <small>metrodemontreal.com</small>
        <strong>Matt's write-up on this station</strong>
      </span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M7 17 17 7M9 7h8v8"/>
      </svg>
    </a>

    <div class="p-h" style="margin-top:24px">Your notes</div>
    <textarea id="note" placeholder="Been here? What did you make of it?">${escapeHtml(note)}</textarea>
  `;

  panel.querySelectorAll('.nav-btn[data-go]').forEach(b => {
    b.onclick = () => onSelect(b.dataset.go, b.dataset.line);
  });

  const ta = panel.querySelector('#note');
  ta.addEventListener('input', () => {
    const v = ta.value;
    if(v.trim()) state.notes[s.id] = v; else delete state.notes[s.id];
    saveNotes();
  });

  panel.scrollTop = 0;
}


/* ============================================================
   MOBILE BOTTOM SHEET
   The panel is a sibling column on desktop and an overlay on mobile, so it
   never competes with the map for vertical space.
   ============================================================ */
const sheetHead = document.getElementById('sheetHead');
const shName = document.getElementById('shName');
const shScore = document.getElementById('shScore');

export function setSheet(stateName){
  document.body.dataset.sheet = stateName;
  sheetHead.setAttribute('aria-expanded', String(stateName === 'open'));
}
export function renderSheetHead(){
  if(!state.selected){ shName.textContent = 'Nothing state.selected'; shScore.textContent = ''; return; }
  const s = BY_ID[state.selected], r = RATINGS[s.id];
  shName.textContent = s.name;
  shScore.textContent = r + '/5';
  shScore.style.setProperty('--c', TIERS[r].hex);
}

// Tapping empty map closes the sheet back down to a peek.
map.addEventListener('click', e => {
  if(!e.target.closest('.st') && isMobile() && document.body.dataset.sheet === 'open'){
    setSheet('peek');
  }
});
