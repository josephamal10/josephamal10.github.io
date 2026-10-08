window.Notebook = window.Notebook || {};

/* ==========================================================================
   pages/experience.js — Experience section. Owned by PAGES-C.
   Experience   one spread: the log entry (left) and the dated work log (right)
   Achievements one spread (registered here too: it shares the ruled forms and the
                cross references): the conference paper with its certificate
                (left) and a ruled register of the rest (right)
   Facts come only from Notebook.data.experience / .recognition / .certificates.
   Cross references are resolved from Notebook.book.pages() (never hardcoded);
   certificate pages are found after every section is assembled.
   Styles: css/pages/experience.css (scoped under .xp).
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;
  var SECTION = 'experience';
  var REFS = [];            // live cross-reference links, re-resolved after assembly and on show

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

  function textMatch(el, text) {
    if (!el || !present(text)) return false;
    return (el.textContent || '').indexOf(text) >= 0;
  }

  // The certificates page that shows a certificate: its own page, a page carrying its id,
  // its credential id or title, its group's page, else the section's first page.
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
      if (present(c.credentialId)) for (i = 0; i < list.length; i++) if (textMatch(list[i].el, c.credentialId)) return list[i];
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

  function pageList(found) {
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

  /* A cross reference that keeps itself correct: "<text> p. N". Hidden when nothing resolves. */
  function xref(text, resolveList, describe) {
    var num = h('span', { class: 'page-ref__num' });
    var a = h('a', { class: 'page-ref xp-ref', href: '#/' }, h('span', { class: 'xp-ref__text' }, text), ' ', num);
    var ref = { el: a, num: num, resolve: resolveList, describe: describe };
    REFS.push(ref);
    updateRef(ref);
    return a;
  }

  function updateRef(ref) {
    var list = pageList(ref.resolve());
    if (!list.length) { ref.el.hidden = true; syncRow(ref.el); return; }
    ref.el.hidden = false;
    ref.el.setAttribute('href', N.router ? N.router.href(list[0].slug) : '#/' + list[0].slug);
    ref.num.textContent = formatPages(list);
    ref.el.setAttribute('aria-label', ref.describe + ', ' + (list.length > 1 ? 'pages ' : 'page ') +
      list.map(function (p) { return p.number; }).join(', ') + ': ' + list[0].title);
    syncRow(ref.el);
  }

  // A row of references disappears when none of its links resolve.
  function syncRow(el) {
    var row = el.parentNode;
    if (!row || !row.classList || !row.classList.contains('xp-refs')) return;
    var any = Array.prototype.some.call(row.querySelectorAll('.xp-ref'), function (a) { return !a.hidden; });
    row.hidden = !any;
  }

  function refreshRefs() { REFS.forEach(updateRef); }

  /* ------------------------------------------------------------ ruled sheet fitting */

  // Blank ruled rows run to the foot of the page in whole rows (never a clipped row).
  function fit(section) {
    var body = section && section.parentNode;
    var filler = section && section.querySelector('.xp-filler');
    if (!body || !filler || !body.clientHeight) return;
    var cs = getComputedStyle(body);
    var avail = body.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    var lh = parseFloat(getComputedStyle(filler).lineHeight);
    if (!(lh > 0)) return;
    var min = parseInt(filler.getAttribute('data-min'), 10) || 2;
    section.style.setProperty('--blank', String(min));
    var free = avail - section.offsetHeight - 2;
    var extra = free > 0 ? Math.floor(free / lh) : 0;
    section.style.setProperty('--blank', String(Math.min(min + extra, 60)));
  }

  function watch(pageEl, rootClass) {
    var section = pageEl && pageEl.querySelector('.' + rootClass);
    if (!section) return;
    fit(section);
    if (section._xpWatched) return;
    section._xpWatched = true;
    var body = section.parentNode;
    if (window.ResizeObserver && body) {
      var ro = new ResizeObserver(function () { fit(section); });
      ro.observe(body);
    } else {
      window.addEventListener('resize', function () { fit(section); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(section); }, function () {});
  }

  /* ------------------------------------------------------------ shared form parts */

  function formHead(cols) {
    return h('div', { class: 'xp-form__head', 'aria-hidden': 'true' },
      cols.map(function (c) { return h('span', { class: 'xp-form__col xp-form__col--' + c.key }, c.text); }));
  }

  function filler(min) {
    return h('div', { class: 'xp-filler', 'data-min': String(min), 'aria-hidden': 'true' });
  }

  // "June 2026 – Present" → start on one ruled row, "– Present" on the next (text unchanged).
  function periodLabel(period) {
    if (!period || !present(period.label)) return null;
    var label = period.label;
    var cut = label.indexOf(' – ');
    var timeAttrs = { class: 'xp-date__from' };
    if (present(period.start)) timeAttrs.datetime = period.start;
    if (cut < 0) return h('time', timeAttrs, label);
    return [
      h('time', timeAttrs, label.slice(0, cut)),
      h('span', { class: 'xp-date__to' }, label.slice(cut))
    ];
  }

  /* ------------------------------------------------------------ page 1: the log */

  function logEntry(e, ui) {
    var fields = [];
    if (present(e.engagement)) fields.push(['Engagement', e.engagement]);
    var hasTech = present(e.technologies);

    return h('li', { class: 'xp-entry' },
      h('div', { class: 'xp-line xp-line--head' },
        h('p', { class: 'xp-line__key xp-date' }, periodLabel(e.period)),
        h('div', { class: 'xp-line__val' },
          present(e.organization) ? h('h3', { class: 'xp-org' }, e.organization) : null,
          present(e.role) ? h('p', { class: 'xp-role' }, e.role) : null)),
      fields.length ? h('dl', { class: 'xp-fields' },
        fields.map(function (f) {
          return h('div', { class: 'xp-line' },
            h('dt', { class: 'xp-line__key xp-key' }, f[0]),
            h('dd', { class: 'xp-line__val' }, f[1]));
        })) : null,
      (present(e.summary) || present(e.points)) ? h('div', { class: 'xp-line xp-line--text' },
        h('span', { class: 'xp-line__key', 'aria-hidden': 'true' }),
        h('div', { class: 'xp-line__val' },
          present(e.summary) ? h('p', { class: 'xp-summary' }, e.summary) : null,
          present(e.points) ? h('ul', { class: 'list xp-points' },
            e.points.filter(present).map(function (pt) { return h('li', null, pt); })) : null,
          present(e.projects) && e.projects.length > 1 ? h('p', { class: 'xp-refs' },
            xref('The projects', function () { return e.projects.map(projectPage); }, 'The projects'))
            : present(e.project) ? h('p', { class: 'xp-refs' },
              xref('The project', function () { return [projectPage(e.project)]; }, 'The project')) : null)) : null,
      hasTech ? h('dl', { class: 'xp-fields xp-fields--tech' },
        h('div', { class: 'xp-line' },
          h('dt', { class: 'xp-line__key xp-key' }, 'Technologies'),
          h('dd', { class: 'xp-line__val' }, ui.chipList(e.technologies, { className: 'xp-chips' })))) : null
    );
  }

  function buildLog(data, ui) {
    var entries = (data.experience || []).filter(Boolean);
    return h('section', { class: 'xp xp--log' },
      ui.pageHeader({ eyebrow: 'Log', title: 'Experience', opener: true }),
      h('div', { class: 'xp-form' },
        formHead([{ key: 'key', text: 'Date' }, { key: 'val', text: 'Entry' }]),
        h('div', { class: 'xp-sheet' },
          h('ol', { class: 'xp-log' }, entries.map(function (e) { return logEntry(e, ui); })),
          filler(3))));
  }

  // The right-hand page: every dated line of work, oldest first, as a ruled day book.
  function buildWorkLog(data, ui) {
    var lines = [];
    (data.experience || []).filter(Boolean).forEach(function (e) {
      (e.log || []).forEach(function (l) { if (l && present(l.text)) lines.push({ e: e, l: l }); });
    });
    var hasAchievements = (data.recognition || []).filter(Boolean).length > 0;
    return h('section', { class: 'xp xp--worklog' },
      ui.pageHeader({ eyebrow: 'Day book', title: 'Work log' }),
      h('div', { class: 'xp-form' },
        formHead([{ key: 'key', text: 'When' }, { key: 'val', text: 'What was done' }]),
        h('div', { class: 'xp-sheet' },
          h('ol', { class: 'xp-days' }, lines.map(function (x) {
            var d = x.l.date || {};
            return h('li', { class: 'xp-day' },
              h('time', { class: 'xp-day__date', datetime: present(d.iso) ? d.iso : null }, d.label || ''),
              h('div', { class: 'xp-day__body' },
                h('p', { class: 'xp-day__text' }, x.l.text),
                h('p', { class: 'xp-day__where' }, x.e.organization || ''),
                present(x.l.project) ? h('p', { class: 'xp-refs' },
                  xref('The project', function () { return [projectPage(x.l.project)]; }, 'The project')) : null));
          })),
          filler(4))),
      hasAchievements ? h('p', { class: 'xp-refs xp-seealso' },
        h('span', { class: 'xp-seealso__lead' }, 'See also'),
        xref('Achievements and roles', function () { return [bySlug('achievements')]; }, 'See also')) : null);
  }

  /* ------------------------------------------------------------ page 2: the register */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function registerItem(r, i) {
    var refs = [];
    if (present(r.evidence)) {
      refs.push(xref('Evidence · Certificates', function () { return [certPage(r.evidence)]; }, 'Evidence, Certificates'));
    }
    if (present(r.project)) {
      refs.push(xref('Project', function () { return [projectPage(r.project)]; }, 'Project'));
    }
    var date = r.date && present(r.date.label)
      ? h('time', { class: 'xr-date', datetime: present(r.date.iso) ? r.date.iso : null }, r.date.label)
      : null;

    return h('li', { class: 'xr-item' },
      h('span', { class: 'xr-no', 'aria-hidden': 'true' }, pad2(i + 1)),
      h('div', { class: 'xr-body' },
        h('div', { class: 'xr-headrow' },
          present(r.title) ? h('h3', { class: 'xr-title' }, r.title) : null,
          date),
        present(r.detail) ? h('p', { class: 'xr-detail' }, r.detail) : null,
        refs.length ? h('p', { class: 'xp-refs xr-refs' }, refs) : null,
        linkButtons(r)));
  }

  // A document of the entry's own (a hackathon proposal…), as a button like a project's GitHub link.
  function linkButtons(r) {
    var links = (r.links || []).filter(function (l) { return l && present(l.url); });
    if (!links.length) return null;
    return h('div', { class: 'pj-actions xr-actions' }, links.map(function (l) {
      return h('a', { class: 'pj-action pj-action--' + (l.kind || 'link'), href: l.url, target: '_blank', rel: 'noopener' },
        h('span', { class: 'pj-action__label' }, l.label, h('span', { 'aria-hidden': 'true' }, ' ↗')),
        present(l.note) ? h('span', { class: 'pj-action__note' }, l.note) : null,
        h('span', { class: 'visually-hidden' }, ' (opens in a new tab)'));
    }));
  }

  function certFor(id) { var f = findCert(id); return f ? f.cert : null; }

  // Left page: the achievement with evidence, set out in full with its certificate.
  function buildFeatured(data, ui, r) {
    var cert = present(r.evidence) ? certFor(r.evidence) : null;
    // 'Paper presentation certificate' → 'Paper presentation': the kind of achievement, from its evidence
    var kind = cert && present(cert.type) ? String(cert.type).replace(/\s*certificate$/i, '') : null;
    var refs = [];
    if (present(r.evidence)) refs.push(xref('Filed with the certificates', function () { return [certPage(r.evidence)]; }, 'Certificates'));
    if (present(r.project)) refs.push(xref('The project', function () { return [projectPage(r.project)]; }, 'Project'));
    var doc = null;
    if (cert && present(cert.thumb)) {
      var btn = h('button', { type: 'button', class: 'ach-doc__open', 'aria-haspopup': 'dialog' },
        'View the certificate', h('span', { class: 'visually-hidden' }, ': ' + cert.title));
      btn.addEventListener('click', function () {
        if (N.viewer && typeof N.viewer.open === 'function') N.viewer.open(cert.id, { trigger: btn });
        else if (cert.pdf) window.open(cert.pdf, '_blank', 'noopener');
      });
      var fig = ui.figure({ src: cert.thumb, alt: 'The ' + String(cert.type || 'certificate').toLowerCase() + ' for \u201c' + cert.title + '\u201d',
          style: 'clipped', rotate: -1.6, width: 360, height: 255, className: 'ach-doc__fig' });
      // Tapping the certificate itself opens it, like the button.
      if (fig) fig.addEventListener('click', function () { btn.click(); });
      doc = h('div', { class: 'ach-doc' }, fig, btn);
    }
    var facts = cert && present(cert.event) ? ui.defList([
      ['Paper', cert.title],
      ['Conference', cert.event],
      ['Organised by', cert.issuer],
      ['Named on it as', cert.nameOnDocument]
    ].filter(function (x) { return present(x[1]); }), { className: 'ach-feature__facts' }) : null;
    return h('section', { class: 'xp ach ach--featured' },
      ui.pageHeader({ eyebrow: 'Recognition', title: 'Achievements', opener: true }),
      h('article', { class: 'ach-feature' },
        kind ? h('p', { class: 'ach-feature__kicker' }, kind) : null,
        h('h3', { class: 'ach-feature__title' }, r.title),
        r.date && present(r.date.label) ? h('p', { class: 'ach-feature__date' }, h('time', { datetime: r.date.iso || null }, r.date.label)) : null,
        present(r.detail) ? h('p', { class: 'ach-feature__detail' }, r.detail) : null,
        facts,
        doc,
        refs.length ? h('p', { class: 'xp-refs xr-refs' }, refs) : null));
  }

  // Right page: the register of the others.
  function buildRegister(data, ui, rest) {
    return h('section', { class: 'xp xp--register' },
      ui.pageHeader({ eyebrow: 'Register', title: 'Prizes, hackathons and roles' }),
      h('div', { class: 'xp-form xr-form' },
        formHead([{ key: 'no', text: 'No.' }, { key: 'val', text: 'Entry' }, { key: 'date', text: 'Date' }]),
        h('div', { class: 'xp-sheet' },
          h('ol', { class: 'xr-list' }, rest.map(registerItem)),
          filler(2))));
  }

  /* ------------------------------------------------------------ registration */

  function later() { setTimeout(refreshRefs, 0); }
  function onShow(el) { refreshRefs(); watch(el, 'xp'); }

  N.pages.register(SECTION, function (data, ui) {
    var sec = ((data.site && data.site.sections) || []).filter(function (s) { return s.id === SECTION; })[0];
    var tab = (sec && sec.tab) || 'Experience';
    if (!(data.experience || []).filter(Boolean).length) return [];
    return [{
      slug: SECTION,
      title: tab,
      running: tab + ' · Day book',
      facingRunning: tab + ' · Log',
      facing: function () { later(); return buildLog(data, ui); },
      build: function () { later(); return buildWorkLog(data, ui); },
      onShow: onShow,
      onShowFacing: onShow
    }];
  });

  // Achievements: the paper with its evidence on the left, the rest on the right.
  N.pages.register('achievements', function (data, ui) {
    var list = (data.recognition || []).filter(Boolean);
    if (!list.length) return [];
    var sec = ((data.site && data.site.sections) || []).filter(function (s) { return s.id === 'achievements'; })[0];
    var tab = (sec && sec.tab) || 'Achievements';
    var featured = list.filter(function (r) { return present(r.evidence); })[0] || list[0];
    var rest = list.filter(function (r) { return r !== featured; });
    return [{
      slug: 'achievements',
      aliases: [SECTION + '/recognition'],
      title: tab,
      running: tab + ' · Register',
      facingRunning: tab + ' · Recognition',
      facing: function () { later(); return buildFeatured(data, ui, featured); },
      build: function () { later(); return buildRegister(data, ui, rest); },
      onShow: onShow,
      onShowFacing: onShow
    }];
  });
})(window.Notebook);
