/* Station photos from Wikipedia.
 *
 * Rather than hard-coding 68 image URLs (which rot the moment an editor swaps a
 * photo), we ask the MediaWiki API for each article's lead image at runtime.
 * Two batched requests cover the whole network; the <img> tags themselves load
 * lazily when a station is opened.
 *
 * Everything here degrades to nothing: if the API is unreachable, blocked, or
 * has no image for a station, the panel simply renders without a photo.
 */

import { STATIONS } from './data.js';

const API = 'https://fr.wikipedia.org/w/api.php';
const CACHE_KEY = 'mtlmetro:photos:v1';
const THUMB_WIDTH = 900;

/* French Wikipedia titles follow "NAME (métro de Montréal)". These few don't
   match the station name as we store it, so they're spelled out. redirects=1
   catches most other near-misses automatically. */
const TITLE_OVERRIDES = {
  berri:        'Berri-UQAM (métro de Montréal)',
  longueuil:    'Longueuil–Université-de-Sherbrooke (métro de Montréal)',
  squarevictoria:'Square-Victoria–OACI (métro de Montréal)',
  udemontreal:  'Université-de-Montréal (métro de Montréal)',
  jeandrapeau:  'Jean-Drapeau (métro de Montréal)',
  guy:          'Guy-Concordia (métro de Montréal)',
  parc:         'Parc (métro de Montréal)',
  acadie:       'Acadie (métro de Montréal)'
};

const titleFor = s => TITLE_OVERRIDES[s.id] || `${s.name} (métro de Montréal)`;

/* id -> { thumb, page, title } */
const photos = new Map();
const listeners = new Set();

export function getPhoto(id){ return photos.get(id) || null; }
export function onPhotos(fn){ listeners.add(fn); }
function announce(){ listeners.forEach(fn => { try{ fn(); }catch(e){} }); }

/* ---- cache -------------------------------------------------------------- */

function readCache(){
  try{
    const raw = sessionStorage.getItem(CACHE_KEY);
    if(!raw) return false;
    const obj = JSON.parse(raw);
    for(const k in obj) photos.set(k, obj[k]);
    return photos.size > 0;
  }catch(e){ return false; }
}

function writeCache(){
  try{
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(photos)));
  }catch(e){
    // Private mode or quota — the app works fine without a cache.
  }
}

/* ---- fetching ----------------------------------------------------------- */

function chunk(arr, n){
  const out = [];
  for(let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function queryTitles(titles){
  const url = `${API}?${new URLSearchParams({
    action:'query',
    format:'json',
    formatversion:'2',
    origin:'*',              // required for anonymous CORS
    prop:'pageimages',
    piprop:'thumbnail',
    pithumbsize:String(THUMB_WIDTH),
    pilimit:'50',
    redirects:'1',
    titles:titles.join('|')
  })}`;

  const res = await fetch(url);
  if(!res.ok) throw new Error('wiki ' + res.status);
  return res.json();
}

/* The API normalises and redirects titles, so the response won't necessarily
   come back under the string we asked for. Build a lookup that accounts for
   both hops before matching pages to stations. */
function buildAliasMap(data){
  const alias = new Map();
  const add = (from, to) => alias.set(from, to);
  (data.query?.normalized || []).forEach(n => add(n.from, n.to));
  (data.query?.redirects  || []).forEach(r => add(r.from, r.to));
  return alias;
}

function resolve(title, alias){
  let t = title, hops = 0;
  while(alias.has(t) && hops++ < 4) t = alias.get(t);
  return t;
}

export async function loadPhotos(){
  if(readCache()){ announce(); return; }

  const wanted = STATIONS.map(s => ({ id:s.id, title:titleFor(s) }));

  for(const group of chunk(wanted, 50)){
    try{
      const data = await queryTitles(group.map(g => g.title));
      const alias = buildAliasMap(data);

      const byTitle = new Map();
      (data.query?.pages || []).forEach(p => byTitle.set(p.title, p));

      for(const { id, title } of group){
        const page = byTitle.get(resolve(title, alias));
        if(page && page.thumbnail && page.thumbnail.source){
          photos.set(id, {
            thumb: page.thumbnail.source,
            page:  'https://fr.wikipedia.org/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_')),
            title: page.title
          });
        }
      }
    }catch(e){
      // Offline, blocked, or rate-limited. Photos are an enhancement, so we
      // swallow it and let the panel render without them.
      console.warn('Station photos unavailable:', e.message);
    }
  }

  if(photos.size) writeCache();
  announce();
}
