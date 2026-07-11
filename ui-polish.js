(() => {
  'use strict';

  const VERSION = '2026-07-11-ui-polish-1';
  const RANGE_IDS = ['attack', 'release', 'velocity', 'humanize', 'reverb'];
  const ICON_LABELS = {
    '▶': 'このコードをプレビュー',
    '↑': 'コードを上へ移動',
    '↓': 'コードを下へ移動',
    '×': 'コードを削除'
  };

  const $ = (id) => document.getElementById(id);
  const isStudio = () => Boolean($('sequence') && $('play'));
  const isBook = () => Boolean($('book') && $('search'));

  function injectMeta() {
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#090d18';
      document.head.append(meta);
    }
    document.documentElement.dataset.uiVersion = VERSION;
  }

  function injectCss() {
    if ($('webseqPolishStyle')) return;
    const style = document.createElement('style');
    style.id = 'webseqPolishStyle';
    style.textContent = `
      :root{
        --surface:rgba(14,19,33,.72);
        --surface-strong:rgba(18,25,42,.9);
        --surface-soft:rgba(255,255,255,.055);
        --line:rgba(255,255,255,.12);
        --line-strong:rgba(124,232,255,.34);
        --shadow:0 24px 70px rgba(0,0,0,.34);
        --radius-xl:30px;
        --radius-lg:22px;
        --radius-md:16px;
      }
      html{scroll-behavior:smooth}
      body{font-feature-settings:'kern' 1,'ss01' 1;text-rendering:optimizeLegibility}
      body::after{content:'';position:fixed;inset:auto -15vw -34vh;z-index:-1;height:62vh;border-radius:50%;background:radial-gradient(circle,rgba(124,232,255,.1),transparent 64%);filter:blur(24px);pointer-events:none}
      ::selection{background:rgba(124,232,255,.28);color:var(--text)}
      *{scrollbar-width:thin;scrollbar-color:rgba(124,232,255,.35) transparent}
      *::-webkit-scrollbar{width:9px;height:9px}*::-webkit-scrollbar-thumb{background:rgba(124,232,255,.28);border:2px solid transparent;border-radius:999px;background-clip:padding-box}
      .skip-link{position:fixed;left:16px;top:12px;z-index:999;transform:translateY(-160%);padding:10px 14px;border-radius:12px;background:#fff;color:#05060b;font-weight:900;text-decoration:none;transition:transform .18s ease}.skip-link:focus{transform:translateY(0)}
      header{padding-top:clamp(24px,4vw,52px)!important;padding-bottom:clamp(18px,3vw,30px)!important}
      header::before{content:'WEBSEQ  /  CHORD WORKSPACE';display:inline-flex;margin-bottom:14px;padding:7px 10px;border:1px solid rgba(124,232,255,.25);border-radius:999px;background:rgba(124,232,255,.07);color:var(--accent);font-size:.68rem;font-weight:900;letter-spacing:.15em}
      h1{max-width:1050px!important;text-wrap:balance;text-shadow:0 12px 50px rgba(0,0,0,.36)}
      .lead{text-wrap:pretty}
      .hero-badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.hero-badge{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid var(--line);border-radius:999px;background:rgba(0,0,0,.2);color:#dce8fa;font-size:.78rem;font-weight:760}.hero-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px rgba(124,232,255,.72)}
      main{gap:18px!important}
      .card,.panel{position:relative;overflow:clip;background:linear-gradient(180deg,rgba(255,255,255,.095),rgba(255,255,255,.04))!important;border-color:var(--line)!important;box-shadow:var(--shadow)!important}
      .card::before,.panel::before{content:'';position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent);pointer-events:none}
      .card:hover{border-color:rgba(124,232,255,.21)!important}
      .card h2{font-size:1.02rem!important;letter-spacing:-.015em!important}.card h2 span{display:inline-grid;place-items:center;min-width:34px;height:26px;padding:0 8px;border:1px solid rgba(124,232,255,.22);border-radius:999px;background:rgba(124,232,255,.08);font-size:.72rem;letter-spacing:.08em}
      label{letter-spacing:.005em}
      input,select,button,a.btn{min-height:46px;border-color:var(--line)!important;background-color:rgba(3,6,13,.46)!important;transition:border-color .16s ease,background .16s ease,transform .16s ease,box-shadow .16s ease}
      input:hover,select:hover{border-color:rgba(255,255,255,.23)!important}
      input:focus,select:focus,button:focus-visible,a.btn:focus-visible{outline:none!important;border-color:rgba(124,232,255,.62)!important;box-shadow:0 0 0 4px rgba(124,232,255,.1)!important}
      button:hover,a.btn:hover{transform:translateY(-1px)}button:active,a.btn:active{transform:translateY(0) scale(.985)}
      button.primary,a.btn.primary{color:#ecfdff!important;background:linear-gradient(135deg,rgba(38,170,208,.35),rgba(116,156,49,.25))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}
      button.secondary{background:linear-gradient(135deg,rgba(129,82,190,.32),rgba(29,136,166,.18))!important}
      button.danger{background:rgba(255,80,118,.06)!important}
      input[readonly]{color:#dcffe6;border-color:rgba(112,255,161,.22)!important;background:rgba(31,117,65,.11)!important}
      input[type=file]{padding:8px 10px!important}input[type=file]::file-selector-button{margin-right:10px;padding:8px 10px;border:0;border-radius:10px;background:rgba(124,232,255,.14);color:var(--text);font-weight:800;cursor:pointer}
      input[type=range]{min-height:30px;background:transparent!important;box-shadow:none!important}
      .range-label-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.range-value{padding:3px 7px;border:1px solid var(--line);border-radius:999px;background:rgba(0,0,0,.2);color:var(--accent);font-size:.72rem;font-variant-numeric:tabular-nums}
      .presets{padding:2px 6px 2px 2px!important}.presets button{min-height:42px!important;font-size:.84rem}.presets button:hover{background:rgba(124,232,255,.11)!important}
      .sequence{min-height:250px!important}.chord-item{position:relative;border-color:var(--line)!important;background:linear-gradient(135deg,rgba(0,0,0,.28),rgba(255,255,255,.025))!important;transition:transform .16s ease,border-color .16s ease,background .16s ease}.chord-item:hover{transform:translateX(3px);border-color:rgba(124,232,255,.28)!important}.chord-item.active{border-color:var(--accent)!important;box-shadow:0 0 0 1px rgba(124,232,255,.25),0 10px 40px rgba(29,179,220,.13)}.chord-item .mini{min-width:42px;min-height:40px;padding:8px!important}.name{font-variant-numeric:tabular-nums}.empty{display:grid;place-items:center;min-height:190px!important}.empty::before{content:'♫';display:block;margin-bottom:10px;color:var(--accent);font-size:2rem;opacity:.75}
      .meter{height:7px!important;background:rgba(255,255,255,.065)!important}.meter>div{box-shadow:0 0 18px rgba(124,232,255,.6)}
      .keyboard-wrap{background:linear-gradient(180deg,rgba(0,0,0,.38),rgba(0,0,0,.18))!important}.key{transition:background .1s ease,box-shadow .1s ease,transform .1s ease}.key.on{transform:translateY(2px)}
      .command-bar{top:10px!important;border-color:rgba(255,255,255,.13)!important;background:rgba(8,12,23,.82)!important;box-shadow:0 18px 60px rgba(0,0,0,.36)!important}.command-bar .brand{display:flex;align-items:center;gap:8px}.command-bar .brand::before{content:'W';display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,var(--accent),var(--accent3));color:#06101a;font-size:.76rem;font-weight:1000}.command-bar .summary{font-variant-numeric:tabular-nums}
      .ui-panel{border-color:var(--line)!important;background:rgba(2,6,13,.22)!important}
      .shortcut-hint{margin-top:12px;color:var(--muted);font-size:.75rem;line-height:1.7}.shortcut-hint kbd{display:inline-grid;min-width:25px;place-items:center;margin:0 2px;padding:2px 6px;border:1px solid var(--line);border-bottom-color:rgba(255,255,255,.25);border-radius:7px;background:rgba(0,0,0,.28);color:#eaf3ff;font:inherit;font-weight:850}
      .mobile-dock{display:none;position:fixed;z-index:80;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));grid-template-columns:repeat(4,1fr);gap:7px;padding:8px;border:1px solid rgba(255,255,255,.15);border-radius:20px;background:rgba(8,12,23,.88);backdrop-filter:blur(20px);box-shadow:0 20px 70px rgba(0,0,0,.52)}.mobile-dock button{min-height:48px;padding:8px;font-size:.78rem}.mobile-dock .primary{font-size:.84rem}
      .book-count{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:4px 0 14px;color:var(--muted);font-size:.84rem}.book-count strong{color:var(--text);font-variant-numeric:tabular-nums}.clear-search{min-height:34px!important;padding:6px 10px!important;border-radius:10px!important;font-size:.78rem!important}.book .card{min-height:142px;display:flex;flex-direction:column}.book .card strong{font-size:1.32rem!important}.book .card small{flex:1}.book .card:hover{transform:translateY(-2px)}.book .actions button{min-height:40px!important;padding:8px!important}
      .tools{position:sticky;top:12px;z-index:20;padding:10px;border:1px solid var(--line);border-radius:20px;background:rgba(8,12,23,.82);backdrop-filter:blur(18px);box-shadow:0 14px 46px rgba(0,0,0,.24)}
      .toast,.toast-ui{bottom:max(22px,env(safe-area-inset-bottom))!important}
      @media(max-width:760px){body{padding-bottom:88px}.mobile-dock{display:grid}.command-bar{position:relative!important;top:auto!important}.command-bar .actions{display:none!important}.grid,.wide{gap:12px!important}.card,.panel{border-radius:24px!important;padding:17px!important}.form-grid{gap:10px!important}.chord-item{gap:7px!important}.tools{top:8px}.book{grid-template-columns:repeat(2,minmax(0,1fr))!important}.book .card{padding:12px!important}.book .actions{grid-template-columns:1fr!important}}
      @media(max-width:430px){.book{grid-template-columns:1fr!important}.presets{grid-template-columns:1fr 1fr!important}.hero-badges{gap:6px}.hero-badge{font-size:.72rem}.chord-item .mini{min-width:38px}.chord-item{grid-template-columns:auto 1fr auto auto!important}.chord-item button:nth-of-type(1){grid-column:3}.chord-item button:nth-of-type(3),.chord-item button:nth-of-type(4){margin-top:2px}}
      @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
    `;
    document.head.append(style);
  }

  function addSkipLink() {
    if (document.querySelector('.skip-link')) return;
    const main = document.querySelector('main');
    if (!main) return;
    if (!main.id) main.id = 'main-content';
    const link = document.createElement('a');
    link.className = 'skip-link';
    link.href = `#${main.id}`;
    link.textContent = 'メインコンテンツへ移動';
    document.body.prepend(link);
  }

  function addHeroBadges() {
    const header = document.querySelector('header');
    if (!header || header.querySelector('.hero-badges')) return;
    const badges = document.createElement('div');
    badges.className = 'hero-badges';
    const labels = isBook()
      ? ['192 chord variations', 'Instant preview', 'Studio連携']
      : ['No install', 'MIDI / WAV export', 'Local processing'];
    labels.forEach((text) => {
      const badge = document.createElement('span');
      badge.className = 'hero-badge';
      badge.textContent = text;
      badges.append(badge);
    });
    header.append(badges);
  }

  function formatRange(id, value) {
    const n = Number(value);
    if (id === 'velocity') return `${Math.round(n * 100)}%`;
    if (id === 'humanize') return `${Math.round(n * 1000)}ms`;
    if (id === 'reverb') return `${Math.round(n * 100)}%`;
    return `${n.toFixed(2)}s`;
  }

  function installRangeValues() {
    RANGE_IDS.forEach((id) => {
      const input = $(id);
      const label = input?.closest('label');
      if (!input || !label || label.dataset.rangeValue) return;
      label.dataset.rangeValue = '1';
      const firstText = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      const title = firstText?.textContent.trim() || id;
      if (firstText) firstText.textContent = '';
      const row = document.createElement('span');
      row.className = 'range-label-row';
      const name = document.createElement('span');
      name.textContent = title;
      const value = document.createElement('output');
      value.className = 'range-value';
      value.htmlFor = id;
      const update = () => { value.value = formatRange(id, input.value); value.textContent = value.value; };
      row.append(name, value);
      label.insertBefore(row, input);
      input.addEventListener('input', update);
      update();
    });
  }

  function labelIconButtons(root = document) {
    root.querySelectorAll('button').forEach((button) => {
      const text = button.textContent.trim();
      if (!ICON_LABELS[text]) return;
      button.title = ICON_LABELS[text];
      button.setAttribute('aria-label', ICON_LABELS[text]);
    });
  }

  function installStudioEnhancements() {
    if (!isStudio()) return;
    const status = $('statusText');
    if (status) {
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-label', '再生・処理ステータス');
    }

    const workflow = $('workflowPanel');
    if (workflow && !workflow.querySelector('.shortcut-hint')) {
      const hint = document.createElement('p');
      hint.className = 'shortcut-hint';
      hint.innerHTML = '<kbd>Space</kbd> 再生/停止　<kbd>B</kbd> コード帳　<kbd>R</kbd> ランダム　<kbd>D</kbd> 複製';
      workflow.append(hint);
    }

    if (!$('mobileDock')) {
      const dock = document.createElement('nav');
      dock.id = 'mobileDock';
      dock.className = 'mobile-dock';
      dock.setAttribute('aria-label', 'モバイル操作');
      dock.innerHTML = '<button class="primary" data-action="play">▶ Play</button><button data-action="stop">■ Stop</button><button data-action="add">＋ Add</button><button data-action="book">Book</button>';
      dock.addEventListener('click', (event) => {
        const action = event.target.closest('button')?.dataset.action;
        if (action === 'play') $('play')?.click();
        if (action === 'stop') $('stop')?.click();
        if (action === 'add') $('addChord')?.click();
        if (action === 'book') location.href = 'chord-book.html';
      });
      document.body.append(dock);
    }

    const sequence = $('sequence');
    if (sequence && !sequence.dataset.polishObserved) {
      sequence.dataset.polishObserved = '1';
      const observer = new MutationObserver(() => labelIconButtons(sequence));
      observer.observe(sequence, { childList: true, subtree: true });
      labelIconButtons(sequence);
    }
  }

  function updateBookCount() {
    const book = $('book');
    const count = $('bookResultCount');
    if (!book || !count) return;
    const total = book.querySelectorAll(':scope > .card').length;
    count.textContent = `${total} chords`;
  }

  function installBookEnhancements() {
    if (!isBook()) return;
    const panel = document.querySelector('.panel');
    const tools = document.querySelector('.tools');
    const search = $('search');
    const book = $('book');
    if (!panel || !tools || !search || !book) return;

    search.setAttribute('aria-label', 'コードを検索');
    search.autocomplete = 'off';

    if (!$('bookCountRow')) {
      const row = document.createElement('div');
      row.id = 'bookCountRow';
      row.className = 'book-count';
      row.innerHTML = '<span><strong id="bookResultCount">0 chords</strong> を表示中</span><button id="clearBookSearch" class="clear-search" type="button">検索をクリア</button>';
      tools.insertAdjacentElement('afterend', row);
      $('clearBookSearch').onclick = () => {
        search.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
        search.focus();
      };
    }

    if (!book.dataset.polishObserved) {
      book.dataset.polishObserved = '1';
      const observer = new MutationObserver(updateBookCount);
      observer.observe(book, { childList: true });
      updateBookCount();
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === '/' && document.activeElement !== search) {
        event.preventDefault();
        search.focus();
        search.select();
      }
      if (event.key === 'Escape' && document.activeElement === search && search.value) {
        search.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  function install() {
    injectMeta();
    injectCss();
    addSkipLink();
    addHeroBadges();
    installRangeValues();
    installStudioEnhancements();
    installBookEnhancements();
    labelIconButtons();
    document.body.classList.add('webseq-polished');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once: true });
  } else {
    requestAnimationFrame(install);
  }
})();
