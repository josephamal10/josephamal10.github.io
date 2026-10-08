window.Notebook = window.Notebook || {};

/* ==========================================================================
   scene/opening.js — opening and closing choreography. Owned by SCENE.

   Notebook.scene.open()  / Notebook.scene.close()
     Called by Notebook.book.requestOpen() / requestClose() (the cover button,
     Enter/Space on it, the inner-cover and running-head Close buttons).
     They animate, then hand over to Notebook.book.setOpen(), which owns state.

   Open (~1.5s):   0–150 anticipation (cover lifts, shadow widens)
                   100–1100 camera leans in from the closed transform to none;
                            the desk photo recedes (dims and softens)
                   250–1250 cover swings open on the spine (0 → -180deg), its
                            shadow sweeping across the first page
                   1250 setOpen(true) · tabs slide out from behind the fore-edge
   Close (~1.1s):  the same, reversed.
   Reduced motion: a 200ms fade through, no camera move, no 3D.
   Deep links never come through here (main.js opens them instantly).
   ========================================================================== */
(function (N) {
  'use strict';

  N.scene = N.scene || {};

  var SIDE_TABS = window.matchMedia('(min-width: 900px) and (orientation: landscape)');
  var ID = 'translate(0px, 0px) scale(1) rotate(0deg)';
  var SWING_OPEN = 'cubic-bezier(.38, .02, .3, 1)';
  var SWING_CLOSE = 'cubic-bezier(.4, 0, .32, 1)';
  var running = null; // { anims: [], timers: [] }

  // Shadow the cover casts on the page, keyed by the cover's progress
  // (offset = angle / 180). With the key light up and to the left, its edge
  // sits at W·(cos θ + 0.35·sin θ): it covers the page while the board is
  // low, then sweeps back to the spine as the board passes upright.
  var CAST = [
    { offset: 0.0, opacity: 0 },
    { offset: 0.0278, opacity: 0.8 },
    { offset: 0.0556, opacity: 0.8 },
    { offset: 0.1111, opacity: 0.76 },
    { offset: 0.1667, opacity: 0.72 },
    { offset: 0.2222, opacity: 0.67 },
    { offset: 0.2778, opacity: 0.62 },
    { offset: 0.3333, opacity: 0.56 },
    { offset: 0.3889, opacity: 0.48 },
    { offset: 0.4444, opacity: 0.4 },
    { offset: 0.5, opacity: 0.32 },
    { offset: 0.5556, opacity: 0.22 },
    { offset: 0.6111, opacity: 0.1 },
    { offset: 0.6944, opacity: 0 },
    { offset: 1.0, opacity: 0 }
  ];
  var CAST_BAND = [
    { offset: 0.0, transform: 'translateX(0.0%)' },
    { offset: 0.0278, transform: 'translateX(2.3%)' },
    { offset: 0.0556, transform: 'translateX(3.9%)' },
    { offset: 0.1111, transform: 'translateX(5.0%)' },
    { offset: 0.1667, transform: 'translateX(3.5%)' },
    { offset: 0.2222, transform: 'translateX(-0.8%)' },
    { offset: 0.2778, transform: 'translateX(-7.6%)' },
    { offset: 0.3333, transform: 'translateX(-16.7%)' },
    { offset: 0.3889, transform: 'translateX(-27.9%)' },
    { offset: 0.4444, transform: 'translateX(-40.8%)' },
    { offset: 0.5, transform: 'translateX(-55.1%)' },
    { offset: 0.5556, transform: 'translateX(-70.3%)' },
    { offset: 0.6111, transform: 'translateX(-85.9%)' },
    { offset: 0.6944, transform: 'translateX(-86.4%)' },
    { offset: 1.0, transform: 'translateX(-86.4%)' }
  ];
  // A board lifting on the spine first turns toward the key light, then away.
  var FRONT_SHADE = [
    { offset: 0, opacity: 0 },
    { offset: .22, opacity: 0 },
    { offset: .5, opacity: .5 },
    { offset: 1, opacity: .5 }
  ];
  // The inside of the board faces away from the light while it stands, then settles.
  var BACK_SHADE = [
    { offset: 0, opacity: .55 },
    { offset: .5, opacity: .55 },
    { offset: .75, opacity: .22 },
    { offset: 1, opacity: 0 }
  ];

  // The desk photo recedes while the notebook is read (matches .app[data-state="open"] .desk__photo).
  var PHOTO_REST_TO_OPEN = [
    { opacity: 1, filter: 'blur(0px) brightness(1)', transform: 'scale(1)' },
    { opacity: .5, filter: 'blur(1.5px) brightness(.85)', transform: 'scale(1.04)' }
  ];

  function reversed(frames) {
    return frames.slice().reverse().map(function (f) {
      var o = {};
      Object.keys(f).forEach(function (k) { o[k] = f[k]; });
      o.offset = +(1 - f.offset).toFixed(4);
      return o;
    });
  }

  function els() {
    var book = document.getElementById('book');
    return {
      app: document.getElementById('app'),
      camera: document.getElementById('camera'),
      props: document.getElementById('props'),
      photo: document.getElementById('desk-photo'),
      book: book,
      cover: document.getElementById('cover'),
      frontShade: N.qs('#cover .cover__front > .cover__shade'),
      backShade: N.qs('#cover .cover__back > .cover__shade'),
      innerContent: N.qs('.book__inner-cover .inner-cover__content'),
      tabs: N.qsa('.book__tabs .book__tab'),
      shadow: N.qs('#props .prop--book-shadow'),
      cast: ensureCast(book),
      castBand: N.qs('.cover-cast__band', book)
    };
  }

  function ensureCast(book) {
    if (!book) return null;
    var c = N.qs('.cover-cast', book);
    if (!c) {
      c = N.h('div', { class: 'cover-cast', 'aria-hidden': 'true' }, N.h('div', { class: 'cover-cast__band' }));
      book.insertBefore(c, document.getElementById('cover'));
    }
    return c;
  }

  function cssVar(el, name, fallback) {
    var v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  }

  function closedTransform(app) {
    return 'translate(' + cssVar(app, '--cam-x', '0px') + ', ' + cssVar(app, '--cam-y', '0px') + ') ' +
      'scale(' + cssVar(app, '--cam-s', '.74') + ') rotate(' + cssVar(app, '--cam-r', '-6deg') + ')';
  }

  function canAnimate() {
    return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  }

  function begin() {
    running = { anims: [], timers: [] };
    return running;
  }

  function anim(run, el, frames, opts) {
    if (!el) return null;
    var a = el.animate(frames, opts);
    run.anims.push(a);
    return a;
  }

  function later(run, fn, ms) {
    run.timers.push(setTimeout(fn, ms));
  }

  function end(run) {
    if (!run) return;
    run.anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* ignore */ } });
    run.timers.forEach(clearTimeout);
    run.anims = [];
    run.timers = [];
    if (running === run) running = null;
  }

  function tabTucked() {
    return SIDE_TABS.matches ? 'translateX(-100%)' : 'translateY(100%)';
  }

  /* ------------------------------------------------------------ reduced motion */

  function fadeThrough(open) {
    var e = els();
    var run = begin();
    var out = anim(run, e.camera, [{ opacity: 1 }, { opacity: 0 }], { duration: 100, easing: 'ease-out', fill: 'forwards' });
    later(run, function () {
      N.book.setOpen(open);
      if (out) out.cancel();
      anim(run, e.camera, [{ opacity: 0 }, { opacity: 1 }], { duration: 100, easing: 'ease-in' });
      later(run, function () { end(run); }, 110);
    }, 100);
  }

  /* ------------------------------------------------------------ open */

  function open() {
    if (running) return;
    if (!canAnimate()) { N.book.setOpen(true); return; }
    if (N.motion.reduced()) { fadeThrough(true); return; }

    var e = els();
    var run = begin();
    var from = closedTransform(e.app);
    var lifted = e.cover.matches(':hover') || e.cover.matches(':focus-visible');
    var rest = lifted ? 'translate3d(-1px, -2px, 0px) rotateY(0deg) scale(1.006)' : 'translate3d(0px, 0px, 0px) rotateY(0deg) scale(1)';
    var camEase = cssVar(document.documentElement, '--ease-camera', 'cubic-bezier(.65, 0, .25, 1)');

    if (N.scene.parallaxRelease) N.scene.parallaxRelease();
    e.props.classList.add('is-lift');

    // 1 + 3: anticipation, then the swing on the spine
    var swing = anim(run, e.cover, [
      { offset: 0, transform: rest, easing: 'cubic-bezier(.3, 0, .3, 1)' },
      { offset: .12, transform: 'translate3d(-1px, -2px, 0px) rotateY(0deg) scale(1.01)', easing: 'linear' },
      { offset: .2, transform: 'translate3d(-1px, -2px, 0px) rotateY(-1.5deg) scale(1.01)', easing: SWING_OPEN },
      { offset: 1, transform: 'translate3d(0px, 0px, 0px) rotateY(-180deg) scale(1)' }
    ], { duration: 1250, fill: 'forwards' });
    anim(run, e.cast, CAST, { duration: 1000, delay: 250, easing: SWING_OPEN, fill: 'both' });
    anim(run, e.castBand, CAST_BAND, { duration: 1000, delay: 250, easing: SWING_OPEN, fill: 'both' });
    anim(run, e.frontShade, FRONT_SHADE, { duration: 1000, delay: 250, easing: SWING_OPEN, fill: 'both' });
    anim(run, e.backShade, BACK_SHADE, { duration: 1000, delay: 250, easing: SWING_OPEN, fill: 'both' });

    // 2: the camera leans in; the still life drifts outward, dims and softens
    anim(run, e.camera, [{ transform: from }, { transform: ID }], { duration: 1000, delay: 100, easing: camEase, fill: 'both' });
    anim(run, e.props, [
      { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' },
      { opacity: .45, filter: 'blur(1px)', transform: 'scale(1.05)' }
    ], { duration: 1000, delay: 100, easing: camEase, fill: 'both' });
    anim(run, e.photo, PHOTO_REST_TO_OPEN, { duration: 1000, delay: 100, easing: camEase, fill: 'both' });
    anim(run, e.shadow, [{ opacity: 1 }, { opacity: 1, offset: .25 }, { opacity: 0 }], { duration: 900, delay: 150, easing: 'ease-in-out', fill: 'both' });

    N.book.setState('opening');

    var done = false;
    function land() {
      if (done || running !== run) return;
      done = true;
      e.props.classList.remove('is-lift');
      N.book.setOpen(true);
      // Resting CSS now equals every animation's final frame; drop them so
      // nothing but untransformed layout remains under the page.
      end(run);
      settle();
    }
    whenDone(run, swing, land, 1250);
  }

  // Calls fn when `a` finishes. A timer backs the promise up (a background tab
  // may never resolve it), but only fires once the animation is really done,
  // so slowed playback (devtools) never cuts the choreography short.
  function whenDone(run, a, fn, ms) {
    if (a && a.finished) a.finished.then(fn, function () {});
    function check() {
      if (running !== run) return;
      if (a && (a.playState === 'running' || a.playState === 'paused') && !document.hidden) { later(run, check, 120); return; }
      fn();
    }
    later(run, check, ms + 150);
  }

  // After the swap to the open state: the tabs slide out, the inside-cover note appears.
  function settle() {
    var e = els();
    var run = begin();
    var tuck = tabTucked();
    var last = null;
    var tabsEnd = 260 + Math.max(0, e.tabs.length - 1) * 34;
    var noteEnd = 40 + 360;
    e.tabs.forEach(function (t, i) {
      last = anim(run, t, [{ transform: tuck }, { transform: 'translate(0px, 0px)' }], {
        duration: 260, delay: i * 34, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'backwards'
      });
    });
    var note = anim(run, e.innerContent, [{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: 40, easing: 'ease-out', fill: 'backwards' });
    var longest = last && tabsEnd > noteEnd ? last : note;
    whenDone(run, longest, function () { end(run); }, Math.max(tabsEnd, noteEnd));
  }

  /* ------------------------------------------------------------ close */

  function close() {
    if (running) end(running); // e.g. the tabs were still settling
    if (!canAnimate()) { N.book.setOpen(false); return; }
    if (N.motion.reduced()) { fadeThrough(false); return; }

    var e = els();
    var run = begin();
    var tuck = tabTucked();
    var n = e.tabs.length;

    // 0–200: the tabs slip back behind the fore-edge, the note fades
    e.tabs.forEach(function (t, i) {
      anim(run, t, [{ transform: 'translate(0px, 0px)' }, { transform: tuck }], {
        duration: 170, delay: (n - 1 - i) * 18, easing: 'cubic-bezier(.5, 0, .75, .4)', fill: 'forwards'
      });
    });
    var note = anim(run, e.innerContent, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' });

    var started = false;
    whenDone(run, note, function () { if (!started) { started = true; swingShut(run, e); } }, 200);
  }

  function swingShut(run, e) {
    if (running !== run) return;
    var to = closedTransform(e.app);
    var camEase = cssVar(document.documentElement, '--ease-camera', 'cubic-bezier(.65, 0, .25, 1)');

    var swing = { duration: 760, easing: SWING_CLOSE, fill: 'both' };
    anim(run, e.cover, [
      { transform: 'translate3d(0px, 0px, 0px) rotateY(-180deg) scale(1)' },
      { transform: 'translate3d(0px, 0px, 0px) rotateY(0deg) scale(1)' }
    ], swing);
    anim(run, e.cast, reversed(CAST), swing);
    anim(run, e.castBand, reversed(CAST_BAND), swing);
    anim(run, e.frontShade, reversed(FRONT_SHADE), swing);
    anim(run, e.backShade, reversed(BACK_SHADE), swing);

    var cam = anim(run, e.camera, [{ transform: ID }, { transform: to }], { duration: 850, delay: 50, easing: camEase, fill: 'both' });
    anim(run, e.props, [
      { opacity: .45, filter: 'blur(1px)', transform: 'scale(1.05)' },
      { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }
    ], { duration: 850, delay: 50, easing: camEase, fill: 'both' });
    anim(run, e.photo, PHOTO_REST_TO_OPEN.slice().reverse(), { duration: 850, delay: 50, easing: camEase, fill: 'both' });
    anim(run, e.shadow, [{ opacity: 0 }, { opacity: 0, offset: .35 }, { opacity: 1 }], { duration: 850, delay: 50, easing: 'ease-in-out', fill: 'both' });

    N.book.setState('closing');

    var done = false;
    function shut() {
      if (done || running !== run) return;
      done = true;
      N.book.setOpen(false);
      end(run);
    }
    whenDone(run, cam, shut, 900);
  }

  /* ------------------------------------------------------------ api */

  N.scene.open = open;
  N.scene.close = close;
  N.scene.isAnimating = function () { return !!running; };
  N.scene.setupOpening = function () { ensureCast(document.getElementById('book')); };
})(window.Notebook);
