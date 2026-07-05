(() => {
  const EXTRA_VERSION = '2026-07-05-extra-1';
  const MAJOR_SCALE = [0,2,4,5,7,9,11];
  const MINOR_SCALE = [0,2,3,5,7,8,10];
  const COMMON_FOLLOWUPS = {
    major: ['minor','m7','maj7','7','add9'],
    minor: ['major','m7','7','maj7','m9'],
    m7: ['7','maj7','minor','m7b5','9'],
    maj7: ['m7','7','minor','maj9','add9'],
    '7': ['major','minor','maj7','m7','9'],
    m7b5: ['7','minor','m7','maj7','dim']
  };

  function wait() {
    if (typeof state === 'undefined' || typeof render !== 'function' || typeof schedulePass !== 'function') {
      setTimeout(wait, 60);
      return;
    }
    installExtra();
  }

  function $(id) { return document.getElementById(id); }
  function status(text) { try { setStatus(text); } catch { console.log(text); } }
  function deepCopySequence() { return JSON.parse(JSON.stringify(state.sequence || [])); }
  function chordTitle(chord) { try { return label(chord); } catch { return chord.root + chord.quality; } }
  function noteIndex(name) { return NOTE_NAMES.indexOf(name); }

  const undoStack = [];
  const redoStack = [];
  let restoring = false;

  function pushHistory(reason = 'change') {
    if (restoring) return;
    const snap = JSON.stringify(state.sequence || []);
    if (undoStack[undoStack.length - 1] === snap) return;
    undoStack.push(snap);
    if (undoStack.length > 80) undoStack.shift();
    redoStack.length = 0;
    updateAnalysis();
  }

  function restoreFrom(serialized, text) {
    restoring = true;
    try {
      state.sequence = JSON.parse(serialized);
      render();
      status(text);
      updateAnalysis();
    } finally {
      restoring = false;
    }
  }

  function undo() {
    if (undoStack.length < 2) return status('Nothing to undo');
    const current = undoStack.pop();
    redoStack.push(current);
    restoreFrom(undoStack[undoStack.length - 1], 'Undo');
  }

  function redo() {
    if (!redoStack.length) return status('Nothing to redo');
    const snap = redoStack.pop();
    undoStack.push(snap);
    restoreFrom(snap, 'Redo');
  }

  function allPitchClasses() {
    const set = new Set();
    (state.sequence || []).forEach(chord => {
      const root = noteIndex(chord.root);
      if (root < 0 || !QUALITIES[chord.quality]) return;
      QUALITIES[chord.quality].forEach(i => set.add((root + i) % 12));
    });
    return [...set];
  }

  function scoreKey(root, scale) {
    const pcs = allPitchClasses();
    if (!pcs.length) return 0;
    const scaleSet = new Set(scale.map(i => (root + i) % 12));
    let score = 0;
    pcs.forEach(pc => { score += scaleSet.has(pc) ? 2 : -1; });
    const first = state.sequence[0];
    const last = state.sequence[state.sequence.length - 1];
    if (first && noteIndex(first.root) === root) score += 2;
    if (last && noteIndex(last.root) === root) score += 3;
    return score;
  }

  function detectKey() {
    if (!state.sequence.length) return { label: 'No key yet', outside: [] };
    const candidates = [];
    NOTE_NAMES.forEach((name, root) => {
      candidates.push({ name: `${name} major`, root, scale: MAJOR_SCALE, score: scoreKey(root, MAJOR_SCALE) });
      candidates.push({ name: `${name} minor`, root, scale: MINOR_SCALE, score: scoreKey(root, MINOR_SCALE) });
    });
    candidates.sort((a,b) => b.score - a.score);
    const best = candidates[0];
    const set = new Set(best.scale.map(i => (best.root + i) % 12));
    const outside = (state.sequence || []).filter(chord => !set.has(noteIndex(chord.root))).map(chordTitle);
    return { label: best.name, outside };
  }

  function suggestChords() {
    const last = state.sequence[state.sequence.length - 1];
    const key = detectKey();
    if (!last) return [];
    const root = noteIndex(last.root);
    const offsets = [5,7,2,9,11,0];
    const qualityPool = COMMON_FOLLOWUPS[last.quality] || ['major','minor','m7','7','maj7'];
    const suggestions = [];
    offsets.forEach((off, i) => {
      const nextRoot = NOTE_NAMES[(root + off) % 12];
      const quality = qualityPool[i % qualityPool.length];
      if (QUALITIES[quality]) suggestions.push({ root: nextRoot, quality, octave: last.octave || 4, bars: last.bars || 1 });
    });
    return suggestions.slice(0, 6);
  }

  function updateAnalysis() {
    const keyBox = $('keyResult');
    const sugBox = $('suggestions');
    if (!keyBox || !sugBox) return;
    const key = detectKey();
    keyBox.innerHTML = `<strong>${key.label}</strong><span>${key.outside.length ? 'Outside: ' + key.outside.slice(0, 5).join(', ') : 'All roots mostly fit'}</span>`;
    sugBox.innerHTML = '';
    suggestChords().forEach(chord => {
      const b = document.createElement('button');
      b.textContent = chordTitle(chord);
      b.onclick = () => {
        pushHistory('before suggestion');
        state.sequence.push(chord);
        render();
        status(`${chordTitle(chord)} suggested`);
      };
      sugBox.append(b);
    });
  }

  function installPanel() {
    const existing = $('advancedFeatures');
    if (!existing || $('extraFeatures')) return;
    const extra = document.createElement('div');
    extra.id = 'extraFeatures';
    extra.innerHTML = `
      <style>
        #extraFeatures{margin-top:14px;padding:14px;border:1px solid var(--border);border-radius:22px;background:rgba(0,0,0,.18)}
        #extraFeatures h3{margin:0 0 12px;font-size:.98rem;letter-spacing:-.02em}
        #extraFeatures .xf-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        #extraFeatures .xf-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
        #extraFeatures .xf-row button{flex:1;min-width:110px}
        #keyResult{border:1px solid var(--border);border-radius:16px;padding:12px;background:rgba(0,0,0,.2);display:grid;gap:5px}
        #keyResult span{color:var(--muted);font-size:.78rem;line-height:1.5}
        #suggestions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        #suggestions button{padding:9px;border-radius:13px}
        @media(max-width:700px){#extraFeatures .xf-grid{grid-template-columns:1fr}#suggestions{grid-template-columns:1fr 1fr}}
      </style>
      <h3>06 Composer Assist</h3>
      <div class="xf-grid">
        <div id="keyResult"><strong>No key yet</strong><span>Add chords to analyze</span></div>
        <div>
          <div class="micro" style="margin-bottom:8px">Next chord suggestions</div>
          <div id="suggestions"></div>
        </div>
      </div>
      <div class="xf-row">
        <button id="undoSeq">Undo</button>
        <button id="redoSeq">Redo</button>
        <button id="countInPlay" class="primary">Count-in Play</button>
        <button id="metronomeToggle">Metronome</button>
      </div>
      <p class="micro">キー推定は簡易スコアリングです。候補コードは最後のコードから近い進行を提案します。</p>
    `;
    existing.after(extra);
    $('undoSeq').onclick = undo;
    $('redoSeq').onclick = redo;
    $('countInPlay').onclick = countInPlay;
    $('metronomeToggle').onclick = toggleMetronome;
  }

  function clickSound(time, accent = false) {
    const ctx = state.audio || (state.audio = new (window.AudioContext || window.webkitAudioContext)());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.18 : 0.11, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  function countInPlay() {
    if (!state.sequence.length) return status('Add chords first');
    stopAll(false);
    const ctx = state.audio || (state.audio = new (window.AudioContext || window.webkitAudioContext)());
    const beat = 60 / Number($('bpm')?.value || 100);
    const now = ctx.currentTime + 0.08;
    for (let i = 0; i < 4; i++) clickSound(now + i * beat, i === 0);
    status('Count-in...');
    setTimeout(() => play(), beat * 4 * 1000);
  }

  let metroTimer = null;
  function toggleMetronome() {
    if (metroTimer) {
      clearInterval(metroTimer);
      metroTimer = null;
      status('Metronome off');
      return;
    }
    const ctx = state.audio || (state.audio = new (window.AudioContext || window.webkitAudioContext)());
    let beatNo = 0;
    const beatMs = () => 60000 / Number($('bpm')?.value || 100);
    const tick = () => {
      clickSound(ctx.currentTime + 0.01, beatNo % 4 === 0);
      beatNo++;
    };
    tick();
    metroTimer = setInterval(tick, beatMs());
    status('Metronome on');
  }

  function installHistoryHooks() {
    pushHistory('initial');
    const originalRender = render;
    render = function(...args) {
      const result = originalRender.apply(this, args);
      clearTimeout(render._extraTimer);
      render._extraTimer = setTimeout(() => pushHistory('render'), 120);
      return result;
    };
  }

  function installExtra() {
    installPanel();
    installHistoryHooks();
    updateAnalysis();
    status('Composer assist ready');
  }

  wait();
})();
