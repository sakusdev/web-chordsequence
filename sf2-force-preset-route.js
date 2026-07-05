(() => {
  function wait() {
    if (typeof state === 'undefined' || typeof scheduleNote !== 'function' || typeof schedulePiano !== 'function' || typeof window.scheduleSf2Note !== 'function') {
      setTimeout(wait, 60);
      return;
    }
    installForceRoute();
  }

  function $(id) { return document.getElementById(id); }
  function status(text) { try { setStatus(text); } catch { console.log(text); } }

  function installForceRoute() {
    if (window.__webseqSf2ForceRouteInstalled) return;
    window.__webseqSf2ForceRouteInstalled = true;

    const nonSf2ScheduleNote = scheduleNote;
    const presetAwareSf2Note = window.scheduleSf2Note;

    scheduleNote = function(ctx, midi, start, duration, destination) {
      if ($('instrument')?.value === 'sf2') {
        return presetAwareSf2Note(ctx, midi, start, duration, destination);
      }
      return nonSf2ScheduleNote(ctx, midi, start, duration, destination);
    };

    const oldPreview = typeof preview === 'function' ? preview : null;
    if (oldPreview) {
      preview = function(chord) {
        if ($('instrument')?.value === 'sf2' && !state.sf2?.presets) {
          status('Load SF2 preset first');
        }
        return oldPreview(chord);
      };
    }

    status('SF2 preset route fixed');
  }

  wait();
})();
