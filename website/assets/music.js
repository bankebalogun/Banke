// "Romance" by Hiroshi Suzuki, streamed from the official J-DIGS (Nippon Columbia) upload on YouTube.
// Plays only when the visitor presses play, keeps the video visible while it plays, and picks up
// where it left off on the next page when the browser allows it.
(function () {
  var tape = document.getElementById('tape'); if (!tape) return;
  var btn = tape.querySelector('.tape-btn'), screen = tape.querySelector('.tape-screen');
  var IDS = ['K1XMmNNfjSY', 'U-45C9fH2yE'], idx = 0, player = null, ready = false, KEY = 'bb-tape';
  var state = {}; try { state = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) {}
  var save = function () { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  var setOn = function (on) { tape.classList.toggle('on', on); btn.setAttribute('aria-pressed', on); btn.setAttribute('aria-label', (on ? 'Pause' : 'Play') + ' Romance by Hiroshi Suzuki'); };
  var loadApi = function (cb) {
    if (window.YT && window.YT.Player) return cb();
    var prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = function () { if (prev) prev(); cb(); };
    var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  };
  var make = function (autoplay) {
    screen.hidden = false;
    player = new YT.Player('tape-yt', {
      width: 240, height: 135, videoId: IDS[idx],
      host: 'https://www.youtube-nocookie.com',
      playerVars: { autoplay: autoplay ? 1 : 0, start: Math.floor(state.t || 0), controls: 1, modestbranding: 1, rel: 0, playsinline: 1 },
      events: {
        onReady: function (e) { ready = true; e.target.setVolume(60); if (autoplay) e.target.playVideo(); },
        onStateChange: function (e) {
          if (e.data === 1) { setOn(true); state.playing = true; save(); }
          if (e.data === 2) { setOn(false); state.playing = false; save(); }
          if (e.data === 0) { state.t = 0; e.target.seekTo(0); e.target.playVideo(); }
        },
        onError: function () {
          if (idx < IDS.length - 1) { idx++; player.loadVideoById({ videoId: IDS[idx], startSeconds: 0 }); }
          else { setOn(false); btn.querySelector('small') && (btn.querySelector('small').textContent = 'Open on YouTube'); }
        }
      }
    });
  };
  btn.addEventListener('click', function () {
    if (!player) { loadApi(function () { make(true); }); return; }
    if (!ready) return;
    if (player.getPlayerState && player.getPlayerState() === 1) player.pauseVideo(); else { screen.hidden = false; player.playVideo(); }
  });
  setInterval(function () { if (player && ready && player.getCurrentTime) { state.t = player.getCurrentTime(); save(); } }, 1500);
  // Carry on across pages: the browser may block sound without a fresh tap; then the tape just waits.
  if (state.playing) loadApi(function () { make(true); });
})();
