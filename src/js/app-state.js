/* ============================================================
   app-state.js — Data paths, constants, shared mutable state
   All variables declared here are global so every other module
   can read and write them directly.
   ============================================================ */
'use strict';

/* ── Data paths ───────────────────────────────────────────── */
var DATA = {
  points:           './src/data/april-points-filtered.geojson',
  detachments:      './src/data/april-detachments-filtered.geojson',
  districts:        './src/data/april-district-centers.geojson',
  popup:            './src/data/april-popup-content.json',
  botevRoute:       './src/data/botev-route.geojson',
  botevPoints:      './src/data/botev-timeline-points-sourced.geojson',
  botevContent:     './src/data/botev-timeline-content-sourced.json',
  chetnitsiPlaces:  './src/data/botev-chetnitsi-merged-places.geojson',
  chetnitsiContent: './src/data/botev-chetnitsi-merged-content.json',
  chetnitsiOverlay: null
};

/* ── Map constants ────────────────────────────────────────── */
var TILE_URL      = './src/tiles/{z}/{x}/{y}.png';
var INIT_CENTER   = [42.72, 25.1];
var INIT_ZOOM     = 7;
var TIMELINE_ZOOM = 8;

/* Pixel diameter for each marker style-group at full size */
var MARKER_SIZE = {
  'district-center':    26,
  'okrazhen-center':    15,
  'settlement':         14,
  'detachment-point':   15,
  'apostolic-assembly': 15
};

/* ── Map instance ─────────────────────────────────────────── */
var map;

/* ── Layer data ───────────────────────────────────────────── */
var popupData   = {};
var allFeatures = {
  points: [], detachments: [], districts: [],
  apostolic: [], okrazhenCenters: [], chetnitsi: []
};
var layerGroups = {
  points: null, detachments: null, districts: null,
  apostolic: null, okrazhenCenters: null, chetnitsi: null, ghost: null
};

/*
 * layerOn — controls which layers are visible on initialisation.
 *
 * To change a default, set the corresponding key to true or false:
 *
 *   points          settlements / major towns
 *   detachments     detachment (чета) locations
 *   districts       administrative district centres
 *   apostolic       apostolic assembly locations
 *   okrazhenCenters regional (окръжни) centres
 *   botev           Botev march route + timeline panel
 *   chetnitsi       detachment members by hometown (cluster layer)
 */
var layerOn = {
  points:          true,
  detachments:     true,
  districts:       true,
  apostolic:       false,
  okrazhenCenters: false,
  botev:           true,
  chetnitsi:       false
};

/* ── Chetnitsi state ──────────────────────────────────────── */
var chetnitsiContent      = {};
var activeChetnitsiId     = null;
var chetnitsiSearchIndex  = [];
var chetnitsiUserDisabled = false;

/* ── Botev timeline state ─────────────────────────────────── */
var botev = {
  routeCoords:     [],
  points:          [],
  content:         {},
  routeLayer:      null,
  curveLayer:      null,
  pointsLayer:     null,
  pointMarkers:    [],
  revealedUpTo:    -1,
  _routeCumDist:   [],
  _routeTotalDist: 0,
  _svgPathLength:  0,
  _drawnFraction:  0,
  _rafHandle:      null,
  _segTimer:       null,
  _segTargetFrac:  0,
  _segIdx:         -1,
  currentIndex:    -1,
  playing:         false,
  isAnimating:     false,
  panelCollapsed:  false
};
