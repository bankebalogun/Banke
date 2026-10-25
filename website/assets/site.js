(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var inPreview = window.self !== window.top;
  var CONTACT = 'bankebalogun@gmail.com';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Curtain: plays once per visit on the home page
  var curtain = $('.curtain');
  if (curtain) {
    var seen = false;
    try { seen = sessionStorage.getItem('bb-curtain') === '1'; sessionStorage.setItem('bb-curtain', '1'); } catch (e) {}
    if (!seen && !reduce) {
      document.documentElement.classList.add('js-curtain');
      setTimeout(function () { curtain.remove(); }, 2800);
    } else { curtain.remove(); }
  }

  // Drawer menu
  var drawer = $('.drawer'), openBtn = $('.menu-btn');
  if (drawer && openBtn) {
    var setOpen = function (o) { drawer.classList.toggle('open', o); openBtn.setAttribute('aria-expanded', o); drawer.setAttribute('aria-hidden', !o); if (o) $('.close', drawer).focus(); else openBtn.focus(); };
    openBtn.addEventListener('click', function () { setOpen(true); });
    $('.close', drawer).addEventListener('click', function () { setOpen(false); });
    drawer.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { drawer.classList.remove('open'); }); });
  }

  // Custom cursor with labels
  if (fine && !reduce) {
    var cur = document.createElement('div'); cur.className = 'cursor'; cur.innerHTML = '<span></span>'; document.body.appendChild(cur);
    var lab = $('span', cur), x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('mousemove', function (e) { x = e.clientX; y = e.clientY; cur.classList.add('on'); }, { passive: true });
    document.addEventListener('mouseleave', function () { cur.classList.remove('on'); });
    (function loop() { cx += (x - cx) * .2; cy += (y - cy) * .2; cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'; requestAnimationFrame(loop); })();
    $$('[data-cursor]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { lab.textContent = el.getAttribute('data-cursor'); cur.classList.add('big'); });
      el.addEventListener('mouseleave', function () { cur.classList.remove('big'); });
    });
    // Magnetic buttons
    $$('.btn, .offer .go').forEach(function (b) {
      b.addEventListener('mousemove', function (e) { var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * .18 + 'px,' + (e.clientY - r.top - r.height / 2) * .28 + 'px)'; });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
  }

  // Reveal on scroll: only things below the fold wait
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        if (t.classList.contains('rv-wait')) { t.classList.replace('rv-wait', 'rv-in'); }
        if (t.classList.contains('mask-wait')) { t.classList.replace('mask-wait', 'mask-in'); }
        io.unobserve(t);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.rv, .mask').forEach(function (el) {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add(el.classList.contains('mask') ? 'mask-wait' : 'rv-wait'); io.observe(el); }
    });
  }

  // Scroll-driven effects
  var lit = $$('.statement .w'), statement = $('.statement');
  var paras = $$('[data-parallax]');
  var reel = $('.reel');
  var lb = $('.lookbook'), rail = lb && $('.rail', lb), bar = lb && $('.bar i', lb), cnt = lb && $('.count b', lb);
  var wide = matchMedia('(min-width: 761px)');
  function sizeLook() {
    if (!lb) return;
    if (!wide.matches || reduce) { lb.style.height = ''; rail.style.transform = ''; return; }
    lb.style.height = (innerHeight + Math.max(0, rail.scrollWidth - innerWidth)) + 'px';
  }
  function frame() {
    var vh = innerHeight;
    if (statement && lit.length) {
      var r = statement.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height * .75)));
      var n = Math.round(p * lit.length);
      lit.forEach(function (w, i) { w.classList.toggle('lit', i < n); });
    }
    if (!reduce) paras.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var k = parseFloat(el.getAttribute('data-parallax')) || .15;
      el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - vh / 2) * -k) + 'px,0)';
    });
    if (reel && !reduce) {
      var rr = reel.getBoundingClientRect();
      var q = Math.min(1, Math.max(0, (vh - rr.top) / (vh * .9)));
      reel.style.setProperty('--m', ((1 - q) * 9).toFixed(2) + '%');
    }
    if (lb && wide.matches && !reduce) {
      var lr = lb.getBoundingClientRect(), dist = rail.scrollWidth - innerWidth;
      var lp = Math.min(1, Math.max(0, -lr.top / Math.max(1, lb.offsetHeight - vh)));
      rail.style.transform = 'translate3d(' + (-lp * dist) + 'px,0,0)';
      bar.style.transform = 'scaleX(' + lp + ')';
      if (cnt) { var tot = $$('figure', rail).length; cnt.textContent = String(Math.max(1, Math.ceil(lp * tot))).padStart(2, '0'); }
    }
  }
  var ticking = false;
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { frame(); ticking = false; }); } }, { passive: true });
  addEventListener('resize', function () { sizeLook(); frame(); });
  addEventListener('load', function () { sizeLook(); frame(); });
  sizeLook(); frame();

  // Worlds index: hover, focus or tap swaps the photograph
  var worlds = $('.worlds');
  if (worlds) {
    var items = $$('li', worlds), imgs = $$('.stage img', worlds), cap = $('.stage .cap', worlds);
    var pick = function (i) {
      items.forEach(function (li, j) { li.classList.toggle('on', i === j); $('button', li).setAttribute('aria-expanded', i === j); });
      imgs.forEach(function (im, j) { im.classList.toggle('on', i === j); });
      if (cap) cap.textContent = imgs[i] ? imgs[i].getAttribute('data-cap') : '';
    };
    items.forEach(function (li, i) {
      var b = $('button', li);
      b.addEventListener('click', function () { pick(i); });
      b.addEventListener('focus', function () { pick(i); });
      if (fine) b.addEventListener('mouseenter', function () { pick(i); });
    });
    pick(0);
  }

  // Speaker reel: plays on the page on the live site; opens YouTube from the preview
  $$('[data-reel]').forEach(function (r) {
    r.addEventListener('click', function (e) {
      if (inPreview) return;
      e.preventDefault();
      if ($('iframe', r)) return;
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + r.getAttribute('data-reel') + '?autoplay=1&rel=0';
      f.title = 'Banke Balogun speaker reel'; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
      r.appendChild(f);
    });
  });

  // Chips
  $$('.chip').forEach(function (c) { c.addEventListener('click', function () { c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }); });

  // Forms open an email to Banke on the live site
  $$('form[data-subject]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = $('.note', form.parentElement) || $('.note', form);
      var lines = [];
      $$('input, textarea', form).forEach(function (f) { if (f.value) lines.push((f.getAttribute('data-label') || f.name) + ': ' + f.value); });
      var picked = $$('.chip[aria-pressed="true"]', form).map(function (b) { return b.textContent.trim(); });
      if (picked.length) lines.push('Interested in: ' + picked.join(', '));
      if (inPreview) { if (note) note.textContent = 'Preview only. On the live site this opens an email to ' + CONTACT + ' with these details.'; return; }
      location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(form.getAttribute('data-subject')) + '&body=' + encodeURIComponent(lines.join('\n'));
      if (note) note.textContent = 'Your email app should open with your message. If it does not, write to ' + CONTACT + '.';
    });
  });

  // Archive filters and lightbox
  var fbtns = $$('.filters button'), tiles = $$('.masonry button');
  fbtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-f');
      fbtns.forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
      tiles.forEach(function (t) { t.hidden = !(k === 'all' || t.getAttribute('data-c') === k); });
    });
  });
  if (tiles.length) {
    var box, im, ct, at = 0, vis = [];
    var show = function (i) { at = (i + vis.length) % vis.length; var s = $('img', vis[at]); im.src = s.src; im.alt = s.alt; ct.textContent = String(at + 1).padStart(2, '0') + ' / ' + String(vis.length).padStart(2, '0'); };
    var close = function () { if (box) { box.remove(); box = null; vis[at].focus(); } };
    tiles.forEach(function (t) {
      t.addEventListener('click', function () {
        vis = tiles.filter(function (x) { return !x.hidden; });
        box = document.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Photo viewer');
        box.innerHTML = '<img alt=""><p class="ct"></p><button class="lb x" type="button" aria-label="Close">&times;</button><button class="lb pv" type="button" aria-label="Previous photo">&#8592;</button><button class="lb nx" type="button" aria-label="Next photo">&#8594;</button>';
        im = $('img', box); ct = $('.ct', box);
        $('.x', box).onclick = close; $('.pv', box).onclick = function () { show(at - 1); }; $('.nx', box).onclick = function () { show(at + 1); };
        box.addEventListener('click', function (e) { if (e.target === box) close(); });
        box.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); });
        document.body.appendChild(box); show(vis.indexOf(t)); $('.x', box).focus();
      });
    });
  }

  if (inPreview) {
    var n = document.createElement('div'); n.className = 'preview-note';
    n.textContent = 'Preview · on the live site the reel plays here and forms email Banke';
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 7000);
  }
})();
