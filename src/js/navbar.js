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
    initLegendBadge();
    initPillBadge();
    initSearchBackdrop();
    initTooltip();
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
      btn.disabled = !!visible;
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

    function syncBtn() {
      var panel   = document.getElementById('timeline');
      var visible = panel && !panel.hidden;
      btn.disabled = !!visible;
    }

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

    var panel = document.getElementById('timeline');
    if (panel) {
      new MutationObserver(syncBtn).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    }
    syncBtn();
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
    var backdrop = document.getElementById('search-backdrop');
    panel.hidden = false;
    if (backdrop) { backdrop.hidden = false; }
    requestAnimationFrame(function () {
      panel.classList.add('is-open');
      if (backdrop) { backdrop.classList.add('is-visible'); }
    });
    if (btn) { btn.classList.add('is-active'); }
    var input = document.getElementById('chetnitsi-search-input');
    if (input) { setTimeout(function () { input.focus(); }, 50); }
  }

  function closeSearchPanel(panel, btn) {
    var backdrop = document.getElementById('search-backdrop');
    panel.classList.remove('is-open');
    if (backdrop) { backdrop.classList.remove('is-visible'); }
    if (btn) { btn.classList.remove('is-active'); }
    var input = document.getElementById('chetnitsi-search-input');
    if (input) { input.value = ''; }
    var list = document.getElementById('chetnitsi-search-list');
    if (list) { list.hidden = true; }
    var clear = document.getElementById('chetnitsi-search-clear');
    if (clear) { clear.hidden = true; }
    setTimeout(function () {
      if (!panel.classList.contains('is-open')) {
        panel.hidden = true;
        if (backdrop) { backdrop.hidden = true; }
      }
    }, 220);
  }

  function initSearchBackdrop() {
    var backdrop = document.getElementById('search-backdrop');
    var panel    = document.getElementById('search-panel');
    if (!backdrop || !panel) { return; }

    backdrop.addEventListener('click', function () {
      if (!panel.classList.contains('is-open')) { return; }
      var btn = document.querySelector('#pill-search-btn.is-active, #fab-search-btn.is-active');
      closeSearchPanel(panel, btn);
    });

    /* Hide backdrop whenever the panel loses is-open (any code path) */
    new MutationObserver(function () {
      if (!panel.classList.contains('is-open')) {
        backdrop.classList.remove('is-visible');
        setTimeout(function () {
          if (!panel.classList.contains('is-open')) { backdrop.hidden = true; }
        }, 220);
      }
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  /* ── Badge helpers ──────────────────────────────────────── */
  function showBadge(badge) {
    if (!badge || !badge.hidden) { return; }
    badge.hidden = false;
    badge.classList.remove('badge-pop');
    void badge.offsetWidth;
    badge.classList.add('badge-pop');
  }

  function hideBadge(badge) {
    if (!badge) { return; }
    badge.hidden = true;
    badge.classList.remove('badge-pop');
  }


  /* ── Legend badge: hint when chetnitsi layer is off ─────── */
  function initLegendBadge() {
    var badge = document.getElementById('legend-badge');
    var cb    = document.getElementById('toggle-chetnitsi');
    var label = cb ? cb.closest('label') : null;
    if (!badge || !cb) { return; }

    function sync() {
      if (cb.checked) {
        hideBadge(badge);
        if (label) { label.classList.remove('is-hinted'); }
      } else {
        showBadge(badge);
        if (label) { label.classList.add('is-hinted'); }
      }
    }

    cb.addEventListener('change', sync);

    sync();
  }

  /* ── Pill + FAB badge: hint when timeline was collapsed ─── */
  function initPillBadge() {
    var pillBadge  = document.getElementById('pill-badge');
    var fabBadge   = document.getElementById('fab-badge');
    var pillPlayBtn = document.getElementById('pill-play-btn');
    var fabPlayBtn  = document.getElementById('fab-play-btn');

    function sync() {
      var collapsed = document.body.classList.contains('timeline-collapsed');
      if (collapsed) {
        showBadge(pillBadge);
        showBadge(fabBadge);
        if (pillPlayBtn) { pillPlayBtn.classList.add('is-hinted'); }
        if (fabPlayBtn)  { fabPlayBtn.classList.add('is-hinted'); }
      } else {
        hideBadge(pillBadge);
        hideBadge(fabBadge);
        if (pillPlayBtn) { pillPlayBtn.classList.remove('is-hinted'); }
        if (fabPlayBtn)  { fabPlayBtn.classList.remove('is-hinted'); }
      }
    }

    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  /* ── Tooltip: follows cursor for [data-tooltip] elements ── */
  function initTooltip() {
    var tip = document.createElement('div');
    tip.className = 'tooltip-popup';
    tip.hidden = true;
    document.body.appendChild(tip);

    var activeEl = null;

    document.addEventListener('mouseover', function (e) {
      var el = e.target.closest('[data-tooltip]');
      if (!el) { return; }
      activeEl = el;
      tip.textContent = el.dataset.tooltip;
      tip.hidden = false;
      requestAnimationFrame(function () { tip.classList.add('is-visible'); });
      place(e);
    });

    document.addEventListener('mousemove', function (e) {
      if (!activeEl) { return; }
      place(e);
    });

    document.addEventListener('mouseout', function (e) {
      if (!activeEl) { return; }
      if (!e.relatedTarget || !e.relatedTarget.closest('[data-tooltip]')) {
        activeEl = null;
        tip.classList.remove('is-visible');
        tip.hidden = true;
      }
    });

    function place(e) {
      var x = e.clientX + 14;
      var y = e.clientY - 32;
      if (x + tip.offsetWidth > window.innerWidth - 8) {
        x = e.clientX - tip.offsetWidth - 10;
      }
      if (y < 8) {
        y = e.clientY + 16;
      }
      tip.style.left = x + 'px';
      tip.style.top  = y + 'px';
    }
  }

})();
