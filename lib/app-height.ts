// iOS standalone (home-screen) web apps can report a layout viewport that is
// shorter than the screen by the status-bar height, even with
// viewport-fit=cover: window.innerHeight, 100vh/100dvh and position:fixed all
// stop ~59px short, leaving a dead strip under the bottom nav. The page is
// still painted edge to edge, so the fix is to size the app from the real
// screen height instead.
//
// This runs inline in <head> so the value exists before the first paint; the
// AppHeightSync component re-runs it on resize/rotation/resume. The correction
// is bounded (gap of 1-100px, iOS standalone only) so split-screen windows,
// desktop and Android are untouched and keep using the CSS fallback (100dvh).
export const APP_HEIGHT_SCRIPT = `(function(){
  function update(){
    try {
      var h = window.innerHeight;
      if (window.navigator.standalone === true) {
        var portrait = window.matchMedia('(orientation: portrait)').matches;
        var s = portrait
          ? Math.max(screen.width, screen.height)
          : Math.min(screen.width, screen.height);
        var gap = s - h;
        if (gap > 0 && gap <= 100) h = s;
      }
      if (h > 0) document.documentElement.style.setProperty('--app-height', h + 'px');
    } catch (e) {}
  }
  window.__updateAppHeight = update;
  update();
})();`;
