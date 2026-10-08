window.Notebook = window.Notebook || {};

/* ==========================================================================
   pages/notes.js — "Notes & writing", a contents page. Owned by PAGES-D.

   Reads Notebook.data.blogs. Empty today: a ruled contents page with its
   printed column heads and one quiet line, "No entries yet." With entries,
   a dated contents list (date · title → external link · summary · tags),
   continued on 'notes/2' … only if one page cannot hold them.

   The writing sits ON the ruled lines: after the page is shown, the heading
   and the contents are nudged so their baselines land on the ruling that
   paper.css prints for grid:'rule' (28px bands, line in the last pixel).
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;
  var SECTION = 'notes';

  var RULE = 28;        // paper.css .leaf__body[data-grid="rule"]: 28px ruling …
  var LINE_AT = 27;     // … with the line drawn in the last pixel of each band
  var SIT = 3;          // a baseline sits this far above its line

  // Pagination, in ruled lines (a 1440×900 page holds about 20 below the heads).
  var LINES_FIRST = 18;
  var LINES_NEXT = 20;

  function present(v) { return N.ui && N.ui.present ? N.ui.present(v) : !!v; }

  function sectionTab(data) {
    var secs = (data.site && data.site.sections) || [];
    for (var i = 0; i < secs.length; i++) if (secs[i].id === SECTION) return secs[i].tab || SECTION;
    return 'Notes';
  }

  /* ------------------------------------------------------------ pagination */

  function entryLines(e) {
    var n = Math.max(1, Math.ceil(String(e.title).length / 46));
    if (present(e.summary)) n += Math.max(1, Math.ceil(String(e.summary).length / 64));
    if (present(e.tags)) n += 1;
    return n + 1; // + the blank line that follows an entry
  }

  function paginate(entries) {
    var pages = [[]];
    var used = 0;
    var budget = LINES_FIRST;
    entries.forEach(function (e) {
      var n = entryLines(e);
      if (used > 0 && used + n > budget + 1) { pages.push([]); used = 0; budget = LINES_NEXT; }
      pages[pages.length - 1].push(e);
      used += n;
    });
    return pages;
  }

  function slugFor(i) { return i === 0 ? SECTION : SECTION + '/' + (i + 1); }

  /* ------------------------------------------------------------ pieces */

  function probe() { return h('span', { class: 'notes__probe', 'aria-hidden': 'true' }); }

  function entry(e, ui) {
    var title = present(e.url)
      ? ui.link(e.url, e.title, { external: true, className: 'note__link' })
      : e.title;
    var tags = (e.tags || []).filter(present);
    return h('li', { class: 'note', id: present(e.id) ? 'note-' + N.slugify(e.id) : null },
      h('p', { class: 'note__date' },
        e.date && present(e.date.label)
          ? h('time', { datetime: present(e.date.iso) ? e.date.iso : null }, e.date.label)
          : null),
      h('div', { class: 'note__main' },
        h('h3', { class: 'note__title' }, title),
        present(e.summary) ? h('p', { class: 'note__summary' }, e.summary) : null,
        tags.length ? h('p', { class: 'note__tags' }, tags.map(function (t, i) {
          return i ? [h('span', { class: 'sep', 'aria-hidden': 'true' }, ' · '), t] : t;
        })) : null));
  }

  /* ------------------------------------------------------------ ruling */

  function ruleOffset(body) {
    var ys = String(getComputedStyle(body).backgroundPositionY || '').split(',');
    var y = parseFloat(ys[ys.length - 1]);
    return isNaN(y) ? 14 : y;
  }

  function mod(a) { return ((a % RULE) + RULE) % RULE; }

  // Layout position (not visual: immune to the page-turn transform) of an element
  // inside the page body, in the body's scrolled content coordinates.
  function yIn(el, body) {
    var y = 0;
    var n = el;
    while (n && n !== body) {
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return n === body ? y : NaN;
  }

  function snap(root) {
    var body = root && root.closest('.leaf__body');
    if (!body || body.getAttribute('data-grid') !== 'rule' || !body.getClientRects().length) return;
    var head = N.qs('.page-header', root);
    var box = N.qs('.notes__contents', root);
    var hp = N.qs('.page-header .notes__probe', root);
    var bp = N.qs('.notes__contents .notes__probe', root);
    if (!box || !bp) return;
    var line0 = ruleOffset(body) + LINE_AT;
    var y = function (el) { var v = yIn(el, body); return isNaN(v) ? el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop : v; };

    root.style.paddingTop = '0px';
    box.style.paddingTop = '0px';
    if (head && hp) root.style.paddingTop = mod(line0 - SIT - y(hp)).toFixed(2) + 'px';
    var pad = mod(line0 - SIT - y(bp)).toFixed(2) + 'px';
    box.style.paddingTop = pad;
    box.style.setProperty('--notes-pad', pad);
    root.classList.add('is-ruled');
  }

  // Align as soon as the leaf is revealed (the start of a page turn), so the
  // writing never settles onto its lines after the page has landed.
  function watchLeaf(root) {
    setTimeout(function () {
      var leaf = root.closest && root.closest('.leaf');
      if (!leaf || typeof MutationObserver !== 'function') return;
      new MutationObserver(function () { if (!leaf.hidden) snap(root); })
        .observe(leaf, { attributes: true, attributeFilter: ['hidden'] });
      if (!leaf.hidden) snap(root);
    }, 0);
  }

  /* ------------------------------------------------------------ register */

  N.pages.register(SECTION, function (data, ui) {
    var entries = (Array.isArray(data.blogs) ? data.blogs : []).filter(function (e) { return e && present(e.title); });
    var tab = sectionTab(data);
    var title = 'Notes & writing';
    var chunks = entries.length ? paginate(entries) : [[]];
    var roots = [];

    var resizeT = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { roots.forEach(snap); }, 120);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { roots.forEach(snap); }, function () {});

    return chunks.map(function (list, i) {
      return {
        slug: slugFor(i),
        title: i === 0 ? title : title + ', continued',
        running: i === 0 ? tab : tab + ' · continued',
        grid: 'rule',
        build: function () {
          var meta = null;
          if (i === 0 && entries.length) meta = entries.length + (entries.length === 1 ? ' entry' : ' entries');
          if (i > 0) {
            var prev = ui.pageRef(slugFor(i - 1), { text: 'Continued from' });
            meta = prev ? h('span', null, prev) : null;
          }
          var header = ui.pageHeader({ eyebrow: 'Contents', title: i === 0 ? title : title + ', continued', meta: meta, opener: i === 0 });
          var h2 = N.qs('h2', header);
          if (h2) h2.appendChild(probe());

          var heads = h('div', { class: 'notes__heads', 'aria-hidden': 'true' },
            h('span', { class: 'notes__head notes__head--date' }, probe(), 'Date'),
            h('span', { class: 'notes__head' }, 'Title'));

          var body = list.length
            ? h('ol', { class: 'notes__list', 'aria-label': 'Entries' }, list.map(function (e) { return entry(e, ui); }))
            : h('p', { class: 'notes__empty' }, 'No entries yet.');

          var next = i < chunks.length - 1 ? ui.pageRef(slugFor(i + 1), { text: 'Continued on' }) : null;

          var root = h('section', { class: ['notes', list.length ? 'notes--list' : 'notes--empty'] },
            header,
            h('div', { class: 'notes__contents' }, heads, body,
              next ? h('p', { class: 'notes__turn' }, next) : null));
          roots.push(root);
          watchLeaf(root);
          return root;
        },
        onShow: function (pageEl) { snap(N.qs('.notes', pageEl)); }
      };
    });
  });
})(window.Notebook);
