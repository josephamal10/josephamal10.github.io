window.Notebook = window.Notebook || {};

/* ==========================================================================
   ui/lightbox.js — touch a picture on a page (a project screenshot or photo)
   and it opens large over the desk; touch anywhere, press Esc or "Close" to
   put it back. Built on <dialog>, so focus stays inside while it is open and
   returns to the picture afterwards.

   Notebook.lightbox.attach(figureEl, { src, alt, caption })
   Notebook.lightbox.open({ src, alt, caption }, triggerEl)
   Styles: css/lightbox.css
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;
  var S = { dlg: null, img: null, cap: null, trigger: null };

  function build() {
    if (S.dlg) return;
    S.img = h('img', { class: 'lightbox__img', alt: '' });
    S.cap = h('p', { class: 'lightbox__caption' });
    var close = h('button', { type: 'button', class: 'lightbox__close' },
      h('span', { 'aria-hidden': 'true' }, '×'), ' Close');
    S.dlg = h('dialog', { class: 'lightbox', 'aria-label': 'Picture, enlarged' },
      h('figure', { class: 'lightbox__frame' }, S.img, S.cap), close);
    close.addEventListener('click', shut);
    // a touch anywhere puts it back, except on the caption text
    S.dlg.addEventListener('click', function (e) { if (e.target !== S.cap) shut(); });
    S.dlg.addEventListener('close', function () {
      document.documentElement.classList.remove('lightbox-open');
      var t = S.trigger;
      S.trigger = null;
      if (t && t.isConnected) { try { t.focus({ preventScroll: true }); } catch (err) { t.focus(); } }
    });
    document.body.appendChild(S.dlg);
  }

  function open(pic, trigger) {
    if (!pic || !pic.src) return;
    build();
    S.trigger = trigger || document.activeElement;
    S.img.src = pic.src;
    S.img.alt = pic.alt || '';
    S.cap.textContent = pic.caption || '';
    S.cap.hidden = !pic.caption;
    document.documentElement.classList.add('lightbox-open');
    if (typeof S.dlg.showModal === 'function') S.dlg.showModal();
    else S.dlg.setAttribute('open', '');
  }

  function shut() {
    if (!S.dlg) return;
    if (typeof S.dlg.close === 'function' && S.dlg.open) S.dlg.close();
    else { S.dlg.removeAttribute('open'); S.dlg.dispatchEvent(new Event('close')); }
  }

  // Makes a figure open its picture when touched (and with Enter or Space from the keyboard).
  function attach(fig, pic) {
    var mount = fig.querySelector('.figure__mount') || fig;
    mount.classList.add('is-zoomable');
    mount.setAttribute('role', 'button');
    mount.setAttribute('tabindex', '0');
    mount.setAttribute('aria-label', 'Open the picture larger' + (pic.caption ? ': ' + pic.caption : ''));
    mount.addEventListener('click', function () { open(pic, mount); });
    mount.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(pic, mount); }
    });
    return fig;
  }

  N.lightbox = { open: open, close: shut, attach: attach };
})(window.Notebook);
