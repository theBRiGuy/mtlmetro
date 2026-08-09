/* Tiny DOM/string helpers shared across modules. No app knowledge lives here. */

export const SVG_NS = 'http://www.w3.org/2000/svg';

export const el = (n, attrs = {}) => {
  const e = document.createElementNS(SVG_NS, n);
  for(const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

export function escapeHtml(str){
  return String(str).replace(/[&<>"']/g,
    c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/* Fold case, strip accents and punctuation so "Cote des Neiges" finds
   "Côte-des-Neiges". */
export const norm = str => str.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/['\u2019\u00b4\u2013\u2014-]/g, ' ');

export const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

/* The filter drawer's open/closed state lives on <body>. Both controls.js and
   panel.js need to change it, so it lives here rather than in either of them —
   importing one from the other would create a cycle. */
export function setFilterDrawer(open){
  document.body.dataset.filters = open ? 'open' : 'closed';
  const btn = document.getElementById('filtersToggle');
  if(btn) btn.setAttribute('aria-expanded', String(open));
}
