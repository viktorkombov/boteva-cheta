/* ============================================================
   app-layers.js — Marker icons, layer rendering, ghost markers
   Depends on: app-state.js (globals), Leaflet (L)
   ============================================================ */
'use strict';

/* ── Visibility helpers ───────────────────────────────────── */

function isFeatureVisible(feature, zoom) {
  var p = feature.properties;
  return zoom >= p.min_zoom && zoom <= p.max_zoom;
}

/* Returns true when a feature exists but is below its min_zoom.
   These get a scaled-down ghost marker instead of being hidden. */
function isFeatureGhost(feature, zoom) {
  var minZoom = feature.properties.min_zoom;
  return typeof minZoom === 'number' && zoom < minZoom;
}

/* ── Regular marker icons ─────────────────────────────────── */

function createMarkerIcon(feature) {
  var sg    = feature.properties.style_group;
  var size  = MARKER_SIZE[sg] || 10;
  var inner = feature.properties.numeral
    ? '<span class="district-numeral">' + feature.properties.numeral + '</span>'
    : '';
  return L.divIcon({
    className:   '',
    html:        '<div class="marker-dot ' + sg + '" style="width:' + size + 'px;height:' + size + 'px;">' + inner + '</div>',
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)]
  });
}

function createMarkerLayer(features) {
  var markers = features.map(function (f) {
    var m = L.marker(
      [f.geometry.coordinates[1], f.geometry.coordinates[0]],
      { icon: createMarkerIcon(f), title: f.properties.name }
    );
    m.on('click', function () { handleMarkerClick(f); });
    return m;
  });
  return L.layerGroup(markers);
}

/* ── Ghost marker icons (below min_zoom) ──────────────────── */

function createGhostMarkerIcon(feature) {
  var sg   = feature.properties.style_group || '';
  var size = Math.max(6, Math.round((MARKER_SIZE[sg] || 10) * 0.6));
  var inner = feature.properties.numeral
    ? '<span class="district-numeral">' + feature.properties.numeral + '</span>'
    : '';
  return L.divIcon({
    className:   '',
    html:        '<div class="marker-dot ' + sg + ' is-ghost" style="width:' + size + 'px;height:' + size + 'px;">' + inner + '</div>',
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2]
  });
}

function createGhostMarkerLayer(features) {
  var markers = features.map(function (f) {
    var m = L.marker(
      [f.geometry.coordinates[1], f.geometry.coordinates[0]],
      { icon: createGhostMarkerIcon(f), title: f.properties.name }
    );
    m.on('click', function () { handleGhostMarkerClick(f); });
    return m;
  });
  return L.layerGroup(markers);
}

/* Zoom to the feature's min_zoom then open its content panel */
function handleGhostMarkerClick(feature) {
  var minZoom = feature.properties.min_zoom || 8;
  var latlng  = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
  map.flyTo(latlng, minZoom, { duration: 1.0, easeLinearity: 0.35 });
  map.once('moveend', function () { handleMarkerClick(feature); });
}

/* ── Chetnitsi marker helpers ─────────────────────────────── */

function chetnitsiMarkerSize(count) {
  return Math.min(22, Math.max(16, Math.round(12 + 2.5 * Math.sqrt(Math.max(1, count)))));
}

function renderChetnitsiMarker(feature, latlng) {
  var count    = feature.properties.count || 0;
  var size     = chetnitsiMarkerSize(count);
  var icon = L.divIcon({
    className:   '',
    html:        '<div class="chetnitsi-marker" style="width:' + size + 'px;height:' + size + 'px;"><span class="chetnitsi-marker-count">' + count + '</span></div>',
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)]
  });
  var m = L.marker(latlng, { icon: icon, title: feature.properties.name, _chetnitsiCount: count });
  m._chetnitsiId = feature.properties.popup_id;
  m.on('click', function () { openChetnitsiPanel(feature); });
  return m;
}

function createChetnitsiLayer(features) {
  var cluster = L.markerClusterGroup({
    disableClusteringAtZoom: 10,
    maxClusterRadius:        60,
    spiderfyOnMaxZoom:       false,
    showCoverageOnHover:     false,
    zoomToBoundsOnClick:     false,
    iconCreateFunction: function (clusterObj) {
      var total = 0;
      clusterObj.getAllChildMarkers().forEach(function (m) {
        total += m.options._chetnitsiCount || 0;
      });
      var size = chetnitsiMarkerSize(total);
      return L.divIcon({
        className:   '',
        html:        '<div class="chetnitsi-marker" style="width:' + size + 'px;height:' + size + 'px;"><span class="chetnitsi-marker-count">' + total + '</span></div>',
        iconSize:    [size, size],
        iconAnchor:  [size / 2, size / 2]
      });
    }
  });

  /* fitBounds fires the discrete zoomanim event that markercluster needs
     to position each child at the cluster centre before the CSS transition
     flies it to its real position. flyToBounds skips that event. */
  cluster.on('clusterclick', function (e) {
    map.flyToBounds(e.layer.getBounds(), {
      padding:       [48, 48],
      maxZoom:       e.layer._zoom + 1,
      duration:      0.45,
      easeLinearity: 0.4
    });
  });

  features.forEach(function (f) {
    cluster.addLayer(renderChetnitsiMarker(f, L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0])));
  });
  return cluster;
}

/* ── Main render function — called on zoom and layer toggles ─ */

function renderVisibleLayers() {
  var zoom = map.getZoom();

  if (layerGroups.points)          { map.removeLayer(layerGroups.points); }
  if (layerGroups.detachments)     { map.removeLayer(layerGroups.detachments); }
  if (layerGroups.apostolic)       { map.removeLayer(layerGroups.apostolic); }
  if (layerGroups.okrazhenCenters) { map.removeLayer(layerGroups.okrazhenCenters); }
  if (layerGroups.districts)       { map.removeLayer(layerGroups.districts); }
  if (layerGroups.ghost)           { map.removeLayer(layerGroups.ghost); }

  var vis = function (key) {
    return layerOn[key]
      ? allFeatures[key].filter(function (f) { return isFeatureVisible(f, zoom); })
      : [];
  };

  layerGroups.points          = createMarkerLayer(vis('points')).addTo(map);
  layerGroups.detachments     = createMarkerLayer(vis('detachments')).addTo(map);
  layerGroups.apostolic       = createMarkerLayer(vis('apostolic')).addTo(map);
  layerGroups.okrazhenCenters = createMarkerLayer(vis('okrazhenCenters')).addTo(map);
  layerGroups.districts       = createMarkerLayer(vis('districts')).addTo(map);

  var ghostFeatures = [];
  ['points', 'detachments', 'apostolic', 'okrazhenCenters', 'districts'].forEach(function (key) {
    if (layerOn[key]) {
      allFeatures[key].forEach(function (f) {
        if (isFeatureGhost(f, zoom)) { ghostFeatures.push(f); }
      });
    }
  });
  layerGroups.ghost = createGhostMarkerLayer(ghostFeatures).addTo(map);

  /* Chetnitsi cluster is never recreated on zoom — markercluster handles
     clustering internally. Only created once, then added/removed. */
  if (!layerGroups.chetnitsi && allFeatures.chetnitsi.length) {
    layerGroups.chetnitsi = createChetnitsiLayer(allFeatures.chetnitsi);
  }
  if (layerGroups.chetnitsi) {
    if (layerOn.chetnitsi && !map.hasLayer(layerGroups.chetnitsi)) {
      layerGroups.chetnitsi.addTo(map);
    } else if (!layerOn.chetnitsi && map.hasLayer(layerGroups.chetnitsi)) {
      map.removeLayer(layerGroups.chetnitsi);
    }
  }
}
