(() => {
  const VERSION = '2026-07-15-chord-input-1';
  const MAX_IMPORT_CHORDS = 256;

  const ROOT_ALIASES = {
    'B#': 'C', 'C': 'C', 'C#': 'C#', 'DB': 'C#',
    'D': 'D', 'D#': 'D#', 'EB': 'D#',
    'E': 'E', 'FB': 'E', 'E#': 'F', 'F': 'F',
    'F#': 'F#', 'GB': 'F#', 'G': 'G', 'G#': 'G#',
    'AB': 'G#', 'A': 'A', 'A#': 'A#', 'BB': 'A#',
    'B': 'B', 'CB': 'B'
  };

  function $(id) { return document.getElementById(id); }
  function notify(text) {
    try { setStatus(text); } catch { console.log(text); }
    if (typeof toast === 'function') toast(text);
  }

  function normalizeQuality(rawQuality) {
    const raw = String(rawQuality || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/♯/g, '#')
      .replace(/♭/g, 'b');

    const exact = new Map([
      ['', 'major'], ['M', 'major'], ['maj', 'major'], ['major', 'major'],
      ['m', 'minor'], ['min', 'minor'], ['minor', 'minor'], ['-', 'minor'],
      ['dim', 'dim'], ['o', 'dim'], ['°', 'dim'],
      ['aug', 'aug'], ['+', 'aug'],
      ['sus', 'sus4'], ['sus2', 'sus2'], ['sus4', 'sus4'],
      ['maj7', 'maj7'], ['M7', 'maj7'], ['Δ7', 'maj7'], ['^7', 'maj7'],
      ['m7', 'm7'], ['min7', 'm7'], ['-7', 'm7'],
      ['7', '7'],
      ['mMaj7', 'mMaj7'], ['mM7', 'mMaj7'], ['minMaj7', 'mMaj7'], ['-M7', 'mMaj7'],
      ['add9', 'add9'], ['add2', 'add9'],
      ['madd9', 'madd9'], ['m(add9)', 'madd9'], ['minadd9', 'madd9'],
      ['6', '6'], ['M6', '6'],
      ['m6', 'm6'], ['min6', 'm6'],
      ['9', '9'],
      ['maj9', 'maj9'], ['M9', 'maj9'], ['Δ9', 'maj9'],
      ['m9', 'm9'], ['min9', 'm9'],
      ['m7b5', 'm7b5'], ['ø', 'm7b5'], ['ø7', 'm7b5'],
      ['halfdim', 'm7b5'], ['half-dim', 'm7b5']
    ]);
    if (exact.has(raw)) return exact.get(raw);

    const withoutParenthetical = raw.replace(/\([^)]*\)/g, '');
    if (exact.has(withoutParenthetical)) return exact.get(withoutParenthetical);

    if (/^maj7(?:[#b]\d+)+$/i.test(withoutParenthetical)) return 'maj7';
    if (/^m7(?:[#b]\d+)+$/.test(withoutParenthetical) && withoutParenthetical !== 'm7b5') return 'm7';
    if (/^7(?:[#b]\d+)+$/.test(withoutParenthetical)) return '7';
    if (/^maj9(?:[#b]\d+)+$/i.test(withoutParenthetical)) return 'maj9';
    if (/^m9(?:[#b]\d+)+$/.test(withoutParenthetical)) return 'm9';
    if (/^9(?:[#b]\d+)+$/.test(withoutParenthetical)) return '9';
    return null;
  }

  function parseChordSymbol(symbol, defaults = {}) {
    const original = String(symbol || '').trim();
    if (!original) return { ok: false, reason: 'コード名を入力してください', source: original };

    const cleaned = original
      .replace(/^\[|\]$/g, '')
      .replace(/♯/g, '#')
      .replace(/♭/g, 'b')
      .trim();
    const [main, bassRaw] = cleaned.split('/', 2);
    const match = main.match(/^([A-Ga-g])([#b]?)(.*)$/);
    if (!match) return { ok: false, reason: `「${original}」をコードとして解釈できません`, source: original };

    const rootKey = (match[1].toUpperCase() + (match[2] || '')).toUpperCase();
    const root = ROOT_ALIASES[rootKey];
    if (!root || (typeof NOTE_NAMES !== 'undefined' && !NOTE_NAMES.includes(root))) {
      return { ok: false, reason: `「${original}」のルート音に対応していません`, source: original };
    }

    const quality = normalizeQuality(match[3]);
    if (!quality || (typeof QUALITIES !== 'undefined' && !QUALITIES[quality])) {
      return { ok: false, reason: `「${original}」のコードタイプに対応していません`, source: original };
    }

    const bass = bassRaw?.trim() || '';
    return {
      ok: true,
      source: original,
      bass,
      chord: {
        root,
        quality,
        octave: Number(defaults.octave || $('octave')?.value || 4),
        bars: Number(defaults.bars || $('bars')?.value || 1)
      }
    };
  }

  function formatChord(chord) {
    try { return label(chord); } catch { return `${chord.root}${chord.quality || ''}`; }
  }

  function applyToLegacyControls(parsed) {
    if (!parsed?.ok) return false;
    const root = $('root');
    const quality = $('quality');
    if (!root || !quality) return false;
    root.value = parsed.chord.root;
    quality.value = parsed.chord.quality;
    return root.value === parsed.chord.root && quality.value === parsed.chord.quality;
  }

  function updateSymbolPreview() {
    const input = $('chordSymbolInput');
    const preview = $('chordSymbolResult');
    if (!input || !preview) return null;
    const parsed = parseChordSymbol(input.value);
    preview.classList.toggle('is-error', !parsed.ok && Boolean(input.value.trim()));
    if (!input.value.trim()) {
      preview.textContent = '例：Cmaj7、F#m7b5、Bbadd9、G7/B';
      return parsed;
    }
    if (!parsed.ok) {
      preview.textContent = parsed.reason;
      return parsed;
    }
    preview.textContent = `${formatChord(parsed.chord)} として追加${parsed.bass ? `（/${parsed.bass} のベース音は省略）` : ''}`;
    return parsed;
  }

  function runDirectAction(action) {
    const parsed = updateSymbolPreview();
    if (!parsed?.ok) return notify(parsed?.reason || 'コード名を確認してください');
    if (!applyToLegacyControls(parsed)) return notify('コードをフォームへ反映できませんでした');
    const target = action === 'preview' ? $('previewChord') : $('addChord');
    target?.click();
    $('chordSymbolInput')?.focus();
  }

  function extractChordPro(text) {
    const source = String(text || '');
    const valid = [];
    const invalid = [];
    let slashBassCount = 0;
    const regex = /\[([^\]\r\n]+)\]/g;
    let match;
    while ((match = regex.exec(source)) && valid.length < MAX_IMPORT_CHORDS) {
      const parsed = parseChordSymbol(match[1]);
      if (parsed.ok) {
        valid.push(parsed.chord);
        if (parsed.bass) slashBassCount += 1;
      } else {
        invalid.push(match[1].trim());
      }
    }
    return {
      chords: valid,
      invalid: [...new Set(invalid)],
      slashBassCount,
      truncated: regex.lastIndex > 0 && valid.length >= MAX_IMPORT_CHORDS
    };
  }

  function updateChordProPreview() {
    const area = $('chordProText');
    const result = $('chordProResult');
    if (!area || !result) return null;
    const parsed = extractChordPro(area.value);
    if (!area.value.trim()) {
      result.textContent = '角括弧内のコードを出現順に読み込みます。';
      result.classList.remove('is-error');
      return parsed;
    }
    if (!parsed.chords.length) {
      result.textContent = 'コードを検出できませんでした。ChordProの [C] のような表記を使用してください。';
      result.classList.add('is-error');
      return parsed;
    }
    const names = parsed.chords.slice(0, 8).map(formatChord).join(' → ');
    const notices = [];
    if (parsed.invalid.length) notices.push(`未対応 ${parsed.invalid.length}種類`);
    if (parsed.slashBassCount) notices.push(`オンコード ${parsed.slashBassCount}個はベース音省略`);
    if (parsed.truncated) notices.push(`最大${MAX_IMPORT_CHORDS}個まで`);
    result.textContent = `${parsed.chords.length}個検出：${names}${parsed.chords.length > 8 ? ' …' : ''}${notices.length ? ` ／ ${notices.join('・')}` : ''}`;
    result.classList.remove('is-error');
    return parsed;
  }

  function importChordPro(mode) {
    const parsed = updateChordProPreview();
    if (!parsed?.chords.length) return notify('インポートできるコードがありません');
    const octave = Number($('octave')?.value || 4);
    const bars = Number($('bars')?.value || 1);
    const imported = parsed.chords.map(chord => ({ ...chord, octave, bars }));
    if (mode === 'replace') state.sequence = imported;
    else state.sequence.push(...imported);
    render();
    const action = mode === 'replace' ? '進行を置き換え' : '進行の末尾へ追加';
    notify(`${imported.length}個のコードで${action}ました`);
  }

  function installDirectBuilder() {
    const card = $('addChord')?.closest('.card');
    const originalGrid = card?.querySelector('.form-grid');
    const originalActions = $('addChord')?.closest('.row');
    if (!card || !originalGrid || $('directChordBuilder')) return;

    const rootLabel = $('root')?.closest('label');
    const qualityLabel = $('quality')?.closest('label');
    const octaveLabel = $('octave')?.closest('label');
    const barsLabel = $('bars')?.closest('label');
    originalGrid.classList.add('legacy-chord-controls');
    if (rootLabel) rootLabel.hidden = true;
    if (qualityLabel) qualityLabel.hidden = true;
    if (originalActions) originalActions.hidden = true;

    const builder = document.createElement('section');
    builder.id = 'directChordBuilder';
    builder.className = 'direct-chord-builder';
    builder.innerHTML = `
      <label class="chord-symbol-label" for="chordSymbolInput">
        <span>コード名</span>
        <input id="chordSymbolInput" list="chordSymbolExamples" inputmode="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Cmaj7" aria-describedby="chordSymbolResult">
      </label>
      <datalist id="chordSymbolExamples">
        <option value="C"><option value="Cm"><option value="C7"><option value="Cmaj7"><option value="Cm7">
        <option value="F#m7b5"><option value="Bbadd9"><option value="Am9"><option value="G7/B">
      </datalist>
      <div id="chordSymbolResult" class="input-result" aria-live="polite">例：Cmaj7、F#m7b5、Bbadd9、G7/B</div>
      <div id="directChordMeta" class="direct-chord-meta"></div>
      <div class="direct-chord-actions">
        <button id="directAddChord" type="button" class="primary">＋ 進行へ追加</button>
        <button id="directPreviewChord" type="button">▶ 試聴</button>
      </div>`;
    originalGrid.before(builder);

    const meta = $('directChordMeta');
    if (octaveLabel) meta.append(octaveLabel);
    if (barsLabel) meta.append(barsLabel);

    $('chordSymbolInput').addEventListener('input', updateSymbolPreview);
    $('chordSymbolInput').addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runDirectAction('add');
      }
    });
    $('directAddChord').onclick = () => runDirectAction('add');
    $('directPreviewChord').onclick = () => runDirectAction('preview');
  }

  function installChordProImporter() {
    const card = $('addChord')?.closest('.card');
    if (!card || $('chordProImporter')) return;
    const importer = document.createElement('details');
    importer.id = 'chordProImporter';
    importer.className = 'chordpro-importer';
    importer.innerHTML = `
      <summary><span>ChordProから読み込む</span><small>[C]歌詞 [Am]…</small></summary>
      <div class="chordpro-body">
        <label for="chordProText">ChordProテキスト</label>
        <textarea id="chordProText" rows="7" spellcheck="false" placeholder="{title: Example}\n[C]ここに歌詞 [Am]コードを埋め込む\n[F]この順番で [G]読み込みます"></textarea>
        <div id="chordProResult" class="input-result" aria-live="polite">角括弧内のコードを出現順に読み込みます。</div>
        <div class="chordpro-actions">
          <button id="replaceWithChordPro" type="button" class="primary">進行を置き換える</button>
          <button id="appendChordPro" type="button">末尾へ追加</button>
        </div>
        <p class="micro">各コードの長さとオクターブには、上の設定を使用します。C/Eのようなオンコードは現在ベース音を省略してCとして読み込みます。</p>
      </div>`;
    const presetArea = card.querySelector('.preset-area');
    if (presetArea) presetArea.after(importer);
    else card.append(importer);
    $('chordProText').addEventListener('input', updateChordProPreview);
    $('replaceWithChordPro').onclick = () => importChordPro('replace');
    $('appendChordPro').onclick = () => importChordPro('append');
  }

  function injectCss() {
    if ($('chordInputStyle')) return;
    const style = document.createElement('style');
    style.id = 'chordInputStyle';
    style.textContent = `
      .legacy-chord-controls{display:none!important}
      .direct-chord-builder{display:grid;gap:10px;padding:14px;border:1px solid rgba(124,232,255,.22);border-radius:18px;background:linear-gradient(145deg,rgba(124,232,255,.075),rgba(198,155,255,.045))}
      .chord-symbol-label{gap:7px}.chord-symbol-label>span{font-size:.8rem;font-weight:900;color:var(--text)}
      #chordSymbolInput{width:100%;min-height:62px;padding:10px 14px;font-size:1.65rem;font-weight:950;letter-spacing:-.04em;background:rgba(3,6,12,.78);border-color:rgba(124,232,255,.3)}
      #chordSymbolInput::placeholder{color:rgba(170,181,202,.48)}
      .input-result{min-height:20px;color:var(--muted);font-size:.75rem;line-height:1.5}.input-result.is-error{color:var(--danger)}
      .direct-chord-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px}.direct-chord-meta label{min-width:0}.direct-chord-meta select,.direct-chord-meta input{width:100%}
      .direct-chord-actions{display:grid;grid-template-columns:1.35fr .65fr;gap:8px}.direct-chord-actions button{min-height:50px}
      .chordpro-importer{margin-top:12px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:16px;background:rgba(0,0,0,.18);overflow:hidden}
      .chordpro-importer>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:50px;padding:12px 14px;font-weight:900}.chordpro-importer>summary::-webkit-details-marker{display:none}.chordpro-importer>summary:after{content:'＋';color:var(--accent)}.chordpro-importer[open]>summary:after{content:'−'}
      .chordpro-importer>summary small{margin-left:auto;color:var(--muted);font-size:.7rem;font-weight:700}
      .chordpro-body{display:grid;gap:9px;padding:0 12px 12px}.chordpro-body>label{font-size:.76rem;font-weight:850;color:var(--muted)}
      #chordProText{width:100%;resize:vertical;min-height:150px;padding:12px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:13px;background:rgba(3,6,12,.76);color:var(--text);font:500 .84rem/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;outline:none}
      #chordProText:focus{border-color:rgba(124,232,255,.48);box-shadow:0 0 0 3px rgba(124,232,255,.08)}
      .chordpro-actions{display:grid;grid-template-columns:1.2fr .8fr;gap:8px}
      @media(max-width:420px){#chordSymbolInput{font-size:1.45rem}.direct-chord-actions,.chordpro-actions{grid-template-columns:1fr}.chordpro-importer>summary small{display:none}}
    `;
    document.head.append(style);
  }

  function bindMobileDock() {
    const bind = () => {
      const dockAdd = $('dockAdd');
      if (dockAdd && !dockAdd.dataset.directChordBound) {
        dockAdd.dataset.directChordBound = '1';
        dockAdd.onclick = () => $('directAddChord')?.click();
      }
    };
    bind();
    const observer = new MutationObserver(bind);
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 5000);
  }

  function install() {
    document.body.dataset.chordInputVersion = VERSION;
    injectCss();
    installDirectBuilder();
    installChordProImporter();
    bindMobileDock();
    $('chordSymbolInput')?.focus({ preventScroll: true });
    notify('コード入力UIとChordProインポートを準備しました');
    window.WEBSEQ_CHORD_INPUT = { version: VERSION, parseChordSymbol, extractChordPro };
  }

  function wait() {
    if (typeof state === 'undefined' || typeof render !== 'function' || typeof QUALITIES === 'undefined' || !$('addChord')) {
      setTimeout(wait, 60);
      return;
    }
    install();
  }

  if (typeof window !== 'undefined') {
    window.WEBSEQ_CHORD_INPUT_PARSER = { version: VERSION, parseChordSymbol, extractChordPro };
  }
  wait();
})();
