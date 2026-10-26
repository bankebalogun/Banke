(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var CONTACT = 'bankebalogun@gmail.com';
  document.documentElement.classList.add('js');

  // Curtain: once per visit, home page only
  var curtain = $('.curtain');
  if (curtain) {
    var seen = false;
    try { seen = sessionStorage.getItem('bb-seen') === '1'; sessionStorage.setItem('bb-seen', '1'); } catch (e) {}
    if (!seen && !reduce) { document.documentElement.classList.add('js-curtain'); setTimeout(function () { curtain.remove(); }, 2900); }
    else curtain.remove();
  }
  var introDelay = document.documentElement.classList.contains('js-curtain') ? 1500 : 0;

  // Header: solid after the fold, tucks away while scrolling down
  var hdr = $('.hdr'), lastY = 0;
  var onScroll = function () {
    var y = scrollY;
    if (hdr) { hdr.classList.toggle('solid', y > 40); hdr.classList.toggle('hide', y > 500 && y > lastY + 4); if (y < lastY - 4) hdr.classList.remove('hide'); }
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Drawer
  var drawer = $('#drawer'), mb = $('.menu-btn');
  if (drawer && mb) {
    var set = function (on) { drawer.classList.toggle('open', on); drawer.setAttribute('aria-hidden', !on); mb.setAttribute('aria-expanded', on); document.documentElement.style.overflow = on ? 'hidden' : ''; if (on) $('.close', drawer).focus(); };
    $$('li a', drawer).forEach(function (a, i) { a.style.transitionDelay = (0.25 + i * 0.05) + 's'; });
    mb.addEventListener('click', function () { set(true); });
    $('.close', drawer).addEventListener('click', function () { set(false); mb.focus(); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) { set(false); mb.focus(); } });
  }

  // Split headings into words that rise into place
  $$('[data-split]').forEach(function (el) {
    var i = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            w.appendChild(s); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el); el.classList.add('split');
  });
  // Paragraphs that light up word by word as you read
  $$('[data-lit]').forEach(function (el) {
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w'; w.textContent = part; frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el); el.classList.add('lit');
  });
  var lits = $$('.lit');
  var light = function () {
    lits.forEach(function (el) {
      var r = el.getBoundingClientRect(), ws = $$('.w', el);
      var p = reduce ? 1 : Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .35)));
      var n = Math.round(ws.length * p);
      ws.forEach(function (w, k) { w.classList.toggle('on', k < n); });
    });
  };
  if (lits.length) { addEventListener('scroll', light, { passive: true }); light(); }

  // Reveals
  var reveal = function (el) { el.classList.add('in'); el.classList.remove('wait'); };
  var groups = new Map();
  $$('.rv-img, .fade').forEach(function (el) {
    var p = el.parentElement, k = groups.get(p) || 0; groups.set(p, k + 1);
    el.style.setProperty('--d', (Math.min(k, 5) * 0.1) + 's');
  });
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -10% 0px' });
    $$('.split, .rv-img, .fade').forEach(function (el) {
      var top = el.getBoundingClientRect().top;
      if (top < innerHeight * .9) { setTimeout(function () { reveal(el); }, introDelay + 120); }
      else { if (!el.classList.contains('split')) el.classList.add('wait'); io.observe(el); }
    });
  } else $$('.split, .rv-img, .fade').forEach(reveal);

  // Hero: video if present, gentle parallax
  var hero = $('.hero');
  if (hero && !reduce) {
    var media = $('.media', hero);
    addEventListener('scroll', function () { var y = scrollY; if (y < innerHeight * 1.2) { media.style.transform = 'translate3d(0,' + (y * .3) + 'px,0)'; $('.copy', hero).style.opacity = Math.max(0, 1 - y / (innerHeight * .7)); } }, { passive: true });
  }

  // Ways in: panels open on hover, focus or tap
  $$('.acc').forEach(function (acc) {
    var ps = $$('a', acc);
    var open = function (p) { ps.forEach(function (o) { o.classList.toggle('on', o === p); }); };
    ps.forEach(function (p) { p.addEventListener('mouseenter', function () { open(p); }); p.addEventListener('focus', function () { open(p); }); });
  });

  // Portfolio rail: drag to scroll on desktop
  $$('.rail').forEach(function (rail) {
    var down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('drag'); });
    addEventListener('pointerup', function () { down = false; rail.classList.remove('drag'); });
    rail.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; rail.scrollLeft = sl - dx; });
    rail.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
  });

  // Cursor and magnetic buttons
  if (fine && !reduce) {
    var cur = document.createElement('div'); cur.className = 'cursor'; cur.innerHTML = '<span></span>'; document.body.appendChild(cur);
    var lab = $('span', cur), x = -100, y = -100, cx = x, cy = y;
    addEventListener('mousemove', function (e) { x = e.clientX; y = e.clientY; cur.classList.add('on'); }, { passive: true });
    document.addEventListener('mouseleave', function () { cur.classList.remove('on'); });
    (function loop() { cx += (x - cx) * .18; cy += (y - cy) * .18; cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'; requestAnimationFrame(loop); })();
    $$('[data-cursor]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { lab.textContent = el.getAttribute('data-cursor'); cur.classList.add('big'); });
      el.addEventListener('mouseleave', function () { cur.classList.remove('big'); });
    });
    $$('.btn').forEach(function (b) {
      b.addEventListener('mousemove', function (e) { var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * .16 + 'px,' + (e.clientY - r.top - r.height / 2) * .26 + 'px)'; });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
  }

  // Page transitions
  if (!reduce) {
    var pt = document.createElement('div'); pt.className = 'pt'; pt.setAttribute('aria-hidden', 'true');
    if (!curtain || !document.documentElement.classList.contains('js-curtain')) { pt.classList.add('cover'); requestAnimationFrame(function () { requestAnimationFrame(function () { pt.classList.add('out'); }); }); }
    document.body.appendChild(pt);
    setTimeout(function () { pt.className = 'pt'; }, 1100);
    $$('a[href$=".html"], a[href*=".html#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || e.defaultPrevented) return;
        var href = a.getAttribute('href'), here = location.pathname.split('/').pop() || 'index.html';
        if (href.split('#')[0] === here) return;
        e.preventDefault(); pt.className = 'pt in';
        setTimeout(function () { location.href = href; }, 600);
      });
    });
    addEventListener('pageshow', function (e) { if (e.persisted) pt.className = 'pt'; });
  }


  // Opening: a slow sequence of opera houses
  var seq = $('.seq');
  if (seq && !reduce) {
    var si = $$('img', seq), wh = $$('.hero .where span'), at = 0;
    si.forEach(function (im) { im.loading = 'eager'; });
    setInterval(function () {
      si[at].classList.remove('on'); at = (at + 1) % si.length;
      void si[at].offsetWidth; si[at].classList.add('on');
      wh.forEach(function (w) { w.style.transform = 'translateY(' + (-100 * at) + '%)'; });
    }, 7000);
  }
  // Lookbook: scrolls sideways while the section is pinned
  var lb = $('.lookbook'), lt = lb && $('.lb-track'), lbar = lb && $('.lb-bar i');
  var wideLb = matchMedia('(min-width: 901px)');
  var sizeLb = function () {
    if (!lb) return;
    if (!wideLb.matches || reduce) { lb.style.height = ''; lt.style.transform = ''; return; }
    var extra = lt.scrollWidth - innerWidth; lb.style.height = (innerHeight + Math.max(0, extra)) + 'px'; moveLb();
  };
  var moveLb = function () {
    if (!lb || !wideLb.matches || reduce) return;
    var r = lb.getBoundingClientRect(), extra = lt.scrollWidth - innerWidth;
    var p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
    lt.style.transform = 'translate3d(' + (-extra * p) + 'px,0,0)'; if (lbar) lbar.style.transform = 'scaleX(' + p + ')';
  };
  if (lb) { addEventListener('resize', sizeLb); addEventListener('scroll', moveLb, { passive: true }); addEventListener('load', sizeLb); sizeLb(); }
  // Signature draws itself
  if ('IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); sio.unobserve(e.target); } }); }, { threshold: .4 });
    $$('.sig').forEach(function (s) { if (reduce) s.classList.add('in'); else sio.observe(s); });
  }
  // Speaker reel plays in place
  $$('.reel').forEach(function (r) {
    r.addEventListener('click', function (e) {
      e.preventDefault();
      r.insertAdjacentHTML('beforeend', '<iframe src="https://www.youtube-nocookie.com/embed/' + r.getAttribute('data-reel') + '?autoplay=1&rel=0" title="Banke Balogun speaker reel" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>');
    }, { once: true });
  });

  // Work with me: open one offer at a time
  $$('.offer button').forEach(function (b) {
    b.addEventListener('click', function () {
      var o = b.closest('.offer'), on = !o.classList.contains('open');
      $$('.offer').forEach(function (x) { x.classList.remove('open'); $('button', x).setAttribute('aria-expanded', 'false'); });
      o.classList.toggle('open', on); b.setAttribute('aria-expanded', on);
    });
  });

  // Chips
  $$('.chips').forEach(function (g) {
    var multi = g.hasAttribute('data-multi');
    $$('.chip', g).forEach(function (c) {
      c.addEventListener('click', function () {
        if (multi) c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true');
        else $$('.chip', g).forEach(function (o) { o.setAttribute('aria-pressed', o === c); });
      });
    });
  });
  // Forms open an email to Banke
  $$('form.form:not([data-form-id])').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.reportValidity()) return;
      var lines = [];
      $$('[data-label]', f).forEach(function (i) { if (i.value) lines.push(i.getAttribute('data-label') + ': ' + i.value); });
      var ch = $$('.chip[aria-pressed="true"]', f).map(function (c) { return c.textContent; });
      if (ch.length) lines.push('About: ' + ch.join(', '));
      location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(f.getAttribute('data-subject')) + '&body=' + encodeURIComponent(lines.join('\n'));
      var n = $('.note', f); if (n) n.textContent = 'Your email app should open with your message. If it doesn’t, write to ' + CONTACT + '.';
    });
  });

  // Her World: playlist
  var tb = $$('.pl button'), lbl = $('.disc .label');
  tb.forEach(function (b) {
    b.addEventListener('click', function () { tb.forEach(function (o) { o.setAttribute('aria-pressed', o === b); }); if (lbl) { lbl.style.transform = 'scale(.6)'; setTimeout(function () { lbl.textContent = b.getAttribute('data-t'); lbl.style.transform = ''; }, 220); } });
  });
  if (lbl) lbl.style.transition = 'transform .4s cubic-bezier(.2,.7,.1,1)';
  // Her World: chapter index
  var hwl = $$('.hw-index a');
  if (hwl.length && 'IntersectionObserver' in window) {
    var mark = function (id) { hwl.forEach(function (a) { var on = a.getAttribute('href') === '#' + id; a.classList.toggle('on', on); if (on && innerWidth < 900) a.parentElement.parentElement.scrollTo({ left: a.parentElement.offsetLeft - 20, behavior: 'smooth' }); }); };
    var hio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); }); }, { rootMargin: '-35% 0px -60% 0px' });
    $$('.ch').forEach(function (c) { hio.observe(c); });
  }

  // Filters and lightbox
  var fb = $$('.filters button'), tiles = $$('.pf button');
  fb.forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-f'); fb.forEach(function (o) { o.setAttribute('aria-pressed', o === b); }); tiles.forEach(function (t) { t.hidden = !(k === 'all' || t.getAttribute('data-c') === k); }); }); });
  if (tiles.length) {
    var box, im, ct, at = 0, vis = [];
    var show = function (i) { at = (i + vis.length) % vis.length; var s = $('img', vis[at]); im.src = s.src; im.alt = s.alt; ct.textContent = (at + 1) + ' / ' + vis.length; };
    var close = function () { if (box) { box.remove(); box = null; vis[at].focus(); } };
    tiles.forEach(function (t) {
      t.addEventListener('click', function () {
        vis = tiles.filter(function (x) { return !x.hidden; });
        box = document.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Photo viewer');
        box.innerHTML = '<img alt=""><span class="lb ct"></span><button class="lb x" type="button">Close</button><button class="lb pv" type="button" aria-label="Previous photo">&#8592;</button><button class="lb nx" type="button" aria-label="Next photo">&#8594;</button>';
        im = $('img', box); ct = $('.ct', box);
        $('.x', box).onclick = close; $('.pv', box).onclick = function () { show(at - 1); }; $('.nx', box).onclick = function () { show(at + 1); };
        box.addEventListener('click', function (e) { if (e.target === box) close(); });
        box.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); });
        var sx = 0; box.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true }); box.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1)); });
        document.body.appendChild(box); show(vis.indexOf(t)); $('.x', box).focus();
      });
    });
  }
})();
