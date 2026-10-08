window.Notebook = window.Notebook || {};

/* ==========================================================================
   main.js — boot order. Owned by FOUNDATION.
   1. Notebook.book.init()      assemble pages, tabs, keyboard, router
   2. Notebook.scene.init()     SCENE (desk props, cover content), if present
   3. Deep link?  open instantly at that page.  Otherwise show the closed desk.
   Cover clicks go through Notebook.book.requestOpen(), which hands over to
   Notebook.scene.open() when SCENE provides it, or opens instantly.
   ========================================================================== */
(function (N) {
  'use strict';

  function fillCoverFallback() {
    // SCENE's desk.js fills the cover; this keeps the closed book legible without it.
    var front = N.qs('#cover .cover__front');
    if (!front || front.children.length) return;
    var cover = (N.data && N.data.profile && N.data.profile.cover) || {};
    if (cover.quote) front.appendChild(N.h('span', { class: 'cover__quote' }, cover.quote));
    front.appendChild(N.h('span', { class: 'cover__rule', 'aria-hidden': 'true' }));
    if (cover.name) front.appendChild(N.h('span', { class: 'cover__name' }, cover.name));
  }

  // The document's name, its h1 and the cover's accessible name come from the data files.
  function applyIdentity() {
    var data = N.data || {};
    var site = data.site || {};
    var profile = data.profile || {};
    if (site.title) document.title = site.title;
    var h1 = document.getElementById('site-title') || N.qs('h1');
    if (h1 && (profile.name || site.title)) h1.textContent = (profile.name || site.title) + ' — portfolio notebook';
    var cover = document.getElementById('cover');
    var who = profile.shortName || profile.name;
    if (cover && who) cover.setAttribute('aria-label', 'Open ' + who + '’s notebook');
  }

  function boot() {
    if (!N.book || !N.router) { console.error('[notebook] core scripts failed to load'); return; }
    applyIdentity();
    N.book.init();
    if (N.eras && typeof N.eras.init === 'function') {
      try { N.eras.init(); } catch (e) { console.error('[notebook] eras.init failed', e); }
    }
    if (N.fit && typeof N.fit.init === 'function') {
      try { N.fit.init(); } catch (e) { console.error('[notebook] fit.init failed', e); }
    }
    if (N.closer && typeof N.closer.init === 'function') {
      try { N.closer.init(); } catch (e) { console.error('[notebook] closer.init failed', e); }
    }

    if (N.scene && typeof N.scene.init === 'function') {
      try { N.scene.init(); } catch (e) { console.error('[notebook] scene.init failed', e); }
    }
    fillCoverFallback();

    var cover = document.getElementById('cover');
    if (cover) cover.addEventListener('click', function (e) { e.preventDefault(); N.book.requestOpen(); });

    var skip = N.qs('.skip-link');
    if (skip) skip.addEventListener('click', function (e) {
      e.preventDefault();
      if (!N.book.isOpen()) N.book.setOpen(true, { instant: true });
      else N.book.goTo(N.book.current(), { animate: false });
    });

    var route = N.router.current();
    if (route) {
      var page = N.book.resolve(route);
      N.book.goTo(page ? page.slug : N.book.pages()[0].slug, { animate: false, source: 'init', focus: false });
      N.book.setOpen(true, { instant: true });
    }

    document.documentElement.classList.add('nb-ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.Notebook);
