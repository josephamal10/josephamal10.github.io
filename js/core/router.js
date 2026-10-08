window.Notebook = window.Notebook || {};

/* ==========================================================================
   core/router.js — hash routing. Owned by FOUNDATION.
   Hash format: '#/<page-slug>'  e.g. '#/about', '#/projects/automatic-garage'.

   Notebook.router.current()            → slug or null
   Notebook.router.go(slug, {replace})  → updates the hash (does not navigate the book)
   Notebook.router.clear()              → removes the hash without a history entry
   Notebook.router.onChange(fn)         → fn(slug) on back/forward or a typed hash
   Changes made through go() never echo back through onChange.
   ========================================================================== */
(function (N) {
  'use strict';

  var listeners = [];
  var last = parse(location.hash);

  function parse(hash) {
    var h = String(hash || '').replace(/^#/, '');
    if (h.charAt(0) !== '/') return null;
    h = h.slice(1).replace(/\/+$/, '');
    try { h = decodeURIComponent(h); } catch (e) { /* keep raw */ }
    return h || null;
  }

  function hrefFor(slug) { return '#/' + String(slug).split('/').map(encodeURIComponent).join('/'); }

  function current() { return parse(location.hash); }

  function go(slug, opts) {
    if (!slug) return;
    opts = opts || {};
    var href = hrefFor(slug);
    if (location.hash === href) { last = slug; return; }
    last = slug;
    try {
      if (opts.replace) history.replaceState(history.state, '', href);
      else history.pushState(null, '', href);
    } catch (e) {
      // Some file:// contexts refuse history writes; fall back to the hash itself.
      if (opts.replace) location.replace(href); else location.hash = href;
    }
  }

  function clear() {
    last = null;
    if (!location.hash) return;
    try { history.replaceState(history.state, '', location.pathname + location.search); }
    catch (e) { location.replace('#'); }
  }

  function notify() {
    var slug = current();
    if (slug === last) return;
    last = slug;
    listeners.slice().forEach(function (fn) { try { fn(slug); } catch (e) { console.error(e); } });
  }

  window.addEventListener('hashchange', notify);
  window.addEventListener('popstate', notify);

  N.router = {
    current: current,
    go: go,
    clear: clear,
    href: hrefFor,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };
})(window.Notebook);
