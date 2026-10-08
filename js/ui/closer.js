window.Notebook = window.Notebook || {};

/* ==========================================================================
   ui/closer.js — "Close the notebook", lettered in gold straight onto the
   desk to the left of the open book, reading upwards like a spine, between
   two small gold ornaments. Not a button: tooled lettering, like the cover's
   title. Pointing at it brightens the gold; clicking it (or Enter / Space)
   closes the notebook. Shown only when the open spread leaves room on the
   desk (.book--room-left); on phones the running head's "Close" does it.
   Styles: css/closer.css
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;

  function build() {
    var el = h('div', { class: 'desk-closer', role: 'button', tabindex: '0', 'aria-label': 'Close the notebook' },
      h('span', { class: 'desk-closer__orn', 'aria-hidden': 'true' }, '◆'),
      h('span', { class: 'desk-closer__words', 'aria-hidden': 'true' }, 'Close the notebook'),
      h('span', { class: 'desk-closer__orn', 'aria-hidden': 'true' }, '◆'));
    var busy = false;
    function use() {
      if (busy) return;
      busy = true;
      if (N.book && N.book.requestClose) N.book.requestClose();
      setTimeout(function () { busy = false; }, 800);
    }
    el.addEventListener('click', use);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); use(); }
    });
    return el;
  }

  N.closer = {
    init: function () {
      var book = document.getElementById('book');
      if (!book || book.querySelector('.desk-closer')) return;
      book.appendChild(build());
    }
  };
})(window.Notebook);
