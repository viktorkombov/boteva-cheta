/* ============================================================
   navbar.js — Top navigation bar behaviour
   Wires nav buttons to map/panel/modal functionality.
   ============================================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initNavSearch();
    initNavPlay();
    initNavData();
  });

  /* ── Search button → shows/hides search drawer ──────────── */
  function initNavSearch() {
    var btn    = document.getElementById('nav-search-btn');
    var drawer = document.getElementById('nav-search-drawer');
    if (!btn || !drawer) { return; }

    btn.addEventListener('click', function () {
      if (drawer.classList.contains('is-open')) {
        closeSearchDrawer(drawer, btn);
      } else {
        openSearchDrawer(drawer, btn);
      }
    });
  }

  function openSearchDrawer(drawer, btn) {
    drawer.hidden = false;
    requestAnimationFrame(function () { drawer.classList.add('is-open'); });
    if (btn) { btn.classList.add('is-active'); }
    var input = document.getElementById('chetnitsi-search-input');
    if (input) { setTimeout(function () { input.focus(); }, 50); }
  }

  function closeSearchDrawer(drawer, btn) {
    drawer.classList.remove('is-open');
    if (btn) { btn.classList.remove('is-active'); }
    /* Clear state */
    var input = document.getElementById('chetnitsi-search-input');
    if (input) { input.value = ''; }
    var list = document.getElementById('chetnitsi-search-list');
    if (list) { list.hidden = true; }
    var clear = document.getElementById('chetnitsi-search-clear');
    if (clear) { clear.hidden = true; }
    setTimeout(function () {
      if (!drawer.classList.contains('is-open')) { drawer.hidden = true; }
    }, 220);
  }

  /* ── Поход button → shows timeline panel ────────────────── */
  function initNavPlay() {
    var btn = document.getElementById('nav-play-btn');
    if (!btn) { return; }

    function syncPohodBtn() {
      var panel = document.getElementById('timeline');
      var visible = panel && !panel.hidden;
      btn.disabled = !!visible;
      btn.classList.toggle('is-active', !!visible);
    }

    btn.addEventListener('click', function () {
      var panel = document.getElementById('timeline');
      if (panel && !panel.hidden) { return; } /* already visible */

      if (panel && panel.hidden) {
        var cb = document.getElementById('toggle-botev');
        if (cb && !cb.checked) {
          /* Enable botev layer — this will show the panel */
          cb.checked = true;
          cb.dispatchEvent(new Event('change'));
        } else {
          /* Layer already on but panel was collapsed — just expand */
          if (window._expandTimelinePanel) { window._expandTimelinePanel(); }
        }
      }
    });

    var panel = document.getElementById('timeline');
    if (panel) {
      new MutationObserver(syncPohodBtn).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    }
    syncPohodBtn();
  }

  /* ── Данни button → opens info modal ───────────────────── */
  function initNavData() {
    var btn = document.getElementById('nav-data-btn');
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      if (window.InfoModal) { window.InfoModal.open(); }
    });
  }

})();
