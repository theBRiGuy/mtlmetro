# mtlmetro

An interactive map of the Montréal Métro showing Matt's architectural ratings
for all 68 stations.

Ratings, station data and write-ups are by Matt at
[metrodemontreal.com](https://www.metrodemontreal.com/). This is a companion
map, not a replacement — every station links back to his page for the full
write-up. The ratings here are transcribed from his
[ratings page](https://www.metrodemontreal.com/rating.html).

## Running it locally

The app uses ES modules, which browsers refuse to load over `file://` for
security reasons. Opening `index.html` by double-clicking it will show a blank
page and a CORS error in the console. Serve it over HTTP instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works — `npx serve`, `php -S localhost:8000`, whatever you
have. GitHub Pages serves over HTTPS, so the deployed site is unaffected.

## Building a single-file version

Some viewers only ever load one document and can't fetch sibling files — the
Claude artifact preview, a `file://` double-click, an emailed attachment. In
those, the modular source renders as unstyled HTML because `css/styles.css`
and `js/main.js` never resolve.

`build.mjs` inlines the CSS and bundles the module graph into one file:

```bash
npm install esbuild
node build.mjs
# -> dist/index.html  (~54 kB, self-contained)
```

`dist/index.html` opens correctly by double-clicking, with no server.

**The deployed site does not need this.** GitHub Pages serves the modular
source directly, which is better — separate files cache independently, and you
can read a stack trace against real filenames. Treat `dist/` as an export
format for sharing, not as the thing you deploy. Add it to `.gitignore` unless
you have a reason to commit it.

## Structure

```
index.html          markup only
css/styles.css      all styles
js/
  data.js           stations, lines, running order, ratings, tiers
  state.js          mutable UI state + the visible() predicate
  store.js          note persistence (window.storage or localStorage)
  dom.js            small shared helpers
  map.js            SVG rendering, pan/zoom
  panel.js          station detail, line navigation, mobile sheet
  list.js           list view
  tally.js          masthead average + distribution bar
  controls.js       filter rail
  photos.js         station photos from the Wikipedia API
  main.js           entry point: wiring, select(), refresh()
build.mjs           optional: bundles the above into dist/index.html
```

### How the modules relate

There are no circular imports, which is deliberate. The rule is that **feature
modules never import each other.** `map.js` doesn't know `panel.js` exists.
When you click a station, the map calls a callback registered by `main.js`:

```js
// map.js
let onSelect = () => {};
export function initMap(handlers){ onSelect = handlers.onSelect; }

// main.js
initMap({ onSelect: select });
```

`main.js` owns the only two things that genuinely cross boundaries:

- `select(id, line)` — what selecting a station means
- `refresh()` — what needs redrawing when filters change

Everything else flows one way: `data.js` → `state.js` → feature modules →
`main.js`.

### Where a backend would go

`store.js` is the seam. It exposes `loadNotes()` and `saveNotes()` over a
two-method `Store` object. Swap those two methods for `fetch()` calls against a
real API and nothing above them changes.

`data.js` is the other candidate — it's currently a static table, and would
become the response to `GET /api/stations`.

## Station photos

`photos.js` asks the French Wikipedia API for each article's lead image at
runtime rather than hard-coding URLs, which would break whenever an editor
swaps a photo. Two batched requests (50 titles each) cover all 68 stations at
boot; the images themselves load lazily when a station is opened, and results
are cached in `sessionStorage`.

It degrades to nothing. If the API is unreachable, an article has no image, or
an image 404s, the panel renders without a photo — no spinner, no broken-image
icon, no reserved empty space.

**Licensing:** Wikipedia photos are contributor-owned and mostly CC-licensed,
which generally requires crediting the photographer, not just the source. The
caption currently says "Photo via Wikipédia" and links to the article. That is
a courtesy credit, not full compliance. To do it properly, request
`imageinfo` with `extmetadata` from Commons and display the `Artist` and
`LicenseShortName` fields per image.

## Notes on the data

- Names, running order, URL slugs and boroughs come from metrodemontreal.com.
- Ratings are transcribed from the ratings page: 9 stations at five métros,
  20 at four, 25 at three, 8 at two, 6 at one. Network average 3.26.
- Opening years are **segment** openings and are the least reliable field here.
  The Orange line's western extension sequence (1980–1986) in particular is
  worth verifying.
- The one-line descriptions of each rating tier are paraphrases, not Matt's
  wording.

## Deploying

It's a static site with no build step. Commit and enable GitHub Pages on the
repo root, or drag the folder onto Netlify Drop.
