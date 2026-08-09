/* The control rail: view/mode toggles, line and score filters, search, reset,
   the mobile filter drawer, and export.

   Handlers mutate state then call refresh(), which main.js supplies. Controls
   never decide what to re-render — that stays in one place. */

import { LINES, TIERS, STATIONS, RATINGS } from './data.js';
import { state, isFiltered, clearFilters } from './state.js';
import { norm, setFilterDrawer } from './dom.js';
import { paintMap, applyView } from './map.js';
import { renderList } from './list.js';
import { setSheet } from './panel.js';

let refresh = () => {};
export function initControls(handlers){
  refresh = handlers.refresh;
  syncReset();
}

const chips = document.getElementById('lchips');
chips.innerHTML = Object.keys(LINES).map(k =>
  `<button class="lchip ${k}" data-line="${k}" aria-pressed="true" title="${LINES[k].term}">
     <i></i><span>${LINES[k].name}</span>
   </button>`).join('');
chips.addEventListener('click', e => {
  const b = e.target.closest('.lchip');
  if(!b) return;
  const k = b.dataset.line;
  state.active[k] = !state.active[k];
  b.setAttribute('aria-pressed', String(state.active[k]));
  refresh();
});

const tchips = document.getElementById('tchips');
tchips.innerHTML = [5,4,3,2,1].map(v =>
  `<button class="tchip" data-tier="${v}" aria-pressed="true"
     style="--c:${TIERS[v].hex}" title="${TIERS[v].name} — ${TIERS[v].gloss}">${v}</button>`).join('');
tchips.addEventListener('click', e => {
  const b = e.target.closest('.tchip');
  if(!b) return;
  const v = +b.dataset.tier;
  state.tiers[v] = !state.tiers[v];
  b.setAttribute('aria-pressed', String(state.tiers[v]));
  refresh();
});

const resetBtn = document.getElementById('reset');
export function syncReset(){
  const filtered = Object.values(state.active).some(v => !v)
                || Object.values(state.tiers).some(v => !v)
                || !!state.query;
  resetBtn.hidden = !filtered;
}
resetBtn.onclick = () => {
  for(const k in state.active) state.active[k] = true;
  for(const v in state.tiers) state.tiers[v] = true;
  state.query = '';
  document.getElementById('q').value = '';
  chips.querySelectorAll('.lchip').forEach(b => b.setAttribute('aria-pressed','true'));
  tchips.querySelectorAll('.tchip').forEach(b => b.setAttribute('aria-pressed','true'));
  refresh();
};


const modeToggle = document.getElementById('modeToggle');
modeToggle.onclick = () => {
  const on = state.mode !== 'ratings';
  state.mode = on ? 'ratings' : 'lines';
  modeToggle.setAttribute('aria-checked', String(on));
  paintMap();
};

const sL = document.getElementById('sortLine'), sS = document.getElementById('sortScore');
sL.onclick = () => { state.sortBy = 'line';  sL.setAttribute('aria-pressed','true');  sS.setAttribute('aria-pressed','false'); renderList(); };
sS.onclick = () => { state.sortBy = 'score'; sS.setAttribute('aria-pressed','true');  sL.setAttribute('aria-pressed','false'); renderList(); };

const vM = document.getElementById('viewMap'), vL = document.getElementById('viewList');
vM.onclick = () => { document.body.dataset.view = 'map';  vM.setAttribute('aria-pressed','true');  vL.setAttribute('aria-pressed','false'); };
vL.onclick = () => { document.body.dataset.view = 'list'; vL.setAttribute('aria-pressed','true');  vM.setAttribute('aria-pressed','false'); };

document.getElementById('q').addEventListener('input', e => {
  state.query = norm(e.target.value.trim());
  refresh();
});

document.getElementById('exportBtn').onclick = () => {
  const payload = STATIONS.map(s => ({
    station:s.name, line:s.lines.map(l => LINES[l].en).join('/'),
    mattsRating:RATINGS[s.id], myNote:state.notes[s.id] || '',
    source:`https://www.metrodemontreal.com/${s.path}/archmain.html`
  }));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mtlmetro-stations.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ============================================================
   FILTER DRAWER
   ============================================================ */
const filtersToggle = document.getElementById('filtersToggle');
filtersToggle.onclick = () => {
  const open = document.body.dataset.filters !== 'open';
  setFilterDrawer(open);
  // The drawer shrinks the stage. An expanded sheet would then be taller than
  // the space it lives in, so drop it back to a peek.
  if(open && document.body.dataset.sheet === 'open') setSheet('peek');
  applyView();
};
