window.Notebook = window.Notebook || {};

/* ==========================================================================
   pages/contact.js — the notebook's last spread. Owned by PAGES-A.
     left page   set like the pre-printed address page at the back of a notebook:
                 labelled ruled fields, filled in (name, email, phone, LinkedIn,
                 location, résumé), the roles he is open to, one handwritten sign-off
     right page  "Ask this notebook" (js/ui/ask.js): a visitor asks a question about
                 Joseph and gets an answer written from these pages
   Every fact is read from Notebook.data; empty fields render nothing.
   Styling: css/pages/contact.css (scoped under .contact) and css/pages/ask.css.
   ========================================================================== */
(function (N) {
  'use strict';

  var SECTION = 'contact';
  var h = N.h;

  N.pages.register(SECTION, function (data, ui) {
    var present = ui.present;
    var profile = data.profile || {};
    var contact = profile.contact || {};
    var sections = (data.site && data.site.sections) || [];
    var sec = sections.filter(function (s) { return s.id === SECTION; })[0];
    var tab = (sec && sec.tab) || 'Contact';

    // Lets long addresses break only after "/" "." "@" (never at a hyphen), without altering a character.
    function breakable(text) {
      var out = [];
      String(text).split(/([\/.@])/).forEach(function (part) {
        if (!part) return;
        if (part === '/' || part === '.' || part === '@') { out.push(part, h('wbr')); return; }
        out.push(h('span', { class: 'contact__nobr' }, part));
      });
      return out;
    }

    function field(key, label, value) {
      if (!value) return null;
      return h('div', { class: 'contact__field contact__field--' + key },
        h('dt', { class: 'contact__key' }, label),
        h('dd', { class: 'contact__value' }, value));
    }

    function fields() {
      var phone = contact.phone || {};
      var li = contact.linkedin || {};
      var cv = contact.resume || {};
      var rows = [
        present(profile.name) ? field('name', 'Name', profile.name) : null,
        present(contact.email) ? field('email', 'Email',
          h('a', { class: 'contact__link', href: 'mailto:' + contact.email }, breakable(contact.email))) : null,
        present(phone.display) ? field('phone', 'Phone',
          present(phone.tel)
            ? h('a', { class: 'contact__link contact__link--tel', href: 'tel:' + phone.tel }, phone.display)
            : h('span', { class: 'contact__tel' }, phone.display)) : null,
        present(li.url) ? field('linkedin', 'LinkedIn',
          ui.link(li.url, breakable(present(li.label) ? li.label : li.url), { external: true, className: 'contact__link' })) : null,
        present(profile.location) ? field('location', 'Location', profile.location) : null,
        present(cv.href) ? field('resume', 'Résumé',
          h('a', { class: 'contact__link contact__resume', href: cv.href, download: cv.file || '' },
            h('span', { 'aria-hidden': 'true' }, '↓ '), 'Download (PDF)')) : null
      ].filter(Boolean);
      if (!rows.length) return null;
      return h('dl', { class: 'contact__card' }, rows);
    }

    function openTo() {
      var s = profile.seeking || {};
      var roles = (s.roles || []).filter(present);
      if (!roles.length) return null;
      return h('div', { class: 'contact__open' },
        h('p', { class: 'contact__open-lead' }, 'Open to roles as a'),
        h('p', { class: 'contact__open-roles' }, roles.join(' · ')));
    }

    function contactPage() {
      var header = ui.pageHeader({ eyebrow: 'Last pages', title: tab, opener: true });
      header.classList.add('contact__header');
      // The page's one handwritten line. No factual claim.
      var signoff = h('p', { class: 'contact__signoff' },
        ui.annotation('Thank you for reading.', { rotate: -3, place: 'inline' }));
      return h('section', { class: 'contact' }, header, fields(), openTo(), signoff);
    }

    return [{
      slug: SECTION,
      title: tab,
      running: tab + ' · Questions',
      facingRunning: tab,
      facing: contactPage,
      build: function () { return N.ask ? N.ask.page(data, ui) : h('div'); }
    }];
  });
})(window.Notebook);
