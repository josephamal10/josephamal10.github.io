window.Notebook = window.Notebook || {};

/* ==========================================================================
   core/dom.js — tiny DOM helpers + motion preference + page registry.
   Owned by FOUNDATION.

   Notebook.h(tag, attrs?, ...children)
     attrs: class (string | array), id, text (textContent), on: {event: fn},
            style (object | string), aria-*, data-*, dataset (object),
            boolean attributes (true → present, false/null → absent),
            any other attribute (set with setAttribute).
     `html` is intentionally NOT supported — data never becomes markup.
     children: Node | string | number | null | false | arrays (flattened).
   Notebook.svg(tag, attrs?, ...children) — same, in the SVG namespace.
   Notebook.qs(sel, root?) / Notebook.qsa(sel, root?) → Array
   Notebook.motion.reduced() / Notebook.motion.onChange(fn)
   Notebook.pages.register(sectionId, factory) — see SPEC section 3.
   ========================================================================== */
(function (N) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var PROP_ATTRS = { value: 1, checked: 1, selected: 1, disabled: 1, hidden: 1, inert: 1, tabIndex: 1 };

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !(v instanceof Node) && !Array.isArray(v);
  }

  function append(el, child) {
    if (child === null || child === undefined || child === false || child === true) return;
    if (Array.isArray(child)) { for (var i = 0; i < child.length; i++) append(el, child[i]); return; }
    if (child instanceof Node) { el.appendChild(child); return; }
    el.appendChild(document.createTextNode(String(child)));
  }

  function applyAttrs(el, attrs, isSvg) {
    Object.keys(attrs).forEach(function (key) {
      var val = attrs[key];
      if (val === undefined || val === null || val === false) return;
      switch (key) {
        case 'html':
          throw new Error('Notebook.h: "html" is not supported; pass text or child nodes.');
        case 'text':
          el.textContent = String(val);
          return;
        case 'class':
        case 'className': {
          var cls = Array.isArray(val) ? val.filter(Boolean).join(' ') : String(val);
          if (cls) el.setAttribute('class', cls);
          return;
        }
        case 'style':
          if (typeof val === 'string') el.setAttribute('style', val);
          else Object.keys(val).forEach(function (p) {
            if (val[p] === null || val[p] === undefined) return;
            if (p.indexOf('--') === 0) el.style.setProperty(p, String(val[p]));
            else el.style[p] = val[p];
          });
          return;
        case 'on':
          Object.keys(val).forEach(function (ev) { el.addEventListener(ev, val[ev]); });
          return;
        case 'dataset':
          Object.keys(val).forEach(function (d) { if (val[d] !== null && val[d] !== undefined) el.dataset[d] = val[d]; });
          return;
        case 'for':
        case 'htmlFor':
          el.setAttribute('for', val);
          return;
      }
      if (!isSvg && PROP_ATTRS[key]) {
        if (key === 'inert' || key === 'hidden') { if (val) el.setAttribute(key, ''); return; }
        el[key] = val;
        return;
      }
      if (val === true) { el.setAttribute(key, ''); return; }
      el.setAttribute(key, String(val));
    });
  }

  function make(isSvg) {
    return function (tag, attrs) {
      var el = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
      var start = 1;
      if (isPlainObject(attrs)) { applyAttrs(el, attrs, isSvg); start = 2; }
      for (var i = start; i < arguments.length; i++) append(el, arguments[i]);
      return el;
    };
  }

  N.h = make(false);
  N.svg = make(true);

  N.qs = function (sel, root) { return (root || document).querySelector(sel); };
  N.qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---- motion preference (live) ---- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var motionListeners = [];
  if (mq) {
    var onMq = function () {
      var r = mq.matches;
      motionListeners.slice().forEach(function (fn) { try { fn(r); } catch (e) { console.error(e); } });
    };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }
  N.motion = {
    reduced: function () { return !!(mq && mq.matches); },
    onChange: function (fn) { if (typeof fn === 'function') motionListeners.push(fn); }
  };
  // Aliases named in the file map.
  N.prefersReducedMotion = N.motion.reduced;
  N.onReducedMotionChange = N.motion.onChange;

  /* ---- slug helper ---- */
  N.slugify = function (s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
  };

  /* ---- page registry (defined here so page modules can register before notebook.js loads) ---- */
  N.pages = N.pages || {};
  N.pages._factories = N.pages._factories || {};
  N.pages.register = function (sectionId, factory) {
    if (!sectionId || typeof factory !== 'function') {
      console.error('Notebook.pages.register(sectionId, factory): invalid arguments for', sectionId);
      return;
    }
    N.pages._factories[sectionId] = factory;
  };
  N.pages.get = function (sectionId) { return N.pages._factories[sectionId] || null; };
})(window.Notebook);
