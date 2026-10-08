window.Notebook = window.Notebook || {};

/* ==========================================================================
   pages/about.js — the first page after the cover. Owned by PAGES-A.
   Composed like the first page of a personal notebook: a portrait clipped
   to the sheet, the owner's name and headline, the summary, the roles being
   sought, and a compact ledger (currently · studying). Its left page is the inside of
   the front board: the 'If found' bookplate and the business card in a paper pocket.
   Every fact is read from Notebook.data; empty fields render nothing.
   Styling: css/pages/about.css (scoped under .about).
   ========================================================================== */
(function (N) {
  'use strict';

  var SECTION = 'about';
  var h = N.h;

  N.pages.register(SECTION, function (data, ui) {
    var present = ui.present;
    var profile = data.profile || {};
    var sections = (data.site && data.site.sections) || [];
    var sec = sections.filter(function (s) { return s.id === SECTION; })[0];
    var tab = (sec && sec.tab) || 'About';

    /* ---- helpers ---- */

    // A quiet middle dot between parts. The dot is hidden from AT; the spaces around it
    // stay in the text so the parts are still read as separate words.
    function sep() { return [' ', h('span', { class: 'about__sep', 'aria-hidden': 'true' }, '·'), ' ']; }
    function dotted(parts) {
      var out = [];
      parts.filter(present).forEach(function (p, i) {
        if (i > 0) out.push(sep());
        out.push(p);
      });
      return out;
    }

    // Real page number of a section's first page, as a physical cross reference.
    // The accessible name starts with the visible words ("see p. 8"), then says where it leads.
    function sectionRef(sectionId, text) {
      if (!N.book || typeof N.book.resolve !== 'function') return null;
      var p = N.book.resolve(sectionId);
      if (!p || p.section !== sectionId) return null;
      var ref = ui.pageRef(p.slug, { text: text });
      if (ref) ref.setAttribute('aria-label', (text ? text + ' ' : '') + 'p. ' + p.number + ', ' + p.title);
      return ref;
    }

    function ledgerRow(key, label, body) {
      if (!body) return null;
      return h('div', { class: 'about__row about__row--' + key },
        h('h3', { class: 'about__row-label' }, label),
        h('div', { class: 'about__row-body' }, body));
    }

    /* ---- masthead: name, headline, location + clipped portrait ---- */

    function masthead() {
      // "First page" while About opens the notebook; otherwise the section name.
      var num = ui.pageNumber(SECTION);
      var header = ui.pageHeader({ eyebrow: num === 1 ? 'First page' : tab, title: profile.name || profile.shortName || tab, opener: true });
      header.classList.add('about__header');

      // The portrait lives inside the header grid, right after the name in reading order.
      var photo = profile.photo || null;
      if (photo && photo.src) {
        header.appendChild(ui.figure({
          src: photo.src,
          alt: photo.alt || '',
          width: photo.width,
          height: photo.height,
          style: 'clipped',
          rotate: 1.6,
          eager: true,
          className: 'about__portrait'
        }));
      } else {
        header.classList.add('about__header--no-photo');
      }

      if (present(profile.headline) || present(profile.headlineDetail)) {
        header.appendChild(h('p', { class: 'about__headline' },
          present(profile.headline) ? h('span', { class: 'about__headline-main' }, profile.headline) : null,
          present(profile.headlineDetail) ? h('span', { class: 'about__headline-detail' }, profile.headlineDetail) : null));
      }
      if (present(profile.location)) {
        header.appendChild(h('p', { class: 'about__location' },
          h('span', { class: 'visually-hidden' }, 'Location: '), profile.location));
      }

      // One margin note, pointing at the index tabs. States no fact; decorative for AT.
      var note = ui.annotation('sections live on the tabs', { rotate: -2.5, className: 'about__note' });
      note.setAttribute('aria-hidden', 'true');

      return h('div', { class: 'about__masthead' }, header, note);
    }

    /* ---- summary + the roles being sought ---- */

    function summary() {
      var paras = (profile.summary || []).filter(present);
      if (!paras.length) return null;
      return h('div', { class: 'about__summary' },
        paras.map(function (p, i) { return h('p', { class: i === 0 ? 'about__lead' : 'about__para' }, p); }));
    }

    function seeking() {
      var s = profile.seeking || {};
      var roles = (s.roles || []).filter(present);
      if (!roles.length) return null;
      return h('div', { class: 'about__seeking' },
        present(s.lead) ? h('p', { class: 'about__seeking-lead' }, s.lead) : null,
        h('ul', { class: 'about__roles' },
          roles.map(function (r, i) {
            return h('li', { class: 'about__role' },
              r,
              i < roles.length - 1 ? h('span', { class: 'about__role-sep', 'aria-hidden': 'true' }, '/') : null);
          })),
        present(s.aim) ? h('p', { class: 'about__aim' }, s.aim) : null);
    }

    /* ---- ledger rows ---- */

    function currently() {
      var x = (data.experience || [])[0];
      if (!x || !(present(x.organization) || present(x.role))) return null;
      var period = x.period && present(x.period.label) ? x.period.label : null;
      var ref = sectionRef('experience', 'see');
      return [
        h('p', { class: 'about__entry' },
          dotted([
            present(x.organization) ? h('span', { class: 'about__entry-name' }, x.organization) : null,
            present(x.role) ? h('span', { class: 'about__entry-role' }, x.role) : null
          ])),
        (period || ref) ? h('p', { class: 'about__meta' },
          period ? h('span', { class: 'about__period' }, period) : null,
          ref ? h('span', { class: 'about__ref' }, ref) : null) : null
      ];
    }

    // What he is studying, in one line, pointing to the Education section.
    function studying() {
      var e = (data.education || []).filter(function (x) { return x && present(x.qualification); })[0];
      if (!e) return null;
      var ref = sectionRef('education', 'see');
      return [
        h('p', { class: 'about__entry' },
          dotted([
            h('span', { class: 'about__entry-name' }, e.qualification),
            present(e.institution) ? h('span', { class: 'about__entry-role' }, e.institution) : null
          ])),
        h('p', { class: 'about__meta' },
          e.period && present(e.period.label) ? h('span', { class: 'about__period' }, e.period.label) : null,
          ref ? h('span', { class: 'about__ref' }, ref) : null)
      ];
    }

    function ledger() {
      var rows = [
        ledgerRow('current', 'Currently', currently()),
        ledgerRow('education', 'Studying', studying())
      ].filter(Boolean);
      if (!rows.length) return null;
      return h('div', { class: 'about__ledger' }, rows);
    }

    // The inside of the front board: the 'If found' bookplate and, tucked into a paper pocket,
    // the business card (phone, email, LinkedIn, résumé).
    function linkedInLine() {
      var li = ((profile.contact || {}).linkedin) || {};
      if (!present(li.url)) return null;
      return h('p', { class: 'inner-cover__line inner-cover__line--mono' },
        ui.link(li.url, present(li.label) ? li.label : li.url, { external: true, className: 'inner-cover__email' }));
    }

    function insideCover() {
      var ins = (data.site && data.site.insideCover) || {};
      var plate = h('div', { class: 'inner-cover__plate' },
        present(ins.lead) ? h('p', { class: 'inner-cover__lead' }, ins.lead) : null,
        h('div', { class: 'inner-cover__fill' },
          present(ins.name) ? h('p', { class: 'inner-cover__name' }, ins.name) : null,
          present(ins.line) ? h('p', { class: 'inner-cover__line' }, ins.line) : null,
          linkedInLine()));
      var card = ui.businessCard(profile);
      return h('div', { class: 'inside-cover' },
        h('h2', { class: 'visually-hidden' }, 'Inside the front cover'),
        plate,
        card ? h('div', { class: 'card-pocket' }, h('div', { class: 'card-pocket__hold' }, card,
          ['tl', 'tr', 'bl', 'br'].map(function (k) { return h('span', { class: 'card-corner card-corner--' + k, 'aria-hidden': 'true' }); }))) : null);
    }

    return [{
      slug: SECTION,
      title: tab,
      running: tab,
      facingRunning: 'Inside cover',
      facing: insideCover,
      facingInline: 'end',          // on phones the card follows the About page, not above the same name
      build: function () {
        // Capped flexible spacers: on tall pages the blocks breathe a little, the rest stays at the foot.
        function space(k) { return h('div', { class: 'about__space about__space--' + k, 'aria-hidden': 'true' }); }
        return h('section', { class: 'about' },
          masthead(),
          space('a'),
          summary(),
          seeking(),
          space('b'),
          ledger(),
          space('end'));
      }
    }];
  });
})(window.Notebook);
