/* Finishing layer: smooth scroll, velvet transitions, chapter rail, LA clock. Loads after site.js. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine)').matches;
  var root = document.documentElement;
  var headerOffset = function () { var h = $('.hdr'); return -((h && h.offsetHeight) || 80) - 12; };

  // Smooth, weighted scrolling on desktop
  var lenis = null;
  if (false) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
    root.classList.add('lenis-on');
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    // Pause while the menu or the lightbox holds the page still
    new MutationObserver(function () { if (root.style.overflow === 'hidden') lenis.stop(); else lenis.start(); }).observe(root, { attributes: true, attributeFilter: ['style'] });
    // In-page links glide instead of jumping
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var href = a.getAttribute('href'), page = href.split('#')[0], here = location.pathname.split('/').pop() || 'index.html';
      if (page && page !== here) return;
      var id = href.split('#')[1]; var el = id ? document.getElementById(id) : null; if (!el) return;
      e.preventDefault(); history.replaceState(null, '', '#' + id);
      setTimeout(function () { lenis.scrollTo(el, { offset: headerOffset(), duration: 1.4 }); }, 40);
    }, true);
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.to-top')) { e.stopPropagation(); lenis.scrollTo(0, { duration: 1.6 }); }
    }, true);
    if (location.hash) { var t0 = document.getElementById(location.hash.slice(1)); if (t0) setTimeout(function () { lenis.scrollTo(t0, { offset: headerOffset(), immediate: true }); }, 60); }
  }
  window.bbLenis = lenis;

  // Velvet curtain for page changes
  var pt = $('.pt');
  if (pt && !$('.pt-mark', pt)) pt.innerHTML = '<span class="pt-mark" aria-hidden="true"><svg class="mark" viewBox="0 0 48 60" aria-hidden="true" focusable="false"><path d="M5 58V24a19 19 0 0 1 38 0v34" fill="none" stroke="#C9A062" stroke-width="0.8"/><path d="M1.5 58h45" fill="none" stroke="#C9A062" stroke-width="0.8"/><path d="M31.24 22.06L37.52 20.38M30.50 20.25L34.39 18.00M29.30 18.70L33.90 14.10M27.75 17.50L30.00 13.61M25.94 16.76L27.62 10.48M24.00 16.50L24.00 12.00M22.06 16.76L20.38 10.48M20.25 17.50L18.00 13.61M18.70 18.70L14.10 14.10M17.50 20.25L13.61 18.00M16.76 22.06L10.48 20.38" fill="none" stroke="#E7CD96" stroke-width="0.6400000000000001" stroke-linecap="round"/><circle cx="24" cy="24" r="1.6" fill="#E7CD96"/><text x="24.2" y="51.5" text-anchor="middle" font-family="\'Bodoni Moda\', Didot, \'Bodoni 72\', Georgia, serif" font-size="22.5" letter-spacing="-1.2" fill="#F8F2EA">BB</text></svg><b>BANKE</b><i>Balogun</i></span>';

  // Chapter rail: the labels of this page's sections, down the right edge
  var secs = $('.hw-index') ? [] : $$('section').filter(function (s) { var k = $('.kick', s); return k && k.closest('section') === s && k.textContent.trim(); });
  if (secs.length >= 3 && fine) {
    var rail = document.createElement('nav'); rail.className = 'chrail'; rail.setAttribute('aria-label', 'Sections on this page');
    rail.innerHTML = '<ol>' + secs.map(function (s, i) {
      if (!s.id) s.id = 'ch-' + (i + 1);
      return '<li><a href="#' + s.id + '"><span class="rn">' + String(i + 1).padStart(2, '0') + '</span><span class="rl">' + $('.kick', s).textContent.trim() + '</span></a></li>';
    }).join('') + '</ol>';
    document.body.appendChild(rail);
    var links = $$('a', rail);
    var track = function () {
      var mid = innerHeight * 0.45, cur = -1;
      secs.forEach(function (s, i) { if (s.getBoundingClientRect().top < mid) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
      rail.classList.toggle('show', scrollY > innerHeight * 0.6 && cur > -1);
      var ft = $('.ftr'); rail.classList.toggle('hide', ft && ft.getBoundingClientRect().top < innerHeight * 0.8);
    };
    addEventListener('scroll', track, { passive: true }); track();
  }

  // The time in Los Angeles, in the footer
  var base = $('.ftr .base');
  if (base && window.Intl) {
    var clock = document.createElement('span'); clock.className = 'la-time';
    var fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
    var tick = function () { clock.innerHTML = '<i aria-hidden="true"></i>Los Angeles · ' + fmt.format(new Date()); };
    tick(); setInterval(tick, 30000); base.insertBefore(clock, base.children[1] || null);
  }

  // Headings take on a slow gold sheen once they have risen into place
  $$('.hero h1 .sur').forEach(function (el) { el.classList.add('foil'); });
  // Menu labels roll over to a gold copy on hover
  $$('.hdr nav .dd > a:not(.btn)').forEach(function (a) {
    if (a.children.length) return; var t = a.textContent;
    a.innerHTML = '<span class="roll"><span class="rr" data-t="' + t.replace(/"/g, '&quot;') + '">' + t + '</span></span>';
  });

  // An art deco fan above each closing call to action, drawn as it arrives
  var fan = (function () {
    var rays = '', cx = 70, cy = 44;
    for (var k = 0; k <= 10; k++) { var a = Math.PI * (k / 10); rays += '<line x1="' + (cx + Math.cos(a) * 12).toFixed(1) + '" y1="' + (cy - Math.sin(a) * 12).toFixed(1) + '" x2="' + (cx + Math.cos(a) * 30).toFixed(1) + '" y2="' + (cy - Math.sin(a) * 30).toFixed(1) + '"/>'; }
    return '<svg class="orn" viewBox="0 0 140 48" aria-hidden="true" focusable="false"><path d="M40 44a30 30 0 0 1 60 0M52 44a18 18 0 0 1 36 0"/>' + rays + '<path d="M4 44h30M106 44h30"/><circle cx="70" cy="44" r="2.2"/></svg>';
  })();
  var orns = $$('.closing .wrap, .quote .wrap').map(function (w) { w.insertAdjacentHTML('afterbegin', fan); return w.firstElementChild; });
  if ('IntersectionObserver' in window && !reduce) {
    var oio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('drawn'); oio.unobserve(e.target); } }); }, { threshold: .6 });
    orns.forEach(function (o) { oio.observe(o); });
  } else orns.forEach(function (o) { o.classList.add('drawn'); });
  // Ribbons: the press names drift on their own, follow the scroll direction, slow on hover and can be dragged
  $$('.featured ul').forEach(function (ul) {
    ul.closest('.featured').classList.add('rib');
    var rb = document.createElement('div'); rb.className = 'rib-box'; ul.parentNode.insertBefore(rb, ul); rb.appendChild(ul);
    Array.prototype.slice.call(ul.children).forEach(function (li) { var c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); ul.appendChild(c); });
  });
  $$('.marquee .track, .featured.rib ul').forEach(function (track) {
    if (reduce) return;
    track.style.animation = 'none';
    var box = track.parentElement, x = 0, dir = 1, boost = 0, hover = false, drag = null, vel = 0, last = performance.now(), lastY = scrollY;
    box.classList.add('ribbon');
    var half = function () { return track.scrollWidth / 2; };
    box.addEventListener('pointerenter', function () { hover = true; });
    box.addEventListener('pointerleave', function () { hover = false; });
    box.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, start: x }; vel = 0; box.classList.add('grab'); box.setPointerCapture(e.pointerId); });
    box.addEventListener('pointermove', function (e) { if (!drag) return; var nx = drag.start + (e.clientX - drag.x); vel = nx - x; x = nx; });
    var up = function () { if (!drag) return; drag = null; box.classList.remove('grab'); if (Math.abs(vel) > 1) dir = vel < 0 ? 1 : -1; };
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    addEventListener('scroll', function () { var d = scrollY - lastY; lastY = scrollY; if (d) { dir = d > 0 ? 1 : -1; boost = Math.min(9, boost + Math.abs(d) / 14); } }, { passive: true });
    (function tick(t) {
      var dt = Math.min(64, t - last); last = t;
      if (!drag) { x -= dir * (hover ? .25 : .9 + boost) * dt / 16; x += vel; vel *= .92; }
      boost *= .93;
      var h = half(); if (h > 0) { while (x <= -h) x += h; while (x > 0) x -= h; }
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      requestAnimationFrame(tick);
    })(last);
  });

  // Tabs: arrow keys move between them, one panel shows at a time
  var tabs = function (list, onShow) {
    var bs = $$('[role="tab"]', list);
    var show = function (b, focus) {
      bs.forEach(function (o) { var on = o === b, pnl = document.getElementById(o.getAttribute('aria-controls')); o.setAttribute('aria-selected', on); o.tabIndex = on ? 0 : -1; if (pnl) { pnl.hidden = !on; pnl.classList.toggle('on', on); } });
      if (focus) b.focus(); if (onShow) onShow(b);
    };
    bs.forEach(function (b, i) {
      b.addEventListener('click', function () { show(b); });
      b.addEventListener('keydown', function (e) { var k = e.key, n = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 0; if (n) { e.preventDefault(); show(bs[(i + n + bs.length) % bs.length], true); } });
    });
  };
  $$('.pick-tabs, .area-tabs').forEach(function (l) { tabs(l); });

  // "I'm into this" picks the matching interest in the questionnaire
  $$('[data-interest]').forEach(function (a) {
    a.addEventListener('click', function () {
      var v = a.getAttribute('data-interest');
      setTimeout(function () { var c = document.querySelector('#join .chip[data-value="' + v.replace(/"/g, '') + '"]'); if (c && c.getAttribute('aria-pressed') !== 'true') c.click(); }, 900);
    });
  });

  // Cards that turn over
  $$('.pcard, .kcard').forEach(function (c) { c.addEventListener('click', function () { if (c.dataset.dragged) { delete c.dataset.dragged; return; } c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true'); }); });

  // The deck about me scrolls sideways by drag on desktop
  $$('.deck').forEach(function (d) {
    var down = null;
    d.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = { x: e.clientX, s: d.scrollLeft, moved: false }; });
    d.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - down.x; if (Math.abs(dx) > 5) { down.moved = true; d.classList.add('grab'); } d.scrollLeft = down.s - dx; });
    var up = function (e) { if (down && down.moved) { var c = e.target.closest && e.target.closest('.kcard'); if (c) c.dataset.dragged = '1'; } down = null; d.classList.remove('grab'); };
    d.addEventListener('pointerup', up); d.addEventListener('pointerleave', function () { down = null; d.classList.remove('grab'); });
  });

  // Sound familiar? The story changes frame as you scroll through it
  $$('.story').forEach(function (st) {
    var fs = $$('.story-f', st), dots = $$('.story-dots li', st), cur = 0;
    var set = function (i) { if (i === cur) return; cur = i; fs.forEach(function (f, k) { f.classList.toggle('on', k === i); f.classList.toggle('past', k < i); }); dots.forEach(function (d, k) { d.classList.toggle('on', k === i); }); };
    var frame = function () { var r = st.getBoundingClientRect(), total = r.height - innerHeight; if (total <= 0) return; var p = Math.min(.999, Math.max(0, -r.top / total)); set(Math.floor(p * fs.length)); };
    addEventListener('scroll', frame, { passive: true }); frame();
  });

  // Her World: the record spins while a song is picked, with a tonearm and a little equalizer
  var disc = $('.disc');
  if (disc) {
    var dw = document.createElement('div'); dw.className = 'disc-wrap'; disc.parentNode.insertBefore(dw, disc); dw.appendChild(disc);
    dw.insertAdjacentHTML('beforeend', '<span class="arm" aria-hidden="true"></span>');
    var eq = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
    var mark = function () { $$('.pl button').forEach(function (b) { var e = b.querySelector('.eq'); if (b.getAttribute('aria-pressed') === 'true') { if (!e) b.insertAdjacentHTML('beforeend', eq); } else if (e) e.remove(); }); };
    mark();
    $$('.pl button').forEach(function (b) { b.addEventListener('click', function () { disc.classList.remove('drop'); void disc.offsetWidth; disc.classList.add('drop'); setTimeout(mark, 10); }); });
  }
  var tapeBtn = $('#tape .tape-btn');
  if (tapeBtn && !$('.eq', tapeBtn)) tapeBtn.insertAdjacentHTML('beforeend', '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>');
  // Music that plays on the page: 30-second previews from the Apple Music catalog
  (function () {
    var audio = new Audio(); audio.preload = 'none'; var current = null, cache = {}, n = 0;
    var find = function (q) {
      if (q in cache) return Promise.resolve(cache[q]);
      return new Promise(function (res) {
        var cb = 'bbSong' + (++n), tag = document.createElement('script');
        var done = function (v) { delete window[cb]; if (tag.parentNode) tag.parentNode.removeChild(tag); res(v); };
        window[cb] = function (d) { var r = d && d.results && d.results.find(function (x) { return x.previewUrl; }); cache[q] = r || null; done(cache[q]); };
        tag.onerror = function () { done(null); };
        setTimeout(function () { if (window[cb]) done(null); }, 8000);
        tag.src = 'https://itunes.apple.com/search?media=music&entity=song&limit=5&term=' + encodeURIComponent(q) + '&callback=' + cb;
        document.head.appendChild(tag);
      });
    };
    var disc = $('.disc'), dw = $('.disc-wrap') || (disc && disc.parentElement);
    var state = function (el, on, wait) {
      $$('.pl button, .pbtn').forEach(function (b) { b.classList.toggle('playing', b === el && on); b.classList.toggle('loading', b === el && !!wait); });
      if (disc) disc.classList.toggle('spin', on && !reduce);
      if (dw) dw.classList.toggle('spinning', on);
      var lbl = $('.disc .label'); if (lbl && el && el.closest('.pl')) lbl.textContent = el.getAttribute('data-t');
    };
    var play = function (el, q, fallback) {
      if (current === el && !audio.paused) { audio.pause(); state(el, false); return; }
      current = el; state(el, false, true);
      var tape = $('#tape'); if (tape && tape.classList.contains('on')) { var tb = $('.tape-btn', tape); if (tb) tb.click(); }
      find(q).then(function (r) {
        if (current !== el) return;
        if (!r) { state(el, false); if (fallback) window.open(fallback, '_blank', 'noopener'); return; }
        audio.src = r.previewUrl;
        audio.play().then(function () { state(el, true); }).catch(function () { state(el, false); });
      });
    };
    audio.addEventListener('ended', function () { state(current, false); });
    $$('.pl button').forEach(function (b) {
      var li = b.closest('li'), a = li && li.querySelector('a'), who = b.querySelector('small');
      b.addEventListener('click', function () { play(b, b.getAttribute('data-t') + ' ' + (who ? who.textContent : ''), a && a.href); });
    });
    $$('.pbtn').forEach(function (b) { var a = b.parentElement.querySelector('a'); b.addEventListener('click', function () { play(b, b.getAttribute('data-q'), a && a.href); }); });
    if (dw) {
      dw.style.cursor = 'pointer';
      dw.addEventListener('click', function () {
        if (current && !audio.paused) { audio.pause(); state(current, false); }
        else { var b = $('.pl button[aria-pressed="true"]') || $('.pl button'); if (b) b.click(); }
      });
    }
  })();
  // My content: filter the videos by topic
  $$('.reel-tabs').forEach(function (tabs) {
    var list = tabs.nextElementSibling;
    $$('button', tabs).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-f');
        $$('button', tabs).forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
        $$('li', list).forEach(function (li) { li.hidden = f !== 'all' && li.getAttribute('data-c') !== f; if (!li.hidden) li.classList.add('in'); });
      });
    });
  });
})();

/* My content: arrows for the video row */
(function () {
  document.querySelectorAll('.vrow').forEach(function (row) {
    var list = row.querySelector('.vscroll'), prev = row.querySelector('.prev'), next = row.querySelector('.next');
    if (!list || !prev || !next) return;
    var sync = function () { prev.disabled = list.scrollLeft < 8; next.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 8; };
    prev.addEventListener('click', function () { list.scrollBy({ left: -list.clientWidth * .8, behavior: 'smooth' }); });
    next.addEventListener('click', function () { list.scrollBy({ left: list.clientWidth * .8, behavior: 'smooth' }); });
    list.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); sync();
    var tabs = row.previousElementSibling;
    if (tabs && tabs.classList.contains('reel-tabs')) tabs.addEventListener('click', function () { setTimeout(function () { list.scrollLeft = 0; sync(); }, 30); });
  });
})();

/* Motion layer: mark things as seen once they scroll into view */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var q = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  q('.deck, .vids, .lb-track, .cbento, .featured ul, .reel-tabs').forEach(function (el) {
    el.classList.add('stagger');
    Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 10)); });
  });
  var targets = q('.stagger, .sec .h-l, .ch .h-m, .lookbook .h-l, .ftr .big');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  targets.forEach(function (t) { io.observe(t); });
  // Anything already on screen at load shows straight away
  setTimeout(function () { targets.forEach(function (t) { var r = t.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) t.classList.add('seen'); }); }, 120);
  // Filters reveal tiles that were hidden
  q('.reel-tabs button, .filters button').forEach(function (b) { b.addEventListener('click', function () { q('.stagger').forEach(function (s) { s.classList.add('seen'); }); }); });
})();

/* Motion layer, round two: gentle parallax on photos, staggered grids */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var q = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  if (reduce) return;
  // Parallax: large section photos only (not the opening, cards, or grids)
  var els = q('.sec .rv-img, .ch .interlude .rv-img, .know-vid .rv-img, .cr-img .rv-img, .duo .rv-img').filter(function (el) {
    return !el.closest('.hero, .pf, .lb-track, .vids, .deck, .story-f');
  });
  els.forEach(function (el) { el.classList.add('px'); });
  var ticking = false;
  var update = function () {
    ticking = false;
    var vh = innerHeight;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); // -1..1
      el.style.setProperty('--py', (Math.max(-1, Math.min(1, p)) * -3).toFixed(2) + '%');
    });
  };
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update); update();
  // Photo grids rise in, one after another
  if ('IntersectionObserver' in window) {
    q('.pf').forEach(function (g) {
      var tiles = Array.prototype.slice.call(g.children);
      tiles.forEach(function (t, i) { t.style.transition = 'opacity .8s cubic-bezier(.2,.7,.1,1), transform .9s cubic-bezier(.2,.7,.1,1)'; t.style.transitionDelay = (i % 6) * 60 + 'ms'; t.style.opacity = '0'; t.style.transform = 'translateY(24px)'; });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'none'; io.unobserve(e.target); } });
      }, { threshold: 0.08 });
      tiles.forEach(function (t) { io.observe(t); });
      setTimeout(function () { tiles.forEach(function (t) { var r = t.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) { t.style.opacity = '1'; t.style.transform = 'none'; } }); }, 150);
    });
  }
})();

/* Round three: gold wipe on large section photos */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  var els = Array.prototype.slice.call(document.querySelectorAll('.know-vid .rv-img, .cr-img .rv-img, .ch .interlude .rv-img, .duo .rv-img, .sec.pearl .rv-img, .sticky .rv-img'))
    .filter(function (el) { return !el.closest('.hero, .pf, .lb-track, .vids, .deck, .story-f, .pick-panel, .area'); });
  els.forEach(function (el) { el.classList.add('gw'); });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } });
  }, { threshold: 0.2 });
  els.forEach(function (el) { io.observe(el); });
  setTimeout(function () { els.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('seen'); }); }, 200);
})();

/* Home: arts slideshow section */
(function () {
  var film = document.querySelector('.arts-reel .film'); if (!film) return;
  var fr = Array.prototype.slice.call(film.querySelectorAll('img')), fi = 0;
  var load = function (im) { if (im && im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); } };
  load(fr[1]);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || fr.length < 2) return;
  setInterval(function () {
    var cur = fr[fi]; fi = (fi + 1) % fr.length; var nx = fr[fi];
    load(nx); load(fr[(fi + 1) % fr.length]);
    nx.classList.remove('on'); void nx.offsetWidth; nx.classList.add('on');
    setTimeout(function () { cur.classList.remove('on'); }, 2400);
  }, 6000);
})();

/* Content page: progress bar and edge fade for the video row */
(function () {
  document.querySelectorAll('.vrow').forEach(function (row) {
    var list = row.querySelector('.vscroll'), bar = row.parentNode.querySelector('.vprog i');
    if (!list) return;
    var sync = function () {
      var max = list.scrollWidth - list.clientWidth, f = max > 0 ? list.scrollLeft / max : 1, w = Math.max(.12, Math.min(1, list.clientWidth / list.scrollWidth));
      if (bar) { bar.style.width = (w * 100) + '%'; bar.style.marginLeft = (f * (1 - w) * 100) + '%'; }
      row.classList.toggle('end', f > .98);
    };
    list.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); setTimeout(sync, 300);
    var tabs = row.parentNode.querySelector('.reel-tabs');
    if (tabs) tabs.addEventListener('click', function () { setTimeout(sync, 60); });
  });
})();
