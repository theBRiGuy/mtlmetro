/* Entry point. Owns the two things that cross module boundaries:
   what "selecting a station" means, and what needs re-rendering afterwards.

   Every other module reports intent through a callback registered here, which
   is why none of them import each other and there are no circular imports. */

import { BY_ID, neighbours } from './data.js';
import { state } from './state.js';
import { isMobile } from './dom.js';
import { loadNotes } from './store.js';
import { initMap, buildMap, paintMap, ensureVisible, initialView } from './map.js';
import { initPanel, renderPanel, renderSheetHead, setSheet } from './panel.js';
import { initList, renderList } from './list.js';
import { renderTally } from './tally.js';
import { initControls, syncReset } from './controls.js';
import { loadPhotos, onPhotos } from './photos.js';

/* One definition of "redraw everything that depends on the filters". */
function refresh(){
  paintMap();
  renderTally();
  renderList();
  syncReset();
}

/* One definition of "select a station", shared by the map, the list and the
   navigation arrows. */
function select(id, line){
  state.selected = id;
  const s = BY_ID[id];
  // Stay on the line you arrived on where possible, so stepping through an
  // interchange never silently switches you to a different line.
  state.navLine = (line && s.lines.includes(line)) ? line
                : (state.navLine && s.lines.includes(state.navLine)) ? state.navLine
                : s.lines[0];
  paintMap();
  renderPanel();
  renderList();
  renderSheetHead();
  ensureVisible(s);
  if(isMobile() && document.body.dataset.sheet === 'closed') setSheet('peek');
}

/* Left/right arrow keys ride the current line. Ignored while typing a note. */
document.addEventListener('keydown', e => {
  if(!state.selected || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  const t = e.target.tagName;
  if(t === 'TEXTAREA' || t === 'INPUT') return;
  const { prev, next } = neighbours(state.selected, state.navLine);
  const go = e.key === 'ArrowLeft' ? prev : next;
  if(go){ e.preventDefault(); select(go, state.navLine); }
});

document.body.dataset.view = 'map';
document.body.dataset.filters = 'closed';
setSheet('closed');

initMap({ onSelect: select });
initPanel({ onSelect: select });
initList({ onSelect: select });
initControls({ refresh });

/* Photos arrive after first paint. If the open station gains one, redraw. */
onPhotos(() => { if(state.selected) renderPanel(); });

(async () => {
  await loadNotes();
  buildMap();
  initialView();
  renderTally();
  renderPanel();
  renderList();
  syncReset();
  loadPhotos();          // non-blocking: the app is usable before this returns
})();
