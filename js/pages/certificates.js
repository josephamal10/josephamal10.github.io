window.Notebook = window.Notebook || {};

/* ==========================================================================
   pages/certificates.js — "Evidence": the documents kept in the notebook.
   Owned by PAGES-D.

   An archival register grouped by Notebook.data.certificates.groups. Each
   document is tucked into slit corners on the page (the conference paper
   certificate is clipped, a little larger) and opens in Notebook.viewer.
   Register pages are filled in turn (a new one only when the one before would
   otherwise need to scroll) and bound two to a spread, left and right:
   'certificates' (+ 'certificates/2' …). Every fact comes from Notebook.data.

   Rows carry data-cert-id / data-cert so other sections can find the page
   that holds a document. Thumbnails load only when their page is shown.
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;
  var SECTION = 'certificates';

  // Pagination budget, in "row units" (one standard register row = 1).
  // Tuned so each page fits a 1440×900 desk without scrolling; the page body
  // scales with the page width, so the same budget holds at other sizes.
  var BUDGET_FIRST = 8.9;   // the opener page carries the larger section header
  var BUDGET_NEXT = 10.2;
  var W_GROUP = 0.62;       // group rule
  var W_ROW = 1;
  var W_ROW_COURSES = 1.25; // row with a "courses included" line
  var W_FEATURE = 3.35;     // clipped, larger document

  var PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  function present(v) { return N.ui && N.ui.present ? N.ui.present(v) : !!v; }

  function sectionTab(data) {
    var secs = (data.site && data.site.sections) || [];
    for (var i = 0; i < secs.length; i++) if (secs[i].id === SECTION) return secs[i].tab || SECTION;
    return 'Certificates';
  }

  function isFeatured(item) { return present(item.event); }

  function itemWeight(item) {
    if (isFeatured(item)) return W_FEATURE;
    return (item.courses && item.courses.length) ? W_ROW_COURSES : W_ROW;
  }

  /* ------------------------------------------------------------ pagination */

  // Greedy, keeping a group together whenever it fits on a fresh page;
  // a group longer than a page continues on the next one.
  // Register pages come in pairs (a left and a right page), the documents shared out
  // evenly between them, so the last page of the register is never left nearly empty.
  function paginate(groups) {
    var pages = fill(groups, 1);
    if (pages.length < 2) return pages;
    // of the splits into an even number of pages, keep the one whose fullest and emptiest pages are closest
    var want = pages.length + pages.length % 2;
    var best = pages.length === want ? pages : null;
    var bestSpread = best ? loadSpread(best) : Infinity;
    for (var k = 1; k > 0.4; k -= 0.02) {
      var tryPages = fill(groups, k, true);
      if (tryPages.length > want) break;
      if (tryPages.length !== want) continue;
      var spread = loadSpread(tryPages);
      if (spread < bestSpread) { bestSpread = spread; best = tryPages; }
    }
    return best || pages;
  }

  function loadSpread(pages) {
    var loads = pages.map(function (pg, i) {
      var w = pg.reduce(function (sum, part) {
        return sum + W_GROUP + part.items.reduce(function (t, it) { return t + itemWeight(it); }, 0);
      }, 0);
      return w / (i ? BUDGET_NEXT : BUDGET_FIRST);
    });
    return Math.max.apply(null, loads) - Math.min.apply(null, loads);
  }

  function fill(groups, scale, loose) {
    var pages = [[]];
    var used = 0;
    var budget = BUDGET_FIRST * scale;

    function newPage() { pages.push([]); used = 0; budget = BUDGET_NEXT * scale; }
    function current() { return pages[pages.length - 1]; }

    groups.forEach(function (g) {
      var items = (g.items || []).filter(function (it) { return it && present(it.title); });
      if (!items.length) return;
      var total = W_GROUP + items.reduce(function (s, it) { return s + itemWeight(it); }, 0);
      if (!loose && used > 0 && used + total > budget && total <= BUDGET_NEXT * scale) newPage();
      var part = null;
      items.forEach(function (it) {
        var w = itemWeight(it);
        if (!part) {
          if (used > 0 && used + W_GROUP + w > budget) newPage();
          part = { group: g, items: [], continued: false };
          current().push(part);
          used += W_GROUP;
        } else if (used + w > budget) {
          newPage();
          part = { group: g, items: [], continued: true };
          current().push(part);
          used += W_GROUP;
        }
        part.items.push(it);
        used += w;
      });
    });
    return pages.filter(function (p) { return p.length; });
  }

  function slugFor(i) { return i === 0 ? SECTION : SECTION + '/' + (i + 1); }

  /* ------------------------------------------------------------ cross references */

  function findPage(pred) {
    if (!N.book || typeof N.book.pages !== 'function') return null;
    var pages = N.book.pages();
    for (var i = 0; i < pages.length; i++) if (pred(pages[i])) return pages[i];
    return null;
  }

  function projectPage(projectId) {
    if (!present(projectId)) return null;
    return findPage(function (p) { return p.slug === 'projects/' + projectId; }) ||
      findPage(function (p) { return p.section === 'projects' && p.slug.split('/').pop() === projectId; });
  }

  function refLink(page, text, labelText) {
    if (!page) return null;
    return h('a', {
      class: 'page-ref',
      href: N.router ? N.router.href(page.slug) : '#/' + page.slug,
      'aria-label': (labelText ? labelText + ', ' : '') + 'page ' + page.number + ': ' + page.title
    }, text ? [text, ' '] : null, h('span', { class: 'page-ref__num' }, 'p. ' + page.number));
  }

  // "p. 5" or "pp. 4–5" for the register pages that hold the given documents.
  function pagesLabel(nums) {
    nums = nums.filter(function (n, i) { return n && nums.indexOf(n) === i; }).sort(function (a, b) { return a - b; });
    if (!nums.length) return null;
    if (nums.length === 1) return 'p. ' + nums[0];
    return 'pp. ' + nums[0] + '–' + nums[nums.length - 1];
  }

  /* ------------------------------------------------------------ pieces */

  function openViewer(item, trigger) {
    if (N.viewer && typeof N.viewer.open === 'function') N.viewer.open(item.id, { trigger: trigger });
    else if (item.pdf) window.open(item.pdf, '_blank', 'noopener');
  }

  function docIcon() {
    var S = N.svg;
    return S('svg', { class: 'cert__open-icon', viewBox: '0 0 12 14', 'aria-hidden': 'true', focusable: 'false' },
      S('path', { d: 'M1.5 1.5h6l3 3v8h-9z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.1', 'stroke-linejoin': 'round' }),
      S('path', { d: 'M7.5 1.5v3h3', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.1', 'stroke-linejoin': 'round' }),
      S('path', { d: 'M3.6 7.4h4.8M3.6 9.6h3.4', fill: 'none', stroke: 'currentColor', 'stroke-width': '1', 'stroke-linecap': 'round', opacity: '.7' }));
  }

  function openButton(item) {
    var btn = h('button', { type: 'button', class: 'cert__open', 'aria-haspopup': 'dialog' },
      docIcon(),
      h('span', { class: 'cert__open-text' }, 'View document'),
      h('span', { class: 'visually-hidden' }, ': ' + item.title));
    btn.addEventListener('click', function () { openViewer(item, btn); });
    return btn;
  }

  // The whole entry opens its document: a tap anywhere on it (except another link or button).
  function tapToOpen(li, item, btn) {
    li.classList.add('cert--tap');
    li.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('a, button, .cert-doc')) return;
      openViewer(item, btn);
    });
    return li;
  }

  function dateEl(date, cls) {
    if (!date || !present(date.label)) return null;
    return h('time', { class: cls, datetime: present(date.iso) ? date.iso : null }, date.label);
  }

  function thumbAlt(item) {
    return present(item.type) ? 'Thumbnail of the ' + String(item.type).toLowerCase() : 'Thumbnail of the document';
  }

  function thumbImg(item, cls) {
    return h('img', {
      class: cls,
      src: PIXEL,
      'data-src': item.thumb,
      alt: thumbAlt(item),
      loading: 'lazy',
      decoding: 'async',
      draggable: 'false'
    });
  }

  // A document tucked into two die-cut slit corners.
  function tuckedDoc(item, trigger) {
    var img = thumbImg(item, 'cert-doc__img');
    var doc = h('span', { class: 'cert-doc cert-doc--tucked', 'data-cert-thumb': item.id },
      h('span', { class: 'cert-doc__sheet' }, img),
      h('span', { class: 'cert-doc__slit cert-doc__slit--tl', 'aria-hidden': 'true' }),
      h('span', { class: 'cert-doc__slit cert-doc__slit--br', 'aria-hidden': 'true' }));
    doc.addEventListener('click', function () { openViewer(item, trigger()); });
    return doc;
  }

  // The featured document, held by the notebook's paper clip (ui.figure).
  function clippedDoc(item, ui, trigger) {
    var fig = ui.figure({ src: PIXEL, alt: thumbAlt(item), style: 'clipped', rotate: -1.4, className: 'cert-feature__fig' });
    if (!fig) return null;
    var img = N.qs('img', fig);
    img.setAttribute('data-src', item.thumb);
    // Larger than the other thumbnails: let HiDPI screens take the full scan.
    if (present(item.image)) {
      img.setAttribute('data-srcset', item.thumb + ' 360w, ' + item.image + ' 1400w');
      img.setAttribute('sizes', '(max-width: 599px) 80vw, 15rem');
    }
    img.setAttribute('draggable', 'false');
    img.classList.add('cert-doc__img');
    fig.setAttribute('data-cert-thumb', item.id);
    fig.classList.add('cert-doc', 'cert-doc--clipped');
    N.qs('.figure__mount', fig).addEventListener('click', function () { openViewer(item, trigger()); });
    return fig;
  }

  function featureRow(item, ui) {
    var btn = openButton(item);
    var proj = projectPage(item.project);
    var note = null;
    if (proj) {
      note = h('a', {
        class: 'cert-feature__note',
        href: N.router ? N.router.href(proj.slug) : '#/' + proj.slug,
        'aria-label': 'See the project, page ' + proj.number + ': ' + proj.title
      }, ui.annotation('see the project, p. ' + proj.number, { rotate: -2.5, place: 'inline' }));
    }
    return tapToOpen(h('li', { class: 'cert cert--feature', id: 'reg-' + item.id, 'data-cert-id': item.id, 'data-cert': item.id },
      h('div', { class: 'cert__docs' }, clippedDoc(item, ui, function () { return btn; }), note),
      h('div', { class: 'cert__body' },
        present(item.type) ? h('p', { class: 'cert__type' }, item.type) : null,
        h('h4', { class: 'cert__title' }, item.title),
        present(item.event) ? h('p', { class: 'cert__line' }, item.event) : null,
        present(item.issuer) ? h('p', { class: 'cert__line cert__line--issuer' }, item.issuer) : null,
        h('div', { class: 'cert__actions' }, dateEl(item.date, 'cert__date'), btn)
      )), item, btn);
  }

  function row(item, ctx) {
    var btn = openButton(item);
    var meta = [item.type, item.issuer].filter(present);
    var includes = null;
    if (item.courses && item.courses.length) {
      var n = item.courses.length;
      var ref = null;
      var nums = [];
      item.courses.forEach(function (title) {
        var hit = ctx.byTitle[title];
        if (hit && hit.id !== item.id && ctx.pageOf[hit.id] != null) nums.push(ctx.pageNums[ctx.pageOf[hit.id]]);
      });
      var label = pagesLabel(nums);
      if (label) {
        var target = null;
        for (var k = 0; k < item.courses.length; k++) {
          var hit2 = ctx.byTitle[item.courses[k]];
          if (hit2 && hit2.id !== item.id && ctx.pageOf[hit2.id] != null) { target = slugFor(ctx.pageOf[hit2.id]); break; }
        }
        var tp = findPage(function (p) { return p.slug === target; });
        if (tp) {
          ref = h('a', {
            class: 'page-ref',
            href: N.router ? N.router.href(tp.slug) : '#/' + tp.slug,
            'aria-label': 'Course certificates filed on ' + label.replace('pp. ', 'pages ').replace('p. ', 'page ')
          }, h('span', { class: 'page-ref__num' }, label));
        }
      }
      includes = h('p', { class: 'cert__includes' },
        n + (n === 1 ? ' course included' : ' courses included'),
        ref ? [h('span', { class: 'sep', 'aria-hidden': 'true' }, ' · '), 'filed on ', ref] : null);
    }
    // Grid areas: doc | title · date / meta · action (a row with a course list
    // lets its meta run under the date and puts the action beside the list).
    return tapToOpen(h('li', { class: ['cert', includes ? 'cert--courses' : null], id: 'reg-' + item.id, 'data-cert-id': item.id, 'data-cert': item.id },
      tuckedDoc(item, function () { return btn; }),
      h('h4', { class: 'cert__title' }, item.title),
      dateEl(item.date, 'cert__date'),
      meta.length ? h('p', { class: 'cert__meta' }, meta.map(function (m, i) {
        var part = h('span', { class: 'cert__meta-part' }, m);
        return i ? [h('span', { class: 'sep', 'aria-hidden': 'true' }, ' · '), part] : part;
      })) : null,
      includes,
      h('div', { class: 'cert__act' }, btn)), item, btn);
  }

  function groupBlock(part, ui, ctx) {
    var g = part.group;
    var id = ui.uid('cert-group');
    var count = (g.items || []).filter(function (it) { return it && present(it.title); }).length;
    var feature = part.items.length === 1 && isFeatured(part.items[0]);
    return h('section', { class: ['cert-group', feature ? 'cert-group--feature' : null], 'aria-labelledby': id },
      h('h3', { class: 'cert-group__head', id: id },
        h('span', { class: 'cert-group__label' }, g.label || ''),
        part.continued ? h('span', { class: 'cert-group__cont' }, ' (continued)') : null,
        h('span', { class: 'cert-group__line', 'aria-hidden': 'true' }),
        h('span', { class: 'cert-group__count', 'aria-hidden': 'true' }, String(count)),
        h('span', { class: 'visually-hidden' }, ', ' + count + (count === 1 ? ' document' : ' documents'))),
      h('ol', { class: 'cert-list' },
        part.items.map(function (it) { return isFeatured(it) ? featureRow(it, ui) : row(it, ctx); })));
  }

  /* ------------------------------------------------------------ lazy thumbnails */

  function loadThumbs(root) {
    N.qsa('img[data-src]', root).forEach(function (img) {
      var src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
      var holder = img.closest('.cert-doc');
      var done = function () {
        if (img.naturalWidth > 1 && img.naturalHeight > 1) {
          var ar = (img.naturalWidth / img.naturalHeight).toFixed(4);
          img.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
          if (holder) holder.style.setProperty('--ar', ar);
        }
        if (holder) holder.classList.add('is-loaded');
      };
      img.addEventListener('load', function onLoad() {
        if (img.getAttribute('src') === PIXEL && !img.srcset) return;
        img.removeEventListener('load', onLoad);
        done();
      });
      img.addEventListener('error', function () { if (holder) holder.classList.add('is-failed'); }, { once: true });
      var srcset = img.getAttribute('data-srcset');
      if (srcset) { img.removeAttribute('data-srcset'); img.srcset = srcset; }
      img.src = src;
      if (img.complete && img.naturalWidth > 1) done();
    });
  }

  // Load a page's documents the moment its leaf is revealed, i.e. as a page turn
  // starts (onShow only fires once the turn has landed).
  function watchLeaf(root) {
    setTimeout(function () {
      var leaf = root.closest && root.closest('.leaf');
      if (!leaf || typeof MutationObserver !== 'function') return;
      if (!leaf.hidden) loadThumbs(leaf);
      var mo = new MutationObserver(function () {
        if (leaf.hidden) return;
        loadThumbs(leaf);
        if (!N.qs('img[data-src]', leaf)) mo.disconnect();
      });
      mo.observe(leaf, { attributes: true, attributeFilter: ['hidden'] });
    }, 0);
  }

  /* ------------------------------------------------------------ register */

  // The register pages are laid out two to a spread: left page, right page.
  N.pages.register(SECTION, function (data, ui) {
    var certs = data.certificates || {};
    var groups = (certs.groups || []).filter(function (g) { return g && g.items && g.items.length; });
    var tab = sectionTab(data);
    var chunks = paginate(groups);
    if (!chunks.length) chunks = [[]];
    var spreads = [];
    for (var k = 0; k < chunks.length; k += 2) spreads.push({ left: k, right: k + 1 < chunks.length ? k + 1 : null });

    var all = [];
    groups.forEach(function (g) { (g.items || []).forEach(function (it) { if (it && present(it.title)) all.push(it); }); });

    var ctx = { byTitle: {}, pageOf: {}, pageNums: [] };
    all.forEach(function (it) { if (!ctx.byTitle[it.title]) ctx.byTitle[it.title] = it; });
    // Prefer course certificates (items without their own course list) when titles repeat.
    all.forEach(function (it) { if (!(it.courses && it.courses.length)) ctx.byTitle[it.title] = it; });
    // pageOf: the spread that holds each document; pageNums: the page each register page is on.
    chunks.forEach(function (parts, i) {
      parts.forEach(function (part) { part.items.forEach(function (it) { ctx.pageOf[it.id] = Math.floor(i / 2); }); });
    });

    var groupCount = groups.filter(function (g) { return (g.items || []).some(function (it) { return it && present(it.title); }); }).length;

    // On the first page of a long register: each group, how many documents, and its page.
    function groupIndex() {
      var rows = [];
      groups.forEach(function (g) {
        var n = (g.items || []).filter(function (it) { return it && present(it.title); }).length;
        if (!n) return;
        var at = -1;
        chunks.forEach(function (parts, ci) { if (at < 0 && parts.some(function (pt) { return pt.group.id === g.id; })) at = ci; });
        var pg = at >= 0 ? findPage(function (x) { return x.slug === slugFor(Math.floor(at / 2)); }) : null;
        var num = pg ? (at % 2 === 0 ? pg.pageNo.left : pg.pageNo.right) : null;
        rows.push(h('li', { class: 'certs-index__row' },
          h('span', { class: 'certs-index__label' }, g.label || ''),
          h('span', { class: 'certs-index__lead', 'aria-hidden': 'true' }),
          h('span', { class: 'certs-index__count' }, n + (n === 1 ? ' document' : ' documents')),
          num ? h('a', { class: 'page-ref certs-index__page', href: N.router ? N.router.href(pg.slug) : '#/' + pg.slug }, 'p. ' + num) : null));
      });
      if (rows.length < 2) return null;
      return h('nav', { class: 'certs-index', 'aria-label': 'Certificate groups' }, h('ul', null, rows));
    }

    function registerPage(i, onLeft) {
      ctx.pageNums = spreads.map(function (_, k) { return ui.pageNumber(slugFor(k)); });
      var header;
      if (i === 0) {
        var meta = [];
        if (all.length) meta.push(all.length + (all.length === 1 ? ' document' : ' documents'));
        if (groupCount > 1) meta.push(groupCount + ' groups');
        header = ui.pageHeader({ eyebrow: 'Evidence', title: tab, meta: meta, opener: true });
      } else {
        // A register page opposite the one before it needs no 'continued from'.
        header = ui.pageHeader({ eyebrow: 'Evidence', title: tab + ', continued' });
        if (!onLeft) header.classList.add('certs__header--quiet');
      }
      var nextSpread = !onLeft && Math.floor(i / 2) + 1 < spreads.length ? Math.floor(i / 2) + 1 : null;
      var next = nextSpread !== null ? findPage(function (p) { return p.slug === slugFor(nextSpread); }) : null;
      var root = h('div', { class: ['certs', i === 0 ? 'certs--first' : 'certs--cont'] },
        header,
        i === 0 && chunks.length > 2 ? groupIndex() : null,
        h('div', { class: 'certs__register' }, chunks[i].map(function (part) { return groupBlock(part, ui, ctx); })),
        next ? h('p', { class: 'certs__turn' }, 'Continued on ', refLink(next, null, 'Continued on'), h('span', { class: 'certs__turn-arrow', 'aria-hidden': 'true' }, ' \u2192')) : null
      );
      watchLeaf(root);
      return root;
    }

    return spreads.map(function (sp, k) {
      return {
        slug: slugFor(k),
        title: k === 0 ? tab : tab + ', continued',
        running: k === 0 ? tab : tab + ' \u00b7 continued',
        facingRunning: k === 0 ? tab : tab + ' \u00b7 continued',
        facing: function () { return registerPage(sp.left, true); },
        build: sp.right !== null ? function () { return registerPage(sp.right, false); }
          : function () { return h('div', { class: 'certs certs--end' }); },
        onShow: function (pageEl) { loadThumbs(pageEl); },
        onShowFacing: function (el) { loadThumbs(el); }
      };
    });
  });
})(window.Notebook);
