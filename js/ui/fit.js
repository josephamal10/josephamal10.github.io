window.Notebook = window.Notebook || {};

/* ==========================================================================
   ui/fit.js — every page fills its paper and none of them scrolls.

   Two pages side by side (laptops and desktops): each page's writing is scaled
   (CSS zoom, between ZMIN and ZMAX) to the largest size that fits the page with
   a little room left at its foot (FOOT_ROOM). How full each page is comes from
   its content: a page should be three-quarters full or more (see report()).

   One page at a time (phones and narrow windows): a page is set in columns
   exactly one screen wide and tall, and "Next page", swipes and the arrow keys
   move through its screens before turning to the next page. Turning back lands
   on the previous page's last screen. A small "2 / 3" at the foot says where
   you are.

   The question page ("Ask this notebook", .ask) is the one page left to scroll.

   Notebook.fit.init()         wire up (after Notebook.book.init)
   Notebook.fit.refresh()      re-fit on the next frame (content changed)
   Notebook.fit.step(delta)    used by notebook.js before it turns a page:
                               true when it moved to another screen instead
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;
  var ZMIN = 0.74;      // never smaller than this; a page that still overflows keeps its scroll
  var ZMAX = 1.1;       // never larger than this
  var FOOT_ROOM = 0.06; // of the page's height, always left free at the foot (at least 24 px)
  var state = new WeakMap();   // body → { key, mode: 'zoom' | 'paged', z, n, k }
  var raf = 0, warmT = 0, lastIndex = -1, wantLast = false;

  function spread() { return !!(N.book.isSpread && N.book.isSpread()); }
  function scrolls(body) { return !!body.querySelector('.ask'); }
  function laidOut(leaf) {
    return !leaf.hidden || leaf.classList.contains('leaf--warm') || leaf.classList.contains('leaf--prime');
  }
  function pages() { return N.book.pages(); }
  function indexOf(slug) {
    var l = pages();
    for (var i = 0; i < l.length; i++) if (l[i].slug === slug) return i;
    return -1;
  }
  function frontBody(leaf) { return leaf && leaf.querySelector('.leaf__front > .leaf__body'); }
  function backBody(leaf) { return leaf && leaf.querySelector('.leaf__back > .leaf__body'); }

  // The blocks a page is made of (the inline copy of the left page counts only when shown).
  function blocks(body) {
    var host = body.querySelector(':scope > .fit-pages') || body;
    return [].filter.call(host.children, function (c) {
      if (c.classList.contains('fit-gap')) return false;
      return !(c.classList.contains('leaf__facing-inline') && getComputedStyle(c).display === 'none');
    });
  }

  function fits(body) { return body.scrollHeight <= body.clientHeight + 1; }
  function room(body) { return Math.max(24, body.clientHeight * FOOT_ROOM); }
  // Fits with the foot room to spare.
  function fitsRoomy(body) { return contentHeight(body) <= body.clientHeight - room(body); }
  function setZoom(els, z) { els.forEach(function (e) { e.style.zoom = z === 1 ? '' : String(z); }); }

  // Height the writing needs, measured by letting the page collapse around it.
  function contentHeight(body) {
    var old = body.style.maxHeight;
    body.style.maxHeight = '0px';
    var hgt = body.scrollHeight;
    body.style.maxHeight = old;
    return hgt;
  }

  function clearGaps(body) {
    [].forEach.call(body.querySelectorAll('.fit-gap'), function (g) { g.parentNode.removeChild(g); });
  }

  /* ---- two pages: scale to fit ---- */

  function zoomFit(body, force) {
    var key = 'z' + body.clientWidth + 'x' + body.clientHeight;
    var st = state.get(body);
    if (!force && st && st.key === key) return;
    unpage(body);
    clearGaps(body);
    var els = blocks(body);
    if (!els.length || !body.clientHeight) return;
    setZoom(els, ZMAX);
    var best = ZMAX;
    if (!fitsRoomy(body)) {
      var lo = ZMIN, hi = ZMAX;
      best = ZMIN;
      for (var i = 0; i < 7; i++) {
        var mid = (lo + hi) / 2;
        setZoom(els, mid);
        if (fitsRoomy(body)) { best = mid; lo = mid; } else hi = mid;
      }
    }
    best = Math.floor(best * 1000) / 1000;
    setZoom(els, best);
    var ok = fits(body);
    body.classList.toggle('is-fit', ok);
    if (ok && body.parentNode) body.parentNode.removeAttribute('data-more');   // nothing below any more
    body.scrollTop = 0;
    state.set(body, { key: key, mode: 'zoom', z: best, fill: contentHeight(body) / body.clientHeight });
  }

  function unzoom(body) {
    clearGaps(body);
    setZoom(blocks(body), 1);
    body.classList.remove('is-fit');
  }

  /* ---- one page: screens ---- */

  function wrap(body) {
    var w = body.querySelector(':scope > .fit-pages');
    if (w) return w;
    w = h('div', { class: 'fit-pages' });
    while (body.firstChild) w.appendChild(body.firstChild);
    body.appendChild(w);
    return w;
  }

  function unpage(body) {
    var w = body.querySelector(':scope > .fit-pages');
    if (!w) return;
    while (w.firstChild) body.insertBefore(w.firstChild, w);
    body.removeChild(w);
    body.classList.remove('is-paged');
    var face = body.parentNode;
    var tag = face && face.querySelector('.leaf__screens');
    if (tag) tag.hidden = true;
  }

  function show(body, st, instant) {
    var w = body.querySelector(':scope > .fit-pages');
    if (!w) return;
    if (instant) w.style.transition = 'none';
    w.style.transform = st.k ? 'translateX(' + (-st.k * st.stride) + 'px)' : '';
    if (instant) { void w.offsetWidth; w.style.transition = ''; }
    var face = body.parentNode;
    var tag = face.querySelector('.leaf__screens');
    if (!tag) {
      tag = h('span', { class: 'leaf__screens', 'aria-hidden': 'true' });
      var foot = face.querySelector('.leaf__foot');
      var folio = foot && foot.querySelector('.folio');
      if (foot) foot.insertBefore(tag, folio || null);
    }
    tag.hidden = st.n < 2;
    tag.textContent = (st.k + 1) + ' / ' + st.n;
    // only the screen on show can take focus
    [].forEach.call(w.querySelectorAll('a[href], button, input, [tabindex]'), function (el) {
      if (el.hasAttribute('data-fit-tab')) { el.setAttribute('tabindex', el.getAttribute('data-fit-tab')); el.removeAttribute('data-fit-tab'); }
    });
    if (st.n > 1) {
      var left = st.k * st.stride, right = left + st.stride;
      [].forEach.call(w.querySelectorAll('a[href], button, input, [tabindex]'), function (el) {
        var x = el.offsetLeft;
        for (var p = el.offsetParent; p && p !== body && p !== w; p = p.offsetParent) x += p.offsetLeft;
        if (x < left - 2 || x >= right - 2) {
          el.setAttribute('data-fit-tab', el.getAttribute('tabindex') || '0');
          el.setAttribute('tabindex', '-1');
        }
      });
    }
  }

  function pageFit(body, force, atEnd) {
    var key = 'p' + body.clientWidth + 'x' + body.clientHeight;
    var st = state.get(body);
    if (!force && st && st.key === key && st.mode === 'paged') {
      if (atEnd) { st.k = st.n - 1; show(body, st, true); }
      return;
    }
    unzoom(body);
    var cs = getComputedStyle(body);
    var pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight);
    var pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom);
    var colW = body.clientWidth - pl - pr, colH = body.clientHeight - pt - pb;
    if (colW < 40 || colH < 40) return;
    var w = wrap(body);
    var gap = pl + pr;
    w.style.height = Math.max(40, colH - 18) + 'px';   // a little room at the foot of each screen
    w.style.columnWidth = colW + 'px';
    w.style.columnGap = gap + 'px';
    body.classList.add('is-paged');
    if (body.parentNode) body.parentNode.removeAttribute('data-more');
    body.scrollTop = 0;
    body.scrollLeft = 0;
    var stride = colW + gap;
    var n = Math.max(1, Math.round((w.scrollWidth + gap) / stride));
    var k = st && st.mode === 'paged' ? Math.min(st.k, n - 1) : 0;
    if (atEnd) k = n - 1;
    st = { key: key, mode: 'paged', n: n, k: k, stride: stride };
    state.set(body, st);
    show(body, st, true);
  }

  /* ---- which pages, when ---- */

  function run(force) {
    raf = 0;
    if (!N.book || !N.book.pages) return;
    var list = pages();
    var two = spread();
    var cur = indexOf(N.book.current());
    list.forEach(function (p, i) {
      var leaf = p.el;
      if (!leaf || !laidOut(leaf)) return;
      var f = frontBody(leaf), b = backBody(leaf);
      if (two) {
        [f, b].forEach(function (body) {
          if (!body) return;
          if (scrolls(body)) { unpage(body); unzoom(body); return; }
          zoomFit(body, force);
        });
      } else if (f) {
        if (scrolls(f)) { unpage(f); unzoom(f); return; }
        pageFit(f, force, i === cur && wantLast);
        if (b) { unpage(b); unzoom(b); }
      }
    });
    wantLast = false;
  }

  // On the next frame, or after a moment when frames are paused (a background tab).
  function schedule(force) {
    if (force === true) state = new WeakMap();
    if (raf) return;
    var done = false;
    function go() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(t);
      run(false);
    }
    raf = requestAnimationFrame(go);
    var t = setTimeout(go, 80);
  }
  function refresh() { state = new WeakMap(); schedule(); }

  // Turning back lands on the last screen of the page before.
  function onChange(d) {
    var i = indexOf(d && d.slug);
    if (lastIndex >= 0 && i >= 0 && i < lastIndex && !spread() && d.source !== 'router' && d.source !== 'jump' && d.source !== 'tab') wantLast = true;
    lastIndex = i;
    schedule();
    clearTimeout(warmT);
    warmT = setTimeout(schedule, 1400);   // the neighbours are laid out by then
  }

  function step(delta) {
    if (spread() || !N.book) return false;
    var i = indexOf(N.book.current());
    var p = pages()[i];
    var body = p && frontBody(p.el);
    var st = body && state.get(body);
    if (!st || st.mode !== 'paged' || st.n < 2) return false;
    var k = st.k + delta;
    if (k < 0 || k >= st.n) {
      if (delta < 0) wantLast = true;
      return false;
    }
    st.k = k;
    show(body, st, N.motion && N.motion.reduced && N.motion.reduced());
    return true;
  }

  N.fit = {
    init: function () {
      if (!N.book || !N.book.on) return;
      N.book.on('change', onChange);
      N.book.on('open', function () { refresh(); });
      window.addEventListener('resize', function () { clearTimeout(warmT); warmT = setTimeout(refresh, 120); });
      window.addEventListener('load', refresh);
      if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', refresh);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh, function () {});
      // pictures arriving change a page's height
      document.addEventListener('load', function (e) {
        var t = e.target;
        if (t && t.tagName === 'IMG' && t.closest && t.closest('.leaf__body')) { clearTimeout(warmT); warmT = setTimeout(refresh, 80); }
      }, true);
      lastIndex = indexOf(N.book.current());
      refresh();
    },
    refresh: refresh,
    refreshNow: function () { state = new WeakMap(); run(true); },
    // How full each page on show is (0–1) and at what size: for checking a layout.
    report: function (body) { var st = state.get(body); return st ? { z: st.z, fill: st.fill, n: st.n } : null; },
    step: step
  };
})(window.Notebook);
