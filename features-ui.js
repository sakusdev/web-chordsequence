(() => {
  const UI_VERSION = '2026-07-15-ui-2';
  const RECENT_KEY = 'webseq:recent-chords:v1';
  let tapTimes = [];
  let presetObserver;
  let panelObserver;

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
      :root{
        --surface:rgba(13,18,31,.82);
        --surface-strong:rgba(11,15,27,.96);
        --surface-soft:rgba(255,255,255,.055);
        --line:rgba(255,255,255,.12);
        --shadow:0 18px 52px rgba(0,0,0,.34);
        --radius-xl:24px;
        --radius-lg:18px;
        --tap:46px;
      }
      html{scroll-behavior:smooth}
      body{background:radial-gradient(circle at 10% 0,rgba(124,232,255,.13),transparent 30rem),radial-gradient(circle at 90% 2%,rgba(198,155,255,.11),transparent 28rem),#080b13}
      body:before{opacity:.11;background-size:54px 54px}
      header{max-width:1440px;padding:18px clamp(16px,3vw,40px) 14px}
      header .studio-header{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 16px;border:1px solid var(--line);border-radius:20px;background:rgba(8,12,22,.72);backdrop-filter:blur(18px);box-shadow:var(--shadow)}
      .studio-brand{display:flex;align-items:center;gap:12px;min-width:0}
      .studio-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,rgba(124,232,255,.3),rgba(198,155,255,.26));border:1px solid rgba(124,232,255,.35);font-weight:1000;letter-spacing:-.08em}
      .studio-title{min-width:0}.studio-title strong{display:block;font-size:1.02rem;letter-spacing:-.035em}.studio-title span{display:block;color:var(--muted);font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .studio-nav{display:flex;align-items:center;gap:8px}.studio-nav button,.studio-nav a{min-height:40px;padding:9px 12px;border-radius:13px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
      header>h1,header>.lead{display:none}
      main{max-width:1440px;padding:0 clamp(16px,3vw,40px) 64px;gap:16px}
      .grid{grid-template-columns:minmax(300px,370px) minmax(0,1fr);gap:16px}
      .wide{grid-template-columns:minmax(0,1fr) minmax(260px,320px);gap:16px}
      .card{border-radius:var(--radius-xl);padding:18px;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.035));border-color:var(--line);box-shadow:var(--shadow);backdrop-filter:blur(18px)}
      .card h2{cursor:default!important;margin-bottom:14px;font-size:1rem}.card h2::after{display:none!important}.card h2 span{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:rgba(124,232,255,.1);font-size:.72rem}
      .grid>.card:first-child{position:sticky;top:12px}
      label{gap:7px;font-size:.78rem;letter-spacing:.01em}
      input,select,button{min-height:var(--tap);border-radius:14px;border-color:var(--line);background:rgba(5,8,15,.66)}
      select{appearance:auto}
      button{touch-action:manipulation}
      button:hover{transform:none;background:rgba(255,255,255,.11)}
      button:active{transform:translateY(1px)}
      button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid rgba(124,232,255,.45);outline-offset:2px}
      .form-grid{gap:10px}.row{gap:8px}.row>*{min-width:0}
      .builder-actions{display:grid!important;grid-template-columns:1.4fr 1fr;gap:8px}
      .preset-area{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
      .preset-area-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.preset-area-title strong{font-size:.84rem}.preset-area-title span{font-size:.72rem;color:var(--muted)}
      .preset-picker{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.preset-picker select{width:100%;min-width:0}.preset-picker button{padding-inline:16px}
      #presets{display:none!important}
      .sequence{min-height:280px;max-height:min(58vh,680px);overflow:auto;padding-right:3px}
      .chord-item{grid-template-columns:36px minmax(130px,1fr) repeat(4,46px);gap:8px;border-radius:16px;padding:10px;background:rgba(3,6,12,.5)}
      .chord-item .mini{width:46px;padding:0;display:grid;place-items:center;font-size:1rem}
      .name{font-size:1.16rem}.pill{border:0;padding:2px 0;font-size:.74rem}
      .empty{min-height:230px;display:grid;place-items:center;padding:24px;border-radius:18px}
      .transport{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.export{gap:8px}.control{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .toggle{min-height:var(--tap);border-radius:14px;background:rgba(5,8,15,.66)}
      .keyboard-wrap{border-radius:18px;padding:9px}.keyboard{height:72px}
      .link-card{align-self:start}.link-card .hint{border-radius:15px;padding:12px}
      #statusText{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.78rem}
      .status-live{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:.76rem;min-width:0}.status-dot{width:8px;height:8px;border-radius:999px;background:var(--accent);box-shadow:0 0 14px rgba(124,232,255,.7);flex:0 0 auto}.status-live span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .advanced-drawer{margin-top:14px;border:1px solid var(--line);border-radius:18px;background:rgba(0,0,0,.18);overflow:hidden}.advanced-drawer>summary{cursor:pointer;list-style:none;min-height:48px;padding:13px 15px;display:flex;align-items:center;justify-content:space-between;font-weight:900;font-size:.86rem}.advanced-drawer>summary::-webkit-details-marker{display:none}.advanced-drawer>summary:after{content:'＋';color:var(--accent)}.advanced-drawer[open]>summary:after{content:'−'}.advanced-content{padding:0 12px 12px}.advanced-content>#advancedFeatures,.advanced-content>#extraFeatures,.advanced-content>#workflowPanel{margin-top:10px!important;border-radius:16px!important;background:rgba(255,255,255,.025)!important}.advanced-content h3{font-size:.86rem!important}.advanced-content h3::first-letter{font-variant-numeric:tabular-nums}
      .recent-chords{gap:6px!important}.recent-chords button{min-height:36px!important}
      .mobile-dock{display:none}
      .toast-ui{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(12px);z-index:100;padding:11px 15px;border:1px solid var(--line);border-radius:999px;background:rgba(8,12,22,.94);backdrop-filter:blur(18px);opacity:0;transition:.2s;box-shadow:var(--shadow);font-weight:850;max-width:min(90vw,560px);text-align:center}.toast-ui.show{opacity:1;transform:translateX(-50%) translateY(0)}
      .drop-hint:after{content:'JSON / SF2 をドロップ';position:fixed;inset:18px;z-index:200;display:grid;place-items:center;border:2px dashed var(--accent);border-radius:24px;background:rgba(5,9,18,.9);font-size:clamp(1.2rem,4vw,2.4rem);font-weight:1000;pointer-events:none}
      @media(max-width:1080px){
        .grid,.wide{grid-template-columns:1fr}.grid>.card:first-child{position:static}.sequence{max-height:none}.link-card{order:2}
      }
      @media(max-width:720px){
        :root{--tap:48px}
        header{padding:10px 10px 8px}.studio-header{padding:11px!important;border-radius:17px!important}.studio-title span{display:none}.studio-nav .nav-label{display:none}.studio-nav button,.studio-nav a{width:42px;padding:0}
        main{padding:0 10px calc(92px + env(safe-area-inset-bottom));gap:10px}.grid,.wide{gap:10px}.card{padding:14px;border-radius:19px}.card h2{font-size:.95rem}
        .form-grid{grid-template-columns:1fr 1fr}.builder-actions{grid-template-columns:1fr 1fr}.preset-picker{grid-template-columns:1fr 96px}
        .sequence{min-height:200px}.chord-item{grid-template-columns:32px minmax(0,1fr) repeat(2,44px);gap:6px}.chord-item .mini{width:44px}.chord-item .mini:nth-of-type(3),.chord-item .mini:nth-of-type(4){grid-row:2}.chord-item .mini:nth-of-type(3){grid-column:3}.chord-item .mini:nth-of-type(4){grid-column:4}.chord-item>div:nth-child(2){grid-row:1/3}.pill{white-space:normal}
        .transport,.export,.control{grid-template-columns:1fr 1fr}.transport button{font-size:.82rem}.keyboard{height:58px}.key.black{height:38px;margin-inline:-8px}
        .link-card{display:none}.advanced-content{padding-inline:8px}.advanced-content #advancedFeatures .af-grid,.advanced-content #extraFeatures .xf-grid,.advanced-content .ui-tools{grid-template-columns:1fr 1fr!important}
        .mobile-dock{position:fixed;display:grid;grid-template-columns:repeat(4,1fr);left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:80;padding:7px;border:1px solid var(--line);border-radius:19px;background:rgba(8,12,22,.92);backdrop-filter:blur(20px);box-shadow:0 18px 55px rgba(0,0,0,.5)}.mobile-dock button,.mobile-dock a{border:0;background:transparent;min-height:54px;padding:5px 2px;display:grid;place-items:center;gap:1px;text-decoration:none;color:var(--text);font-size:.68rem;font-weight:850}.mobile-dock b{font-size:1.18rem;line-height:1}.mobile-dock .dock-primary{border-radius:14px;background:linear-gradient(135deg,rgba(124,232,255,.23),rgba(215,255,117,.14))}
        .toast-ui{bottom:calc(88px + env(safe-area-inset-bottom))}
      }
      @media(max-width:420px){
        .form-grid{grid-template-columns:1fr}.preset-picker{grid-template-columns:1fr}.preset-picker button{width:100%}.control{grid-template-columns:1fr}.chord-item{grid-template-columns:28px minmax(0,1fr) repeat(2,42px);padding:9px}.chord-item .mini{width:42px}
      }
      @media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `;
    document.head.append(style);
  }

  function toast(text) {
    let el = $('toastUi');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toastUi';
      el.className = 'toast-ui';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.append(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 1500);
  }

  function installHeader() {
    const header = document.querySelector('header');
    if (!header || header.querySelector('.studio-header')) return;
    header.innerHTML = `
      <div class="studio-header">
        <div class="studio-brand">
          <div class="studio-mark" aria-hidden="true">CS</div>
          <div class="studio-title"><strong>Chord Sequence Studio</strong><span>コード進行をすばやく組んで、鳴らして、書き出す</span></div>
        </div>
        <div class="studio-nav">
          <div id="statusLive" class="status-live" aria-live="polite"><span class="status-dot"></span><span>Ready</span></div>
          <a href="chord-book.html" aria-label="コード帳を開く" title="コード帳"><span aria-hidden="true">⌘</span><span class="nav-label">コード帳</span></a>
        </div>
      </div>`;
  }

  function translateBaseUi() {
    const texts = {
      addChord: 'コードを追加', previewChord: '試聴', play: '再生', loopPlay: 'ループ再生', stop: '停止',
      saveProject: 'プロジェクト保存', clear: 'すべて削除', exportMidi: 'MIDI書き出し', exportWav: 'WAV書き出し'
    };
    Object.entries(texts).forEach(([id, text]) => { if ($(id)) $(id).textContent = text; });
    const headings = document.querySelectorAll('.card h2');
    headings.forEach(h => {
      if (h.textContent.includes('コードを追加')) h.innerHTML = '<span>01</span> コードを追加';
      else if (h.textContent.includes('進行を編集')) h.innerHTML = '<span>02</span> シーケンス';
      else if (h.textContent.includes('再生')) h.innerHTML = '<span>03</span> 再生・音色・書き出し';
      else if (h.textContent.includes('コード帳')) h.innerHTML = '<span>04</span> コード帳';
    });
    const builderRow = $('addChord')?.closest('.row');
    if (builderRow) builderRow.classList.add('builder-actions');
    setFieldLabel('root', 'ルート');
    setFieldLabel('quality', 'コードタイプ');
    setFieldLabel('octave', 'オクターブ');
    setFieldLabel('bars', '長さ（小節）');
    setFieldLabel('bpm', 'テンポ（BPM）');
    setFieldLabel('instrument', '音色');
    setFieldLabel('attack', 'アタック');
    setFieldLabel('release', 'リリース');
    setFieldLabel('loop', 'ループ');
    setFieldLabel('velocity', 'ベロシティ');
    setFieldLabel('humanize', 'ヒューマナイズ');
    setFieldLabel('reverb', 'リバーブ');
    setFieldLabel('sf2File', 'SF2ファイル');
    setFieldLabel('statusText', '状態');
    const loadLabel = $('loadProject')?.closest('label');
    if (loadLabel) {
      loadLabel.setAttribute('aria-label', 'プロジェクトを読み込む');
      loadLabel.title = 'JSONプロジェクトを読み込む';
    }
  }

  function setFieldLabel(id, text) {
    const control = $(id);
    const labelEl = control?.closest('label');
    if (!labelEl) return;
    [...labelEl.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).forEach(node => node.remove());
    labelEl.prepend(document.createTextNode(text));
  }

  function installStatusBridge() {
    if (window.__webseqStatusBridge) return;
    window.__webseqStatusBridge = true;
    const original = setStatus;
    setStatus = function(text) {
      original(text);
      const live = $('statusLive')?.querySelector('span:last-child');
      if (live) live.textContent = text;
    };
    const current = $('statusText')?.value;
    const live = $('statusLive')?.querySelector('span:last-child');
    if (live && current) live.textContent = current;
  }

  function installPresetPicker() {
    const container = $('presets');
    if (!container || $('presetSelect')) return;
    const title = container.previousElementSibling;
    const area = document.createElement('div');
    area.className = 'preset-area';
    area.innerHTML = `
      <div class="preset-area-title"><strong>プリセット進行</strong><span>選んで読み込む</span></div>
      <div class="preset-picker">
        <select id="presetSelect" aria-label="プリセット進行"></select>
        <button id="applyPresetUi" type="button">読み込む</button>
      </div>`;
    if (title?.classList.contains('small')) title.replaceWith(area);
    else container.before(area);
    area.append(container);
    const rebuild = () => {
      const select = $('presetSelect');
      if (!select) return;
      const selected = select.value;
      const buttons = [...container.querySelectorAll('button')];
      select.innerHTML = '<option value="">進行を選択…</option>';
      buttons.forEach((button, index) => select.append(new Option(button.textContent.trim(), String(index))));
      if ([...select.options].some(o => o.value === selected)) select.value = selected;
    };
    $('applyPresetUi').onclick = () => {
      const value = $('presetSelect').value;
      if (value === '') return toast('プリセットを選択してください');
      const button = [...container.querySelectorAll('button')][Number(value)];
      button?.click();
      toast(`${button?.textContent || 'プリセット'}を読み込みました`);
    };
    $('presetSelect').addEventListener('keydown', event => {
      if (event.key === 'Enter') $('applyPresetUi').click();
    });
    rebuild();
    presetObserver = new MutationObserver(rebuild);
    presetObserver.observe(container, { childList: true });
  }

  function sequenceSummary() {
    if (!state.sequence.length) return 'コードがありません';
    const names = state.sequence.slice(0, 6).map(chordTitle).join(' → ');
    return `${state.sequence.length}個: ${names}${state.sequence.length > 6 ? ' …' : ''}`;
  }

  function enhanceSequence() {
    const items = [...document.querySelectorAll('.chord-item')];
    items.forEach((item, index) => {
      const buttons = [...item.querySelectorAll('button')];
      const names = ['試聴', '上へ移動', '下へ移動', '削除'];
      buttons.forEach((button, i) => {
        button.setAttribute('aria-label', `${index + 1}番目のコードを${names[i] || '操作'}`);
        button.title = names[i] || '';
      });
    });
    const summary = $('sequenceSummaryUi');
    if (summary) summary.textContent = sequenceSummary();
  }

  function installSequenceSummary() {
    const sequenceCard = $('sequence')?.closest('.card');
    const heading = sequenceCard?.querySelector('h2');
    if (!heading || $('sequenceSummaryUi')) return;
    const summary = document.createElement('span');
    summary.id = 'sequenceSummaryUi';
    summary.className = 'micro';
    summary.style.marginLeft = 'auto';
    summary.style.fontWeight = '700';
    heading.append(summary);
  }

  function organizeAdvancedPanels() {
    const playbackCard = [...document.querySelectorAll('.card h2')].find(h => h.textContent.includes('再生'))?.closest('.card');
    if (!playbackCard) return;
    let drawer = $('advancedDrawer');
    if (!drawer) {
      drawer = document.createElement('details');
      drawer.id = 'advancedDrawer';
      drawer.className = 'advanced-drawer';
      drawer.innerHTML = '<summary>詳細設定・作曲アシスト</summary><div id="advancedContent" class="advanced-content"></div>';
      const keyboard = playbackCard.querySelector('.keyboard-wrap');
      if (keyboard) keyboard.before(drawer); else playbackCard.append(drawer);
    }
    const content = $('advancedContent');
    ['advancedFeatures', 'extraFeatures', 'workflowPanel'].forEach(id => {
      const panel = $(id);
      if (panel && panel.parentElement !== content) content.append(panel);
    });
  }

  function watchAdvancedPanels() {
    organizeAdvancedPanels();
    panelObserver = new MutationObserver(organizeAdvancedPanels);
    panelObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => panelObserver?.disconnect(), 5000);
  }

  function tapTempo() {
    const now = performance.now();
    tapTimes.push(now);
    tapTimes = tapTimes.filter(t => now - t < 5000).slice(-6);
    if (tapTimes.length < 2) return toast('もう一度タップ');
    const diffs = tapTimes.slice(1).map((t, i) => t - tapTimes[i]);
    const bpm = Math.round(60000 / (diffs.reduce((a, b) => a + b, 0) / diffs.length));
    if (bpm >= 30 && bpm <= 240 && $('bpm')) {
      $('bpm').value = bpm;
      $('bpm').dispatchEvent(new Event('change'));
      status(`BPM ${bpm}`);
      toast(`${bpm} BPM`);
    }
  }

  const RANDOM_PROGRESSIONS = [
    ['C major','G major','A minor','F major'], ['F major','G major','E m7','A minor'],
    ['A minor','F maj7','C major','G major'], ['D m7','G 7','C maj7','A 7'],
    ['F maj7','E 7','A minor','C 7'], ['C maj9','A 9','D m9','G 9'],
    ['A minor','G major','F major','E 7'], ['F add9','G add9','A minor','E minor']
  ];

  function parseChordText(text) {
    const [root, qRaw] = text.split(' ');
    return { root, quality: qRaw === 'm' ? 'minor' : qRaw, octave: Number($('octave')?.value || 4), bars: Number($('bars')?.value || 1) };
  }

  function randomProgression() {
    const progression = RANDOM_PROGRESSIONS[Math.floor(Math.random() * RANDOM_PROGRESSIONS.length)];
    state.sequence = progression.map(parseChordText);
    render();
    status('ランダム進行を作成');
    toast(progression.map(parseChordText).map(chordTitle).join(' → '));
  }

  function duplicateLast() {
    const last = state.sequence[state.sequence.length - 1];
    if (!last) return toast('複製するコードがありません');
    state.sequence.push(cloneChord(last));
    render();
    status('最後のコードを複製');
  }

  function reverseSeq() {
    if (state.sequence.length < 2) return toast('2個以上のコードが必要です');
    state.sequence.reverse();
    render();
    status('進行を反転');
  }

  function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
  }

  function saveRecent(chord) {
    if (!chord?.root || !chord?.quality) return;
    const recent = loadRecent().filter(c => chordTitle(c) !== chordTitle(chord));
    recent.unshift(cloneChord(chord));
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 8)));
    renderRecentChords();
  }

  function renderRecentChords() {
    const el = $('recentChords');
    if (!el) return;
    const recent = loadRecent();
    el.innerHTML = recent.length ? '' : '<span class="micro">最近使ったコードがここに表示されます。</span>';
    recent.forEach(chord => {
      const button = document.createElement('button');
      button.textContent = chordTitle(chord);
      button.onclick = () => { state.sequence.push(cloneChord(chord)); render(); status(`${chordTitle(chord)}を追加`); };
      el.append(button);
    });
  }

  function installWorkflowPanel() {
    const playbackCard = [...document.querySelectorAll('.card h2')].find(h => h.textContent.includes('再生'))?.closest('.card');
    if (!playbackCard || $('workflowPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'workflowPanel';
    panel.className = 'ui-panel';
    panel.innerHTML = `
      <h3>クイック操作</h3>
      <div class="ui-tools">
        <button id="tapTempo">タップテンポ</button>
        <button id="randomProgression">ランダム4コード</button>
        <button id="duplicateLast">最後を複製</button>
        <button id="reverseSeq">順番を反転</button>
      </div>
      <div class="recent-chords" id="recentChords"></div>`;
    playbackCard.append(panel);
    $('tapTempo').onclick = tapTempo;
    $('randomProgression').onclick = randomProgression;
    $('duplicateLast').onclick = duplicateLast;
    $('reverseSeq').onclick = reverseSeq;
    renderRecentChords();
  }

  function installMobileDock() {
    if ($('mobileDock')) return;
    const dock = document.createElement('nav');
    dock.id = 'mobileDock';
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'モバイル操作');
    dock.innerHTML = `
      <button id="dockAdd" class="dock-primary"><b>＋</b><span>追加</span></button>
      <button id="dockPlay"><b>▶</b><span>再生</span></button>
      <button id="dockStop"><b>■</b><span>停止</span></button>
      <a href="chord-book.html"><b>⌘</b><span>コード帳</span></a>`;
    document.body.append(dock);
    $('dockAdd').onclick = () => $('addChord')?.click();
    $('dockPlay').onclick = () => $('play')?.click();
    $('dockStop').onclick = () => $('stop')?.click();
  }

  function installDropLoad() {
    document.addEventListener('dragover', event => { event.preventDefault(); document.body.classList.add('drop-hint'); });
    document.addEventListener('dragleave', event => { if (!event.relatedTarget) document.body.classList.remove('drop-hint'); });
    document.addEventListener('drop', event => {
      event.preventDefault();
      document.body.classList.remove('drop-hint');
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      const input = file.name.toLowerCase().endsWith('.json') ? $('loadProject') : file.name.toLowerCase().endsWith('.sf2') ? $('sf2File') : null;
      if (!input) return toast('JSON または SF2 ファイルを選んでください');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
      toast(`${file.name}を読み込みます`);
    });
  }

  function installRenderHooks() {
    const originalRender = render;
    render = function(...args) {
      const previousLength = render._lastLength || 0;
      const result = originalRender.apply(this, args);
      enhanceSequence();
      const last = state.sequence[state.sequence.length - 1];
      if (last && state.sequence.length > previousLength) saveRecent(last);
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
      if (event.key === '[') $('transposeDown')?.click();
      if (event.key === ']') $('transposeUp')?.click();
    });
  }

  function installUiUx() {
    document.body.dataset.uiVersion = UI_VERSION;
    injectCss();
    installHeader();
    translateBaseUi();
    installStatusBridge();
    installPresetPicker();
    installSequenceSummary();
    installWorkflowPanel();
    installMobileDock();
    installDropLoad();
    installRenderHooks();
    installKeyboardShortcuts();
    watchAdvancedPanels();
    render();
    status('Ready');
  }

  wait();
})();
