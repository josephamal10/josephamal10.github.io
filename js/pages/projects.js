window.Notebook = window.Notebook || {};

/* ==========================================================================
   pages/projects.js — the Projects section. Owned by PAGES-B.
   Spreads:
     projects: the contents, set over both pages. Only each project's number, title and
       description; a title opens that project's spread.
     projects/<id> (in data order): the project's workings (sketch, paper, prototype photo,
       code, comparison, challenges, team) on the left page opposite its entry, with a
       "Back to all projects" link to the contents. projects/<id>/continued is an alias.
   Every fact comes from Notebook.data.projects (plus the certificate record named
   in a project's evidence). Page numbers are read from Notebook.book, never typed.
   ========================================================================== */
(function (N) {
  'use strict';

  var SECTION = 'projects';
  var h = N.h;
  var S = N.svg;

  /* ------------------------------------------------------------ helpers */

  function present(v) {
    if (N.ui && N.ui.present) return N.ui.present(v);
    if (v === null || v === undefined || v === false) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.some(present);
    return true;
  }

  function list(v) { return (Array.isArray(v) ? v : []).filter(present); }

  function projNo(p) { return 'P-' + (p.number || ''); }

  function hashSeed(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  // Deterministic tiny jitter so the drawing reads hand-drafted but never changes between visits.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function findCertificate(data, id) {
    var groups = (data.certificates && data.certificates.groups) || [];
    for (var g = 0; g < groups.length; g++) {
      var items = groups[g].items || [];
      for (var i = 0; i < items.length; i++) if (items[i] && items[i].id === id) return items[i];
    }
    return null;
  }

  // The Certificates page that holds a given certificate: an exact sub-page if one exists,
  // a built page that contains it, else the section's first page.
  function certificatePage(certId) {
    if (!N.book || typeof N.book.pages !== 'function') return null;
    var pages = N.book.pages();
    var inSection = pages.filter(function (p) { return p.section === 'certificates'; });
    if (!inSection.length) return null;
    var i, p;
    for (i = 0; i < inSection.length; i++) {
      p = inSection[i];
      if (p.slug === 'certificates/' + certId || p.slug.split('/').pop() === certId) return p;
    }
    for (i = 0; i < inSection.length; i++) {
      p = inSection[i];
      if (!p.el) continue;
      var sel = '[data-cert="' + certId + '"], [data-cert-id="' + certId + '"], [data-id="' + certId + '"], [id="' + certId + '"], [id$="-' + certId + '"]';
      try { if (p.el.querySelector(sel)) return p; } catch (e) { /* ignore bad selector */ }
    }
    return inSection[0];
  }

  function pageRefLink(page, text) {
    if (!page) return null;
    return h('a', {
      class: 'page-ref pj-ref',
      href: N.router ? N.router.href(page.slug) : '#/' + page.slug,
      'aria-label': (text ? text + ', ' : '') + 'page ' + page.number + ': ' + page.title
    }, h('span', { class: 'page-ref__num' }, 'p. ' + page.number));
  }

  function evidenceRef(certId) {
    var holder = h('span', { class: 'pj-evref', 'data-pj-cert': certId });
    var page = certificatePage(certId);
    var a = pageRefLink(page, 'Evidence');
    if (a) holder.appendChild(a);
    return holder;
  }

  // Re-resolve certificate cross references once every page exists.
  function refreshEvidence(root) {
    N.qsa('[data-pj-cert]', root).forEach(function (holder) {
      var page = certificatePage(holder.getAttribute('data-pj-cert'));
      var cur = holder.querySelector('a');
      var href = page ? (N.router ? N.router.href(page.slug) : '#/' + page.slug) : null;
      if (cur && page && cur.getAttribute('href') === href && cur.textContent === 'p. ' + page.number) return;
      while (holder.firstChild) holder.removeChild(holder.firstChild);
      var a = pageRefLink(page, 'Evidence');
      if (a) holder.appendChild(a);
    });
  }

  /* ------------------------------------------------------------ label wrapping (mono, fixed advance) */

  var FS = 11;             // label size in sketch units (≈ --fs-xs at the designed width)
  var CW = FS * 0.6;       // IBM Plex Mono advance width
  var LH = 14.5;           // line height in sketch units

  function tokens(text) {
    var raw = String(text).split(/\s+/).filter(Boolean);
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var w = raw[i];
      if ((w === '·' || w === '→') && out.length) { out[out.length - 1] += ' ' + w; continue; }
      if (w === '+' && i + 1 < raw.length) { out.push(w + ' ' + raw[++i]); continue; }
      out.push(w);
    }
    return out;
  }

  function wrapText(text, maxChars) {
    var lines = [];
    var cur = '';
    tokens(text).forEach(function (t) {
      if (!cur) { cur = t; return; }
      if ((cur + ' ' + t).length <= maxChars) cur += ' ' + t;
      else { lines.push(cur); cur = t; }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // "Analysis: tone · pace" → a short head line plus the wrapped remainder.
  function wrapLabel(text, maxChars) {
    text = String(text);
    var m = /^([^:]{1,24}:)\s+(.+)$/.exec(text);
    if (m) return { head: [m[1]], rest: wrapText(m[2], maxChars) };
    return { head: [], rest: wrapText(text, maxChars) };
  }

  /* ------------------------------------------------------------ drawing primitives */

  function Pen(seed) {
    var r = rng(seed);
    function j() { return (r() - 0.5) * 0.7; }
    function f(n) { return Math.round(n * 100) / 100; }

    function line(x1, y1, x2, y2, cls) {
      return S('line', { x1: f(x1 + j()), y1: f(y1 + j()), x2: f(x2 + j()), y2: f(y2 + j()), class: cls || 'sk-ink' });
    }
    // A box drawn as four strokes that overshoot the corners, the way drafting lines do.
    function box(x, y, w, hh, strong) {
      var o = 3;
      return S('g', { class: 'sk-box' + (strong ? ' sk-box--strong' : '') },
        S('rect', { x: f(x), y: f(y), width: f(w), height: f(hh), class: 'sk-fill' }),
        line(x - o, y, x + w + o * 0.6, y),
        line(x + w, y - o * 0.6, x + w, y + hh + o),
        line(x + w + o, y + hh, x - o * 0.6, y + hh),
        line(x, y + hh + o * 0.6, x, y - o));
    }
    function chevron(tx, ty, ang, cls) {
      var L = 6.2, th = 0.46;
      return S('path', {
        class: cls || 'sk-ink',
        d: 'M' + f(tx - L * Math.cos(ang - th)) + ' ' + f(ty - L * Math.sin(ang - th)) +
           'L' + f(tx) + ' ' + f(ty) +
           'L' + f(tx - L * Math.cos(ang + th)) + ' ' + f(ty - L * Math.sin(ang + th))
      });
    }
    function tick(x, y, ang, cls) {
      var L = 3.2, a = ang + Math.PI / 2;
      return line(x - L * Math.cos(a), y - L * Math.sin(a), x + L * Math.cos(a), y + L * Math.sin(a), cls || 'sk-ink');
    }
    // Poly-line route; optional ticked start and chevron at the end.
    function route(pts, opts) {
      opts = opts || {};
      var cls = opts.dashed ? 'sk-ink sk-dash' : 'sk-ink';
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + f(p[0] + (i && i < pts.length - 1 ? j() * 0.5 : 0)) + ' ' + f(p[1]); }).join('');
      var g = S('g', { class: 'sk-route' }, S('path', { d: d, class: cls, fill: 'none' }));
      var a = pts[pts.length - 2], b = pts[pts.length - 1];
      var endAng = Math.atan2(b[1] - a[1], b[0] - a[0]);
      var s0 = pts[0], s1 = pts[1];
      var startAng = Math.atan2(s1[1] - s0[1], s1[0] - s0[0]);
      if (opts.tickStart) g.appendChild(tick(s0[0], s0[1], startAng));
      if (opts.tickEnd) g.appendChild(tick(b[0], b[1], endAng));
      if (opts.arrow !== false) g.appendChild(chevron(b[0], b[1], endAng));
      return g;
    }
    function dot(x, y) { return S('circle', { cx: f(x), cy: f(y), r: 1.9, class: 'sk-dot' }); }
    function text(x, y, lines, opts) {
      opts = opts || {};
      var anchor = opts.anchor || 'middle';
      return S('text', { x: f(x), y: f(y), 'text-anchor': anchor, class: 'sk-text' + (opts.cls ? ' ' + opts.cls : ''), 'font-size': opts.size || FS },
        lines.map(function (ln, i) {
          var t = typeof ln === 'string' ? { t: ln } : ln;
          return S('tspan', { x: f(x), dy: i ? LH : 0, class: t.cls || null }, t.t);
        }));
    }
    // Text sitting on a line: a paper-coloured backing keeps the line from striking through it.
    function tag(x, y, str, anchor) {
      var w = str.length * CW + 8;
      var x0 = anchor === 'end' ? x - w + 4 : (anchor === 'start' ? x - 4 : x - w / 2);
      return S('g', { class: 'sk-tag' },
        S('rect', { x: f(x0), y: f(y - FS * 0.82), width: f(w), height: f(FS * 1.12), class: 'sk-mask' }),
        text(x, y, [str], { anchor: anchor || 'middle', cls: 'sk-note' }));
    }
    return { line: line, box: box, chevron: chevron, tick: tick, route: route, dot: dot, text: text, tag: tag };
  }

  function svgRoot(W, H, cls, titleText) {
    var tid = N.ui.uid('pj-sk');
    return S('svg', {
      class: 'pj-sketch__svg ' + cls,
      viewBox: '-6 -6 ' + (W + 12) + ' ' + (H + 12),
      role: 'img',
      'aria-labelledby': tid,
      focusable: 'false',
      preserveAspectRatio: 'xMidYMid meet'
    }, S('title', { id: tid }, titleText));
  }

  function stepNo(i) { return (i + 1 < 10 ? '0' : '') + (i + 1); }

  function labelLines(lab) {
    return lab.head.map(function (t) { return { t: t, cls: 'sk-head' }; })
      .concat(lab.rest.map(function (t) { return { t: t, cls: lab.head.length ? 'sk-sub' : null }; }));
  }

  /* ---- steps → left-to-right flow (wide) ---- */
  function flowWide(steps, seed, title) {
    var W = 480, n = steps.length, gap = 38, pad = 11;
    var bw = (W - (n - 1) * gap) / n;
    var maxc = Math.max(8, Math.floor((bw - 2 * pad) / CW));
    var labs = steps.map(function (s) { return wrapLabel(s, maxc); });
    var maxLines = Math.max.apply(null, labs.map(function (l) { return l.head.length + l.rest.length; }));
    var bh = maxLines * LH + 26;
    var top = 20;
    var H = top + bh + 4;
    var P = Pen(seed);
    var svg = svgRoot(W, H, 'pj-sketch__svg--wide', title);
    var cy = top + bh / 2;
    labs.forEach(function (lab, i) {
      var x = i * (bw + gap);
      svg.appendChild(P.text(x, top - 8, [stepNo(i)], { anchor: 'start', cls: 'sk-no', size: 9.5 }));
      svg.appendChild(P.line(x + 16, top - 11.5, x + 30, top - 11.5, 'sk-faint'));
      svg.appendChild(P.box(x, top, bw, bh, false));
      var lines = labelLines(lab);
      var y0 = cy - ((lines.length - 1) * LH) / 2 + FS * 0.36;
      svg.appendChild(P.text(x + bw / 2, y0, lines));
      if (i < n - 1) svg.appendChild(P.route([[x + bw + 6, cy], [x + bw + gap - 6, cy]], { tickStart: true }));
    });
    return svg;
  }

  /* ---- steps → top-down flow (narrow) ---- */
  function flowTall(steps, seed, title) {
    var W = 300, left = 34, bw = W - left, pad = 12, gap = 30;
    var maxc = Math.max(8, Math.floor((bw - 2 * pad) / CW));
    var labs = steps.map(function (s) { return wrapLabel(s, maxc); });
    var P = Pen(seed);
    var y = 0, parts = [];
    labs.forEach(function (lab, i) {
      var lines = labelLines(lab);
      var bh = lines.length * LH + 22;
      parts.push({ y: y, bh: bh, lines: lines, i: i });
      y += bh + gap;
    });
    var H = y - gap;
    var svg = svgRoot(W, H, 'pj-sketch__svg--tall', title);
    parts.forEach(function (pt, k) {
      svg.appendChild(P.text(0, pt.y + 12, [stepNo(pt.i)], { anchor: 'start', cls: 'sk-no', size: 9.5 }));
      svg.appendChild(P.box(left, pt.y, bw, pt.bh, false));
      var y0 = pt.y + pt.bh / 2 - ((pt.lines.length - 1) * LH) / 2 + FS * 0.36;
      svg.appendChild(P.text(left + bw / 2, y0, pt.lines));
      if (k < parts.length - 1) {
        var cx = left + bw / 2;
        svg.appendChild(P.route([[cx, pt.y + pt.bh + 6], [cx, pt.y + pt.bh + gap - 6]], { tickStart: true }));
      }
    });
    return svg;
  }

  /* ---- nodes + notes → block diagram ---- */

  function words(s) {
    return String(s).toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3; });
  }
  // Work out which node a note points at (text after its last arrow) and route it.
  function planNotes(nodes, notes) {
    if (nodes.length < 4 || notes.length > 2) return null;
    var last = nodes.length - 1;
    var plans = [];
    var used = {};
    for (var i = 0; i < notes.length; i++) {
      var note = String(notes[i]);
      var k = note.lastIndexOf('→');
      if (k < 0) return null;
      var target = words(note.slice(k + 1));
      var hit = -1;
      for (var n = 0; n < nodes.length && hit < 0; n++) {
        var nw = words(nodes[n]);
        if (target.some(function (w) { return nw.indexOf(w) >= 0; })) hit = n;
      }
      if (hit === 0 || hit === 1) plans.push({ note: note, from: last, to: hit, dev: hit });
      else if (hit === last) plans.push({ note: note, from: null, to: last, dev: null });
      else return null;
    }
    // A note arriving at the last node leaves from the device not already on a route.
    plans.forEach(function (p) {
      if (p.from !== null) used[p.dev] = true;
    });
    plans.forEach(function (p) {
      if (p.from === null) { p.from = used[0] ? 1 : 0; p.dev = p.from; used[p.dev] = true; }
    });
    var devs = plans.map(function (p) { return p.dev; });
    if (devs.length === 2 && devs[0] === devs[1]) return null;
    return plans;
  }

  function nodeW(s) { return Math.max(62, Math.ceil(String(s).length * CW + 20)); }

  function blockWide(nodes, plans, seed, title) {
    var W = 480;
    var P = Pen(seed);
    var devW = Math.max(nodeW(nodes[0]), nodeW(nodes[1]));
    var chain = nodes.slice(2);
    var cws = chain.map(nodeW);
    var sum = cws.reduce(function (a, b) { return a + b; }, 0);
    var g = (W - devW - sum) / chain.length;
    var bh = 27;
    var yTopRoute = 19, dev0y = 36, midY = 76, dev1y = 89, yBotRoute = 134;
    var H = yBotRoute + 16;
    var svg = svgRoot(W, H, 'pj-sketch__svg--wide', title);

    var dev = [{ x: 0, y: dev0y, w: devW }, { x: 0, y: dev1y, w: devW }];
    var busX = devW + Math.min(16, g / 2);
    // hardware column bracket (bus) → first chain node
    svg.appendChild(P.line(devW, dev0y + bh / 2, busX, dev0y + bh / 2));
    svg.appendChild(P.line(devW, dev1y + bh / 2, busX, dev1y + bh / 2));
    svg.appendChild(P.line(busX, dev0y + bh / 2, busX, dev1y + bh / 2));
    svg.appendChild(P.dot(busX, midY));

    var cx = devW + g;
    var chainBoxes = [];
    chain.forEach(function (label, i) {
      chainBoxes.push({ x: cx, y: midY - bh / 2, w: cws[i], label: label });
      cx += cws[i] + g;
    });
    svg.appendChild(P.route([[busX, midY], [chainBoxes[0].x - 5, midY]], { arrow: false, tickEnd: true }));
    for (var i = 0; i < chainBoxes.length - 1; i++) {
      var a = chainBoxes[i], b = chainBoxes[i + 1];
      svg.appendChild(P.route([[a.x + a.w + 5, midY], [b.x - 5, midY]], { arrow: false, tickStart: true, tickEnd: true }));
    }

    dev.forEach(function (d, k) {
      svg.appendChild(P.box(d.x, d.y, d.w, bh, false));
      svg.appendChild(P.text(d.x + d.w / 2, d.y + bh / 2 + FS * 0.36, [nodes[k]]));
    });
    chainBoxes.forEach(function (c, k) {
      svg.appendChild(P.box(c.x, c.y, c.w, bh, k === chainBoxes.length - 1));
      svg.appendChild(P.text(c.x + c.w / 2, c.y + bh / 2 + FS * 0.36, [c.label]));
    });

    var endBox = chainBoxes[chainBoxes.length - 1];
    var endCx = endBox.x + endBox.w / 2;
    plans.forEach(function (p) {
      var d = dev[p.dev];
      var dcx = d.x + d.w / 2;
      var toDevice = p.to === p.dev;
      var top = p.dev === 0;
      var yR = top ? yTopRoute : yBotRoute;
      var devEdge = top ? d.y : d.y + bh;
      var endEdge = top ? endBox.y : endBox.y + bh;
      var pts = toDevice
        ? [[endCx, endEdge + (top ? -4 : 4)], [endCx, yR], [dcx, yR], [dcx, devEdge + (top ? -4 : 4)]]
        : [[dcx, devEdge + (top ? -4 : 4)], [dcx, yR], [endCx, yR], [endCx, endEdge + (top ? -4 : 4)]];
      svg.appendChild(P.route(pts, { dashed: true, tickStart: true }));
      var lx = (dcx + endCx) / 2;
      svg.appendChild(P.tag(lx, top ? yR - 6.5 : yR + 13.5, p.note, 'middle'));
    });
    return svg;
  }

  function blockTall(nodes, plans, seed, title) {
    var W = 300;
    var P = Pen(seed);
    var bh = 30, gap = 30;
    var w0 = nodeW(nodes[0]), w1 = nodeW(nodes[1]);
    var devY = 10;
    var dev = [{ x: 14, y: devY, w: w0 }, { x: W - 14 - w1, y: devY, w: w1 }];
    if (dev[0].x + w0 > dev[1].x - 8) { dev[1].x = dev[0].x + w0 + 8; }
    var busY = devY + bh + 18;
    var cxMid = W / 2;
    var chain = nodes.slice(2);
    var y = busY + 20;
    var boxes = chain.map(function (label) {
      var w = nodeW(label);
      var b = { x: cxMid - w / 2, y: y, w: w, label: label };
      y += bh + gap;
      return b;
    });
    var H = y - gap + 6;
    var svg = svgRoot(W, H, 'pj-sketch__svg--tall', title);

    var d0c = dev[0].x + w0 / 2, d1c = dev[1].x + w1 / 2;
    svg.appendChild(P.line(d0c, devY + bh, d0c, busY));
    svg.appendChild(P.line(d1c, devY + bh, d1c, busY));
    svg.appendChild(P.line(d0c, busY, d1c, busY));
    svg.appendChild(P.dot(cxMid, busY));
    svg.appendChild(P.line(cxMid, busY, cxMid, boxes[0].y));
    for (var i = 0; i < boxes.length - 1; i++) {
      svg.appendChild(P.line(cxMid, boxes[i].y + bh, cxMid, boxes[i + 1].y));
    }
    dev.forEach(function (d, k) {
      svg.appendChild(P.box(d.x, d.y, d.w, bh, false));
      svg.appendChild(P.text(d.x + d.w / 2, d.y + bh / 2 + FS * 0.36, [nodes[k]]));
    });
    boxes.forEach(function (b, k) {
      svg.appendChild(P.box(b.x, b.y, b.w, bh, k === boxes.length - 1));
      svg.appendChild(P.text(b.x + b.w / 2, b.y + bh / 2 + FS * 0.36, [b.label]));
    });

    var end = boxes[boxes.length - 1];
    var endMid = end.y + bh / 2;
    var chainLeft = Math.min.apply(null, boxes.map(function (b) { return b.x; }));
    var chainRight = Math.max.apply(null, boxes.map(function (b) { return b.x + b.w; }));
    plans.forEach(function (p) {
      var d = dev[p.dev];
      var leftSide = p.dev === 0;
      var xR = leftSide ? 3 : W - 3;
      var devSide = leftSide ? d.x : d.x + d.w;
      var endSide = leftSide ? end.x : end.x + end.w;
      var dm = d.y + bh / 2;
      var toDevice = p.to === p.dev;
      var pts = toDevice
        ? [[endSide + (leftSide ? -4 : 4), endMid], [xR, endMid], [xR, dm], [devSide + (leftSide ? -4 : 4), dm]]
        : [[devSide + (leftSide ? -4 : 4), dm], [xR, dm], [xR, endMid], [endSide + (leftSide ? -4 : 4), endMid]];
      svg.appendChild(P.route(pts, { dashed: true, tickStart: true }));
      var room = leftSide ? chainLeft - (xR + 9) - 6 : (xR - 9) - chainRight - 6;
      var lines = wrapText(p.note, Math.max(6, Math.floor(room / CW)));
      var ly = (busY + end.y) / 2 - ((lines.length - 1) * LH) / 2 + FS * 0.36;
      svg.appendChild(P.text(leftSide ? xR + 9 : xR - 9, ly, lines, { anchor: leftSide ? 'start' : 'end', cls: 'sk-note' }));
    });
    return svg;
  }

  // Fallback: nodes in a plain chain, notes listed beneath the drawing.
  function chainOnly(nodes, seed, title, wide) {
    var W = wide ? 480 : 300;
    var P = Pen(seed);
    var bh = 30, gap = 22;
    if (wide) {
      var ws = nodes.map(nodeW);
      var total = ws.reduce(function (a, b) { return a + b; }, 0) + gap * (nodes.length - 1);
      if (total <= W) {
        var svgW = svgRoot(W, bh, 'pj-sketch__svg--wide', title);
        var x = (W - total) / 2;
        nodes.forEach(function (n, i) {
          svgW.appendChild(P.box(x, 0, ws[i], bh, false));
          svgW.appendChild(P.text(x + ws[i] / 2, bh / 2 + FS * 0.36, [n]));
          if (i < nodes.length - 1) svgW.appendChild(P.route([[x + ws[i] + 4, bh / 2], [x + ws[i] + gap - 4, bh / 2]], { arrow: false, tickStart: true, tickEnd: true }));
          x += ws[i] + gap;
        });
        return svgW;
      }
    }
    var y = 0;
    var svg = svgRoot(W, nodes.length * (bh + gap) - gap, wide ? 'pj-sketch__svg--wide' : 'pj-sketch__svg--tall', title);
    nodes.forEach(function (n, i) {
      var w = Math.min(W, nodeW(n));
      svg.appendChild(P.box(W / 2 - w / 2, y, w, bh, false));
      svg.appendChild(P.text(W / 2, y + bh / 2 + FS * 0.36, [n]));
      if (i < nodes.length - 1) svg.appendChild(P.route([[W / 2, y + bh + 4], [W / 2, y + bh + gap - 4]], { arrow: false, tickStart: true, tickEnd: true }));
      y += bh + gap;
    });
    return svg;
  }

  function sketchFigure(p) {
    var sk = p.sketch;
    if (!sk) return null;
    var steps = list(sk.steps);
    var nodes = list(sk.nodes);
    var notes = list(sk.notes);
    if (!steps.length && !nodes.length) return null;
    var seed = hashSeed(p.id || 'x');
    var cap = present(sk.caption) ? sk.caption : '';
    var title = (cap ? cap + ': ' : '') + (steps.length ? steps.join(', then ') : nodes.join(', ')) +
      (notes.length ? '. ' + notes.join('; ') + '.' : '.');
    var art = [];
    var legend = null;
    if (steps.length) {
      art.push(flowWide(steps, seed, title), flowTall(steps, seed + 1, title));
    } else {
      var plans = planNotes(nodes, notes);
      if (plans) {
        art.push(blockWide(nodes, plans, seed, title), blockTall(nodes, plans, seed + 1, title));
      } else {
        art.push(chainOnly(nodes, seed, title, true), chainOnly(nodes, seed + 1, title, false));
        if (notes.length) legend = h('ul', { class: 'pj-sketch__legend', 'aria-hidden': 'true' }, notes.map(function (n) { return h('li', null, n); }));
      }
    }
    return h('figure', { class: 'pj-sketch' },
      h('div', { class: 'pj-sketch__art' }, art),
      legend,
      h('figcaption', { class: 'pj-sketch__strip' },
        h('span', { class: 'pj-sketch__cell pj-sketch__cell--fig' }, 'Fig. 1'),
        h('span', { class: 'pj-sketch__cell pj-sketch__cell--cap' }, cap),
        h('span', { class: 'pj-sketch__cell pj-sketch__cell--no' }, projNo(p))));
  }

  /* ------------------------------------------------------------ entry blocks */

  function block(key, heading, content, extraClass) {
    if (!content) return null;
    var id = N.ui.uid('pj-' + key);
    return h('section', { class: ['pj-block', 'pj-block--' + key, extraClass], 'aria-labelledby': id },
      h('h3', { class: 'pj-block__head', id: id }, h('span', { class: 'pj-block__label' }, heading)),
      content);
  }

  function labelFor(p, key, fallback) {
    return p.labels && present(p.labels[key]) ? p.labels[key] : fallback;
  }

  function purposeBlock(p) {
    if (!present(p.purpose)) return null;
    return block('purpose', labelFor(p, 'purpose', 'Purpose'), h('p', { class: 'pj-purpose' }, p.purpose));
  }

  function howBlock(p, withSketch) {
    var items = list(p.howItWorks);
    var sketch = withSketch ? sketchFigure(p) : null;
    if (!items.length && !sketch) return null;
    return block('how', labelFor(p, 'howItWorks', 'How it works'), [
      items.length ? h('ol', { class: 'list pj-steps' }, items.map(function (t) { return h('li', null, t); })) : null,
      sketch
    ]);
  }

  function techBlock(p, ui) {
    var chips = ui.chipList(list(p.technologies), { label: 'Technologies', className: 'pj-chips' });
    return chips ? block('tech', 'Technologies', chips) : null;
  }

  function teamBlock(p) {
    var t = p.team;
    if (!t) return null;
    var members = list(t.members);
    if (!members.length) return null;
    var me = (N.data.profile && N.data.profile.shortName) || '';
    return block('team', present(t.label) ? t.label : 'Team', [
      h('ul', { class: ['pj-team', members.length > 3 ? 'pj-team--grid' : null] },
        members.map(function (m) {
          var self = me && String(m).indexOf(me) >= 0;
          return h('li', { class: self ? 'is-self' : null }, m);
        })),
      present(t.affiliation) ? h('p', { class: 'pj-affil' }, t.affiliation) : null
    ]);
  }

  function challengesBlock(p) {
    var items = list(p.challenges);
    if (!items.length) return null;
    return block('challenges', labelFor(p, 'challenges', 'Challenges discussed'), h('ul', { class: 'list pj-challenges' }, items.map(function (t) { return h('li', null, t); })));
  }

  function evidenceBlock(p, data) {
    var ev = evidenceIds(p);
    if (!ev.length) return null;
    return block('evidence', 'Evidence', h('ul', { class: 'pj-evidence' }, ev.map(function (id) {
      var c = findCertificate(data, id);
      return h('li', null,
        c && present(c.type) ? h('span', { class: 'pj-evidence__what' }, c.type) : null,
        h('span', { class: 'pj-evidence__where' }, 'Certificates · see ', evidenceRef(id)));
    })));
  }

  function paperBlock(p) {
    var pp = p.paper;
    if (!pp) return null;
    var rows = [
      ['Title', pp.title, 'pj-cite__title'],
      ['Event', pp.event, 'pj-cite__event'],
      ['Organiser', pp.organiser, 'pj-cite__org'],
      ['Date', pp.date && pp.date.label ? h('time', { datetime: pp.date.iso || null }, pp.date.label) : null, 'pj-cite__date']
    ].filter(function (r) { return present(r[1]); });
    if (!rows.length) return null;
    var dl = h('dl', { class: 'pj-cite' }, rows.map(function (r) {
      return h('div', { class: 'pj-cite__row ' + r[2] },
        h('dt', { class: 'visually-hidden' }, r[0]),
        h('dd', null, r[1]));
    }));
    return block('paper', 'Paper', h('div', { class: 'pj-cite-wrap' }, dl));
  }

  // The project's picture, taped in; touching it opens it larger (js/ui/lightbox.js).
  function imageBlock(p, ui) {
    var im = p.image;
    if (!im || !im.src) return null;
    var fig = ui.figure({
      src: im.src, alt: im.alt || '', caption: im.caption,
      width: im.width || 1150, height: im.height || 920,
      style: 'taped', rotate: 1.1, className: 'pj-photo'
    });
    if (fig && N.lightbox) N.lightbox.attach(fig, { src: im.src, alt: im.alt || '', caption: im.caption });
    return fig;
  }

  function codeBlock(p, ui) {
    var c = p.code;
    if (!c || !Array.isArray(c.lines) || !c.lines.length) return null;
    return ui.codeBlock(c.lines, c.caption, { language: c.language, className: 'pj-code' });
  }

  function comparisonBlock(p) {
    var c = p.comparison;
    if (!c || !list(c.rows).length) return null;
    var cols = c.columns || [];
    var capId = N.ui.uid('pj-cmp');
    var table = h('table', { class: 'pj-table', 'aria-labelledby': capId },
      h('caption', { class: 'pj-table__caption', id: capId }, c.caption || ''),
      cols.length ? h('thead', null, h('tr', null, cols.map(function (col) { return h('th', { scope: 'col' }, col); }))) : null,
      h('tbody', null, c.rows.map(function (row) {
        return h('tr', null, row.map(function (cell, i) {
          return i === 0 ? h('th', { scope: 'row' }, cell) : h('td', null, cell);
        }));
      })));
    return h('div', { class: 'pj-table-wrap' }, table);
  }

  /* ------------------------------------------------------------ page builders */

  function hasSketch(p) { return !!(p.sketch && (list(p.sketch.steps).length || list(p.sketch.nodes).length)); }

  function evidenceIds(p) {
    var ids = list(p.evidence);
    if (!ids.length && p.paper && present(p.paper.evidence)) ids = [p.paper.evidence];
    return ids;
  }

  // Material that fills a project's left page (its "workings"): drawings, documents, pictures.
  function hasWorkings(p) {
    return !!(hasSketch(p) || p.paper || (p.image && p.image.src) || (p.code && (p.code.lines || []).length) ||
      (p.comparison && list(p.comparison.rows).length) || list(p.challenges).length || p.team);
  }

  // "Paper, prototype and code": names what the workings page holds.
  function workingsTitle(p) {
    var parts = [];
    if (hasSketch(p)) parts.push('Sketch');
    if (p.paper) parts.push('Paper');
    if (p.image && p.image.src) parts.push('Prototype');
    if (p.code && (p.code.lines || []).length) parts.push('Code');
    if (p.comparison && list(p.comparison.rows).length) parts.push('Comparison');
    if (list(p.challenges).length) parts.push('Challenges');
    if (p.team && !p.paper) parts.push(list(p.team.members).length > 1 ? 'Team' : 'Setting');
    if (!parts.length) return 'Workings';
    var words = parts.map(function (w, i) { return i ? w.toLowerCase() : w; });
    return words.length === 1 ? words[0] : words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1];
  }

  function metaFor(p) {
    return [
      present(p.kind) ? p.kind : null,
      p.period && present(p.period.label) ? h('span', { class: 'pj-nowrap' }, p.period.label) : null
    ].filter(present);
  }

  /* ---- layout: every project starts on a left page and ends on a right page ----
     spread 1   left: the story (title, Live demo / GitHub, summary, purpose, how it works)
                right: the picture (screenshot or photo, else the sketch) and the key numbers
     spread 2   left: results (tables), paper and code
                right: problems solved, technologies, team, evidence; "End of P-0N"
     A project with no picture, sketch or key numbers keeps to one spread. */

  // "Live demo ↗" and "GitHub ↗", right under the project's title.
  function actionsRow(p) {
    var links = list(p.links).filter(function (l) { return l && present(l.url); });
    if (!links.length) return null;
    return h('div', { class: 'pj-actions' }, links.map(function (l) {
      return h('a', { class: 'pj-action pj-action--' + (l.kind || 'link'), href: l.url, target: '_blank', rel: 'noopener' },
        h('span', { class: 'pj-action__label' }, l.label, h('span', { 'aria-hidden': 'true' }, ' \u2197')),
        present(l.note) ? h('span', { class: 'pj-action__note' }, l.note) : null,
        h('span', { class: 'visually-hidden' }, ' (opens in a new tab)'));
    }));
  }

  // Four key numbers, set large.
  function statsBlock(p) {
    var st = list(p.stats).filter(function (s) { return s && present(s[0]); });
    if (!st.length) return null;
    return h('dl', { class: 'pj-stats' }, st.map(function (s) {
      return h('div', { class: 'pj-stat' }, h('dt', { class: 'pj-stat__num' }, s[0]), h('dd', { class: 'pj-stat__label' }, s[1]));
    }));
  }

  function tableBlock(c) { return c && list(c.rows).length ? comparisonBlock({ comparison: c }) : null; }
  function hasImage(p) { return !!(p.image && p.image.src); }
  function hasResults(p) {
    return !!((p.comparison && list(p.comparison.rows).length) || (p.comparison2 && list(p.comparison2.rows).length) ||
      p.paper || (p.code && list(p.code.lines).length));
  }
  function twoSpreads(p) {
    if (p.spreads === 1 || p.spreads === 2) return p.spreads === 2;   // set in the data when a project needs it
    return (hasImage(p) || hasSketch(p) || list(p.stats).length > 0) && (hasResults(p) || list(p.challenges).length > 0);
  }
  function resultsTitle(p) {
    if (p.labels && present(p.labels.results)) return p.labels.results;
    if ((p.comparison && list(p.comparison.rows).length) || p.comparison2) return 'Results';
    var parts = [];
    if (p.paper) parts.push('Paper');
    if (p.code && list(p.code.lines).length) parts.push(parts.length ? 'code' : 'Code');
    return parts.join(' and ') || 'Results';
  }
  function notesTitle(p) {
    if (p.labels && present(p.labels.notes)) return p.labels.notes;
    return list(p.challenges).length ? 'Problems solved' : 'Team and evidence';
  }
  function subHead(p, ui, tag, title) {
    var hd = ui.pageHeader({ eyebrow: projNo(p) + ' \u00b7 ' + tag, title: title });
    hd.classList.add('pj-work__head');
    return hd;
  }
  function overleaf(text) {
    return h('p', { class: 'pj-opposite' }, text, h('span', { 'aria-hidden': 'true' }, ' \u2192'));
  }

  // Spread 1, left page: the project starts here.
  function entryPage(p, data, ui) {
    return h('div', { class: 'pj pj-entry', 'data-project': p.id },
      backLink(),
      ui.pageHeader({ eyebrow: projNo(p), title: p.title, meta: metaFor(p) }),
      actionsRow(p),
      present(p.summary) ? h('p', { class: 'pj-lede' }, p.summary) : null,
      h('div', { class: 'pj-flow' }, purposeBlock(p), howBlock(p, false), paperLeft(p) ? paperBlock(p) : null));
  }

  // On one spread, the paper's reference goes on the left page, to balance the two.
  function paperLeft(p) { return !twoSpreads(p) && !!p.paper; }

  // Spread 1, right page: the picture and the key numbers (or, for a one-spread project, the rest of it).
  function showPage(p, data, ui) {
    if (!twoSpreads(p)) {
      return h('div', { class: 'pj pj-work pj-work--single', 'data-project-work': p.id },
        subHead(p, ui, 'continued', (p.labels && p.labels.work) || workingsTitle(p)),
        h('div', { class: 'pj-flow' },
          imageBlock(p, ui),
          hasImage(p) ? null : sketchFigure(p),
          paperLeft(p) ? null : paperBlock(p),
          statsBlock(p),
          list(p.stats).length ? null : comparisonBlock(p),   // the key numbers stand in for the table
          challengesBlock(p), techBlock(p, ui), teamBlock(p), evidenceBlock(p, data)),
        endMark(p));
    }
    var img = imageBlock(p, ui);
    var sk = img ? null : sketchFigure(p);   // with a picture, the steps on the left page are enough
    var title = img ? ((p.labels && p.labels.shot) || 'In use') : labelFor(p, 'howItWorks', 'How it works');
    return h('div', { class: 'pj pj-work', 'data-project-work': p.id },
      subHead(p, ui, 'continued', title),
      h('div', { class: 'pj-flow' },
        img,
        sk,
        statsBlock(p)),
      overleaf('Continued overleaf: ' + resultsTitle(p).toLowerCase() + ', ' + notesTitle(p).toLowerCase()));
  }

  // Spread 2, left page: results, paper and code.
  function resultsPage(p, data, ui) {
    return h('div', { class: 'pj pj-work' },
      subHead(p, ui, 'results', resultsTitle(p)),
      h('div', { class: 'pj-flow' }, comparisonBlock(p), tableBlock(p.comparison2), paperBlock(p), codeBlock(p, ui)));
  }

  // Spread 2, right page: where the project ends.
  function notesPage(p, data, ui) {
    return h('div', { class: 'pj pj-work' },
      subHead(p, ui, 'notes', notesTitle(p)),
      h('div', { class: 'pj-flow' }, challengesBlock(p), techBlock(p, ui), teamBlock(p), evidenceBlock(p, data)),
      endMark(p));
  }

  // The end of a project, under its workings or alone on the right page.
  function endMark(p) {
    return h('div', { class: 'pj-end' },
      h('p', { class: 'pj-end__mark' }, 'End of ' + projNo(p)),
      backLink());
  }

  // "p. 9" or "pp. 10–11": where a project's entry is (its spread, or the right page alone).
  function entryPages(p) {
    if (!N.book || typeof N.book.pages !== 'function') return null;
    var slug = SECTION + '/' + p.id;
    var pg = null, last = null;
    N.book.pages().forEach(function (x) {
      if (x.slug === slug) pg = x;
      if (x.slug === slug + '/results') last = x;
    });
    if (!pg) return null;
    var end = (last || pg).pageNo.right;
    var own = pg.number !== pg.pageNo.right;   // the spread's left page is this project's too
    return own ? { label: pg.pageNo.left + '–' + end, plural: true } : { label: String(end), plural: false };
  }

  // The section's contents: number, title and description only; each row opens its project.
  // The list is split over both pages of the contents spread (part 0 left, part 1 right).
  function indexPage(projects, ui, tab, part) {
    var half = Math.ceil(projects.length / 2);
    var shown = part ? projects.slice(half) : projects.slice(0, half);
    var rows = shown.map(function (p) {
      var slug = SECTION + '/' + p.id;
      var pages = entryPages(p);
      return h('li', { class: 'pj-toc__item' },
        h('a', { class: 'pj-toc__row', href: N.router.href(slug) },
          h('span', { class: 'pj-toc__no' }, projNo(p)),
          h('span', { class: 'pj-toc__main' },
            h('span', { class: 'pj-toc__line' },
              h('span', { class: 'pj-toc__title' }, p.title),
              h('span', { class: 'pj-toc__leader', 'aria-hidden': 'true' }),
              pages ? h('span', { class: 'pj-toc__page' },
                h('span', { class: 'visually-hidden' }, pages.plural ? ', pages ' : ', page '),
                h('span', { 'aria-hidden': 'true' }, pages.plural ? 'pp. ' : 'p. '), pages.label) : null),
            present(p.summary) ? h('span', { class: 'pj-toc__sum' }, p.summary) : null)));
    });

    var first = projects[0], last = projects[projects.length - 1];
    var range = projects.length ? (projects.length > 1 ? projNo(first) + ' – ' + projNo(last) : projNo(first)) : null;
    var tocId = N.ui.uid('pj-toc');
    var header = part
      ? ui.pageHeader({ eyebrow: 'Contents', title: tab + ', continued' })
      : ui.pageHeader({ eyebrow: 'Contents', title: tab, meta: [range ? 'Entries ' + range : null, 'Choose a title to open the project'], opener: true });
    return h('div', { class: 'pj pj-index' },
      header,
      rows.length ? h('nav', { class: 'pj-toc', 'aria-labelledby': tocId },
        h('h3', { class: 'visually-hidden', id: tocId }, part ? 'Project entries, continued' : 'Project entries'),
        h('ol', { class: 'pj-toc__list', start: part ? half + 1 : null }, rows)) : null);
  }

  // "← All projects": back to the contents spread from a project's pages.
  function backLink() {
    return h('a', { class: 'pj-back', href: N.router.href(SECTION) },
      h('span', { class: 'pj-back__mark', 'aria-hidden': 'true' }, '←'), 'Back to all projects');
  }

  /* ---- contents leaders: dots run from the end of a title's last line to its page number ---- */
  function layoutLeaders(root) {
    N.qsa('.pj-toc__line', root).forEach(function (line) {
      var title = line.querySelector('.pj-toc__title');
      var leader = line.querySelector('.pj-toc__leader');
      var page = line.querySelector('.pj-toc__page');
      if (!title || !leader || !page) return;
      var rects = title.getClientRects();
      if (!rects.length || !line.offsetWidth) return;
      var last = rects[rects.length - 1];
      var box = line.getBoundingClientRect();
      var scale = Math.abs(box.width / line.offsetWidth) || 1;
      var gap = 9;
      // a page on the left of a spread is mirrored in 3D: measure from whichever edge is the start
      var left = Math.abs(last.right - box.left) / scale + gap;
      if (box.width < 0 || last.left > box.right) left = Math.abs(box.right - last.left) / scale + gap;
      var right = page.offsetWidth + gap;
      var width = line.offsetWidth - left - right;
      if (width < 14) { leader.style.display = 'none'; return; }
      leader.style.display = 'block';
      leader.style.left = left.toFixed(1) + 'px';
      leader.style.right = right.toFixed(1) + 'px';
    });
  }

  var leaderTimer = 0;
  function relayoutVisibleLeaders() {
    clearTimeout(leaderTimer);
    leaderTimer = setTimeout(function () { N.qsa('.pj-index').forEach(layoutLeaders); }, 60);
  }
  window.addEventListener('resize', relayoutVisibleLeaders);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayoutVisibleLeaders, function () {});

  /* ------------------------------------------------------------ registration */

  // The contents spread first (titles and descriptions on both pages), then each project: it
  // starts on a left page and ends on a right page, over one spread or two (see twoSpreads).
  N.pages.register(SECTION, function (data, ui) {
    var projects = (data.projects || []).filter(function (p) { return p && p.id; });
    var sec = ((data.site && data.site.sections) || []).filter(function (s) { return s.id === SECTION; })[0];
    var tab = sec && sec.tab ? sec.tab : 'Projects';

    function onShow(el) { refreshEvidence(el); }
    function onShowFacing(el) { refreshEvidence(el); }

    var contents = {
      slug: SECTION,
      title: tab,
      running: tab + ' · Contents',
      facingRunning: tab + ' · Contents',
      onShow: layoutLeaders,
      onShowFacing: layoutLeaders,
      facing: function () { return indexPage(projects, ui, tab, 0); },
      build: function () { return indexPage(projects, ui, tab, 1); }
    };

    return [contents].concat([].concat.apply([], projects.map(function (p) {
      var running = tab + ' \u00b7 ' + p.number;
      var first = {
        slug: SECTION + '/' + p.id,
        aliases: [SECTION + '/' + p.id + '/continued'],
        title: p.title,
        running: running,
        facingRunning: running,
        cite: 'left',
        lead: 'left',          // the project's title, on the left page, is where reading starts
        onShow: onShow,
        onShowFacing: onShowFacing,
        facing: function () { return entryPage(p, data, ui); },
        build: hasWorkings(p) || list(p.stats).length ? function () { return showPage(p, data, ui); }
          : function () { return h('div', { class: 'pj pj-work pj-work--end' }, endMark(p)); }
      };
      if (!twoSpreads(p)) return [first];
      return [first, {
        slug: SECTION + '/' + p.id + '/results',
        title: p.title + ': ' + resultsTitle(p).toLowerCase(),
        running: running,
        facingRunning: running,
        cite: 'left',
        onShow: onShow,
        onShowFacing: onShowFacing,
        facing: function () { return resultsPage(p, data, ui); },
        build: function () { return notesPage(p, data, ui); }
      }];
    })));
  });
})(window.Notebook);
