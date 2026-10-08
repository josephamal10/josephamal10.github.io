window.Notebook = window.Notebook || {};

/* ==========================================================================
   pages/education.js — Education. One spread:
     left page   the degree in progress, set out in full (institution,
                 university, place, years, stage, grade) with its notes
     right page  the school certificate, the languages he speaks, and his
                 learning beyond the classroom (the certificates, counted)
   Facts come only from Notebook.data (education, profile.languages,
   experience, recognition, certificates). Cross references are computed.
   Styles: css/pages/education.css (scoped under .edu).
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;
  var SECTION = 'education';

  N.pages.register(SECTION, function (data, ui) {
    var present = ui.present;
    var list = (data.education || []).filter(function (e) { return e && present(e.qualification); });
    if (!list.length) return [];
    var sec = ((data.site && data.site.sections) || []).filter(function (s) { return s.id === SECTION; })[0];
    var tab = (sec && sec.tab) || 'Education';
    var degree = list[0];
    var school = list[1] || null;

    function sectionRef(id, text) {
      if (!N.book || typeof N.book.resolve !== 'function') return null;
      var p = N.book.resolve(id);
      if (!p || p.section !== id) return null;
      return ui.pageRef(p.slug, { text: text });
    }

    function field(label, value) {
      return present(value) ? [label, value] : null;
    }

    function entry(e, big) {
      var score = e.score && present(e.score.value) ? [e.score.label || 'Grade', e.score.value] : null;
      return h('div', { class: ['edu-entry', big ? 'edu-entry--main' : null] },
        h('h3', { class: 'edu-entry__title' }, e.qualification),
        present(e.detail) ? h('p', { class: 'edu-entry__detail' }, e.detail) : null,
        ui.defList([
          field('Institution', e.institution),
          field('University', e.university),
          field('Place', e.location),
          field('Years', e.period && e.period.label),
          field('Stage', e.stage),
          score
        ].filter(Boolean), { className: 'edu-entry__facts' }));
    }

    // Semester by semester: SGPA, CGPA and credits from the statements of marks.
    function semesters(e) {
      var rows = (e.semesters || []).filter(function (r) { return r && present(r.sem); });
      if (!rows.length) return null;
      var capId = ui.uid('edu-sems');
      return h('section', { class: 'edu-block edu-sems' },
        h('h3', { class: 'edu-block__head', id: capId }, 'Semester by semester'),
        h('table', { class: 'edu-sems__table', 'aria-labelledby': capId },
          h('thead', null, h('tr', null, ['Sem', 'Exam', 'Credits', 'SGPA', 'CGPA'].map(function (c) { return h('th', { scope: 'col' }, c); }))),
          h('tbody', null, rows.map(function (r) {
            if (!present(r.sgpa)) {
              return h('tr', { class: 'edu-sems__pending' }, h('th', { scope: 'row' }, r.sem), h('td', { colspan: '4' }, r.note || ''));
            }
            return h('tr', null,
              h('th', { scope: 'row' }, r.sem),
              h('td', null, r.exam || ''),
              h('td', null, String(r.credits || '')),
              h('td', { class: 'edu-sems__num' }, r.sgpa),
              h('td', { class: 'edu-sems__num' }, r.cgpa));
          }))));
    }

    // The best marks on the statements, set like an honours list.
    function bestMarks(e) {
      var rows = (e.best || []).filter(function (r) { return r && present(r[0]); });
      if (!rows.length) return null;
      return h('section', { class: 'edu-block' },
        h('h3', { class: 'edu-block__head' }, 'Best marks'),
        h('ul', { class: 'edu-best' }, rows.map(function (r) {
          return h('li', { class: 'edu-best__row' },
            h('span', { class: 'edu-best__what' }, r[0], present(r[2]) ? h('span', { class: 'edu-best__sem' }, ' · ' + r[2]) : null),
            h('span', { class: 'edu-best__mark' }, r[1]));
        })));
    }

    // Notes in the margin of the degree: things elsewhere in the notebook that belong to it.
    function degreeNotes() {
      var notes = [];
      var xp = (data.experience || [])[0];
      if (xp && present(xp.organization) && present(xp.engagement)) {
        notes.push(h('li', null, xp.engagement.replace(/\.$/, '') + ' at ' + xp.organization + ' ', sectionRef('experience', 'see')));
      }
      (data.recognition || []).forEach(function (r) {
        if (r && /academic excellence/i.test(r.title || '')) {
          notes.push(h('li', null, 'Recognised for academic excellence ', sectionRef('achievements', 'see')));
        }
      });
      if (!notes.length) return null;
      return h('div', { class: 'edu-notes' },
        h('h4', { class: 'edu-notes__head' }, 'Alongside the degree'),
        h('ul', { class: 'list edu-notes__list' }, notes));
    }

    function languages() {
      var langs = ((data.profile && data.profile.languages) || []).filter(function (l) { return l && present(l.name); });
      if (!langs.length) return null;
      return h('section', { class: 'edu-block' },
        h('h3', { class: 'edu-block__head' }, 'Languages'),
        h('ul', { class: 'edu-langs' }, langs.map(function (l) {
          return h('li', { class: 'edu-lang' },
            h('span', { class: 'edu-lang__name' }, l.name),
            present(l.level) ? [h('span', { class: 'visually-hidden' }, ', '), h('span', { class: 'edu-lang__level' }, l.level)] : null);
        })));
    }

    // The certificates, counted by subject, as learning outside the syllabus.
    function beyond() {
      var groups = ((data.certificates && data.certificates.groups) || []);
      var total = 0, genai = 0, python = 0, conf = 0;
      groups.forEach(function (g) {
        (g.items || []).forEach(function (it) {
          if (!it || !present(it.title)) return;
          total++;
          if (g.id === 'python') python++;
          else if (g.id === 'conference') conf++;
          else if (/vanderbilt/.test(g.id)) genai++;
        });
      });
      if (!total) return null;
      var rows = [];
      if (genai) rows.push(h('li', null, h('b', null, 'Generative AI and prompt engineering'), ' · ' + genai + ' certificates, Vanderbilt University through Coursera'));
      if (python) rows.push(h('li', null, h('b', null, 'Python programming'), ' · ' + python + ' certificates, University of Michigan and Coursera'));
      if (conf) {
        var events = [];
        groups.forEach(function (g) {
          if (g.id !== 'conference') return;
          (g.items || []).forEach(function (it) { var m = /\(([^)]+)\)\s*$/.exec(it.event || ''); if (m) events.push(m[1]); });
        });
        rows.push(h('li', null, h('b', null, conf === 1 ? 'Conference paper' : 'Conference papers'),
          events.length ? ' · presented at ' + events.join(' and ') : ''));
      }
      return h('section', { class: 'edu-block' },
        h('h3', { class: 'edu-block__head' }, 'Beyond the classroom'),
        h('p', { class: 'edu-beyond__lead' }, total + ' certificates kept in this notebook ', sectionRef('certificates', 'see')),
        h('ul', { class: 'list edu-beyond' }, rows));
    }

    return [{
      slug: SECTION,
      title: tab,
      running: tab,
      facingRunning: tab + ' · Degree',
      facing: function () {
        return h('section', { class: 'edu edu--degree' },
          ui.pageHeader({ eyebrow: 'Studies', title: tab, opener: true }),
          entry(degree, true),
          semesters(degree),
          degreeNotes());
      },
      build: function () {
        return h('section', { class: 'edu edu--more' },
          bestMarks(degree),
          school ? h('p', { class: 'edu-kicker edu-kicker--school' }, 'School') : null,
          school ? entry(school, false) : null,
          languages(),
          beyond());
      }
    }];
  });
})(window.Notebook);
