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
  if (!reduce && fine && window.Lenis) {
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
  if (pt && !$('.pt-mark', pt)) pt.innerHTML = '<span class="pt-mark" aria-hidden="true"><svg class="mark" viewBox="0 0 48 60" aria-hidden="true" focusable="false"><path d="M5 58V24a19 19 0 0 1 38 0v34" fill="none" stroke="#A67C45" stroke-width="0.8"/><path d="M1.5 58h45" fill="none" stroke="#A67C45" stroke-width="0.8"/><path d="M31.24 22.06L37.52 20.38M30.50 20.25L34.39 18.00M29.30 18.70L33.90 14.10M27.75 17.50L30.00 13.61M25.94 16.76L27.62 10.48M24.00 16.50L24.00 12.00M22.06 16.76L20.38 10.48M20.25 17.50L18.00 13.61M18.70 18.70L14.10 14.10M17.50 20.25L13.61 18.00M16.76 22.06L10.48 20.38" fill="none" stroke="#E3C48F" stroke-width="0.6400000000000001" stroke-linecap="round"/><circle cx="24" cy="24" r="1.6" fill="#E3C48F"/><text x="24.2" y="51.5" text-anchor="middle" font-family="\'Bodoni Moda\', Didot, \'Bodoni 72\', Georgia, serif" font-size="22.5" letter-spacing="-1.2" fill="#F8F1EA">BB</text></svg><b>BANKE</b><i>Balogun</i></span>';

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
})();
