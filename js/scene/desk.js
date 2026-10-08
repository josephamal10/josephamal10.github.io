window.Notebook = window.Notebook || {};

/* ==========================================================================
   scene/desk.js — the desk and the closed book. Owned by SCENE.
   - the desk is a photograph (css/scene.css, .desk__photo); this script puts
     the closed book in its empty centre: it measures the photo as laid out
     (like background-size: cover) and the page, and writes the camera
     (--cam-x/-y/-s/-r) that places, sizes and tilts the book there
   - builds the book's shadow on the desk (#props)
   - dresses the front board: black antique leather, gold-tooled frame and
     corner flourishes, the cover title and name from Notebook.data
   - adds the quiet "click / tap to open" hint on the desk
   - a hair of pointer parallax on the book (fine pointers only)
   Notebook.scene.init() is called by main.js after Notebook.book.init().
   ========================================================================== */
(function (N) {
  'use strict';

  N.scene = N.scene || {};

  var h = N.h;
  var S = N.svg;

  /* ------------------------------------------------------------ the desk photograph */

  // Where the book rests on the photo, in photo fractions: the clear middle of the desk.
  var PHOTO_AR = 1672 / 941;
  var REST = { x: .5, y: .51 };
  var TILT = -9;          // degrees: the book leans toward the inkwell (upper left)
  var TILT_PORTRAIT = -5; // less on a narrow screen, where a tilted book runs out of width
  var HEIGHT = .76;       // the closed book is about three quarters of the photo's height
  var CLEAR_W = .5;       // ...and never wider than the clear middle of the desk (the props line the sides)

  function layoutCamera(els) {
    var desk = els.desk, book = els.book, camera = els.camera, app = els.app;
    var vw = desk.clientWidth, vh = desk.clientHeight;
    var pw = book.offsetWidth, ph = book.offsetHeight;
    if (!vw || !vh || !pw || !ph) return;

    // the photo as laid out by .desk__photo
    var dw, dh;
    if (vw / vh > PHOTO_AR) { dw = vw; dh = vw / PHOTO_AR; } else { dh = vh; dw = vh * PHOTO_AR; }
    var ox = (vw - dw) / 2, oy = (vh - dh) / 2;

    var portrait = vh > vw;
    var deg = portrait ? TILT_PORTRAIT : TILT;
    var th = deg * Math.PI / 180;
    var c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
    // the book's footprint once tilted (boards included), which must stay on screen
    var fw = (pw * 1.04) * c + ph * s;
    var fh = (pw * 1.04) * s + ph * c;
    var scale = Math.min(HEIGHT * dh / fh, CLEAR_W * dw / fw, (portrait ? .8 : .86) * vh / fh, (portrait ? .88 : .9) * vw / fw);

    var tx = ox + REST.x * dw;
    var ty = oy + REST.y * dh;
    if (portrait) ty = Math.min(ty, vh * .45);   // room for the hint underneath

    // The camera scales and turns about the middle of the screen; the book's own centre
    // sits half the tab strip lower (the strip is reserved above the book).
    var half = (parseFloat(getComputedStyle(camera).paddingTop) || 0) / 2;
    var camX = tx - vw / 2 + scale * half * Math.sin(th);
    var camY = ty - vh / 2 - scale * half * Math.cos(th);

    app.style.setProperty('--cam-x', camX.toFixed(1) + 'px');
    app.style.setProperty('--cam-y', camY.toFixed(1) + 'px');
    app.style.setProperty('--cam-s', scale.toFixed(4));
    app.style.setProperty('--cam-r', deg + 'deg');
  }

  function buildPhoto(desk) {
    if (N.qs('.desk__photo', desk)) return;
    var photo = h('div', { class: 'desk__photo', id: 'desk-photo', 'aria-hidden': 'true' },
      h('div', { class: 'desk__glow' }));
    desk.insertBefore(photo, desk.firstChild);
  }

  /* ------------------------------------------------------------ the book's shadow */

  function buildProps(props) {
    while (props.firstChild) props.removeChild(props.firstChild);
    props.appendChild(h('div', { class: 'prop prop--book-shadow' },
      h('div', { class: 'book-shadow book-shadow--rest' }),
      h('div', { class: 'book-shadow book-shadow--lift' })));
  }

  /* ------------------------------------------------------------ the front board */

  var uid = 0;
  function goldGradient(id, size) {
    return S('linearGradient', { id: id, gradientUnits: 'userSpaceOnUse', x1: '0', y1: '0', x2: String(size), y2: String(size * 1.3), spreadMethod: 'reflect' },
      S('stop', { offset: '0', 'stop-color': '#5e3d12' }),
      S('stop', { offset: '.38', 'stop-color': '#b98a3c' }),
      S('stop', { offset: '.55', 'stop-color': '#e5bf72' }),
      S('stop', { offset: '.72', 'stop-color': '#9a6d2a' }),
      S('stop', { offset: '1', 'stop-color': '#4f3310' }));
  }

  // A tooled filigree for one corner of the frame (drawn for the top-left; CSS mirrors it).
  function corner(where) {
    var id = 'cv-g' + (++uid);
    var g = 'url(#' + id + ')';
    return S('svg', { class: 'cv-corner cv-corner--' + where, viewBox: '0 0 70 70', 'aria-hidden': 'true', focusable: 'false' },
      S('defs', null, goldGradient(id, 70)),
      S('g', { fill: 'none', stroke: g, 'stroke-linecap': 'round' },
        S('path', { 'stroke-width': '1.5', d: 'M6 6C18 5 30 7 38 14C44 19 42 27 35 27C30 27 29 21 33 19' }),
        S('path', { 'stroke-width': '1.5', d: 'M6 6C5 18 7 30 14 38C19 44 27 42 27 35C27 30 21 29 19 33' }),
        S('path', { 'stroke-width': '1.1', d: 'M38 14C46 10 54 10 62 13C66 14 66 19 62 19' }),
        S('path', { 'stroke-width': '1.1', d: 'M14 38C10 46 10 54 13 62C14 66 19 66 19 62' }),
        S('path', { 'stroke-width': '1', d: 'M22 16C26 20 27 25 25 29M16 22C20 26 25 27 29 25' })),
      S('path', { d: 'M9 9C17 12 21 16 24 24C16 21 12 17 9 9Z', fill: g }),
      S('circle', { cx: '46', cy: '21', r: '1.4', fill: g }),
      S('circle', { cx: '21', cy: '46', r: '1.4', fill: g }),
      S('circle', { cx: '31', cy: '31', r: '1.7', fill: g }));
  }

  // A small rule broken by a ring (under the title) or a lozenge (above the name).
  function ornament(kind) {
    var id = 'cv-g' + (++uid);
    var g = 'url(#' + id + ')';
    var ring = kind === 'ring';
    return S('svg', { class: 'cv-orn', viewBox: ring ? '0 0 86 8' : '0 0 60 12', 'aria-hidden': 'true', focusable: 'false' },
      S('defs', null, goldGradient(id, 40)),
      ring
        ? [S('path', { d: 'M0 4H32M54 4H86', stroke: g, 'stroke-width': '.9', fill: 'none' }),
           S('circle', { cx: '43', cy: '4', r: '2.3', stroke: g, 'stroke-width': '.9', fill: 'none' })]
        : [S('path', { d: 'M0 6H16M44 6H60', stroke: g, 'stroke-width': '1', fill: 'none' }),
           S('path', { d: 'M30 .8L35.2 6L30 11.2L24.8 6Z', stroke: g, 'stroke-width': '1', fill: 'none' })]);
  }

  // "Built one page at a time." → ["Built one page", "at a time"]: two lines, as even as the
  // words allow (a tie goes to the longer first line), without the closing full stop.
  function titleLines(text) {
    var words = String(text || '').replace(/[.\s]+$/, '').split(/\s+/).filter(Boolean);
    if (words.length < 3) return words.length ? [words.join(' ')] : [];
    var best = null;
    for (var k = 1; k < words.length; k++) {
      var a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      var cost = Math.max(a.length, b.length) * 100 + (a.length >= b.length ? 0 : 1);
      if (!best || cost < best.cost) best = { cost: cost, lines: [a, b] };
    }
    return best.lines;
  }

  function fillCover(cover) {
    var front = N.qs('.cover__front', cover);
    var back = N.qs('.cover__back', cover);
    var data = (N.data && N.data.profile && N.data.profile.cover) || {};
    if (front) {
      while (front.firstChild) front.removeChild(front.firstChild);
      var lines = titleLines(data.quote);
      var bands = [12, 30, 48, 66, 84].map(function (top) { return h('span', { class: 'cv-band', style: { top: top + '%' } }); });
      front.appendChild(h('span', { class: 'cv', 'aria-hidden': 'true' },
        ['mottle-l', 'mottle-m', 'pebble-d', 'pebble-l', 'wrinkle-d', 'wrinkle-l', 'scratch', 'wear'].map(function (k) {
          return h('span', { class: 'cv-tex cv-' + k });
        }),
        h('span', { class: 'cv-spine' }, bands),
        h('span', { class: 'cv-tool' },
          h('span', { class: 'cv-frame' }),
          h('span', { class: 'cv-frame-inner' }),
          corner('tl'), corner('tr'), corner('bl'), corner('br'),
          lines.length ? h('span', { class: 'cv-head' },
            h('span', { class: 'cv-title' }, lines.map(function (l) { return h('span', { class: 'cv-gilt' }, l); })),
            ornament('ring')) : null,
          data.name ? h('span', { class: 'cv-foot' },
            ornament('lozenge'),
            h('span', { class: 'cv-name cv-gilt' }, data.name)) : null),
        h('span', { class: 'cv-warm' }),
        h('span', { class: 'cv-glint' }),
        h('span', { class: 'cv-light' }),
        h('span', { class: 'cv-rim' })));
      front.appendChild(h('span', { class: 'cover__shade', 'aria-hidden': 'true' }));
    }
    if (back && !N.qs('.cover__shade', back)) back.appendChild(h('span', { class: 'cover__shade' }));
  }

  function buildHint(desk) {
    if (N.qs('.desk__hint', desk)) return;
    var hint = h('div', { class: 'desk__hint', 'aria-hidden': 'true' },
      h('span', { class: 'desk__hint-text' },
        h('span', { class: 'desk__hint-click' }, 'Click to open'),
        h('span', { class: 'desk__hint-tap' }, 'Tap to open')));
    var grain = N.qs('.desk__grain', desk);
    desk.insertBefore(hint, grain || null);
  }

  /* ------------------------------------------------------------ interaction */

  function state() {
    var app = document.getElementById('app');
    return app ? app.dataset.state : 'closed';
  }

  // Hovering (or keyboard-focusing) the cover lifts it; its shadow widens.
  function wireCoverLift(cover, props) {
    function on() { if (state() === 'closed') props.classList.add('is-lift'); }
    function off() { if (state() === 'closed') props.classList.remove('is-lift'); }
    cover.addEventListener('pointerenter', on);
    cover.addEventListener('pointerleave', off);
    cover.addEventListener('focus', function () { if (cover.matches(':focus-visible')) on(); });
    cover.addEventListener('blur', off);
    if (N.book && N.book.on) {
      N.book.on('open', function () { props.classList.remove('is-lift'); });
      N.book.on('close', function () { props.classList.remove('is-lift'); });
    }
  }

  // A click on the desk close to the book opens it too.
  function wireDeskClick(desk, book, cover) {
    desk.addEventListener('click', function (e) {
      if (state() !== 'closed' || cover.contains(e.target)) return;
      if (e.target.closest && e.target.closest('a, button, input, textarea, select')) return;
      var r = book.getBoundingClientRect();
      var m = Math.max(28, Math.min(72, r.width * .12));
      if (e.clientX >= r.left - m && e.clientX <= r.right + m && e.clientY >= r.top - m && e.clientY <= r.bottom + m) {
        N.book.requestOpen();
      }
    });
  }

  /* ------------------------------------------------------------ parallax */

  // The book drifts a hair against the pointer, as if the camera were hand-held.
  function wireParallax(book) {
    var FINE = window.matchMedia('(hover: hover) and (pointer: fine)');
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    function enabled() { return FINE.matches && !N.motion.reduced() && state() === 'closed'; }
    function apply(clear) { book.style.translate = clear ? '' : (-cx * 1.4).toFixed(2) + 'px ' + (-cy * 1.4).toFixed(2) + 'px'; }

    function tick() {
      raf = 0;
      if (!enabled()) { tx = 0; ty = 0; }
      cx += (tx - cx) * .075;
      cy += (ty - cy) * .075;
      var settled = Math.abs(tx - cx) < .002 && Math.abs(ty - cy) < .002;
      if (settled && tx === 0 && ty === 0) { cx = 0; cy = 0; apply(true); return; }
      apply(false);
      if (!settled) raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }
    function reset() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; tx = ty = cx = cy = 0;
      apply(true);
    }

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!enabled()) return;
      var w = window.innerWidth || 1, hgt = window.innerHeight || 1;
      tx = Math.max(-1, Math.min(1, (e.clientX / w) * 2 - 1));
      ty = Math.max(-1, Math.min(1, (e.clientY / hgt) * 2 - 1));
      kick();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { tx = 0; ty = 0; kick(); });

    // The opening settles everything back to rest; once open, nothing but
    // untransformed layout sits under the page.
    N.scene.parallaxRelease = function () { tx = 0; ty = 0; kick(); };
    if (N.book && N.book.on) N.book.on('open', reset);
    N.motion.onChange(function () { if (N.motion.reduced()) reset(); });
  }

  /* ------------------------------------------------------------ init */

  var inited = false;
  N.scene.init = function () {
    if (inited) return;
    var els = {
      app: document.getElementById('app'),
      desk: document.getElementById('desk'),
      camera: document.getElementById('camera'),
      props: document.getElementById('props'),
      book: document.getElementById('book'),
      cover: document.getElementById('cover')
    };
    if (!els.app || !els.desk || !els.camera || !els.props || !els.book || !els.cover) return;
    inited = true;

    buildPhoto(els.desk);
    buildProps(els.props);
    fillCover(els.cover);
    buildHint(els.desk);
    wireCoverLift(els.cover, els.props);
    wireDeskClick(els.desk, els.book, els.cover);
    wireParallax(els.book);

    layoutCamera(els);
    var raf = 0;
    window.addEventListener('resize', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; layoutCamera(els); });
    });

    if (typeof N.scene.setupOpening === 'function') N.scene.setupOpening();
  };
  N.scene.layout = function () {
    layoutCamera({
      app: document.getElementById('app'),
      desk: document.getElementById('desk'),
      camera: document.getElementById('camera'),
      book: document.getElementById('book')
    });
  };
})(window.Notebook);
