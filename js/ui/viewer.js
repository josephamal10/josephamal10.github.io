window.Notebook = window.Notebook || {};

/* ==========================================================================
   ui/viewer.js — the document viewer. Owned by PAGES-D.

   A certificate is pulled out of the notebook and laid on the desk, large,
   beside a paper record card with its details (built with ui.defList).

   Notebook.viewer.open(idOrIndex, {trigger})  → boolean
   Notebook.viewer.close()
   Notebook.viewer.next() / prev()
   Notebook.viewer.isOpen()                   → boolean (notebook.js reads it)

   Accessibility: role=dialog + aria-modal, labelled by the document title,
   focus trapped, Esc / Close button close it, focus returns to the trigger,
   everything behind it is inert. ←/→ move between documents.
   The large image is requested only when a document is opened.
   Styles live in css/pages/certificates.css (scoped under .viewer).
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;
  var DEFAULT_AR = 11 / 8.5;      // a letter-size sheet, landscape — replaced by the real ratio on load
  var S = {
    built: false,
    open: false,
    closing: null,
    index: -1,
    list: [],
    trigger: null,
    inerted: [],
    anims: [],
    swap: null,
    token: 0,
    ar: {},
    outEl: null,
    els: {}
  };

  function present(v) {
    if (N.ui && N.ui.present) return N.ui.present(v);
    return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length);
  }
  function reduced() { return !!(N.motion && N.motion.reduced()); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ------------------------------------------------------------ data */

  function collect() {
    var out = [];
    var groups = (N.data && N.data.certificates && N.data.certificates.groups) || [];
    groups.forEach(function (g) {
      (g.items || []).forEach(function (it) {
        if (it && it.id && present(it.title)) out.push({ item: it, group: g });
      });
    });
    return out;
  }

  function indexOf(id) {
    for (var i = 0; i < S.list.length; i++) if (S.list[i].item.id === id) return i;
    return -1;
  }

  // A course certificate carrying exactly this title (used to link "courses included").
  function courseIndex(title, selfId) {
    var hit = -1;
    for (var i = 0; i < S.list.length; i++) {
      var it = S.list[i].item;
      if (it.id === selfId || it.title !== title) continue;
      if (!(it.courses && it.courses.length)) return i;
      if (hit < 0) hit = i;
    }
    return hit;
  }

  /* ------------------------------------------------------------ markup */

  function icon(kind) {
    var s = N.svg;
    var d = {
      prev: 'M9.5 3.5 5 8l4.5 4.5',
      next: 'M6.5 3.5 11 8l-4.5 4.5',
      close: 'M4 4l8 8M12 4l-8 8'
    }[kind];
    return s('svg', { class: 'viewer__icon', viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
      s('path', { d: d, fill: 'none', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  }

  function build() {
    var E = S.els;
    E.eyebrow = h('p', { class: 'viewer__eyebrow' });
    E.title = h('h2', { class: 'viewer__title', id: 'viewer-title', tabindex: '-1' });
    E.meta = h('div', { class: 'viewer__meta' });
    E.links = h('ul', { class: 'viewer__links' });
    E.card = h('div', { class: 'viewer__card' }, E.eyebrow, E.title, E.meta, E.links);

    E.ph = h('img', { class: 'viewer__ph', alt: '', 'aria-hidden': 'true', decoding: 'async', draggable: 'false' });
    E.img = h('img', { class: 'viewer__img', alt: '', decoding: 'async', draggable: 'false' });
    E.sheet = h('div', { class: 'viewer__sheet' }, E.ph, E.img, h('span', { class: 'viewer__light', 'aria-hidden': 'true' }));
    E.doc = h('figure', { class: 'viewer__doc' }, E.sheet);

    E.prev = h('button', { type: 'button', class: 'viewer__btn viewer__prev', 'aria-label': 'Previous document', 'aria-keyshortcuts': 'ArrowLeft' },
      icon('prev'), h('span', { class: 'viewer__btn-text', 'aria-hidden': 'true' }, 'Previous'));
    E.next = h('button', { type: 'button', class: 'viewer__btn viewer__next', 'aria-label': 'Next document', 'aria-keyshortcuts': 'ArrowRight' },
      h('span', { class: 'viewer__btn-text', 'aria-hidden': 'true' }, 'Next'), icon('next'));
    E.count = h('span', { class: 'viewer__count', 'aria-hidden': 'true' });
    E.countSr = h('span', { class: 'visually-hidden', id: 'viewer-position' });
    E.close = h('button', { type: 'button', class: 'viewer__btn viewer__close', 'aria-keyshortcuts': 'Escape' },
      h('span', { class: 'viewer__btn-text' }, 'Close'), icon('close'),
      h('kbd', { class: 'viewer__kbd', 'aria-hidden': 'true' }, 'Esc'));
    E.nav = h('div', { class: 'viewer__nav' }, E.prev, E.count, E.next);
    E.bar = h('div', { class: 'viewer__bar' }, E.nav, E.countSr, E.close);

    E.stage = h('div', { class: 'viewer__stage' }, E.doc, E.card);
    E.scrim = h('div', { class: 'viewer__scrim', 'aria-hidden': 'true' });
    E.live = h('p', { class: 'visually-hidden', 'aria-live': 'polite', 'aria-atomic': 'true' });

    E.root = h('div', {
      class: 'viewer',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'viewer-title',
      'aria-describedby': 'viewer-position',
      hidden: true
    }, E.scrim, E.bar, E.stage, E.live);
    document.body.appendChild(E.root);

    E.close.addEventListener('click', function () { close(); });
    E.prev.addEventListener('click', function () { step(-1); });
    E.next.addEventListener('click', function () { step(1); });
    E.root.addEventListener('keydown', onKeydown);
    // A click on the bare desk (not the document, not the card) puts the document back.
    E.stage.addEventListener('click', function (e) { if (e.target === E.stage || e.target === E.doc) close(); });
    E.scrim.addEventListener('click', function () { close(); });
    // Touch: a horizontal swipe across the document moves to the next / previous one.
    var touch = null;
    E.doc.addEventListener('touchstart', function (e) {
      touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null;
    }, { passive: true });
    E.doc.addEventListener('touchend', function (e) {
      var s = touch;
      touch = null;
      if (!s || !S.open) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - s.x, dy = t.clientY - s.y;
      if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - s.t < 900) step(dx < 0 ? 1 : -1);
    }, { passive: true });
    E.img.addEventListener('load', onImageLoad);
    E.ph.addEventListener('load', onPlaceholderLoad);
    document.addEventListener('focusin', function (e) {
      if (S.open && !S.closing && !E.root.contains(e.target)) focusFirst();
    });
    S.built = true;
  }

  /* ------------------------------------------------------------ rendering */

  function timeEl(date) {
    if (!date || !present(date.label)) return null;
    return h('time', { datetime: present(date.iso) ? date.iso : null }, date.label);
  }

  function coursesList(it) {
    var list = (it.courses || []).filter(present);
    if (!list.length) return null;
    return h('ul', { class: 'viewer__courses' }, list.map(function (title) {
      var idx = courseIndex(title, it.id);
      if (idx < 0) return h('li', null, title);
      var b = h('button', { type: 'button', class: 'viewer__course' },
        h('span', { class: 'viewer__course-text' }, title),
        h('span', { class: 'viewer__course-go', 'aria-hidden': 'true' }, '→'),
        h('span', { class: 'visually-hidden' }, ', view this certificate'));
      b.addEventListener('click', function () {
        go(idx, idx > S.index ? 1 : -1);
        try { S.els.title.focus({ preventScroll: true }); } catch (e) { S.els.title.focus(); }
      });
      return h('li', null, b);
    }));
  }

  function linkItem(href, text, extra) {
    var a = N.ui.link(href, text, { external: true, className: 'viewer__link' });
    if (extra) Object.keys(extra).forEach(function (k) { a.setAttribute(k, extra[k]); });
    return h('li', null, a);
  }

  function thumbAspect(id) {
    var img = N.qs('[data-cert-thumb="' + id + '"] img');
    if (img && img.naturalWidth > 1 && img.naturalHeight > 1 && !/^data:/.test(img.currentSrc || img.src)) {
      return img.naturalWidth / img.naturalHeight;
    }
    return null;
  }

  function setAspect(ar) {
    if (!ar || !isFinite(ar)) return;
    S.els.sheet.style.setProperty('--ar', ar.toFixed(4));
  }

  function render(i) {
    var E = S.els;
    var rec = S.list[i];
    if (!rec) return;
    var it = rec.item;
    var n = S.list.length;
    S.index = i;
    S.token += 1;

    setLabel(E.eyebrow, present(rec.group && rec.group.label) ? rec.group.label : (it.type || ''));
    E.title.textContent = it.title;
    E.count.textContent = pad2(i + 1) + ' / ' + pad2(n);
    E.countSr.textContent = 'Document ' + (i + 1) + ' of ' + n;
    E.nav.hidden = n < 2;

    var dl = N.ui.defList([
      ['Type', it.type],
      ['Issuer', it.issuer],
      ['Platform', it.platform],
      ['Event', it.event],
      ['Date', timeEl(it.date)],
      ['Name on document', it.nameOnDocument],
      ['Credential ID', present(it.credentialId) ? h('span', { class: 'viewer__mono' }, it.credentialId) : null],
      ['Courses included', coursesList(it)]
    ], { className: 'viewer__deflist' });
    while (E.meta.firstChild) E.meta.removeChild(E.meta.firstChild);
    if (dl) E.meta.appendChild(dl);

    while (E.links.firstChild) E.links.removeChild(E.links.firstChild);
    if (present(it.verifyUrl)) E.links.appendChild(linkItem(it.verifyUrl, present(it.platform) ? 'Verify on ' + it.platform : 'Verify this document'));
    if (present(it.pdf)) E.links.appendChild(linkItem(it.pdf, 'Open original PDF', { type: 'application/pdf' }));
    E.links.hidden = !E.links.firstChild;

    // Image: the (already cached) thumbnail stands in until the large scan arrives.
    setAspect(S.ar[it.id] || thumbAspect(it.id) || DEFAULT_AR);
    E.sheet.classList.remove('is-loaded');
    E.img.alt = altFor(it);
    if (present(it.thumb)) E.ph.src = it.thumb; else E.ph.removeAttribute('src');
    if (present(it.image)) {
      E.img.src = it.image;
      if (E.img.complete && E.img.naturalWidth > 0) onImageLoad();
    } else {
      E.img.removeAttribute('src');
    }
    markOut(it.id);
  }

  // "Vanderbilt University · Specializations" breaks only after a separator, never before it.
  function setLabel(el, text) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var parts = String(text).split(' · ');
    parts.forEach(function (part, i) {
      if (i) el.appendChild(document.createTextNode(' '));
      el.appendChild(h('span', { class: 'viewer__nowrap' }, part + (i < parts.length - 1 ? ' ·' : '')));
    });
  }

  function altFor(it) {
    var type = present(it.type) ? String(it.type).toLowerCase() : 'document';
    return 'The ' + type + ' “' + it.title + '”' + (present(it.issuer) ? ', ' + it.issuer : '');
  }

  function onImageLoad() {
    var E = S.els;
    var rec = S.list[S.index];
    if (!rec || !E.img.naturalWidth) return;
    if (E.img.getAttribute('src') !== rec.item.image) return;
    var ar = E.img.naturalWidth / E.img.naturalHeight;
    S.ar[rec.item.id] = ar;
    setAspect(ar);
    E.sheet.classList.add('is-loaded');
  }

  function onPlaceholderLoad() {
    var E = S.els;
    var rec = S.list[S.index];
    if (!rec || !E.ph.naturalWidth || S.ar[rec.item.id]) return;
    setAspect(E.ph.naturalWidth / E.ph.naturalHeight);
  }

  // The slot in the page that the document was pulled from shows empty while it is out.
  function thumbHolder(id) {
    var els = N.qsa('[data-cert-thumb="' + id + '"]');
    for (var i = 0; i < els.length; i++) {
      var leaf = els[i].closest('.leaf');
      if (leaf && leaf.hidden) continue;
      return els[i];
    }
    return null;
  }

  function thumbRect(id) {
    var el = thumbHolder(id);
    if (!el) return null;
    var sheet = N.qs('.cert-doc__sheet, .figure__mount', el) || el;
    var r = sheet.getBoundingClientRect();
    if (r.width < 8 || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null;
    return r;
  }

  function markOut(id) {
    if (S.outEl) S.outEl.classList.remove('is-out');
    S.outEl = S.open ? thumbHolder(id) : null;
    if (S.outEl) S.outEl.classList.add('is-out');
  }

  /* ------------------------------------------------------------ motion */

  function tf(dx, dy, s, r) {
    return 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(' + s.toFixed(4) + ') rotate(' + r + 'deg)';
  }

  function track(a) { S.anims.push(a); return a; }
  function cancelAnims() {
    S.anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* ignore */ } });
    S.anims = [];
  }

  function flight(from, to) {
    var s = from.width / Math.max(1, to.width);
    return {
      s: s,
      dx: (from.left + from.width / 2) - (to.left + to.width / 2),
      dy: (from.top + from.height / 2) - (to.top + to.height / 2)
    };
  }

  function animateIn(fromRect) {
    var E = S.els;
    if (!E.root.animate) return;
    if (reduced()) {
      track(E.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'linear' }));
      return;
    }
    track(E.scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.3,.6,.3,1)' }));
    track(E.bar.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: 280, easing: 'ease-out', fill: 'backwards' }));
    track(E.card.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
      { duration: 460, delay: 240, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }));
    var to = E.sheet.getBoundingClientRect();
    var kf;
    if (fromRect && to.width) {
      var f = flight(fromRect, to);
      kf = [
        { transform: tf(f.dx, f.dy, f.s, 0) },
        { offset: 0.38, transform: tf(f.dx * 0.5, f.dy * 0.5 - 14, f.s + (1 - f.s) * 0.55, -3.2) },
        { transform: tf(0, 0, 1, 0) }
      ];
    } else {
      kf = [
        { transform: tf(0, 40, 0.94, -3.4), opacity: 0 },
        { offset: 0.45, opacity: 1 },
        { transform: tf(0, 0, 1, 0), opacity: 1 }
      ];
    }
    track(E.sheet.animate(kf, { duration: 700, easing: 'cubic-bezier(.3,.7,.2,1)' }));
  }

  function animateOut(toRect, done) {
    var E = S.els;
    if (!E.root.animate) { done(); return; }
    var anims = [];
    if (reduced()) {
      anims.push(E.root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'linear', fill: 'forwards' }));
    } else {
      var from = E.sheet.getBoundingClientRect();
      anims.push(E.scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 440, delay: 60, easing: 'ease-in-out', fill: 'forwards' }));
      anims.push(E.bar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }));
      anims.push(E.card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }));
      if (toRect && from.width) {
        var f = flight(toRect, from);
        anims.push(E.sheet.animate([
          { transform: tf(0, 0, 1, 0) },
          { offset: 0.5, transform: tf(f.dx * 0.6, f.dy * 0.6 - 12, 1 - (1 - f.s) * 0.6, -2.6) },
          { transform: tf(f.dx, f.dy, f.s, 0) }
        ], { duration: 520, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' }));
      } else {
        anims.push(E.sheet.animate([
          { transform: tf(0, 0, 1, 0), opacity: 1 },
          { transform: tf(0, 30, 0.95, 2.2), opacity: 0 }
        ], { duration: 300, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'forwards' }));
      }
    }
    S.anims = S.anims.concat(anims);
    var last = anims.reduce(function (a, b) {
      var ea = a.effect.getComputedTiming().endTime, eb = b.effect.getComputedTiming().endTime;
      return eb > ea ? b : a;
    });
    var finished = false;
    var finish = function () { if (finished) return; finished = true; clearTimeout(timer); done(); };
    var timer = setTimeout(finish, 900);
    last.onfinish = finish;
    S.closing = { finish: finish };
  }

  function go(i, dir) {
    var E = S.els;
    if (i === S.index || !S.list[i]) return;
    if (S.swap) S.swap.commit();
    var rec = S.list[i];
    announce('Document ' + (i + 1) + ' of ' + S.list.length + ': ' + rec.item.title);
    if (reduced() || !E.sheet.animate) { render(i); return; }
    var sw = { done: false };
    var out = E.sheet.animate([
      { transform: 'none', opacity: 1 },
      { transform: 'translateX(' + (-dir * 26) + 'px) rotate(' + (-dir * 1.1) + 'deg)', opacity: 0 }
    ], { duration: 150, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    var cardOut = E.card.animate([{ opacity: 1 }, { opacity: 0.25 }], { duration: 150, easing: 'ease-in', fill: 'forwards' });
    sw.commit = function () {
      if (sw.done) return;
      sw.done = true;
      S.swap = null;
      out.cancel();
      cardOut.cancel();
      render(i);
    };
    out.onfinish = function () {
      if (sw.done) return;
      sw.commit();
      track(E.sheet.animate([
        { transform: 'translateX(' + (dir * 26) + 'px) rotate(' + (dir * 1.3) + 'deg)', opacity: 0 },
        { transform: 'none', opacity: 1 }
      ], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }));
      track(E.card.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' }));
    };
    S.swap = sw;
  }

  function step(d) {
    var n = S.list.length;
    if (!S.open || n < 2) return;
    go((S.index + d + n) % n, d);
  }

  function announce(text) {
    var live = S.els.live;
    live.textContent = '';
    setTimeout(function () { live.textContent = text; }, 40);
  }

  /* ------------------------------------------------------------ focus + keys */

  function focusables() {
    return N.qsa('button, a[href], [tabindex]:not([tabindex="-1"])', S.els.root).filter(function (el) {
      return !el.disabled && !el.closest('[hidden]') && el.getClientRects().length > 0;
    });
  }

  function focusFirst() {
    try { S.els.close.focus({ preventScroll: true }); } catch (e) { S.els.close.focus(); }
  }

  function onKeydown(e) {
    if (!S.open || e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key;
    if (k === 'Escape' || k === 'Esc') {
      e.preventDefault();
      close();
    } else if (k === 'ArrowRight' || k === 'ArrowLeft') {
      e.preventDefault();
      step(k === 'ArrowRight' ? 1 : -1);
    } else if (k === 'Tab') {
      var f = focusables();
      if (!f.length) { e.preventDefault(); return; }
      var first = f[0], last = f[f.length - 1];
      var a = document.activeElement;
      var inside = S.els.root.contains(a);
      if (e.shiftKey && (!inside || a === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || a === last)) { e.preventDefault(); first.focus(); }
    }
  }

  function onRoute() { if (S.open) close({ instant: true }); }

  /* ------------------------------------------------------------ open / close */

  function setBackgroundInert(on) {
    var E = S.els;
    if (on) {
      S.inerted = [];
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el === E.root || el.tagName === 'SCRIPT' || el.tagName === 'NOSCRIPT') return;
        S.inerted.push({ el: el, inert: !!el.inert });
        el.inert = true;
      });
    } else {
      S.inerted.forEach(function (r) { r.el.inert = r.inert; });
      S.inerted = [];
    }
  }

  function finishClose() {
    if (S.closing) S.closing.finish();
  }

  function open(ref, opts) {
    opts = opts || {};
    if (!N.data || !N.data.certificates) return false;
    if (!S.built) build();
    if (S.closing) finishClose();
    S.list = collect();
    var i = typeof ref === 'number' ? ref : indexOf(ref && typeof ref === 'object' ? ref.id : ref);
    if (i < 0 || !S.list[i]) return false;
    if (S.open) { go(i, i > S.index ? 1 : -1); return true; }

    var E = S.els;
    S.trigger = opts.trigger || document.activeElement;
    var fromRect = thumbRect(S.list[i].item.id);
    S.open = true;
    S.index = -1;
    cancelAnims();
    setBackgroundInert(true);
    document.documentElement.classList.add('viewer-open');
    E.root.hidden = false;
    E.root.classList.add('is-open');
    E.root.setAttribute('data-viewer-open', 'true');
    E.live.textContent = '';
    render(i);
    animateIn(fromRect);
    focusFirst();
    window.addEventListener('hashchange', onRoute);
    window.addEventListener('popstate', onRoute);
    return true;
  }

  function close(opts) {
    opts = opts || {};
    if (!S.open) return;
    var E = S.els;
    S.open = false;
    if (S.swap) S.swap.commit();
    window.removeEventListener('hashchange', onRoute);
    window.removeEventListener('popstate', onRoute);
    var rec = S.list[S.index];
    var out = S.outEl;
    if (out) out.classList.remove('is-out');     // the slot must be measurable (and visible) for the return flight
    var toRect = (!opts.instant && rec) ? thumbRect(rec.item.id) : null;
    if (out) out.classList.add('is-out');

    var done = function () {
      S.closing = null;
      cancelAnims();
      E.root.hidden = true;
      E.root.classList.remove('is-open');
      E.root.removeAttribute('data-viewer-open');
      if (S.outEl) S.outEl.classList.remove('is-out');
      S.outEl = null;
      setBackgroundInert(false);
      document.documentElement.classList.remove('viewer-open');
      var t = S.trigger;
      S.trigger = null;
      if (!opts.instant && t && t.isConnected && typeof t.focus === 'function' && t.getClientRects().length) {
        try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); }
      }
    };
    if (opts.instant) { done(); return; }
    animateOut(toRect, done);
  }

  N.viewer = {
    open: open,
    close: function () { close(); },
    next: function () { step(1); },
    prev: function () { step(-1); },
    isOpen: function () { return S.open || !!S.closing; }
  };
})(window.Notebook);
