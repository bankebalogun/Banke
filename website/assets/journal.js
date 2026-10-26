// The Journal: posts Banke writes in the Wix dashboard (Blog), shown in the site's own design.
// journal.html lists them; journal.html?p=<slug> shows one. Uses the visitor token from wix-forms.js.
(function () {
  var list = document.getElementById('posts'), one = document.getElementById('post');
  if (!list || !window.bbWix) return;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var img = function (m) {
    var u = m && (m.url || (m.src && (m.src.url || m.src.id)) || m.id);
    if (!u) return '';
    if (/^wix:image:\/\/v1\//.test(u)) u = u.replace(/^wix:image:\/\/v1\/([^/]+).*/, '$1');
    return /^https?:/.test(u) ? u : 'https://static.wixstatic.com/media/' + u;
  };
  var cover = function (p) { return img((p.media && p.media.wixMedia && p.media.wixMedia.image) || p.heroImage || p.coverMedia && p.coverMedia.image); };
  var date = function (d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''; };
  var link = function (p) { return 'journal.html?p=' + encodeURIComponent(p.slug); };

  // Rich text from the Wix editor, rendered to plain, styled HTML
  var text = function (n) {
    var t = esc(n.textData && n.textData.text);
    (n.textData && n.textData.decorations || []).forEach(function (d) {
      if (d.type === 'BOLD') t = '<b>' + t + '</b>';
      if (d.type === 'ITALIC') t = '<em>' + t + '</em>';
      if (d.type === 'LINK' && d.linkData && d.linkData.link && d.linkData.link.url) t = '<a href="' + esc(d.linkData.link.url) + '">' + t + '</a>';
    });
    return t;
  };
  var kids = function (n) { return (n.nodes || []).map(node).join(''); };
  var node = function (n) {
    switch (n.type) {
      case 'TEXT': return text(n);
      case 'PARAGRAPH': return '<p>' + kids(n) + '</p>';
      case 'HEADING': var l = Math.min(4, Math.max(2, (n.headingData && n.headingData.level) || 2)); return '<h' + l + '>' + kids(n) + '</h' + l + '>';
      case 'BLOCKQUOTE': return '<blockquote>' + kids(n) + '</blockquote>';
      case 'BULLETED_LIST': return '<ul>' + kids(n) + '</ul>';
      case 'ORDERED_LIST': return '<ol>' + kids(n) + '</ol>';
      case 'LIST_ITEM': return '<li>' + kids(n) + '</li>';
      case 'DIVIDER': return '<hr>';
      case 'IMAGE': var u = img(n.imageData && n.imageData.image); return u ? '<figure><img src="' + esc(u) + '" alt="' + esc(n.imageData.altText || '') + '" loading="lazy"></figure>' : '';
      default: return kids(n);
    }
  };

  var slug = new URLSearchParams(location.search).get('p');
  if (slug && one) {
    list.hidden = true; one.hidden = false;
    window.bbWix('/blog/v3/posts/slugs/' + encodeURIComponent(slug) + '?fieldsets=RICH_CONTENT', 'GET').then(function (r) {
      var p = r.post; document.title = p.title + ' · Banke Balogun';
      var c = cover(p), body = p.richContent && p.richContent.nodes ? p.richContent.nodes.map(node).join('') : esc(p.contentText || '').split(/\n{2,}/).map(function (x) { return '<p>' + x + '</p>'; }).join('');
      one.innerHTML = '<a class="ln back" href="journal.html">&larr; All entries</a><p class="meta">' + date(p.firstPublishedDate) + (p.minutesToRead ? ' · ' + p.minutesToRead + ' min read' : '') + '</p><h1 class="h-l">' + esc(p.title) + '</h1>' + (c ? '<div class="cover"><img src="' + esc(c) + '" alt=""></div>' : '') + '<div class="prose">' + body + '</div><a class="ln back" href="journal.html">&larr; All entries</a>';
    }).catch(function () { one.innerHTML = '<p class="lede">This entry couldn’t be found. <a class="ln" href="journal.html">See all entries</a></p>'; });
    return;
  }
  window.bbWix('/blog/v3/posts?paging.limit=50', 'GET').then(function (r) {
    var ps = r.posts || [];
    if (!ps.length) return;
    if (list.hasAttribute('data-in-world')) { var ch = list.closest('.ch'); if (ch) ch.hidden = false; var li = document.querySelector('[data-journal]'); if (li) li.hidden = false; }
    list.innerHTML = ps.map(function (p, i) {
      var c = cover(p);
      return '<a class="entry' + (i === 0 ? ' lead' : '') + '" href="' + link(p) + '" data-cursor="Read">' + (c ? '<div class="ei"><img src="' + esc(c) + '" alt="" loading="lazy"></div>' : '') + '<div class="et"><p class="meta">' + date(p.firstPublishedDate) + (p.minutesToRead ? ' · ' + p.minutesToRead + ' min read' : '') + '</p><h2>' + esc(p.title) + '</h2><p>' + esc(p.excerpt || '') + '</p><span class="ln">Read ' + '&rarr;</span></div></a>';
    }).join('');
  }).catch(function () {});
})();
