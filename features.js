(() => {
  const FEATURE_VERSION = '2026-07-05-advanced-1';
  const SAVE_KEY = 'webseq:autosave:v1';

  function waitForStudio() {
    if (typeof state === 'undefined' || typeof render !== 'function' || typeof scheduleChord !== 'function') {
      setTimeout(waitForStudio, 50);
      return;
    }
    installFeatures();
  }

  function setStatusSafe(text) {
    try { setStatus(text); } catch { console.log(text); }
  }

  function chordName(chord) {
    try { return label(chord); } catch { return `${chord.root} ${chord.quality}`; }
  }

  function encodeBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decodeBase64Url(text) {
    const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function snapshot() {
    return {
      version: FEATURE_VERSION,
      bpm: $('bpm')?.value,
      instrument: $('instrument')?.value,
      loop: $('loop')?.checked,
      attack: $('attack')?.value,
      release: $('release')?.value,
      velocity: $('velocity')?.value,
      humanize: $('humanize')?.value,
      reverb: $('reverb')?.value,
      arpMode: $('arpMode')?.value || 'block',
      arpRate: $('arpRate')?.value || '1/8',
      sequence: state.sequence || []
    };
  }

  function applySnapshot(data, source = 'project') {
    if (!data || !Array.isArray(data.sequence)) return false;
    ['bpm','instrument','attack','release','velocity','humanize','reverb'].forEach(id => {
      if (data[id] !== undefined && $(id)) $(id).value = data[id];
    });
    if (typeof data.loop === 'boolean' && $('loop')) $('loop').checked = data.loop;
    if (data.arpMode && $('arpMode')) $('arpMode').value = data.arpMode;
    if (data.arpRate && $('arpRate')) $('arpRate').value = data.arpRate;
    state.sequence = data.sequence.filter(c => c && NOTE_NAMES.includes(c.root) && QUALITIES[c.quality]);
    render();
    setStatusSafe(`Loaded ${source}`);
    return true;
  }

  function saveAuto() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot())); } catch (error) { console.warn(error); }
  }

  function loadAuto() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw || state.sequence.length) return;
      applySnapshot(JSON.parse(raw), 'autosave');
    } catch (error) { console.warn(error); }
  }

  function loadFromUrl() {
    const params = new URLSearchParams(location.search);
    const encoded = params.get('seq');
    if (!encoded) return false;
    try {
      applySnapshot(JSON.parse(decodeBase64Url(encoded)), 'shared URL');
      history.replaceState(null, '', location.pathname);
      return true;
    } catch (error) {
      console.warn(error);
      setStatusSafe('Share URL load failed');
      return false;
    }
  }

  function transposeSequence(semitones) {
    if (!state.sequence.length) return setStatusSafe('No chords to transpose');
    state.sequence = state.sequence.map(chord => {
      const index = NOTE_NAMES.indexOf(chord.root);
      return { ...chord, root: NOTE_NAMES[(index + semitones + 1200) % 12] };
    });
    render();
    saveAuto();
    setStatusSafe(`Transposed ${semitones > 0 ? '+' : ''}${semitones}`);
  }

  async function shareUrl() {
    const encoded = encodeBase64Url(JSON.stringify(snapshot()));
    const url = `${location.origin}${location.pathname}?seq=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatusSafe('Share URL copied');
    } catch {
      prompt('Share URL', url);
      setStatusSafe('Share URL generated');
    }
  }

  function clearAutoSave() {
    localStorage.removeItem(SAVE_KEY);
    setStatusSafe('Autosave cleared');
  }

  function installPanel() {
    const playbackCard = [...document.querySelectorAll('.card h2')].find(h => h.textContent.includes('再生'))?.closest('.card');
    if (!playbackCard || document.getElementById('advancedFeatures')) return;

    const panel = document.createElement('div');
    panel.id = 'advancedFeatures';
    panel.innerHTML = `
      <style>
        #advancedFeatures{margin-top:14px;padding:14px;border:1px solid var(--border);border-radius:22px;background:rgba(0,0,0,.18)}
        #advancedFeatures h3{margin:0 0 12px;font-size:.98rem;letter-spacing:-.02em}
        #advancedFeatures .af-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        #advancedFeatures .af-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
        #advancedFeatures .af-row button{flex:1;min-width:120px}
        #advancedFeatures select{width:100%}
        @media(max-width:700px){#advancedFeatures .af-grid{grid-template-columns:1fr 1fr}}
      </style>
      <h3>05 Advanced</h3>
      <div class="af-grid">
        <label>Arpeggio<select id="arpMode"><option value="block">Block chord</option><option value="up">Arp Up</option><option value="down">Arp Down</option><option value="updown">Arp Up/Down</option><option value="random">Arp Random</option></select></label>
        <label>Arp Rate<select id="arpRate"><option value="1/4">1/4</option><option value="1/8" selected>1/8</option><option value="1/16">1/16</option></select></label>
        <button id="transposeDown">Transpose -1</button>
        <button id="transposeUp">Transpose +1</button>
      </div>
      <div class="af-row">
        <button id="shareSequence" class="primary">共有URLをコピー</button>
        <button id="clearAutosave">自動保存を消す</button>
      </div>
      <p class="micro">進行は自動保存されます。共有URLは現在の進行・BPM・音色・アルペジオ設定を含みます。</p>
    `;
    playbackCard.append(panel);
    $('transposeDown').onclick = () => transposeSequence(-1);
    $('transposeUp').onclick = () => transposeSequence(1);
    $('shareSequence').onclick = shareUrl;
    $('clearAutosave').onclick = clearAutoSave;
    $('arpMode').onchange = saveAuto;
    $('arpRate').onchange = saveAuto;
  }

  function installAutosaveHooks() {
    const originalRender = render;
    render = function(...args) {
      const result = originalRender.apply(this, args);
      clearTimeout(render._autosaveTimer);
      render._autosaveTimer = setTimeout(saveAuto, 80);
      return result;
    };
    ['bpm','instrument','loop','attack','release','velocity','humanize','reverb'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('change', saveAuto);
    });
  }

  function rateToSeconds() {
    const beat = 60 / Number($('bpm')?.value || 100);
    const rate = $('arpRate')?.value || '1/8';
    if (rate === '1/4') return beat;
    if (rate === '1/16') return beat / 4;
    return beat / 2;
  }

  function orderedNotes(list, mode) {
    if (mode === 'down') return [...list].reverse();
    if (mode === 'updown') return [...list, ...list.slice(1, -1).reverse()];
    if (mode === 'random') return [...list].sort(() => Math.random() - 0.5);
    return [...list];
  }

  function installArpeggio() {
    const originalScheduleChord = scheduleChord;
    scheduleChord = function(ctx, chord, start, duration, destination = ctx.destination) {
      const mode = $('arpMode')?.value || 'block';
      if (mode === 'block') return originalScheduleChord(ctx, chord, start, duration, destination);
      const out = output(ctx, destination);
      const step = rateToSeconds();
      const gate = Math.min(step * 0.92, duration);
      const pattern = orderedNotes(notes(chord), mode);
      const nodes = [];
      for (let t = start, i = 0; t < start + duration - 0.01; t += step, i++) {
        const note = pattern[i % pattern.length];
        nodes.push(...scheduleNote(ctx, note, t, Math.min(gate, start + duration - t), out));
      }
      return nodes;
    };
  }

  function installFeatures() {
    installPanel();
    installAutosaveHooks();
    installArpeggio();
    if (!loadFromUrl()) loadAuto();
    setStatusSafe('Advanced features ready');
  }

  waitForStudio();
})();
