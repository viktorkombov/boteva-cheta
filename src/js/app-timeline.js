/* ============================================================
   app-timeline.js — Botev march animated timeline
   Depends on: app-state.js, app-layers.js, app-chetnitsi.js
               (globals), Leaflet + L.curve
   ============================================================ */
'use strict';

function syncTimelineHeight() {
  var panel = document.getElementById('timeline');
  if (!panel) { return; }
  if (window.innerWidth <= 1200 && !panel.hidden) {
    var h = panel.offsetHeight;
    document.documentElement.style.setProperty('--timeline-h', (h > 0 ? h : 0) + 'px');
  } else if (window.innerWidth <= 1200) {
    document.documentElement.style.setProperty('--timeline-h', '0px');
  }
}

function loadBotevTimelineData() {
  return Promise.all([
    fetch(DATA.botevRoute).then(function (r) { return r.json(); }),
    fetch(DATA.botevPoints).then(function (r) { return r.json(); }),
    fetch(DATA.botevContent).then(function (r) { return r.json(); })
  ]).then(function (results) {
    botev.routeCoords = flattenRouteCoords(results[0]);
    botev.points = (results[1].features || []).slice().sort(function (a, b) {
      return (a.properties.order || 0) - (b.properties.order || 0);
    });
    botev.content = results[2] || {};

    botev.points.forEach(function (f) {
      f.__routeIndex = nearestRouteVertexIndex(f.geometry.coordinates[1], f.geometry.coordinates[0]);
    });
    buildRouteFractions();
  }).catch(function (err) {
    console.warn('Botev timeline data failed to load', err);
  });
}

function flattenRouteCoords(geojson) {
  var out      = [];
  var features = (geojson && geojson.features) || [];
  features.forEach(function (f) {
    var g = f.geometry;
    if (!g) { return; }
    if (g.type === 'LineString') {
      g.coordinates.forEach(function (c) { out.push([c[1], c[0]]); });
    } else if (g.type === 'MultiLineString') {
      g.coordinates.forEach(function (line) {
        line.forEach(function (c) { out.push([c[1], c[0]]); });
      });
    }
  });
  return out;
}

function nearestRouteVertexIndex(lat, lng) {
  if (!botev.routeCoords.length) { return 0; }
  var best   = 0;
  var bestD  = Infinity;
  var cosLat = Math.cos(lat * Math.PI / 180);
  for (var i = 0; i < botev.routeCoords.length; i++) {
    var dy = botev.routeCoords[i][0] - lat;
    var dx = (botev.routeCoords[i][1] - lng) * cosLat;
    var d  = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/* Smooth Catmull-Rom cubic-bezier path for L.curve */
function buildCurvePath(coords) {
  var step = Math.max(1, Math.floor(coords.length / 160));
  var pts  = [];
  for (var i = 0; i < coords.length; i += step) { pts.push(coords[i]); }
  if (pts[pts.length - 1] !== coords[coords.length - 1]) { pts.push(coords[coords.length - 1]); }
  if (pts.length < 2) { return ['M', pts[0] || [0, 0], 'L', pts[0] || [0, 0]]; }
  var path = ['M', pts[0]];
  for (var j = 1; j < pts.length; j++) {
    var p0  = pts[Math.max(0, j - 2)];
    var p1  = pts[j - 1];
    var p2  = pts[j];
    var p3  = pts[Math.min(pts.length - 1, j + 1)];
    var cp1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    var cp2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    path.push('C', cp1, cp2, p2);
  }
  return path;
}

function buildRouteFractions() {
  var coords = botev.routeCoords;
  if (!coords.length) { return; }
  var cum = [0];
  for (var i = 1; i < coords.length; i++) {
    var a  = coords[i - 1], b = coords[i];
    var dy = b[0] - a[0];
    var dx = (b[1] - a[1]) * Math.cos(a[0] * Math.PI / 180);
    cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  var total = cum[cum.length - 1] || 1;
  botev._routeCumDist   = cum;
  botev._routeTotalDist = total;
  botev.routeFractions  = botev.points.map(function (f) {
    return cum[Math.min(f.__routeIndex || 0, cum.length - 1)] / total;
  });
}

function createBotevRouteLayer() {
  if (!botev.routeCoords.length) { return; }

  botev.routeLayer = L.polyline(botev.routeCoords, {
    color:       '#3B5E1A',
    weight:      2,
    opacity:     0.18,
    dashArray:   '3 11',
    interactive: false,
    className:   'botev-route-bg'
  });

  botev.curveLayer = L.curve(buildCurvePath(botev.routeCoords), {
    color:       '#3B5E1A',
    weight:      3,
    opacity:     0.85,
    dashArray:   '10 8',
    lineCap:     'round',
    lineJoin:    'round',
    fill:        false,
    interactive: false,
    className:   'botev-route-active'
  });

  /* After any Leaflet redraw the SVG pixel length changes;
     patch _updatePath so dashoffset is restored proportionally. */
  var _orig = botev.curveLayer._updatePath.bind(botev.curveLayer);
  botev.curveLayer._updatePath = function () { _orig(); restoreSvgDashoffset(); };
}

function createTimelinePointLayer() {
  botev.pointMarkers = botev.points.map(function (f, idx) {
    var num  = f.properties.order || (idx + 1);
    var icon = L.divIcon({
      className:   '',
      html:        '<div class="botev-lm">' +
                   '<div class="botev-lm-bubble"><span class="botev-lm-num">' + num + '</span></div>' +
                   '<div class="botev-lm-stem"></div>' +
                   '<div class="botev-lm-dot"></div>' +
                   '<div class="botev-lm-label">' + escapeHtml(f.properties.place || f.properties.name) + '</div>' +
                   '</div>',
      iconSize:    [24, 50],
      iconAnchor:  [12, 47],
      popupAnchor: [50, -47]
    });
    var m = L.marker(L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]), { icon: icon, title: f.properties.name });
    m.on('click', function () { goToTimelineStep(idx); });
    return m;
  });
  botev.pointsLayer = L.layerGroup([]);
}

function showBotevLayers() {
  if (botev.routeLayer  && !map.hasLayer(botev.routeLayer))  { botev.routeLayer.addTo(map); }
  if (botev.curveLayer  && !map.hasLayer(botev.curveLayer))  { botev.curveLayer.addTo(map); initSvgLength(); }
  if (botev.pointsLayer && !map.hasLayer(botev.pointsLayer)) { botev.pointsLayer.addTo(map); }
}

function hideBotevLayers() {
  cancelAnimation();
  if (botev.routeLayer  && map.hasLayer(botev.routeLayer))  { map.removeLayer(botev.routeLayer); }
  if (botev.curveLayer  && map.hasLayer(botev.curveLayer))  { map.removeLayer(botev.curveLayer); }
  if (botev.pointsLayer && map.hasLayer(botev.pointsLayer)) { map.removeLayer(botev.pointsLayer); }
}

function setBotevVisible(on) {
  layerOn.botev = !!on;
  var panel = document.getElementById('timeline');
  if (on) {
    showBotevLayers();
    if (!botev.panelCollapsed && panel) { panel.hidden = false; }
    setTimeout(updateTimelineUI, 0);
  } else {
    pauseTimeline();
    hideBotevLayers();
    clearTimelinePopup();
    if (panel) { panel.hidden = true; }
  }
}

function initTimelineControl() {
  var panel = document.getElementById('timeline');
  if (!panel || !botev.points.length) { return; }
  panel.hidden = !layerOn.botev;

  requestAnimationFrame(function () { syncTimelineHeight(); });
  window.addEventListener('resize', syncTimelineHeight);

  var slider = document.getElementById('timeline-slider');
  if (slider) {
    slider.min   = '0';
    slider.max   = String(Math.max(0, botev.points.length - 1));
    slider.value = '0';
    slider.addEventListener('change', function (e) {
      if (botev.isAnimating) { return; }
      if (botev.playing) { pauseTimeline(); }
      var i = parseInt(e.target.value, 10);
      goToTimelineStep(isNaN(i) ? 0 : i);
    });
  }

  var prev = document.getElementById('timeline-prev');
  if (prev) {
    prev.addEventListener('click', function () {
      if (botev.isAnimating) { return; }
      if (botev.playing) { pauseTimeline(); }
      goToTimelineStep(Math.max(0, botev.currentIndex < 0 ? 0 : botev.currentIndex - 1));
    });
  }

  var next = document.getElementById('timeline-next');
  if (next) {
    next.addEventListener('click', function () {
      var isFinished = !botev.playing && botev.currentIndex >= botev.points.length - 1 && botev.currentIndex >= 0;
      if (isFinished) { resetTimeline(true); revealChetnitsiLayer(true); return; }
      if (botev.isAnimating) { return; }
      if (botev.playing) { pauseTimeline(); }
      var i = Math.min(botev.points.length - 1, botev.currentIndex < 0 ? 0 : botev.currentIndex + 1);
      goToTimelineStep(i);
    });
  }

  var play = document.getElementById('timeline-play');
  if (play) {
    play.addEventListener('click', function () {
      if (botev.isAnimating) { return; }
      var isFinished = !botev.playing && botev.currentIndex >= botev.points.length - 1 && botev.currentIndex >= 0;
      var isPaused   = !botev.playing && botev._segIdx >= 0 && botev.currentIndex < botev.points.length - 1;
      if (isFinished) {
        restartTimeline();
      } else if (botev.playing) {
        pauseTimeline();
      } else if (isPaused) {
        botev.playing = true;
        updateTimelineUI();
        playFromIndex(botev._segIdx);
      } else {
        playTimeline();
      }
    });
  }

  var stop = document.getElementById('timeline-stop');
  if (stop) {
    stop.addEventListener('click', function () {
      var isFinished = !botev.playing && botev.currentIndex >= botev.points.length - 1 && botev.currentIndex >= 0;
      var isPaused   = !botev.playing && botev._segIdx >= 0 && botev.currentIndex < botev.points.length - 1;
      if (botev.playing) {
        resetTimeline(true);
      } else if (isPaused || isFinished) {
        resetTimeline(true);
        collapseTimelinePanel();
      }
    });
  }

  var collapseBtn = document.getElementById('timeline-collapse');
  if (collapseBtn) { collapseBtn.addEventListener('click', collapseTimelinePanel); }

  updateTimelineUI();
}

function collapseTimelinePanel() {
  botev.panelCollapsed = true;
  var panel = document.getElementById('timeline');
  if (panel) { panel.hidden = true; }
  document.body.classList.add('timeline-collapsed');
  document.documentElement.style.setProperty('--timeline-h', '0px');
}

function expandTimelinePanel() {
  botev.panelCollapsed = false;
  var panel = document.getElementById('timeline');
  if (panel) { panel.hidden = false; }
  document.body.classList.remove('timeline-collapsed');
  requestAnimationFrame(function () { syncTimelineHeight(); });
}

function goToTimelineStep(index) {
  if (!botev.points.length) { return; }
  index = Math.max(0, Math.min(botev.points.length - 1, index));

  cancelAnimation();
  botev.currentIndex = index;
  botev._segIdx      = index;

  revealMarkersUpTo(index);
  setRouteProgress(botev.routeFractions[index] || 0);

  var f     = botev.points[index];
  var ll    = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
  var entry = botev.content[f.properties.popup_id] || { title: f.properties.name, html: '' };
  closeInfoPanel();
  renderTimelinePopup(f, entry);

  botev.isAnimating = true;
  updateTimelineUI();
  map.once('moveend', function () { botev.isAnimating = false; updateTimelineUI(); });

  var targetZoom = Math.min(8, Math.max(map.getZoom(), f.properties.min_zoom || 8));
  var panCenter  = ll;
  if (window.innerWidth <= 1200) {
    panCenter = _mobileOffset(ll, targetZoom);
  }
  map.setView(panCenter, targetZoom, { animate: true, duration: 0.9, easeLinearity: 0.5 });
}

/* ── SVG stroke-dashoffset helpers ───────────────────────── */

function initSvgLength() {
  if (!botev.curveLayer || !botev.curveLayer._path) { return; }
  var el  = botev.curveLayer._path;
  var len = el.getTotalLength() || 1;
  botev._svgPathLength       = len;
  el.style.strokeDasharray   = len + ' ' + len;
  el.style.strokeDashoffset  = len * (1 - botev._drawnFraction);
}

function restoreSvgDashoffset() {
  if (!botev.curveLayer || !botev.curveLayer._path) { return; }
  var el  = botev.curveLayer._path;
  var len = el.getTotalLength() || botev._svgPathLength || 1;
  botev._svgPathLength       = len;
  el.style.strokeDasharray   = len + ' ' + len;
  el.style.strokeDashoffset  = len * (1 - botev._drawnFraction);
}

function setRouteProgress(fraction) {
  botev._drawnFraction = Math.max(0, Math.min(1, fraction));
  if (!botev.curveLayer || !botev.curveLayer._path || !botev._svgPathLength) { return; }
  botev.curveLayer._path.style.strokeDashoffset = botev._svgPathLength * (1 - botev._drawnFraction);
}

function cancelAnimation() {
  if (botev._rafHandle) { cancelAnimationFrame(botev._rafHandle); botev._rafHandle = null; }
  if (botev._segTimer)  { clearTimeout(botev._segTimer);          botev._segTimer  = null; }
}

/* ── Route position helper ───────────────────────────────── */

function latlngAtFraction(frac) {
  var cum    = botev._routeCumDist;
  var coords = botev.routeCoords;
  if (!cum.length || !coords.length) { return null; }
  var target = frac * botev._routeTotalDist;
  var lo = 0, hi = cum.length - 1;
  while (lo < hi - 1) {
    var mid = (lo + hi) >> 1;
    if (cum[mid] <= target) { lo = mid; } else { hi = mid; }
  }
  var segLen = cum[hi] - cum[lo];
  var t      = segLen > 0 ? (target - cum[lo]) / segLen : 0;
  var a = coords[lo], b = coords[hi];
  return L.latLng(a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]));
}

/* Shared mobile pan-offset calculation */
function _mobileOffset(ll, zoom) {
  var vh           = window.innerHeight;
  var tl           = document.getElementById('timeline');
  var blockedBottom = tl ? tl.offsetHeight : 0;
  if (document.body.classList.contains('sidebar-open')) {
    var sEl = document.querySelector('.sidebar');
    if (sEl) { blockedBottom += sEl.offsetHeight; }
  }
  var visY  = (vh - blockedBottom) / 2;
  var lProj = map.project(ll, zoom);
  return map.unproject(L.point(lProj.x, lProj.y - visY + vh / 2), zoom);
}

/* ── Core segment animation using rAF ───────────────────── */

function animateSegment(fromFraction, toFraction, duration, onComplete) {
  cancelAnimation();
  var startTime  = null;
  var panFrame   = 0;
  var panPending = false;

  function tick(ts) {
    if (!botev.playing) { return; }
    if (!startTime) { startTime = ts; }
    var elapsed = ts - startTime;
    var t       = Math.min(elapsed / duration, 1);
    t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; /* ease-in-out quad */
    setRouteProgress(fromFraction + t * (toFraction - fromFraction));

    if (!panPending && ++panFrame % 20 === 0) {
      var tip = latlngAtFraction(botev._drawnFraction);
      if (tip) {
        var vw = window.innerWidth;
        var inBounds, panTarget;
        if (vw > 1200) {
          var bounds  = map.getBounds();
          var sw      = bounds.getSouthWest();
          var ne      = bounds.getNorthEast();
          var margin  = 0.15;
          inBounds  =
            tip.lat > sw.lat + (ne.lat - sw.lat) * margin &&
            tip.lat < ne.lat - (ne.lat - sw.lat) * margin &&
            tip.lng > sw.lng + (ne.lng - sw.lng) * margin &&
            tip.lng < ne.lng - (ne.lng - sw.lng) * margin;
          panTarget = tip;
        } else {
          var vh  = window.innerHeight;
          var tl  = document.getElementById('timeline');
          var blocked = tl ? tl.offsetHeight : 0;
          if (document.body.classList.contains('sidebar-open')) {
            var sEl = document.querySelector('.sidebar');
            if (sEl) { blocked += sEl.offsetHeight; }
          }
          var px = map.latLngToContainerPoint(tip);
          var mg = 60;
          inBounds  = px.x > mg && px.x < vw - mg && px.y > mg && px.y < vh - blocked - mg;
          panTarget = _mobileOffset(tip, map.getZoom());
        }
        if (!inBounds) {
          panPending = true;
          map.panTo(panTarget, { animate: true, duration: 0.6, easeLinearity: 0.5 });
          map.once('moveend', function () { panPending = false; });
        }
      }
    }

    if (elapsed < duration) {
      botev._rafHandle = requestAnimationFrame(tick);
    } else {
      botev._rafHandle = null;
      setRouteProgress(toFraction);
      if (onComplete) { onComplete(); }
    }
  }
  botev._rafHandle = requestAnimationFrame(tick);
}

/* ── Auto-play segment chain ─────────────────────────────── */

function playFromIndex(segIdx) {
  if (!botev.playing) { return; }
  if (segIdx >= botev.points.length) {
    botev.playing = false;
    updateTimelineUI();
    revealChetnitsiLayer();
    return;
  }
  botev._segIdx        = segIdx;
  var prevFrac         = segIdx === 0 ? 0 : (botev.routeFractions[segIdx - 1] || 0);
  var toFraction       = botev.routeFractions[segIdx] || prevFrac;
  botev._segTargetFrac = toFraction;
  var segFrac  = Math.max(0.001, toFraction - prevFrac);
  var duration = Math.min(3500, Math.max(1200, segFrac * 18000));

  animateSegment(botev._drawnFraction, toFraction, duration, function () {
    onSegmentComplete(segIdx);
  });
}

function onSegmentComplete(segIdx) {
  if (!botev.playing) { return; }
  botev.currentIndex = segIdx;
  revealMarkersUpTo(segIdx);
  var f     = botev.points[segIdx];
  var entry = botev.content[f.properties.popup_id] || { title: f.properties.name, html: '' };
  closeInfoPanel();
  renderTimelinePopup(f, entry);
  var ll        = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
  var panTarget = window.innerWidth <= 1200 ? _mobileOffset(ll, map.getZoom()) : ll;
  map.panTo(panTarget, { animate: true, duration: 0.5 });
  updateTimelineUI();
  botev._segTimer = setTimeout(function () { botev._segTimer = null; playFromIndex(segIdx + 1); }, 900);
}

function updateTimelineUI() {
  var f          = botev.currentIndex >= 0 ? botev.points[botev.currentIndex] : null;
  var isFinished = !botev.playing && botev.currentIndex >= 0 && botev.currentIndex >= botev.points.length - 1;
  var isAtStart  = !botev.playing && botev.currentIndex <= 0;
  var isInitial  = !botev.playing && botev.currentIndex < 0 && botev._segIdx < 0 && botev._drawnFraction <= 0;
  var isPaused   = !botev.playing && botev._segIdx >= 0 && botev.currentIndex < botev.points.length - 1;
  var locked     = botev.playing || botev.isAnimating;

  var dateEl  = document.getElementById('timeline-date');
  var nameEl  = document.getElementById('timeline-name');
  var slider  = document.getElementById('timeline-slider');
  var play    = document.getElementById('timeline-play');
  var stopBtn = document.getElementById('timeline-stop');
  var prevBtn = document.getElementById('timeline-prev');
  var nextBtn = document.getElementById('timeline-next');

  if (dateEl)  { dateEl.textContent = f ? f.properties.date_label : ''; }
  if (nameEl)  { nameEl.hidden = !!f; nameEl.textContent = 'Походът на Ботевата чета'; }
  if (slider)  { slider.value = botev.currentIndex >= 0 ? String(botev.currentIndex) : '0'; slider.disabled = locked; }
  if (play) {
    if (isFinished)         { play.textContent = '↺︎ Отначало'; }
    else if (botev.playing) { play.textContent = '❚︎❚︎ Пауза'; }
    else if (isPaused)      { play.textContent = '▶︎ Продължи'; }
    else                    { play.textContent = '▶︎ Пусни'; }
    play.disabled = botev.isAnimating && !botev.playing;
  }
  if (stopBtn) {
    var isActive = botev.playing || isPaused || isFinished;
    stopBtn.textContent = isActive && !botev.playing ? '✖︎ Затвори' : '■︎ Спри';
    stopBtn.disabled    = !isActive;
  }
  if (prevBtn) { prevBtn.disabled = locked || isAtStart; }
  if (nextBtn) {
    if (isFinished)     { nextBtn.textContent = 'Приключи'; }
    else if (isInitial) { nextBtn.textContent = 'Започни'; }
    else                { nextBtn.textContent = 'Напред ›'; }
    nextBtn.disabled = locked && !isFinished;
  }

  if (botev.playing) {
    map.scrollWheelZoom.disable(); map.dragging.disable();
    map.touchZoom.disable();       map.doubleClickZoom.disable();
    document.body.classList.add('timeline-playing');
  } else {
    map.scrollWheelZoom.enable();  map.dragging.enable();
    map.touchZoom.enable();        map.doubleClickZoom.enable();
    document.body.classList.remove('timeline-playing');
  }

  botev.pointMarkers.forEach(function (m, i) {
    var el = m.getElement();
    if (!el) { return; }
    var lm = el.querySelector('.botev-lm');
    if (lm) { lm.classList.toggle('is-active', i === botev.currentIndex); }
  });
}

function revealMarkersUpTo(targetIdx) {
  if (!botev.pointsLayer) { return; }
  for (var j = botev.revealedUpTo + 1; j < targetIdx; j++) {
    var mj = botev.pointMarkers[j];
    if (mj && !botev.pointsLayer.hasLayer(mj)) {
      mj.once('add', function () {
        var el = this.getElement();
        if (el) { var lm = el.querySelector('.botev-lm'); if (lm) { lm.classList.add('no-anim'); } }
      });
      botev.pointsLayer.addLayer(mj);
    }
  }
  var mc = botev.pointMarkers[targetIdx];
  if (mc && !botev.pointsLayer.hasLayer(mc)) { botev.pointsLayer.addLayer(mc); }
  botev.revealedUpTo = Math.max(botev.revealedUpTo, targetIdx);
}

function playTimeline() {
  if (!botev.points.length || !botev.routeFractions.length) { return; }
  var startAt = botev.currentIndex < 0 ? 0 : botev.currentIndex + 1;
  if (startAt >= botev.points.length) { botev.playing = false; updateTimelineUI(); return; }
  botev.playing = true;
  updateTimelineUI();
  if (startAt === 0 && map.getZoom() < 9) {
    var f0 = botev.points[0];
    map.flyTo(L.latLng(f0.geometry.coordinates[1], f0.geometry.coordinates[0]), TIMELINE_ZOOM, { duration: 1.2, easeLinearity: 0.35 });
    map.once('moveend', function () { playFromIndex(startAt); });
  } else {
    playFromIndex(startAt);
  }
}

function pauseTimeline() {
  botev.playing = false;
  cancelAnimation();
  updateTimelineUI();
}

function revealChetnitsiLayer(forceReveal) {
  forceReveal = !!forceReveal;
  var didReveal = false;

  function applyReveal() {
    if (didReveal) { return; }
    didReveal = true;
    if (chetnitsiUserDisabled && !forceReveal) { return; }
    if (forceReveal) { chetnitsiUserDisabled = false; }

    if (!layerOn.chetnitsi) {
      layerOn.chetnitsi = true;
      var cb = document.getElementById('toggle-chetnitsi');
      if (cb) { cb.checked = true; }
    }
    document.body.classList.add('chetnitsi-reveal');
    if (layerGroups.chetnitsi && !map.hasLayer(layerGroups.chetnitsi)) {
      layerGroups.chetnitsi.addTo(map);
    } else if (!layerGroups.chetnitsi && allFeatures.chetnitsi.length) {
      layerGroups.chetnitsi = createChetnitsiLayer(allFeatures.chetnitsi);
      layerGroups.chetnitsi.addTo(map);
    }
    setTimeout(function () { document.body.classList.remove('chetnitsi-reveal'); }, 900);
  }

  map.flyTo(INIT_CENTER, INIT_ZOOM, { duration: 1.4, easeLinearity: 0.35 });
  map.once('moveend', applyReveal);
  setTimeout(applyReveal, 1700);
}

function resetTimeline(keepChetnitsi) {
  cancelAnimation();
  botev.playing      = false;
  botev.isAnimating  = false;
  botev.currentIndex = -1;
  botev._segIdx      = -1;

  clearTimelinePopup();
  closeInfoPanel();

  botev.pointMarkers.forEach(function (m) {
    if (botev.pointsLayer && botev.pointsLayer.hasLayer(m)) { botev.pointsLayer.removeLayer(m); }
    var el = m.getElement();
    if (el) { var lm = el.querySelector('.botev-lm'); if (lm) { lm.classList.remove('is-active', 'no-anim'); } }
  });
  botev.revealedUpTo = -1;

  if (!keepChetnitsi) {
    layerOn.chetnitsi     = false;
    chetnitsiUserDisabled = false;
    var cb = document.getElementById('toggle-chetnitsi');
    if (cb) { cb.checked = false; }
  }

  setRouteProgress(0);
  updateTimelineUI();
}

function restartTimeline() {
  resetTimeline();
  expandTimelinePanel();
  setTimeout(function () { playTimeline(); }, 1300);
}
