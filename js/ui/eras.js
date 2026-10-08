window.Notebook = window.Notebook || {};

/* ==========================================================================
   ui/eras.js — the paper of each page.
   Every page, left and right, is an aged 9:16 sheet (assets/img/pages) with one
   faded drawing from the history of computing in a corner. The sheets follow
   one another by page number, in the order of that history, and repeat when
   there are more pages than sheets. Wherever a line of writing crosses a
   sheet's drawing, the drawing is rubbed back softly into the paper under it
   (.leaf__erase); where no writing reaches it, the drawing stays as it is.

   Notebook.eras.init()   after Notebook.book.init()
   Each sheet: src, how it is anchored when cropped (x, y: 0 = left/top,
   1 = right/bottom), the drawing's box as fractions of the sheet [x0, y0, x1, y1],
   and the paper's own tone for rubbing the drawing back.
   ========================================================================== */
(function (N) {
  'use strict';

  var DIR = 'assets/img/pages/';
  var SHEET_AR = 941 / 1672;
  var SHEETS = [
    { src: '01-abacus.webp', x: 0, y: 1, box: [0, .6, .64, 1], paper: '#ebcda5' },
    { src: '02-difference-engine.webp', x: 1, y: 0, box: [.36, 0, 1, .47], paper: '#ebcba2' },
    { src: '03-punched-cards.webp', x: 0, y: 0, box: [0, 0, .5, .24], paper: '#ebc89c' },
    { src: '04-vacuum-tubes.webp', x: 1, y: 0, box: [.66, 0, 1, .72], paper: '#ebc99f' },
    { src: '05-eniac.webp', x: 1, y: 1, box: [.3, .62, 1, 1], paper: '#eecda3' },
    { src: '06-transistor.webp', x: 0, y: 0, box: [0, 0, .48, .3], paper: '#ebc79a' },
    { src: '07-microchip.webp', x: 0, y: 1, box: [0, .57, .64, 1], paper: '#ecc99f' },
    { src: '08-personal-computer.webp', x: 1, y: 1, box: [.48, .57, 1, 1], paper: '#eec698' }
  ];
  var FEATHER = .14;   // the rubbed-out patch reaches a little past the drawing, with a soft edge

  var faces = [];      // { spread (index), side: 'right' | 'left', face, body, erase, sheet }
  var raf = 0;

  function sheetFor(number) { return SHEETS[(Math.max(1, number) - 1) % SHEETS.length]; }

  function dress(face, body, number, spread, side) {
    if (!face) return;
    var sheet = sheetFor(number);
    face.setAttribute('data-era', String((number - 1) % SHEETS.length + 1));
    face.style.backgroundImage = 'url("' + DIR + sheet.src + '")';
    face.style.backgroundPosition = (sheet.x * 100) + '% ' + (sheet.y * 100) + '%';
    var erase = N.h('div', { class: 'leaf__erase', 'aria-hidden': 'true', style: { '--era-paper': sheet.paper } });
    face.insertBefore(erase, face.firstChild);
    var rec = { spread: spread, side: side, face: face, body: body, erase: erase, sheet: sheet };
    faces.push(rec);
    if (body) {
      // the page scrolls when it is long: lines move over the drawing as it does
      body.addEventListener('scroll', schedule, { passive: true });
      // pictures arriving change where the lines fall
      body.addEventListener('load', schedule, true);
      // and so does anything that reflows the page after it is shown (late fonts, page scripts)
      if (window.ResizeObserver && body.firstElementChild) {
        new ResizeObserver(schedule).observe(body.firstElementChild);
      }
    }
  }

  // The drawing's box on the page, where the sheet is laid out like background-size: cover.
  function place(rec) {
    var fw = rec.face.clientWidth, fh = rec.face.clientHeight;
    if (!fw || !fh) return false;
    var w, h;
    if (fw / fh > SHEET_AR) { w = fw; h = fw / SHEET_AR; } else { h = fh; w = fh * SHEET_AR; }
    var ox = (fw - w) * rec.sheet.x, oy = (fh - h) * rec.sheet.y;
    var b = rec.sheet.box;
    var x0 = ox + b[0] * w, y0 = oy + b[1] * h, x1 = ox + b[2] * w, y1 = oy + b[3] * h;
    var fx = (x1 - x0) * FEATHER, fy = (y1 - y0) * FEATHER;
    var s = rec.erase.style;
    s.left = (x0 - fx).toFixed(1) + 'px';
    s.top = (y0 - fy).toFixed(1) + 'px';
    s.width = (x1 - x0 + 2 * fx).toFixed(1) + 'px';
    s.height = (y1 - y0 + 2 * fy).toFixed(1) + 'px';
    return true;
  }

  // Does any line of writing on the page cross the drawing (not just brush its feathered edge)?
  function crossed(rec) {
    if (!rec.body) return false;
    var z = rec.erase.getBoundingClientRect();
    if (!z.width) return false;
    var px = z.width * FEATHER, py = z.height * FEATHER;
    var L = z.left + px, R = z.right - px, T = z.top + py, B = z.bottom - py;
    var range = document.createRange();
    var walk = document.createTreeWalker(rec.body, NodeFilter.SHOW_TEXT);
    for (var n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.nodeValue.trim()) continue;
      range.selectNodeContents(n);
      var rects = range.getClientRects();
      for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        if (r.width && r.right > L && r.left < R && r.bottom > T && r.top < B) return true;
      }
    }
    // pictures, fields and documents on the page count too
    var media = rec.body.querySelectorAll('img, figure, .cert-doc, input, textarea, .card');
    for (var k = 0; k < media.length; k++) {
      var m = media[k].getBoundingClientRect();
      if (m.width && m.right > L && m.left < R && m.bottom > T && m.top < B) return true;
    }
    return false;
  }

  function update(rec) {
    if (!place(rec)) return;
    rec.face.classList.toggle('is-erased', crossed(rec));
  }

  // The pages on screen: the open spread's right page and, as a spread, its left page.
  function visible() {
    var slug = N.book.current();
    var pages = N.book.pages();
    var idx = -1;
    for (var i = 0; i < pages.length; i++) if (pages[i].slug === slug) { idx = i; break; }
    var spread = N.book.isSpread && N.book.isSpread();
    return faces.filter(function (f) {
      return (f.side === 'right' && f.spread === idx) || (spread && f.side === 'left' && f.spread === idx);
    });
  }

  function run() { visible().forEach(update); }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; run(); });
  }

  N.eras = {
    init: function () {
      if (!N.book || typeof N.book.pages !== 'function' || faces.length) return;
      var pages = N.book.pages();
      pages.forEach(function (p, i) {
        if (!p.el) return;
        var front = p.el.querySelector('.leaf__front');
        dress(front, front && front.querySelector('.leaf__body'), p.pageNo.right, i, 'right');
        // this sheet's back is the next spread's left page
        var back = p.el.querySelector('.leaf__back');
        var next = pages[i + 1];
        var number = next && next.pageNo.left ? next.pageNo.left : p.pageNo.right + 1;
        dress(back, back && back.querySelector('.leaf__body'), number, i + 1, 'left');
      });
      N.book.on('change', schedule);
      N.book.on('open', schedule);
      window.addEventListener('resize', schedule);
      window.addEventListener('load', schedule);
      // web fonts change where the lines fall; they load after this runs
      if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', schedule);
      document.addEventListener('visibilitychange', schedule);
      schedule();
    },
    refresh: schedule,
    // for callers that have just changed a page and need the answer now (no frame wait)
    refreshNow: run
  };
})(window.Notebook);
