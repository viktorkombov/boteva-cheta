/* ============================================================
   app.js — Entry point: map creation, data loading, sidebar,
            layer controls, theme toggle.
   Modules loaded before this file (see index.html):
     src/js/app-state.js   — constants + shared state
     src/js/app-layers.js  — marker icons, layer rendering
     src/js/app-chetnitsi.js — chetnitsi search + panel
     src/js/app-timeline.js  — Botev timeline animation
   ============================================================ */
'use strict';

document.addEventListener('DOMContentLoaded', function () {
  createMap();
  loadData().then(function () {
    renderVisibleLayers();
    return loadBotevTimelineData();
  }).then(function () {
    createBotevRouteLayer();
    createTimelinePointLayer();
    if (layerOn.botev) { showBotevLayers(); }
    initTimelineControl();
    return loadChetnitsiData();
  }).then(function () {
    buildChetnitsiSearchIndex();
    renderVisibleLayers();
    bindControls();
    initChetnitsiSearch();

    /* Expose internals for info-modal.js chart-click navigation */
    window._chetnitsiContent     = chetnitsiContent;
    window._allFeaturesChetnitsi = allFeatures.chetnitsi;
    window.map                   = map;
    window._ensureChetnitsiLayer = function () {
      if (!layerOn.chetnitsi) {
        layerOn.chetnitsi     = true;
        chetnitsiUserDisabled = false;
        var cb = document.getElementById('toggle-chetnitsi');
        if (cb) { cb.checked = true; }
        renderVisibleLayers();
      }
    };
    window._openChetnitsiFeature = function (feature) { openChetnitsiPanel(feature, true); };
    window._expandTimelinePanel  = expandTimelinePanel;
  });
});

/* ── Map ─────────────────────────────────────────────────── */

function createMap() {
  map = L.map('map', {
    center:                  INIT_CENTER,
    zoom:                    INIT_ZOOM,
    zoomControl:             true,
    attributionControl:      true,
    zoomAnimation:           true,
    zoomAnimationThreshold:  4,
    fadeAnimation:           true,
    markerZoomAnimation:     true
  });

  L.tileLayer(TILE_URL, {
    minZoom:          7,
    maxZoom:          10,
    tms:              false,
    attribution:      '© QGIS',
    keepBuffer:       4,
    updateWhenIdle:   true,
    updateWhenZooming: false
  }).addTo(map);

  map.on('zoomend', function () {
    renderVisibleLayers();
    document.body.classList.toggle('zoom-7', map.getZoom() === 7);
    syncChetnitsiActive();
  });

  document.body.classList.toggle('zoom-7', map.getZoom() === 7);
}

/* ── Data loading ────────────────────────────────────────── */

function loadData() {
  return Promise.all([
    fetch(DATA.points).then(function (r) { return r.json(); }),
    fetch(DATA.detachments).then(function (r) { return r.json(); }),
    fetch(DATA.districts).then(function (r) { return r.json(); }),
    fetch(DATA.popup).then(function (r) { return r.json(); })
  ]).then(function (results) {
    var pts = results[0].features;
    allFeatures.apostolic       = pts.filter(function (f) { return f.properties.layer_group === 'apostolic'; });
    allFeatures.okrazhenCenters = pts.filter(function (f) { return f.properties.layer_group === 'okrazhen_centers'; });
    allFeatures.points          = pts.filter(function (f) { return f.properties.layer_group === 'points'; });
    allFeatures.detachments     = results[1].features;
    allFeatures.districts       = results[2].features;
    popupData                   = results[3];
  });
}

/* ── Sidebar / info panel ────────────────────────────────── */

function setSidebarMode(mode, kicker) {
  var sidebar  = document.getElementById('sidebar');
  var kickerEl = document.getElementById('sidebar-kicker');
  if (!sidebar) { return; }
  document.body.classList.toggle('sidebar-chetnitsi', mode === 'chetnitsi');
  sidebar.classList.toggle('sidebar--chetnitsi', mode === 'chetnitsi');
  if (kickerEl) {
    kickerEl.textContent = kicker || '';
    kickerEl.hidden      = !kicker;
  }
}

function renderTimelinePopup(feature, entry) {
  var popupEl   = document.getElementById('timeline-popup');
  var titleEl   = document.getElementById('timeline-popup-title');
  var contentEl = document.getElementById('timeline-popup-content');
  var sourceEl  = document.getElementById('timeline-popup-source');
  if (!popupEl || !titleEl || !contentEl || !sourceEl) { return; }
  titleEl.textContent   = (entry && entry.title) ? entry.title : feature.properties.name;
  contentEl.innerHTML   = (entry && entry.html) ? entry.html : '';
  sourceEl.textContent  = (entry && entry.source_title) ? entry.source_title : '';
  sourceEl.hidden       = !sourceEl.textContent;
  popupEl.hidden        = false;
  syncTimelineHeight();
}

function clearTimelinePopup() {
  var popupEl   = document.getElementById('timeline-popup');
  var titleEl   = document.getElementById('timeline-popup-title');
  var contentEl = document.getElementById('timeline-popup-content');
  var sourceEl  = document.getElementById('timeline-popup-source');
  if (!popupEl || !titleEl || !contentEl || !sourceEl) { return; }
  titleEl.textContent  = '';
  contentEl.innerHTML  = '';
  sourceEl.textContent = '';
  sourceEl.hidden      = true;
  popupEl.hidden       = true;
  syncTimelineHeight();
}

function openInfoPanel(feature, popupEntry, options) {
  options = options || {};
  var sourceEl = document.getElementById('sidebar-source');
  setSidebarMode(options.mode || 'default', options.kicker || '');
  document.getElementById('sidebar-title').textContent =
    (popupEntry && popupEntry.title) ? popupEntry.title : feature.properties.name;
  document.getElementById('sidebar-content').innerHTML =
    (popupEntry && popupEntry.html) ? popupEntry.html : '';
  if (sourceEl) {
    sourceEl.textContent = (popupEntry && popupEntry.source_title) ? popupEntry.source_title : '';
    sourceEl.hidden      = !sourceEl.textContent;
  }
  document.getElementById('sidebar-content').scrollTop = 0;
  document.getElementById('sidebar').classList.add('is-open');
  document.body.classList.add('sidebar-open');
}

function closeInfoPanel() {
  document.getElementById('sidebar').classList.remove('is-open');
  document.body.classList.remove('sidebar-open');
  setSidebarMode('default', '');
  activeChetnitsiId = null;
  syncChetnitsiActive();
}

function handleMarkerClick(feature) {
  var entry = popupData[feature.properties.popup_id];
  if (!entry) { return; }
  openInfoPanel(feature, entry);
  var latlng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
  if (feature.properties.feature_type === 'district_center' && map.getZoom() <= 7) {
    map.flyTo(latlng, 8, { duration: 1.2, easeLinearity: 0.35 });
  } else {
    map.panTo(latlng);
  }
}

/* ── Controls ────────────────────────────────────────────── */

function syncCheckboxesToState() {
  var ids = {
    'toggle-points':          'points',
    'toggle-detachments':     'detachments',
    'toggle-districts':       'districts',
    'toggle-apostolic':       'apostolic',
    'toggle-okrazhen-centers':'okrazhenCenters',
    'toggle-botev':           'botev',
    'toggle-chetnitsi':       'chetnitsi'
  };
  Object.keys(ids).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { el.checked = !!layerOn[ids[id]]; }
  });
}

function bindControls() {
  syncCheckboxesToState();
  document.getElementById('sidebar-close').addEventListener('click', closeInfoPanel);

  document.getElementById('controls-toggle').addEventListener('click', function () {
    var panel     = document.getElementById('controls');
    var collapsed = panel.classList.toggle('is-collapsed');
    this.setAttribute('aria-expanded', String(!collapsed));
  });

  initThemeToggle();

  /* Keep Leaflet zoom controls flush below the legend panel on mobile */
  (function () {
    var stack = document.getElementById('panel-stack');
    if (!stack || !window.ResizeObserver) { return; }
    function syncZoomPos() {
      if (window.innerWidth <= 899) {
        var bottom = stack.getBoundingClientRect().bottom;
        document.documentElement.style.setProperty('--legend-h', (bottom + 4) + 'px');
      } else {
        document.documentElement.style.removeProperty('--legend-h');
      }
    }
    new ResizeObserver(syncZoomPos).observe(stack);
    window.addEventListener('resize', syncZoomPos);
    syncZoomPos();
  })();

  document.getElementById('toggle-districts').addEventListener('change', function (e) {
    layerOn.districts = e.target.checked; renderVisibleLayers();
  });
  document.getElementById('toggle-okrazhen-centers').addEventListener('change', function (e) {
    layerOn.okrazhenCenters = e.target.checked; renderVisibleLayers();
  });
  document.getElementById('toggle-apostolic').addEventListener('change', function (e) {
    layerOn.apostolic = e.target.checked; renderVisibleLayers();
  });
  document.getElementById('toggle-points').addEventListener('change', function (e) {
    layerOn.points = e.target.checked; renderVisibleLayers();
  });
  document.getElementById('toggle-detachments').addEventListener('change', function (e) {
    layerOn.detachments = e.target.checked; renderVisibleLayers();
  });

  var botevToggle = document.getElementById('toggle-botev');
  if (botevToggle) { botevToggle.addEventListener('change', function (e) { setBotevVisible(e.target.checked); }); }

  var chetToggle = document.getElementById('toggle-chetnitsi');
  if (chetToggle) {
    chetToggle.addEventListener('change', function (e) {
      layerOn.chetnitsi     = e.target.checked;
      chetnitsiUserDisabled = !e.target.checked;
      if (layerGroups.chetnitsi) {
        if (layerOn.chetnitsi) { layerGroups.chetnitsi.addTo(map); }
        else { map.removeLayer(layerGroups.chetnitsi); }
      }
    });
  }
}

function initThemeToggle() {
  var btn = document.getElementById('theme-toggle-btn');
  if (!btn) { return; }
  function updateBtn() {
    var dark  = document.documentElement.getAttribute('data-theme') === 'dark';
    var icon  = btn.querySelector('.theme-icon');
    var label = btn.querySelector('.theme-toggle-label');
    if (icon)  { icon.className   = 'ti theme-icon ' + (dark ? 'ti-sun' : 'ti-moon'); }
    if (label) { label.textContent = dark ? 'Светла тема' : 'Тъмна тема'; }
  }
  btn.addEventListener('click', function () {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (dark) { document.documentElement.removeAttribute('data-theme'); try { localStorage.setItem('theme', 'light'); } catch (e) {} }
    else      { document.documentElement.setAttribute('data-theme', 'dark'); try { localStorage.setItem('theme', 'dark'); } catch (e) {} }
    updateBtn();
  });
  updateBtn();
}

/* ── Utility ─────────────────────────────────────────────── */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
