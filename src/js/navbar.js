/* ============================================================
   navbar.js — App pill navigation behaviour
   Wires pill expand/collapse and action buttons.
   ============================================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initPill();
    initPillPlay();
    initPillData();
    initPillSearch();
    initFab();
    initFabPlay();
    initFabData();
    initFabSearch();
  });

  /* ── Pill expand / collapse ──────────────────────────────── */
  function initPill() {
    var pill   = document.getElementById('app-pill');
    var toggle = document.getElementById('app-pill-toggle');
    var body   = document.getElementById('app-pill-body');
    if (!pill || !toggle || !body) { return; }

    toggle.addEventListener('click', function () {
      var open = pill.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      body.setAttribute('aria-hidden', String(!open));
    });

    /* Collapse pill when clicking outside */
    document.addEventListener('click', function (e) {
      if (!pill.classList.contains('is-open')) { return; }
      if (!pill.contains(e.target)) {
        pill.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        body.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function collapsePill() {
    var pill   = document.getElementById('app-pill');
    var toggle = document.getElementById('app-pill-toggle');
    var body   = document.getElementById('app-pill-body');
    if (!pill) { return; }
    pill.classList.remove('is-open');
    if (toggle) { toggle.setAttribute('aria-expanded', 'false'); }
    if (body)   { body.setAttribute('aria-hidden', 'true'); }
  }

  /* ── Поход button → shows timeline panel ────────────────── */
  function initPillPlay() {
    var btn = document.getElementById('pill-play-btn');
    if (!btn) { return; }

    function syncBtn() {
      var panel   = document.getElementById('timeline');
      var visible = panel && !panel.hidden;
      btn.classList.toggle('is-active', !!visible);
    }

    btn.addEventListener('click', function () {
      collapsePill();
      var panel = document.getElementById('timeline');
      if (panel && !panel.hidden) { return; }

      var cb = document.getElementById('toggle-botev');
      if (cb && !cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change'));
      } else {
        if (window._expandTimelinePanel) { window._expandTimelinePanel(); }
      }
    });

    var panel = document.getElementById('timeline');
    if (panel) {
      new MutationObserver(syncBtn).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    }
    syncBtn();
  }

  /* ── Данни button → opens info modal ───────────────────── */
  function initPillData() {
    var btn = document.getElementById('pill-data-btn');
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      collapsePill();
      if (window.InfoModal) { window.InfoModal.open(); }
    });
  }

  /* ── Търси button → shows/hides search panel ───────────── */
  function initPillSearch() {
    var btn   = document.getElementById('pill-search-btn');
    var panel = document.getElementById('search-panel');
    if (!btn || !panel) { return; }

    btn.addEventListener('click', function () {
      if (panel.classList.contains('is-open')) {
        closeSearchPanel(panel, btn);
      } else {
        collapsePill();
        openSearchPanel(panel, btn);
      }
    });
  }

  /* ── Mobile FAB ─────────────────────────────────────────── */
  function initFab() {
    var fab    = document.getElementById('app-fab');
    var toggle = document.getElementById('app-fab-toggle');
    var menu   = document.getElementById('app-fab-menu');
    if (!fab || !toggle || !menu) { return; }

    toggle.addEventListener('click', function () {
      var open = fab.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
    });

    document.addEventListener('click', function (e) {
      if (!fab.classList.contains('is-open')) { return; }
      if (!fab.contains(e.target)) { collapseFab(); }
    });
  }

  function collapseFab() {
    var fab    = document.getElementById('app-fab');
    var toggle = document.getElementById('app-fab-toggle');
    var menu   = document.getElementById('app-fab-menu');
    if (!fab) { return; }
    fab.classList.remove('is-open');
    if (toggle) { toggle.setAttribute('aria-expanded', 'false'); }
    if (menu)   { menu.setAttribute('aria-hidden', 'true'); }
  }

  function initFabPlay() {
    var btn = document.getElementById('fab-play-btn');
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      collapseFab();
      var panel = document.getElementById('timeline');
      if (panel && !panel.hidden) { return; }
      var cb = document.getElementById('toggle-botev');
      if (cb && !cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change'));
      } else {
        if (window._expandTimelinePanel) { window._expandTimelinePanel(); }
      }
    });
  }

  function initFabData() {
    var btn = document.getElementById('fab-data-btn');
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      collapseFab();
      if (window.InfoModal) { window.InfoModal.open(); }
    });
  }

  function initFabSearch() {
    var btn   = document.getElementById('fab-search-btn');
    var panel = document.getElementById('search-panel');
    if (!btn || !panel) { return; }
    btn.addEventListener('click', function () {
      if (panel.classList.contains('is-open')) {
        closeSearchPanel(panel, btn);
      } else {
        collapseFab();
        openSearchPanel(panel, btn);
      }
    });
  }

  function openSearchPanel(panel, btn) {
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
    if (btn) { btn.classList.add('is-active'); }
    var input = document.getElementById('chetnitsi-search-input');
    if (input) { setTimeout(function () { input.focus(); }, 50); }
  }

  function closeSearchPanel(panel, btn) {
    panel.classList.remove('is-open');
    if (btn) { btn.classList.remove('is-active'); }
    var input = document.getElementById('chetnitsi-search-input');
    if (input) { input.value = ''; }
    var list = document.getElementById('chetnitsi-search-list');
    if (list) { list.hidden = true; }
    var clear = document.getElementById('chetnitsi-search-clear');
    if (clear) { clear.hidden = true; }
    setTimeout(function () {
      if (!panel.classList.contains('is-open')) { panel.hidden = true; }
    }, 220);
  }

})();
