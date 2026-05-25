/* ============================================================
   app-chetnitsi.js — Botev's detachment members by hometown
   Depends on: app-state.js, app-layers.js (globals), Leaflet
   ============================================================ */
'use strict';

function loadChetnitsiData() {
  return Promise.all([
    fetch(DATA.chetnitsiPlaces).then(function (r) { return r.json(); }),
    fetch(DATA.chetnitsiContent).then(function (r) { return r.json(); })
  ]).then(function (results) {
    allFeatures.chetnitsi = (results[0].features || []).slice();
    chetnitsiContent      = results[1] || {};
  }).catch(function (err) {
    console.warn('Chetnitsi data failed to load', err);
  });
}

function buildChetnitsiSearchIndex() {
  chetnitsiSearchIndex = [];
  Object.keys(chetnitsiContent).forEach(function (placeId) {
    var entry     = chetnitsiContent[placeId];
    var placeName = entry.title || placeId;
    (entry.members || []).forEach(function (m) {
      if (m.name) {
        chetnitsiSearchIndex.push({
          name:      m.name,
          years:     m.years || '',
          placeId:   placeId,
          placeName: placeName
        });
      }
    });
  });
  chetnitsiSearchIndex.sort(function (a, b) {
    return a.name.localeCompare(b.name, 'bg');
  });
}

function syncChetnitsiActive() {
  if (!layerGroups.chetnitsi) { return; }
  layerGroups.chetnitsi.getLayers().forEach(function (m) {
    var el = m.getElement();
    if (!el) { return; }
    var dot = el.querySelector('.chetnitsi-marker');
    if (dot) { dot.classList.toggle('is-active', m._chetnitsiId === activeChetnitsiId); }
  });
}

function openChetnitsiPanel(feature, skipPan, highlightName) {
  var entry = chetnitsiContent[feature.properties.popup_id];
  if (!entry) {
    entry = { title: feature.properties.name, summary: '', count: feature.properties.count || 0, members: [] };
  }

  activeChetnitsiId = feature.properties.popup_id;
  syncChetnitsiActive();
  map.once('moveend', syncChetnitsiActive);

  openInfoPanel(feature, {
    title:        entry.title || feature.properties.name,
    html:         renderChetnitsiContent(entry),
    source_title: entry.source_title || ''
  }, {
    mode:   'chetnitsi',
    kicker: 'Ботеви четници'
  });

  if (highlightName) {
    setTimeout(function () {
      var content = document.getElementById('sidebar-content');
      var card    = content && content.querySelector('[data-member-name="' + highlightName.replace(/"/g, '&quot;') + '"]');
      if (card) {
        card.classList.add('is-highlighted');
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 80);
  }

  if (!skipPan) {
    map.panTo(L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]));
  }
}

function renderChetnitsiContent(entry) {
  var members = Array.isArray(entry.members) ? entry.members : [];
  var count   = (typeof entry.count === 'number') ? entry.count : members.length;

  var sorted = members.slice().sort(function (a, b) {
    return (a.name || '').localeCompare(b.name || '', 'bg');
  });

  var html = '<div class="chetnitsi-content">';
  if (entry.summary) {
    html += '<p class="chetnitsi-summary">' + escapeHtml(entry.summary) + '</p>';
  }
  html += '<div class="chetnitsi-count-row">';
  html += '<p class="chetnitsi-count">Общо: <strong>' + count + '</strong> четници</p>';
  html += '<span class="chetnitsi-count-chip">Родни места</span>';
  html += '</div>';

  if (sorted.length) {
    html += '<div class="chetnitsi-members-table">';
    html += '<div class="chetnitsi-members-head">';
    html += '<span class="chetnitsi-members-col chetnitsi-members-col--name">Четник</span>';
    html += '<span class="chetnitsi-members-col chetnitsi-members-col--years">Години</span>';
    html += '<span class="chetnitsi-members-col chetnitsi-members-col--role">Роля и бележка</span>';
    html += '</div>';
    html += '<ul class="chetnitsi-members">';
    sorted.forEach(function (m) {
      html += '<li class="chetnitsi-member-card" data-member-name="' + escapeHtml(m.name || '') + '">';
      html += '<div class="chetnitsi-member-name-wrap">';
      html += '<span class="chetnitsi-member-name">' + escapeHtml(m.name || '') + '</span>';
      html += '</div>';
      html += '<div class="chetnitsi-member-years">' + escapeHtml(m.years || '—') + '</div>';
      html += '<div class="chetnitsi-member-meta">';
      if (m.role) { html += '<div class="chetnitsi-member-role">' + escapeHtml(m.role) + '</div>'; }
      if (m.info) { html += '<div class="chetnitsi-member-info">' + escapeHtml(m.info) + '</div>'; }
      if (!m.role && !m.info) { html += '<div class="chetnitsi-member-info chetnitsi-member-info--empty">—</div>'; }
      html += '</div>';
      html += '</li>';
    });
    html += '</ul>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function initChetnitsiSearch() {
  var input = document.getElementById('chetnitsi-search-input');
  var list  = document.getElementById('chetnitsi-search-list');
  var clear = document.getElementById('chetnitsi-search-clear');
  if (!input || !list || !clear) { return; }

  function closeNavSearch() {
    list.hidden = true;
    var panel  = document.getElementById('search-panel');
    var navBtn = document.getElementById('pill-search-btn') ||
                 document.getElementById('fab-search-btn');
    if (panel && panel.classList.contains('is-open')) {
      panel.classList.remove('is-open');
      if (navBtn) { navBtn.classList.remove('is-active'); }
      setTimeout(function () {
        if (!panel.classList.contains('is-open')) { panel.hidden = true; }
      }, 220);
    }
  }

  function renderResults(q) {
    q = q.trim();
    list.innerHTML = '';
    if (!q) { list.hidden = true; clear.hidden = true; return; }
    clear.hidden = false;
    var ql     = q.toLowerCase();
    var scored = chetnitsiSearchIndex.filter(function (item) {
      return item.name.toLowerCase().indexOf(ql) !== -1 ||
             item.placeName.toLowerCase().indexOf(ql) !== -1;
    }).map(function (item) {
      var nl = item.name.toLowerCase();
      var score;
      if (nl.startsWith(ql))                                              { score = 0; }
      else if (nl.split(/[\s\-]+/).some(function (w) { return w.startsWith(ql); })) { score = 1; }
      else if (nl.indexOf(ql) !== -1)                                     { score = 2; }
      else                                                                 { score = 3; }
      return { item: item, score: score };
    });
    scored.sort(function (a, b) {
      return a.score - b.score || a.item.name.localeCompare(b.item.name, 'bg');
    });
    var matches = scored.slice(0, 10).map(function (x) { return x.item; });

    if (!matches.length) {
      var noResult = document.createElement('li');
      noResult.className   = 'chetnitsi-search-no-results';
      noResult.textContent = 'Няма резултати';
      list.appendChild(noResult);
    } else {
      matches.forEach(function (item) {
        var li = document.createElement('li');
        li.className = 'chetnitsi-search-item';
        li.setAttribute('role', 'option');

        var nameEl    = document.createElement('span');
        nameEl.className = 'chetnitsi-search-item-name';
        var nl2      = item.name.toLowerCase();
        var matchIdx = nl2.indexOf(ql);
        if (matchIdx !== -1) {
          if (matchIdx > 0) { nameEl.appendChild(document.createTextNode(item.name.slice(0, matchIdx))); }
          var mark = document.createElement('mark');
          mark.className   = 'search-highlight';
          mark.textContent = item.name.slice(matchIdx, matchIdx + ql.length);
          nameEl.appendChild(mark);
          nameEl.appendChild(document.createTextNode(item.name.slice(matchIdx + ql.length)));
        } else {
          nameEl.textContent = item.name;
        }

        var placeEl = document.createElement('span');
        placeEl.className   = 'chetnitsi-search-item-place';
        placeEl.textContent = item.placeName + (item.years ? ' · ' + item.years : '');

        li.appendChild(nameEl);
        li.appendChild(placeEl);
        li.addEventListener('mousedown', function (e) {
          e.preventDefault();
          input.value  = '';
          list.hidden  = true;
          clear.hidden = true;
          input.blur();
          selectSearchResult(item);
        });
        list.appendChild(li);
      });
    }
    list.hidden = false;
  }

  input.addEventListener('focus', function () {
    if (input.value.trim()) { renderResults(input.value); }
  });
  input.addEventListener('input', function () { renderResults(input.value); });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      list.hidden = true;
      if (!input.value.trim()) { closeNavSearch(); }
      else { input.value = ''; renderResults(''); }
    } else if (e.key === 'Enter') {
      var first = list.querySelector('.chetnitsi-search-item');
      if (first) { first.dispatchEvent(new MouseEvent('mousedown')); }
    }
  });

  input.addEventListener('blur', function () {
    setTimeout(function () {
      list.hidden = true;
      if (!input.value.trim()) { closeNavSearch(); }
    }, 150);
  });

  clear.addEventListener('click', function () {
    input.value  = '';
    list.hidden  = true;
    clear.hidden = true;
    input.focus();
  });

  document.addEventListener('click', function (e) {
    var panel = document.getElementById('search-panel');
    var btn1  = document.getElementById('pill-search-btn');
    var btn2  = document.getElementById('fab-search-btn');
    if (panel && !panel.contains(e.target) &&
        (!btn1 || !btn1.contains(e.target)) &&
        (!btn2 || !btn2.contains(e.target))) {
      if (!input.value.trim()) { closeNavSearch(); }
    }
  });
}

function selectSearchResult(item) {
  if (!layerOn.chetnitsi) {
    layerOn.chetnitsi     = true;
    chetnitsiUserDisabled = false;
    var cb = document.getElementById('toggle-chetnitsi');
    if (cb) { cb.checked = true; }
    renderVisibleLayers();
  }
  var feature = null;
  for (var i = 0; i < allFeatures.chetnitsi.length; i++) {
    if (allFeatures.chetnitsi[i].properties.popup_id === item.placeId) {
      feature = allFeatures.chetnitsi[i];
      break;
    }
  }
  if (!feature) { return; }
  map.flyTo(L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]), 9, { duration: 1.2, easeLinearity: 0.35 });
  openChetnitsiPanel(feature, true, item.name);
}
