(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CONTACT = 'bankebalogun@gmail.com';

  // Menu drawer (phones and tablets)
  var btn = $('.menu-btn'), drawer = $('#drawer');
  if (btn && drawer) {
    var setOpen = function (on) { drawer.classList.toggle('open', on); drawer.setAttribute('aria-hidden', !on); btn.setAttribute('aria-expanded', on); document.documentElement.style.overflow = on ? 'hidden' : ''; };
    btn.addEventListener('click', function () { setOpen(true); });
    $('.dr-close', drawer).addEventListener('click', function () { setOpen(false); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  // The warm glow follows the pointer
  $$('.glow-zone').forEach(function (z) {
    var g = $('.glow', z); if (!g || reduce) return;
    var c = g.getAttribute('data-c') || '227, 196, 143, 0.55), rgba(236, 200, 190, 0.35) 40%, rgba(248, 241, 234, 0) 72%';
    z.addEventListener('mousemove', function (e) {
      var r = z.getBoundingClientRect();
      g.style.backgroundImage = 'radial-gradient(' + (g.getAttribute('data-r') || '700px') + ' circle at ' + Math.round((e.clientX - r.left) / r.width * 100) + '% ' + Math.round((e.clientY - r.top) / r.height * 100) + '%, rgba(' + c + ')';
    });
  });

  // The intersection: tap a circle
  var orbs = $$('.orb'), all = $('.orb-all'), pt = $('.p-title'), px = $('.p-text');
  var pick = function (el) {
    orbs.forEach(function (o) { var on = o === el; o.setAttribute('aria-pressed', on); o.style.background = on ? o.getAttribute('data-on') : o.getAttribute('data-base'); o.firstElementChild.style.fontStyle = on ? 'italic' : 'normal'; });
    if (all) all.setAttribute('aria-pressed', el === all);
    if (pt) { pt.style.opacity = 0; px.style.opacity = 0; setTimeout(function () { pt.innerHTML = el.getAttribute('data-title'); px.innerHTML = el.getAttribute('data-text'); pt.style.opacity = 1; px.style.opacity = 1; }, 200); }
  };
  orbs.concat(all ? [all] : []).forEach(function (o) { o.addEventListener('click', function () { pick(o); }); });

  // The listening room
  var trks = $$('.trk'), tl = $('.trk-link');
  trks.forEach(function (t) {
    t.addEventListener('click', function () {
      trks.forEach(function (o) { var on = o === t; o.setAttribute('aria-pressed', on); o.style.color = on ? '#E3C48F' : '#F8F1EA'; });
      if (tl) tl.href = 'https://open.spotify.com/search/' + encodeURIComponent(t.getAttribute('data-q'));
    });
  });

  // Choice chips (contact form and club form)
  $$('.pick').forEach(function (p) {
    p.addEventListener('click', function () {
      var multi = p.closest('[data-multi]');
      $$('.pick', p.parentElement).forEach(function (o) {
        var on = multi ? (o === p ? o.getAttribute('aria-pressed') !== 'true' : o.getAttribute('aria-pressed') === 'true') : o === p;
        o.setAttribute('aria-pressed', on);
        if (o.hasAttribute('data-on-bg')) { o.style.background = on ? o.getAttribute('data-on-bg') : 'transparent'; o.style.color = on ? o.getAttribute('data-on-fg') : o.getAttribute('data-off-fg'); }
        else { o.style.fontStyle = on ? 'italic' : 'normal'; o.style.borderBottomColor = on ? '#A67C45' : 'transparent'; o.style.color = on ? '#5A3423' : '#6E5A4E'; }
      });
    });
  });

  // Forms open an email to Banke with the details filled in
  $$('form.contact-form').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.reportValidity()) return;
      var lines = [];
      $$('[name]', f).forEach(function (i) { if (i.value) lines.push(i.name + ': ' + i.value); });
      var chosen = $$('.pick[aria-pressed="true"]', f).map(function (b) { return b.textContent; });
      if (chosen.length) lines.push('Interested in: ' + chosen.join(', '));
      location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(f.getAttribute('data-subject')) + '&body=' + encodeURIComponent(lines.join('\n'));
      var n = $('.form-note', f); if (n) n.textContent = 'Your email app should open with your message. If it doesn’t, write to ' + CONTACT + '.';
    });
  });

  // Speaker reel plays in place
  $$('.reel').forEach(function (r) {
    var a = $('a', r);
    a.addEventListener('click', function (e) {
      e.preventDefault();
      r.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + r.getAttribute('data-reel') + '?autoplay=1&rel=0" title="Banke Balogun speaker reel" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>';
    });
  });

  // Gentle reveals as you scroll
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = $$('h2, .frame, .venture, .reveal-up');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (t, i) {
      if (t.getBoundingClientRect().top < innerHeight * .92) return;
      t.classList.add('up');
      var sib = t.parentElement ? Array.prototype.indexOf.call(t.parentElement.children, t) : 0;
      t.style.transitionDelay = (Math.min(sib, 5) * 0.08) + 's';
      io.observe(t);
    });
    // Photos ease out of a slight zoom when they arrive
    $$('main img, .page img').forEach(function (im) { if (im.getBoundingClientRect().top > innerHeight) { im.classList.add('zin'); io.observe(im); } });
  }
  // Header gets a soft shadow once you scroll
  var hdr = $('.site-hdr');
  if (hdr) addEventListener('scroll', function () { hdr.classList.toggle('scrolled', scrollY > 10); }, { passive: true });

  // Lightbox for the portfolio
  var tiles = $$('.pf button');
  if (tiles.length) {
    var box, im, at = 0;
    var show = function (i) { at = (i + tiles.length) % tiles.length; var s = $('img', tiles[at]); im.src = s.src; im.alt = s.alt; };
    var close = function () { if (box) { box.remove(); box = null; tiles[at].focus(); } };
    tiles.forEach(function (t, i) {
      t.addEventListener('click', function () {
        box = document.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Photo viewer');
        box.innerHTML = '<img alt=""><button class="lb x" type="button" aria-label="Close">Close</button><button class="lb pv" type="button" aria-label="Previous photo">&#8592;</button><button class="lb nx" type="button" aria-label="Next photo">&#8594;</button>';
        im = $('img', box);
        $('.x', box).onclick = close; $('.pv', box).onclick = function () { show(at - 1); }; $('.nx', box).onclick = function () { show(at + 1); };
        box.addEventListener('click', function (e) { if (e.target === box) close(); });
        box.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); });
        document.body.appendChild(box); show(i); $('.x', box).focus();
      });
    });
  }
})();
