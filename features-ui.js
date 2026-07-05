(() => {
  const UI_VERSION = '2026-07-05-ui-1';
  const RECENT_KEY = 'webseq:recent-chords:v1';
  const COLLAPSE_KEY = 'webseq:collapsed:v1';
  let tapTimes = [];

  function wait() {
    if (typeof state === 'undefined' || typeof render !== 'function' || typeof preview !== 'function') {
      setTimeout(wait, 60);
      return;
    }
    installUiUx();
  }

  function $(id) { return document.getElementById(id); }
  function status(text) { try { setStatus(text); } catch { console.log(text); } }
  function chordTitle(chord) { try { return label(chord); } catch { return chord.root + (chord.quality || ''); } }
  function cloneChord(chord) { return { root: chord.root, quality: chord.quality, octave: chord.octave || 4, bars: chord.bars || 1 }; }

  function injectCss() {
    if ($('uiUxStyle')) return;
    const style = document.createElement('style');
    style.id = 'uiUxStyle';
    style.textContent = `
      :root{--ui-sticky:rgba(6,9,18,.76)}
      body.ui-compact .card{padding:16px;border-radius:24px}
      body.ui-compact header{padding-top:24px;padding-bottom:14px}
      body.ui-compact h1{font-size:clamp(2.1rem,6vw,5.2rem)}
      .command-bar{position:sticky;top:0;z-index:50;margin:-6px 0 6px;padding:10px;border:1px solid var(--border);border-radius:24px;background:var(--ui-sticky);backdrop-filter:blur(18px);box-shadow:0 16px 48px rgba(0,0,0,.28);display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}
      .command-bar .brand{font-weight:1000;letter-spacing:-.04em;white-space:nowrap}
      .command-bar .summary{color:var(--muted);font-size:.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .command-bar .actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .command-bar button{padding:9px 10px;border-radius:13px;font-size:.86rem}
      .ui-panel{margin-top:14px;padding:14px;border:1px solid var(--border);border-radius:22px;background:rgba(0,0,0,.18)}
      .ui-panel h3{margin:0 0 12px;font-size:.98rem;letter-spacing:-.02em}
      .ui-tools{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
      .ui-tools button{min-height:44px}
      .recent-chords{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .recent-chords button{padding:8px 10px;border-radius:999px;font-size:.84rem}
      .card.collapsed>*:not(h2){display:none!important}
      .card h2{cursor:pointer;user-select:none}
      .card h2::after{content:'⌄';margin-left:auto;color:var(--muted);font-size:.9rem;transition:.15s}
      .card.collapsed h2::after{transform:rotate(-90deg)}
      .toast-ui{position:fixed;left:50%;bottom:20px;transform:translateX(-50%) translateY(12px);z-index:100;padding:12px 16px;border:1px solid var(--border);border-radius:999px;background:rgba(8,12,22,.9);backdrop-filter:blur(18px);opacity:0;transition:.2s;box-shadow:0 16px 60px rgba(0,0,0,.34);font-weight:850;max-width:min(90vw,560px);text-align:center}
      .toast-ui.show{opacity:1;transform:translateX(-50%) translateY(0)}
      .drop-hint{outline:2px dashed var(--accent);outline-offset:6px}
      @media(max-width:760px){.command-bar{grid-template-columns:1fr}.command-bar .actions{justify-content:stretch}.command-bar .actions button{flex:1}.ui-tools{grid-template-columns:1fr 1fr}.command-bar .summary{white-space:normal}.wide{gap:14px}.grid{gap:14px}}
    `;
    document.head.append(style);
  }

  function toast(text) {
    let el = $('toastUi');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toastUi';
      el.className = 'toast-ui';
      document.body.append(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 1600);
  }

  function sequenceSummary() {
    if (!state.sequence.length) return 'No chords yet';
    const names = state.sequence.slice(0, 8).map(chordTitle).join(' → ');
    const extra = state.sequence.length > 8 ? ` +${state.sequence.length - 8}` : '';
    return `${state.sequence.length} chords / ${names}${extra}`;
  }

  function installCommandBar() {
    if ($('commandBar')) return;
    const bar = document.createElement('div');
    bar.id = 'commandBar';
    bar.className = 'command-bar';
    bar.innerHTML = `
      <div class="brand">WebSeq</div>
      <div id="commandSummary" class="summary">No chords yet</div>
      <div class="actions">
        <button id="cmdPlay">Play</button>
        <button id="cmdStop">Stop</button>
        <button id="cmdBook">Book</button>
        <button id="cmdCompact">Compact</button>
      </div>
    `;
    document.querySelector('main')?.prepend(bar);
    $('cmdPlay').onclick = () => $('play')?.click();
    $('cmdStop').onclick = () => $('stop')?.click();
    $('cmdBook').onclick = () => location.href = 'chord-book.html';
    $('cmdCompact').onclick = () => {
      document.body.classList.toggle('ui-compact');
      localStorage.setItem('webseq:compact', document.body.classList.contains('ui-compact') ? '1' : '0');
      toast(document.body.classList.contains('ui-compact') ? 'Compact UI on' : 'Compact UI off');
    };
    if (localStorage.getItem('webseq:compact') === '1') document.body.classList.add('ui-compact');
  }

  function installWorkflowPanel() {
    const playbackCard = [...document.querySelectorAll('.card h2')].find(h => h.textContent.includes('再生'))?.closest('.card');
    if (!playbackCard || $('workflowPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'workflowPanel';
    panel.className = 'ui-panel';
    panel.innerHTML = `
      <h3>07 Workflow</h3>
      <div class="ui-tools">
        <button id="tapTempo">Tap Tempo</button>
        <button id="randomProgression">Random 4</button>
        <button id="duplicateLast">Duplicate Last</button>
        <button id="reverseSeq">Reverse</button>
      </div>
      <div class="recent-chords" id="recentChords"></div>
      <p class="micro">Tap Tempoは数回タップでBPMを推定。Random 4は使いやすい4コード進行を生成します。</p>
    `;
    playbackCard.append(panel);
    $('tapTempo').onclick = tapTempo;
    $('randomProgression').onclick = randomProgression;
    $('duplicateLast').onclick = duplicateLast;
    $('reverseSeq').onclick = reverseSeq;
    renderRecentChords();
  }

  function tapTempo() {
    const now = performance.now();
    tapTimes.push(now);
    tapTimes = tapTimes.filter(t => now - t < 5000).slice(-6);
    if (tapTimes.length < 2) return toast('Tap again');
    const diffs = tapTimes.slice(1).map((t, i) => t - tapTimes[i]);
    const avg = diffs.reduce((a,b) => a+b, 0) / diffs.length;
    const bpm = Math.round(60000 / avg);
    if (bpm >= 30 && bpm <= 240 && $('bpm')) {
      $('bpm').value = bpm;
      $('bpm').dispatchEvent(new Event('change'));
      status(`BPM ${bpm}`);
      toast(`Tempo: ${bpm} BPM`);
    }
  }

  const RANDOM_PROGRESSIONS = [
    ['C major','G major','A minor','F major'],
    ['F major','G major','E m7','A minor'],
    ['A minor','F maj7','C major','G major'],
    ['D m7','G 7','C maj7','A 7'],
    ['F maj7','E 7','A minor','C 7'],
    ['C maj9','A 9','D m9','G 9'],
    ['A minor','G major','F major','E 7'],
    ['F add9','G add9','A minor','E minor']
  ];

  function parseChordText(text) {
    const [root, qRaw] = text.split(' ');
    const quality = qRaw === 'm' ? 'minor' : qRaw;
    return { root, quality, octave: Number($('octave')?.value || 4), bars: Number($('bars')?.value || 1) };
  }

  function randomProgression() {
    const progression = RANDOM_PROGRESSIONS[Math.floor(Math.random() * RANDOM_PROGRESSIONS.length)];
    state.sequence = progression.map(parseChordText);
    render();
    status('Random progression');
    toast(progression.join(' → '));
  }

  function duplicateLast() {
    const last = state.sequence[state.sequence.length - 1];
    if (!last) return toast('No chord to duplicate');
    state.sequence.push(cloneChord(last));
    render();
    status('Duplicated last chord');
  }

  function reverseSeq() {
    if (state.sequence.length < 2) return toast('Need 2+ chords');
    state.sequence.reverse();
    render();
    status('Sequence reversed');
  }

  function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
  }

  function saveRecent(chord) {
    if (!chord || !chord.root || !chord.quality) return;
    const recent = loadRecent().filter(c => chordTitle(c) !== chordTitle(chord));
    recent.unshift(cloneChord(chord));
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 10)));
    renderRecentChords();
  }

  function renderRecentChords() {
    const el = $('recentChords');
    if (!el) return;
    const recent = loadRecent();
    el.innerHTML = recent.length ? '' : '<span class="micro">Recent chords will appear here.</span>';
    recent.forEach(chord => {
      const b = document.createElement('button');
      b.textContent = chordTitle(chord);
      b.onclick = () => {
        state.sequence.push(cloneChord(chord));
        render();
        status(`${chordTitle(chord)} added`);
      };
      el.append(b);
    });
  }

  function installCollapsingCards() {
    const saved = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');
    document.querySelectorAll('.card').forEach((card, index) => {
      const h = card.querySelector('h2');
      if (!h || card.dataset.collapsible) return;
      card.dataset.collapsible = '1';
      if (saved[index]) card.classList.add('collapsed');
      h.addEventListener('click', event => {
        if (event.target.closest('button,a,input,select,label')) return;
        card.classList.toggle('collapsed');
        const next = {};
        document.querySelectorAll('.card').forEach((c, i) => { if (c.classList.contains('collapsed')) next[i] = true; });
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      });
    });
  }

  function installDropLoad() {
    document.addEventListener('dragover', event => {
      event.preventDefault();
      document.body.classList.add('drop-hint');
    });
    document.addEventListener('dragleave', () => document.body.classList.remove('drop-hint'));
    document.addEventListener('drop', event => {
      event.preventDefault();
      document.body.classList.remove('drop-hint');
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      if (file.name.endsWith('.json')) {
        const input = $('loadProject');
        if (!input) return;
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change'));
        toast('Project loaded from drop');
      } else if (file.name.endsWith('.sf2')) {
        const input = $('sf2File');
        if (!input) return;
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change'));
        toast('SF2 loaded from drop');
      }
    });
  }

  function installRenderHooks() {
    const originalRender = render;
    render = function(...args) {
      const before = state.sequence[state.sequence.length - 1];
      const result = originalRender.apply(this, args);
      const summary = $('commandSummary');
      if (summary) summary.textContent = sequenceSummary();
      const after = state.sequence[state.sequence.length - 1];
      if (after && (!before || chordTitle(after) !== chordTitle(before) || state.sequence.length !== (render._lastLength || 0))) saveRecent(after);
      render._lastLength = state.sequence.length;
      return result;
    };
  }

  function installKeyboardShortcuts() {
    document.addEventListener('keydown', event => {
      if (event.target && ['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName)) return;
      if (event.code === 'Space') { event.preventDefault(); state.isPlaying ? $('stop')?.click() : $('play')?.click(); }
      if (event.key.toLowerCase() === 'b') location.href = 'chord-book.html';
      if (event.key.toLowerCase() === 'r') randomProgression();
      if (event.key.toLowerCase() === 'd') duplicateLast();
      if (event.key === '[') document.getElementById('transposeDown')?.click();
      if (event.key === ']') document.getElementById('transposeUp')?.click();
    });
  }

  function installUiUx() {
    injectCss();
    installCommandBar();
    installWorkflowPanel();
    installCollapsingCards();
    installDropLoad();
    installRenderHooks();
    installKeyboardShortcuts();
    render();
    status('UI/UX features ready');
    toast('UI/UX updated');
  }

  wait();
})();
