# Походът на Ботевата чета — 1876

Interactive Leaflet map of Hristo Botev's detachment march (April–June 1876).  
Hosted as a static site on GitHub Pages — no build step required.

---

## Project structure

```
index.html              — page shell, loads all scripts
styles.css              — all styles (design tokens, components, map markers)
app.js                  — entry point: map init, data loading, sidebar, controls
src/
  data/                 — GeoJSON + JSON data files
  tiles/{z}/{x}/{y}.png — offline tile cache
  lib/                  — vendored Leaflet + plugins
  js/
    app-state.js        — constants, data paths, shared mutable state
    app-layers.js       — marker icons, ghost markers, layer rendering
    app-chetnitsi.js    — chetnitsi cluster, search, sidebar panel
    app-timeline.js     — Botev timeline animation engine
    info-modal.js       — "Данни" modal with tabs
    navbar.js           — pill nav, FAB, badges, search backdrop, tooltip
```

---

## Configuring initial layer visibility

Open **`src/js/app-state.js`** and edit the `layerOn` object:

```js
var layerOn = {
  points:          false,   // settlements / major towns
  detachments:     false,   // detachment (чета) locations
  districts:       true,    // administrative district centres  ← on by default
  apostolic:       false,   // apostolic assembly locations
  okrazhenCenters: false,   // regional (окръжни) centres
  botev:           true,    // Botev route + timeline panel     ← on by default
  chetnitsi:       false    // members by hometown (clusters)
};
```

Set any key to `true` to make that layer visible when the page first loads.  
The corresponding legend checkbox in the UI reflects this value automatically.

---

## Configuring the map viewport

Also in **`src/js/app-state.js`**:

| Constant | Default | Description |
|---|---|---|
| `INIT_CENTER` | `[42.72, 25.1]` | Starting lat/lng |
| `INIT_ZOOM` | `7` | Starting zoom level (7–10) |
| `TIMELINE_ZOOM` | `8` | Zoom used when auto-play begins |

---

## Adding or editing map data

| File | Contents |
|---|---|
| `src/data/april-points-filtered.geojson` | Settlements, apostolic sites, regional centres |
| `src/data/april-detachments-filtered.geojson` | Detachment locations |
| `src/data/april-district-centers.geojson` | District centre points with numerals |
| `src/data/april-popup-content.json` | Sidebar HTML keyed by `popup_id` |
| `src/data/botev-route.geojson` | March route LineString |
| `src/data/botev-timeline-points.geojson` | Timeline stop points (ordered) |
| `src/data/botev-timeline-content.json` | Timeline stop HTML keyed by `popup_id` |
| `src/data/botev-chetnitsi-places.geojson` | Hometown points for detachment members |
| `src/data/botev-chetnitsi-content.json` | Member lists keyed by place `popup_id` |

Each GeoJSON feature needs `min_zoom` and `max_zoom` properties to control at which zoom levels the full marker is shown. Features below `min_zoom` render as a smaller ghost marker; clicking one zooms to `min_zoom` and opens the content panel.

---

## Ghost markers

Markers that are outside their zoom range show as a smaller, semi-transparent version of their normal icon (60 % size, 40 % opacity) instead of disappearing completely. Clicking a ghost marker flies the map to the feature's `min_zoom` and opens its content sidebar.

To adjust the ghost size or opacity edit the CSS in **`styles.css`**:

```css
.marker-dot.is-ghost {
  opacity: 0.4;          /* overall visibility */
  animation: none !important;
}
.marker-dot.is-ghost:hover {
  opacity: 0.85;
}
```

The scale factor (default `0.6`) is set in `createGhostMarkerIcon()` in **`src/js/app-layers.js`**.

---

## Theme

The dark/light theme is toggled by the button in the legend panel and persisted in `localStorage` under the key `theme` (`"light"` / `"dark"`).  
Design tokens (colours, radii, spacing) live at the top of **`styles.css`** inside `:root` and `[data-theme="dark"]`.
