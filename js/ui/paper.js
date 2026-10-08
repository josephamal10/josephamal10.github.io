window.Notebook = window.Notebook || {};

/* ==========================================================================
   ui/paper.js — shared page primitives (SPEC section 9). Owned by FOUNDATION.
   Every page builds from these so the notebook stays one object.
   Styling lives in css/paper.css.

   ui.pageHeader({eyebrow, eyebrowStyle, title, meta, opener})  → <header> containing an <h2 id>
       opener:true → section-opening size (--fs-2xl); otherwise --fs-xl.
       eyebrow: a kicker in italic Newsreader ('Contents', 'Evidence'). A code eyebrow
       ('P-01 …') is detected automatically (or pass eyebrowStyle:'code') and keeps the mono
       data face; eyebrowStyle:'kicker' forces the italic kicker.
       meta: string | Node | array (joined with " · ").
   ui.label(text, {as, className, data})           → <span class="label"> (data:true → mono data label)
   ui.rule({style:'hair'|'double'|'ticked'})      → decorative divider
   ui.annotation(text, {rotate:-2, place:'margin'|'inline'})
   ui.stamp(text, {rotate:-3})
   ui.chipList(items, {label})                     → <ul class="chips">  items: string | {text, title}
   ui.defList(pairs)                               → <dl class="deflist">  pairs: [[label, value]] | [{label, value}]
   ui.figure({src, alt, caption, label, width, height, srcset, sizes, style:'clipped'|'taped', rotate, eager})
       label: optional 'FIG. 1' lead-in for the caption (mono).
   ui.codeBlock(lines, caption, {language, label})
       Lines that are only an elision ('// …', '…') are set like comments and get no line number.
       language null → no language label. The <pre> is a named, focusable region.
   ui.link(href, text, {external})
   ui.prose(paragraphs)                            → <div class="prose"> of <p>
   ui.pageNumber(slug)                             → number | null (real, computed page numbers)
   ui.pageRef(slug, {prefix:'p. ', text, context, arrow})  → <a class="page-ref" href="#/slug">p. 9</a> | null
       The accessible name always STARTS with the visible words (WCAG 2.5.3): visible
       'see p. 9' is read 'see p. 9, Recognition & roles'. context replaces the hidden part
       (default: the target page's title; '' for none). No aria-label is set.
   ui.continuedOn(slug) / ui.continuedFrom(slug)   → <p class="continued"> 'Continued on p. N →' /
       'Continued from p. N' — the one wording for a page that carries on elsewhere (decision 3).
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;
  var ui = N.ui = N.ui || {};
  var uidCount = 0;

  function uid(prefix) { uidCount += 1; return (prefix || 'nb') + '-' + uidCount; }
  ui.uid = uid;

  function present(v) {
    if (v === null || v === undefined || v === false) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.some(present);
    return true;
  }
  ui.present = present;

  function joinDot(parts) {
    var out = [];
    parts.filter(present).forEach(function (p, i) {
      if (i > 0) out.push(h('span', { class: 'sep', 'aria-hidden': 'true' }, ' · '));
      out.push(p);
    });
    return out;
  }

  /* ---- page header ---- */
  var CODE_RE = /^[A-Z]{1,4}-?\d{1,4}\b/;
  function firstText(v) {
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    if (Array.isArray(v)) {
      for (var i = 0; i < v.length; i++) { var t = firstText(v[i]); if (t) return t; }
      return '';
    }
    if (v && v.nodeType) return v.textContent || '';
    return '';
  }

  ui.pageHeader = function (opts) {
    opts = opts || {};
    var id = opts.id || ('h-' + N.slugify(opts.title || 'page') + '-' + (++uidCount));
    var meta = opts.meta;
    var code = opts.eyebrowStyle === 'code' ||
      (opts.eyebrowStyle !== 'kicker' && CODE_RE.test(firstText(opts.eyebrow).trim()));
    return h('header', { class: ['page-header', opts.opener ? 'page-header--opener' : null] },
      present(opts.eyebrow) ? h('p', { class: ['page-header__eyebrow', code ? 'page-header__eyebrow--code' : null] }, opts.eyebrow) : null,
      h('h2', { class: 'page-header__title', id: id, tabindex: '-1' }, opts.title || ''),
      present(meta) ? h('p', { class: 'page-header__meta' }, Array.isArray(meta) ? joinDot(meta) : meta) : null
    );
  };

  /* ---- label ---- */
  ui.label = function (text, opts) {
    opts = opts || {};
    return h(opts.as || 'span', { class: ['label', opts.data ? 'label--data' : null, opts.className] }, text);
  };

  /* ---- rules ---- */
  ui.rule = function (opts) {
    var style = (opts && opts.style) || 'hair';
    if (['hair', 'double', 'ticked'].indexOf(style) < 0) style = 'hair';
    return h('div', { class: 'rule rule--' + style, role: 'presentation', 'aria-hidden': 'true' });
  };

  /* ---- handwritten annotation (max one per page, ≤ 8 words, never a fact) ---- */
  ui.annotation = function (text, opts) {
    opts = opts || {};
    var rot = typeof opts.rotate === 'number' ? opts.rotate : -2;
    var place = opts.place === 'inline' ? 'inline' : 'margin';
    return h('span', {
      class: ['annotation', 'annotation--' + place, opts.className],
      style: { '--rot': rot + 'deg' }
    }, text);
  };

  /* ---- rubber stamp (technology / status marks only, sparingly) ---- */
  ui.stamp = function (text, opts) {
    opts = opts || {};
    var rot = typeof opts.rotate === 'number' ? opts.rotate : -3;
    return h('span', { class: ['stamp', opts.className], style: { '--rot': rot + 'deg' } },
      h('span', { class: 'stamp__ink' }, text));
  };

  /* ---- technology tags ---- */
  ui.chipList = function (items, opts) {
    opts = opts || {};
    var list = (items || []).filter(present);
    if (!list.length) return null;
    return h('ul', { class: ['chips', opts.className], 'aria-label': opts.label || null },
      list.map(function (it) {
        if (typeof it === 'string' || typeof it === 'number') return h('li', { class: 'chip' }, String(it));
        return h('li', { class: 'chip', title: it.title || null }, it.text || it.label || '');
      }));
  };

  /* ---- definition list ---- */
  ui.defList = function (pairs, opts) {
    opts = opts || {};
    var rows = [];
    if (Array.isArray(pairs)) {
      pairs.forEach(function (p) {
        if (!p) return;
        if (Array.isArray(p)) rows.push({ label: p[0], value: p[1] });
        else rows.push({ label: p.label, value: p.value });
      });
    } else if (pairs && typeof pairs === 'object') {
      Object.keys(pairs).forEach(function (k) { rows.push({ label: k, value: pairs[k] }); });
    }
    rows = rows.filter(function (r) { return present(r.label) && present(r.value); });
    if (!rows.length) return null;
    return h('dl', { class: ['deflist', opts.className] },
      rows.map(function (r) {
        return h('div', { class: 'deflist__row' },
          h('dt', { class: 'deflist__term' }, r.label),
          h('dd', { class: 'deflist__value' }, r.value));
      }));
  };

  /* ---- figure: photo held by a paper clip or tape ---- */
  var CLIP_PATH = 'M8 19v28a4 4 0 0 0 8 0V11a6 6 0 0 0-12 0v40a8 8 0 0 0 16 0V21';
  function paperClip() {
    var S = N.svg;
    var gid = uid('nb-clip');
    return S('svg', { class: 'figure__clip', viewBox: '0 0 22 62', 'aria-hidden': 'true', focusable: 'false' },
      S('defs', null,
        S('linearGradient', { id: gid, x1: '0', y1: '0', x2: '1', y2: '0' },
          S('stop', { offset: '0', 'stop-color': '#5b5e64' }),
          S('stop', { offset: '.35', 'stop-color': '#e7e9ec' }),
          S('stop', { offset: '.6', 'stop-color': '#8d9097' }),
          S('stop', { offset: '1', 'stop-color': '#c9ccd1' }))),
      S('path', { class: 'figure__clip-shadow', d: CLIP_PATH }),
      S('path', { class: 'figure__clip-wire', d: CLIP_PATH, stroke: 'url(#' + gid + ')' }));
  }

  ui.figure = function (opts) {
    opts = opts || {};
    if (!opts.src) return null;
    var style = opts.style === 'taped' ? 'taped' : 'clipped';
    var rot = typeof opts.rotate === 'number' ? opts.rotate : (style === 'taped' ? 0.8 : -1.1);
    var img = h('img', {
      class: 'figure__img',
      src: opts.src,
      srcset: opts.srcset || null,
      sizes: opts.srcset ? (opts.sizes || null) : null,
      alt: opts.alt || '',
      width: opts.width || null,
      height: opts.height || null,
      loading: opts.eager ? 'eager' : 'lazy',
      decoding: 'async'
    });
    var hasCaption = present(opts.caption) || present(opts.label);
    var fig = h('figure', { class: ['figure', 'figure--' + style, opts.className], style: { '--rot': rot + 'deg' } },
      h('div', { class: 'figure__mount' }, img),
      hasCaption ? h('figcaption', { class: 'figure__caption' },
        present(opts.label) ? [h('span', { class: 'figure__label' }, opts.label), ' '] : null,
        present(opts.caption) ? opts.caption : null) : null
    );
    if (style === 'clipped') {
      fig.insertBefore(paperClip(), fig.firstChild);
    } else {
      fig.appendChild(h('span', { class: 'figure__tape figure__tape--a', 'aria-hidden': 'true' }));
      fig.appendChild(h('span', { class: 'figure__tape figure__tape--b', 'aria-hidden': 'true' }));
    }
    return fig;
  };

  /* ---- code on a darker paper strip ---- */
  var ELISION_RE = /^\s*(\/\/|#|--)?\s*(…|\.\.\.)\s*$/;
  ui.codeBlock = function (lines, caption, opts) {
    opts = opts || {};
    lines = Array.isArray(lines) ? lines : String(lines || '').split('\n');
    if (!lines.length) return null;
    var n = 0;
    var code = h('code', { class: 'code__code' },
      lines.map(function (line) {
        line = line === null || line === undefined ? '' : String(line);
        var elided = ELISION_RE.test(line);
        if (!elided) n += 1;
        return h('span', { class: ['code__line', elided ? 'code__line--elision' : null] },
          h('span', { class: 'code__ln', 'aria-hidden': 'true' }, elided ? '' : String(n)),
          h('span', { class: 'code__text' }, line.length ? line : '​'),
          '\n');
      }));
    var name = opts.label || (present(opts.language) ? opts.language + ' code' : 'Code excerpt');
    return h('figure', { class: ['code', opts.className] },
      present(opts.language) ? h('span', { class: 'code__lang label label--data' }, opts.language) : null,
      // A named, focusable region, so keyboard users can scroll a long line sideways.
      h('pre', { class: 'code__pre', tabindex: '0', role: 'region', 'aria-label': name }, code),
      present(caption) ? h('figcaption', { class: 'code__caption' }, caption) : null
    );
  };

  /* ---- links ---- */
  ui.link = function (href, text, opts) {
    opts = opts || {};
    var external = !!opts.external;
    return h('a', {
      class: ['ink-link', opts.className],
      href: href,
      target: external ? '_blank' : null,
      rel: external ? 'noopener noreferrer' : null
    },
    text,
    external ? h('span', { class: 'ink-link__ext', 'aria-hidden': 'true' }, '↗') : null,
    external ? h('span', { class: 'visually-hidden' }, ' (opens in a new tab)') : null);
  };

  /* ---- prose ---- */
  ui.prose = function (paragraphs, opts) {
    opts = opts || {};
    var list = (Array.isArray(paragraphs) ? paragraphs : [paragraphs]).filter(present);
    if (!list.length) return null;
    return h('div', { class: ['prose', opts.className] }, list.map(function (p) { return h('p', null, p); }));
  };

  /* ---- cross references (real, computed page numbers) ---- */
  function findPage(slug) {
    if (!N.book || typeof N.book.pages !== 'function') return null;
    var pages = N.book.pages();
    for (var i = 0; i < pages.length; i++) if (pages[i].slug === slug) return pages[i];
    return null;
  }
  ui.pageNumber = function (slug) { var p = findPage(slug); return p ? p.number : null; };

  ui.pageRef = function (slug, opts) {
    opts = opts || {};
    var p = findPage(slug);
    if (!p) return null;
    var prefix = opts.prefix === undefined ? 'p. ' : opts.prefix;
    var context = opts.context === undefined ? p.title : opts.context;
    // The name is the visible text first, then the hidden context (label in name, WCAG 2.5.3).
    return h('a', {
      class: ['page-ref', opts.className],
      href: N.router ? N.router.href(slug) : '#/' + slug
    },
    opts.text ? [opts.text, ' '] : null,
    h('span', { class: 'page-ref__num' }, prefix + p.number),
    present(context) ? h('span', { class: 'visually-hidden' }, ', ' + context) : null,
    opts.arrow ? h('span', { class: 'page-ref__arrow', 'aria-hidden': 'true' }, ' →') : null);
  };

  /* ---- business card: name, what he does, how to reach him, the résumé ---- */
  ui.businessCard = function (profile, opts) {
    opts = opts || {};
    profile = profile || {};
    var c = profile.contact || {};
    var phone = c.phone || {}, li = c.linkedin || {}, cv = c.resume || {};
    var roles = ((profile.seeking && profile.seeking.roles) || []).filter(present);
    function row(key, label, value) {
      if (!value) return null;
      return h('li', { class: 'bcard__row bcard__row--' + key },
        h('span', { class: 'bcard__key' }, label), h('span', { class: 'bcard__val' }, value));
    }
    var rows = [
      present(phone.display) ? row('tel', 'Tel', present(phone.tel) ? h('a', { href: 'tel:' + phone.tel }, phone.display) : phone.display) : null,
      present(c.email) ? row('mail', 'Mail', h('a', { href: 'mailto:' + c.email }, c.email)) : null,
      present(li.url) ? row('in', 'LinkedIn', ui.link(li.url, present(li.label) ? li.label : li.url, { external: true, className: 'bcard__link' })) : null
    ].filter(Boolean);
    if (!present(profile.name) && !rows.length) return null;
    return h('div', { class: ['bcard', opts.className] },
      h('p', { class: 'bcard__name' }, profile.name || ''),
      present(profile.headline) ? h('p', { class: 'bcard__role' }, profile.headline) : null,
      roles.length ? h('p', { class: 'bcard__roles' }, roles.join(' · ')) : null,
      rows.length ? h('ul', { class: 'bcard__rows' }, rows) : null,
      (present(cv.href) || present(li.url)) ? h('div', { class: 'bcard__actions' },
        present(cv.href) ? h('a', { class: 'bcard__resume', href: cv.href, download: cv.file || '' },
          h('span', { class: 'bcard__resume-mark', 'aria-hidden': 'true' }, '↓'), 'Download résumé',
          h('span', { class: 'visually-hidden' }, ' (PDF)')) : null,
        present(li.url) ? h('a', { class: 'bcard__resume bcard__linkedin', href: li.url, target: '_blank', rel: 'noopener' },
          'LinkedIn', h('span', { class: 'bcard__resume-mark', 'aria-hidden': 'true' }, '↗'),
          h('span', { class: 'visually-hidden' }, ' (opens in a new tab)')) : null) : null);
  };

  /* ---- continuation marks (shared decision 3) ---- */
  function continuation(slug, on) {
    var ref = ui.pageRef(slug, { text: on ? 'Continued on' : 'Continued from', context: '', arrow: on, className: 'continued__ref' });
    if (!ref) return null;
    return h('p', { class: ['continued', on ? 'continued--on' : 'continued--from'] }, ref);
  }
  ui.continuedOn = function (slug) { return continuation(slug, true); };
  ui.continuedFrom = function (slug) { return continuation(slug, false); };
})(window.Notebook);
