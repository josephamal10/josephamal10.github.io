window.Notebook = window.Notebook || {};

/* ==========================================================================
   core/notebook.js — the notebook engine. Owned by FOUNDATION.

   Notebook.book.init()
   Notebook.book.pages()          → [{slug, title, running, section, number, pageNo: {left, right}, el}]
   Notebook.book.goTo(slug, {animate = true, source, focus = true, replace})
   Notebook.book.next() / prev() / first() / last()
   Notebook.book.current()        → slug
   Notebook.book.setOpen(bool, {instant, focus})  — state only; never animates the cover
   Notebook.book.isOpen()
   Notebook.book.on('change' | 'open' | 'close', fn) → off()
   Extras for SCENE / PAGES:
   Notebook.book.setState('closed'|'opening'|'open'|'closing')  — sets #app[data-state] only
   Notebook.book.requestOpen() / requestClose()  — delegates to Notebook.scene.open/close when present
   Notebook.book.resolve(slug)    → page object | null (accepts a section id, an alias or unknown sub-slug)
   Notebook.book.pageNumber(slug) → number | null
   Notebook.book.sideTabs()       → true when the index tabs sit on the fore-edge (else top edge)
   Notebook.book.isTurned()       → true when the verso stack covers the inner cover (past the first spread)
   Notebook.book.isSpread()       → true when both pages of a spread are on screen

   Spreads
   - Every descriptor a section registers is one SPREAD: `build` fills the right-hand page and
     `facing` (optional) the left-hand page. Page numbers run like a book's: the first spread
     is the inside of the front board + page 1; after that spread i is pages 2i (left) and
     2i + 1 (right). A spread's `number` is its first page, which cross references cite.
   - Physically, the left page of spread i is printed on the BACK of sheet i - 1. While
     spread i is open, sheet i - 1 lies turned on the left (.leaf--left, rotateY(-180deg)),
     showing that page; the first spread's left page is the inside of the front board.
   - Turning forward, the current sheet lifts and lands on the left over the last turned one;
     turning back, the top sheet on the left lifts and lands on the right. During a turn each
     sheet's stacking follows which side of the spine it is on (z-index keyframes, switched at
     90°), so the sheet that lands last is always the one on top.
   - When the spread does not fit (phones, narrow windows) one page is read at a time: the left
     page's content is repeated at the head of the right page (.leaf__facing-inline) and the
     backs of the sheets show plain paper.
   - Closing always leaves the book at the first spread underneath the cover.

   Performance
   - Hidden sheets use content-visibility:hidden, not display:none, so a sheet keeps its layout
     once it has been laid out. The sheets next to the open spread stay laid out (.leaf--warm)
     and the section openers are primed once while idle (.leaf--prime).
   - Turn geometry, timings and tab-strip metrics are measured on resize, never per turn.
   - Post-turn measuring (the "more below" marks, onShow hooks) runs in the next frame.
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;
  var STAGGER = 70;           // ms between sheets in a multi-sheet turn
  var SIDE_TABS_MQ = window.matchMedia('(orientation: landscape) and (min-width: 900px), (orientation: landscape) and (max-height: 560px)');
  var COARSE_MQ = window.matchMedia('(pointer: coarse), (max-width: 599px)');
  var TAB_TINTS = [1.2, 0, 2, .6, 1.6, .3, 1, 1.8];   // pressboard sheets are never quite the same grey
  var TAB_PAD = 48;           // keep a revealed tab clear of the 2.5rem scroll fade

  var S = {
    inited: false,
    pages: [],      // internal spread records
    pub: [],        // public page objects (same order)
    index: -1,
    open: false,
    turned: false,
    spread: false,
    turn: null,
    listeners: {},
    els: {},
    tabBtns: {},
    edges: [],
    versoEdges: [],
    riffles: [],
    m: { W: 600, P: 3600, dur: 760, ease: 'ease-in-out' },
    tabM: null,
    tabSL: 0,
    tabRaf: 0,
    revealRaf: 0,
    postRaf: 0,
    warmT: 0,
    prime: null,    // section openers still to lay out once while idle
    annT: 0,
    touch: null
  };

  /* ------------------------------------------------------------ events */

  function on(name, fn) {
    if (typeof fn !== 'function') return function () {};
    (S.listeners[name] = S.listeners[name] || []).push(fn);
    return function off() {
      var l = S.listeners[name] || [];
      var i = l.indexOf(fn);
      if (i >= 0) l.splice(i, 1);
    };
  }

  function emit(name, detail) {
    (S.listeners[name] || []).slice().forEach(function (fn) {
      try { fn(detail); } catch (e) { console.error(e); }
    });
  }

  /* ------------------------------------------------------------ utils */

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function parseMs(v, fallback) {
    v = String(v || '').trim();
    var n = parseFloat(v);
    if (isNaN(n)) return fallback;
    if (/ms$/i.test(v)) return n;
    if (/s$/i.test(v)) return n * 1000;
    return n;
  }

  function raf(fn) { return window.requestAnimationFrame ? requestAnimationFrame(fn) : setTimeout(fn, 16); }
  function cancelRaf(id) { if (!id) return; if (window.cancelAnimationFrame) cancelAnimationFrame(id); clearTimeout(id); }
  function idle(fn, timeout) {
    if (window.requestIdleCallback) return { i: requestIdleCallback(fn, { timeout: timeout || 800 }) };
    return { t: setTimeout(fn, 200) };
  }
  function cancelIdle(x) {
    if (!x) return;
    if (x.i && window.cancelIdleCallback) cancelIdleCallback(x.i);
    if (x.t) clearTimeout(x.t);
  }

  function setHidden(el, hidden) {
    if (!el) return;
    if (hidden) el.setAttribute('aria-hidden', 'true'); else el.removeAttribute('aria-hidden');
  }

  function callHook(p, name, el) {
    var fn = p && p.desc && p.desc[name];
    if (typeof fn !== 'function') return;
    try { fn(el || p.el); } catch (e) { console.error('[notebook] ' + name + ' failed for "' + p.slug + '"', e); }
  }

  function sectionTab(id) {
    var secs = (N.data && N.data.site && N.data.site.sections) || [];
    for (var i = 0; i < secs.length; i++) if (secs[i].id === id) return secs[i].tab || id;
    return id;
  }

  function totalPages() { return S.pages.length ? S.pages.length * 2 - 1 : 0; }

  // 'Pages 6–7 of 21: Projects — Automatic Garage…'; never repeats the section name.
  function pageLabel(p) {
    if (!p) return '';
    var tab = sectionTab(p.section);
    var title = p.title || '';
    var label = (p.left ? 'Pages ' + p.left + '–' + p.right : 'Page ' + p.right) + ' of ' + totalPages() + ': ';
    if (!title || title === tab) label += tab;
    else if (title.toLowerCase().indexOf(String(tab).toLowerCase()) === 0) label += title;
    else label += tab + ' — ' + title;
    return label;
  }

  function announce(text) {
    var st = S.els.status;
    if (!st) return;
    clearTimeout(S.annT);
    st.textContent = '';
    S.annT = setTimeout(function () { st.textContent = text; }, 50);
  }

  function resolve(slug) {
    if (!slug) return null;
    slug = String(slug).replace(/^#?\/?/, '').replace(/\/+$/, '').toLowerCase();
    var i;
    for (i = 0; i < S.pages.length; i++) if (S.pages[i].slug.toLowerCase() === slug) return S.pages[i];
    for (i = 0; i < S.pages.length; i++) if (S.pages[i].aliases.indexOf(slug) >= 0) return S.pages[i];
    var head = slug.split('/')[0];
    for (i = 0; i < S.pages.length; i++) if (S.pages[i].slug.toLowerCase() === head) return S.pages[i];
    for (i = 0; i < S.pages.length; i++) if (String(S.pages[i].section).toLowerCase() === head) return S.pages[i];
    return null;
  }

  /* ------------------------------------------------------------ assembly */

  function assemble() {
    var data = N.data || {};
    var sections = (data.site && data.site.sections) || [];
    var factories = (N.pages && N.pages._factories) || {};
    var seen = {};

    sections.forEach(function (sec) {
      var factory = factories[sec.id];
      if (typeof factory !== 'function') return;
      if (sec.id === 'notes' && !(data.blogs && data.blogs.length) && !sec.showWhenEmpty) return;
      var descs;
      try { descs = factory(data, N.ui); }
      catch (e) { console.error('[notebook] section "' + sec.id + '" failed to register its pages', e); return; }
      if (!Array.isArray(descs)) descs = descs ? [descs] : [];
      descs.forEach(function (d) {
        if (!d || !d.slug || typeof d.build !== 'function') return;
        var slug = String(d.slug).replace(/^\/+|\/+$/g, '');
        if (seen[slug]) { var k = 2; while (seen[slug + '-' + k]) k++; slug = slug + '-' + k; }
        seen[slug] = true;
        var i = S.pages.length;
        var rec = {
          slug: slug,
          aliases: (d.aliases || []).map(function (a) { return String(a).replace(/^\/+|\/+$/g, '').toLowerCase(); }),
          title: d.title || sec.tab || sec.id,
          running: d.running || sec.tab || d.title || '',
          section: sec.id,
          left: i === 0 ? null : 2 * i,
          right: i === 0 ? 1 : 2 * i + 1,
          // the page cross references cite: the spread's first page, or its right page when
          // the left page belongs to something else (desc.cite === 'right')
          number: i === 0 ? 1 : (d.cite === 'right' ? 2 * i + 1 : 2 * i),
          desc: d,
          el: null, front: null, back: null,
          heading: null, body: null,
          backBody: null, backHead: null,       // this sheet's back = the NEXT spread's left page
          leftHead: null, inlineHead: null      // this spread's left page, on screen / inline
        };
        S.pages.push(rec);
        S.pub.push({ slug: rec.slug, title: rec.title, running: rec.running, section: rec.section,
          number: rec.number, pageNo: { left: rec.left, right: rec.right }, el: null });
      });
    });

    if (!S.pages.length) {
      var profile = data.profile || {};
      var d = { slug: 'about', title: profile.name || 'Notebook', build: function () { return N.ui.pageHeader({ title: profile.name || 'Notebook', opener: true }); } };
      S.pages.push({ slug: 'about', aliases: [], title: d.title, running: '', section: 'about', left: null, right: 1, number: 1, desc: d });
      S.pub.push({ slug: 'about', title: d.title, running: '', section: 'about', number: 1, pageNo: { left: null, right: 1 }, el: null });
    }

    // Numbers are final now, so builds may compute cross references (ui.pageRef).
    var frag = document.createDocumentFragment();
    S.pages.forEach(function (p, i) {
      buildLeaf(p);
      S.pub[i].el = p.el;
      frag.appendChild(p.el);
    });
    S.els.leaves.appendChild(frag);
    // Left pages second, once every right page exists (their references can find anything).
    S.pages.forEach(function (p, i) {
      if (i > 0) fillBack(S.pages[i - 1], p);
      addInline(p);
    });
    fillInnerCover(S.pages[0]);
  }

  // 'Experience · Recognition' → section + sub, so the smallest phones can drop the sub.
  function runningHead(text) {
    text = String(text || '');
    var i = text.indexOf(' · ');
    if (i < 0) return text;
    return [h('span', { class: 'running-head__sec' }, text.slice(0, i)),
      h('span', { class: 'running-head__sub' }, text.slice(i))];
  }

  function firstHeading(node) {
    if (!node || node.nodeType !== 1) return null;
    return node.matches('h2') ? node : (node.querySelector('h2') || node.querySelector('h1, h3'));
  }

  function markHeading(el) {
    if (!el) return null;
    if (!el.id) el.id = N.ui.uid('h');
    el.setAttribute('tabindex', '-1');
    return el;
  }

  function buildContent(fn, fallbackTitle, slug) {
    var content = null;
    try { content = fn(); }
    catch (e) { console.error('[notebook] page "' + slug + '" failed to build', e); }
    if (!(content instanceof Node)) content = fallbackTitle ? N.ui.pageHeader({ title: fallbackTitle, opener: true }) : null;
    return content;
  }

  function buildLeaf(p) {
    var d = p.desc;
    var content = buildContent(d.build, p.title, p.slug);
    var heading = markHeading(firstHeading(content));
    var profile = (N.data && N.data.profile) || {};
    var head = h('header', { class: 'running-head' },
      h('button', {
        type: 'button',
        class: 'running-head__close',
        'aria-label': 'Close notebook',
        on: { click: function () { requestClose(); } }
      }, h('span', { class: 'running-head__close-mark', 'aria-hidden': 'true' }), 'Close'),
      h('span', { class: 'running-head__left', 'aria-hidden': 'true' }, profile.shortName || profile.name || ''),
      h('span', { class: 'running-head__right', 'aria-hidden': 'true' }, runningHead(p.running))
    );
    var body = h('div', { class: 'leaf__body' }, content);
    var at = S.pages.indexOf(p);
    var foot = h('footer', { class: 'leaf__foot' },
      h('span', { class: 'leaf__more', 'aria-hidden': 'true' }, 'More below'),
      at > 0 ? turnButton(-1, 'page-turn--single') : null,
      at < S.pages.length - 1 ? turnButton(1) : null,
      h('span', { class: 'folio', 'aria-hidden': 'true' }, String(p.right)));
    var moreRaf = 0;
    body.addEventListener('scroll', function () {
      if (moreRaf) return;
      moreRaf = raf(function () { moreRaf = 0; updateMore(p); });
    }, { passive: true });

    var front = h('div', { class: 'leaf__front paper' }, head, body, foot, h('div', { class: 'leaf__shade', 'aria-hidden': 'true' }));
    var back = h('div', { class: 'leaf__back paper paper--verso' },
      closeFoot(),
      h('div', { class: 'leaf__shade', 'aria-hidden': 'true' }));
    var leaf = h('article', {
      class: 'leaf',
      id: 'leaf-' + N.slugify(p.slug),
      'data-slug': p.slug,
      'data-section': p.section,
      hidden: true,
      inert: true
    }, front, back);

    p.el = leaf;
    p.front = front;
    p.back = back;
    p.heading = heading;
    p.body = body;
    setOwnLabel(p);
  }

  function closeFoot() {
    return h('footer', { class: 'leaf__foot leaf__foot--verso' }, turnButton(-1));
  }

  // "← Previous page" at the foot of a left page, "Next page →" at the foot of a right page.
  function turnButton(delta, extra) {
    var back = delta < 0;
    return h('button', {
      type: 'button',
      class: 'page-turn page-turn--' + (back ? 'prev' : 'next') + (extra ? ' ' + extra : ''),
      on: { click: function () { step(delta, { source: 'button' }); } }
    },
      back ? h('span', { class: 'page-turn__mark', 'aria-hidden': 'true' }, '←') : null,
      back ? 'Previous page' : 'Next page',
      back ? null : h('span', { class: 'page-turn__mark', 'aria-hidden': 'true' }, '→'));
  }

  // The back of sheet `prev` is the left page of spread `p`.
  function fillBack(prev, p) {
    var d = p.desc;
    var back = prev.back;
    while (back.firstChild) back.removeChild(back.firstChild);
    var content = typeof d.facing === 'function' ? buildContent(d.facing, null, p.slug + ' (left)') : null;
    var profile = (N.data && N.data.profile) || {};
    if (content) {
      var head = h('header', { class: 'running-head running-head--verso', 'aria-hidden': 'true' },
        h('span', { class: 'running-head__left' }, runningHead(d.facingRunning || p.running)),
        h('span', { class: 'running-head__right' }, profile.shortName || profile.name || ''));
      var body = h('div', { class: 'leaf__body leaf__body--verso' }, content);
      var foot = h('footer', { class: 'leaf__foot leaf__foot--verso', 'aria-hidden': 'false' },
        h('span', { class: 'folio folio--verso', 'aria-hidden': 'true' }, String(p.left)),
        turnButton(-1),
        h('span', { class: 'leaf__more', 'aria-hidden': 'true' }, 'More below'));
      back.classList.add('leaf__back--page');
      back.appendChild(head);
      back.appendChild(body);
      back.appendChild(foot);
      prev.backBody = body;
      prev.backHead = markHeading(firstHeading(content));
      p.leftHead = prev.backHead;
      var moreRaf = 0;
      body.addEventListener('scroll', function () {
        if (moreRaf) return;
        moreRaf = raf(function () { moreRaf = 0; updateBackMore(prev); });
      }, { passive: true });
    } else {
      back.appendChild(closeFoot());
    }
    back.appendChild(h('div', { class: 'leaf__shade', 'aria-hidden': 'true' }));
  }

  // One page at a time (no room for the spread): the left page's content heads the right page.
  function addInline(p) {
    if (typeof p.desc.facing !== 'function') return;
    var content = buildContent(p.desc.facing, null, p.slug + ' (left, inline)');
    if (!content) return;
    // One-page layouts: the left page heads the right one, unless it asks to follow it (facingInline: 'end').
    var atEnd = p.desc.facingInline === 'end';
    var wrap = h('div', { class: 'leaf__facing-inline' + (atEnd ? ' leaf__facing-inline--end' : '') }, content);
    p.body.insertBefore(wrap, atEnd ? null : p.body.firstChild);
    p.inlineHead = markHeading(firstHeading(content));
    p.inline = wrap;
    if (!p.heading) { p.heading = p.inlineHead; setOwnLabel(p); }
  }

  function setOwnLabel(p) {
    if (!p.el) return;
    if (p.heading) { p.el.setAttribute('aria-labelledby', p.heading.id); p.el.removeAttribute('aria-label'); }
    else { p.el.removeAttribute('aria-labelledby'); p.el.setAttribute('aria-label', p.title); }
  }

  function closeButton(cls, extra) {
    return h('button', {
      type: 'button',
      class: cls + (extra ? ' ' + extra : ''),
      on: { click: function () { requestClose(); } }
    }, h('span', { class: cls + '-mark', 'aria-hidden': 'true' }), 'Close notebook');
  }

  function buildInnerCover() {
    var ic = S.els.inner;
    if (!ic) return;
    while (ic.firstChild) ic.removeChild(ic.firstChild);

    // The verso stack: the backs of the pages already turned, lying on the inner cover.
    var edges = h('div', { class: 'verso__edges', 'aria-hidden': 'true' });
    S.versoEdges = [];
    for (var i = 5; i >= 1; i--) {
      var e = h('div', { class: 'verso__edge', style: { '--n': String(i) }, hidden: true });
      edges.appendChild(e);
      S.versoEdges[i] = e;
    }
    var verso = h('div', { class: 'book__verso', 'aria-hidden': 'true' },
      edges,
      h('div', { class: 'verso__sheet paper paper--verso' }));

    ic.appendChild(h('div', { class: 'inner-cover__board', 'aria-hidden': 'true' }));
    ic.appendChild(h('div', { class: 'inner-cover__content' }));
    ic.appendChild(verso);
    S.els.verso = verso;
    S.els.innerContent = N.qs('.inner-cover__content', ic);
  }

  // The first spread's left page is the inside of the front board: its `facing` goes there
  // (or the plain 'If found' bookplate when it has none).
  function fillInnerCover(first) {
    var box = S.els.innerContent;
    if (!box) return;
    while (box.firstChild) box.removeChild(box.firstChild);
    var content = first && typeof first.desc.facing === 'function' ? buildContent(first.desc.facing, null, first.slug + ' (inside cover)') : null;
    if (!content) {
      var site = (N.data && N.data.site) || {};
      var ins = site.insideCover || {};
      var contact = ((N.data && N.data.profile) || {}).contact || {};
      content = h('div', { class: 'inner-cover__plate' },
        ins.lead ? h('p', { class: 'inner-cover__lead' }, ins.lead) : null,
        h('div', { class: 'inner-cover__fill' },
          ins.name ? h('p', { class: 'inner-cover__name' }, ins.name) : null,
          ins.line ? h('p', { class: 'inner-cover__line' }, ins.line) : null,
          contact.email ? h('p', { class: 'inner-cover__line inner-cover__line--mono' },
            h('a', { class: 'inner-cover__email', href: 'mailto:' + contact.email }, contact.email)) : null));
    }
    box.appendChild(content);
    box.appendChild(closeButton('inner-cover__close'));
    if (first) first.leftHead = markHeading(firstHeading(content));
  }

  function buildTabs() {
    var nav = S.els.tabs;
    if (!nav) return;
    while (nav.firstChild) nav.removeChild(nav.firstChild);
    var secs = [];
    S.pages.forEach(function (p) {
      if (!secs.length || secs[secs.length - 1].id !== p.section) {
        if (secs.some(function (s) { return s.id === p.section; })) return;
        secs.push({ id: p.section, tab: sectionTab(p.section), first: p.slug });
      }
    });
    nav.style.setProperty('--tab-count', String(secs.length));
    if (!nav._nbWired) {
      nav._nbWired = true;
      nav.addEventListener('scroll', onTabScroll, { passive: true });
      nav.addEventListener('focusin', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('.book__tab') : null;
        if (b) revealTab(b.getAttribute('data-section'), true);
      });
    }
    S.tabBtns = {};
    secs.forEach(function (sec, i) {
      var b = h('button', {
        type: 'button',
        class: 'book__tab',
        'data-section': sec.id,
        style: { '--i': String(i), '--tab-v': String(TAB_TINTS[i % TAB_TINTS.length]) },
        on: { click: function () { goTo(sec.first, { source: 'tab' }); } }
      }, h('span', { class: 'book__tab-label' }, sec.tab));
      nav.appendChild(b);
      S.tabBtns[sec.id] = b;
    });
  }

  function buildBlock() {
    var block = S.els.block;
    if (!block) return;
    while (block.firstChild) block.removeChild(block.firstChild);
    block.appendChild(h('div', { class: 'book__board' }));
    S.edges = [];
    for (var i = 5; i >= 1; i--) {
      var e = h('div', { class: 'book__edge', style: { '--n': String(i) } });
      block.appendChild(e);
      S.edges[i] = e;
    }
    block.appendChild(h('div', { class: 'book__hinge' }));
    block.appendChild(h('div', { class: 'book__ribbon' }));
  }

  function buildRiffles() {
    S.riffles = [];
    for (var r = 0; r < 2; r++) {
      var el = h('div', { class: 'leaf leaf--riffle', 'aria-hidden': 'true', hidden: true },
        h('div', { class: 'leaf__front paper' },
          h('div', { class: 'leaf__ghost' }),
          h('div', { class: 'leaf__shade' })),
        h('div', { class: 'leaf__back paper paper--verso' }, h('div', { class: 'leaf__shade' })));
      S.els.leaves.appendChild(el);
      S.riffles.push(el);
    }
  }

  /* ------------------------------------------------------------ which sheet shows what */

  // The open spread's own sheet lies on the right; the sheet before it lies turned on the
  // left (its back is the spread's left page); every other sheet is out of view.
  function applyLeaves() {
    var cur = S.index;
    S.pages.forEach(function (p, k) {
      var role = k === cur ? 'current' : (k === cur - 1 ? 'left' : 'off');
      var el = p.el;
      var off = role === 'off';
      if (el.hidden !== off) el.hidden = off;
      if (el.inert !== off) el.inert = off;
      el.classList.toggle('leaf--left', role === 'left');
      if (p.front.inert !== (role === 'left')) p.front.inert = role === 'left';
      var backInert = role !== 'left' || !S.spread;
      if (p.back.inert !== backInert) p.back.inert = backInert;
      if (role === 'left') {
        if (p.backHead) { el.setAttribute('aria-labelledby', p.backHead.id); el.removeAttribute('aria-label'); }
        else { el.removeAttribute('aria-labelledby'); el.setAttribute('aria-label', 'Left-hand page'); }
      } else {
        setOwnLabel(p);
      }
    });
  }

  /* ------------------------------------------------------------ chrome */

  function stackCount(n, total) {
    return n <= 0 ? 0 : Math.max(1, Math.min(5, Math.ceil(n / Math.max(1, total - 1) * 5)));
  }

  function setTurned(turned) {
    turned = !!turned;
    if (turned === S.turned && S.els.book.hasAttribute('data-turned') === turned) return;
    S.turned = turned;
    S.els.book.toggleAttribute('data-turned', turned);
    if (S.els.inner) S.els.inner.setAttribute('aria-label', turned ? 'Left-hand page' : 'Inside front cover');
  }

  function updateChrome() {
    var p = S.pages[S.index];
    if (!p) return;
    Object.keys(S.tabBtns).forEach(function (id) {
      var b = S.tabBtns[id];
      var active = id === p.section;
      b.classList.toggle('is-active', active);
      if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    // Page thickness: still to read on the fore-edge, already read on the verso stack.
    var total = S.pages.length;
    var right = stackCount(total - 1 - S.index, total);
    var left = stackCount(S.index, total);
    for (var i = 1; i <= 5; i++) {
      if (S.edges[i]) S.edges[i].hidden = i > right;
      if (S.versoEdges[i]) S.versoEdges[i].hidden = i > left;
    }
    var book = S.els.book;
    book.dataset.section = p.section;
    book.dataset.page = String(p.number);
    scheduleRevealActiveTab();
  }

  /* ---- top tab strip: metrics are measured on resize; scroll work is one rAF per frame ---- */

  function measureTabs() {
    var nav = S.els.tabs;
    S.tabM = null;
    if (!nav || SIDE_TABS_MQ.matches) { if (nav) nav.classList.remove('can-scroll-left', 'can-scroll-right'); return; }
    var items = {};
    Object.keys(S.tabBtns).forEach(function (id) {
      var b = S.tabBtns[id];
      items[id] = { l: b.offsetLeft, r: b.offsetLeft + b.offsetWidth };
    });
    S.tabM = { sw: nav.scrollWidth, cw: nav.clientWidth, items: items };
    S.tabSL = nav.scrollLeft;
    applyTabScroll();
  }

  function applyTabScroll() {
    var nav = S.els.tabs, m = S.tabM;
    if (!nav) return;
    var over = !!m && m.sw > m.cw + 1;
    var sl = S.tabSL;
    nav.classList.toggle('can-scroll-left', over && sl > 2);
    nav.classList.toggle('can-scroll-right', over && sl + m.cw < m.sw - 2);
  }

  function onTabScroll() {
    if (S.tabRaf) return;
    S.tabRaf = raf(function () {
      S.tabRaf = 0;
      var nav = S.els.tabs;
      if (!nav || !S.tabM) return;
      var sl = nav.scrollLeft;
      if (sl === S.tabSL) return;
      S.tabSL = sl;
      applyTabScroll();
    });
  }

  function revealTab(id, smooth) {
    var nav = S.els.tabs, m = S.tabM;
    if (!nav || !m || m.sw <= m.cw) return;
    var it = m.items[id];
    if (!it) return;
    var sl = S.tabSL, target = sl;
    if (it.l - TAB_PAD < sl) target = Math.max(0, it.l - TAB_PAD);
    else if (it.r + TAB_PAD > sl + m.cw) target = Math.min(m.sw - m.cw, it.r + TAB_PAD - m.cw);
    if (Math.abs(target - sl) < 1) return;
    S.tabSL = target;
    try { nav.scrollTo({ left: target, behavior: smooth && !N.motion.reduced() ? 'smooth' : 'auto' }); }
    catch (e) { nav.scrollLeft = target; }
    applyTabScroll();
  }

  function scheduleRevealActiveTab() {
    if (S.revealRaf || SIDE_TABS_MQ.matches) return;
    S.revealRaf = raf(function () {
      S.revealRaf = 0;
      var p = S.pages[S.index];
      if (p) revealTab(p.section, S.open);
    });
  }

  function measure() {
    var book = S.els.book, camera = S.els.camera, leaves = S.els.leaves;
    if (!book || !camera) return;
    var side = SIDE_TABS_MQ.matches;
    var cw = camera.clientWidth;
    var W = book.offsetWidth;
    var bo = Math.max(0, (S.els.inner ? S.els.inner.offsetWidth : W) - W);
    var tabsW = side && S.els.tabs ? Math.max(0, S.els.tabs.offsetWidth - 12) : 0;
    // Show the whole spread, centred, when both pages, the boards and the tabs fit with a margin.
    var spread = side && cw >= 2 * W + 2 * bo + tabsW + 40;
    var shift = spread ? Math.round((W - tabsW) / 2) : 0;
    var space = (cw - W) / 2 + shift;
    book.style.setProperty('--spread-shift', shift + 'px');
    book.style.setProperty('--left-space', Math.max(0, Math.round(space)) + 'px');
    book.classList.toggle('book--spread', spread);
    book.classList.toggle('book--compact', space < 250);
    // Room on the desk to the left of the open spread for the object that closes it (js/ui/closer.js).
    book.classList.toggle('book--room-left', spread && (cw - 2 * W - 2 * bo - tabsW) / 2 >= 150);
    book.classList.toggle('book--side-tabs', side);
    if (spread !== S.spread) {
      S.spread = spread;
      if (S.inited && S.index >= 0) applyLeaves();
    }

    S.m = {
      W: (leaves && leaves.clientWidth) || W || 600,
      P: (leaves && parseFloat(getComputedStyle(leaves).perspective)) || 3600,
      dur: parseMs(cssVar('--dur-page'), 760),
      ease: cssVar('--ease-page') || 'ease-in-out'
    };
    measureTabs();
    scheduleRevealActiveTab();
    updateMore(S.pages[S.index]);
    updateBackMore(S.pages[S.index - 1]);
  }

  // Marks a page whose content runs past the bottom edge ("more below" in the foot).
  function updateMore(p) {
    if (!p || !p.body || !p.el) return;
    var b = p.body;
    var more = b.scrollHeight > b.clientHeight + 4 && b.scrollTop + b.clientHeight < b.scrollHeight - 4;
    if (more) p.front.setAttribute('data-more', ''); else p.front.removeAttribute('data-more');
  }
  function updateBackMore(prev) {
    if (!prev || !prev.backBody) return;
    var b = prev.backBody;
    var more = b.scrollHeight > b.clientHeight + 4 && b.scrollTop + b.clientHeight < b.scrollHeight - 4;
    if (more) prev.back.setAttribute('data-more', ''); else prev.back.removeAttribute('data-more');
  }

  function focusHeading(p) {
    if (!p || !p.el) return;
    var t = p.heading;
    // As a spread, a page title (h2) on the left page leads when the right page has none of its own.
    var ownTitle = t && t.tagName === 'H2' && !(p.inline && p.inline.contains(t)) && p.desc.lead !== 'left';
    if (S.spread && p.leftHead && p.leftHead.tagName === 'H2' && !ownTitle) t = p.leftHead;
    else if (!S.spread && p.inlineHead && p.inlineHead.tagName === 'H2' && !ownTitle) t = p.inlineHead;
    else if (t && p.inline && p.inline.contains(t) && S.spread && p.leftHead) t = p.leftHead;
    t = t || p.el;
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); }
  }

  /* ---- warm neighbours ---- */

  function setWarm(keepEl) {
    // The sheet after the open spread (next turn forward) and the one two back (the page that
    // is uncovered on the left when turning back) are kept laid out.
    var i = S.index;
    S.pages.forEach(function (p, k) {
      var near = k === i + 1 || k === i - 2;
      if (!near) p.el.classList.remove('leaf--warm');
      else if (p.el === keepEl) p.el.classList.add('leaf--warm');
    });
    cancelIdle(S.warmT);
    S.warmT = idle(function () {
      S.warmT = 0;
      if (S.turn) return;
      [S.index + 1, S.index - 2].forEach(function (k) {
        var p = S.pages[k];
        if (p) p.el.classList.add('leaf--warm');
      });
      primeNext();
    }, 1200);
  }

  // Lay each section opener (and the sheet before it, whose back is its left page) out once
  // while nothing else is happening, so a tab jump never lays out a cold sheet.
  function primeNext() {
    if (!S.prime) {
      S.prime = [];
      var seen = {};
      S.pages.forEach(function (p, k) {
        if (seen[p.section]) return;
        seen[p.section] = true;
        if (k > 0) S.prime.push(S.pages[k - 1]);
        S.prime.push(p);
      });
    }
    while (S.prime.length && (!S.prime[0].el.hidden || S.prime[0].el.classList.contains('leaf--warm'))) S.prime.shift();
    if (!S.prime.length) return;
    S.warmT = idle(function () {
      S.warmT = 0;
      if (S.turn || !S.prime.length) return;
      var p = S.prime.shift();
      p.el.classList.add('leaf--prime');
      raf(function () {
        raf(function () {
          p.el.classList.remove('leaf--prime');
          if (!S.turn && !S.warmT) primeNext();
        });
      });
    }, 3000);
  }

  /* ------------------------------------------------------------ navigation */

  function goTo(slug, opts) {
    opts = opts || {};
    if (!S.inited) return false;
    var p = resolve(slug);
    if (!p) return false;
    var to = S.pages.indexOf(p);
    if (S.turn) finishTurn();
    var from = S.index;

    if (S.open && opts.source !== 'router') {
      var sequential = (opts.source === 'key' || opts.source === 'swipe' || opts.source === 'step') && Math.abs(to - from) === 1;
      N.router.go(p.slug, { replace: !!opts.replace || opts.source === 'init' || sequential });
    } else if (S.open && opts.source === 'router' && N.router.current() !== p.slug) {
      N.router.go(p.slug, { replace: true });
    }

    if (to === from) {
      if (S.open && opts.focus !== false && opts.source !== 'init') focusHeading(p);
      return true;
    }

    S.index = to;
    updateChrome();

    var animate = opts.animate !== false && S.open && from >= 0 && !document.hidden;
    var done = function () { finalize(from, to, opts); };
    if (!animate) { setTurned(to > 0); done(); }
    else if (N.motion.reduced()) { setTurned(to > 0); crossfade(from, to, done); }
    else {
      // Going back to the first spread, the stack goes at the start so the inside cover is
      // revealed as the sheet lifts off it; leaving it, the stack appears as the sheet lands.
      if (to === 0) setTurned(false);
      turn(from, to, function () { setTurned(to > 0); done(); });
    }
    return true;
  }

  function finalize(from, to, opts) {
    S.turn = null;
    var a = S.pages[from], b = S.pages[to];
    setWarm(a ? a.el : null);
    applyLeaves();
    b.el.classList.remove('leaf--warm');
    S.els.book.classList.remove('is-turning');
    if (a && a !== b) callHook(a, 'onHide');
    if (S.open) {
      if (opts.focus !== false) focusHeading(b);
      announce(pageLabel(b));
    }
    cancelRaf(S.postRaf);
    S.postRaf = raf(function () {
      S.postRaf = 0;
      if (S.pages[S.index] !== b) return;
      updateMore(b);
      updateBackMore(S.pages[to - 1]);
      callHook(b, 'onShow');
      var prev = S.pages[to - 1];
      if (prev && prev.backBody) callHook(b, 'onShowFacing', prev.backBody);
      if (b.inline) callHook(b, 'onShowFacing', b.inline);
    });
    emit('change', { slug: b.slug, page: S.pub[to], from: a ? a.slug : null, source: opts.source || null });
  }

  function step(delta, opts) {
    // One page at a time, a page may be several screens long: move through those first (js/ui/fit.js).
    if (!S.turn && N.fit && N.fit.step && N.fit.step(delta)) return true;
    var i = S.index + delta; // S.index is already the destination of any turn in flight
    if (i < 0 || i >= S.pages.length) return false;
    opts = opts || {};
    if (!opts.source) opts.source = 'step';
    return goTo(S.pages[i].slug, opts);
  }

  /* ------------------------------------------------------------ page turn */

  var LEAF_KF = [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }];
  // Opacity lives on the faces (opacity on a preserve-3d leaf would flatten it).
  var FRONT_SHADE_KF = [{ opacity: 0 }, { opacity: 0.7, offset: 0.5 }, { opacity: 0.7 }];
  var BACK_SHADE_KF = [{ opacity: 0.8 }, { opacity: 0.8, offset: 0.5 }, { opacity: 0.12, offset: 0.85 }, { opacity: 0 }];
  var castCache = { key: '', v: null };

  // A sheet's stacking follows its side of the spine: `right` while it is over the right page,
  // `left` once it is past upright (the switch is edge-on, so it never shows).
  function stackFrames(right, left) {
    return [{ zIndex: right }, { zIndex: right, offset: 0.5 }, { zIndex: left, offset: 0.5 }, { zIndex: left }];
  }

  // Cast shadow on the sheet below, following the projected free edge of the lifted sheet.
  function castKeyframes(W, P) {
    var key = W + '|' + P;
    if (castCache.key === key) return castCache.v;
    var band = [], amb = [];
    var steps = 18;
    for (var k = 0; k <= steps; k++) {
      var p = k / steps;
      var th = Math.PI * p;
      var s = Math.sin(th), c = Math.cos(th);
      var x = W * c, z = W * s;
      var f = P / Math.max(1, P - z);
      var X = W / 2 + (x - W / 2) * f;
      var start = Math.max(0, Math.min(W, X));
      var spread = W * (0.05 + 0.3 * s);
      band.push({ offset: p, transform: 'translateX(' + start.toFixed(1) + 'px) scaleX(' + (spread / W).toFixed(4) + ')', opacity: Math.pow(s, 0.6).toFixed(3) });
      amb.push({ offset: p, opacity: (s * 0.9).toFixed(3) });
    }
    castCache = { key: key, v: { band: band, amb: amb } };
    return castCache.v;
  }

  // With direction:'reverse' the easing runs mirrored in time; mirror the curve back so a
  // backward turn has the same slow lift and gentle landing as a forward one.
  function mirrorEase(ease) {
    var m = /cubic-bezier\(([^)]+)\)/.exec(ease || '');
    if (!m) return ease;
    var v = m[1].split(',').map(parseFloat);
    if (v.length !== 4 || v.some(isNaN)) return ease;
    return 'cubic-bezier(' + [1 - v[2], 1 - v[3], 1 - v[0], 1 - v[1]].map(function (n) { return +n.toFixed(4); }).join(',') + ')';
  }

  function makeCast() {
    var band = h('div', { class: 'turn-cast__band' });
    var wrap = h('div', { class: 'turn-cast', 'aria-hidden': 'true' }, band);
    return { wrap: wrap, band: band };
  }

  function turn(from, to, done) {
    var fwd = to > from;
    var dist = Math.abs(to - from);
    var P = S.pages;
    // On long jumps one blank sheet riffles between the real ones (none on small screens).
    var riffle = dist >= 3 && !COARSE_MQ.matches;
    var m = S.m;
    var dur = m.dur, ease = m.ease;
    var cast = castKeyframes(m.W, m.P);

    // `flipping` is listed from the top of the right-hand stack to its bottom, as it ends up
    // (turning back) or starts out (turning forward).
    var flipping, bottom, under = null;
    if (fwd) {
      flipping = [P[from].el];
      if (riffle) flipping.push(S.riffles[0]);
      if (dist >= 2) flipping.push(P[to - 1].el);   // lands last: its back is the new left page
      bottom = P[to].el;
    } else {
      flipping = [P[to].el];
      if (riffle) flipping.push(S.riffles[0]);
      if (dist >= 2) flipping.push(P[from - 1].el); // the top sheet on the left lifts first
      bottom = P[from].el;
      under = to >= 1 ? P[to - 1].el : null;        // uncovered on the left as the sheets lift
    }
    var n = flipping.length;
    flipping.forEach(function (el) { el.hidden = false; });
    bottom.hidden = false;
    bottom.style.zIndex = '10';
    if (under) {
      under.hidden = false;
      under.inert = true;
      under.classList.add('leaf--left');
      under.style.zIndex = '0';
    }
    S.els.book.classList.add('is-turning');

    var anims = [];
    var lastEnd = 0, lastAnim = null;
    var castWrap = null;

    flipping.forEach(function (el, i) {
      var order = fwd ? i : (n - 1 - i);
      var delay = order * STAGGER;
      var opt = { duration: dur, delay: delay, easing: fwd ? ease : mirrorEase(ease), fill: 'both', direction: fwd ? 'normal' : 'reverse' };
      var a = el.animate(LEAF_KF, opt);
      anims.push(a);
      anims.push(el.animate(stackFrames(20 - i, 1 + i), opt));
      var fs = el.querySelector('.leaf__front > .leaf__shade');
      var bs = el.querySelector('.leaf__back > .leaf__shade');
      if (fs) anims.push(fs.animate(FRONT_SHADE_KF, opt));
      if (bs) anims.push(bs.animate(BACK_SHADE_KF, opt));
      // The sheet next to the page that stays on the right casts its shadow on it.
      if (i === n - 1) {
        var belowFront = bottom.querySelector('.leaf__front');
        if (belowFront) {
          var c = makeCast();
          belowFront.appendChild(c.wrap);
          castWrap = c.wrap;
          anims.push(c.wrap.animate(cast.amb, opt));
          anims.push(c.band.animate(cast.band, opt));
        }
      }
      if (delay + dur >= lastEnd) { lastEnd = delay + dur; lastAnim = a; }
    });

    var t = { done: false, timer: 0 };
    t.commit = function () {
      if (t.done) return;
      t.done = true;
      clearTimeout(t.timer);
      anims.forEach(function (x) { try { x.cancel(); } catch (e) { /* ignore */ } });
      if (castWrap && castWrap.parentNode) castWrap.parentNode.removeChild(castWrap);
      S.riffles.forEach(function (el) { el.hidden = true; });
      flipping.concat([bottom, under]).forEach(function (el) { if (el) el.style.zIndex = ''; });
      done();
    };
    if (lastAnim) lastAnim.onfinish = t.commit;
    t.timer = setTimeout(t.commit, lastEnd + 600); // safety net (throttled tabs etc.)
    S.turn = t;
  }

  function crossfade(from, to, done) {
    var A = S.pages[from].el, B = S.pages[to].el;
    B.hidden = false;
    B.style.zIndex = '12';
    A.style.zIndex = '11';
    S.els.book.classList.add('is-turning');
    var a = B.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear', fill: 'both' });
    var t = { done: false };
    t.commit = function () {
      if (t.done) return;
      t.done = true;
      clearTimeout(t.timer);
      try { a.cancel(); } catch (e) { /* ignore */ }
      A.style.zIndex = '';
      B.style.zIndex = '';
      done();
    };
    a.onfinish = t.commit;
    t.timer = setTimeout(t.commit, 800);
    S.turn = t;
  }

  function finishTurn() {
    if (S.turn) S.turn.commit();
  }

  /* ------------------------------------------------------------ open / closed */

  function applyState(open) {
    var els = S.els;
    els.leaves.inert = !open;
    setHidden(els.leaves, !open);
    els.tabs.inert = !open;
    setHidden(els.tabs, !open);
    els.inner.inert = !open;
    setHidden(els.inner, !open);
    els.cover.inert = open;
    els.cover.tabIndex = open ? -1 : 0;
    setHidden(els.cover, open);
    els.cover.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // Closed, the book always rests at the first spread under the cover (invisible to the reader).
  function rewindToFirst() {
    if (S.index <= 0 || !S.pages.length) { setTurned(false); return; }
    var from = S.index;
    S.index = 0;
    updateChrome();
    setTurned(false);
    finalize(from, 0, { focus: false, source: 'close' });
  }

  function setOpen(open, opts) {
    opts = opts || {};
    open = !!open;
    if (!S.inited) return;
    var was = S.open;
    if (!open && S.turn) finishTurn();
    S.open = open;
    S.els.book.classList.remove('is-leaving');
    S.els.app.dataset.state = open ? 'open' : 'closed';
    applyState(open);
    measure();
    var p = S.pages[S.index];
    if (open) {
      if (p) N.router.go(p.slug, { replace: true });
      if (opts.focus !== false) focusHeading(p);
      if (!was) {
        announce('Notebook opened. ' + pageLabel(p));
        emit('open', { slug: p ? p.slug : null, instant: !!opts.instant });
      }
    } else {
      N.router.clear();
      rewindToFirst();
      if (opts.focus !== false) { try { S.els.cover.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      if (was) {
        announce('Notebook closed.');
        emit('close', { instant: !!opts.instant });
      }
    }
  }

  function setState(state) {
    if (['closed', 'opening', 'open', 'closing'].indexOf(state) < 0) return;
    S.els.app.dataset.state = state;
  }

  function busy() {
    var st = S.els.app && S.els.app.dataset.state;
    return st === 'opening' || st === 'closing';
  }

  function requestOpen() {
    if (!S.inited || S.open || busy()) return;
    if (N.scene && typeof N.scene.open === 'function') {
      try { N.scene.open(); return; } catch (e) { console.error('[notebook] scene.open failed', e); }
    }
    setOpen(true);
  }

  function requestClose() {
    if (!S.inited || !S.open || busy()) return;
    if (S.turn) finishTurn();
    // The left page fades first, so the board beneath it can swing shut on its own.
    S.els.book.classList.add('is-leaving');
    if (N.scene && typeof N.scene.close === 'function') {
      try { N.scene.close(); return; } catch (e) { console.error('[notebook] scene.close failed', e); }
    }
    setOpen(false);
  }

  /* ------------------------------------------------------------ input */

  function isEditable(t) {
    if (!t || t.nodeType !== 1) return false;
    var tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
  }

  function inHorizontalScroller(t) {
    var stop = S.els.leaves;
    for (var el = t; el && el.nodeType === 1 && el !== stop && el !== document.body; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth + 2) {
        var ox = getComputedStyle(el).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
    }
    return false;
  }

  function viewerOpen() {
    if (N.viewer && typeof N.viewer.isOpen === 'function') {
      try { if (N.viewer.isOpen()) return true; } catch (e) { /* ignore */ }
    }
    return !!document.querySelector('dialog[open], [data-viewer-open="true"], .viewer.is-open');
  }

  function onKeydown(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var state = S.els.app.dataset.state;
    var t = e.target;
    if (state !== 'open') {
      if (state === 'closed' && e.key === 'Enter' && (!t || t === document.body || t === document.documentElement)) {
        e.preventDefault();
        requestOpen();
      }
      return;
    }
    if (viewerOpen() || isEditable(t)) return;
    var inTabs = S.els.tabs.contains(t);
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      if (!inTabs && inHorizontalScroller(t)) return;
      e.preventDefault();
      step(k === 'ArrowRight' ? 1 : -1, { source: 'key' });
    } else if (k === 'PageDown' || k === 'PageUp') {
      var dir = k === 'PageDown' ? 1 : -1;
      var p = S.pages[S.index];
      var sc = p && p.body;
      e.preventDefault();
      if (sc && !S.turn && sc.scrollHeight > sc.clientHeight + 2) {
        var atEnd = dir > 0 ? sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2 : sc.scrollTop <= 1;
        if (!atEnd) {
          sc.scrollBy({ top: dir * sc.clientHeight * 0.85, behavior: N.motion.reduced() ? 'auto' : 'smooth' });
          return;
        }
      }
      step(dir, { source: 'key' });
    } else if (k === 'Home' || k === 'End') {
      e.preventDefault();
      goTo(S.pages[k === 'Home' ? 0 : S.pages.length - 1].slug, { source: 'jump' });
    }
  }

  function wireSwipe() {
    var el = S.els.leaves;
    el.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { S.touch = null; return; }
      var t = e.touches[0];
      S.touch = { x: t.clientX, y: t.clientY, t: Date.now(), locked: inHorizontalScroller(e.target) };
    }, { passive: true });
    el.addEventListener('touchcancel', function () { S.touch = null; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      var s = S.touch;
      S.touch = null;
      if (!s || s.locked || !S.open || viewerOpen()) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - s.x, dy = t.clientY - s.y;
      if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - s.t < 900) {
        step(dx < 0 ? 1 : -1, { source: 'swipe' });
      }
    }, { passive: true });
  }

  function onRoute(slug) {
    if (!slug) return;
    var p = resolve(slug);
    if (!p) {
      if (S.open && S.pages[S.index]) N.router.go(S.pages[S.index].slug, { replace: true });
      return;
    }
    if (!S.open) {
      if (busy()) return;
      goTo(p.slug, { animate: false, source: 'router', focus: false });
      setOpen(true, { instant: true });
      return;
    }
    goTo(p.slug, { source: 'router' });
  }

  /* ------------------------------------------------------------ init */

  function init() {
    if (S.inited) return;
    var els = S.els;
    els.app = document.getElementById('app');
    els.camera = document.getElementById('camera');
    els.book = document.getElementById('book');
    els.leaves = document.getElementById('notebook');
    els.cover = document.getElementById('cover');
    els.status = document.getElementById('status');
    els.block = N.qs('.book__block', els.book);
    els.inner = N.qs('.book__inner-cover', els.book);
    els.tabs = N.qs('.book__tabs', els.book);
    if (!els.app || !els.book || !els.leaves || !els.tabs || !els.inner || !els.cover) {
      console.error('[notebook] required markup is missing from index.html');
      return;
    }
    S.inited = true;

    buildBlock();
    buildInnerCover();
    assemble();
    buildRiffles();
    buildTabs();

    S.index = 0;
    setTurned(false);
    measure();
    applyLeaves();
    updateChrome();
    applyState(false);
    S.els.app.dataset.state = 'closed';
    callHook(S.pages[0], 'onShow');
    if (S.pages[0].inline) callHook(S.pages[0], 'onShowFacing', S.pages[0].inline);
    setWarm(null);

    document.addEventListener('keydown', onKeydown);
    wireSwipe();
    N.router.onChange(onRoute);
    var resizeRaf = 0;
    var onResize = function () {
      if (resizeRaf) return;
      resizeRaf = raf(function () { resizeRaf = 0; measure(); });
    };
    window.addEventListener('resize', onResize);
    if (SIDE_TABS_MQ.addEventListener) SIDE_TABS_MQ.addEventListener('change', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize, function () {});
  }

  N.book = {
    init: init,
    pages: function () { return S.pub.slice(); },
    goTo: goTo,
    next: function (opts) { return step(1, opts); },
    prev: function (opts) { return step(-1, opts); },
    first: function (opts) { return S.pages.length ? goTo(S.pages[0].slug, opts) : false; },
    last: function (opts) { return S.pages.length ? goTo(S.pages[S.pages.length - 1].slug, opts) : false; },
    current: function () { var p = S.pages[S.index]; return p ? p.slug : null; },
    setOpen: setOpen,
    isOpen: function () { return S.open; },
    on: on,
    setState: setState,
    requestOpen: requestOpen,
    requestClose: requestClose,
    resolve: function (slug) { var p = resolve(slug); return p ? S.pub[S.pages.indexOf(p)] : null; },
    pageNumber: function (slug) { var p = resolve(slug); return p && p.slug === String(slug) ? p.number : null; },
    isTurning: function () { return !!S.turn; },
    sideTabs: function () { return SIDE_TABS_MQ.matches; },
    isTurned: function () { return S.turned; },
    isSpread: function () { return S.spread; },
    refresh: measure
  };
})(window.Notebook);
