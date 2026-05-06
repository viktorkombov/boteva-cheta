/* ============================================================
   info-modal.js — Data / info modal with chart
   Loads content from JSON files and renders tabs.
   ============================================================ */

(function () {
  'use strict';

  var DATA_URL       = './src/data/info-modal-content.json';
  var BIBLIO_URL     = './src/data/bibliography.json';
  var CHETNITSI_URL  = './src/data/botev-chetnitsi-content.json';

  var modalContent  = null;
  var biblio        = null;
  var chetnitsiData = null;
  var currentTab    = 'route';
  var dataLoaded    = false;

  /* Public API — available immediately so navbar.js can call it */
  window.InfoModal = {
    open: function () {
      var modal = document.getElementById('info-modal');
      if (!modal) { return; }
      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add('is-open'); });
      document.body.classList.add('modal-open');
      if (dataLoaded) { renderCurrentTab(); }
    },
    close: function () {
      var modal = document.getElementById('info-modal');
      if (!modal) { return; }
      modal.classList.remove('is-open');
      document.body.classList.remove('modal-open');
      modal.addEventListener('transitionend', function hide() {
        modal.hidden = true;
        modal.removeEventListener('transitionend', hide);
      });
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    bindModalClose();
    /* Pre-load data in the background */
    loadAllData();
  });

  /* ── Close handling ──────────────────────────────────────── */
  function bindModalClose() {
    var closeBtn  = document.getElementById('info-modal-close');
    var modal     = document.getElementById('info-modal');
    var backdrop  = modal && modal.querySelector('.info-modal-backdrop');

    if (closeBtn) { closeBtn.addEventListener('click', function () { window.InfoModal.close(); }); }
    if (backdrop) { backdrop.addEventListener('click', function () { window.InfoModal.close(); }); }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.hidden) {
        window.InfoModal.close();
      }
    });

    if (modal) {
      modal.addEventListener('click', function (e) {
        var tab = e.target.closest('.info-modal-tab');
        if (!tab) { return; }
        var tabId = tab.dataset.tab;
        if (!tabId) { return; }
        setActiveTab(tabId);
      });
    }
  }

  /* ── Data loading ────────────────────────────────────────── */
  function loadAllData() {
    var p1 = fetch(DATA_URL).then(function (r) { return r.json(); });
    var p2 = fetch(BIBLIO_URL).then(function (r) { return r.json(); });
    var p3 = fetch(CHETNITSI_URL).then(function (r) { return r.json(); });

    Promise.all([p1, p2, p3]).then(function (results) {
      modalContent  = results[0];
      biblio        = results[1];
      chetnitsiData = results[2];
      dataLoaded    = true;
      /* Render if modal is already open (user clicked fast) */
      var modal = document.getElementById('info-modal');
      if (modal && modal.classList.contains('is-open')) { renderCurrentTab(); }
    }).catch(function (err) {
      console.warn('info-modal: failed to load data', err);
    });
  }

  /* ── Tab management ─────────────────────────────────────── */
  function setActiveTab(tabId) {
    currentTab = tabId;
    var tabs = document.querySelectorAll('.info-modal-tab');
    tabs.forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.tab === tabId);
    });
    renderCurrentTab();
    var body = document.getElementById('info-modal-body');
    if (body) { body.scrollTop = 0; }
  }

  function renderCurrentTab() {
    var body = document.getElementById('info-modal-body');
    if (!body) { return; }
    if (!dataLoaded) {
      body.innerHTML = '<div class="info-modal-loading">Зареждане…</div>';
      return;
    }
    switch (currentTab) {
      case 'route':        body.innerHTML = renderRouteTab();        break;
      case 'april':        body.innerHTML = renderAprilTab();        break;
      case 'chetnitsi':    renderChetnitsiTab(body);                 break;
      case 'bibliography': body.innerHTML = renderBibliographyTab(); break;
      case 'about':        body.innerHTML = renderAboutTab();        break;
      default:             body.innerHTML = '';
    }
    if (currentTab === 'chetnitsi') { bindChartInteraction(); }
  }

  /* ── Route tab ──────────────────────────────────────────── */
  function renderRouteTab() {
    var s = modalContent.sections.find(function (x) { return x.id === 'route'; });
    if (!s) { return ''; }
    return '<div class="info-section">' +
      '<div class="info-section-kicker"><span class="info-kicker-dot info-kicker-dot--botev"></span>Ботевата чета · 1876</div>' +
      '<h3 class="info-section-title">' + esc(s.title) + '</h3>' +
      '<p class="info-section-body">' + esc(s.body) + '</p>' +
      '<div class="info-map-preview">' +
        '<div class="info-map-preview-inner">' +
          '<div class="info-map-preview-label">Интерактивна карта на похода</div>' +
          '<div class="info-map-route-visual" aria-hidden="true">' +
            '<svg viewBox="0 0 340 120" xmlns="http://www.w3.org/2000/svg">' +
              '<path d="M30 90 C 60 80, 80 60, 120 50 S 180 40, 220 55 S 280 75, 310 60" stroke="rgba(157,200,175,0.7)" stroke-width="2.5" fill="none" stroke-dasharray="6 3"/>' +
              '<circle cx="30" cy="90" r="5" fill="#9dc8af"/>' +
              '<circle cx="120" cy="50" r="4" fill="#9dc8af" opacity="0.8"/>' +
              '<circle cx="220" cy="55" r="4" fill="#9dc8af" opacity="0.8"/>' +
              '<circle cx="310" cy="60" r="5" fill="#9dc8af"/>' +
              '<text x="20" y="108" fill="rgba(157,200,175,0.6)" font-size="9" font-family="Manrope, sans-serif">Козлодуй</text>' +
              '<text x="288" y="52" fill="rgba(157,200,175,0.6)" font-size="9" font-family="Manrope, sans-serif">Врачански Балкан</text>' +
            '</svg>' +
          '</div>' +
          '<div class="info-map-preview-cta">' +
            '<p>Използвайте панела с времева линия в долната част на картата, за да проследите маршрута стъпка по стъпка.</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ── April tab ──────────────────────────────────────────── */
  function renderAprilTab() {
    var s = modalContent.sections.find(function (x) { return x.id === 'april'; });
    if (!s) { return ''; }
    var layers = [
      { icon: '■', color: 'var(--c-crimson)',   label: 'Окръзи — границите на революционните окръзи' },
      { icon: '●', color: 'var(--c-okrazhen)',  label: 'Окръжни центрове — главните административни точки' },
      { icon: '●', color: 'var(--c-red)',       label: 'Селища — местности, свързани с въстанието' },
      { icon: '●', color: 'var(--c-navy)',      label: 'Чети — въстаническите чети и техните маршрути' },
      { icon: '●', color: 'var(--c-apostolic)', label: 'Апостолско събрание — места на тайни срещи' }
    ];
    var layerHtml = layers.map(function (l) {
      return '<li class="info-layer-item"><span class="info-layer-dot" style="background:' + l.color + '"></span><span>' + esc(l.label) + '</span></li>';
    }).join('');
    return '<div class="info-section">' +
      '<div class="info-section-kicker"><span class="info-kicker-dot info-kicker-dot--april"></span>Походът на Ботевата чета · 1876</div>' +
      '<h3 class="info-section-title">' + esc(s.title) + '</h3>' +
      '<p class="info-section-body">' + esc(s.body) + '</p>' +
      '<ul class="info-layer-list">' + layerHtml + '</ul>' +
    '</div>';
  }

  /* ── Chetnitsi tab (with chart) ─────────────────────────── */
  function renderChetnitsiTab(body) {
    var s = modalContent.sections.find(function (x) { return x.id === 'chetnitsi'; });
    if (!s) { body.innerHTML = ''; return; }

    /* Build chart data */
    var places = Object.keys(chetnitsiData).map(function (id) {
      return { id: id, title: chetnitsiData[id].title, count: chetnitsiData[id].count || 0 };
    }).filter(function (p) { return p.count > 0; })
      .sort(function (a, b) { return b.count - a.count; });

    var top = places.slice(0, 30);
    var maxCount = top[0] ? top[0].count : 1;

    var barsHtml = top.map(function (p) {
      var pct = Math.round((p.count / maxCount) * 100);
      return '<li class="chart-bar-row" data-place-id="' + esc(p.id) + '" data-place-title="' + esc(p.title) + '" title="' + esc(p.title) + ': ' + p.count + ' четници">' +
        '<span class="chart-bar-label">' + esc(p.title) + '</span>' +
        '<div class="chart-bar-track">' +
          '<div class="chart-bar-fill" style="--bar-pct:' + pct + '%" data-count="' + p.count + '">' +
            '<span class="chart-bar-value">' + p.count + '</span>' +
          '</div>' +
        '</div>' +
      '</li>';
    }).join('');

    body.innerHTML = '<div class="info-section">' +
      '<div class="info-section-kicker"><span class="info-kicker-dot info-kicker-dot--chetnitsi"></span>Ботеви четници · 1876</div>' +
      '<h3 class="info-section-title">' + esc(s.title) + '</h3>' +
      '<p class="info-section-body">' + esc(s.body) + '</p>' +
      '<div class="info-chart">' +
        '<div class="info-chart-header">' +
          '<h4 class="info-chart-title">Брой четници по населено място</h4>' +
          '<p class="info-chart-subtitle">Топ 30 · Кликнете за навигация към картата</p>' +
        '</div>' +
        '<ul class="chart-bar-list">' + barsHtml + '</ul>' +
      '</div>' +
    '</div>';
  }

  function bindChartInteraction() {
    var rows = document.querySelectorAll('.chart-bar-row');
    rows.forEach(function (row) {
      var fill = row.querySelector('.chart-bar-fill');

      /* Animate bars in with staggered delay */
      var idx = Array.prototype.indexOf.call(row.parentNode.children, row);
      setTimeout(function () {
        if (fill) { fill.classList.add('is-visible'); }
      }, 40 + idx * 28);

      row.addEventListener('click', function () {
        var placeId = row.dataset.placeId;
        if (!placeId) { return; }
        window.InfoModal.close();
        /* Small delay to let modal close animation finish */
        setTimeout(function () { navigateToPlace(placeId); }, 280);
      });
    });
  }

  function navigateToPlace(placeId) {
    /* Reuse the existing selectSearchResult path by constructing an item */
    if (!window._chetnitsiContent) { return; }
    var entry = window._chetnitsiContent[placeId];
    if (!entry) { return; }

    /* Find feature */
    var allChetnitsi = window._allFeaturesChetnitsi;
    if (!allChetnitsi) { return; }
    var feature = null;
    for (var i = 0; i < allChetnitsi.length; i++) {
      if (allChetnitsi[i].properties.popup_id === placeId) {
        feature = allChetnitsi[i];
        break;
      }
    }
    if (!feature) { return; }

    /* Enable layer if needed */
    if (window._ensureChetnitsiLayer) { window._ensureChetnitsiLayer(); }

    var ll = window.L && L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
    if (ll && window.map) { window.map.flyTo(ll, 10, { duration: 1.2, easeLinearity: 0.35 }); }
    if (window._openChetnitsiFeature) { window._openChetnitsiFeature(feature); }
  }

  /* ── Bibliography tab ───────────────────────────────────── */
  function renderBibliographyTab() {
    var b = biblio;
    var html = '<div class="info-section info-section--biblio">';
    html += '<h3 class="info-section-title">Използвана литература и източници</h3>';

    if (b.books && b.books.length) {
      html += '<div class="biblio-group"><h4 class="biblio-group-title">Книги</h4><ul class="biblio-list">';
      b.books.forEach(function (item) {
        html += '<li class="biblio-item">';
        html += '<span class="biblio-authors">' + esc(item.authors) + '</span>';
        html += '<span class="biblio-title">' + esc(item.title) + '</span>';
        if (item.year) { html += '<span class="biblio-meta">' + esc(item.year); }
        if (item.publisher) { html += (item.year ? ', ' : '') + esc(item.publisher); }
        if (item.year || item.publisher) { html += '</span>'; }
        html += '</li>';
      });
      html += '</ul></div>';
    }

    if (b.archival && b.archival.length) {
      html += '<div class="biblio-group"><h4 class="biblio-group-title">Архивни източници</h4><ul class="biblio-list">';
      b.archival.forEach(function (item) {
        html += '<li class="biblio-item">';
        html += '<span class="biblio-authors">' + esc(item.institution) + '</span>';
        html += '<span class="biblio-title">' + esc(item.description) + '</span>';
        html += '</li>';
      });
      html += '</ul></div>';
    }

    if (b.scientific && b.scientific.length) {
      html += '<div class="biblio-group"><h4 class="biblio-group-title">Научни публикации</h4><ul class="biblio-list">';
      b.scientific.forEach(function (item) {
        html += '<li class="biblio-item">';
        html += '<span class="biblio-authors">' + esc(item.authors) + '</span>';
        html += '<span class="biblio-title">' + esc(item.title) + '</span>';
        if (item.publication || item.year) {
          html += '<span class="biblio-meta">';
          if (item.publication) { html += esc(item.publication); }
          if (item.year) { html += (item.publication ? ', ' : '') + esc(item.year); }
          html += '</span>';
        }
        html += '</li>';
      });
      html += '</ul></div>';
    }

    if (b.museums && b.museums.length) {
      html += '<div class="biblio-group"><h4 class="biblio-group-title">Музеи и дигитални архиви</h4><ul class="biblio-list">';
      b.museums.forEach(function (item) {
        html += '<li class="biblio-item">';
        if (item.url) {
          html += '<a class="biblio-link" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' + esc(item.name) + '</a>';
        } else {
          html += '<span class="biblio-authors">' + esc(item.name) + '</span>';
        }
        html += '</li>';
      });
      html += '</ul></div>';
    }

    html += '</div>';
    return html;
  }

  /* ── About tab ──────────────────────────────────────────── */
  function renderAboutTab() {
    var a = modalContent.about;
    var fb = a.social && a.social.facebook ? a.social.facebook : '';
    var li = a.social && a.social.linkedin  ? a.social.linkedin  : '';
    return '<div class="info-section info-section--about">' +
      '<h3 class="info-section-title">За проекта</h3>' +
      '<div class="about-card">' +
        '<div class="about-avatar" aria-hidden="true">' +
          '<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="28" cy="28" r="28" fill="rgba(81,104,95,0.4)"/>' +
            '<circle cx="28" cy="22" r="9" fill="rgba(157,200,175,0.6)"/>' +
            '<path d="M8 52c0-11 9-19 20-19s20 8 20 19" fill="rgba(157,200,175,0.35)"/>' +
          '</svg>' +
        '</div>' +
        '<div class="about-text">' +
          '<div class="about-name">' + esc(a.name) + '</div>' +
          '<p class="about-bio">' + esc(a.bio) + '</p>' +
          '<p class="about-conference">' + esc(a.conference) + '</p>' +
          '<div class="about-social">' +
            (fb ? '<a class="about-social-btn about-social-btn--fb" href="' + esc(fb) + '" target="_blank" rel="noopener noreferrer">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>' +
              'Facebook' +
            '</a>' : '') +
            (li ? '<a class="about-social-btn about-social-btn--li" href="' + esc(li) + '" target="_blank" rel="noopener noreferrer">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>' +
              'LinkedIn' +
            '</a>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Expose references so chart click navigation can reach app internals.
     app.js sets these after loading its data. */
  window._chetnitsiContent      = null;
  window._allFeaturesChetnitsi  = null;
  window._ensureChetnitsiLayer  = null;
  window._openChetnitsiFeature  = null;

})();
