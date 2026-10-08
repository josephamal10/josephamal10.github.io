window.Notebook = window.Notebook || {};

/* ==========================================================================
   pages/skills.js — Skills section. Owned by PAGES-C.
   One spread, 'skills', like the index at the back of a reference book.
   - the groups of Notebook.data.skills.groups as index columns, shared over both pages
     (first half left, the rest right); items listed in skills.usedIn carry a leader and
     the real project page ("p. N")
   - right page, after the index: "Studied through certification" (skills.studied) with
     "Certificates p. N", and the soft skills as a quieter run-in list
   No bars, no percentages, nothing that is not in the data.
   Styles: css/pages/skills.css (scoped under .sk).
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;
  var SECTION = 'skills';
  var REFS = [];

  function present(v) {
    if (N.ui && N.ui.present) return N.ui.present(v);
    return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length);
  }

  /* ------------------------------------------------------------ page lookup */

  function pages() { return (N.book && typeof N.book.pages === 'function') ? N.book.pages() : []; }
  function inSection(id) { return pages().filter(function (p) { return p.section === id; }); }
  function bySlug(slug) { var l = pages(); for (var i = 0; i < l.length; i++) if (l[i].slug === slug) return l[i]; return null; }
  function esc(v) { return (window.CSS && CSS.escape) ? CSS.escape(v) : String(v).replace(/["\\]/g, '\\$&'); }

  function findCert(id) {
    var d = N.data && N.data.certificates;
    var groups = (d && d.groups) || [];
    for (var g = 0; g < groups.length; g++) {
      var items = groups[g].items || [];
      for (var i = 0; i < items.length; i++) if (items[i].id === id) return { cert: items[i], group: groups[g] };
    }
    return null;
  }

  function certPage(id) {
    var list = inSection('certificates');
    if (!list.length) return null;
    var own = bySlug('certificates/' + id);
    if (own) return own;
    var i, sel = ['[data-cert-id="' + esc(id) + '"]', '[data-cert="' + esc(id) + '"]', '[data-certificate="' + esc(id) + '"]', '[data-id="' + esc(id) + '"]', '#' + esc(id)].join(',');
    for (i = 0; i < list.length; i++) if (list[i].el && list[i].el.querySelector(sel)) return list[i];
    var found = findCert(id);
    if (found) {
      var c = found.cert;
      if (present(c.credentialId)) {
        for (i = 0; i < list.length; i++) if (list[i].el && (list[i].el.textContent || '').indexOf(c.credentialId) >= 0) return list[i];
      }
      for (i = 0; i < list.length; i++) if (list[i].title === c.title) return list[i];
      var grp = bySlug('certificates/' + found.group.id);
      if (grp) return grp;
    }
    return list[0];
  }

  function projectPage(id) {
    var list = inSection('projects');
    if (!list.length) return null;
    var own = bySlug('projects/' + id);
    if (own) return own;
    var i, proj = null;
    (N.data.projects || []).forEach(function (p) { if (p.id === id) proj = p; });
    for (i = 0; i < list.length; i++) if (list[i].slug.split('/').pop() === id) return list[i];
    if (proj) for (i = 0; i < list.length; i++) if (list[i].title === proj.title) return list[i];
    var sel = '[data-project="' + esc(id) + '"],[data-project-id="' + esc(id) + '"]';
    for (i = 0; i < list.length; i++) if (list[i].el && list[i].el.querySelector(sel)) return list[i];
    return list[0];
  }

  function uniquePages(found) {
    var seen = {}, out = [];
    (found || []).forEach(function (p) { if (p && !seen[p.number]) { seen[p.number] = 1; out.push(p); } });
    return out.sort(function (a, b) { return a.number - b.number; });
  }

  function formatPages(list) {
    var n = list.map(function (p) { return p.number; });
    if (n.length === 1) return 'p. ' + n[0];
    var run = n.every(function (v, i) { return i === 0 || v === n[i - 1] + 1; });
    return 'pp. ' + (run ? n[0] + '–' + n[n.length - 1] : n.join(', '));
  }

  function projectTitle(id) {
    var t = null;
    (N.data.projects || []).forEach(function (p) { if (p.id === id) t = p.title; });
    return t;
  }

  /* A self-correcting reference: "[text] p. N" linking to the first page it names. */
  function xref(opts) {
    var num = h('span', { class: 'page-ref__num' });
    var a = h('a', { class: ['page-ref', 'sk-ref', opts.className], href: '#/' },
      present(opts.text) ? [h('span', { class: 'sk-ref__text' }, opts.text), ' '] : null, num);
    var ref = { el: a, num: num, resolve: opts.resolve, describe: opts.describe, row: opts.row || null };
    REFS.push(ref);
    updateRef(ref);
    return a;
  }

  function updateRef(ref) {
    var list = uniquePages(ref.resolve());
    var ok = list.length > 0;
    ref.el.hidden = !ok;
    if (ref.row) ref.row.classList.toggle('has-ref', ok);
    if (!ok) return;
    ref.el.setAttribute('href', N.router ? N.router.href(list[0].slug) : '#/' + list[0].slug);
    ref.num.textContent = formatPages(list);
    ref.el.setAttribute('aria-label', ref.describe(list));
  }

  function refreshRefs() { REFS.forEach(updateRef); }

  /* ------------------------------------------------------------ dot leaders */

  // The leader is an inline box after the term's last word (it adds no width to the
  // line, see skills.css). Its dots are phased from the column edge so they line up
  // from row to row like leaders in a set index. Layout offsets are used (not client
  // rects), so the camera and page-turn transforms never skew the measurement.
  var DOT_PITCH = 6;      // px, matches background-size in skills.css
  var DOT_CENTER = 1;     // px, dot centre inside one tile
  var DOT_GAP = 2.5;      // px between the last dot centre and the column edge

  function leader() { return h('span', { class: 'sk-lead', 'aria-hidden': 'true' }); }

  function alignLeaders(root) {
    if (!root) return;
    N.qsa('.sk-item.has-ref .sk-lead', root).forEach(function (lead) {
      var term = lead.parentNode;
      if (!term || !lead.offsetParent || lead.offsetParent !== term.offsetParent) return;
      var edge = term.offsetLeft + term.clientWidth;
      var shift = (edge - DOT_GAP - DOT_CENTER - lead.offsetLeft) % DOT_PITCH;
      if (shift < 0) shift += DOT_PITCH;
      lead.style.backgroundPositionX = shift.toFixed(2) + 'px';
    });
  }

  function watch(pageEl) {
    var root = pageEl && pageEl.querySelector('.sk');
    if (!root) return;
    alignLeaders(root);
    if (root._skWatched) return;
    root._skWatched = true;
    if (window.ResizeObserver) new ResizeObserver(function () { alignLeaders(root); }).observe(root);
    else window.addEventListener('resize', function () { alignLeaders(root); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { alignLeaders(root); }, function () {});
  }

  /* ------------------------------------------------------------ index entries */

  function indexItem(term, projectIds) {
    var li = h('li', { class: 'sk-item' }, h('span', { class: 'sk-term' }, term, leader()));
    var ids = (projectIds || []).filter(present);
    if (ids.length) {
      li.appendChild(xref({
        row: li,
        resolve: function () { return ids.map(projectPage); },
        describe: function (list) {
          var names = ids.map(projectTitle).filter(present);
          return term + ', used in ' + (names.length ? names.join(' and ') : 'project') + ': ' +
            (list.length > 1 ? 'pages ' : 'page ') + list.map(function (p) { return p.number; }).join(', ');
        }
      }));
    }
    return li;
  }

  function group(g, usedIn) {
    var items = (g.items || []).filter(present);
    if (!items.length) return null;
    var id = 'sk-' + N.slugify(g.id || g.label) + '-' + N.ui.uid('g');
    return h('section', { class: 'sk-group', 'aria-labelledby': id },
      h('h3', { class: 'sk-label', id: id }, g.label),
      h('ul', { class: 'sk-list' }, items.map(function (it) { return indexItem(it, usedIn[it]); })));
  }

  function studiedItem(s) {
    var certs = (s.certificates || []).filter(present);
    var line = h('div', { class: 'sk-item sk-item--study' }, h('span', { class: 'sk-term' }, s.label, leader()));
    if (certs.length) {
      line.appendChild(xref({
        text: 'Certificates',
        row: line,
        resolve: function () { return certs.map(certPage); },
        describe: function (list) {
          return s.label + ', certificates: ' + (list.length > 1 ? 'pages ' : 'page ') +
            list.map(function (p) { return p.number; }).join(', ');
        }
      }));
    }
    return h('li', { class: 'sk-study' }, line,
      present(s.source) ? h('p', { class: 'sk-source' }, s.source) : null);
  }

  // Two index columns balanced by entry count (whole groups never split): the first
  // groups fill the left column until it holds about half of all entries.
  function columns(nodes, groups) {
    if (nodes.length < 2) return nodes;
    var sizes = (groups || []).filter(function (g) { return (g.items || []).filter(present).length; })
      .map(function (g) { return (g.items || []).filter(present).length + 1.5; });   // + its label
    var half = sizes.reduce(function (a, b) { return a + b; }, 0) / 2;
    var left = [], right = [], acc = 0;
    nodes.forEach(function (n, i) {
      var size = sizes[i] || 0;
      var toLeft = !right.length && (!left.length || acc + size / 2 <= half) && i < nodes.length - 1;
      if (toLeft) { left.push(n); acc += size; } else right.push(n);
    });
    return [h('div', { class: 'sk-col' }, left), h('div', { class: 'sk-col' }, right)];
  }

  // The groups are shared out over the spread: the first half on the left page, the rest
  // on the right (part 0 / part 1).
  function parts(data, part) {
    var sk = data.skills || {};
    var usedIn = sk.usedIn || {};
    var all = (sk.groups || []).filter(function (g) { return (g.items || []).filter(present).length; });
    var half = Math.ceil(all.length / 2);
    var mine = part ? all.slice(half) : all.slice(0, half);
    var anyUsed = all.some(function (g) {
      return (g.items || []).some(function (it) { return present(usedIn[it]); });
    });
    return { raw: mine, groups: mine.map(function (g) { return group(g, usedIn); }), anyUsed: anyUsed,
      studied: (sk.studied || []).filter(function (s) { return s && present(s.label); }),
      soft: (sk.soft || []).filter(present) };
  }

  // A long index is set tighter so it stays on its page.
  var DENSE_AT = 24;      // entries on one page

  // Left page: the first half of the technical index. Right page: the rest of it, then what
  // was studied through certification and the soft skills.
  function buildIndex(data, ui, part) {
    var x = parts(data, part);
    var entries = x.raw.reduce(function (n, g) { return n + (g.items || []).filter(present).length; }, 0);
    var studiedId = ui.uid('sk-studied');
    var softId = ui.uid('sk-soft');
    var header = part
      ? ui.pageHeader({ eyebrow: 'Index', title: 'Skills, continued' })
      : ui.pageHeader({
        eyebrow: 'Index',
        title: 'Skills',
        opener: true,
        meta: x.anyUsed ? 'Page numbers lead to the projects where an item is used.' : null
      });
    return h('section', { class: ['sk', 'sk--index', entries > DENSE_AT ? 'sk--dense' : null] },
      header,
      x.groups.length ? h('div', { class: ['sk-index', x.groups.length > 1 ? 'sk-index--two' : null] }, columns(x.groups, x.raw)) : null,
      part && x.studied.length ? h('section', { class: 'sk-block sk-studied', 'aria-labelledby': studiedId },
        h('h3', { class: 'sk-label', id: studiedId }, 'Studied through certification'),
        h('ul', { class: 'sk-list sk-list--study' }, x.studied.map(studiedItem))) : null,
      part && x.soft.length ? h('section', { class: 'sk-block sk-soft', 'aria-labelledby': softId },
        h('h3', { class: 'sk-label', id: softId }, 'Soft skills'),
        h('ul', { class: 'sk-soft__list' }, x.soft.map(function (s) { return h('li', null, s); }))) : null);
  }

  /* ------------------------------------------------------------ registration */

  N.pages.register(SECTION, function (data, ui) {
    var sec = ((data.site && data.site.sections) || []).filter(function (s) { return s.id === SECTION; })[0];
    var tab = (sec && sec.tab) || 'Skills';
    return [{
      slug: SECTION,
      title: tab,
      running: tab + ' · Index',
      facingRunning: tab + ' · Index',
      facing: function () { setTimeout(refreshRefs, 0); return buildIndex(data, ui, 0); },
      build: function () {
        // Pages after this one are built later; resolve once more when assembly is done.
        setTimeout(refreshRefs, 0);
        return buildIndex(data, ui, 1);
      },
      onShow: function (el) { refreshRefs(); watch(el); },
      onShowFacing: function (el) { refreshRefs(); watch(el); }
    }];
  });
})(window.Notebook);
